import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
import {returnReceiverClient} from '../../packages/api-client/src/returns.js';
type S=components['schemas'];
/** Portable public-only assertions. No database, server module or operator input. */
export function assertReturn(r:S['ReturnRequestView']){
 assert.ok(r.requestId);assert.ok(r.sourceBranchId);assert.ok(r.integrationId);assert.ok(r.items.length);
 assert.equal(new Set(r.items.map(i=>i.itemId)).size,r.items.length);
 for(const i of r.items){
  for(const n of [i.requested,i.received,i.unresolved,i.lost,i.damaged,...Object.values(i.custody)])assert.ok(Number.isInteger(n)&&n>=0);
  assert.equal(i.requested,i.received+i.unresolved+i.lost+i.damaged);
  const q=i.custody;assert.equal(q.sourceQuantity,q.delivered+q.held+q.received+q.lost+q.damaged);
  assert.ok(i.received<=q.received);assert.ok(i.lost<=q.lost);assert.ok(i.damaged<=q.damaged);
 }
}
export async function liveReturns(){
 const base=process.env.TAWSEL_ERP_API_URL,token=process.env.TAWSEL_ERP_SERVICE_TOKEN,requestId=process.env.TAWSEL_RETURN_REQUEST_ID,reportPath=process.env.TAWSEL_RETURN_REPORT;
 if(!base||!token||!requestId||!reportPath)throw new Error('Provide TAWSEL_ERP_API_URL, TAWSEL_ERP_SERVICE_TOKEN, TAWSEL_RETURN_REQUEST_ID and TAWSEL_RETURN_REPORT for a dedicated untouched three-piece request.');
 const client=returnReceiverClient(base,token),before=await client.read(requestId);assert.equal(before.status,200);const offered=before.body as S['ReturnRequestView'];assertReturn(offered);const item=offered.items[0]!;assert.equal(item.requested,3);assert.equal(item.received,0);assert.equal(item.lost+item.damaged,0);
 const listing=await client.pending(offered.driverId,offered.sourceBranchId);assert.equal(listing.status,200);assert.ok((listing.body as S['ReturnRequestList']).items.some(r=>r.requestId===offered.requestId));
 const command=(operationId:'return.confirmSubsetReceipt'|'return.recordDisposition',revision:number,quantity:number,disposition?:'lost')=>({schemaVersion:'1.0.0' as const,payloadVersion:'1.0.0',operationId,actionId:randomUUID(),context:{kind:'integration' as const,tenantId:'',integrationId:offered.integrationId},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown' as const}},payload:{requestId,receivingBranchId:offered.sourceBranchId,items:[{itemId:item.itemId,expectedRevision:revision,quantity}],...(disposition?{disposition}:{})}});
 // Tenant identity comes from the published integration configuration, not the DB.
 const config=await fetch(new URL('/api/v1/provisioning/configuration',base),{headers:{authorization:`Bearer ${token}`},redirect:'error'});assert.equal(config.status,200);const identity=(await config.json() as S['SourceConfiguration']).identity;
 const receive=command('return.confirmSubsetReceipt',item.revision,2) as S['ReturnReceiveCommand'];receive.context.tenantId=identity.tenantId;
 const wrong=structuredClone(receive);wrong.actionId=randomUUID();wrong.payload.receivingBranchId=randomUUID();assert.equal((await client.command(wrong)).status,409);
 const excess=structuredClone(receive);excess.actionId=randomUUID();excess.payload.items[0]!.quantity=4;assert.equal((await client.command(excess)).status,409);
 const accepted=await client.command(receive);assert.equal(accepted.status,200);const result=accepted.body as S['ReturnActionResult'];assert.equal(result.receipt.businessStatus,'accepted');const received=(result.response!.body as S['ReturnCommandResult']).request;assertReturn(received);assert.equal(received.items[0]!.received,2);assert.equal(received.items[0]!.unresolved,1);assert.equal(received.items[0]!.custody.held,1);
 const duplicate=await client.command(receive);assert.deepEqual(duplicate,accepted);const status=await client.result(receive.actionId);assert.deepEqual((status.body as S['ReturnActionStatus']).result,result);
 const stale=structuredClone(receive);stale.actionId=randomUUID();assert.equal((await client.command(stale)).status,409);
 const loss=command('return.recordDisposition',received.items[0]!.revision,1,'lost') as S['ReturnDisposeCommand'];loss.context.tenantId=identity.tenantId;const disposed=await client.command(loss);assert.equal(disposed.status,200);const final=((disposed.body as S['ReturnActionResult']).response!.body as S['ReturnCommandResult']).request;assertReturn(final);assert.equal(final.items[0]!.received,2);assert.equal(final.items[0]!.lost,1);assert.equal(final.items[0]!.custody.held,0);
 const report={evidence:'Independent public-only HTTP consumer; no DB/operator/issuer credentials. No native ERP UI or transactional ERP outbox.',commands:{receive,loss},offered,received,final,accepted:result,duplicate:duplicate.body,status:status.body,disposed:disposed.body};await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--live')){await liveReturns();console.log('PASS: public native receiver pending → two received → duplicate recovered → one lost, with wrong-source/excess/stale rejection.');}
 else if(process.argv[2]){const report=JSON.parse(await readFile(process.argv[2],'utf8'));for(const r of [report.offered,report.received,report.final])assertReturn(r);assert.equal(report.received.items[0].received,2);assert.equal(report.received.items[0].unresolved,1);assert.equal(report.final.items[0].lost,1);assert.equal(report.final.items[0].received,2);console.log('PASS: captured actual subset/disposition conservation.');}
 else{const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:S['ReturnRequestView']}[];const rows=examples.filter(e=>['p21-offered','p21-received','p21-disposed'].includes(e.id));assert.equal(rows.length,3,'Run returns:demo and capture canonical examples.');for(const r of rows)assertReturn(r.data);const broken=structuredClone(rows[1]!.data);broken.items[0]!.received++;assert.throws(()=>assertReturn(broken));console.log('PASS: canonical return conservation and negative mutation; schema fixtures are not live ERP proof.');}
}
