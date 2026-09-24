import {beforeEach,afterEach,test,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdir,copyFile,readdir,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import Fastify from 'fastify';
import {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture,principals} from '../support/access-fixture.js';
import {startedFixture} from '../support/current-fixture.js';
import {deferred,observeDatabaseBlock} from '../support/barriers.js';
import {Eligibility} from '../../src/eligibility/service.js';
import {Devices} from '../../src/devices/service.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {send,operatorToken,bindSource} from '../support/provisioning-fixture.js';
import {migrate} from '../../src/db/migrate.js';
import {compactCommandResponses} from '../../src/commands/retention.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {WorkdayReads} from '../../src/closure/reads.js';
import {money} from '../../src/outcomes/arithmetic.js';
import {Returns} from '../../src/returns/service.js';
import {returnDriverRoutes,returnReceiverRoutes} from '../../src/returns/routes.js';
import {ReturnReceiver} from '../../src/returns/receiver.js';
import {conforms} from '../../src/returns/models.js';
import type {AuthConfig} from '../../src/auth/config.js';
import type {ActionEnvelope,CommandHooks} from '../../src/commands/kernel.js';
import {correctionRoutes} from '../../src/corrections/routes.js';
import {Closures} from '../../src/closure/service.js';
import {Corrections} from '../../src/corrections/service.js';
import {correctionConforms} from '../../src/corrections/models.js';
import {B2bIntakeService} from '../../src/b2b-intake/service.js';
import {closureRoutes} from '../../src/closure/routes.js';
import {CurrentActivity} from '../../src/current/service.js';
import {correctionDemo} from '../../../../scripts/correction-demo.js';
import {Branches} from '../../src/branch/service.js';

let db:Awaited<ReturnType<typeof createTestDatabase>>;
const closers:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const close of closers.splice(0).reverse())await close();await db?.close();});
const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p21',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p21',clientSecret:'fixture'}}};
const headers={origin:config.origin,cookie:'__Host-tawsel-browser=p21','x-csrf-token':'p21'};
async function fixture(){
 const f=await outcomeCompanyFixture(db,[{},{}]);closers.push(()=>f.close());
 const bootstrap=structuredClone(f.source.bootstrapCommand);bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=3;bootstrap.payload.returnCapabilities=['return.receive','return.dispose'];
 const bound=await send(f.app,operatorToken,bootstrap);expect(bound.statusCode,bound.body).toBe(200);
 const outcomes=new Outcomes(db.pool);expect((await outcomes.command(f.principal,f.make(0,'outcome.recordNoAnswer'))).receipt.businessStatus).toBe('accepted');
 expect((await outcomes.command(f.principal,f.make(1,'outcome.recordNoAnswer',{},1))).receipt.businessStatus).toBe('accepted');
 const service=new Returns(db.pool),app=Fastify();await app.register(s=>returnDriverRoutes(s,db.pool,config,(_r,_k,work)=>work(f.principal),service));await app.ready();closers.push(()=>app.close());
 const groups=await service.groups(f.principal),group=groups.groups[0]!;
 const make=(indices=[0],quantity=3)=>{const c=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:group.sourceBranchId,items:indices.map(i=>{const q=group.items[i]!;return {taskId:q.taskId,dispatchCycleId:q.dispatchCycleId,outcomeId:q.outcomeId,sourceLineId:q.sourceLineId,quantity};})});delete c.payload.driverId;return c;};
 const post=(c:ActionEnvelope)=>app.inject({method:'POST',url:'/api/v1/returns/request?kind=company',headers,payload:c});
 return {...f,appDriver:app,service,groups,group,makeRequest:make,postRequest:post,authorization:`Bearer ${f.source.token}`};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
function receive(f:Fixture,request:components['schemas']['ReturnRequestView'],quantity=2,index=0,disposition?:'lost'|'damaged'){
 const item=request.items[index]!;return f.source.command(disposition?'return.recordDisposition':'return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:item.itemId,expectedRevision:item.revision,quantity}],...(disposition?{disposition}:{})});
}
const nativePost=(f:Fixture,c:ActionEnvelope,app=f.app)=>app.inject({method:'POST',url:`/api/v1/erp/returns/commands/${c.operationId}`,headers:{authorization:f.authorization},payload:c});
async function offer(f:Fixture,indices=[0],quantity=3){const c=f.makeRequest(indices,quantity),r=await f.postRequest(c);expect(r.statusCode,r.body).toBe(200);return {command:c,result:r.json(),request:r.json().response.body.request as components['schemas']['ReturnRequestView']};}

test('P23 A: public availability explains actual receipt and closed-day cutoffs without hiding original reports',async()=>{
 const f=await fixture();
 expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode).toBe(200);
 const app=Fastify();await app.register(s=>correctionRoutes(s,db.pool,config,(_r,_k,work)=>work(f.principal)));await app.ready();closers.push(()=>app.close());
 const item=f.group.items[0]!,attempt=f.plan.input.members.find(m=>m.taskId===item.taskId)!.attemptId;
 const read=()=>app.inject({url:`/api/v1/corrections/attempts/${attempt}?kind=company&deviceId=${f.start.context.kind==='device'?f.start.context.deviceId:''}`});
 const before=await read();expect(before.statusCode,before.body).toBe(200);expect(before.json()).toMatchObject({allowed:true,effectiveOutcomeRevision:1,constraints:[],effectiveOutcome:{outcome:'no-answer'}});
 const {request}=await offer(f);expect((await nativePost(f,receive(f,request,1))).statusCode).toBe(200);
 expect((await read()).json()).toMatchObject({allowed:false,constraints:['dependent-receipt'],nextSteps:['view-history','erp-commercial-review']});
 const close=f.planCommand('workday.end',{workdayId:f.round.workdayId,roundId:f.round.roundId,expectedActiveRoundId:f.round.roundId,expectedActivityRevision:2,expectedCurrentAttemptId:null,currentAction:'require-none'});delete close.payload.driverId;
 expect((await new Closures(db.pool).command(f.principal,close)).receipt.businessStatus).toBe('accepted');
 expect((await read()).json()).toMatchObject({allowed:false,constraints:['closed-workday','dependent-receipt'],effectiveOutcome:before.json().effectiveOutcome});
});

async function correctionFixture(){
 const f=await fixture();expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode).toBe(200);
 const app=Fastify(),service=new Corrections(db.pool);await app.register(s=>correctionRoutes(s,db.pool,config,(_r,_k,work)=>work(f.principal),service));await app.ready();closers.push(()=>app.close());
 const outcomes=new Outcomes(db.pool),original=(await outcomes.read(f.principal,f.round.roundId)).items.find(o=>o.taskId===f.group.items[0]!.taskId)!;
 const correct=(replacement:components['schemas']['CorrectionReplacement']={outcome:'partial',pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)},revision=original.revision)=>{const c=f.planCommand('outcome.correct',{roundId:f.round.roundId,taskId:original.taskId,attemptId:original.attemptId,expectedOutcomeRevision:revision,replacement});delete c.payload.driverId;return c;};
 const post=(c:ActionEnvelope,server=app)=>server.inject({method:'POST',url:'/api/v1/corrections/outcomes?kind=company',headers,payload:c});
 return {...f,correctionApp:app,corrections:service,outcomes,original,correct,postCorrection:post};
}

