import { randomUUID } from 'node:crypto';
import { beforeEach,afterEach,describe,test,expect } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture,principals,ids } from '../support/access-fixture.js';
import { startedFixture } from '../support/current-fixture.js';
import { deferred,observeDatabaseBlock } from '../support/barriers.js';
import { command,providerFixture,intake } from '../support/planning-fixture.js';
import { runPlanningOnce } from '../../src/planning/worker.js';
import { Locations } from '../../src/locations/service.js';
import { send } from '../support/provisioning-fixture.js';
import { IndependentIntakeService } from '../../src/b2c-intake/service.js';
import { outcomeDemo } from '../../../../scripts/outcome-demo.js';
import { outcomeCompanyFixture } from '../support/outcome-fixture.js';
import { outcomeRoutes } from '../../src/outcomes/routes.js';
import { Outcomes } from '../../src/outcomes/service.js';
import { CurrentActivity } from '../../src/current/service.js';
import { outcomeConforms } from '../../src/outcomes/models.js';
import { money } from '../../src/outcomes/arithmetic.js';
import type { AuthConfig } from '../../src/auth/config.js';
import type { ActionEnvelope,CommandHooks } from '../../src/commands/kernel.js';
import type { AuthenticatedPrincipal } from '../../src/access/service.js';

