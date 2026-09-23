import { randomUUID } from 'node:crypto';
import { afterEach,beforeEach,describe,expect,test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture,principals,ids } from '../support/access-fixture.js';
import { startedFixture } from '../support/current-fixture.js';
import { withAccess } from '../../src/access/service.js';
import { lockInvariants } from '../../src/commands/locks.js';
import { planningState,snapshot } from '../../src/planning/queue.js';
import { eligibleTarget } from '../../src/current/state.js';
import { currentConforms,type Selection } from '../../src/current/models.js';
import type { RoundRow } from '../../src/rounds/models.js';
import { IndependentIntakeService } from '../../src/b2c-intake/service.js';
import { command } from '../support/planning-fixture.js';
import { providerFixture } from '../support/planning-fixture.js';
import Fastify from 'fastify';
import { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { currentRoutes } from '../../src/current/routes.js';
import { CurrentActivity } from '../../src/current/service.js';
import { Rounds } from '../../src/rounds/service.js';
import type { AuthConfig } from '../../src/auth/config.js';
import type { ActionEnvelope,CommandHooks } from '../../src/commands/kernel.js';
import { deferred,observeDatabaseBlock } from '../support/barriers.js';
import { runPlanningOnce } from '../../src/planning/worker.js';
import { Locations } from '../../src/locations/service.js';
import { companyPlanningFixture } from '../support/planning-company-fixture.js';

describe('P16 explicit current activity — real PostgreSQL',()=>{
 let db:Awaited<ReturnType<typeof createTestDatabase>>;
 beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
 afterEach(async()=>{await db?.close();});
 const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p16',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p16',clientSecret:'fixture'}}};
 const headers={origin:config.origin,cookie:'__Host-tawsel-browser=p16','x-csrf-token':'p16'};
 const apps:ReturnType<typeof Fastify>[]=[];
 afterEach(async()=>{await Promise.all(apps.splice(0).map(a=>a.close()));});
 async function api(pool=db.pool,observe?:Pick<CommandHooks,'afterWrite'>,principal=principals.personal){const app=Fastify();await app.register(scope=>currentRoutes(scope,pool,config,(_r,_kind,work)=>work(principal),new CurrentActivity(pool,observe)));await app.ready();apps.push(app);return app;}
 const post=(app:ReturnType<typeof Fastify>,c:ActionEnvelope)=>app.inject({method:'POST',url:`/api/v1/current/${c.operationId==='current.selectHeading'?'heading':c.operationId==='current.recordArrival'?'arrival':'origin'}?kind=personal`,headers,payload:c});
 const body=(r:Awaited<ReturnType<typeof post>>)=>(r.json() as components['schemas']['CurrentActionResult']).response!.body as components['schemas']['CurrentCommandResult'];
 test('A: closed contract requires explicit prior activity and relevant versions; arrival cannot be inferred',async()=>{
  const f=await startedFixture(db.pool),c=f.make();
  expect(currentConforms('SelectHeadingCommand',c)).toBe(true);
  const missing=structuredClone(c);delete missing.payload.expectedCurrentAttemptId;
  expect(currentConforms('SelectHeadingCommand',missing)).toBe(false);
  expect(currentConforms('SelectHeadingCommand',{...c,payload:{...c.payload,alreadyArrived:true}})).toBe(false);
  expect(currentConforms('Activity',{taskId:c.payload.taskId,attemptId:c.payload.attemptId,revision:1,stage:'arrived',heading:{actionId:c.actionId,recordedAt:new Date().toISOString(),observation:c.observation},arrival:null})).toBe(false);
 });
 test('A: authoritative target resolver denies foreign/unadmitted/ineligible attempts and stale task revisions',async()=>{
  const f=await startedFixture(db.pool),p=f.make().payload as Selection;
  const check=(value:Selection)=>withAccess(db.pool,principals.personal,async(a,tx)=>{
   await lockInvariants(tx,ids.personalTenant,[{kind:'driver',id:ids.personalDriver}]);
   const r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE round_id=$1',[f.round.roundId])).rows[0]!;
   return eligibleTarget(tx,a,r,await snapshot(tx,await planningState(tx,ids.personalTenant,ids.personalDriver)),value);
  });
  expect((await check(p)).taskId).toBe(p.taskId);
  await expect(check({...p,taskId:randomUUID()})).rejects.toMatchObject({code:'lifecycle_forbidden'});
  await expect(check({...p,expectedPinRevision:9})).rejects.toMatchObject({code:'stale_revision'});
  const added=await new IndependentIntakeService(db.pool).create(principals.personal,command('task.createIndependent',{recipientName:'موقع غير محسوم',recipientPhone:'01012345678',destination:{kind:'address',addressText:'عنوان يحتاج تأكيد'}}));
  const taskId=(added.response!.body.task as {taskId:string}).taskId;
  const attemptId=(await db.pool.query('SELECT attempt_id FROM tawsel.planning_attempts WHERE task_id=$1',[taskId])).rows[0].attempt_id as string;
  await expect(check({...p,taskId,attemptId})).rejects.toMatchObject({code:'lifecycle_forbidden'});
  await expect(withAccess(db.pool,principals.driver,async(a,tx)=>{
   const r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE round_id=$1',[f.round.roundId])).rows[0]!;
   return eligibleTarget(tx,a,r,f.plan.input,p);
  })).rejects.toMatchObject({code:'forbidden_resource'});
  // The FK independently prevents unknown attempts from becoming current.
  await expect(db.pool.query("INSERT INTO tawsel.execution_attempts (tenant_id,round_id,attempt_id,task_id,stage,first_heading,heading,revision) VALUES ($1,$2,$3,$4,'heading','{}','{}',1)",[ids.personalTenant,f.round.roundId,randomUUID(),p.taskId])).rejects.toMatchObject({code:'23503'});
 });
 test('A: database prevents two current attempts and arrived state without arrival evidence',async()=>{
  const f=await startedFixture(db.pool),first=f.make().payload as Selection,second=f.make(1).payload as Selection;
  const time={actionId:f.start.actionId,recordedAt:new Date().toISOString(),observation:f.start.observation};
  const insert=(p:Selection)=>db.pool.query("INSERT INTO tawsel.execution_attempts (tenant_id,round_id,attempt_id,task_id,stage,first_heading,heading,revision) VALUES ($1,$2,$3,$4,'heading',$5,$5,1)",[ids.personalTenant,f.round.roundId,p.attemptId,p.taskId,time]);
  await insert(first);
  await expect(insert(second)).rejects.toMatchObject({code:'23505',constraint:'one_current_activity'});
  await expect(db.pool.query("UPDATE tawsel.execution_attempts SET stage='arrived'")).rejects.toMatchObject({code:'23514'});
 });
 test('B: API explicit heading/arrival, stable retry, immutable times/history and live round read',async()=>{
  const f=await startedFixture(db.pool),app=await api(),service=new CurrentActivity(db.pool),initial=await service.read(principals.personal,f.round.roundId),baseline=(await db.pool.query('SELECT * FROM tawsel.forecast_members')).rows;
  expect(initial).toMatchObject({revision:0,currentActivity:null,physicalOrigin:null,nextSuggestion:{taskId:f.tasks[0]!.taskId}});
  const c=f.make(),selected=await post(app,c);expect(selected.statusCode).toBe(200);expect(body(selected)).toMatchObject({revision:1,currentActivity:{stage:'heading',attemptId:c.payload.attemptId,arrival:null},physicalOrigin:null});
  const arrival=f.make(0,1,String(c.payload.attemptId),'current.recordArrival');arrival.observation={observedAt:'2020-01-01T00:00:00Z',clock:{quality:'uncertain',estimatedOffsetMilliseconds:3000}};
  const accepted=await post(app,arrival);expect(accepted.statusCode).toBe(200);expect(body(accepted)).toMatchObject({revision:2,currentActivity:{stage:'arrived',arrival:{observation:arrival.observation}},physicalOrigin:{kind:'last-confirmed-stop',coordinates:initial.targets.find(t=>t.taskId===c.payload.taskId)!.coordinates,revision:1}});
  expect(body(accepted).currentActivity!.arrival!.recordedAt).not.toBe(arrival.observation.observedAt);
  expect((await post(app,arrival)).json()).toEqual(accepted.json());
  expect((await app.inject(`/api/v1/current/actions/${arrival.actionId}?kind=personal`)).json()).toMatchObject({status:'accepted',result:accepted.json()});
  expect((await new Rounds(db.pool).current(principals.personal)).round!.currentActivity).toEqual(body(accepted).currentActivity);
  expect((await db.pool.query('SELECT * FROM tawsel.current_activity_history')).rowCount).toBe(2);
  expect((await db.pool.query('SELECT * FROM tawsel.physical_origin_history')).rowCount).toBe(1);
  expect((await db.pool.query('SELECT * FROM tawsel.forecast_members')).rows).toEqual(baseline);
  await expect(db.pool.query('DELETE FROM tawsel.current_activity_history')).rejects.toThrow('append-only');
  await expect(db.pool.query('UPDATE tawsel.execution_attempts SET arrival=$1',[{}])).rejects.toThrow('immutable');
  await expect(db.pool.query('UPDATE tawsel.execution_attempts SET first_heading=$1',[{}])).rejects.toThrow('immutable');
  await expect(db.pool.query('UPDATE tawsel.physical_origin_history SET origin=$1',[{}])).rejects.toThrow('append-only');
 });
 test('B: heading replacement explicitly pauses the previous attempt; arrived cannot be silently abandoned',async()=>{
  const f=await startedFixture(db.pool),app=await api(),one=f.make(),two=f.make(1,1,String(one.payload.attemptId));
  expect((await post(app,one)).statusCode).toBe(200);expect((await post(app,two)).statusCode).toBe(200);
  expect((await db.pool.query('SELECT stage FROM tawsel.execution_attempts WHERE attempt_id=$1',[one.payload.attemptId])).rows[0].stage).toBe('paused');
  const reselect=f.make(0,2,String(two.payload.attemptId));expect((await post(app,reselect)).statusCode).toBe(200);
  const times=(await db.pool.query('SELECT first_heading,heading FROM tawsel.execution_attempts WHERE attempt_id=$1',[one.payload.attemptId])).rows[0];expect(times.first_heading.actionId).toBe(one.actionId);expect(times.heading.actionId).toBe(reselect.actionId);
  expect((await post(app,f.make(0,3,String(one.payload.attemptId),'current.recordArrival'))).statusCode).toBe(200);
  const denied=await post(app,f.make(1,4,String(one.payload.attemptId)));expect(denied.statusCode).toBe(409);expect(denied.json().receipt.problem.code).toBe('lifecycle_forbidden');
  expect((await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId)).currentActivity).toMatchObject({attemptId:one.payload.attemptId,stage:'arrived',revision:4});
 });
 for(const duplicate of [false,true])test(`B: independent API/PostgreSQL ${duplicate?'duplicate arrival':'current selection'} race has one effective transition`,async()=>{
  const f=await startedFixture(db.pool),poolA=new Pool({...db.config,max:1}),poolB=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();
  let first:ReturnType<typeof post>|undefined,second:ReturnType<typeof post>|undefined;
  try{
   if(duplicate)expect((await post(await api(),f.make())).statusCode).toBe(200);
   const a=duplicate?f.make(0,1,String(f.make().payload.attemptId),'current.recordArrival'):f.make(),b=duplicate?a:f.make(1);
   const appA=await api(poolA,{async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);await release.promise;}}}),appB=await api(poolB);
   const waiter=(await poolB.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
   first=post(appA,a);const holder=await held.promise;second=post(appB,b);await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();
   const [x,y]=await Promise.all([first,second]);expect(x.statusCode).toBe(200);expect(y.statusCode).toBe(duplicate?200:409);
   if(duplicate)expect(y.json()).toEqual(x.json());else expect(y.json().receipt.problem.code).toBe('stale_revision');
   expect((await db.pool.query("SELECT * FROM tawsel.execution_attempts WHERE stage IN ('heading','arrived')")).rowCount).toBe(1);
   expect((await db.pool.query('SELECT * FROM tawsel.current_activity_history')).rowCount).toBe(duplicate?2:1);
   expect((await db.pool.query('SELECT * FROM tawsel.physical_origin_history')).rowCount).toBe(duplicate?1:0);
  }finally{release.resolve();await Promise.allSettled([first,second]);await poolA.end();await poolB.end();}
 });
 test('B: wrong device/generation is retained rejection evidence, with CSRF and route-specific shape guards',async()=>{
  const f=await startedFixture(db.pool),app=await api();
  for(const patch of [{deviceGeneration:2},{deviceId:randomUUID()}]){const c=f.make();c.context={...c.context,...patch};const denied=await post(app,c);expect(denied.statusCode).toBe(409);expect(denied.json().receipt.problem.code).toBe('stale_device');expect((await db.pool.query('SELECT * FROM tawsel.command_evidence WHERE action_id=$1',[c.actionId])).rowCount).toBe(1);expect((await post(app,c)).json()).toEqual(denied.json());}
  expect((await app.inject({method:'POST',url:'/api/v1/current/heading?kind=personal',payload:f.make()})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url:'/api/v1/current/arrival?kind=personal',headers,payload:f.make()})).statusCode).toBe(400);
  expect((await db.pool.query('SELECT * FROM tawsel.execution_attempts')).rowCount).toBe(0);
 });
 test('B: compatible manual reorder does not invalidate selection; changed pin does invalidate arrival',async()=>{
  const f=await startedFixture(db.pool),app=await api(),c=f.make(),s=await f.planning.plans(principals.personal,ids.personalDriver);
  await f.planning.command(principals.personal,command('planning.setManualOrder',{driverId:ids.personalDriver,expectedSettingsRevision:s.settingsRevision,expectedInputRevision:s.inputRevision,expectedManualRevision:s.manualRevision,selection:{kind:'order',taskIds:[...f.tasks].reverse().map(t=>t.taskId)}}));
  c.baseVersions={routeRevision:999};expect((await post(app,c)).statusCode).toBe(200);
  const arrival=f.make(0,1,String(c.payload.attemptId),'current.recordArrival');
  const pin=command('location.confirmPin',{taskId:c.payload.taskId,expectedSourceRevision:1,expectedLocationRevision:0,confirmed:true,selection:{kind:'manual',coordinates:{latitude:30.08,longitude:31.29}}});pin.resources={taskId:String(c.payload.taskId)};
  await new Locations(db.pool).confirm(principals.personal,pin);
  const denied=await post(app,arrival);expect(denied.statusCode).toBe(409);expect(denied.json().receipt.problem.code).toBe('stale_revision');
  const fresh={...arrival,actionId:randomUUID(),payload:{...arrival.payload,expectedPinRevision:1}};expect((await post(app,fresh)).statusCode).toBe(200);
  expect((await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId)).physicalOrigin!.coordinates).toEqual({latitude:30.08,longitude:31.29});
 });
 test('B: delayed planning result cannot overwrite selected/arrived current or physical origin',async()=>{
  const f=await startedFixture(db.pool),app=await api(),prior=await f.planning.plans(principals.personal,ids.personalDriver),entered=deferred(),release=deferred();
  // Deliberately opposite to the fixture provider's reverse-ID group order,
  // independent of random task UUIDs, so the observable suggestion must change.
  await f.planning.command(principals.personal,command('planning.setManualOrder',{driverId:ids.personalDriver,expectedSettingsRevision:prior.settingsRevision,expectedInputRevision:prior.inputRevision,expectedManualRevision:prior.manualRevision,selection:{kind:'order',taskIds:[f.tasks[0]!.taskId,...f.tasks.slice(1).map(t=>t.taskId).sort()]}}));
  const s=await f.planning.plans(principals.personal,ids.personalDriver);
  const replan=await f.planning.command(principals.personal,command('planning.requestReplan',{driverId:ids.personalDriver,expectedSettingsRevision:s.settingsRevision}));
  const provider=await providerFixture({async beforeResponse(){entered.resolve();await release.promise;}}),running=runPlanningOnce(db.pool,provider.engine);
  try{await entered.promise;const c=f.make();expect((await post(app,c)).statusCode).toBe(200);expect((await post(app,f.make(0,1,String(c.payload.attemptId),'current.recordArrival'))).statusCode).toBe(200);
   const before=await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId);release.resolve();await running;
   expect((await f.planning.job(principals.personal,(replan.response!.body.job as {jobId:string}).jobId)).status).toBe('superseded');
   expect((await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId)).currentActivity).toEqual(before.currentActivity);
   expect(await runPlanningOnce(db.pool,provider.engine)).toBe(true);
   const plan=(await f.planning.plans(principals.personal,ids.personalDriver)).items[0]!;
   expect(plan.input.currentTarget).toMatchObject({taskId:c.payload.taskId,attemptId:c.payload.attemptId,revision:2});expect(plan.input.settings!.origin).toEqual({kind:'last-confirmed-stop',coordinates:before.physicalOrigin!.coordinates});expect(plan.routePolicy!.orderedTaskIds[0]).toBe(c.payload.taskId);
   const after=await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId);expect(after.currentActivity).toEqual(before.currentActivity);expect(after.physicalOrigin).toEqual(before.physicalOrigin);expect(after.nextSuggestion!.taskId).not.toBe(after.currentActivity!.taskId);expect(after.nextSuggestion!.taskId).not.toBe(before.nextSuggestion!.taskId);expect(after.planning.updating).toBe(false);
  }finally{release.resolve();await running;await provider.close();}
 });
 test('B: explicit manual physical correction preserves current, and ordinary draft writes cannot override it',async()=>{
  const f=await startedFixture(db.pool),app=await api();await post(app,f.make());
  const c=command('current.correctOrigin',{roundId:f.round.roundId,expectedOriginRevision:0,coordinates:{latitude:30.01,longitude:31.21}});c.context=f.start.context;
  const accepted=await post(app,c);expect(accepted.statusCode).toBe(200);expect(body(accepted)).toMatchObject({revision:1,currentActivity:{stage:'heading',arrival:null},physicalOrigin:{kind:'manual-pin',taskId:null,attemptId:null,revision:1}});
  expect((await post(app,c)).json()).toEqual(accepted.json());
  const s=await f.planning.plans(principals.personal,ids.personalDriver),settings=f.plan.input.settings!;
  await expect(f.planning.command(principals.personal,command('planning.saveDraft',{driverId:ids.personalDriver,expectedSettingsRevision:s.settingsRevision,settings:{...settings,origin:{kind:'manual-pin',coordinates:{latitude:30.1,longitude:31.1}}}}))).rejects.toMatchObject({code:'lifecycle_forbidden'});
  expect((await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId)).planningOrigin).toEqual({kind:'manual-pin',coordinates:c.payload.coordinates});
 });
 test('B: source-filtered ERP event and outbox fault roll back arrival, origin, progress, history and receipt',async()=>{
  const company=await companyPlanningFixture(db);
  try{
   const taskId=await company.task('current','ordinary');await company.save();const s=await company.service.plans(company.principal,company.driverId);
   await company.service.command(company.principal,company.planCommand('planning.setManualOrder',{expectedSettingsRevision:s.settingsRevision,expectedInputRevision:s.inputRevision,expectedManualRevision:s.manualRevision,selection:{kind:'order',taskIds:[taskId]}}));
   const plan=(await company.service.plans(company.principal,company.driverId)).items[0]!,rounds=new Rounds(db.pool),start=company.planCommand('round.start',{planId:plan.planId,expectedPlanRevision:plan.revision});
   if(start.context.kind!=='device')throw new Error('device');start.payload.readinessId=(await rounds.readiness(company.principal,{driverId:company.driverId,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]})).readinessId;
   const r=(await rounds.start(company.principal,start)).response!.body as components['schemas']['RoundStartResult'],m=plan.input.members[0]!;
   const c=command('current.selectHeading',{roundId:r.round.roundId,taskId,attemptId:m.attemptId,expectedActivityRevision:0,expectedCurrentAttemptId:null,expectedSourceRevision:1,expectedAssignmentRevision:1,expectedPinRevision:0});c.context=start.context;
   const app=await api(db.pool,undefined,company.principal);expect((await post(app,c)).statusCode).toBe(200);
   expect((await new CurrentActivity(db.pool).read(company.principal,r.round.roundId)).targets[0]!.recipientPhone).toBe('+201012345678');
   const event=(await db.pool.query("SELECT recipient_id,payload FROM tawsel.outbox_intents WHERE action_id=$1 AND event_type='current.headingSelected'",[c.actionId])).rows;expect(event).toHaveLength(1);expect(event[0]).toMatchObject({recipient_id:company.source.integrationId,payload:{taskId,attemptId:m.attemptId,stage:'heading'}});
   const arrival={...c,actionId:randomUUID(),operationId:'current.recordArrival',payload:{...c.payload,expectedActivityRevision:1,expectedCurrentAttemptId:m.attemptId}};
   const before=(await db.pool.query('SELECT * FROM tawsel.planning_states WHERE tenant_id=$1',[company.tenantId])).rows;
   const failing=await api(db.pool,{async afterWrite(stage){if(stage==='outbox')throw new Error('controlled current outbox failure');}},company.principal);
   expect((await post(failing,arrival)).statusCode).toBe(500);
   expect((await db.pool.query('SELECT * FROM tawsel.command_identities WHERE action_id=$1',[arrival.actionId])).rowCount).toBe(0);
   expect((await db.pool.query('SELECT * FROM tawsel.physical_origin_history')).rowCount).toBe(0);
   expect((await db.pool.query('SELECT * FROM tawsel.current_activity_history')).rowCount).toBe(1);
   expect((await db.pool.query('SELECT * FROM tawsel.planning_states WHERE tenant_id=$1',[company.tenantId])).rows).toEqual(before);
   expect((await post(app,arrival)).statusCode).toBe(200);expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='current.arrivalRecorded'")).rowCount).toBe(1);
  }finally{await company.close();}
 });
});