test('P23 B: correction appends immutable history, supersedes an unreceived offer, and changes effective collection and custody once',async()=>{
 const f=await correctionFixture(),{request}=await offer(f),c=f.correct(),r=await f.postCorrection(c);expect(r.statusCode,r.body).toBe(200);
 const correction=r.json().response.body.correction;expect(correctionConforms('Record',correction)).toBe(true);
 expect(correction).toMatchObject({previousOutcomeId:f.original.outcomeId,previousRevision:1,outcome:{revision:2,outcome:'partial'}});
 expect((await f.postCorrection(c)).json()).toEqual(r.json());
 const view=await f.outcomes.read(f.principal,f.round.roundId);expect(view.history).toHaveLength(3);expect(view.history).toContainEqual(f.original);expect(view.items).toHaveLength(2);
 expect(view.progress).toMatchObject({processed:2,partial:1,noAnswer:1,deliveredPieces:2,heldReturnRequiredPieces:4,collection:[{reportedMinor:'25000'}]});
 expect((await new WorkdayReads(db.pool).summary(f.principal,f.round.workdayId))).toMatchObject({scope:{processedAttempts:2,partialShipments:1,noAnswerShipments:1},collection:[{reportedMinor:'25000'}]});
 expect((await f.service.read(f.principal,request.requestId)).items[0]).toMatchObject({eligibility:'superseded',custody:{delivered:2,held:1,received:0}});
 expect((await nativePost(f,receive(f,request,1))).statusCode).toBe(409);
 expect((await db.pool.query('SELECT resolved_outcome_id FROM tawsel.execution_attempts WHERE attempt_id=$1',[f.original.attemptId])).rows[0].resolved_outcome_id).toBe(f.original.outcomeId);
 const event=(await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE action_id=$1 AND event_type='outcome.corrected'",[c.actionId])).rows;expect(event).toHaveLength(1);expect(correctionConforms('Event',event[0].payload)).toBe(true);expect(event[0].payload.previousOutcome).toEqual(f.original);
 await expect(db.pool.query('DELETE FROM tawsel.delivery_outcomes WHERE outcome_id=$1',[f.original.outcomeId])).rejects.toMatchObject({code:'23514'});
 await expect(db.pool.query('UPDATE tawsel.outcome_corrections SET previous_revision=0 WHERE correction_id=$1',[correction.correctionId])).rejects.toMatchObject({code:'23514'});
 expect((await f.postCorrection(f.correct())).statusCode).toBe(409);
 expect((await f.corrections.result(f.principal,c.actionId)).result).toEqual(r.json());
});

test('P23 B: corrected piece count replaces its own report without recollecting shipping or editing frozen prices',async()=>{
 const f=await correctionFixture();expect((await f.postCorrection(f.correct())).statusCode).toBe(200);
 const c=f.correct({outcome:'partial',pieces:[{sourceLineId:'pieces',delivered:1}],reportedCollection:money(15000)},2),r=await f.postCorrection(c);expect(r.statusCode,r.body).toBe(200);
 const after=await f.outcomes.read(f.principal,f.round.roundId);expect(after.history).toHaveLength(4);expect(after.progress).toMatchObject({deliveredPieces:1,heldReturnRequiredPieces:5,collection:[{reportedMinor:'15000'}]});
 expect((await db.pool.query('SELECT payload FROM tawsel.b2b_source_snapshots WHERE task_id=$1',[f.original.taskId])).rows[0].payload).toMatchObject({lines:[{quantity:3,unitDue:money(10000)}],shippingDue:money(5000)});
 const wrong=f.correct({outcome:'full',reportedCollection:money(1)},3),denied=await f.postCorrection(wrong);expect(denied.statusCode,denied.body).toBe(400);expect(denied.json().receipt.businessStatus).toBe('review-required');
 expect((await f.outcomes.read(f.principal,f.round.roundId)).progress).toEqual(after.progress);
 expect((await db.pool.query('SELECT envelope FROM tawsel.command_evidence WHERE action_id=$1',[wrong.actionId])).rows[0].envelope).toEqual(wrong);
});

test('P23 B: injected failure at every commit stage rolls back correction, projection, quantities, audit and outbound intent',async()=>{
 const f=await correctionFixture(),before=await f.outcomes.read(f.principal,f.round.roundId),c=f.correct();
 for(const stage of ['domain','progress','audit','outbox','result'] as const){
  const app=Fastify();await app.register(s=>correctionRoutes(s,db.pool,config,(_r,_k,work)=>work(f.principal),new Corrections(db.pool,{async afterWrite(at){if(at===stage)throw new Error(`injected ${stage}`);}})));await app.ready();closers.push(()=>app.close());
  const r=await f.postCorrection(c,app);expect(r.statusCode,r.body).toBe(503);
  expect((await f.outcomes.read(f.principal,f.round.roundId))).toEqual(before);
  expect((await db.pool.query('SELECT * FROM tawsel.outcome_corrections')).rowCount).toBe(0);
  for(const table of ['delivery_outcomes','command_identities','command_audit','outbox_intents','intake_replan_intents'])expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[c.actionId])).rowCount).toBe(0);
 }
 expect((await f.postCorrection(c)).statusCode).toBe(200);
});

const closeCorrectionDay=(f:Awaited<ReturnType<typeof correctionFixture>>)=>{const c=f.planCommand('workday.end',{workdayId:f.round.workdayId,roundId:f.round.roundId,expectedActiveRoundId:f.round.roundId,expectedActivityRevision:2,expectedCurrentAttemptId:null,currentAction:'require-none'});delete c.payload.driverId;return c;};
test.each([true,false])('P23 C: API correction versus actual receipt on independently blocked PostgreSQL connections, correction first=%s',async(correctionFirst)=>{
 const f=await correctionFixture(),{request}=await offer(f),c=f.correct(),receipt=receive(f,request,1),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=(await one.query('SELECT pg_backend_pid() pid')).rows[0].pid,waiter=(await two.query('SELECT pg_backend_pid() pid')).rows[0].pid,entered=deferred(),release=deferred(),hooks={async afterWrite(at:string){if(at==='domain'){entered.resolve();await release.promise;}}};
 const a=Fastify(),b=Fastify();closers.push(()=>a.close(),()=>b.close());
 await a.register(s=>correctionRoutes(s,correctionFirst?one:two,config,(_r,_k,work)=>work(f.principal),new Corrections(correctionFirst?one:two,correctionFirst?hooks:undefined)));
 await b.register(s=>returnReceiverRoutes(s,correctionFirst?two:one,new ReturnReceiver(correctionFirst?two:one,correctionFirst?undefined:hooks)));await a.ready();await b.ready();
 const first=correctionFirst?f.postCorrection(c,a):nativePost(f,receipt,b);await entered.promise;
 const second=correctionFirst?nativePost(f,receipt,b):f.postCorrection(c,a);try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const [x,y]=await Promise.all([first,second]);expect(x.statusCode,x.body).toBe(200);expect(y.statusCode,y.body).toBe(409);
 const custody=(await f.outcomes.read(f.principal,f.round.roundId)).custody!.find(q=>q.dispatchCycleId===f.original.dispatchCycleId)!.balance;
 expect(custody).toMatchObject(correctionFirst?{delivered:2,held:1,received:0}:{delivered:0,held:2,received:1});
 expect(custody.delivered+custody.held+custody.received+custody.lost+custody.damaged).toBe(3);
 expect((await db.pool.query('SELECT * FROM tawsel.outcome_corrections')).rowCount).toBe(correctionFirst?1:0);
});

