// Portable consumer: only public client/types, HTTP and a private command journal.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { intakeClient, type IntakeCommand, type IntakeTask } from '../../packages/api-client/src/intake.js';
import type { components } from '../../packages/api-client/src/schema.js';
type S=components['schemas'];
const configPath=process.env.TAWSEL_INTAKE_CONFIG;
if(!configPath)throw new Error('Set TAWSEL_INTAKE_CONFIG to a private public-consumer JSON config; a dedicated empty test driver is required.');
const config=JSON.parse(await readFile(configPath,'utf8')) as {apiUrl:string;token:string;tenantId:string;integrationId:string;branchExternalId:string;driverExternalId:string;dedicatedTestDriver:boolean};
assert.equal(config.dedicatedTestDriver,true,'Use a dedicated conformance driver, never operational assignments.');
const client=intakeClient(config.apiUrl,config.token);
const existing=await client.list({driverExternalId:config.driverExternalId,state:'held'});
assert.equal(existing.status,200);assert.ok('items' in existing.body);assert.equal(existing.body.items.length,0,'Conformance requires an empty driver; retain old journal and resolve prior run first.');
const journalPath=`${configPath}.${randomUUID()}.commands.json`;
const journal:{command:IntakeCommand;status:string;result?:unknown}[]=[];
async function persist(){await writeFile(journalPath,JSON.stringify(journal,null,2),'utf8');}
function command(operationId:IntakeCommand['operationId'],payload:object):IntakeCommand {
  return {schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId,context:{kind:'integration',tenantId:config.tenantId,integrationId:config.integrationId},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload} as IntakeCommand;
}
async function send(c:IntakeCommand,expected=200){
  const entry:{command:IntakeCommand;status:string;result?:unknown}={command:c,status:'pending'};journal.push(entry);await persist();
  const result=await client.command(c);entry.result=result;entry.status='receipt' in result.body?result.body.receipt.businessStatus:'rejected-contract';await persist();
  assert.equal(result.status,expected,JSON.stringify(result.body));return result;
}
const money=(amountMinor:number)=>({amountMinor,currency:'EGP' as const,exponent:2 as const});
async function create():Promise<IntakeTask>{
  const payload:S['B2bSourceSnapshot']={externalId:`conformance-${randomUUID()}`,sourceDispatchCycleId:'dispatch-1',sourceRevision:1,expectedSourceRevision:0,
    sourceBranchExternalId:config.branchExternalId,recipientName:'عميل اختبار ERP',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.0444,longitude:31.2357}},
    splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'source-line-1',description:'قطعة',quantity:3,unitDue:money(10000)}],shippingDue:money(5000),totalDue:money(35000),priority:'ordinary'};
  const result=await send(command('intake.submitSnapshot',payload));assert.ok('response' in result.body);
  return (result.body.response!.body.tasks as IntakeTask[])[0]!;
}
const item=(t:IntakeTask):S['B2bAssignmentReference']=>({externalId:t.externalId,sourceDispatchCycleId:t.sourceDispatchCycleId,expectedSourceRevision:t.sourceRevision,expectedAssignmentRevision:t.assignmentRevision,assignmentRevision:t.assignmentRevision+1});
function tasksFrom(body:S['ActionResult']|S['Problem']){assert.ok('response' in body);return body.response!.body.tasks as IntakeTask[];}
const two=[await create(),await create()];assert.notEqual(two[0]!.taskId,two[1]!.taskId);
const prepare=command('intake.prepare',{driverExternalId:config.driverExternalId,items:two.map(item)});
const prepared=tasksFrom((await send(prepare)).body);assert.ok(prepared.every(t=>t.state==='prepared'&&!t.planningEligible&&t.receivedAt===null));
const receive=command('assignment.receiveBatch',{driverExternalId:config.driverExternalId,receiptAsserted:true,items:prepared.map(item)});
const received=await send(receive);assert.deepEqual(await client.command(receive),received);
const held=tasksFrom(received.body);assert.ok(held.every(t=>t.state==='held'&&t.planningEligible&&t.planningStatus==='pending'));
const recovered=await client.result(receive.actionId);assert.ok('result' in recovered.body);assert.deepEqual(recovered.body.result,received.body);
assert.equal((await client.result(randomUUID())).status,202);
const stale=await send(command('assignment.withdraw',item(two[0]!)),409);assert.ok('receipt' in stale.body);assert.equal(stale.body.receipt.problem?.code,'stale_revision');
const snapshot=held[0]!.snapshot;
await send(command('intake.submitSnapshot',{...snapshot,sourceRevision:2,expectedSourceRevision:1,recipientName:'تصحيح قبل الانطلاق'}));
const revised=await client.get(snapshot.externalId);assert.ok('taskId' in revised.body);assert.equal(revised.body.sourceRevision,2);
await send(command('assignment.withdraw',item(revised.body)));
await send(command('assignment.withdraw',item(held[1]!)));
const capacity:IntakeTask[]=[];for(let i=0;i<49;i++)capacity.push(await create());
const accepted=tasksFrom((await send(command('assignment.receiveBatch',{driverExternalId:config.driverExternalId,receiptAsserted:true,items:capacity.map(item)}))).body);
const overflow=[await create(),await create()];
const overflowCommand=command('assignment.receiveBatch',{driverExternalId:config.driverExternalId,receiptAsserted:true,items:overflow.map(item)});
const rejected=await send(overflowCommand,409);assert.ok('receipt' in rejected.body);assert.equal(rejected.body.receipt.problem?.code,'capacity_exceeded');
for(const task of overflow){const current=await client.get(task.externalId);assert.ok('state' in current.body);assert.equal(current.body.state,'unassigned');assert.equal(current.body.driverId,null);}
const rejectedStatus=await client.result(overflowCommand.actionId);assert.ok('status' in rejectedStatus.body);assert.equal(rejectedStatus.body.status,'rejected');
await send(command('intake.submitSnapshot',{...snapshot,externalId:`invalid-${randomUUID()}`,depositMinor:1000}),422);
// Cleanup only conformance-created held assignments through the same public API.
for(const task of accepted)await send(command('assignment.withdraw',item(task)));
console.log('PASS: public HTTP snapshot → prepared → received/pending-plan, same-address independence, immutable retry/result recovery, source revision/withdrawal, 49+2 atomic rejection, ambiguous deposit rejection. All conformance-held work withdrawn; history retained.');
console.log(`Command journal: ${journalPath}`);
