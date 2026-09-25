import {beforeEach,afterEach,test,expect} from 'vitest';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture,principals,ids} from '../support/access-fixture.js';
import {startedFixture} from '../support/current-fixture.js';
import {CurrentActivity} from '../../src/current/service.js';
import {Closures} from '../../src/closure/service.js';
import {Rounds} from '../../src/rounds/service.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {money} from '../../src/outcomes/arithmetic.js';
import {command} from '../support/planning-fixture.js';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import type {ActionEnvelope,CommandHooks} from '../../src/commands/kernel.js';
import {deferred,observeDatabaseBlock} from '../support/barriers.js';
import Fastify from 'fastify';
import {closureRoutes} from '../../src/closure/routes.js';
import type {AuthConfig} from '../../src/auth/config.js';
import {WorkdayReads} from '../../src/closure/reads.js';
import {Eligibility} from '../../src/eligibility/service.js';
import {PlanningService} from '../../src/planning/service.js';
import {formatWorkdayInstant} from '../../../../packages/api-client/src/closure.js';
import {workdayDemo} from '../../../../scripts/workday-demo.js';
let db:Awaited<ReturnType<typeof createTestDatabase>>;
const cleanup:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const close of cleanup.splice(0).reverse())await close();await db?.close();});
type Started={round:components['schemas']['RoundRound'];start:ActionEnvelope};
function closeCommand(f:Started,operation='workday.end',extra:Record<string,unknown>={}){
 const c=command(operation,{workdayId:f.round.workdayId,roundId:f.round.roundId,expectedActiveRoundId:f.round.roundId,expectedActivityRevision:0,expectedCurrentAttemptId:null,currentAction:'require-none',...extra});c.context={...f.start.context};return c;
}
const resultBody=(r:Awaited<ReturnType<Closures['command']>>)=>r.response!.body as components['schemas']['ClosureCommandResult'];
test('A: database rejects day closure with an active round and round closure with unresolved current',async()=>{
 const f=await startedFixture(db.pool,1);
 await expect(db.pool.query('UPDATE tawsel.workdays SET ended_at=clock_timestamp() WHERE workday_id=$1',[f.round.workdayId])).rejects.toMatchObject({code:'23503'});
 await new CurrentActivity(db.pool).command(principals.personal,f.make());
 await expect(db.pool.query('UPDATE tawsel.rounds SET ended_at=clock_timestamp() WHERE round_id=$1',[f.round.roundId])).rejects.toMatchObject({code:'23503'});
 expect((await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId)).currentActivity?.stage).toBe('heading');
 expect((await db.pool.query('SELECT ended_at FROM tawsel.workdays')).rows[0].ended_at).toBe(null);
});
test('B: generic close explains heading; explicit pause preserves evidence; arrived customer must be resolved first',async()=>{
 const f=await startedFixture(db.pool,2),service=new Closures(db.pool),current=new CurrentActivity(db.pool);
 await current.command(principals.personal,f.make());const before=await current.read(principals.personal,f.round.roundId),attempt=before.currentActivity!.attemptId;
 const blocked=await service.command(principals.personal,closeCommand(f,'round.end',{expectedActivityRevision:1,expectedCurrentAttemptId:attempt}));
 expect(blocked.receipt.problem?.detail).toContain('أكّد إيقاف');expect((await current.read(principals.personal,f.round.roundId)).currentActivity).toEqual(before.currentActivity);
 const paused=await service.command(principals.personal,closeCommand(f,'round.end',{expectedActivityRevision:1,expectedCurrentAttemptId:attempt,currentAction:'pause-heading'}));expect(paused.receipt.businessStatus).toBe('accepted');
 expect(resultBody(paused).closure.pausedActivity).toEqual(before.currentActivity);
 const stored=(await db.pool.query('SELECT * FROM tawsel.execution_attempts WHERE attempt_id=$1',[attempt])).rows[0];expect(stored.stage).toBe('paused');expect(stored.heading).toEqual(before.currentActivity!.heading);expect(stored.arrival).toBe(null);expect(stored.resolution).toBe(null);
 expect((await new Rounds(db.pool).current(principals.personal))).toMatchObject({round:null,workday:{workdayId:f.round.workdayId}});
 expect((await new WorkdayReads(db.pool).summary(principals.personal,f.round.workdayId)).rounds.at(-1)).toMatchObject({roundId:f.round.roundId,activityRevision:2});
 expect((await db.pool.query('SELECT count(*)::int n FROM tawsel.delivery_outcomes')).rows[0].n).toBe(0);
 const ended=await service.command(principals.personal,closeCommand(f,'workday.end',{expectedActiveRoundId:null,expectedActivityRevision:2}));expect(ended.receipt.businessStatus).toBe('accepted');expect(resultBody(ended).closure.endedRoundId).toBe(null);
 await expect(db.pool.query('UPDATE tawsel.workdays SET ended_at=NULL WHERE workday_id=$1',[f.round.workdayId])).rejects.toMatchObject({code:'23514'});
 await expect(db.pool.query('UPDATE tawsel.rounds SET ended_at=NULL WHERE round_id=$1',[f.round.roundId])).rejects.toMatchObject({code:'23514'});
});
test('B: arrival cannot disappear through either closure action, even explicit pause',async()=>{
 const f=await startedFixture(db.pool,1),service=new Closures(db.pool),current=new CurrentActivity(db.pool);
 await current.command(principals.personal,f.make());const attempt=f.plan.input.members[0]!.attemptId;
 await current.command(principals.personal,f.make(0,1,attempt,'current.recordArrival'));
 for(const op of ['round.end','workday.end']){const result=await service.command(principals.personal,closeCommand(f,op,{expectedActivityRevision:2,expectedCurrentAttemptId:attempt,currentAction:'pause-heading'}));expect(result.receipt.problem?.detail).toContain('سجّل نتيجة');}
 expect((await current.read(principals.personal,f.round.roundId)).currentActivity?.stage).toBe('arrived');
 expect((await db.pool.query('SELECT count(*)::int n FROM tawsel.closure_records')).rows[0].n).toBe(0);
});
test('B: held returns and unpaid fees survive closure; same-ID and new-ID close add no duplicate closure events',async()=>{
 const f=await outcomeCompanyFixture(db,[{},{}]);cleanup.push(()=>f.close());const service=new Closures(db.pool),outcomes=new Outcomes(db.pool);
 await outcomes.command(f.principal,f.make(0,'outcome.recordRefusal',{shippingPayment:'refused',reportedCollection:money(0)}));
 const before=(await outcomes.read(f.principal,f.round.roundId));const cycles=(await db.pool.query('SELECT * FROM tawsel.b2b_dispatch_cycles WHERE tenant_id=$1 ORDER BY task_id',[f.tenantId])).rows;
 // P21's request producer does not exist yet. Seed only a labelled pending
 // request intent to prove closure does not resolve it or synthesize receipt.
 const pendingId=randomUUID();await db.pool.query("INSERT INTO tawsel.outbox_intents (tenant_id,event_id,source_id,action_id,recipient_id,event_type,payload_version,payload) VALUES ($1,$2,$3,$4,$5,'return.requested','1.0.0',$6)",[f.tenantId,pendingId,f.accountId,before.history![0]!.time.actionId,f.source.integrationId,{fixture:'pending P21 request intent',requestId:randomUUID()}]);
 const c=closeCommand(f,'workday.end',{expectedActivityRevision:1});const result=await service.command(f.principal,c);expect(result.receipt.businessStatus).toBe('accepted');
 expect(await new Closures(db.pool).command(f.principal,c)).toEqual(result);expect(await service.result(f.principal,c.actionId)).toMatchObject({status:'accepted',result});
 const again=await service.command(f.principal,{...c,actionId:randomUUID()});expect(resultBody(again)).toEqual({disposition:'already-closed',closure:resultBody(result).closure});
 expect(await outcomes.read(f.principal,f.round.roundId)).toEqual(before);expect((await db.pool.query('SELECT * FROM tawsel.b2b_dispatch_cycles WHERE tenant_id=$1 ORDER BY task_id',[f.tenantId])).rows).toEqual(cycles);
 expect((await db.pool.query("SELECT event_type FROM tawsel.outbox_intents WHERE tenant_id=$1 AND event_type IN ('round.ended','workday.ended') ORDER BY event_type",[f.tenantId])).rows).toEqual([{event_type:'round.ended'},{event_type:'workday.ended'}]);
 expect((await db.pool.query('SELECT count(*)::int n FROM tawsel.retry_dependencies WHERE tenant_id=$1',[f.tenantId])).rows[0].n).toBe(0);
 expect((await db.pool.query('SELECT state,resolved_at FROM tawsel.outbox_intents WHERE event_id=$1',[pendingId])).rows[0]).toEqual({state:'pending',resolved_at:null});
 expect((await new WorkdayReads(db.pool).carryForward(f.principal,f.round.workdayId)).items.find(i=>i.taskId===f.tasks[0])).toMatchObject({disposition:'return-required',heldReturnRequiredPieces:3,heldPieces:3,unpaidShippingMinor:'5000',eligibleNow:false});
 await expect(service.command(f.principal,{...c,payload:{...c.payload,currentAction:'pause-heading'}})).rejects.toMatchObject({code:'idempotency_conflict'});
});
test('B: every kernel fault rolls closure, pause, planning, audit, result and outbox back',async()=>{
 const f=await outcomeCompanyFixture(db,[{}]);cleanup.push(()=>f.close());await new CurrentActivity(db.pool).command(f.principal,f.make(0,'current.selectHeading'));
 const before=(await db.pool.query('SELECT to_jsonb(s) s FROM tawsel.planning_states s WHERE tenant_id=$1',[f.tenantId])).rows[0].s;
 for(const fault of ['domain','progress','audit','outbox','result']){
  const c=closeCommand(f,'workday.end',{expectedActivityRevision:1,expectedCurrentAttemptId:f.plan.input.members[0]!.attemptId,currentAction:'pause-heading'});
  const service=new Closures(db.pool,{async afterWrite(stage){if(stage===fault)throw new Error(`fault-${fault}`);}});
  await expect(service.command(f.principal,c)).rejects.toThrow(`fault-${fault}`);
  expect((await service.result(f.principal,c.actionId)).status).toBe('pending');
  expect((await db.pool.query('SELECT to_jsonb(s) s FROM tawsel.planning_states s WHERE tenant_id=$1',[f.tenantId])).rows[0].s).toEqual(before);
  expect((await new CurrentActivity(db.pool).read(f.principal,f.round.roundId)).currentActivity?.stage).toBe('heading');
  expect((await db.pool.query('SELECT ended_at FROM tawsel.workdays WHERE workday_id=$1',[f.round.workdayId])).rows[0].ended_at).toBe(null);
  for(const table of ['command_identities','command_audit','outbox_intents','closure_records'])expect((await db.pool.query(`SELECT 1 FROM tawsel.${table} WHERE action_id=$1`,[c.actionId])).rowCount).toBe(0);
 }
});
test('B: independent connections serialize duplicate closure at the database lock',async()=>{
 const f=await startedFixture(db.pool,1),a=new Pool({...db.config,max:1}),b=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();
 let first:Promise<unknown>|undefined,second:Promise<unknown>|undefined;
 try{const c=closeCommand(f),hooks:Pick<CommandHooks,'afterWrite'>={async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid);await release.promise;}}};
  first=new Closures(a,hooks).command(principals.personal,c);const holder=await held.promise,waiter=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;second=new Closures(b).command(principals.personal,c);
  await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const results=await Promise.all([first,second]);expect(results[0]).toEqual(results[1]);expect((await db.pool.query('SELECT 1 FROM tawsel.closure_records')).rowCount).toBe(1);
 }finally{release.resolve();await Promise.allSettled([first,second]);await a.end();await b.end();}
});
async function prepareStart(f:Awaited<ReturnType<typeof startedFixture>>){
 const state=await f.planning.plans(principals.personal,f.round.driverId);
 const order=command('planning.setManualOrder',{driverId:f.round.driverId,expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:f.tasks.map(t=>t.taskId)}});
 expect((await f.planning.command(principals.personal,order)).receipt.businessStatus).toBe('accepted');
 const plan=(await f.planning.plans(principals.personal,f.round.driverId)).items[0]!,c=command('round.start',{driverId:f.round.driverId,planId:plan.planId,expectedPlanRevision:plan.revision});c.context={...f.start.context};
 if(c.context.kind!=='device')throw new Error('device');
 const ready=await new Rounds(db.pool).readiness(principals.personal,{driverId:f.round.driverId,deviceId:c.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});c.payload.readinessId=ready.readinessId;return c;
}
for(const closeFirst of [true,false])test(`B: day close versus new start uses independent commits (${closeFirst?'close':'start'} first)`,async()=>{
 const f=await startedFixture(db.pool,1);await new Closures(db.pool).command(principals.personal,closeCommand(f,'round.end'));
 const start=await prepareStart(f),close=closeCommand(f,'workday.end',{expectedActiveRoundId:null}),a=new Pool({...db.config,max:1}),b=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();let first:Promise<unknown>|undefined,second:Promise<unknown>|undefined;
 try{const hooks:Pick<CommandHooks,'afterWrite'>={async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid);await release.promise;}}};
  first=closeFirst?new Closures(a,hooks).command(principals.personal,close):new Rounds(a,hooks).start(principals.personal,start);
  const holder=await held.promise,waiter=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  second=closeFirst?new Rounds(b).start(principals.personal,start):new Closures(b).command(principals.personal,close);
  await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const results=await Promise.all([first,second]) as Awaited<ReturnType<Closures['command']>>[];
  expect(results[0]!.receipt.businessStatus).toBe('accepted');expect(results[1]!.receipt.problem?.code).toBe('stale_revision');
  expect((await db.pool.query('SELECT 1 FROM tawsel.rounds r JOIN tawsel.workdays d USING(tenant_id,workday_id) WHERE r.ended_at IS NULL AND d.ended_at IS NOT NULL')).rowCount).toBe(0);
  expect((await db.pool.query('SELECT 1 FROM tawsel.workdays WHERE ended_at IS NULL')).rowCount).toBe(closeFirst?0:1);
  expect((await db.pool.query('SELECT 1 FROM tawsel.rounds WHERE ended_at IS NULL')).rowCount).toBe(closeFirst?0:1);
 }finally{release.resolve();await Promise.allSettled([first,second]);await a.end();await b.end();}
});
for(const closeFirst of [true,false])test(`B: day close versus outcome preserves one lifecycle order (${closeFirst?'close':'outcome'} first)`,async()=>{
 const f=await startedFixture(db.pool,1),outcome=f.make(0,0,null,'outcome.recordNoAnswer');outcome.payload={...outcome.payload};
 const close=closeCommand(f),a=new Pool({...db.config,max:1}),b=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();let first:Promise<unknown>|undefined,second:Promise<unknown>|undefined;
 try{const hooks:Pick<CommandHooks,'afterWrite'>={async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid);await release.promise;}}};
  first=closeFirst?new Closures(a,hooks).command(principals.personal,close):new Outcomes(a,hooks).command(principals.personal,outcome);
  const holder=await held.promise,waiter=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  second=closeFirst?new Outcomes(b).command(principals.personal,outcome):new Closures(b).command(principals.personal,close);
  await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const results=await Promise.all([first,second]) as Awaited<ReturnType<Closures['command']>>[];
  expect(results[0]!.receipt.businessStatus).toBe('accepted');expect(results[1]!.receipt.problem?.code).toBe(closeFirst?'lifecycle_forbidden':'stale_revision');
  expect((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes')).rowCount).toBe(closeFirst?0:1);
  expect((await db.pool.query('SELECT 1 FROM tawsel.closure_records')).rowCount).toBe(closeFirst?1:0);
 }finally{release.resolve();await Promise.allSettled([first,second]);await a.end();await b.end();}
});
test('B: queued end waits for a missing predecessor; HTTP replay recovers acceptance and readiness requires it',async()=>{
 const f=await startedFixture(db.pool,2),app=Fastify(),service=new Closures(db.pool);
 const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,19),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'closure',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'closure',clientSecret:'fixture'}}};
 await app.register(scope=>closureRoutes(scope,db.pool,config,(_r,_kind,work)=>work(principals.personal)));cleanup.push(()=>app.close());
 const headers={origin:config.origin,cookie:'__Host-tawsel-browser=p19','x-csrf-token':'p19'},predecessor=f.make(0,0,null,'outcome.recordNoAnswer'),c=closeCommand(f,'workday.end',{expectedActivityRevision:1});c.dependsOnActionIds=[predecessor.actionId];
 const post=(payload:ActionEnvelope)=>app.inject({method:'POST',url:'/api/v1/closure/day?kind=personal',headers,payload});
 expect((await app.inject({method:'POST',url:'/api/v1/closure/day?kind=personal',payload:c})).statusCode).toBe(403);
 const pending=await post(c);expect(pending.statusCode,pending.body).toBe(202);expect(pending.json()).toEqual({actionId:c.actionId,status:'pending'});expect((await service.result(principals.personal,c.actionId)).status).toBe('pending');
 expect((await db.pool.query('SELECT 1 FROM tawsel.command_identities WHERE action_id=$1',[c.actionId])).rowCount).toBe(0);
 expect((await new Rounds(db.pool).current(principals.personal)).workday?.workdayId).toBe(f.round.workdayId);
 await new Outcomes(db.pool).command(principals.personal,predecessor);
 const accepted=await post(c);expect(accepted.statusCode,accepted.body).toBe(200);expect((await post(c)).json()).toEqual(accepted.json());
 expect((await app.inject(`/api/v1/closure/actions/${c.actionId}?kind=personal`)).json()).toMatchObject({status:'accepted',result:accepted.json()});
 // A new start must use a current plan AND accepted relevant action IDs.
 const state=await f.planning.plans(principals.personal,f.round.driverId),task=f.tasks[1]!.taskId;
 await f.planning.command(principals.personal,command('planning.setManualOrder',{driverId:f.round.driverId,expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:[task]}}));
 const plan=(await f.planning.plans(principals.personal,f.round.driverId)).items[0]!;
 if(c.context.kind!=='device')throw new Error('device');const input={driverId:f.round.driverId,deviceId:c.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[randomUUID()]};
 await expect(new Rounds(db.pool).readiness(principals.personal,input)).rejects.toMatchObject({code:'sync_incomplete'});
 expect((await new Rounds(db.pool).readiness(principals.personal,{...input,relevantActionIds:[c.actionId]})).verifiedActionIds).toEqual([c.actionId]);
});
test('B: ownership, stale current, access revocation and cross-tenant result boundaries remain enforced',async()=>{
 const f=await startedFixture(db.pool,1),service=new Closures(db.pool),c=closeCommand(f);
 const stale={...structuredClone(c),actionId:randomUUID()};if(stale.context.kind!=='device')throw new Error('device');stale.context.deviceId=randomUUID();expect((await service.command(principals.personal,stale)).receipt.problem?.code).toBe('stale_device');
 const revision=closeCommand(f,'workday.end',{expectedActivityRevision:2});expect((await service.command(principals.personal,revision)).receipt.problem?.code).toBe('stale_revision');
 await expect(service.command(principals.driver,c)).rejects.toMatchObject({statusCode:403});
 const result=await service.command(principals.personal,c);expect(result.receipt.businessStatus).toBe('accepted');
 expect((await service.result(principals.driver,c.actionId)).status).toBe('pending');
 await db.pool.query('UPDATE tawsel.accounts SET enabled=false WHERE tenant_id=$1 AND account_id=$2',[ids.personalTenant,ids.personalAccount]);
 await expect(service.command(principals.personal,c)).rejects.toMatchObject({statusCode:403});await expect(service.result(principals.personal,c.actionId)).rejects.toMatchObject({statusCode:403});
});
async function nextCompany(f:Awaited<ReturnType<typeof outcomeCompanyFixture>>,taskIds:string[]){
 const planning=new PlanningService(db.pool),state=await planning.plans(f.principal,f.driverId);
 const manual=f.planCommand('planning.setManualOrder',{expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds}});
 expect((await planning.command(f.principal,manual)).receipt.businessStatus).toBe('accepted');
 const plan=(await planning.plans(f.principal,f.driverId)).items[0]!,start=f.planCommand('round.start',{planId:plan.planId,expectedPlanRevision:plan.revision});start.context={...f.start.context};
 if(start.context.kind!=='device')throw new Error('device');const rounds=new Rounds(db.pool),ready=await rounds.readiness(f.principal,{driverId:f.driverId,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});start.payload.readinessId=ready.readinessId;
 const result=await rounds.start(f.principal,start);expect(result.receipt.businessStatus).toBe('accepted');const round=(result.response!.body as components['schemas']['RoundStartResult']).round;start.context.deviceGeneration=round.owner.generation;return {round,start,plan};
}
test('C: multiple rounds reuse the day; later explicit workday retains exact source/cycle/attempt/earliest identities',async()=>{
 const f=await outcomeCompanyFixture(db,[{},{},{}]);cleanup.push(()=>f.close());const eligibility=new Eligibility(db.pool),service=new Closures(db.pool),reads=new WorkdayReads(db.pool),future=new Date(Date.now()+86400000).toISOString();
 await eligibility.command(f.principal,f.make(2,'task.deferWhole',{earliestAt:future,expectedEligibilityRevision:0}));
 await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordFull',{reportedCollection:money(35000)}));
 const original=(await reads.carryForward(f.principal,f.round.workdayId)).items;expect(original).toHaveLength(2);
 const admissionBefore=(await db.pool.query('SELECT * FROM tawsel.round_admissions WHERE round_id=$1 ORDER BY task_id',[f.round.roundId])).rows;
 await service.command(f.principal,closeCommand(f,'round.end',{expectedActivityRevision:1}));
 const second=await nextCompany(f,[f.tasks[1]!]);expect(second.round.workdayId).toBe(f.round.workdayId);
 await service.command(f.principal,closeCommand(second));
 const closed=await reads.summary(f.principal,f.round.workdayId);expect(closed.scope).toEqual({shipments:3,attempts:3,processedAttempts:1,fullShipments:1,partialShipments:0,refusedShipments:0,noAnswerShipments:0,unfinishedShipments:2});expect(closed.collection).toEqual([{currency:'EGP',exponent:2,reportedMinor:'35000',unreportedAttempts:0}]);expect(closed.rounds).toHaveLength(2);
 const third=await nextCompany(f,[f.tasks[1]!]);expect(third.round.workdayId).not.toBe(f.round.workdayId);expect(third.plan.input.members.find(m=>m.taskId===f.tasks[2])).toMatchObject({eligible:false,earliestAt:future});
 const retained=(await reads.carryForward(f.principal,third.round.workdayId)).items;expect(retained.map(item=>({...item,admittedInWorkday:false}))).toEqual(original.map(item=>({...item,admittedInWorkday:false})));
 expect((await db.pool.query('SELECT * FROM tawsel.round_admissions WHERE round_id=$1 ORDER BY task_id',[f.round.roundId])).rows).toEqual(admissionBefore);
 expect((await db.pool.query('SELECT 1 FROM tawsel.planning_attempts WHERE tenant_id=$1',[f.tenantId])).rowCount).toBe(3);
 expect((await eligibility.read(f.principal,f.round.roundId)).items.every(item=>Object.values(item.actions).every(action=>action.blocker==='round-closed'))).toBe(true);
 const completed=f.make(1,'outcome.recordFull',{roundId:third.round.roundId,reportedCollection:money(35000)});completed.context={...third.start.context};expect((await new Outcomes(db.pool).command(f.principal,completed)).receipt.businessStatus).toBe('accepted');
 const historical=await reads.summary(f.principal,f.round.workdayId);expect(historical.scope).toEqual(closed.scope);expect(historical.outcomes).toEqual(closed.outcomes);expect(historical.rounds).toEqual(closed.rounds);expect(historical.carryForward.items).toHaveLength(1);
 const today=await reads.summary(f.principal,third.round.workdayId);expect(today.scope).toMatchObject({shipments:1,attempts:1,processedAttempts:1,fullShipments:1});
});
test('C: cross-day retry keeps collection history, counts attempts separately and never counts one shipment twice',async()=>{
 const f=await outcomeCompanyFixture(db,[{}]);cleanup.push(()=>f.close());const outcomes=new Outcomes(db.pool),eligibility=new Eligibility(db.pool),reads=new WorkdayReads(db.pool);
 await outcomes.command(f.principal,f.make(0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000)}));
 await new Closures(db.pool).command(f.principal,closeCommand(f,'workday.end',{expectedActivityRevision:1}));
 const previous=await reads.summary(f.principal,f.round.workdayId),state=await eligibility.read(f.principal,f.round.roundId);expect(state.mode).toBe('preparation');
 const retry=f.make(0,'task.retryWhole',{expectedEligibilityRevision:0},1);const accepted=await eligibility.command(f.principal,retry);expect(accepted.receipt.businessStatus).toBe('accepted');const change=accepted.response!.body.change as components['schemas']['EligibilityRecord'];expect(change.mode).toBe('preparation');
 expect((await db.pool.query('SELECT 1 FROM tawsel.round_admissions WHERE attempt_id=$1',[change.attemptId])).rowCount).toBe(0);
 const next=await nextCompany(f,f.tasks),full=f.make(0,'outcome.recordFull',{roundId:next.round.roundId,attemptId:change.attemptId,reportedCollection:money(30000)});full.context={...next.start.context};expect((await outcomes.command(f.principal,full)).receipt.businessStatus).toBe('accepted');
 const old=await reads.summary(f.principal,f.round.workdayId),fresh=await reads.summary(f.principal,next.round.workdayId);expect(old.scope).toEqual(previous.scope);expect(old.collection[0]?.reportedMinor).toBe('5000');expect(fresh.scope).toMatchObject({shipments:1,attempts:1,processedAttempts:1,fullShipments:1});expect(fresh.collection[0]?.reportedMinor).toBe('30000');expect(fresh.carryForward.items).toEqual([]);
 expect((await db.pool.query('SELECT sum(shipping_minor)::text n FROM tawsel.outcome_collections WHERE tenant_id=$1',[f.tenantId])).rows[0].n).toBe('5000');
});
test('C: summary counts processed attempts separately from delivered shipments after an explicit same-day retry',async()=>{
 const f=await outcomeCompanyFixture(db,[{},{}]);cleanup.push(()=>f.close());const outcomes=new Outcomes(db.pool),eligibility=new Eligibility(db.pool),reads=new WorkdayReads(db.pool);
 await outcomes.command(f.principal,f.make(0,'outcome.recordNoAnswer'));
 await eligibility.command(f.principal,f.make(0,'task.retryWhole',{expectedEligibilityRevision:0},1));
 let report=await reads.summary(f.principal,f.round.workdayId);expect(report.scope).toEqual({shipments:2,attempts:3,processedAttempts:1,fullShipments:0,partialShipments:0,refusedShipments:0,noAnswerShipments:0,unfinishedShipments:2});
 const state=(await eligibility.read(f.principal,f.round.roundId)).items.find(s=>s.taskId===f.tasks[0])!;
 await outcomes.command(f.principal,f.make(0,'outcome.recordFull',{attemptId:state.attemptId,reportedCollection:money(35000)},1));
 report=await reads.summary(f.principal,f.round.workdayId);expect(report.scope).toMatchObject({shipments:2,attempts:3,processedAttempts:2,fullShipments:1,unfinishedShipments:1});expect(report.collection).toEqual([{currency:'EGP',exponent:2,reportedMinor:'35000',unreportedAttempts:1}]);
});
test('C: workday crosses UTC and Cairo midnight unchanged; winter/summer and fallback instants use Cairo rules',async()=>{
 // Labelled opening-time fixture, not a changed system clock. All closure times
 // still come from actual PostgreSQL clock_timestamp() in the command.
 await db.pool.query("ALTER TABLE tawsel.workdays ALTER COLUMN opened_at SET DEFAULT '2026-01-01T21:59:59Z'::timestamptz");
 await db.pool.query("ALTER TABLE tawsel.rounds ALTER COLUMN started_at SET DEFAULT '2026-01-01T21:59:59Z'::timestamptz");
 const f=await startedFixture(db.pool,1),reads=new WorkdayReads(db.pool),service=new Closures(db.pool);
 expect((await new Rounds(db.pool).current(principals.personal)).workday?.workdayId).toBe(f.round.workdayId);
 const before=(await db.pool.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!.now,c=closeCommand(f);c.observation={observedAt:'2026-01-01T22:00:01.000Z',clock:{quality:'unknown'}};
 const closed=await service.command(principals.personal,c),report=await reads.summary(principals.personal,f.round.workdayId);expect(report.workdayId).toBe(f.round.workdayId);expect(report.openedAt).toBe('2026-01-01T21:59:59.000Z');expect(Date.parse(report.endedAt!)).toBeGreaterThanOrEqual(before.getTime());expect(resultBody(closed).closure.time.observation).toEqual(c.observation);
 const instants=['2026-01-01T21:59:59Z','2026-01-01T22:00:01Z','2026-07-01T21:00:01Z','2026-10-29T20:59:59Z','2026-10-29T21:00:01Z'];
 for(const instant of instants){const local=(await db.pool.query("SELECT to_char($1::timestamptz AT TIME ZONE 'Africa/Cairo','YYYY-MM-DD HH24:MI:SS') local",[instant])).rows[0].local as string;const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));expect(`${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`).toBe(local);}
 expect(formatWorkdayInstant('2026-01-01T12:00:00Z','en-GB')).toContain('GMT+2');expect(formatWorkdayInstant('2026-07-01T12:00:00Z','en-GB')).toContain('GMT+3');
});
test('C: all-deferred held work can be explicitly activated after its actual earliest time before the next round',async()=>{
 const f=await outcomeCompanyFixture(db,[{}]);cleanup.push(()=>f.close());const eligibility=new Eligibility(db.pool),reads=new WorkdayReads(db.pool);
 const earliestAt=(await db.pool.query<{future:Date}>("SELECT clock_timestamp()+interval '5 seconds' future")).rows[0]!.future.toISOString();
 await eligibility.command(f.principal,f.make(0,'task.deferWhole',{expectedEligibilityRevision:0,earliestAt}));await new Closures(db.pool).command(f.principal,closeCommand(f));
 const make=async()=>{const s=await eligibility.read(f.principal,f.round.roundId);return f.make(0,'task.activateDeferred',{expectedEligibilityRevision:s.items[0]!.revision},s.activityRevision);};
 expect((await eligibility.command(f.principal,await make())).receipt.problem?.detail).toContain('earliest-time');
 const original=(await reads.carryForward(f.principal,f.round.workdayId)).items[0]!;expect(original).toMatchObject({earliestAt,deferred:true,eligibleNow:false});
 await db.pool.query('SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM ($1::timestamptz-clock_timestamp()))))',[earliestAt]);
 expect((await reads.carryForward(f.principal,f.round.workdayId)).items[0]?.eligibleNow).toBe(false);
 const activated=await eligibility.command(f.principal,await make());expect(activated.receipt.businessStatus).toBe('accepted');
 const next=await nextCompany(f,f.tasks);expect(next.round.workdayId).not.toBe(f.round.workdayId);expect(next.plan.input.members[0]).toMatchObject({attemptId:original.attemptId,dispatchCycleId:original.dispatchCycleId,sourceRevision:original.sourceRevision,earliestAt,eligible:true});
 expect((await db.pool.query('SELECT 1 FROM tawsel.planning_attempts WHERE tenant_id=$1',[f.tenantId])).rowCount).toBe(1);
});
test('C: source-future held work without a reservation remains visible and needs explicit bounded admission when due',async()=>{
 const f=await outcomeCompanyFixture(db,[{}]);cleanup.push(()=>f.close());const eligibility=new Eligibility(db.pool),reads=new WorkdayReads(db.pool);
 const earliestAt=(await db.pool.query<{future:Date}>("SELECT clock_timestamp()+interval '5 seconds' future")).rows[0]!.future.toISOString(),task=await f.task('later-source','ordinary','held',earliestAt);
 await new Closures(db.pool).command(f.principal,closeCommand(f));const before=(await reads.carryForward(f.principal,f.round.workdayId)).items.find(i=>i.taskId===task)!;expect(before).toMatchObject({eligibleNow:false,blocker:'earliest-time',admittedInWorkday:false});
 await db.pool.query('SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM ($1::timestamptz-clock_timestamp()))))',[earliestAt]);
 const s=await eligibility.read(f.principal,f.round.roundId),item=s.items.find(i=>i.taskId===task)!;expect(item.actions.activate.allowed).toBe(true);
 const c=f.make(0,'task.activateDeferred',{taskId:task,attemptId:item.attemptId,expectedSourceRevision:item.sourceRevision,expectedAssignmentRevision:item.assignmentRevision,expectedPinRevision:item.pinRevision,expectedEligibilityRevision:item.revision});expect((await eligibility.command(f.principal,c)).receipt.businessStatus).toBe('accepted');
 const next=await nextCompany(f,[...f.tasks,task]);expect(next.plan.input.members.find(m=>m.taskId===task)).toMatchObject({eligible:true,attemptId:before.attemptId,dispatchCycleId:before.dispatchCycleId,earliestAt});
});
test('C: real HTTP clients recover lost day-end response and start carried work in a distinct next workday',async()=>{
 const report=await workdayDemo();expect(report.status.status).toBe('accepted');expect(report.next.workdayId).not.toBe(report.closed.workdayId);expect(report.events).toHaveLength(3);
},30_000);