test.each([true,false])('P23 C: API correction versus day closure, correction first=%s',async(correctionFirst)=>{
 const f=await correctionFixture(),c=f.correct(),end=closeCorrectionDay(f),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=(await one.query('SELECT pg_backend_pid() pid')).rows[0].pid,waiter=(await two.query('SELECT pg_backend_pid() pid')).rows[0].pid,entered=deferred(),release=deferred(),hooks={async afterWrite(at:string){if(at==='domain'){entered.resolve();await release.promise;}}};
 const app=Fastify();await app.register(s=>correctionRoutes(s,correctionFirst?one:two,config,(_r,_k,work)=>work(f.principal),new Corrections(correctionFirst?one:two,correctionFirst?hooks:undefined)));await app.ready();closers.push(()=>app.close());
 const closure=Fastify();await closure.register(s=>closureRoutes(s,correctionFirst?two:one,config,(_r,_k,work)=>work(f.principal),new Closures(correctionFirst?two:one,correctionFirst?undefined:hooks)));await closure.ready();closers.push(()=>closure.close());
 const endDay=()=>closure.inject({method:'POST',url:'/api/v1/closure/day?kind=company',headers,payload:end});
 const first=correctionFirst?f.postCorrection(c,app):endDay();await entered.promise;
 const second=correctionFirst?endDay():f.postCorrection(c,app);try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const results=await Promise.all([first,second]);const correction=results[correctionFirst?0:1]!;expect(correction.statusCode,correction.body).toBe(correctionFirst?200:409);expect(results[correctionFirst?1:0]!.statusCode).toBe(200);
 const summary=await new WorkdayReads(db.pool).summary(f.principal,f.round.workdayId);expect(summary.endedAt).not.toBeNull();expect(summary.collection[0]?.reportedMinor).toBe(correctionFirst?'25000':'0');
 expect((await f.postCorrection({...c,actionId:randomUUID(),observation:{...c.observation,observedAt:'2000-01-01T00:00:00Z'}})).statusCode).toBe(409);
});

test.each([true,false])('P23 C: correction versus redispatch never reverses its prerequisite receipt, correction first=%s',async(correctionFirst)=>{
 const f=await correctionFixture(),{request}=await offer(f);expect((await nativePost(f,receive(f,request,2))).statusCode).toBe(200);
 const intake=new B2bIntakeService(db.pool),old=await intake.get(f.authorization,request.items[0]!.externalId),dispatch=f.source.command('dispatch.createFromReceipt',{externalId:old.externalId,previousDispatchCycleId:old.dispatchCycleId,snapshot:{...old.snapshot,sourceDispatchCycleId:'correct-race-next',sourceRevision:2,expectedSourceRevision:1,lines:[{...old.snapshot.lines[0]!,quantity:2}],shippingDue:money(0),totalDue:money(20000)}}),c=f.correct();
 const one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=(await one.query('SELECT pg_backend_pid() pid')).rows[0].pid,waiter=(await two.query('SELECT pg_backend_pid() pid')).rows[0].pid,entered=deferred(),release=deferred(),hooks={async afterWrite(at:string){if(at==='domain'){entered.resolve();await release.promise;}}};
 const first=correctionFirst?new Corrections(one,hooks).command(f.principal,c):new B2bIntakeService(one,hooks).command(f.authorization,'dispatch.createFromReceipt',dispatch);await entered.promise;
 const second=correctionFirst?new B2bIntakeService(two).command(f.authorization,'dispatch.createFromReceipt',dispatch):new Corrections(two).command(f.principal,c);try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const results=await Promise.all([first,second]);expect(results[correctionFirst?0:1]!.receipt.businessStatus).toBe('review-required');expect(results[correctionFirst?1:0]!.receipt.businessStatus).toBe('accepted');
 expect((await db.pool.query('SELECT sum(quantity)::int n FROM tawsel.redispatch_allocations')).rows[0].n).toBe(2);expect((await db.pool.query('SELECT * FROM tawsel.outcome_corrections')).rowCount).toBe(0);
 const allowed=await f.corrections.availability(f.principal,f.original.attemptId,f.round.owner.deviceId);expect(allowed.constraints).toContain('dependent-redispatch');
});

test.each([true,false])('P23 C: duplicate versus competing correction CAS on independent connections, same action=%s',async(same)=>{
 const f=await correctionFixture(),c=f.correct(),other={...c,actionId:same?c.actionId:randomUUID()},one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=(await one.query('SELECT pg_backend_pid() pid')).rows[0].pid,waiter=(await two.query('SELECT pg_backend_pid() pid')).rows[0].pid,entered=deferred(),release=deferred();
 const first=new Corrections(one,{async afterWrite(at){if(at==='domain'){entered.resolve();await release.promise;}}}).command(f.principal,c);await entered.promise;
 const second=new Corrections(two).command(f.principal,other);try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const [x,y]=await Promise.all([first,second]);expect(x.receipt.businessStatus).toBe('accepted');if(same)expect(y).toEqual(x);else expect(y.receipt.problem?.code).toBe('stale_revision');
 expect((await db.pool.query('SELECT * FROM tawsel.outcome_corrections')).rowCount).toBe(1);expect((await f.outcomes.read(f.principal,f.round.roundId)).progress.collection[0]?.reportedMinor).toBe('25000');
});

async function adoptFixture(f:Awaited<ReturnType<typeof correctionFixture>>,amount=25000){
 const devices=new Devices(db.pool),index=f.tasks.indexOf(f.original.taskId),old=f.make(index,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(amount)},2);
 old.observation.observedAt='2000-01-01T00:00:00Z';
 const takeover=f.planCommand('device.takeOver',{roundId:f.round.roundId,expectedGeneration:1});delete takeover.payload.driverId;if(takeover.context.kind!=='device')throw Error('device');takeover.context.deviceId=randomUUID();expect((await devices.takeover(f.principal,takeover)).receipt.businessStatus).toBe('accepted');
 const snapshot=await devices.snapshot(f.principal,f.round.roundId,takeover.context.deviceId),device={...takeover.context,deviceGeneration:2,snapshotToken:snapshot.snapshotToken!};
 const receipt=await devices.receive(f.principal,old),adopt=f.planCommand('evidence.adoptCompatible',{roundId:f.round.roundId,evidenceActionId:old.actionId,evidenceReceiptId:receipt.result.receipt.receiptId,expectedGeneration:2,expectedOutcomeRevision:1,expectedActivityRevision:2,expectedSourceRevision:old.payload.expectedSourceRevision,expectedAssignmentRevision:old.payload.expectedAssignmentRevision,expectedPinRevision:old.payload.expectedPinRevision});delete adopt.payload.driverId;adopt.context=device;
 const post=(c:ActionEnvelope)=>f.correctionApp.inject({method:'POST',url:'/api/v1/corrections/adopt?kind=company',headers,payload:c});
 return {devices,old,receipt,device,adopt,post};
}
test('P23 C: former-phone evidence is explicitly adopted once with current validation, retained receipt and unchanged original history',async()=>{
 const f=await correctionFixture(),a=await adoptFixture(f),before=await a.devices.evidence(f.principal,a.old.actionId,a.device.deviceId);expect(before.recovery).toMatchObject({state:'requires-validation',constraints:[],adoptionImplemented:true});
 const r=await a.post(a.adopt);expect(r.statusCode,r.body).toBe(200);expect((await a.post(a.adopt)).json()).toEqual(r.json());
 expect((await a.post({...a.adopt,actionId:randomUUID(),payload:{...a.adopt.payload,expectedOutcomeRevision:2}})).statusCode).toBe(409);
 const evidence=await a.devices.evidence(f.principal,a.old.actionId,a.device.deviceId);expect(evidence.envelope).toEqual(a.old);expect(evidence.result).toEqual(a.receipt.result);expect(evidence.recovery.constraints).toContain('already-adopted');expect(evidence.recovery.adoptedOutcomeId).toBe(r.json().response.body.correction.outcome.outcomeId);
 expect((await f.outcomes.read(f.principal,f.round.roundId)).progress).toMatchObject({deliveredPieces:2,collection:[{reportedMinor:'25000'}]});
 const event=(await db.pool.query("SELECT recipient_id,payload FROM tawsel.outbox_intents WHERE event_type='evidence.adoptionResolved'")).rows;expect(event).toHaveLength(1);expect(event[0].recipient_id).toBe(f.accountId);expect(correctionConforms('AdoptionEvent',event[0].payload)).toBe(true);
});

