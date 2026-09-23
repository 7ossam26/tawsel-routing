import {beforeEach,afterEach,test,expect} from 'vitest';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture,principals} from '../support/access-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {money} from '../../src/outcomes/arithmetic.js';
import {withAccess} from '../../src/access/service.js';
import {lockInvariants} from '../../src/commands/locks.js';
import {planningState,snapshot} from '../../src/planning/queue.js';
import {stateFor} from '../../src/eligibility/state.js';
import {eligibilityConforms} from '../../src/eligibility/models.js';
import {Eligibility} from '../../src/eligibility/service.js';
import {eligibilityRoutes} from '../../src/eligibility/routes.js';
import {CurrentActivity} from '../../src/current/service.js';
import Fastify from 'fastify';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {deferred,observeDatabaseBlock} from '../support/barriers.js';
import type {ActionEnvelope,CommandHooks} from '../../src/commands/kernel.js';
import type {AuthConfig} from '../../src/auth/config.js';
import {startedFixture} from '../support/current-fixture.js';
import {send} from '../support/provisioning-fixture.js';
import {Locations} from '../../src/locations/service.js';
import {eligibilityDemo} from '../../../../scripts/eligibility-demo.js';
let db:Awaited<ReturnType<typeof createTestDatabase>>;
const closers:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const close of closers.splice(0).reverse())await close();await db?.close();});
async function company(overrides?:Parameters<typeof outcomeCompanyFixture>[1]){const f=await outcomeCompanyFixture(db,overrides);closers.push(()=>f.close());return f;}
const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p18',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p18',clientSecret:'fixture'}}};
const headers={origin:config.origin,cookie:'__Host-tawsel-browser=p18','x-csrf-token':'p18'};
type Fixture=Awaited<ReturnType<typeof company>>;
async function api(f:Fixture,pool=db.pool,observe?:Pick<CommandHooks,'afterWrite'>){const app=Fastify();await app.register(scope=>eligibilityRoutes(scope,pool,config,(_r,_kind,work)=>work(f.principal),new Eligibility(pool,observe)));await app.ready();closers.push(()=>app.close());return app;}
const paths:Record<string,string>={'task.deferWhole':'defer','task.retryWhole':'retry','task.activateDeferred':'activate','task.setDriverUrgency':'urgency'};
const post=(app:ReturnType<typeof Fastify>,c:ActionEnvelope)=>app.inject({method:'POST',url:`/api/v1/eligibility/${paths[c.operationId]}?kind=company`,headers,payload:c});
async function action(f:Fixture,index:number,operation:string,extra:Record<string,unknown>={}){
 const read=await new Eligibility(db.pool).read(f.principal,f.round.roundId),s=read.items.find(s=>s.taskId===f.tasks[index])!;
 const c=f.planCommand(operation,{roundId:f.round.roundId,taskId:s.taskId,attemptId:s.attemptId,expectedSourceRevision:s.sourceRevision,expectedAssignmentRevision:s.assignmentRevision,expectedPinRevision:s.pinRevision,expectedActivityRevision:read.activityRevision,expectedCurrentAttemptId:read.currentAttemptId,...(operation.startsWith('task.')?{expectedEligibilityRevision:s.revision}:{}),...extra});delete c.payload.driverId;c.context={...f.start.context};return c;
}
test('A: actual two-of-three delivery cannot become eligible for customer revisit',async()=>{
 const f=await company([{}]);await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}));
 const read=await withAccess(db.pool,f.principal,async(a,tx)=>{await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:f.driverId}]);const input=await snapshot(tx,await planningState(tx,f.tenantId,f.driverId));return stateFor(tx,f.tenantId,f.driverId,input.members[0]!,null,0);});
 expect(eligibilityConforms('State',read.state)).toBe(true);
 for(const action of Object.values(read.state.actions))expect(action).toMatchObject({allowed:false,blocker:'partial-or-delivered'});
 const c=f.make(0,'task.retryWhole',{expectedEligibilityRevision:0});expect(eligibilityConforms('RetryCommand',c)).toBe(true);
 c.payload.callCounter=3;expect(eligibilityConforms('RetryCommand',c)).toBe(false);
 expect((await db.pool.query('SELECT count(*)::int n FROM tawsel.planning_attempts WHERE tenant_id=$1',[f.tenantId])).rows[0].n).toBe(1);
});
test('B: whole retry creates a new admitted identity; duplicate action recovers one result and keeps old fee/history',async()=>{
 const f=await company([{}]),app=await api(f),outcomes=new Outcomes(db.pool);
 await outcomes.command(f.principal,await action(f,0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000)}));
 const old=(await outcomes.read(f.principal,f.round.roundId)).items[0]!;
 const c=await action(f,0,'task.retryWhole'),r=await post(app,c);expect(r.statusCode,r.body).toBe(200);
 const change=r.json().response.body.change;expect(change.attemptId).not.toBe(old.attemptId);expect(change.previousAttemptId).toBe(old.attemptId);
 expect((await post(app,c)).json()).toEqual(r.json());expect((await app.inject(`/api/v1/eligibility/actions/${c.actionId}?kind=company`)).json().result).toEqual(r.json());
 expect((await outcomes.read(f.principal,f.round.roundId)).progress).toMatchObject({processed:0,heldReturnRequiredPieces:0,collection:[{reportedMinor:'5000'}]});
 expect((await db.pool.query('SELECT stage FROM tawsel.execution_attempts WHERE attempt_id=$1',[old.attemptId])).rows[0].stage).toBe('resolved');
 expect((await db.pool.query('SELECT * FROM tawsel.round_admissions WHERE attempt_id=$1',[change.attemptId])).rowCount).toBe(1);
 const full=await outcomes.command(f.principal,await action(f,0,'outcome.recordFull',{reportedCollection:money(30000)}));expect(full.receipt.businessStatus).toBe('accepted');
 const read=await outcomes.read(f.principal,f.round.roundId);expect(read.history).toHaveLength(2);expect(read.progress).toMatchObject({processed:1,full:1,deliveredPieces:3,heldReturnRequiredPieces:0,collection:[{reportedMinor:'35000'}]});
 expect((await db.pool.query('SELECT sum(shipping_minor)::text n FROM tawsel.outcome_collections')).rows[0].n).toBe('5000');
 expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='task.retryAdmitted'")).rows).toHaveLength(1);
 expect(eligibilityConforms('Event',(await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE event_type='task.retryAdmitted'")).rows[0].payload)).toBe(true);
});
test('B: future deferral stays visible, urgency preserves current, manual choices cannot revive it',async()=>{
 const f=await company(),app=await api(f),current=new CurrentActivity(db.pool);
 await current.command(f.principal,await action(f,0,'current.selectHeading'));
 const before=await current.read(f.principal,f.round.roundId),tomorrow=new Date(Date.now()+86400000).toISOString();
 const defer=await post(app,await action(f,1,'task.deferWhole',{earliestAt:tomorrow}));expect(defer.statusCode,defer.body).toBe(200);
 expect((await post(app,await action(f,1,'task.setDriverUrgency',{urgency:'urgent'}))).statusCode).toBe(200);
 const read=await new Eligibility(db.pool).read(f.principal,f.round.roundId),s=read.items.find(s=>s.taskId===f.tasks[1])!;
 expect(s).toMatchObject({deferred:true,earliestAt:tomorrow,urgency:'urgent',actions:{activate:{allowed:false,blocker:'earliest-time'}}});
 expect((await current.read(f.principal,f.round.roundId)).currentActivity).toEqual(before.currentActivity);
 const activate=await post(app,await action(f,1,'task.activateDeferred'));expect(activate.statusCode).toBe(409);
 const plans=await f.service.plans(f.principal,f.driverId);await expect(f.service.command(f.principal,f.planCommand('planning.setManualOrder',{expectedSettingsRevision:plans.settingsRevision,expectedInputRevision:plans.inputRevision,expectedManualRevision:plans.manualRevision,selection:{kind:'order',taskIds:f.tasks}}))).rejects.toMatchObject({code:'invalid_manual_order'});
 const own=await post(app,await action(f,0,'task.deferWhole',{earliestAt:tomorrow}));expect(own.statusCode).toBe(409);expect(own.body).toContain('current-customer');
 // A controlled elapsed-time fixture advances only the scheduling boundary;
 // reading/planning still must not automatically reactivate the held work.
 await db.pool.query("UPDATE tawsel.task_execution_options SET earliest_at=clock_timestamp()-interval '1 minute' WHERE tenant_id=$1 AND task_id=$2",[f.tenantId,f.tasks[1]]);
 expect((await current.read(f.principal,f.round.roundId)).targets.map(x=>x.taskId)).not.toContain(f.tasks[1]);
 expect((await post(app,await action(f,1,'task.activateDeferred'))).statusCode).toBe(200);
 expect((await current.read(f.principal,f.round.roundId)).targets.map(x=>x.taskId)).toContain(f.tasks[1]);
});
test('B: failures at every kernel write boundary leave attempts, reservations, history and outbox unchanged',async()=>{
 const f=await company([{}]);await new Outcomes(db.pool).command(f.principal,await action(f,0,'outcome.recordNoAnswer'));
 const before=await new Eligibility(db.pool).read(f.principal,f.round.roundId),c=await action(f,0,'task.retryWhole');
 for(const stage of ['domain','progress','audit','outbox','result'] as const){
  const app=await api(f,db.pool,{async afterWrite(at){if(at===stage)throw new Error(`injected ${stage}`);}});expect((await post(app,c)).statusCode).toBe(500);
  expect(await new Eligibility(db.pool).read(f.principal,f.round.roundId)).toEqual(before);
  expect((await db.pool.query('SELECT * FROM tawsel.planning_attempts WHERE tenant_id=$1',[f.tenantId])).rowCount).toBe(1);
  expect((await db.pool.query('SELECT state FROM tawsel.driver_planned_stops WHERE tenant_id=$1',[f.tenantId])).rows[0].state).toBe('completed');
  for(const table of ['command_identities','command_audit','outbox_intents','intake_replan_intents','task_eligibility_history'])expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[c.actionId])).rowCount).toBe(0);
 }
 expect((await post(await api(f),c)).statusCode).toBe(200);
});
test.each([true,false])('B: independent PostgreSQL connections serialize retry duplicate=%s',async(same)=>{
 const f=await company([{}]);await new Outcomes(db.pool).command(f.principal,await action(f,0,'outcome.recordNoAnswer'));
 const one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid);expect(holder).not.toBe(waiter);
 const entered=deferred(),release=deferred(),a1=await api(f,one,{async afterWrite(stage){if(stage==='domain'){entered.resolve();await release.promise;}}}),a2=await api(f,two),c=await action(f,0,'task.retryWhole'),c2=structuredClone(c);if(!same)c2.actionId=randomUUID();
 const a=post(a1,c);let b:ReturnType<typeof post>|undefined;
 try{await entered.promise;b=post(a2,c2);await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const [x,y]=await Promise.all([a,b]);expect(x.statusCode,x.body).toBe(200);expect(y.statusCode,y.body).toBe(same?200:409);if(same)expect(y.json()).toEqual(x.json());expect((await db.pool.query('SELECT * FROM tawsel.planning_attempts WHERE tenant_id=$1',[f.tenantId])).rowCount).toBe(2);expect((await db.pool.query('SELECT * FROM tawsel.task_eligibility_history')).rowCount).toBe(1);}
 finally{release.resolve();await Promise.allSettled([a,...(b?[b]:[])]);await one.end();await two.end();}
});
test('B: independent retries race for the fiftieth stop; denied shipment stays held with its original history',async()=>{
 const f=await company(),outcomes=new Outcomes(db.pool);
 for(let i=0;i<2;i++)await outcomes.command(f.principal,await action(f,i,'outcome.recordNoAnswer'));
 for(let i=0;i<49;i++)await f.task(`capacity-${i}`,'ordinary');
 const one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1}),entered=deferred(),release=deferred();
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid);
 const app1=await api(f,one,{async afterWrite(stage){if(stage==='domain'){entered.resolve();await release.promise;}}}),app2=await api(f,two),c1=await action(f,0,'task.retryWhole'),c2=await action(f,1,'task.retryWhole');
 const history=(await outcomes.read(f.principal,f.round.roundId)).history,a=post(app1,c1);let b:ReturnType<typeof post>|undefined;
 try{await entered.promise;b=post(app2,c2);await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const [x,y]=await Promise.all([a,b]);expect(x.statusCode,x.body).toBe(200);expect(y.statusCode,y.body).toBe(409);expect(y.json().receipt.problem.code).toBe('capacity_exceeded');
  expect((await db.pool.query("SELECT * FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND state='remaining'",[f.tenantId])).rowCount).toBe(50);
  const read=await new Eligibility(db.pool).read(f.principal,f.round.roundId),held=read.items.find(s=>s.taskId===f.tasks[1])!;expect(held.attemptId).toBe(c2.payload.attemptId);expect(held.actions.retry).toMatchObject({allowed:false,blocker:'capacity'});
  expect((await outcomes.read(f.principal,f.round.roundId)).history).toEqual(history);
  expect((await db.pool.query('SELECT state FROM tawsel.b2b_dispatch_cycles WHERE tenant_id=$1 AND task_id=$2',[f.tenantId,f.tasks[1]])).rows[0].state).toBe('held');
  expect((await db.pool.query('SELECT * FROM tawsel.task_eligibility_history WHERE task_id=$1',[f.tasks[1]])).rowCount).toBe(0);
 }finally{release.resolve();await Promise.allSettled([a,...(b?[b]:[])]);await one.end();await two.end();}
},40_000);
test('C: repeated explicit retries retain every attempt, collect shipping once and impose no call/retry cap',async()=>{
 const f=await company([{}]),app=await api(f),outcomes=new Outcomes(db.pool);
 for(let i=0;i<5;i++){
  const result=await outcomes.command(f.principal,await action(f,0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(i===0?5000:0)}));expect(result.receipt.businessStatus).toBe('accepted');
  const retry=await post(app,await action(f,0,'task.retryWhole'));expect(retry.statusCode,retry.body).toBe(200);
 }
 const wrong=await outcomes.command(f.principal,await action(f,0,'outcome.recordFull',{reportedCollection:money(35000)}));expect(wrong.receipt.problem?.code).toBe('validation_failed');
 expect((await outcomes.command(f.principal,await action(f,0,'outcome.recordFull',{reportedCollection:money(30000)}))).receipt.businessStatus).toBe('accepted');
 const read=await outcomes.read(f.principal,f.round.roundId);expect(read.history).toHaveLength(6);expect(new Set(read.history!.map(o=>o.attemptId)).size).toBe(6);expect(read.progress).toMatchObject({processed:1,full:1,deliveredPieces:3,collection:[{reportedMinor:'35000'}]});
 expect((await db.pool.query('SELECT sum(shipping_minor)::text n FROM tawsel.outcome_collections')).rows[0].n).toBe('5000');
 await expect(db.pool.query('UPDATE tawsel.planning_attempts SET latest=true WHERE tenant_id=$1 AND attempt_id=$2',[f.tenantId,read.history![0]!.attemptId])).rejects.toMatchObject({code:'23514'});
});
test('C: each receipt/disposal dependency blocks whole retry; partial remainder cannot be deferred or retried through API',async()=>{
 const f=await company([{},{},{},{},{}]),app=await api(f),outcomes=new Outcomes(db.pool);
 for(const [i,reason] of ['branch-received','lost','damaged','redispatched'].entries()){
  await outcomes.command(f.principal,await action(f,i,'outcome.recordNoAnswer'));
  // Future P21/P22 dependency producer fixture, not a physical receipt API.
  await db.pool.query('INSERT INTO tawsel.retry_dependencies (tenant_id,dispatch_cycle_id,dependency_id,reason) SELECT tenant_id,dispatch_cycle_id,$3,$4 FROM tawsel.b2b_dispatch_cycles WHERE tenant_id=$1 AND task_id=$2',[f.tenantId,f.tasks[i],randomUUID(),reason]);
  const response=await post(app,await action(f,i,'task.retryWhole'));expect(response.statusCode).toBe(409);expect(response.body).toContain('receipt-or-disposition');
 }
 await outcomes.command(f.principal,await action(f,4,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}));
 for(const op of ['task.retryWhole','task.deferWhole']){const response=await post(app,await action(f,4,op,op==='task.deferWhole'?{earliestAt:new Date(Date.now()+86400000).toISOString()}:{}));expect(response.statusCode).toBe(409);expect(response.body).toContain('partial-or-delivered');}
 expect((await db.pool.query('SELECT * FROM tawsel.task_eligibility_history')).rowCount).toBe(0);expect((await db.pool.query('SELECT * FROM tawsel.planning_attempts WHERE tenant_id=$1',[f.tenantId])).rowCount).toBe(5);
});
test('C: staff ERP urgency remains departure-locked; assigned driver urgency succeeds with harmless route revision',async()=>{
 const f=await company([{}]),app=await api(f);
 const erp=await f.app.inject({method:'POST',url:'/api/v1/intake/commands/intake.setUrgencyBeforeDeparture',headers:{authorization:`Bearer ${f.source.token}`},payload:f.source.command('intake.setUrgencyBeforeDeparture',{externalId:'shipment-0',sourceDispatchCycleId:'cycle',sourceRevision:2,expectedSourceRevision:1,priority:'urgent'})});
 expect(erp.statusCode).toBe(409);expect(erp.body).toContain('departed_edit_forbidden');
 const c=await action(f,0,'task.setDriverUrgency',{urgency:'urgent'});c.baseVersions={routeRevision:999999};expect((await post(app,c)).statusCode).toBe(200);
 const source=(await db.pool.query('SELECT payload FROM tawsel.b2b_source_snapshots WHERE tenant_id=$1',[f.tenantId])).rows[0].payload;expect(source.priority).toBe('ordinary');
 expect((await new Eligibility(db.pool).read(f.principal,f.round.roundId)).items[0]!.urgency).toBe('urgent');
 for(const field of ['expectedEligibilityRevision','expectedSourceRevision','expectedAssignmentRevision','expectedPinRevision']){const stale=await action(f,0,'task.setDriverUrgency',{urgency:'ordinary'});stale.payload[field]=999;expect((await post(app,stale)).json().receipt.problem.code).toBe('stale_revision');}
 const wrong=await action(f,0,'task.setDriverUrgency',{urgency:'ordinary'});if(wrong.context.kind==='device')wrong.context.deviceGeneration++;expect((await post(app,wrong)).json().receipt.problem.code).toBe('stale_device');
 const invalid=await action(f,0,'task.setDriverUrgency',{urgency:'ordinary',callCounter:3});expect((await post(app,invalid)).statusCode).toBe(400);
 expect((await app.inject({method:'POST',url:'/api/v1/eligibility/urgency?kind=company',payload:c})).statusCode).toBe(403);
 expect((await app.inject({method:'POST',url:'/api/v1/eligibility/retry?kind=company',headers,payload:c})).statusCode).toBe(400);
 await expect(new Eligibility(db.pool).read(principals.personal,f.round.roundId)).rejects.toMatchObject({statusCode:404});
 // Revoking the actual role denies even replay/recovery; a durable old result is
 // never a replacement for current authorization.
 await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'revoked',capabilities:[]}));
 expect((await post(app,c)).statusCode).toBe(403);expect((await app.inject(`/api/v1/eligibility/actions/${c.actionId}?kind=company`)).statusCode).toBe(403);
});
test('C: driver pin correction cannot reactivate deferred work; held outcome can defer then retry only when due',async()=>{
 const f=await company([{}]),app=await api(f),outcomes=new Outcomes(db.pool);
 await outcomes.command(f.principal,await action(f,0,'outcome.recordNoAnswer'));
 const tomorrow=new Date(Date.now()+86400000).toISOString();expect((await post(app,await action(f,0,'task.deferWhole',{earliestAt:tomorrow}))).statusCode).toBe(200);
 expect((await post(app,await action(f,0,'task.retryWhole'))).body).toContain('earliest-time');
 await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'driver',capabilities:['execution.own','correction.own']}));
 const pin=f.planCommand('location.confirmPin',{taskId:f.tasks[0],expectedSourceRevision:1,expectedLocationRevision:0,selection:{kind:'manual',coordinates:{latitude:30.06,longitude:31.25}},confirmed:true});delete pin.payload.driverId;pin.resources={taskId:f.tasks[0]!};
 expect((await new Locations(db.pool).confirm(f.principal,pin)).receipt.businessStatus).toBe('accepted');
 expect((await db.pool.query('SELECT state FROM tawsel.driver_planned_stops WHERE tenant_id=$1',[f.tenantId])).rows[0].state).toBe('completed');
 expect((await new CurrentActivity(db.pool).read(f.principal,f.round.roundId)).targets).toHaveLength(0);
 await db.pool.query("UPDATE tawsel.task_execution_options SET earliest_at=clock_timestamp()-interval '1 minute' WHERE tenant_id=$1",[f.tenantId]);
 expect((await post(app,await action(f,0,'task.retryWhole'))).statusCode).toBe(200);expect((await outcomes.read(f.principal,f.round.roundId)).history).toHaveLength(1);
});
test('C: B2C retry keeps simple task history, with no quantity/custody or shipping workflow',async()=>{
 const f=await startedFixture(db.pool,1),outcomes=new Outcomes(db.pool),service=new Eligibility(db.pool);
 const noAnswer=f.make(0,0,null,'outcome.recordNoAnswer');expect((await outcomes.command(principals.personal,noAnswer)).receipt.businessStatus).toBe('accepted');
 const read=await service.read(principals.personal,f.round.roundId),s=read.items[0]!,c=f.make(0,read.activityRevision,null,'task.retryWhole');c.payload.expectedEligibilityRevision=s.revision;
 expect((await service.command(principals.personal,c)).receipt.businessStatus).toBe('accepted');
 const latest=await service.read(principals.personal,f.round.roundId),full=f.make(0,latest.activityRevision,null,'outcome.recordFull');full.payload.attemptId=latest.items[0]!.attemptId;
 expect((await outcomes.command(principals.personal,full)).receipt.businessStatus).toBe('accepted');
 expect((await db.pool.query('SELECT * FROM tawsel.outcome_quantities')).rowCount).toBe(0);expect((await outcomes.read(principals.personal,f.round.roundId)).progress).toMatchObject({processed:1,full:1,heldReturnRequiredPieces:0,collection:[]});
});
test('C: actual HTTP consumer demo recovers retry and reports cumulative fees with future urgent work excluded',async()=>{const report=await eligibilityDemo();expect(report.outcomes.progress.collection[0]?.reportedMinor).toBe('35000');expect(report.events).toHaveLength(3);});
test('C: repeated unpaid refusals preserve one outstanding fee, later payment clears it without multiplying liability',async()=>{
 const f=await company([{}]),app=await api(f),outcomes=new Outcomes(db.pool);
 for(let i=0;i<2;i++){
  expect((await outcomes.command(f.principal,await action(f,0,'outcome.recordRefusal',{shippingPayment:'refused',reportedCollection:money(0)}))).receipt.businessStatus).toBe('accepted');
  expect((await outcomes.read(f.principal,f.round.roundId)).progress.collection[0]).toMatchObject({reportedMinor:'0',unpaidShippingMinor:'5000'});
  expect((await post(app,await action(f,0,'task.retryWhole'))).statusCode).toBe(200);
 }
 expect((await outcomes.command(f.principal,await action(f,0,'outcome.recordFull',{reportedCollection:money(35000)}))).receipt.businessStatus).toBe('accepted');
 expect((await outcomes.read(f.principal,f.round.roundId)).progress.collection[0]).toMatchObject({reportedMinor:'35000',unpaidShippingMinor:'0'});
});
test('C: driver earliest cannot precede source earliest; deferral does not invent an urgency override before departure',async()=>{
 const f=await company([{}]),app=await api(f),sourceTime=new Date(Date.now()+3*86400000).toISOString();
 f.tasks.push(await f.task('source-future','ordinary','held',sourceTime));
 const deferred=await post(app,await action(f,1,'task.deferWhole',{earliestAt:new Date(Date.now()+86400000).toISOString()}));expect(deferred.statusCode,deferred.body).toBe(200);
 expect(deferred.json().response.body.change.earliestAt).toBe(sourceTime);expect(deferred.json().response.body.state.earliestAt).toBe(sourceTime);
 expect((await db.pool.query('SELECT urgency FROM tawsel.task_execution_options WHERE task_id=$1',[f.tasks[1]])).rows[0].urgency).toBeNull();
 expect((await f.post('intake.setUrgencyBeforeDeparture',{externalId:'source-future',sourceDispatchCycleId:'cycle',sourceRevision:2,expectedSourceRevision:1,priority:'urgent'})).statusCode).toBe(200);
 const state=(await new Eligibility(db.pool).read(f.principal,f.round.roundId)).items.find(s=>s.taskId===f.tasks[1])!;expect(state).toMatchObject({earliestAt:sourceTime,urgency:'urgent',sourceRevision:2,actions:{activate:{allowed:false,blocker:'earliest-time'}}});
});
