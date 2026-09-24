import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
import {intakeClient} from '../../packages/api-client/src/intake.js';
import {returnReceiverClient} from '../../packages/api-client/src/returns.js';
type S=components['schemas'];
export function assertDispatch(old:S['B2bTask'],fresh:S['B2bTask'],cycles:S['B2bCycleList'],received:S['ReturnRequestView']){
 assert.equal(fresh.taskId,old.taskId);assert.equal(fresh.externalId,old.externalId);assert.notEqual(fresh.dispatchCycleId,old.dispatchCycleId);assert.notEqual(fresh.sourceDispatchCycleId,old.sourceDispatchCycleId);assert.equal(fresh.previousDispatchCycleId,old.dispatchCycleId);assert.equal(fresh.state,'unassigned');assert.equal(fresh.driverId,null);assert.equal(fresh.assignmentRevision,0);assert.ok(fresh.sourceRevision>old.sourceRevision);
 const retained=cycles.items.find(c=>c.dispatchCycleId===old.dispatchCycleId)!;assert.ok(retained);assert.deepEqual(retained.snapshot,old.snapshot);assert.equal(retained.driverId,old.driverId);assert.equal(retained.latest,false);assert.equal(cycles.items.filter(c=>c.latest).length,1);
 for(const line of fresh.snapshot.lines){const q=received.items.find(i=>i.dispatchCycleId===old.dispatchCycleId&&i.sourceLineId===line.sourceLineId)!;assert.ok(q);assert.ok(line.quantity<=q.received);assert.equal(q.custody.sourceQuantity,q.custody.delivered+q.custody.held+q.custody.received+q.custody.lost+q.custody.damaged);}
}
export async function liveDispatch(){
 const base=process.env.TAWSEL_ERP_API_URL,token=process.env.TAWSEL_ERP_SERVICE_TOKEN,requestId=process.env.TAWSEL_RETURN_REQUEST_ID,reportPath=process.env.TAWSEL_DISPATCH_REPORT;
 if(!base||!token||!requestId||!reportPath)throw new Error('Provide API URL, scoped service token, dedicated untouched three-piece return request ID and report path.');
 const returns=returnReceiverClient(base,token),intake=intakeClient(base,token),read=await returns.read(requestId);assert.equal(read.status,200);const offer=read.body as S['ReturnRequestView'],item=offer.items[0]!;assert.equal(item.received,0);assert.equal(item.requested,3);
 const config=await fetch(new URL('/api/v1/provisioning/configuration',base),{headers:{authorization:`Bearer ${token}`},redirect:'error'});assert.equal(config.status,200);const identity=(await config.json() as S['SourceConfiguration']).identity;
 const envelope={schemaVersion:'1.0.0' as const,payloadVersion:'1.0.0' as const,context:{kind:'integration' as const,tenantId:identity.tenantId,integrationId:identity.integrationId},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown' as const}}};
 const oldRead=await intake.get(item.externalId);assert.equal(oldRead.status,200);const old=oldRead.body as S['B2bTask'];
 const receive:S['ReturnReceiveCommand']={...envelope,actionId:randomUUID(),operationId:'return.confirmSubsetReceipt',payload:{requestId,receivingBranchId:offer.sourceBranchId,items:[{itemId:item.itemId,expectedRevision:item.revision,quantity:2}]}};
 const snapshot:S['B2bSourceSnapshot']={...old.snapshot,sourceDispatchCycleId:'public-cycle-'+randomUUID(),sourceRevision:old.sourceRevision+1,expectedSourceRevision:old.sourceRevision,lines:[{...old.snapshot.lines[0]!,quantity:2}],shippingDue:{amountMinor:0,currency:'EGP',exponent:2},totalDue:{amountMinor:2*old.snapshot.lines[0]!.unitDue.amountMinor,currency:'EGP',exponent:2}};
 const dispatch:S['B2bRedispatchCommand']={...envelope,actionId:randomUUID(),operationId:'dispatch.createFromReceipt',payload:{externalId:item.externalId,previousDispatchCycleId:old.dispatchCycleId,snapshot}};
 const early=structuredClone(dispatch);early.actionId=randomUUID();assert.equal((await intake.command(early)).status,409);
 const receipt=await returns.command(receive);assert.equal(receipt.status,200);const received=((receipt.body as S['ReturnActionResult']).response!.body as S['ReturnCommandResult']).request;assert.equal(received.items[0]!.unresolved,1);
 const result=await intake.command(dispatch);assert.equal(result.status,200);const accepted=result.body as S['ActionResult'];assert.equal(accepted.receipt.businessStatus,'accepted');assert.deepEqual(await intake.command(dispatch),result);assert.deepEqual(((await intake.result(dispatch.actionId)).body as S['B2bBatchResult']).result,accepted);
 const fresh=(await intake.get(item.externalId)).body as S['B2bTask'],cycles=(await intake.cycles(item.externalId)).body as S['B2bCycleList'];assertDispatch(old,fresh,cycles,received);
 const stale=structuredClone(dispatch);stale.actionId=randomUUID();assert.equal((await intake.command(stale)).status,409);
 const report={evidence:'Copied public-only consumer over actual HTTP. No database/operator/issuer input; no native ERP or transactional ERP outbox.',old,fresh,cycles,offered:offer,received,receiveCommand:receive,dispatchCommand:dispatch,result:accepted};await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--live')){await liveDispatch();console.log('PASS: actual subset receipt → new cycle, immutable old history, duplicate recovery and early/stale denial over public HTTP.');}
 else if(process.argv[2]){const r=JSON.parse(await readFile(process.argv[2],'utf8'));assertDispatch(r.old,r.fresh,r.cycles,r.received);const bad=structuredClone(r.fresh);bad.dispatchCycleId=r.old.dispatchCycleId;assert.throws(()=>assertDispatch(r.old,bad,r.cycles,r.received));console.log('PASS: captured public-cycle conservation and negative identity mutation.');}
 else throw new Error('Run branches:demo, then test:erp:dispatch -- .local/phase-22-demo.json; or provide live environment.');
}