const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p17',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p17',clientSecret:'fixture'}}};
const headers={origin:config.origin,cookie:'__Host-tawsel-browser=p17','x-csrf-token':'p17'};
const paths:Record<string,string>={'outcome.recordFull':'full','outcome.recordPartial':'partial','outcome.recordRefusal':'refusal','outcome.recordNoAnswer':'no-answer'};
const post=(app:ReturnType<typeof Fastify>,c:ActionEnvelope)=>app.inject({method:'POST',url:`/api/v1/outcomes/${paths[c.operationId]}?kind=company`,headers,payload:c});
const body=(r:Awaited<ReturnType<typeof post>>)=>(r.json() as components['schemas']['OutcomeActionResult']).response!.body as components['schemas']['OutcomeCommandResult'];
describe('P17 outcome / progress / outbox — isolated real PostgreSQL and API',()=>{
 let db:Awaited<ReturnType<typeof createTestDatabase>>;
 const closers:(()=>Promise<unknown>)[]=[];
 beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
 afterEach(async()=>{for(const close of closers.splice(0).reverse())await close();await db?.close();});
 async function company(overrides?:Parameters<typeof outcomeCompanyFixture>[1]){const f=await outcomeCompanyFixture(db,overrides);closers.push(()=>f.close());return f;}
 async function api(principal:AuthenticatedPrincipal,observe?:Pick<CommandHooks,'afterWrite'>,pool=db.pool){const app=Fastify();await app.register(scope=>outcomeRoutes(scope,pool,config,(_r,_kind,work)=>work(principal),new Outcomes(pool,observe)));await app.ready();closers.push(()=>app.close());return app;}
 test('B: partial resolves arrived current atomically; preserves origin, baseline and held remainder',async()=>{
  const f=await company(),app=await api(f.principal),current=new CurrentActivity(db.pool);
  const baseline=(await db.pool.query('SELECT * FROM tawsel.forecast_members')).rows;
  const heading=f.make(0,'current.selectHeading');await current.command(f.principal,heading);
  await current.command(f.principal,f.make(0,'current.recordArrival',{},1,String(heading.payload.attemptId)));
  const before=await current.read(f.principal,f.round.roundId),c=f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)},2,String(heading.payload.attemptId));
  const result=await post(app,c);expect(result.statusCode,result.body).toBe(200);const accepted=body(result);
  expect(accepted.outcome).toMatchObject({outcome:'partial',heading:before.currentActivity!.heading,arrival:before.currentActivity!.arrival,returnRequired:true,lines:[{delivered:2,heldReturnRequired:1}],collection:{reported:money(25000)}});
  expect(accepted.current).toMatchObject({currentActivity:null,revision:3,physicalOrigin:before.physicalOrigin});
  const reload=await current.read(f.principal,f.round.roundId);expect(reload).toMatchObject({currentActivity:null,physicalOrigin:before.physicalOrigin,nextSuggestion:{taskId:f.tasks[1]}});expect(reload.targets.map(t=>t.taskId)).toEqual([f.tasks[1]]);
  const snapshot=await new Outcomes(db.pool).read(f.principal,f.round.roundId);expect(snapshot.progress).toEqual({processed:1,full:0,partial:1,refused:0,noAnswer:0,deliveredPieces:2,heldReturnRequiredPieces:1,collection:[{currency:'EGP',exponent:2,reportedMinor:'25000',unpaidShippingMinor:'0'}]});
  const intent=(await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE action_id=$1 AND event_type='outcome.recorded'",[c.actionId])).rows;
  expect(intent).toHaveLength(1);expect(intent[0].recipient_id).toBe(f.source.integrationId);expect(intent[0].payload).toEqual({outcome:accepted.outcome});expect(outcomeConforms('Event',intent[0].payload)).toBe(true);
  expect((await db.pool.query('SELECT * FROM tawsel.forecast_members')).rows).toEqual(baseline);
  expect((await db.pool.query('SELECT state FROM tawsel.b2b_dispatch_cycles WHERE task_id=$1',[f.tasks[0]])).rows[0].state).toBe('held');
  expect((await db.pool.query('SELECT state FROM tawsel.driver_planned_stops WHERE dispatch_cycle_id=$1',[accepted.outcome.dispatchCycleId])).rows[0].state).toBe('completed');
  expect((await post(app,c)).json()).toEqual(result.json());
  expect((await app.inject(`/api/v1/outcomes/actions/${c.actionId}?kind=company`)).json()).toMatchObject({status:'accepted',result:result.json()});
  const repeated=structuredClone(c);repeated.actionId=randomUUID();repeated.payload.expectedActivityRevision=3;repeated.payload.expectedCurrentAttemptId=null;expect((await post(app,repeated)).statusCode).toBe(409);
  expect((await db.pool.query('SELECT * FROM tawsel.outcome_quantities')).rows).toHaveLength(1);
  for(const table of ['delivery_outcomes','outcome_quantities','outcome_collections'])await expect(db.pool.query(`DELETE FROM tawsel.${table}`)).rejects.toThrow('append-only');
  await expect(db.pool.query("UPDATE tawsel.execution_attempts SET stage='heading' WHERE attempt_id=$1",[c.payload.attemptId])).rejects.toThrow('immutable');
 });
 test('B: no-answer without heading/arrival keeps all goods held without invented collection or physical origin',async()=>{
  const f=await company(),app=await api(f.principal),c=f.make(0,'outcome.recordNoAnswer'),r=await post(app,c);expect(r.statusCode,r.body).toBe(200);
  expect(body(r)).toMatchObject({outcome:{outcome:'no-answer',heading:null,arrival:null,collection:{reported:null,shippingStatus:'not-attempted',unpaidShipping:money(0)},lines:[{delivered:0,heldReturnRequired:3}]},current:{currentActivity:null,physicalOrigin:null}});
  expect((await db.pool.query('SELECT first_heading,heading,arrival,stage FROM tawsel.execution_attempts')).rows).toEqual([{first_heading:null,heading:null,arrival:null,stage:'resolved'}]);
  expect((await db.pool.query('SELECT * FROM tawsel.physical_origin_history')).rowCount).toBe(0);
  expect((await new Outcomes(db.pool).read(f.principal,f.round.roundId)).progress).toMatchObject({processed:1,noAnswer:1,heldReturnRequiredPieces:3,collection:[]});
 });
 test('B: injected failures between domain/progress/audit/outbox/result roll back every accepted effect',async()=>{
  const f=await company([{}]),current=new CurrentActivity(db.pool),heading=f.make(0,'current.selectHeading');await current.command(f.principal,heading);
  const before=await current.read(f.principal,f.round.roundId),plan=(await db.pool.query('SELECT * FROM tawsel.planning_states WHERE tenant_id=$1',[f.tenantId])).rows;
  let retry:ActionEnvelope;
  for(const stage of ['domain','progress','audit','outbox','result'] as const){
   const c=f.make(0,'outcome.recordFull',{reportedCollection:money(35000)},1,String(heading.payload.attemptId));
   retry=c;
   const app=await api(f.principal,{async afterWrite(at){if(at===stage)throw new Error(`injected ${stage}`);}});
   expect((await post(app,c)).statusCode).toBe(500);
   for(const table of ['delivery_outcomes','outcome_quantities','outcome_collections','effective_task_outcomes'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount,`${stage}:${table}`).toBe(0);
   for(const table of ['command_identities','command_audit','outbox_intents','intake_replan_intents'])expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[c.actionId])).rowCount,`${stage}:${table}`).toBe(0);
   expect(await current.read(f.principal,f.round.roundId)).toEqual(before);expect((await db.pool.query('SELECT * FROM tawsel.planning_states WHERE tenant_id=$1',[f.tenantId])).rows).toEqual(plan);
  }
  const app=await api(f.principal);expect((await post(app,retry!)).statusCode).toBe(200);expect((await db.pool.query('SELECT * FROM tawsel.delivery_outcomes')).rowCount).toBe(1);
 });
 test.each([true,false])('C: independent connections serialize duplicate action=%s without duplicate pieces or shipping',async(sameAction)=>{
  const f=await company([{}]),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});
  const holder=Number((await one.query('SELECT pg_backend_pid() AS pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
  expect(holder).not.toBe(waiter);const reached=deferred(),release=deferred();
  const app1=await api(f.principal,{async afterWrite(stage){if(stage==='domain'){reached.resolve();await release.promise;}}},one),app2=await api(f.principal,undefined,two);
  const first=f.make(0,'outcome.recordFull',{reportedCollection:money(35000)}),second=structuredClone(first);if(!sameAction)second.actionId=randomUUID();
  const a=post(app1,first);let b:ReturnType<typeof post>|undefined;
  try{await reached.promise;b=post(app2,second);await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const [ra,rb]=await Promise.all([a,b]);expect(ra.statusCode,ra.body).toBe(200);expect(rb.statusCode,rb.body).toBe(sameAction?200:409);if(sameAction)expect(rb.json()).toEqual(ra.json());else expect(rb.json().receipt.problem.code).toBe('stale_revision');
   expect((await db.pool.query('SELECT sum(delivered)::int AS delivered,sum(held_return_required)::int AS held FROM tawsel.outcome_quantities')).rows[0]).toEqual({delivered:3,held:0});
   expect((await db.pool.query('SELECT sum(reported_minor)::text AS reported,sum(shipping_minor)::text AS shipping,count(*)::int AS n FROM tawsel.outcome_collections')).rows[0]).toEqual({reported:'35000',shipping:'5000',n:1});
   expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='outcome.recorded'")).rowCount).toBe(1);
  }finally{release.resolve();await Promise.allSettled([a,...(b?[b]:[])]);await one.end();await two.end();}
 });
 test('C: underpayment, forbidden split and invalid wire quantities leave no ledger/progress/outbound effect',async()=>{
  const f=await company([{splittingAllowed:false},{}]),app=await api(f.principal);
  const cases=[f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}),f.make(1,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:1.5}],reportedCollection:money(25000)}),f.make(1,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:4}],reportedCollection:money(45000)}),f.make(1,'outcome.recordFull',{reportedCollection:money(34999)}),f.make(1,'outcome.recordFull',{reportedCollection:money(-1)}),f.make(1,'outcome.recordFull',{reportedCollection:money(Number.MAX_SAFE_INTEGER+1)}),f.make(1,'outcome.recordFull',{reportedCollection:{...money(35000),currency:'USD'}}),f.make(1,'outcome.recordNoAnswer',{shippingPayment:'refused'}),f.make(1,'outcome.recordPartial',{pieces:[{sourceLineId:'unknown',delivered:2}],reportedCollection:money(25000)})];
  for(const c of cases){const response=await post(app,c);expect(response.statusCode,response.body).toBe(400);expect((await db.pool.query('SELECT * FROM tawsel.outbox_intents WHERE action_id=$1',[c.actionId])).rowCount).toBe(0);}
  for(const table of ['delivery_outcomes','outcome_quantities','outcome_collections','effective_task_outcomes'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
  expect((await new Outcomes(db.pool).read(f.principal,f.round.roundId)).progress.processed).toBe(0);
  const rejected=await app.inject(`/api/v1/outcomes/actions/${cases[0]!.actionId}?kind=company`);expect(rejected.json()).toMatchObject({status:'rejected',result:{receipt:{problem:{code:'validation_failed'}}}});
  expect((await db.pool.query('SELECT * FROM tawsel.command_evidence WHERE action_id=$1',[cases[0]!.actionId])).rowCount).toBe(1);
 });
 test('C: paid refusal, explicit unpaid shipping and no-answer remain distinct in same-address independent shipments',async()=>{
  const f=await company([{},{},{}]),app=await api(f.principal);
  const paid=await post(app,f.make(0,'outcome.recordRefusal',{reportedCollection:money(5000),shippingPayment:'collected'}));expect(paid.statusCode,paid.body).toBe(200);
  const unpaid=await post(app,f.make(1,'outcome.recordRefusal',{reportedCollection:money(0),shippingPayment:'refused'},1));expect(unpaid.statusCode,unpaid.body).toBe(200);
  const no=await post(app,f.make(2,'outcome.recordNoAnswer',{},2));expect(no.statusCode,no.body).toBe(200);
  expect(body(paid).outcome.collection).toMatchObject({shipping:money(5000),unpaidShipping:money(0),shippingStatus:'collected'});
  expect(body(unpaid).outcome.collection).toMatchObject({reported:money(0),unpaidShipping:money(5000),shippingStatus:'explicitly-unpaid'});
  expect(body(no).outcome.collection).toMatchObject({reported:null,unpaidShipping:money(0),shippingStatus:'not-attempted'});
  const snapshot=(await app.inject(`/api/v1/outcomes/rounds/${f.round.roundId}?kind=company`)).json() as components['schemas']['OutcomeSnapshot'];expect(snapshot.progress).toMatchObject({processed:3,refused:2,noAnswer:1,deliveredPieces:0,heldReturnRequiredPieces:9,collection:[{reportedMinor:'5000',unpaidShippingMinor:'5000'}]});expect(new Set(snapshot.items.map(o=>o.taskId)).size).toBe(3);
  expect((await new CurrentActivity(db.pool).read(f.principal,f.round.roundId))).toMatchObject({currentActivity:null,nextSuggestion:null,physicalOrigin:null,targets:[]});
 });
 test('C: exact multiple-line prepaid allocation and prepaid zero persist without charging source adjustments twice',async()=>{
  const lines=[{sourceLineId:'paid',description:'مدفوع',quantity:1,unitDue:money(0)},{sourceLineId:'remaining',description:'متبقي',quantity:2,unitDue:money(6500)}];
  const f=await company([{lines,shippingDue:money(0),totalDue:money(13000)},{lines:[{sourceLineId:'paid',description:'مدفوع',quantity:3,unitDue:money(0)}],shippingDue:money(0),totalDue:money(0)}]),app=await api(f.principal);
  const partial=await post(app,f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'paid',delivered:1},{sourceLineId:'remaining',delivered:1}],reportedCollection:money(6500)}));expect(partial.statusCode,partial.body).toBe(200);
  expect(body(partial).outcome.lines.map(l=>[l.sourceLineId,l.delivered,l.heldReturnRequired])).toEqual([['paid',1,0],['remaining',1,1]]);
  const zero=await post(app,f.make(1,'outcome.recordFull',{reportedCollection:money(0)},1));expect(zero.statusCode,zero.body).toBe(200);expect(body(zero).outcome.collection).toMatchObject({reported:money(0),shippingStatus:'not-due'});
  expect((await new Outcomes(db.pool).read(f.principal,f.round.roundId)).progress.collection[0]?.reportedMinor).toBe('6500');
 });
 test('C: B2C rejects piece/shipping workflows and supports optional exact collection without custody',async()=>{
  const f=await startedFixture(db.pool,2),app=await api(principals.personal);
  const c=f.make(0,0,null,'outcome.recordPartial');c.payload.pieces=[{sourceLineId:'line',delivered:1}];c.payload.reportedCollection=money(10);expect((await post(app,c)).statusCode).toBe(400);
  const full=f.make(0,0,null,'outcome.recordFull'),accepted=await post(app,full);expect(accepted.statusCode,accepted.body).toBe(200);expect(body(accepted).outcome).toMatchObject({kind:'personal',lines:[],returnRequired:false,collection:{reported:null,shippingStatus:'not-applicable'}});
  const refused=f.make(1,1,null,'outcome.recordRefusal'),r=await post(app,refused);expect(r.statusCode,r.body).toBe(200);expect(body(r).outcome.returnRequired).toBe(false);
  expect((await db.pool.query('SELECT * FROM tawsel.outcome_quantities')).rowCount).toBe(0);expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='outcome.recorded'")).rowCount).toBe(0);
  // Fresh personal intake during the active round is admitted; resolved tasks
  // stay excluded from capacity and the customer sequence.
  const added=await intake(db.pool,4);const next=await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId);expect(next.targets.map(t=>t.taskId)).toEqual([added.taskId]);
  const latest=(await db.pool.query('SELECT input FROM tawsel.planning_jobs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1',[ids.personalTenant])).rows[0].input as components['schemas']['PlanningInput'];expect(latest.members.filter(m=>m.eligible).map(m=>m.taskId)).toEqual([added.taskId]);
  const cod=await new IndependentIntakeService(db.pool).create(principals.personal,command('task.createIndependent',{recipientName:'تحصيل مستقل',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.1,longitude:31.2}},collectionAmount:money(12500)}));
  const taskId=(cod.response!.body.task as {taskId:string}).taskId,s=await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId),target=s.targets.find(t=>t.taskId===taskId)!;
  const pay=command('outcome.recordFull',{roundId:f.round.roundId,taskId,attemptId:target.attemptId,expectedActivityRevision:s.revision,expectedCurrentAttemptId:null,expectedSourceRevision:target.sourceRevision,expectedAssignmentRevision:target.assignmentRevision,expectedPinRevision:target.pinRevision,reportedCollection:money(12499)});pay.context=f.start.context;
  expect((await post(app,pay)).statusCode).toBe(400);pay.actionId=randomUUID();pay.payload.reportedCollection=money(12500);const paid=await post(app,pay);expect(paid.statusCode,paid.body).toBe(200);expect(body(paid).outcome.collection.reported).toEqual(money(12500));
 });
 test('C: aggregate collection stays exact beyond a single wire money safe-integer limit',async()=>{
  const source={lines:[{sourceLineId:'large',description:'دقة الحدود',quantity:1,unitDue:money(Number.MAX_SAFE_INTEGER)}],shippingDue:money(0),totalDue:money(Number.MAX_SAFE_INTEGER)};
  const f=await company([source,source]),app=await api(f.principal);
  for(let i=0;i<2;i++){
   const result=await post(app,f.make(i,'outcome.recordFull',{reportedCollection:money(Number.MAX_SAFE_INTEGER)},i));expect(result.statusCode,result.body).toBe(200);
  }
  expect((await new Outcomes(db.pool).read(f.principal,f.round.roundId)).progress.collection[0]?.reportedMinor).toBe('18014398509481982');
 });
 test('C: stale owner/current/source/assignment/pin are rejected, whereas harmless route revision alone is compatible',async()=>{
  const f=await company(),app=await api(f.principal),base=f.make(0,'outcome.recordFull',{reportedCollection:money(35000)});
  for(const field of ['expectedActivityRevision','expectedSourceRevision','expectedAssignmentRevision','expectedPinRevision']){const c=structuredClone(base);c.actionId=randomUUID();c.payload[field]=9;expect((await post(app,c)).json()).toMatchObject({receipt:{businessStatus:'rejected',problem:{code:'stale_revision'}}});}
  const otherDevice=structuredClone(base);otherDevice.actionId=randomUUID();if(otherDevice.context.kind!=='device')throw new Error('device');otherDevice.context.deviceGeneration++;
  expect((await post(app,otherDevice)).json()).toMatchObject({receipt:{problem:{code:'stale_device'}}});expect((await db.pool.query('SELECT * FROM tawsel.command_evidence WHERE action_id=$1',[otherDevice.actionId])).rowCount).toBe(1);
  const current=new CurrentActivity(db.pool),heading=f.make(1,'current.selectHeading');await current.command(f.principal,heading);
  const incompatible=structuredClone(base);incompatible.actionId=randomUUID();incompatible.payload.expectedActivityRevision=1;incompatible.payload.expectedCurrentAttemptId=heading.payload.attemptId;expect((await post(app,incompatible)).json()).toMatchObject({receipt:{problem:{code:'lifecycle_forbidden'}}});
  const compatible=f.make(1,'outcome.recordFull',{reportedCollection:money(35000)},1,String(heading.payload.attemptId));compatible.baseVersions={routeRevision:999};expect((await post(app,compatible)).statusCode).toBe(200);
  const changed=structuredClone(compatible);changed.payload.reportedCollection=money(35001);expect((await post(app,changed)).statusCode).toBe(409);
 });
 test('C: CSRF, route-command mismatch, cross-tenant reads and retained-result visibility cannot bypass authority',async()=>{
  const f=await company([{}]),app=await api(f.principal),c=f.make(0,'outcome.recordFull',{reportedCollection:money(35000)});
  expect((await app.inject({method:'POST',url:'/api/v1/outcomes/full?kind=company',payload:c})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url:'/api/v1/outcomes/no-answer?kind=company',headers,payload:c})).statusCode).toBe(400);
  expect((await post(app,c)).statusCode).toBe(200);
  await expect(new Outcomes(db.pool).read(principals.personal,f.round.roundId)).rejects.toMatchObject({code:'forbidden_resource'});
  expect(await new Outcomes(db.pool).result(principals.personal,c.actionId)).toEqual({actionId:c.actionId,status:'pending'});
  expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Denied',capabilities:[]}))).statusCode).toBe(200);
  expect((await post(app,c)).statusCode).toBe(403);expect((await app.inject(`/api/v1/outcomes/actions/${c.actionId}?kind=company`)).statusCode).toBe(403);
  expect((await db.pool.query('SELECT * FROM tawsel.delivery_outcomes')).rowCount).toBe(1);
 });
 test('C: delayed planning and later pin correction cannot restore resolved customer work or mutate first forecast',async()=>{
  const f=await company(),app=await api(f.principal),reached=deferred(),release=deferred();let delayed=true;
  const state=await f.service.plans(f.principal,f.driverId);await f.service.command(f.principal,f.planCommand('planning.requestReplan',{expectedSettingsRevision:state.settingsRevision}));
  const provider=await providerFixture({async beforeResponse(){if(delayed){delayed=false;reached.resolve();await release.promise;}}});closers.push(()=>provider.close());
  const baseline=(await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rows;
  const running=runPlanningOnce(db.pool,provider.engine);
  try{await reached.promise;const result=await post(app,f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}));expect(result.statusCode,result.body).toBe(200);release.resolve();await running;}
  finally{release.resolve();await running;}
  await runPlanningOnce(db.pool,provider.engine);const plans=await f.service.plans(f.principal,f.driverId);expect(plans.items[0]?.routePolicy?.orderedTaskIds).toEqual([f.tasks[1]]);
  expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode).toBe(200);
  const pin=f.planCommand('location.confirmPin',{taskId:f.tasks[0],expectedSourceRevision:1,expectedLocationRevision:0,selection:{kind:'manual',coordinates:{latitude:30.2,longitude:31.2}},confirmed:true});delete pin.payload.driverId;pin.resources={taskId:f.tasks[0]!};
  const result=await new Locations(db.pool).confirm(f.principal,pin);expect(result.receipt.businessStatus).toBe('accepted');
  expect((await db.pool.query('SELECT p.state FROM tawsel.driver_planned_stops p JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,dispatch_cycle_id) WHERE c.task_id=$1',[f.tasks[0]])).rows[0].state).toBe('completed');
  expect((await new CurrentActivity(db.pool).read(f.principal,f.round.roundId)).targets.map(t=>t.taskId)).toEqual([f.tasks[1]]);
  expect((await db.pool.query('SELECT * FROM tawsel.forecast_revisions WHERE forecast_id=$1',[f.round.firstForecastId])).rows).toEqual(baseline.filter(b=>b.forecast_id===f.round.firstForecastId));
 });
});

test('C: public typed clients complete the two-task loopback HTTP demo and recover a lost successful response',async()=>{
 const report=await outcomeDemo();expect(report.started?.receipt.businessStatus).toBe('accepted');expect(report.status.status).toBe('accepted');expect(report.snapshot.progress).toMatchObject({processed:2,partial:1,noAnswer:1,deliveredPieces:2,heldReturnRequiredPieces:4});
});