test.each(['amount','receipt','generation','token','closed','received','unknown-device','predecessor','source','assignment','pin'] as const)('P23 C: adoption cannot bypass %s validation; incompatible evidence stays durable',async(reason)=>{
 const f=await correctionFixture(),offerResult=reason==='received'?await offer(f):null,a=await adoptFixture(f,reason==='amount'?1:25000),c=structuredClone(a.adopt);
 if(reason==='receipt')c.payload.evidenceReceiptId=randomUUID();
 if(reason==='generation'&&c.context.kind==='device')c.context.deviceGeneration=1;
 if(reason==='token'&&c.context.kind==='device')delete c.context.snapshotToken;
 if(reason==='closed'){const end=closeCorrectionDay(f);end.context=a.device;expect((await new Closures(db.pool).command(f.principal,end)).receipt.businessStatus).toBe('accepted');}
 if(reason==='received')expect((await nativePost(f,receive(f,offerResult!.request,1))).statusCode).toBe(200);
 if(reason==='unknown-device'){
  const unknown=structuredClone(a.old);unknown.actionId=randomUUID();if(unknown.context.kind==='device')unknown.context.deviceId=randomUUID();const result=await a.devices.receive(f.principal,unknown);c.payload.evidenceActionId=unknown.actionId;c.payload.evidenceReceiptId=result.result.receipt.receiptId;
 }
 if(reason==='source'||reason==='assignment'||reason==='pin'){
  const changed=structuredClone(a.old);changed.actionId=randomUUID();changed.payload[reason==='source'?'expectedSourceRevision':reason==='assignment'?'expectedAssignmentRevision':'expectedPinRevision']=99;
  const result=await a.devices.receive(f.principal,changed);c.payload.evidenceActionId=changed.actionId;c.payload.evidenceReceiptId=result.result.receipt.receiptId;
 }
 if(reason==='predecessor')c.dependsOnActionIds=[randomUUID()];
 const r=await a.post(c);expect([400,409],r.body).toContain(r.statusCode);expect(r.json().receipt.businessStatus).not.toBe('accepted');
 expect((await db.pool.query('SELECT * FROM tawsel.outcome_corrections')).rowCount).toBe(0);expect((await db.pool.query('SELECT envelope FROM tawsel.command_evidence WHERE action_id=$1',[c.actionId])).rows[0].envelope).toEqual(c);
 expect((await a.devices.evidence(f.principal,a.old.actionId,a.device.deviceId)).envelope).toEqual(a.old);
 expect((await f.outcomes.read(f.principal,f.round.roundId)).progress.deliveredPieces).toBe(0);
});

test('P23 C: B2C simple correction has no piece or branch semantics',async()=>{
 const f=await startedFixture(db.pool,1),outcomes=new Outcomes(db.pool),service=new Corrections(db.pool),original=f.make(0,0,null,'outcome.recordNoAnswer');expect((await outcomes.command(principals.personal,original)).receipt.businessStatus).toBe('accepted');
 const correct={...original,actionId:randomUUID(),operationId:'outcome.correct',payload:{roundId:f.round.roundId,taskId:original.payload.taskId,attemptId:original.payload.attemptId,expectedOutcomeRevision:1,replacement:{outcome:'full'}}};
 expect((await service.command(principals.personal,correct)).receipt.businessStatus).toBe('accepted');
 const view=await outcomes.read(principals.personal,f.round.roundId);expect(view.items[0]).toMatchObject({kind:'personal',outcome:'full',lines:[],collection:{reported:null},returnRequired:false});expect(view.history).toHaveLength(2);expect(view.custody).toEqual([]);
 const invalid={...correct,actionId:randomUUID(),payload:{...correct.payload,expectedOutcomeRevision:2,replacement:{outcome:'partial',pieces:[{sourceLineId:'x',delivered:1}],reportedCollection:money(0)}}};expect((await service.command(principals.personal,invalid)).receipt.problem?.code).toBe('validation_failed');
});

test('P23 C: adopting the first B2C outcome uses normal active-target validation and resolves current atomically',async()=>{
 const f=await startedFixture(db.pool,1),devices=new Devices(db.pool),service=new Corrections(db.pool),outcomes=new Outcomes(db.pool),old=f.make(0,0,null,'outcome.recordFull');
 expect((await new CurrentActivity(db.pool).command(principals.personal,f.make())).receipt.businessStatus).toBe('accepted');
 const takeover={...f.start,actionId:randomUUID(),operationId:'device.takeOver',payload:{roundId:f.round.roundId,expectedGeneration:1}};if(takeover.context.kind!=='device')throw Error('device');takeover.context={...takeover.context,deviceId:randomUUID()};
 expect((await devices.takeover(principals.personal,takeover)).receipt.businessStatus).toBe('accepted');
 const snap=await devices.snapshot(principals.personal,f.round.roundId,takeover.context.deviceId),receipt=await devices.receive(principals.personal,old);
 const c={...old,actionId:randomUUID(),operationId:'evidence.adoptCompatible',context:{...takeover.context,deviceGeneration:2,snapshotToken:snap.snapshotToken!},payload:{roundId:f.round.roundId,evidenceActionId:old.actionId,evidenceReceiptId:receipt.result.receipt.receiptId,expectedGeneration:2,expectedOutcomeRevision:0,expectedActivityRevision:1,expectedSourceRevision:old.payload.expectedSourceRevision,expectedAssignmentRevision:old.payload.expectedAssignmentRevision,expectedPinRevision:old.payload.expectedPinRevision}};
 for(const stage of ['progress','outbox','result']){
  await expect(new Corrections(db.pool,{async afterWrite(at){if(at===stage)throw Error('injected adoption');}}).command(principals.personal,c)).rejects.toThrow('injected adoption');
  expect((await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId)).currentActivity?.stage).toBe('heading');
  expect((await outcomes.read(principals.personal,f.round.roundId)).history).toHaveLength(0);
  for(const table of ['outcome_corrections','command_identities','command_audit','outbox_intents'])expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[c.actionId])).rowCount).toBe(0);
  expect((await devices.evidence(principals.personal,old.actionId,takeover.context.deviceId)).result).toEqual(receipt.result);
 }
 const result=await service.command(principals.personal,c);expect(result.receipt.businessStatus,JSON.stringify(result)).toBe('accepted');
 const corrected=(result.response!.body as components['schemas']['CorrectionResult']).correction;expect(corrected).toMatchObject({previousOutcomeId:null,previousRevision:0,outcome:{kind:'personal',outcome:'full',revision:1}});
 const current=await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId);expect(current.currentActivity).toBeNull();expect(current.revision).toBe(2);expect(current.physicalOrigin).toBeNull();expect((await outcomes.read(principals.personal,f.round.roundId)).history).toHaveLength(1);
 expect(await service.command(principals.personal,c)).toEqual(result);
});

