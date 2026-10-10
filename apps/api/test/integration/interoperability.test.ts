import {beforeEach,afterEach,test,expect} from 'vitest';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {createServer} from 'node:http';
import {once} from 'node:events';
import type {components} from '@tawsel/api-client';
import {publicValidator} from '@tawsel/api-client/validation';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture} from '../support/access-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {companyPlanningFixture} from '../support/planning-company-fixture.js';
import {operatorToken,send} from '../support/provisioning-fixture.js';
import {deferred,observeDatabaseBlock} from '../support/barriers.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {Corrections} from '../../src/corrections/service.js';
import {CurrentActivity} from '../../src/current/service.js';
import {B2bIntakeService} from '../../src/b2b-intake/service.js';
import {Returns} from '../../src/returns/service.js';
import {ReturnReceiver} from '../../src/returns/receiver.js';
import {Monitoring} from '../../src/monitoring/service.js';
import {OutboxReads} from '../../src/outbox/reads.js';
import {ReconciliationReads} from '../../src/outbox/reconciliation.js';
import {OutboxService} from '../../src/outbox/service.js';
import {runOutboxOnce} from '../../src/outbox/worker.js';
import {createReceiverDatabase} from '../../../../scripts/mock-erp-database.js';
import {receiverProcess} from '../../../mock-erp/test/support/process.js';
import {migrateReceiver} from '../../../mock-erp/src/database.js';
import {applyInboxOnce} from '../../../mock-erp/src/projection.js';
import {money} from '../../src/outcomes/arithmetic.js';
import {Synchronization} from '../../src/sync/service.js';
import {envelope,type Intent} from '../../src/outbox/envelope.js';
type S=components['schemas'];
let db:Awaited<ReturnType<typeof createTestDatabase>>;
const close:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const c of close.splice(0).reverse())await c();await db.close();});
async function adopt(f:Awaited<ReturnType<typeof companyPlanningFixture>>){
 const c=structuredClone(f.source.bootstrapCommand);c.actionId=randomUUID();c.payload.sourceRevision=3;
 Object.assign(c.payload,{interopVersion:'2.0.0',erpCompanyId:randomUUID(),intakeCapabilities:['intake.prepare','assignment.manage'],returnCapabilities:['return.receive','return.dispose'],monitoringCapabilities:['monitor.read']});
 expect((await send(f.app,operatorToken,c)).statusCode).toBe(200);
 return c;
}
const transfer=()=>({sourceBranchExternalId:'branch',transferId:randomUUID(),destinationReceiptId:randomUUID(),receivedAtDestination:true as const});
async function branchB(f:Awaited<ReturnType<typeof companyPlanningFixture>>){
 const r=await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch-b',sourceRevision:1,name:'B',enabled:true,location:null}));expect(r.statusCode).toBe(200);return r.json().response.body.resourceId as string;
}
async function signedBranchProof(f:Pick<Awaited<ReturnType<typeof companyPlanningFixture>>,'tenantId'|'source'>,eventType:string){
 const receiver=await createReceiverDatabase();close.push(()=>receiver.close());const scope={tenantId:f.tenantId,integrationId:f.source.integrationId};await migrateReceiver(receiver.pool,scope);
 const key={keyId:'branch-interop',secret:randomBytes(32).toString('hex')},process=await receiverProcess(receiver.url,{...scope,statusToken:randomBytes(32).toString('hex'),keys:[key],host:'127.0.0.1',port:0});close.push(()=>process.close());
 const config={encryptionKey:randomBytes(32),destinations:[{...scope,url:process.url+'/api/v1/consumer/events'}],keys:[{...scope,...key}],testLoopback:true},auth=`Bearer ${f.source.token}`,sender=new OutboxService(db.pool,config);
 await sender.command(auth,'integration.configureWebhook',f.source.command('integration.configureWebhook',{url:config.destinations[0]!.url,enabled:true,expectedRevision:0}));await sender.command(auth,'integration.rotateSigningKey',f.source.command('integration.rotateSigningKey',{keyId:key.keyId,overlapSeconds:300}));
 for(let i=0;i<100&&await runOutboxOnce(db.pool,config);i++){/* HMAC HTTP into a separate durable receiver process/database. */}
 while(await applyInboxOnce(receiver.pool)){/* atomic independent projection */}
 const events=(await receiver.pool.query("SELECT envelope->>'eventId' AS \"eventId\",envelope->>'eventType' AS \"eventType\",envelope->>'payloadVersion' AS \"payloadVersion\" FROM mock_erp.inbox WHERE envelope->>'payloadVersion'='2.0.0'")).rows;
 expect(events.some(e=>e.eventType===eventType)).toBe(true);expect((await receiver.pool.query('SELECT count(*)::int n FROM mock_erp.inbox WHERE applied_at IS NULL')).rows[0].n).toBe(0);
 return {classification:'Actual signed local HTTP, separate receiver process and durable database; reference consumer only',events};
}
async function outcomeFixture(){const f=await outcomeCompanyFixture(db);close.push(()=>f.close());await adopt(f);return f;}
test('v2 human refusal requires fixed reason, Other detail, adoption; v1 immutable actions remain recoverable',async()=>{
 const f=await outcomeCompanyFixture(db);close.push(()=>f.close());const outcomes=new Outcomes(db.pool);
 const c=f.make(0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000),rejection:{catalogVersion:'1.0.0',code:'missing-pieces'}});c.payloadVersion='2.0.0';
 expect((await outcomes.command(f.principal,c)).receipt.problem?.code).toBe('lifecycle_forbidden');
 await adopt(f);c.actionId=randomUUID();
 const missing=structuredClone(c);missing.actionId=randomUUID();delete missing.payload.rejection;
 expect((await outcomes.command(f.principal,missing)).receipt.problem?.code).toBe('validation_failed');
 for(const rejection of [{catalogVersion:'1.0.0',code:'other'},{catalogVersion:'1.0.0',code:'other',detail:'  '},{catalogVersion:'1.0.0',code:'other',detail:'x'.repeat(501)},{catalogVersion:'1.0.0',code:'unknown'},{catalogVersion:'2.0.0',code:'missing-pieces'}])await expect(outcomes.command(f.principal,{...c,actionId:randomUUID(),payload:{...c.payload,rejection}})).rejects.toMatchObject({code:'validation_failed'});
 const result=await outcomes.command(f.principal,c);expect(result.receipt.businessStatus).toBe('accepted');expect((result.response!.body as S['OutcomeCommandResult']).outcome).toMatchObject({recordVersion:'2.0.0',rejection:c.payload.rejection,lines:[{sourceQuantity:3,delivered:0,heldReturnRequired:3}]});
 expect((await outcomes.command(f.principal,c))).toEqual(result);
 expect((await outcomes.read(f.principal,f.round.roundId)).history![0]!.rejection).toEqual(c.payload.rejection);
 expect((await db.pool.query('SELECT * FROM tawsel.return_transitions')).rowCount).toBe(0);
 const old=f.make(1,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000)},1);
 const legacy=await outcomes.command(f.principal,old);expect(legacy.receipt.businessStatus).toBe('accepted');expect((legacy.response!.body as S['OutcomeCommandResult']).outcome).not.toHaveProperty('rejection');expect(await outcomes.command(f.principal,old)).toEqual(legacy);
 await expect(outcomes.command(f.principal,{...c,actionId:randomUUID(),operationId:'outcome.recordFull'})).rejects.toMatchObject({code:'validation_failed'});
 await expect(outcomes.command(f.principal,{...c,actionId:randomUUID(),operationId:'outcome.recordNoAnswer'})).rejects.toMatchObject({code:'validation_failed'});
});
test('v2 ordered replay, partial correction and signed durable receiver preserve original reason and effective replacement',async()=>{
 const f=await outcomeFixture();
 const role=f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']});expect((await send(f.app,f.source.token,role)).statusCode).toBe(200);
 const original=f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000),rejection:{catalogVersion:'1.0.0',code:'wrong-product'}});original.payloadVersion='2.0.0';
 const synced=await new Synchronization(db.pool).submit(f.principal,{actions:[original]});expect(synced.results[0]!.status).toBe('received');
 const outcomes=new Outcomes(db.pool),history=(await outcomes.read(f.principal,f.round.roundId)).history;expect(history).toHaveLength(1);
 const c=f.planCommand('outcome.correct',{roundId:f.round.roundId,taskId:f.tasks[0],attemptId:original.payload.attemptId,expectedOutcomeRevision:1,replacement:{outcome:'partial',pieces:[{sourceLineId:'pieces',delivered:1}],reportedCollection:money(15000),rejection:{catalogVersion:'1.0.0',code:'other',detail:'اللون مختلف عن الطلب'}}});delete c.payload.driverId;c.payloadVersion='2.0.0';
 const corrected=await new Corrections(db.pool).command(f.principal,c);expect(corrected.receipt.businessStatus,JSON.stringify(corrected)).toBe('accepted');
 const current=await outcomes.read(f.principal,f.round.roundId);expect(current.history!.map(o=>o.rejection?.code)).toEqual(['wrong-product','other']);expect(current.items[0]!.rejection?.detail).toBe('اللون مختلف عن الطلب');
 const auth=`Bearer ${f.source.token}`,replay=await new OutboxReads(db.pool).replay(auth,'task',f.tasks[0]!,0,100),validate=publicValidator();
 const v2=replay.events.filter(e=>e.payloadVersion==='2.0.0');expect(v2).toHaveLength(2);for(const event of v2){expect(validate('events/sender-event.schema.json',event)).toBe(true);expect(validate('events/sender-event.v1.schema.json',event)).toBe(false);}
 expect((await new ReconciliationReads(db.pool).snapshot(auth,'task',f.tasks[0]!)).state.outcomes[0]!.rejection?.code).toBe('other');
 const receiver=await createReceiverDatabase();close.push(()=>receiver.close());await migrateReceiver(receiver.pool,{tenantId:f.tenantId,integrationId:f.source.integrationId});
 const scope={tenantId:f.tenantId,integrationId:f.source.integrationId},key={keyId:'interop',secret:randomBytes(32).toString('hex')};
 const process=await receiverProcess(receiver.url,{...scope,statusToken:randomBytes(32).toString('hex'),keys:[key],host:'127.0.0.1',port:0});close.push(()=>process.close());
 const config={encryptionKey:randomBytes(32),destinations:[{...scope,url:process.url+'/api/v1/consumer/events'}],keys:[{...scope,...key}],testLoopback:true};const sender=new OutboxService(db.pool,config);
 await sender.command(auth,'integration.configureWebhook',f.source.command('integration.configureWebhook',{url:config.destinations[0]!.url,enabled:true,expectedRevision:0}));await sender.command(auth,'integration.rotateSigningKey',f.source.command('integration.rotateSigningKey',{keyId:key.keyId,overlapSeconds:300}));
 for(let i=0;i<40&&await runOutboxOnce(db.pool,config);i++){/* actual signed HTTP to a separate durable database/process */}
 while(await applyInboxOnce(receiver.pool)) {/* apply committed inbox */}
 expect((await receiver.pool.query("SELECT count(*)::int n FROM mock_erp.inbox WHERE envelope->>'payloadVersion'='2.0.0'")).rows[0].n).toBe(2);
 expect((await receiver.pool.query("SELECT * FROM mock_erp.transitions WHERE event_type='outcome.corrected'")).rowCount).toBe(1);
 await writeFile('docs/verification/interoperability-reasons-2026-10-10.json',JSON.stringify({classification:'Actual human-principal command fixtures, real PostgreSQL, ordered synchronization/replay and signed HTTP to separate durable reference receiver; no native Shahn claim',requests:{original,correction:c},result:corrected,history:current,replay,reconciliation:await new ReconciliationReads(db.pool).snapshot(auth,'task',f.tasks[0]!),senderWitness:{events:v2.map(e=>({eventId:e.eventId,eventType:e.eventType,payloadVersion:e.payloadVersion}))}},null,2)+'\n');
},30000);
test('no-answer after authoritative arrival retains actual arrival and never reports collection or fee liability',async()=>{
 const f=await outcomeFixture(),current=new CurrentActivity(db.pool),c=f.make(0,'current.selectHeading');expect((await current.command(f.principal,c)).receipt.businessStatus).toBe('accepted');
 const arrival=f.make(0,'current.recordArrival',{},1,String(c.payload.attemptId));expect((await current.command(f.principal,arrival)).receipt.businessStatus).toBe('accepted');
 const no=f.make(0,'outcome.recordNoAnswer',{},2,String(c.payload.attemptId)),result=await new Outcomes(db.pool).command(f.principal,no);
 expect((result.response!.body as S['OutcomeCommandResult']).outcome).toMatchObject({outcome:'no-answer',arrival:{actionId:arrival.actionId},collection:{reported:null,shipping:money(0),unpaidShipping:money(0),shippingStatus:'not-attempted'}});
});
async function predeparture(prepared=false){
 const f=await companyPlanningFixture(db);close.push(()=>f.close());await adopt(f);const branch=await branchB(f);
 const s:S['B2bSourceSnapshot']={externalId:'move',sourceDispatchCycleId:'A-1',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'branch',recipientName:'Recipient',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30,longitude:31}},splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'pieces',description:'Pieces',quantity:3,unitDue:money(10000)}],shippingDue:money(5000),totalDue:money(35000),priority:'ordinary'};
 const service=new B2bIntakeService(db.pool),auth=`Bearer ${f.source.token}`,initial=f.source.command('intake.submitSnapshot',s);const accepted=await service.command(auth,'intake.submitSnapshot',initial);const old=(accepted.response!.body.tasks as S['B2bTask'][])[0]!;
 if(prepared)await service.command(auth,'intake.prepare',f.source.command('intake.prepare',{driverExternalId:'policy-driver',items:[{externalId:'move',sourceDispatchCycleId:'A-1',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}]}));
 const command=f.source.command('dispatch.relocateBeforeDeparture',{externalId:'move',previousDispatchCycleId:old.dispatchCycleId,snapshot:{...s,sourceBranchExternalId:'branch-b',sourceDispatchCycleId:'B-1',sourceRevision:2,expectedSourceRevision:1},transfer:transfer()});command.payloadVersion='2.0.0';
 return {...f,service,auth,old,command,branch,initial};
}
test.each([false,true])('predeparture relocation keeps frozen A and new B ownership; prepared=%s',async prepared=>{
 const f=await predeparture(prepared);
 if(prepared){expect((await f.service.command(f.auth,'dispatch.relocateBeforeDeparture',f.command)).receipt.businessStatus).toBe('rejected');f.command.actionId=randomUUID();expect((await f.service.command(f.auth,'assignment.withdraw',f.source.command('assignment.withdraw',{externalId:'move',sourceDispatchCycleId:'A-1',expectedSourceRevision:1,expectedAssignmentRevision:1,assignmentRevision:2}))).receipt.businessStatus).toBe('accepted');}
 const http=await f.app.inject({method:'POST',url:'/api/v1/intake/commands/dispatch.relocateBeforeDeparture',headers:{authorization:f.auth},payload:f.command});expect(http.statusCode).toBe(200);
 const result=http.json() as S['ActionResult'];expect(result.receipt.businessStatus,JSON.stringify(result)).toBe('accepted');expect(await f.service.command(f.auth,'dispatch.relocateBeforeDeparture',f.command)).toEqual(result);
 const latest=await f.service.get(f.auth,'move');expect(latest).toMatchObject({taskId:f.old.taskId,sourceRevision:2,assignmentRevision:0,state:'unassigned',snapshot:{sourceBranchExternalId:'branch-b'}});
 const cycles=await f.service.cycles(f.auth,'move');expect(cycles.items.find(c=>!c.latest)?.snapshot.sourceBranchExternalId).toBe('branch');
 if(prepared){const senderWitness=await signedBranchProof(f,'dispatch.relocatedBeforeDeparture');const replay=await new OutboxReads(db.pool).replay(f.auth,'task',f.old.taskId,0,100),reconciliation=await new ReconciliationReads(db.pool).snapshot(f.auth,'task',f.old.taskId);const validate=publicValidator();for(const event of replay.events)expect(validate('events/sender-event.schema.json',event)).toBe(true);await writeFile('docs/verification/interoperability-predeparture-2026-10-10.json',JSON.stringify({classification:'Actual public Fastify HTTP injection, disposable PostgreSQL; schema-validated producer/replay/reconciliation; ERP receipt is a source assertion, no native physical proof',request:f.command,result,history:cycles,replay,reconciliation,senderWitness},null,2)+'\n');}
 const branches=(await db.pool.query('SELECT branch_id,latest FROM tawsel.b2b_dispatch_cycles WHERE task_id=$1 ORDER BY latest',[f.old.taskId])).rows;expect(branches[1].branch_id).toBe(f.branch);expect(branches[0].branch_id).not.toBe(f.branch);
 expect((await db.pool.query('SELECT branch_id FROM tawsel.location_tasks WHERE task_id=$1',[f.old.taskId])).rows[0].branch_id).toBe(f.branch);
 const receive=f.source.command('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId:'move',sourceDispatchCycleId:'B-1',expectedSourceRevision:2,expectedAssignmentRevision:0,assignmentRevision:1}]});expect((await f.service.command(f.auth,'assignment.receiveBatch',receive)).receipt.problem?.code).toBe('forbidden_resource');
 await send(f.app,f.source.token,f.source.command('user.setBranchMemberships',{externalId:'policy-driver',sourceRevision:2,branchExternalIds:['branch','branch-b']}));receive.actionId=randomUUID();expect((await f.service.command(f.auth,'assignment.receiveBatch',receive)).receipt.businessStatus).toBe('accepted');
 const resultOld=await f.service.result(f.auth,f.initial.actionId);expect(resultOld.result?.response).toEqual((await f.service.result(f.auth,f.initial.actionId)).result?.response);
});
test.each(['stale','wrong-origin','unreceived','changed-line','changed-price','same-cycle'])('relocation rejects %s and leaves A untouched',async kind=>{
 const f=await predeparture(),c=structuredClone(f.command),p=c.payload as S['B2bRelocate'];
 if(kind==='stale')p.snapshot.expectedSourceRevision=0;if(kind==='wrong-origin')p.transfer.sourceBranchExternalId='branch-b';if(kind==='unreceived')Object.assign(p.transfer,{receivedAtDestination:false});if(kind==='changed-line')p.snapshot.lines[0]!.sourceLineId='other';if(kind==='changed-price'){p.snapshot.shippingDue=money(6000);p.snapshot.totalDue=money(36000);}if(kind==='same-cycle')p.snapshot.sourceDispatchCycleId='A-1';
 if(kind==='unreceived')await expect(f.service.command(f.auth,'dispatch.relocateBeforeDeparture',c)).rejects.toMatchObject({code:'validation_failed'});else expect((await f.service.command(f.auth,'dispatch.relocateBeforeDeparture',c)).receipt.businessStatus).toBe('rejected');
 expect((await f.service.get(f.auth,'move')).dispatchCycleId).toBe(f.old.dispatchCycleId);expect((await db.pool.query('SELECT * FROM tawsel.dispatch_transfer_assertions')).rowCount).toBe(0);
});
test('source A-only and B-only cannot relocate; cycle list/result pagination filters scope before disclosure',async()=>{
 const f=await predeparture(),a=(await db.pool.query('SELECT branch_id FROM tawsel.b2b_dispatch_cycles WHERE dispatch_cycle_id=$1',[f.old.dispatchCycleId])).rows[0].branch_id as string;
 for(const scope of [[a],[f.branch]]){await db.pool.query('DELETE FROM tawsel.integration_branches WHERE tenant_id=$1 AND integration_id=$2',[f.tenantId,f.source.integrationId]);for(const id of scope)await db.pool.query('INSERT INTO tawsel.integration_branches VALUES($1,$2,$3)',[f.tenantId,f.source.integrationId,id]);await expect(f.service.command(f.auth,'dispatch.relocateBeforeDeparture',{...f.command,actionId:randomUUID()})).rejects.toMatchObject({code:'forbidden_resource'});}
 await db.pool.query('INSERT INTO tawsel.integration_branches VALUES($1,$2,$3)',[f.tenantId,f.source.integrationId,a]);expect((await f.service.command(f.auth,'dispatch.relocateBeforeDeparture',f.command)).receipt.businessStatus).toBe('accepted');
 await db.pool.query('DELETE FROM tawsel.integration_branches WHERE tenant_id=$1 AND integration_id=$2 AND branch_id=$3',[f.tenantId,f.source.integrationId,a]);expect((await f.service.cycles(f.auth,'move')).items.map(c=>c.snapshot.sourceBranchExternalId)).toEqual(['branch-b']);await expect(f.service.result(f.auth,f.initial.actionId)).rejects.toMatchObject({statusCode:404});
 await db.pool.query('DELETE FROM tawsel.integration_branches WHERE tenant_id=$1 AND integration_id=$2',[f.tenantId,f.source.integrationId]);await db.pool.query('INSERT INTO tawsel.integration_branches VALUES($1,$2,$3)',[f.tenantId,f.source.integrationId,a]);expect((await f.service.list(f.auth,{})).items).toHaveLength(0);expect((await f.service.cycles(f.auth,'move')).items.map(c=>c.snapshot.sourceBranchExternalId)).toEqual(['branch']);expect((await f.service.result(f.auth,f.initial.actionId)).status).toBe('accepted');
});
test('two independent relocation connections allocate one cycle and original-ID lost-response recovery retains event/result',async()=>{
 const f=await predeparture(),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});close.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();
 const first=new B2bIntakeService(one,{async afterWrite(s){if(s==='domain'){entered.resolve();await release.promise;}}}).command(f.auth,'dispatch.relocateBeforeDeparture',f.command);await entered.promise;
 const rival=structuredClone(f.command);rival.actionId=randomUUID();(rival.payload.snapshot as S['B2bSourceSnapshot']).sourceDispatchCycleId='B-competitor';const second=new B2bIntakeService(two).command(f.auth,'dispatch.relocateBeforeDeparture',rival);
 try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}expect((await first).receipt.businessStatus).toBe('accepted');expect((await second).receipt.businessStatus).toBe('rejected');
 const recovered=await new B2bIntakeService(db.pool).result(f.auth,f.command.actionId);expect(recovered.status).toBe('accepted');expect((await f.service.command(f.auth,'dispatch.relocateBeforeDeparture',f.command))).toEqual(recovered.result);
 expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='dispatch.relocatedBeforeDeparture'")).rowCount).toBe(1);
 const row=(await db.pool.query<Intent>("SELECT * FROM tawsel.outbox_intents WHERE event_type='dispatch.relocatedBeforeDeparture'")).rows[0]!;expect(publicValidator()('events/sender-event.schema.json',envelope(row))).toBe(true);
});

