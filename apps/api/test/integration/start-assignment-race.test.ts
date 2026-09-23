import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { ids, principals, prepareAccessFixture } from '../support/access-fixture.js';
import { intake, draft, command, providerFixture } from '../support/planning-fixture.js';
import { companyPlanningFixture } from '../support/planning-company-fixture.js';
import { PlanningService } from '../../src/planning/service.js';
import { Rounds } from '../../src/rounds/service.js';
import { roundConforms } from '../../src/rounds/models.js';
import { runPlanningOnce } from '../../src/planning/worker.js';
import type { AuthenticatedPrincipal } from '../../src/access/service.js';
import type { ActionEnvelope } from '../../src/commands/kernel.js';
import { Pool } from 'pg';
import { deferred, observeDatabaseBlock } from '../support/barriers.js';
import { B2bIntakeService } from '../../src/b2b-intake/service.js';
import type { components } from '@tawsel/api-client';
import { Locations } from '../../src/locations/service.js';
import { IndependentIntakeService } from '../../src/b2c-intake/service.js';
import { send } from '../support/provisioning-fixture.js';
import Fastify from 'fastify';
import { locationRoutes } from '../../src/locations/routes.js';
import { planningRoutes } from '../../src/planning/routes.js';
import { browserCookie } from '../../src/auth/routes.js';