test('P23 C: broad staff roles, other accounts, wrong resource and removed correction grant cannot correct or adopt',async()=>{
 const f=await correctionFixture();
 expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'admin',sourceRevision:1,name:'Administrator',capabilities:['execution.own','correction.own','monitor.read','planning.manage']}))).statusCode).toBe(200);
 expect((await send(f.app,f.source.token,f.source.command('user.provision',{externalId:'policy-staff',sourceRevision:1,subject:'policy-staff',roleExternalId:'admin',branchExternalIds:['branch'],enabled:true}))).statusCode).toBe(200);
 await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1',[f.tenantId]);
 const staff={kind:'account' as const,issuer:'https://issuer.fixture.invalid',subject:'policy-staff'};
 await expect(f.corrections.command(staff,f.correct())).rejects.toMatchObject({statusCode:403});
 await expect(f.corrections.command(principals.personal,f.correct())).rejects.toMatchObject({statusCode:403});
 const wrong=f.correct();wrong.payload.taskId=randomUUID();expect((await f.postCorrection(wrong)).statusCode).toBe(404);
 const a=await adoptFixture(f);await expect(f.corrections.command(staff,a.adopt)).rejects.toMatchObject({statusCode:403});await expect(f.corrections.result(principals.personal,a.old.actionId)).resolves.toMatchObject({status:'pending'});
 expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:3,name:'Driver',capabilities:['execution.own']}))).statusCode).toBe(200);
 expect((await a.post(a.adopt)).statusCode).toBe(403);expect((await f.corrections.availability(f.principal,f.original.attemptId,a.device.deviceId)).constraints).toContain('correction-not-authorized');
 expect((await db.pool.query('SELECT * FROM tawsel.outcome_corrections')).rowCount).toBe(0);
});

test('P23 C: a correction after whole retry preserves prior reported shipping and cannot charge it again',async()=>{
 const f=await correctionFixture();expect((await f.postCorrection(f.correct({outcome:'refused',shippingPayment:'collected',reportedCollection:money(5000)}))).statusCode).toBe(200);
 expect((await new Eligibility(db.pool).command(f.principal,await retry(f,f.original.taskId))).receipt.businessStatus).toBe('accepted');
 const current=await new CurrentActivity(db.pool).read(f.principal,f.round.roundId),target=current.targets.find(t=>t.taskId===f.original.taskId)!;
 const report=f.planCommand('outcome.recordNoAnswer',{roundId:f.round.roundId,taskId:target.taskId,attemptId:target.attemptId,expectedActivityRevision:current.revision,expectedCurrentAttemptId:null,expectedSourceRevision:target.sourceRevision,expectedAssignmentRevision:target.assignmentRevision,expectedPinRevision:target.pinRevision});delete report.payload.driverId;
 expect((await f.outcomes.command(f.principal,report)).receipt.businessStatus).toBe('accepted');
 const o=(await f.outcomes.read(f.principal,f.round.roundId)).items.find(o=>o.attemptId===target.attemptId)!,c=f.correct({outcome:'full',reportedCollection:money(35000)},o.revision);c.payload.attemptId=target.attemptId;
 expect((await f.postCorrection(c)).statusCode).toBe(400);c.actionId=randomUUID();c.payload.replacement={outcome:'full',reportedCollection:money(30000)};
 const accepted=await f.postCorrection(c);expect(accepted.statusCode,accepted.body).toBe(200);expect(accepted.json().response.body.correction.outcome.collection).toMatchObject({shipping:money(0),shippingStatus:'not-due'});
 expect((await f.outcomes.read(f.principal,f.round.roundId)).progress.collection[0]?.reportedMinor).toBe('35000');
 expect((await f.postCorrection(f.correct({outcome:'full',reportedCollection:money(35000)},2))).statusCode).toBe(409);
});

test('P23 C: round end alone permits a correction while its original workday remains open',async()=>{
 const f=await correctionFixture(),end=closeCorrectionDay(f);end.operationId='round.end';expect((await new Closures(db.pool).command(f.principal,end)).receipt.businessStatus).toBe('accepted');
 expect((await f.postCorrection(f.correct())).statusCode).toBe(200);const summary=await new WorkdayReads(db.pool).summary(f.principal,f.round.workdayId);expect(summary.endedAt).toBeNull();expect(summary.rounds[0]?.endedAt).not.toBeNull();expect(summary.collection[0]?.reportedMinor).toBe('25000');
});

test('P23 C: public HTTP/client lost-response and API restart demonstration validates correction events',async()=>{await correctionDemo();},30_000);