test('received held A work cannot relocate until durable withdrawal',async()=>{
 const f=await predeparture();const received=f.source.command('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId:'move',sourceDispatchCycleId:'A-1',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}]});expect((await f.service.command(f.auth,'assignment.receiveBatch',received)).receipt.businessStatus).toBe('accepted');
 expect((await f.service.command(f.auth,'dispatch.relocateBeforeDeparture',f.command)).receipt.problem?.code).toBe('lifecycle_forbidden');expect((await f.service.get(f.auth,'move')).state).toBe('held');expect((await db.pool.query('SELECT * FROM tawsel.dispatch_transfer_assertions')).rowCount).toBe(0);
});

test('new relocation rejects an actually departed A customer cycle without moving custody',async()=>{
 const f=await outcomeFixture();await branchB(f);const auth=`Bearer ${f.source.token}`,service=new B2bIntakeService(db.pool),old=await service.get(auth,'shipment-0');
 expect((await db.pool.query('SELECT departure_at FROM tawsel.b2b_dispatch_cycles WHERE dispatch_cycle_id=$1',[old.dispatchCycleId])).rows[0].departure_at).not.toBeNull();
 const c=f.source.command('dispatch.relocateBeforeDeparture',{externalId:old.externalId,previousDispatchCycleId:old.dispatchCycleId,snapshot:{...old.snapshot,sourceBranchExternalId:'branch-b',sourceDispatchCycleId:'departed-B',sourceRevision:2,expectedSourceRevision:1},transfer:transfer()});c.payloadVersion='2.0.0';
 expect((await service.command(auth,'dispatch.relocateBeforeDeparture',c)).receipt.problem?.code).toBe('departed_edit_forbidden');expect((await service.get(auth,'shipment-0')).dispatchCycleId).toBe(old.dispatchCycleId);
});

test('real HTTP commit with dropped relocation response recovers exact result/event under original action',async()=>{
 const f=await predeparture();const address=await f.app.listen({host:'127.0.0.1',port:0});let committed:S['ActionResult']|undefined;
 const proxy=createServer(async(req,res)=>{try{const chunks:Buffer[]=[];for await(const b of req)chunks.push(Buffer.from(b));const body=Buffer.concat(chunks);expect(JSON.parse(body.toString()).actionId).toBe(f.command.actionId);const response=await fetch(address+'/api/v1/intake/commands/dispatch.relocateBeforeDeparture',{method:'POST',headers:{authorization:f.auth,'content-type':'application/json'},body});committed=await response.json() as S['ActionResult'];res.destroy();}catch{res.destroy();}});
 proxy.listen(0,'127.0.0.1');await once(proxy,'listening');const port=(proxy.address() as {port:number}).port;
 try{await expect(fetch(`http://127.0.0.1:${port}/lost`,{method:'POST',body:JSON.stringify(f.command)})).rejects.toThrow();expect(committed?.receipt.businessStatus).toBe('accepted');const recovered=await f.service.result(f.auth,f.command.actionId);expect(recovered.result).toEqual(committed);expect(await f.service.command(f.auth,'dispatch.relocateBeforeDeparture',f.command)).toEqual(committed);expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='dispatch.relocatedBeforeDeparture'")).rowCount).toBe(1);await writeFile('docs/verification/interoperability-lost-response-2026-10-10.json',JSON.stringify({classification:'Actual local HTTP proxy drops response only after Tawsel commit; isolated PostgreSQL and original-ID recovery',request:f.command,committed,recovered,events:(await new OutboxReads(db.pool).replay(f.auth,'task',f.old.taskId,0,100)).events},null,2)+'\n');}
 finally{proxy.closeAllConnections();await new Promise<void>((ok,fail)=>proxy.close(e=>e?fail(e):ok()));}
});

async function returned(receive=true){
 const f=await outcomeFixture(),branch=await branchB(f),outcomes=new Outcomes(db.pool);
 const refusal=f.make(0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000),rejection:{catalogVersion:'1.0.0',code:'missing-pieces'}});refusal.payloadVersion='2.0.0';
 expect((await outcomes.command(f.principal,refusal)).receipt.businessStatus).toBe('accepted');
 const returns=new Returns(db.pool),group=(await returns.groups(f.principal)).groups[0]!,item=group.items[0]!;
 const offer=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:group.sourceBranchId,items:[{taskId:item.taskId,dispatchCycleId:item.dispatchCycleId,outcomeId:item.outcomeId,sourceLineId:item.sourceLineId,quantity:3}]});delete offer.payload.driverId;
 const request=((await returns.request(f.principal,offer)).response!.body as S['ReturnCommandResult']).request;
 const auth=`Bearer ${f.source.token}`,service=new B2bIntakeService(db.pool),old=await service.get(auth,'shipment-0');
 const receipt=f.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,quantity:2,expectedRevision:0}]});
 if(receive)expect((await new ReturnReceiver(db.pool).command(auth,'return.confirmSubsetReceipt',receipt)).receipt.businessStatus).toBe('accepted');
 const command=f.source.command('dispatch.createFromReceipt',{externalId:old.externalId,previousDispatchCycleId:old.dispatchCycleId,snapshot:{...old.snapshot,sourceBranchExternalId:'branch-b',sourceDispatchCycleId:'B-return',sourceRevision:2,expectedSourceRevision:1,lines:[{...old.snapshot.lines[0]!,quantity:2}],shippingDue:money(0),totalDue:money(20000)},transfer:transfer()});command.payloadVersion='2.0.0';
 return {...f,branch,outcomes,returns,request,receipt,offer,refusal,auth,service,old,command};
}
test.each(['offered','lost','damaged','over-received','changed-line','shipping-again'])('A-to-B returned dispatch rejects %s without allocating goods',async kind=>{
 const f=await returned(!['offered','lost','damaged'].includes(kind));
 if(kind==='lost'||kind==='damaged')expect((await new ReturnReceiver(db.pool).command(f.auth,'return.recordDisposition',f.source.command('return.recordDisposition',{...f.receipt.payload,disposition:kind}))).receipt.businessStatus).toBe('accepted');
 const s=f.command.payload.snapshot as S['B2bSourceSnapshot'];
 if(kind==='over-received'){s.lines[0]!.quantity=3;s.totalDue=money(30000);}if(kind==='changed-line')s.lines[0]!.sourceLineId='invented';if(kind==='shipping-again'){s.shippingDue=money(5000);s.totalDue=money(25000);}
 expect((await f.service.command(f.auth,'dispatch.createFromReceipt',f.command)).receipt.businessStatus).toBe('rejected');expect((await db.pool.query('SELECT * FROM tawsel.redispatch_allocations')).rowCount).toBe(0);
});

