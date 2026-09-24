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
  const before=(await old.pool.query('SELECT record FROM tawsel.delivery_outcomes')).rows;expect(await migrate(old.pool)).toEqual(['0019_source_returns.sql','0020_branch_activity.sql','0021_dispatch_cycles.sql']);expect((await old.pool.query('SELECT record FROM tawsel.delivery_outcomes')).rows).toEqual(before);
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