test('P23 C: correction cannot invalidate a handover claim already anchoring an active branch visit',async()=>{
 const f=await correctionFixture(),{request}=await offer(f);
 expect((await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch',sourceRevision:2,name:'فرع',enabled:true,location:{latitude:30.1,longitude:31.3}}))).statusCode).toBe(200);
 const interrupt=f.planCommand('branch.interruptRound',{roundId:f.round.roundId,expectedActivityRevision:2,expectedCurrentAttemptId:null,requestId:request.requestId,claims:[{itemId:request.items[0]!.itemId,quantity:2}],serviceEstimateSeconds:300});delete interrupt.payload.driverId;
 expect((await new Branches(db.pool).command(f.principal,interrupt)).receipt.businessStatus).toBe('accepted');
 const denied=await f.postCorrection(f.correct());expect(denied.statusCode,denied.body).toBe(409);expect(denied.json().response.body.availability.constraints).toContain('claimed-handover');
 expect((await nativePost(f,receive(f,request,2))).statusCode).toBe(200);expect((await db.pool.query('SELECT * FROM tawsel.outcome_corrections')).rowCount).toBe(0);
});

test('A: source-grouped request is only an offer, native pending reads are scoped, and duplicate request cannot reserve twice',async()=>{
 const f=await fixture();expect(f.groups.groups).toHaveLength(1);expect(f.group.items).toHaveLength(2);
 const {command,result,request}=await offer(f);expect(conforms('RequestView',request)).toBe(true);
 expect(request.items[0]).toMatchObject({requested:3,received:0,lost:0,damaged:0,unresolved:3,custody:{sourceQuantity:3,delivered:0,held:3,received:0,lost:0,damaged:0}});
 expect((await f.postRequest(command)).json()).toEqual(result);
 const list=await f.app.inject({url:`/api/v1/erp/returns/pending?driverId=${f.driverId}&sourceBranchId=${f.group.sourceBranchId}`,headers:{authorization:f.authorization}});expect(list.statusCode,list.body).toBe(200);expect(list.json().items).toEqual([request]);
 expect((await f.service.confirm(f.principal,request.requestId,{claims:[{itemId:request.items[0]!.itemId,quantity:2}]})).state).toBe('waiting');
 expect((await f.postRequest(f.makeRequest())).statusCode).toBe(409);
 expect((await db.pool.query('SELECT * FROM tawsel.return_balances')).rowCount).toBe(0);
 expect((await db.pool.query('SELECT * FROM tawsel.retry_dependencies')).rowCount).toBe(0);
 expect((await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE event_type='return.requested'")).rows.map(r=>conforms('RequestedEvent',r.payload))).toEqual([true]);
 expect((await f.app.inject({url:`/api/v1/erp/returns/requests/${request.requestId}`})).statusCode).toBe(401);
});
test('A: wrong source branch and excess quantities reject; SQL prevents cross-branch item identity and over-receipt',async()=>{
 const f=await fixture();const other=await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch-b',sourceRevision:1,name:'ب',enabled:true,location:null}));expect(other.statusCode).toBe(200);const branchB=other.json().response.body.resourceId;
 const wrong=f.makeRequest();wrong.payload.sourceBranchId=branchB;const rejected=await f.postRequest(wrong);expect(rejected.statusCode,rejected.body).toBe(409);expect(rejected.body).toContain('wrong_source_branch');
 expect((await f.postRequest(f.makeRequest([0],4))).statusCode).toBe(409);
 const {request}=await offer(f),item=request.items[0]!;
 await expect(db.pool.query('UPDATE tawsel.return_items SET received=4 WHERE tenant_id=$1 AND item_id=$2',[f.tenantId,item.itemId])).rejects.toMatchObject({code:'23514'});
 // A fabricated request header cannot relabel goods from branch A as branch B.
 const second=f.group.items[1]!;
 await expect(db.pool.query(`INSERT INTO tawsel.return_items (tenant_id,item_id,request_id,task_id,dispatch_cycle_id,outcome_id,branch_id,integration_id,driver_id,source_line_id,requested) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pieces',1)`,[f.tenantId,randomUUID(),request.requestId,second.taskId,second.dispatchCycleId,second.outcomeId,branchB,request.integrationId,f.driverId])).rejects.toMatchObject({code:'23503'});
 expect((await f.service.read(f.principal,request.requestId)).items[0]).toEqual(item);
});

test('B: actual two of three receipt, exact duplicate, stale fresh ID and independent other-item subset preserve unresolved goods',async()=>{
 const f=await fixture(),{request}=await offer(f,[0,1]),c=receive(f,request),r=await nativePost(f,c);expect(r.statusCode,r.body).toBe(200);
 const after=r.json().response.body.request as components['schemas']['ReturnRequestView'];expect(after.items[0]).toMatchObject({requested:3,received:2,unresolved:1,lost:0,damaged:0,revision:1,custody:{sourceQuantity:3,delivered:0,held:1,received:2,lost:0,damaged:0}});
 expect(after.items[1]).toMatchObject({received:0,unresolved:3,revision:0});expect((await nativePost(f,c)).json()).toEqual(r.json());
 const fresh=structuredClone(c);fresh.actionId=randomUUID();expect((await nativePost(f,fresh)).statusCode).toBe(409);
 const conflict=structuredClone(c);(conflict.payload.items as {quantity:number}[])[0]!.quantity=1;expect((await nativePost(f,conflict)).statusCode).toBe(409);
 const other=await nativePost(f,receive(f,request,1,1));expect(other.statusCode,other.body).toBe(200);
 expect((await f.service.confirm(f.principal,request.requestId,{claims:[{itemId:request.items[0]!.itemId,quantity:2}]})).state).toBe('confirmed');
 expect((await f.service.confirm(f.principal,request.requestId,{claims:[{itemId:request.items[0]!.itemId,quantity:3}]})).state).toBe('waiting');
 const read=await f.app.inject({url:`/api/v1/erp/returns/actions/${c.actionId}`,headers:{authorization:f.authorization}});expect(read.json().result).toEqual(r.json());
 const events=await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE event_type='return.subsetReceived'");expect(events.rows).toHaveLength(2);expect(events.rows.every(r=>conforms('ReceivedEvent',r.payload))).toBe(true);
 expect((await db.pool.query('SELECT * FROM tawsel.return_transitions')).rowCount).toBe(2);expect((await db.pool.query('SELECT * FROM tawsel.retry_dependencies')).rowCount).toBe(2);
 expect((await new Outcomes(db.pool).read(f.principal,f.round.roundId)).progress.heldReturnRequiredPieces).toBe(3);
 const carried=await new WorkdayReads(db.pool).carryForward(f.principal,f.round.workdayId);expect(carried.items.reduce((n,i)=>n+(i.heldPieces??0),0)).toBe(3);
});
test.each(['lost','damaged'] as const)('B: %s is separate disposition, never physical receipt or confirmation',async(disposition)=>{
 const f=await fixture(),{request}=await offer(f),r=await nativePost(f,receive(f,request,1,0,disposition));expect(r.statusCode,r.body).toBe(200);
 const item=r.json().response.body.request.items[0];expect(item).toMatchObject({received:0,unresolved:2,[disposition]:1,custody:{held:2,received:0,[disposition]:1}});
 expect((await f.service.confirm(f.principal,request.requestId,{claims:[{itemId:item.itemId,quantity:1}]})).state).toBe('waiting');
 const event=(await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE event_type='return.dispositionRecorded'")).rows[0].payload;expect(conforms('DispositionEvent',event)).toBe(true);expect(conforms('ReceivedEvent',event)).toBe(false);
 expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='return.subsetReceived'")).rowCount).toBe(0);
});
test('B: wrong receiving branch even with both grants, over-receipt, duplicate item and forged human actor leave goods held',async()=>{
 const f=await fixture(),{request}=await offer(f),other=await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch-b',sourceRevision:1,name:'ب',enabled:true,location:null}));expect(other.statusCode).toBe(200);
 const wrong=receive(f,request);wrong.payload.receivingBranchId=other.json().response.body.resourceId;
 const denial=await nativePost(f,wrong);expect(denial.statusCode,denial.body).toBe(409);expect(denial.body).toContain('wrong_source_branch');
 expect((await nativePost(f,receive(f,request,4))).statusCode).toBe(409);
 const duplicate=receive(f,request);(duplicate.payload.items as unknown[]).push((duplicate.payload.items as unknown[])[0]);expect((await nativePost(f,duplicate)).statusCode).toBe(400);
 const forged=receive(f,request);if(forged.context.kind==='integration')forged.context.assertedActorId=f.accountId;expect((await nativePost(f,forged)).statusCode).toBe(400);
 expect((await f.service.read(f.principal,request.requestId)).items).toEqual(request.items);
 expect((await db.pool.query('SELECT * FROM tawsel.return_balances')).rowCount).toBe(0);
});
test('B: fault at every write boundary rolls back quantities, dependency, history, audit, event and durable result',async()=>{
 const f=await fixture(),{request}=await offer(f),c=receive(f,request);
 for(const stage of ['domain','progress','audit','outbox','result'] as const){
  const app=Fastify();await app.register(s=>returnReceiverRoutes(s,db.pool,new ReturnReceiver(db.pool,{async afterWrite(at){if(at===stage)throw new Error(`injected ${stage}`);}})));await app.ready();closers.push(()=>app.close());
  expect((await nativePost(f,c,app)).statusCode).toBe(503);
  expect((await f.service.read(f.principal,request.requestId)).items).toEqual(request.items);
  for(const table of ['return_balances','return_transitions','retry_dependencies'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
  for(const table of ['command_identities','command_audit','outbox_intents','intake_replan_intents'])expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[c.actionId])).rowCount).toBe(0);
 }
 expect((await nativePost(f,c)).statusCode).toBe(200);
});
test('B: partial delivery followed by receipt preserves delivered pieces, reported collection and original immutable outcome',async()=>{
 const f=await outcomeCompanyFixture(db,[{}]);closers.push(()=>f.close());const bootstrap=structuredClone(f.source.bootstrapCommand);bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=3;bootstrap.payload.returnCapabilities=['return.receive'];expect((await send(f.app,operatorToken,bootstrap)).statusCode).toBe(200);
 const outcomes=new Outcomes(db.pool);expect((await outcomes.command(f.principal,f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}))).receipt.businessStatus).toBe('accepted');
 const before=await outcomes.read(f.principal,f.round.roundId),o=before.items[0]!,service=new Returns(db.pool),c=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:o.branchId,items:[{taskId:o.taskId,dispatchCycleId:o.dispatchCycleId,outcomeId:o.outcomeId,sourceLineId:'pieces',quantity:1}]});delete c.payload.driverId;
 const accepted=await service.request(f.principal,c),request=(accepted.response!.body as components['schemas']['ReturnCommandResult']).request;
 const receive=f.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,expectedRevision:0,quantity:1}]});
 const response=await f.app.inject({method:'POST',url:'/api/v1/erp/returns/commands/return.confirmSubsetReceipt',headers:{authorization:`Bearer ${f.source.token}`},payload:receive});expect(response.statusCode,response.body).toBe(200);
 expect(response.json().response.body.request.items[0].custody).toEqual({sourceQuantity:3,delivered:2,held:0,received:1,lost:0,damaged:0});
 const after=await outcomes.read(f.principal,f.round.roundId);expect(after.history).toEqual(before.history);expect(after.progress).toMatchObject({deliveredPieces:2,heldReturnRequiredPieces:0,collection:[{reportedMinor:'25000'}]});
 expect((await new WorkdayReads(db.pool).carryForward(f.principal,f.round.workdayId)).items).toHaveLength(0);
});