test('independent returned A-to-B dispatch connections cannot allocate the same receipt twice',async()=>{
 const f=await returned(),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});close.push(()=>one.end(),()=>two.end());const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();
 const first=new B2bIntakeService(one,{async afterWrite(s){if(s==='domain'){entered.resolve();await release.promise;}}}).command(f.auth,'dispatch.createFromReceipt',f.command);await entered.promise;
 const rival=structuredClone(f.command);rival.actionId=randomUUID();(rival.payload.snapshot as S['B2bSourceSnapshot']).sourceDispatchCycleId='B-return-rival';const second=new B2bIntakeService(two).command(f.auth,'dispatch.createFromReceipt',rival);
 try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}const accepted=await first,rejected=await second;expect(accepted.receipt.businessStatus).toBe('accepted');expect(rejected.receipt.businessStatus).toBe('rejected');expect((await db.pool.query('SELECT sum(quantity)::int n FROM tawsel.redispatch_allocations')).rows[0].n).toBe(2);expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='dispatch.createdFromReceipt'")).rowCount).toBe(1);
 await writeFile('docs/verification/interoperability-return-race-2026-10-10.json',JSON.stringify({classification:'Actual isolated PostgreSQL with independent competing connections, observed lock blocking and one committed winner; no native ERP atomic custody claim',requests:{first:f.command,rival},results:{accepted,rejected},allocatedQuantity:2},null,2)+'\n');
});
test('actual returned A goods dispatch at B, historical human scopes stay at A and B return uses B',async()=>{
 const f=await returned(),http=await f.app.inject({method:'POST',url:'/api/v1/intake/commands/dispatch.createFromReceipt',headers:{authorization:f.auth},payload:f.command});expect(http.statusCode).toBe(200);const result=http.json() as S['ActionResult'];expect(result.receipt.businessStatus,JSON.stringify(result)).toBe('accepted');
 expect(await f.service.command(f.auth,'dispatch.createFromReceipt',f.command)).toEqual(result);
 const fresh=await f.service.get(f.auth,'shipment-0');expect(fresh.snapshot.sourceBranchExternalId).toBe('branch-b');
 const role=await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'monitor-role',sourceRevision:1,name:'Staff',capabilities:['monitor.read']}));expect(role.statusCode).toBe(200);
 const staff=await send(f.app,f.source.token,f.source.command('user.provision',{externalId:'policy-staff',sourceRevision:1,subject:'policy-staff',roleExternalId:'monitor-role',branchExternalIds:['branch'],enabled:true}));expect(staff.statusCode).toBe(200);
 await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1',[f.tenantId]);
 const principal={kind:'account' as const,issuer:'https://issuer.fixture.invalid',subject:'policy-staff'},monitor=new Monitoring(db.pool);
 const a=await monitor.read(principal,{kind:'task',id:f.old.taskId});expect(JSON.stringify(a.body)).toContain(f.refusal.actionId);expect(JSON.stringify(a.body)).not.toContain(f.command.actionId);
 await send(f.app,f.source.token,f.source.command('user.setBranchMemberships',{externalId:'policy-staff',sourceRevision:2,branchExternalIds:['branch-b']}));
 const b=await monitor.read(principal,{kind:'task',id:f.old.taskId});expect(JSON.stringify(b.body)).not.toContain(f.refusal.actionId);expect(JSON.stringify(b.body)).not.toContain(f.offer.actionId);
 await send(f.app,f.source.token,f.source.command('user.setBranchMemberships',{externalId:'policy-staff',sourceRevision:3,branchExternalIds:['branch','branch-b']}));
 const both=await monitor.read(principal,{kind:'task',id:f.old.taskId});expect(JSON.stringify(both.body)).toContain(f.refusal.actionId);expect((both.body as S['MonitoringHistory']).items.filter(i=>i.kind==='cycle')).toHaveLength(2);
 await send(f.app,f.source.token,f.source.command('user.setBranchMemberships',{externalId:'policy-driver',sourceRevision:2,branchExternalIds:['branch','branch-b']}));
 await f.post('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId:'shipment-0',sourceDispatchCycleId:'B-return',expectedSourceRevision:2,expectedAssignmentRevision:0,assignmentRevision:1}]});
 const current=await new CurrentActivity(db.pool).read(f.principal,f.round.roundId),target=current.targets.find(t=>t.taskId===f.old.taskId)!;
 const refusal=f.planCommand('outcome.recordRefusal',{roundId:f.round.roundId,taskId:target.taskId,attemptId:target.attemptId,expectedActivityRevision:current.revision,expectedCurrentAttemptId:null,expectedSourceRevision:target.sourceRevision,expectedAssignmentRevision:target.assignmentRevision,expectedPinRevision:target.pinRevision,shippingPayment:'collected',reportedCollection:money(0),rejection:{catalogVersion:'1.0.0',code:'other',detail:'لم يعد يحتاج المنتج'}});delete refusal.payload.driverId;refusal.payloadVersion='2.0.0';
 expect((await f.outcomes.command(f.principal,refusal)).receipt.businessStatus).toBe('accepted');
 const groups=await f.returns.groups(f.principal);expect(groups.groups.find(g=>g.items.some(i=>i.dispatchCycleId===fresh.dispatchCycleId))?.sourceBranchId).toBe(f.branch);
 const allocated=structuredClone(f.command);allocated.actionId=randomUUID();allocated.payload.snapshot={...(f.command.payload.snapshot as S['B2bSourceSnapshot']),sourceRevision:3,expectedSourceRevision:2,sourceDispatchCycleId:'B-already-allocated',lines:[{...fresh.snapshot.lines[0]!,quantity:1}],totalDue:money(10000)};allocated.payload.transfer=transfer();
 expect((await f.service.command(f.auth,'dispatch.createFromReceipt',allocated)).receipt.problem?.code).toBe('quantity_exceeded');expect((await db.pool.query('SELECT sum(quantity)::int n FROM tawsel.redispatch_allocations')).rows[0].n).toBe(2);
 const replay=await new OutboxReads(db.pool).replay(f.auth,'task',f.old.taskId,0,100),reconciliation=await new ReconciliationReads(db.pool).snapshot(f.auth,'task',f.old.taskId);
 for(const event of replay.events)expect(publicValidator()('events/sender-event.schema.json',event)).toBe(true);
 const senderWitness=await signedBranchProof(f,'dispatch.createdFromReceipt');
 await writeFile('docs/verification/interoperability-examples-2026-10-10.json',JSON.stringify({classification:'Actual disposable PostgreSQL/domain commands; authenticated-principal fixtures, public source HTTP injection/provisioning, actual signed HTTP reference receiver, schema-validated events; no native Shahn or physical custody claim',tenantId:f.tenantId,integrationId:f.source.integrationId,requests:{refusal:f.refusal,offer:f.offer,receipt:f.receipt,redispatch:f.command,bRefusal:refusal},result,history:await f.service.cycles(f.auth,'shipment-0'),replay,reconciliation,senderWitness},null,2)+'\n');
});
