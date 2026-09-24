import {beforeEach,afterEach,test,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture} from '../support/access-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {operatorToken,send} from '../support/provisioning-fixture.js';
import {deferred,observeDatabaseBlock} from '../support/barriers.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {Returns} from '../../src/returns/service.js';
import {ReturnReceiver} from '../../src/returns/receiver.js';
import {B2bIntakeService} from '../../src/b2b-intake/service.js';
import {Eligibility} from '../../src/eligibility/service.js';
import {CurrentActivity} from '../../src/current/service.js';
import {WorkdayReads} from '../../src/closure/reads.js';
import {money} from '../../src/outcomes/arithmetic.js';
import {Monitoring} from '../../src/monitoring/service.js';
import {Locations} from '../../src/locations/service.js';
let db:Awaited<ReturnType<typeof createTestDatabase>>;
const closers:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const f of closers.splice(0).reverse())await f();await db?.close();});
async function fixture(receive=true){
 const f=await outcomeCompanyFixture(db);closers.push(()=>f.close());
 const bootstrap=structuredClone(f.source.bootstrapCommand);bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=3;bootstrap.payload.returnCapabilities=['return.receive','return.dispose'];expect((await send(f.app,operatorToken,bootstrap)).statusCode).toBe(200);
 const outcomes=new Outcomes(db.pool);expect((await outcomes.command(f.principal,f.make(0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000)}))).receipt.businessStatus).toBe('accepted');
 const returns=new Returns(db.pool),q=(await returns.groups(f.principal)).groups[0]!.items[0]!;
 const requestCommand=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:(await returns.groups(f.principal)).groups[0]!.sourceBranchId,items:[{taskId:q.taskId,dispatchCycleId:q.dispatchCycleId,outcomeId:q.outcomeId,sourceLineId:q.sourceLineId,quantity:3}]});delete requestCommand.payload.driverId;
 const request=((await returns.request(f.principal,requestCommand)).response!.body as components['schemas']['ReturnCommandResult']).request;
 const authorization=`Bearer ${f.source.token}`,intake=new B2bIntakeService(db.pool),old=await intake.get(authorization,'shipment-0');
 const receipt=f.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,quantity:2,expectedRevision:0}]});
 if(receive)expect((await new ReturnReceiver(db.pool).command(authorization,'return.confirmSubsetReceipt',receipt)).receipt.businessStatus).toBe('accepted');
 const command=f.source.command('dispatch.createFromReceipt',{externalId:old.externalId,previousDispatchCycleId:old.dispatchCycleId,snapshot:{...old.snapshot,sourceDispatchCycleId:'cycle-2',sourceRevision:2,expectedSourceRevision:1,lines:[{...old.snapshot.lines[0]!,quantity:2}],shippingDue:money(0),totalDue:money(20000)}});
 const es=await new Eligibility(db.pool).read(f.principal,f.round.roundId),m=es.items.find(i=>i.taskId===old.taskId)!;
 const retry=f.planCommand('task.retryWhole',{roundId:f.round.roundId,taskId:m.taskId,attemptId:m.attemptId,expectedSourceRevision:m.sourceRevision,expectedAssignmentRevision:m.assignmentRevision,expectedPinRevision:m.pinRevision,expectedActivityRevision:es.activityRevision,expectedCurrentAttemptId:es.currentAttemptId,expectedEligibilityRevision:m.revision});delete retry.payload.driverId;
 return {...f,outcomes,returns,request,receipt,authorization,intake,old,command,retry};
}
test('C: confirmed subset creates fresh cycle, old holder/history/fees survive and old commands cannot revive new goods',async()=>{
 const f=await fixture(),before=await f.outcomes.read(f.principal,f.round.roundId);
 const result=await f.intake.command(f.authorization,'dispatch.createFromReceipt',f.command);expect(result.receipt.businessStatus,JSON.stringify(result)).toBe('accepted');
 const fresh=await f.intake.get(f.authorization,'shipment-0');expect(fresh).toMatchObject({taskId:f.old.taskId,state:'unassigned',sourceRevision:2,assignmentRevision:0,previousDispatchCycleId:f.old.dispatchCycleId,latest:true});expect(fresh.dispatchCycleId).not.toBe(f.old.dispatchCycleId);
 const cycles=await f.intake.cycles(f.authorization,'shipment-0');expect(cycles.items).toHaveLength(2);expect(cycles.items.find(c=>!c.latest)).toMatchObject({driverId:f.driverId,sourceRevision:1,state:'held',snapshot:{lines:[{quantity:3}]},editable:false});
 expect((await f.intake.command(f.authorization,'dispatch.createFromReceipt',f.command)).response).toEqual(result.response);
 expect((await f.intake.command(f.authorization,'dispatch.createFromReceipt',{...f.command,actionId:randomUUID()})).receipt.businessStatus).toBe('rejected');
 expect((await new Eligibility(db.pool).command(f.principal,f.retry)).receipt.businessStatus).toBe('rejected');
 expect((await f.outcomes.command(f.principal,f.make(0,'outcome.recordFull',{reportedCollection:money(35000)},1))).receipt.businessStatus).toBe('rejected');
 expect((await f.outcomes.read(f.principal,f.round.roundId)).history).toEqual(before.history);
 const carry=await new WorkdayReads(db.pool).carryForward(f.principal,f.round.workdayId);expect(carry.items.find(i=>i.dispatchCycleId===f.old.dispatchCycleId)).toMatchObject({heldPieces:1,eligibleNow:false,blocker:'receipt-or-disposition'});
 await f.post('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId:'shipment-0',sourceDispatchCycleId:'cycle-2',expectedSourceRevision:2,expectedAssignmentRevision:0,assignmentRevision:1}]});
 const current=await new CurrentActivity(db.pool).read(f.principal,f.round.roundId),target=current.targets.find(t=>t.taskId===f.old.taskId)!;
 expect(target.attemptId).not.toBe(f.retry.payload.attemptId);
 const c=f.planCommand('outcome.recordFull',{roundId:f.round.roundId,taskId:target.taskId,attemptId:target.attemptId,expectedActivityRevision:current.revision,expectedCurrentAttemptId:null,expectedSourceRevision:target.sourceRevision,expectedAssignmentRevision:target.assignmentRevision,expectedPinRevision:target.pinRevision,reportedCollection:money(20000)});delete c.payload.driverId;
 expect((await f.outcomes.command(f.principal,c)).receipt.businessStatus).toBe('accepted');
 const after=await f.outcomes.read(f.principal,f.round.roundId);expect(after.history).toHaveLength(2);expect(after.progress).toMatchObject({deliveredPieces:2,heldReturnRequiredPieces:1,collection:[{reportedMinor:'25000'}]});
 expect((await db.pool.query('SELECT sum(quantity)::int n FROM tawsel.redispatch_allocations')).rows[0].n).toBe(2);
 expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='dispatch.createdFromReceipt'")).rowCount).toBe(1);
 await expect(db.pool.query('UPDATE tawsel.b2b_dispatch_cycles SET latest=true WHERE dispatch_cycle_id=$1',[f.old.dispatchCycleId])).rejects.toMatchObject({code:'23514'});
});
test('C: offered, loss, wrong source/branch and excess quantities cannot become dispatch stock',async()=>{
 const f=await fixture(false);expect((await f.intake.command(f.authorization,'dispatch.createFromReceipt',f.command)).receipt.businessStatus).toBe('rejected');
 const loss=f.source.command('return.recordDisposition',{...f.receipt.payload,disposition:'lost'});expect((await new ReturnReceiver(db.pool).command(f.authorization,'return.recordDisposition',loss)).receipt.businessStatus).toBe('accepted');
 expect((await f.intake.command(f.authorization,'dispatch.createFromReceipt',{...f.command,actionId:randomUUID()})).receipt.businessStatus).toBe('rejected');
 const wrong=structuredClone(f.command);wrong.actionId=randomUUID();(wrong.payload.snapshot as {sourceBranchExternalId:string}).sourceBranchExternalId='another';expect((await f.intake.command(f.authorization,'dispatch.createFromReceipt',wrong)).receipt.problem?.code).toBe('wrong_source_branch');
 expect((await db.pool.query('SELECT * FROM tawsel.redispatch_allocations')).rowCount).toBe(0);
});
test.each([true,false])('C: real receipt versus redispatch race, receipt first=%s',async(receiptFirst)=>{
 const f=await fixture(false),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();
 const hooks={async afterWrite(at:string){if(at==='domain'){entered.resolve();await release.promise;}}};
 const first=receiptFirst?new ReturnReceiver(one,hooks).command(f.authorization,'return.confirmSubsetReceipt',f.receipt):new B2bIntakeService(one,hooks).command(f.authorization,'dispatch.createFromReceipt',f.command);
 await entered.promise;const second=receiptFirst?new B2bIntakeService(two).command(f.authorization,'dispatch.createFromReceipt',f.command):new ReturnReceiver(two).command(f.authorization,'return.confirmSubsetReceipt',f.receipt);
 try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}const [x,y]=await Promise.all([first,second]);expect(x.receipt.businessStatus).toBe(receiptFirst?'accepted':'rejected');expect(y.receipt.businessStatus).toBe('accepted');
 expect((await db.pool.query('SELECT * FROM tawsel.redispatch_allocations')).rowCount).toBe(receiptFirst?1:0);
 expect((await f.returns.read(f.principal,f.request.requestId)).items[0]!.custody).toMatchObject({sourceQuantity:3,held:1,received:2});
});
test.each([true,false])('C: redispatch versus late old outcome preserves one valid business result, redispatch first=%s',async(dispatchFirst)=>{
 const f=await fixture(),one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();
 const hooks={async afterWrite(at:string){if(at==='domain'){entered.resolve();await release.promise;}}},late=f.make(0,'outcome.recordFull',{reportedCollection:money(35000)},1);
 const first=dispatchFirst?new B2bIntakeService(one,hooks).command(f.authorization,'dispatch.createFromReceipt',f.command):new Outcomes(one,hooks).command(f.principal,late);
 await entered.promise;const second=dispatchFirst?new Outcomes(two).command(f.principal,late):new B2bIntakeService(two).command(f.authorization,'dispatch.createFromReceipt',f.command);
 try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}const [x,y]=await Promise.all([first,second]);expect(x.receipt.businessStatus).toBe(dispatchFirst?'accepted':'rejected');expect(y.receipt.businessStatus).toBe(dispatchFirst?'rejected':'accepted');
 expect((await db.pool.query('SELECT * FROM tawsel.command_evidence WHERE action_id=$1',[late.actionId])).rowCount).toBe(1);
 expect((await db.pool.query('SELECT * FROM tawsel.delivery_outcomes WHERE tenant_id=$1',[f.tenantId])).rowCount).toBe(1);
});
test('C: two competing new cycles allocate stock once; source edits cannot inflate allocated quantities',async()=>{
 const f=await fixture(),other=structuredClone(f.command);other.actionId=randomUUID();(other.payload.snapshot as {sourceDispatchCycleId:string}).sourceDispatchCycleId='competing-cycle';
 const one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();
 const first=new B2bIntakeService(one,{async afterWrite(at){if(at==='domain'){entered.resolve();await release.promise;}}}).command(f.authorization,'dispatch.createFromReceipt',f.command);await entered.promise;
 const second=new B2bIntakeService(two).command(f.authorization,'dispatch.createFromReceipt',other);try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 expect((await first).receipt.businessStatus).toBe('accepted');expect((await second).receipt.businessStatus).toBe('rejected');
 const task=await f.intake.get(f.authorization,'shipment-0');
 const inflated=f.source.command('intake.submitSnapshot',{...task.snapshot,sourceRevision:3,expectedSourceRevision:2,lines:[{...task.snapshot.lines[0]!,quantity:3}],totalDue:money(30000)});
 expect((await f.intake.command(f.authorization,'intake.submitSnapshot',inflated)).receipt.problem?.code).toBe('quantity_exceeded');
 expect((await db.pool.query('SELECT sum(quantity)::int n FROM tawsel.redispatch_allocations')).rows[0].n).toBe(2);
 expect((await f.intake.get(f.authorization,'shipment-0')).sourceRevision).toBe(2);
});
test('C: actual source return permits a different driver through a fresh receipt, never a direct transfer',async()=>{
 const f=await fixture();
 expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode).toBe(200);
 const locations=new Locations(db.pool),oldPin=f.planCommand('location.confirmPin',{taskId:f.old.taskId,expectedSourceRevision:1,expectedLocationRevision:0,confirmed:true,selection:{kind:'manual',coordinates:{latitude:30.1,longitude:31.1}}});delete oldPin.payload.driverId;oldPin.resources={taskId:f.old.taskId};
 expect((await locations.confirm(f.principal,oldPin)).receipt.businessStatus).toBe('accepted');
 const secondUser=await send(f.app,f.source.token,f.source.command('user.provision',{externalId:'policy-second',sourceRevision:1,subject:'policy-second',roleExternalId:'role',branchExternalIds:['branch'],enabled:true}));expect(secondUser.statusCode).toBe(200);
 const driver=await send(f.app,f.source.token,f.source.command('driver.provisionReference',{externalId:'policy-second',sourceRevision:1,userExternalId:'policy-second',enabled:true,profile:'bicycle',vehicleReference:null}));expect(driver.statusCode).toBe(200);
 const transfer=f.source.command('assignment.reassignBeforeDeparture',{externalId:f.old.externalId,sourceDispatchCycleId:f.old.sourceDispatchCycleId,expectedSourceRevision:1,expectedAssignmentRevision:1,assignmentRevision:2,driverExternalId:'policy-second',receiptAsserted:true});expect((await f.intake.command(f.authorization,'assignment.reassignBeforeDeparture',transfer)).receipt.businessStatus).toBe('rejected');
 expect((await f.intake.command(f.authorization,'dispatch.createFromReceipt',f.command)).receipt.businessStatus).toBe('accepted');
 await f.post('assignment.receiveBatch',{driverExternalId:'policy-second',receiptAsserted:true,items:[{externalId:'shipment-0',sourceDispatchCycleId:'cycle-2',expectedSourceRevision:2,expectedAssignmentRevision:0,assignmentRevision:1}]});
 const fresh=await f.intake.get(f.authorization,'shipment-0');expect(fresh.driverId).toBe(driver.json().response.body.resourceId);
 expect((await f.intake.cycles(f.authorization,'shipment-0')).items.find(c=>c.dispatchCycleId===f.old.dispatchCycleId)!.driverId).toBe(f.driverId);
 const groups=await f.returns.groups(f.principal);expect(groups.groups[0]!.items[0]!.custody.held).toBe(1);
 expect((await new WorkdayReads(db.pool).carryForward(f.principal,f.round.workdayId)).items.find(i=>i.dispatchCycleId===f.old.dispatchCycleId)?.heldPieces).toBe(1);
 // P24: another holder's new-cycle pin/action/timing must not change old history.
 const monitoring=new Monitoring(db.pool),before=await monitoring.read(f.principal,{kind:'task',id:f.old.taskId});
 const beforeTrip=await monitoring.read(f.principal,{kind:'trip',id:f.round.roundId});
 expect((beforeTrip.body as components['schemas']['MonitoringSnapshot']).items.find(t=>t.taskId===f.old.taskId)?.coordinates).toEqual({latitude:30.1,longitude:31.1});
 await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1',[f.tenantId]);
 const newer=structuredClone(oldPin);newer.actionId=randomUUID();newer.payload.expectedSourceRevision=2;newer.payload.expectedLocationRevision=1;newer.payload.selection={kind:'manual',coordinates:{latitude:32,longitude:33}};
 if(newer.context.kind!=='device')throw new Error('fixture device');newer.context.accountId=secondUser.json().response.body.resourceId;newer.context.deviceId=randomUUID();
 expect((await locations.confirm({kind:'account',issuer:'https://issuer.fixture.invalid',subject:'policy-second'},newer)).receipt.businessStatus).toBe('accepted');
 const after=await monitoring.read(f.principal,{kind:'task',id:f.old.taskId});expect(after.body.snapshotRevision).toBe(before.body.snapshotRevision);expect(after.etag).toBe(before.etag);expect(JSON.stringify(after.body)).not.toContain(newer.actionId);
 const afterTrip=await monitoring.read(f.principal,{kind:'trip',id:f.round.roundId});expect(afterTrip.etag).toBe(beforeTrip.etag);expect((afterTrip.body as components['schemas']['MonitoringSnapshot']).items.find(t=>t.taskId===f.old.taskId)?.coordinates).toEqual({latitude:30.1,longitude:31.1});
 await expect(monitoring.read(f.principal,{kind:'action',id:newer.actionId,sourceId:newer.context.accountId})).rejects.toMatchObject({statusCode:404});
});
test('C: every redispatch write boundary rolls back allocation, source, cycle, history and event',async()=>{
 const f=await fixture();
 for(const stage of ['domain','progress','audit','outbox','result']){
  await expect(new B2bIntakeService(db.pool,{async afterWrite(at){if(at===stage)throw new Error('injected');}}).command(f.authorization,'dispatch.createFromReceipt',f.command)).rejects.toThrow('injected');
  expect((await f.intake.get(f.authorization,'shipment-0')).dispatchCycleId).toBe(f.old.dispatchCycleId);
  expect((await db.pool.query('SELECT * FROM tawsel.redispatch_allocations')).rowCount).toBe(0);
  expect((await db.pool.query('SELECT * FROM tawsel.command_identities WHERE action_id=$1',[f.command.actionId])).rowCount).toBe(0);
 }
 expect((await f.intake.command(f.authorization,'dispatch.createFromReceipt',f.command)).receipt.businessStatus).toBe('accepted');
});