async function retry(f:Fixture,taskId:string){const read=await new Eligibility(db.pool).read(f.principal,f.round.roundId),s=read.items.find(i=>i.taskId===taskId)!;const c=f.planCommand('task.retryWhole',{roundId:f.round.roundId,taskId:s.taskId,attemptId:s.attemptId,expectedSourceRevision:s.sourceRevision,expectedAssignmentRevision:s.assignmentRevision,expectedPinRevision:s.pinRevision,expectedActivityRevision:read.activityRevision,expectedCurrentAttemptId:read.currentAttemptId,expectedEligibilityRevision:s.revision});delete c.payload.driverId;return c;}
test.each([true,false])('C: real independent receipt versus retry commits only compatible quantities, receipt first=%s',async(receiptFirst)=>{
 const f=await fixture(),{request}=await offer(f),receipt=receive(f,request),reattempt=await retry(f,request.items[0]!.taskId);
 const one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid);expect(holder).not.toBe(waiter);
 const entered=deferred(),release=deferred(),hooks:Pick<CommandHooks,'afterWrite'>={async afterWrite(stage){if(stage==='domain'){entered.resolve();await release.promise;}}};
 const first=receiptFirst?new ReturnReceiver(one,hooks).command(f.authorization,'return.confirmSubsetReceipt',receipt):new Eligibility(one,hooks).command(f.principal,reattempt);
 await entered.promise;const second=receiptFirst?new Eligibility(two).command(f.principal,reattempt):new ReturnReceiver(two).command(f.authorization,'return.confirmSubsetReceipt',receipt);
 try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const [a,b]=await Promise.all([first,second]);expect(a.receipt.businessStatus).toBe('accepted');expect(b.receipt.businessStatus).toBe('rejected');
 const view=await f.service.read(f.principal,request.requestId);expect(view.items[0]).toMatchObject(receiptFirst?{received:2,unresolved:1,custody:{held:1}}:{received:0,unresolved:3,eligibility:'superseded',custody:{held:3}});
 expect((await db.pool.query('SELECT * FROM tawsel.return_transitions')).rowCount).toBe(receiptFirst?1:0);
 const s=(await new Eligibility(db.pool).read(f.principal,f.round.roundId)).items.find(s=>s.taskId===request.items[0]!.taskId)!;
 if(receiptFirst){expect(s.attemptId).toBe(request.items[0]!.attemptId);expect(s.actions.retry).toMatchObject({allowed:false,blocker:'receipt-or-disposition'});}
 else expect(s.attemptId).not.toBe(request.items[0]!.attemptId);
});
test.each([true,false])('C: stale return versus new retry outcome cannot resurrect delivered pieces, outcome first=%s',async(outcomeFirst)=>{
 const f=await fixture(),{request}=await offer(f),receipt=receive(f,request),ret=await new Eligibility(db.pool).command(f.principal,await retry(f,request.items[0]!.taskId));expect(ret.receipt.businessStatus).toBe('accepted');
 const read=await new Eligibility(db.pool).read(f.principal,f.round.roundId),s=read.items.find(i=>i.taskId===request.items[0]!.taskId)!,outcome=f.planCommand('outcome.recordFull',{roundId:f.round.roundId,taskId:s.taskId,attemptId:s.attemptId,expectedSourceRevision:s.sourceRevision,expectedAssignmentRevision:s.assignmentRevision,expectedPinRevision:s.pinRevision,expectedActivityRevision:read.activityRevision,expectedCurrentAttemptId:read.currentAttemptId,reportedCollection:money(35000)});delete outcome.payload.driverId;
 const one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();
 const hooks:Pick<CommandHooks,'afterWrite'>={async afterWrite(stage){if(stage==='domain'){entered.resolve();await release.promise;}}};
 const first=outcomeFirst?new Outcomes(one,hooks).command(f.principal,outcome):new ReturnReceiver(one,hooks).command(f.authorization,'return.confirmSubsetReceipt',receipt);
 await entered.promise;const second=outcomeFirst?new ReturnReceiver(two).command(f.authorization,'return.confirmSubsetReceipt',receipt):new Outcomes(two).command(f.principal,outcome);
 try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const results=await Promise.all([first,second]);expect(results[outcomeFirst?0:1]!.receipt.businessStatus).toBe('accepted');expect(results[outcomeFirst?1:0]!.receipt.businessStatus).toBe('rejected');
 expect((await f.service.read(f.principal,request.requestId)).items[0]).toMatchObject({eligibility:'superseded',received:0,custody:{delivered:3,held:0,received:0}});
 expect((await db.pool.query('SELECT * FROM tawsel.return_transitions')).rowCount).toBe(0);
});
test('C: two simultaneous copies of one subset have one durable effect across independent connections',async()=>{
 const f=await fixture(),{request}=await offer(f),c=receive(f,request),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();
 const first=new ReturnReceiver(one,{async afterWrite(stage){if(stage==='domain'){entered.resolve();await release.promise;}}}).command(f.authorization,'return.confirmSubsetReceipt',c);await entered.promise;
 const second=new ReturnReceiver(two).command(f.authorization,'return.confirmSubsetReceipt',c);try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const [a,b]=await Promise.all([first,second]);expect(a).toEqual(b);expect((await db.pool.query('SELECT * FROM tawsel.return_transitions')).rowCount).toBe(1);
 expect((await f.service.read(f.principal,request.requestId)).items[0]).toMatchObject({received:2,unresolved:1});
});
test('C: B2C request is rejected by the actual endpoint and a former device request is retained without custody mutation',async()=>{
 const p=await startedFixture(db.pool,1),app=Fastify();await app.register(s=>returnDriverRoutes(s,db.pool,config,(_r,_k,work)=>work(principals.personal)));await app.ready();closers.push(()=>app.close());
 const c=p.make();c.operationId='return.requestHandover';c.payload={roundId:p.round.roundId,sourceBranchId:randomUUID(),items:[{taskId:p.tasks[0]!.taskId,dispatchCycleId:randomUUID(),outcomeId:randomUUID(),sourceLineId:'fake',quantity:1}]};
 const denied=await app.inject({method:'POST',url:'/api/v1/returns/request?kind=personal',headers,payload:c});expect(denied.statusCode).toBe(409);expect(denied.body).toContain('lifecycle_forbidden');
 const f=await fixture(),old=f.makeRequest(),take=f.planCommand('device.takeOver',{roundId:f.round.roundId,expectedGeneration:1});delete take.payload.driverId;if(take.context.kind==='device')take.context.deviceId=randomUUID();expect((await new Devices(db.pool).takeover(f.principal,take)).receipt.businessStatus).toBe('accepted');
 const stale=await f.postRequest(old);expect(stale.json().receipt.businessStatus).toBe('review-required');expect((await db.pool.query('SELECT * FROM tawsel.return_requests')).rowCount).toBe(0);expect((await db.pool.query('SELECT * FROM tawsel.command_evidence WHERE action_id=$1',[old.actionId])).rowCount).toBe(1);
});
test('C: cross-source and cross-tenant readers cannot see native requests; revoked grants cannot replay receipts',async()=>{
 const f=await fixture(),{request}=await offer(f),c=receive(f,request);expect((await nativePost(f,c)).statusCode).toBe(200);
 for(const tenant of [f.tenantId,randomUUID()]){
  const other=await bindSource(f.app,[`other-${randomUUID()}`],tenant),grant=structuredClone(other.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=2;grant.payload.returnCapabilities=['return.receive','return.dispose'];expect((await send(f.app,operatorToken,grant)).statusCode).toBe(200);
  const read=await f.app.inject({url:`/api/v1/erp/returns/requests/${request.requestId}`,headers:{authorization:`Bearer ${other.token}`}});expect(read.statusCode).toBe(404);
  const stolen=structuredClone(c);stolen.context={kind:'integration',tenantId:tenant,integrationId:other.integrationId};stolen.actionId=randomUUID();expect((await f.app.inject({method:'POST',url:'/api/v1/erp/returns/commands/return.confirmSubsetReceipt',headers:{authorization:`Bearer ${other.token}`},payload:stolen})).statusCode).toBe(404);
 }
 const revoke=structuredClone(f.source.bootstrapCommand);revoke.actionId=randomUUID();revoke.payload.sourceRevision=4;revoke.payload.returnCapabilities=[];expect((await send(f.app,operatorToken,revoke)).statusCode).toBe(200);
 expect((await nativePost(f,c)).statusCode).toBe(403);expect((await f.app.inject({url:`/api/v1/erp/returns/requests/${request.requestId}`,headers:{authorization:f.authorization}})).statusCode).toBe(403);
 expect((await f.service.read(f.principal,request.requestId)).items[0]!.received).toBe(2);
});
async function cleanupUpgrade(directory:URL){const target=resolve(fileURLToPath(directory)),root=resolve(fileURLToPath(new URL('../../../../.local/',import.meta.url)));if(!target.startsWith(root+sep)||!target.split(sep).at(-1)?.startsWith('p21-upgrade-'))throw new Error('Unsafe fixture cleanup target');await rm(target,{recursive:true,force:true});}
test('C: additive migration preserves a real P20 partial outcome and exposes its held remainder',async()=>{
 const old=await createTestDatabase(),directory=new URL(`../../../../.local/p21-upgrade-${randomUUID()}/`,import.meta.url),source=new URL('../../../../db/migrations/',import.meta.url);let f:Awaited<ReturnType<typeof outcomeCompanyFixture>>|undefined;
 try{
  await mkdir(directory,{recursive:true});for(const name of (await readdir(source)).filter(n=>n.endsWith('.sql')&&n<'0019'))await copyFile(new URL(name,source),new URL(name,directory));
  await prepareAccessFixture(old.pool,undefined,directory);f=await outcomeCompanyFixture(old,[{}]);expect((await new Outcomes(old.pool).command(f.principal,f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}))).receipt.businessStatus).toBe('accepted');
  const before=(await old.pool.query('SELECT record FROM tawsel.delivery_outcomes')).rows;expect(await migrate(old.pool)).toEqual(['0019_source_returns.sql','0020_branch_activity.sql','0021_dispatch_cycles.sql','0022_driver_corrections.sql','0023_monitoring_snapshots.sql']);expect((await old.pool.query('SELECT record FROM tawsel.delivery_outcomes')).rows).toEqual(before);
  expect((await new Returns(old.pool).groups(f.principal)).groups[0]!.items[0]).toMatchObject({availableToRequest:1,custody:{sourceQuantity:3,delivered:2,held:1,received:0,lost:0,damaged:0}});
 }finally{await f?.close();await old.close();await cleanupUpgrade(directory);}
});
test('C: one multi-branch driver gets distinct real-origin groups and cannot mix A and B in one handover',async()=>{
 const f=await fixture();expect((await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch-b',sourceRevision:1,name:'ب',enabled:true,location:null}))).statusCode).toBe(200);
 expect((await send(f.app,f.source.token,f.source.command('user.setBranchMemberships',{externalId:'policy-driver',sourceRevision:2,branchExternalIds:['branch','branch-b']}))).statusCode).toBe(200);
 const original=await f.app.inject({url:'/api/v1/intake/task?externalId=shipment-0',headers:{authorization:f.authorization}});expect(original.statusCode).toBe(200);
 const created=await f.post('intake.submitSnapshot',{...original.json().snapshot,externalId:'branch-b-goods',sourceBranchExternalId:'branch-b',expectedSourceRevision:0});
 const taskId=(created.json() as {response:{body:{tasks:{taskId:string}[]}}}).response.body.tasks[0]!.taskId;
 await f.post('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId:'branch-b-goods',sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}]});
 const state=await new Eligibility(db.pool).read(f.principal,f.round.roundId),s=state.items.find(i=>i.taskId===taskId)!,c=f.planCommand('outcome.recordNoAnswer',{roundId:f.round.roundId,taskId,attemptId:s.attemptId,expectedSourceRevision:s.sourceRevision,expectedAssignmentRevision:s.assignmentRevision,expectedPinRevision:s.pinRevision,expectedActivityRevision:state.activityRevision,expectedCurrentAttemptId:state.currentAttemptId});delete c.payload.driverId;
 expect((await new Outcomes(db.pool).command(f.principal,c)).receipt.businessStatus).toBe('accepted');
 const groups=(await f.service.groups(f.principal)).groups;expect(groups).toHaveLength(2);const b=groups.find(g=>g.sourceBranchId!==f.group.sourceBranchId)!;expect(b.items.map(i=>i.taskId)).toEqual([taskId]);
 const item=b.items[0]!,offer={taskId:item.taskId,dispatchCycleId:item.dispatchCycleId,outcomeId:item.outcomeId,sourceLineId:item.sourceLineId,quantity:3};
 const mixed=f.makeRequest();(mixed.payload.items as unknown[]).push(offer);expect((await f.postRequest(mixed)).statusCode).toBe(409);expect((await db.pool.query('SELECT * FROM tawsel.return_requests')).rowCount).toBe(0);
 const own=f.makeRequest();own.payload.sourceBranchId=b.sourceBranchId;own.payload.items=[offer];expect((await f.postRequest(own)).statusCode).toBe(200);
});
test('C: retained receipt identity after response compaction cannot receive twice or turn an accepted result into pending',async()=>{
 const f=await fixture(),{request}=await offer(f),c=receive(f,request),r=await nativePost(f,c);expect(r.statusCode).toBe(200);
 // Controlled retention/transport completion fixture, not P25 sender evidence.
 await db.pool.query("UPDATE tawsel.command_identities SET finalized_at=clock_timestamp()-interval '45 days' WHERE action_id=$1",[c.actionId]);
 await db.pool.query("UPDATE tawsel.outbox_intents SET state='resolved',resolved_at=clock_timestamp() WHERE action_id=$1",[c.actionId]);expect(await compactCommandResponses(db.pool)).toBe(1);
 const duplicate=await nativePost(f,c);expect(duplicate.statusCode,duplicate.body).toBe(200);expect(duplicate.json()).toMatchObject({retention:'compacted',receipt:r.json().receipt});expect(duplicate.json().response).toBeUndefined();
 expect((await f.service.read(f.principal,request.requestId)).items[0]).toMatchObject({received:2,unresolved:1});expect((await db.pool.query('SELECT * FROM tawsel.return_transitions')).rowCount).toBe(1);
});