describe('P15 online start — real PostgreSQL authority and independent transactions',()=>{
 let db:Awaited<ReturnType<typeof createTestDatabase>>;
 beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
 afterEach(async()=>{await db?.close();});
 async function manual(principal=principals.personal,driverId=ids.personalDriver,make=command){
  const planning=new PlanningService(db.pool),state=await planning.plans(principal,driverId);
  await planning.command(principal,make('planning.setManualOrder',{driverId,expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:(state.items[0]?.input.members??(await db.pool.query('SELECT input FROM tawsel.planning_jobs WHERE driver_id=$1 ORDER BY created_at DESC LIMIT 1',[driverId])).rows[0].input.members).filter((m:{eligible:boolean})=>m.eligible).map((m:{taskId:string})=>m.taskId)}}));
  return (await planning.plans(principal,driverId)).items[0]!;
 }
 async function prepare(principal:AuthenticatedPrincipal=principals.personal,driverId:string=ids.personalDriver,make=command){
  const plan=(await new PlanningService(db.pool).plans(principal,driverId)).items[0]!;
  const c=make('round.start',{driverId,planId:plan.planId,expectedPlanRevision:plan.revision});
  if(c.context.kind!=='device')throw new Error('device required');
  const ready=await new Rounds(db.pool).readiness(principal,{driverId,deviceId:c.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});
  c.payload.readinessId=ready.readinessId;return {c,ready,plan};
 }
 const resultBody=(r:Awaited<ReturnType<Rounds['start']>>)=>r.response!.body as components['schemas']['RoundStartResult'];
 test('A: one open workday across branches; draft IDs cannot fabricate a server round',async()=>{
  const workday=randomUUID();
  await db.pool.query('INSERT INTO tawsel.workdays (tenant_id,driver_id,workday_id) VALUES ($1,$2,$3)',[ids.personalTenant,ids.personalDriver,workday]);
  await expect(db.pool.query('INSERT INTO tawsel.workdays (tenant_id,driver_id,workday_id) VALUES ($1,$2,$3)',[ids.personalTenant,ids.personalDriver,randomUUID()])).rejects.toMatchObject({code:'23505',constraint:'one_open_workday'});
  await expect(db.pool.query(`INSERT INTO tawsel.rounds (tenant_id,driver_id,round_id,workday_id,owner_account_id,owner_device_id,device_generation,first_plan_id,first_forecast_id,first_workload_id,readiness_id,source_id,action_id)
   VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$9,$10,$5,$11)`,[ids.personalTenant,ids.personalDriver,randomUUID(),workday,ids.personalAccount,randomUUID(),randomUUID(),randomUUID(),randomUUID(),randomUUID(),randomUUID()])).rejects.toMatchObject({code:'23503'});
  expect((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount).toBe(0);
 });
 test('B: manual start, lost successful response, same action recovery and immutable first forecast',async()=>{
  const task=await intake(db.pool);await draft(db.pool);const plan=await manual(),{c}=await prepare(),service=new Rounds(db.pool);
  expect(await service.current(principals.personal)).toEqual({workday:null,round:null});
  const started=await service.start(principals.personal,c),body=resultBody(started);
  expect(started.receipt.businessStatus).toBe('accepted');expect(roundConforms('StartResult',body)).toBe(true);
  expect(body.round).toMatchObject({firstPlanId:plan.planId,firstForecastId:plan.forecast.forecastId,firstWorkloadId:plan.forecast.workloadId,currentActivity:null,owner:{deviceId:c.context.kind==='device'?c.context.deviceId:'',generation:1}});
  expect(await service.start(principals.personal,c)).toEqual(started);
  expect(await service.result(principals.personal,c.actionId)).toMatchObject({status:'accepted',result:started});
  const secondPhone={...c,actionId:randomUUID(),context:{...c.context,deviceId:randomUUID()}} as ActionEnvelope;
  expect(resultBody(await service.start(principals.personal,secondPhone))).toEqual({...body,disposition:'already-active'});
  expect((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount).toBe(1);
  expect((await db.pool.query('SELECT departure_at FROM tawsel.b2c_tasks WHERE task_id=$1',[task.taskId])).rows[0].departure_at).toBeInstanceOf(Date);
  expect((await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rowCount).toBe(1);
  await expect(db.pool.query('UPDATE tawsel.rounds SET first_workload_id=$1',[randomUUID()])).rejects.toThrow('baseline is immutable');
  await expect(db.pool.query('DELETE FROM tawsel.round_publications')).rejects.toThrow('append-only');
  await expect(db.pool.query('UPDATE tawsel.forecast_members SET expected_arrival_at=clock_timestamp()')).rejects.toThrow('append-only');
 });
 test('B: optimized first forecast is preserved verbatim with its planning time origin',async()=>{
  await intake(db.pool);await draft(db.pool);const provider=await providerFixture();
  try{await runPlanningOnce(db.pool,provider.engine);const {c,plan}=await prepare(),before=await db.pool.query('SELECT * FROM tawsel.forecast_members');
   const body=resultBody(await new Rounds(db.pool).start(principals.personal,c));
   expect(body.round.firstForecastId).toBe(plan.forecast.forecastId);expect(plan.forecast.expectedFinishAt).not.toBeNull();
   expect((await db.pool.query('SELECT * FROM tawsel.forecast_members')).rows).toEqual(before.rows);
   expect((await db.pool.query('SELECT time_origin FROM tawsel.forecast_revisions')).rows[0].time_origin.toISOString()).toBe(plan.forecast.timeOrigin);
  }finally{await provider.close();}
 });
 test('C: database independently forbids a second active round; open workday survives midnight with no hard shift cutoff',async()=>{
  const task=await intake(db.pool);await draft(db.pool);await manual();const {c}=await prepare(),day=randomUUID();
  await db.pool.query("INSERT INTO tawsel.workdays (tenant_id,driver_id,workday_id,opened_at) VALUES ($1,$2,$3,clock_timestamp()-interval '3 days')",[ids.personalTenant,ids.personalDriver,day]);
  const result=await new Rounds(db.pool).start(principals.personal,c);expect(resultBody(result).workday.workdayId).toBe(day);
  await expect(db.pool.query(`INSERT INTO tawsel.rounds (tenant_id,driver_id,round_id,workday_id,owner_account_id,owner_device_id,device_generation,first_plan_id,first_forecast_id,first_workload_id,readiness_id,source_id,action_id)
   SELECT tenant_id,driver_id,$1,workday_id,owner_account_id,$2,device_generation+1,first_plan_id,first_forecast_id,first_workload_id,readiness_id,source_id,$3 FROM tawsel.rounds`,[randomUUID(),randomUUID(),task.command.actionId])).rejects.toMatchObject({code:'23505',constraint:'one_active_round'});
  expect((await db.pool.query('SELECT * FROM tawsel.workdays')).rowCount).toBe(1);
 });
 test('C: expired readiness, mismatched action reuse and foreign accounts cannot claim authority',async()=>{
  await intake(db.pool);await draft(db.pool);await manual();const {c,ready}=await prepare(),expired=randomUUID(),service=new Rounds(db.pool);
  // Immutable expired evidence fixture; production issuance always uses DB time.
  await db.pool.query(`INSERT INTO tawsel.start_readiness (tenant_id,driver_id,readiness_id,account_id,device_id,plan_id,fingerprint,relevant_action_ids,issued_at,expires_at)
   SELECT tenant_id,driver_id,$2,account_id,device_id,plan_id,fingerprint,relevant_action_ids,clock_timestamp()-interval '2 minutes',clock_timestamp()-interval '1 minute' FROM tawsel.start_readiness WHERE readiness_id=$1`,[ready.readinessId,expired]);
  expect((await service.start(principals.personal,{...c,actionId:randomUUID(),payload:{...c.payload,readinessId:expired}})).receipt.problem?.code).toBe('sync_required');
  await expect(service.start(principals.driver,c)).rejects.toMatchObject({code:'forbidden_resource'});
  await expect(service.start(principals.staff,c)).rejects.toMatchObject({code:'forbidden_resource'});
  const accepted=await service.start(principals.personal,c);expect(accepted.receipt.businessStatus).toBe('accepted');
  await expect(service.start(principals.personal,{...c,payload:{...c.payload,expectedPlanRevision:999}})).rejects.toMatchObject({code:'idempotency_conflict'});
  expect(await service.result(principals.driver,c.actionId)).toEqual({actionId:c.actionId,status:'pending'});
  await db.pool.query('UPDATE tawsel.memberships SET enabled=false WHERE tenant_id=$1 AND account_id=$2',[ids.personalTenant,ids.personalAccount]);
  await expect(service.start(principals.personal,c)).rejects.toMatchObject({code:'forbidden_resource'});
  await expect(service.result(principals.personal,c.actionId)).rejects.toMatchObject({code:'forbidden_resource'});
 });
 test('B: missing/foreign-device readiness and incomplete synchronization cannot activate a round',async()=>{
  await intake(db.pool);await draft(db.pool);await manual();const {c,plan}=await prepare(),service=new Rounds(db.pool);
  await expect(service.readiness(principals.personal,{driverId:ids.personalDriver,deviceId:randomUUID(),planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[randomUUID()]})).rejects.toMatchObject({code:'sync_incomplete'});
  for(const bad of [{...c,payload:{...c.payload,readinessId:randomUUID()}},{...c,context:{...c.context,deviceId:randomUUID()}},{...c,dependsOnActionIds:[randomUUID()]}]){
   const r=await service.start(principals.personal,{...bad,actionId:randomUUID()});expect(r.receipt.businessStatus).toBe('rejected');
  }
  expect((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount).toBe(0);expect((await db.pool.query('SELECT * FROM tawsel.workdays')).rowCount).toBe(0);
 });
 test('B: partial and changed-input plans cannot start',async()=>{
  await intake(db.pool);await intake(db.pool,1);await draft(db.pool);const provider=await providerFixture({partial:true});
  try{await runPlanningOnce(db.pool,provider.engine);await expect(prepare()).rejects.toMatchObject({code:'plan_not_startable'});await manual();const {c}=await prepare();await intake(db.pool,2);
   const r=await new Rounds(db.pool).start(principals.personal,c);expect(r.receipt.problem?.code).toBe('stale_revision');expect((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount).toBe(0);
  }finally{await provider.close();}
 });
 for(const duplicate of [false,true])test(`B: independent PostgreSQL connections serialize ${duplicate?'same action duplicate':'two phones'} start`,async()=>{
  await intake(db.pool);await draft(db.pool);await manual();const a=await prepare(),b=duplicate?a:await prepare();
  const poolA=new Pool({...db.config,max:1}),poolB=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();
  const first=new Rounds(poolA,{async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);await release.promise;}}});
  const waitingPid=(await poolB.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const firstPromise=first.start(principals.personal,a.c);let secondPromise:ReturnType<Rounds['start']>|undefined;
  try{const holderPid=await held.promise;secondPromise=new Rounds(poolB).start(principals.personal,b.c);await observeDatabaseBlock(db.pool,waitingPid,holderPid);release.resolve();
   const [x,y]=await Promise.all([firstPromise,secondPromise]);expect(resultBody(x).round).toEqual(resultBody(y).round);
   if(duplicate)expect(y).toEqual(x);else expect(resultBody(y).disposition).toBe('already-active');
   expect((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount).toBe(1);expect((await db.pool.query('SELECT * FROM tawsel.workdays')).rowCount).toBe(1);
  }finally{release.resolve();await Promise.allSettled([firstPromise,secondPromise]);await poolA.end();await poolB.end();}
 });
 for(const firstStart of [true,false])test(`B: start versus ERP withdrawal, ${firstStart?'start':'withdrawal'} wins the real lock`,async()=>{
  const company=await companyPlanningFixture(db),poolA=new Pool({...db.config,max:1}),poolB=new Pool({...db.config,max:1});
  const held=deferred<number>(),release=deferred();let first:Promise<unknown>|undefined,second:Promise<unknown>|undefined;
  try{await company.task('race','ordinary');await company.save();await manual(company.principal,company.driverId,company.planCommand);const {c}=await prepare(company.principal,company.driverId,company.planCommand);
   const withdrawal=company.source.command('assignment.withdraw',{externalId:'race',sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:1,assignmentRevision:2});
   const hooks={async afterWrite(stage:string,tx:import('../../src/db/transaction.js').Transaction){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);await release.promise;}}};
   first=firstStart?new Rounds(poolA,hooks).start(company.principal,c):new B2bIntakeService(poolA,hooks).command(`Bearer ${company.source.token}`,'assignment.withdraw',withdrawal);
   const holderPid=await held.promise,waiterPid=(await poolB.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   second=firstStart?new B2bIntakeService(poolB).command(`Bearer ${company.source.token}`,'assignment.withdraw',withdrawal):new Rounds(poolB).start(company.principal,c);
   await observeDatabaseBlock(db.pool,waiterPid,holderPid);release.resolve();const [winner,loser]=await Promise.all([first,second]) as Awaited<ReturnType<Rounds['start']>>[];
   expect(winner!.receipt.businessStatus).toBe('accepted');expect(loser!.receipt.problem?.code).toBe(firstStart?'departed_edit_forbidden':'stale_revision');
   expect((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount).toBe(firstStart?1:0);
   expect((await db.pool.query('SELECT state,departure_at FROM tawsel.b2b_dispatch_cycles')).rows[0]).toMatchObject({state:firstStart?'held':'withdrawn',departure_at:firstStart?expect.any(Date):null});
  }finally{release.resolve();await Promise.allSettled([first,second]);await poolA.end();await poolB.end();await company.close();}
 });
 test('B: outbox fault rolls back day, round, departure, baseline publication and receipt together',async()=>{
  const company=await companyPlanningFixture(db);
  try{await company.task('rollback','ordinary');await company.save();await manual(company.principal,company.driverId,company.planCommand);const {c}=await prepare(company.principal,company.driverId,company.planCommand);
   await expect(new Rounds(db.pool,{async afterWrite(stage){if(stage==='outbox')throw new Error('start-outbox-fault');}}).start(company.principal,c)).rejects.toThrow('start-outbox-fault');
   for(const table of ['rounds','workdays','round_publications','round_admissions'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
   expect((await db.pool.query('SELECT departure_at FROM tawsel.b2b_dispatch_cycles')).rows[0].departure_at).toBeNull();
   expect((await db.pool.query('SELECT * FROM tawsel.command_identities WHERE action_id=$1',[c.actionId])).rowCount).toBe(0);
   const started=await new Rounds(db.pool).start(company.principal,c);expect(started.receipt.businessStatus).toBe('accepted');
   const events=(await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE event_type='round.started'")).rows;expect(events).toHaveLength(1);expect(roundConforms('StartedEvent',events[0]!.payload)).toBe(true);
  }finally{await company.close();}
 });
 test('C: every ERP edit/assignment/urgency endpoint and broad staff planning/pin path denies departed work; driver pin correction survives',async()=>{
  const company=await companyPlanningFixture(db),http=Fastify();
  try{
   const taskId=await company.task('frozen','ordinary');await company.save();await manual(company.principal,company.driverId,company.planCommand);const {c}=await prepare(company.principal,company.driverId,company.planCommand);await new Rounds(db.pool).start(company.principal,c);
   for(const externalId of ['policy-staff','policy-second']){
    expect((await send(company.app,company.source.token,company.source.command('user.provision',{externalId,sourceRevision:1,subject:externalId,roleExternalId:'role',branchExternalIds:['branch'],enabled:true}))).statusCode).toBe(200);
   }
   expect((await send(company.app,company.source.token,company.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'All-powerful label',capabilities:['execution.own','correction.own','planning.manage','location.review','assignment.manage','intake.prepare']}))).statusCode).toBe(200);
   expect((await send(company.app,company.source.token,company.source.command('driver.provisionReference',{externalId:'policy-second',sourceRevision:1,userExternalId:'policy-second',enabled:true,profile:'bicycle',vehicleReference:null}))).statusCode).toBe(200);
   await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1',[company.tenantId]);
   const sourceTask=await new B2bIntakeService(db.pool).get(`Bearer ${company.source.token}`,'frozen');
   const item={externalId:'frozen',sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:1,assignmentRevision:2};
   const edits:[string,object][]=[['intake.submitSnapshot',{...sourceTask.snapshot,sourceRevision:2,expectedSourceRevision:1,recipientName:'تعديل ممنوع',priority:'urgent'}],['intake.setUrgencyBeforeDeparture',{externalId:'frozen',sourceDispatchCycleId:'cycle',sourceRevision:2,expectedSourceRevision:1,priority:'urgent'}],['assignment.withdraw',item],['assignment.reassignBeforeDeparture',{...item,driverExternalId:'policy-second',receiptAsserted:true}],['intake.prepare',{driverExternalId:'policy-driver',items:[item]}],['assignment.receiveBatch',{driverExternalId:'policy-driver',items:[item],receiptAsserted:true}]];
   for(const [op,payload] of edits){const r=await company.app.inject({method:'POST',url:`/api/v1/intake/commands/${op}`,headers:{authorization:`Bearer ${company.source.token}`},payload:company.source.command(op,payload)});expect(r.statusCode,op).toBe(409);expect(r.json().receipt.problem.code).toBe('departed_edit_forbidden');}
   const staff={kind:'account' as const,issuer:'https://issuer.fixture.invalid',subject:'policy-staff'},origin='http://localhost:5173',csrf='a'.repeat(64);
   const config={origin,encryptionKey:Buffer.alloc(32,8),sessionSeconds:28800,issuers:{company:{issuer:staff.issuer,clientId:'fixture',clientSecret:'fixture'},personal:{issuer:'https://personal.fixture.invalid',clientId:'fixture',clientSecret:'fixture'}}};
   await http.register(async app=>locationRoutes(app,db.pool,config,new Locations(db.pool),(_r,_k,work)=>work(staff)));
   await http.register(async app=>planningRoutes(app,db.pool,config,(_r,_k,work)=>work(staff)));await http.ready();
   const accountId=(await db.pool.query('SELECT account_id FROM tawsel.identity_subjects WHERE tenant_id=$1 AND subject=$2',[company.tenantId,'policy-staff'])).rows[0].account_id;
   const pin=company.planCommand('location.confirmPin',{taskId,expectedSourceRevision:1,expectedLocationRevision:0,selection:{kind:'manual',coordinates:{latitude:30.06,longitude:31.25}},confirmed:true});delete pin.payload.driverId;pin.resources={taskId};pin.context={...pin.context,accountId} as ActionEnvelope['context'];
   const request={headers:{origin,'x-csrf-token':csrf},cookies:{[browserCookie]:csrf}};
   const denied=await http.inject({method:'PUT',url:`/api/v1/locations/${taskId}?kind=company`,...request,payload:pin});expect(denied.statusCode,denied.body).toBe(409);
   const search=await http.inject({method:'POST',url:`/api/v1/locations/${taskId}/candidates?kind=company`,...request,payload:{query:'شارع القاهرة'}});expect(search.statusCode,search.body).toBe(409);
   const state=await company.service.plans(company.principal,company.driverId);
   for(const op of ['planning.saveDraft','planning.requestPreview','planning.requestReplan','planning.setManualOrder']){
    const p={driverId:company.driverId,expectedSettingsRevision:state.settingsRevision,...(op==='planning.saveDraft'?{settings:state.items[0]!.input.settings}:op==='planning.setManualOrder'?{expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:[taskId]}}:{})};
    const edit=company.planCommand(op,p);edit.context={...edit.context,accountId} as ActionEnvelope['context'];
    const r=await http.inject({method:'POST',url:`/api/v1/planning/commands/${op}?kind=company`,...request,payload:edit});expect(r.statusCode,`${op}: ${r.body}`).toBe(409);
   }
   const ownPin={...pin,actionId:randomUUID(),context:c.context};expect((await new Locations(db.pool).confirm(company.principal,ownPin)).receipt.businessStatus).toBe('accepted');
   const current=await new Rounds(db.pool).current(company.principal);expect(current.round!.firstForecastId).toBe(resultBody(await new Rounds(db.pool).start(company.principal,c)).round.firstForecastId);
   const original=await new B2bIntakeService(db.pool).get(`Bearer ${company.source.token}`,'frozen');expect(original.snapshot).toEqual(sourceTask.snapshot);expect(original.editable).toBe(false);
  }finally{await http.close();await company.close();}
 });
 test('C: newly received active work locks at admission; unresolved work locks when its pin becomes usable',async()=>{
  const company=await companyPlanningFixture(db);
  try{await company.task('initial','ordinary');await company.save();await manual(company.principal,company.driverId,company.planCommand);const {c,plan}=await prepare(company.principal,company.driverId,company.planCommand);await new Rounds(db.pool).start(company.principal,c);
   const added=await company.task('new','ordinary','held',new Date(Date.now()-1000).toISOString()),service=new B2bIntakeService(db.pool),auth=`Bearer ${company.source.token}`;
   expect((await service.get(auth,'new')).editable).toBe(false);
   const latest=(await db.pool.query('SELECT j.input FROM tawsel.planning_states s JOIN tawsel.planning_jobs j ON j.tenant_id=s.tenant_id AND j.job_id=s.latest_job_id WHERE s.driver_id=$1',[company.driverId])).rows[0].input;
   expect(latest.members.find((m:{taskId:string})=>m.taskId===added).eligible).toBe(true);
   const source=(await service.get(auth,'new')).snapshot;
   await company.post('intake.submitSnapshot',{...source,externalId:'unresolved',destination:{kind:'address',addressText:'عنوان غير محسوم'}});
   await company.post('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId:'unresolved',sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}]});
   const unresolved=await service.get(auth,'unresolved');expect(unresolved.editable).toBe(true);
   const pin=company.planCommand('location.confirmPin',{taskId:unresolved.taskId,expectedSourceRevision:1,expectedLocationRevision:0,selection:{kind:'manual',coordinates:{latitude:30.06,longitude:31.25}},confirmed:true});delete pin.payload.driverId;pin.resources={taskId:unresolved.taskId};
   await new Locations(db.pool).confirm(company.principal,pin);expect((await service.get(auth,'unresolved')).editable).toBe(false);
   const admissions=(await db.pool.query("SELECT task_id,boundary FROM tawsel.round_admissions WHERE boundary='active-admission' ORDER BY task_id")).rows;
   expect(admissions.map(r=>r.task_id).sort()).toEqual([added,unresolved.taskId].sort());
   expect((await db.pool.query('SELECT state FROM tawsel.b2b_assignment_history WHERE dispatch_cycle_id=$1',[ (await service.get(auth,'new')).dispatchCycleId])).rows[0].state.editable).toBe(false);
   expect((await new Rounds(db.pool).current(company.principal)).round!.firstForecastId).toBe(plan.forecast.forecastId);
   expect((await db.pool.query('SELECT * FROM tawsel.forecast_members WHERE forecast_id=$1',[plan.forecast.forecastId])).rowCount).toBe(1);
  }finally{await company.close();}
 });
 test('C: independent new active intake locks content while own execution pin remains editable',async()=>{
  const first=await intake(db.pool);await draft(db.pool);await manual();const {c}=await prepare();await new Rounds(db.pool).start(principals.personal,c);
  const added=await intake(db.pool,1),service=new IndependentIntakeService(db.pool);expect((await service.get(principals.personal,added.taskId)).editable).toBe(false);
  for(const taskId of [first.taskId,added.taskId]){const edit=command('task.reviseIndependent',{taskId,expectedRevision:1,recipientName:'تعديل ممنوع',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.08,longitude:31.28}}});edit.resources={taskId};edit.baseVersions={resourceRevision:1};expect((await service.revise(principals.personal,edit)).receipt.problem?.code).toBe('departed_edit_forbidden');}
  expect((await db.pool.query("SELECT * FROM tawsel.round_admissions WHERE boundary='active-admission'")).rowCount).toBe(1);
 });
 for(const startFirst of [true,false])test(`C: start versus capacity admission, ${startFirst?'start':'admission'} takes driver lock first`,async()=>{
  const company=await companyPlanningFixture(db),poolA=new Pool({...db.config,max:1}),poolB=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();let first:Promise<unknown>|undefined,second:Promise<unknown>|undefined;
  try{
   for(let i=0;i<48;i++)await company.task(`capacity-${i}`,'ordinary');await company.save();
   const state=await company.service.plans(company.principal,company.driverId),job=(await db.pool.query('SELECT input FROM tawsel.planning_jobs WHERE job_id=$1',[state.latestJob!.jobId])).rows[0].input;
   await company.service.command(company.principal,company.planCommand('planning.saveDraft',{expectedSettingsRevision:1,settings:{...job.settings,endpoint:{kind:'branch',branchId:job.members[0].branchId,coordinates:{latitude:30.1,longitude:31.3},serviceEstimateSeconds:90}}}));
   await manual(company.principal,company.driverId,company.planCommand);const {c}=await prepare(company.principal,company.driverId,company.planCommand);
   const snapshot=(await new B2bIntakeService(db.pool).get(`Bearer ${company.source.token}`,'capacity-0')).snapshot;
   for(const externalId of ['add-a','add-b'])await company.post('intake.submitSnapshot',{...snapshot,externalId});
   const receive=company.source.command('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:['add-a','add-b'].map(externalId=>({externalId,sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}))});
   const hooks={async afterWrite(stage:string,tx:import('../../src/db/transaction.js').Transaction){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);await release.promise;}}};
   first=startFirst?new Rounds(poolA,hooks).start(company.principal,c):new B2bIntakeService(poolA,hooks).command(`Bearer ${company.source.token}`,'assignment.receiveBatch',receive);
   const holder=await held.promise,waiter=(await poolB.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   second=startFirst?new B2bIntakeService(poolB).command(`Bearer ${company.source.token}`,'assignment.receiveBatch',receive):new Rounds(poolB).start(company.principal,c);
   await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const results=await Promise.all([first,second]) as Awaited<ReturnType<Rounds['start']>>[];
   expect(results[0]!.receipt.businessStatus).toBe('accepted');expect(results[1]!.receipt.problem?.code).toBe(startFirst?'capacity_exceeded':'stale_revision');
   expect((await db.pool.query("SELECT * FROM tawsel.driver_planned_stops WHERE state='remaining'")).rowCount).toBe(startFirst?49:50);
   const added=(await db.pool.query("SELECT c.state,c.departure_at FROM tawsel.b2b_dispatch_cycles c JOIN tawsel.b2b_tasks t USING(tenant_id,task_id) WHERE t.external_id IN ('add-a','add-b')")).rows;
   expect(added.every(r=>r.state===(startFirst?'unassigned':'held')&&r.departure_at===null)).toBe(true);
  }finally{release.resolve();await Promise.allSettled([first,second]);await poolA.end();await poolB.end();await company.close();}
 },30_000);
});
