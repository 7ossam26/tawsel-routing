import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import type {components} from '@tawsel/api-client';
import {OutboxClient} from '@tawsel/api-client/outbox';
import {canonicalJson,publicValidator} from '@tawsel/api-client/validation';
import {signWebhook,type WebhookKey} from '@tawsel/api-client/webhook-signature';
export interface ReceiverConformanceConfig {
 apiUrl:string;callbackUrl:string;statusUrl:string;authorization:string;statusAuthorization:string;
 tenantId:string;integrationId:string;signingKey:WebhookKey;
 aggregates:components['schemas']['ConsumerAggregate'][];
 expected:{deliveredPieces:number;reportedMinor:number;receivedPieces:number};
}
const conforms=publicValidator();
export function validateReceiverObservation(status:components['schemas']['ConsumerStatus'],head:number){
 if(!conforms('consumer.schema.json#/$defs/Status',status))throw new Error('Invalid projection checkpoint schema');
 const p=status.checkpoint;
 if(p.appliedThrough!==head||p.receivedThrough!==head||p.receivedHigh!==head||p.projectedThrough!==head||!p.historyComplete||p.pendingCount!==0||p.lastError!==null)throw new Error('Incomplete received/applied checkpoint');
}
/** Public-only network conformance. No internal imports, DB URL or setup token.
 * A receiver projection worker must be running independently. */
export async function checkReceiver(c:ReceiverConformanceConfig){
 const api=new OutboxClient({baseUrl:c.apiUrl,authorization:c.authorization});
 let unique=0,delivered=0,reported=0,received=0,negativeChecks=0;
 for(const aggregate of c.aggregates){
  let after=0;const events:components['schemas']['SenderEvent'][]=[];
  for(let page=0;page<100;page++){const r=await api.replay(aggregate.type,aggregate.id,after,100);if(!conforms('outbox.schema.json#/$defs/Replay',r))throw new Error('Invalid replay payload');events.push(...r.events);if(r.nextAfterSequence===null)break;after=r.nextAfterSequence;if(page===99)throw new Error('Conformance stream exceeds 10000 events');}
  if(!events.length)throw new Error('Conformance needs retained events');
  for(const [i,e] of events.entries()){
   if(e.aggregate.recipientSequence!==i+1||e.tenantId!==c.tenantId||e.recipientIntegrationId!==c.integrationId)throw new Error('Invalid recipient stream');
   const body=Buffer.from(canonicalJson(e));const headers={'content-type':'application/json',...signWebhook(body,c,c.signingKey,String(Date.now()))};
   for(let n=0;n<2;n++){const r=await fetch(c.callbackUrl,{method:'POST',headers,body,signal:AbortSignal.timeout(5000),redirect:'error'});const ack=await r.json();if(r.status!==200||!conforms('outbox.schema.json#/$defs/Acknowledgement',ack)||(ack as {eventId:string}).eventId!==e.eventId)throw new Error('Invalid durable duplicate acknowledgement');}
   unique++;
  }
  const first=events[0]!,bytes=Buffer.from(canonicalJson(first));
  const altered=Buffer.from(canonicalJson({...first,committedAt:new Date(Date.parse(first.committedAt)+1).toISOString()}));
  const mismatch=await fetch(c.callbackUrl,{method:'POST',headers:{'content-type':'application/json',...signWebhook(altered,c,c.signingKey,String(Date.now()))},body:altered});if(mismatch.status!==409)throw new Error('Changed event identity was accepted');negativeChecks++;
  const forged=await fetch(c.callbackUrl,{method:'POST',headers:{'content-type':'application/json',...signWebhook(bytes,c,c.signingKey,String(Date.now()-300001))},body:bytes});if(forged.status!==401)throw new Error('Expired signature was accepted');negativeChecks++;
  let status:components['schemas']['ConsumerStatus']|undefined;
  const deadline=Date.now()+20000;
  do{
   const r=await fetch(`${c.statusUrl}?${new URLSearchParams({aggregateType:aggregate.type,aggregateId:aggregate.id})}`,{headers:{authorization:c.statusAuthorization},signal:AbortSignal.timeout(5000)});
   if(!r.ok)throw new Error('Consumer status unavailable');status=await r.json() as components['schemas']['ConsumerStatus'];
   if(status.checkpoint.appliedThrough===events.length)break;
   await new Promise(r=>setTimeout(r,100));
  }while(Date.now()<deadline);
  validateReceiverObservation(status!,events.length);
  if(status!.checkpoint.tenantId!==c.tenantId||status!.checkpoint.recipientIntegrationId!==c.integrationId)throw new Error('Receiver status leaked scope');
  const snapshot=await api.snapshot(aggregate.type,aggregate.id);if(!conforms('consumer.schema.json#/$defs/Snapshot',snapshot)||canonicalJson(snapshot.state)!==canonicalJson(status!.state))throw new Error('Authoritative current projection differs');
  for(const o of status!.state!.outcomes){delivered+=o.lines.reduce((n,l)=>n+l.delivered,0);reported+=o.collection.reported?.amountMinor??0;}
  received+=status!.state!.returnItems.reduce((n,i)=>n+i.received,0);
 }
 if(delivered!==c.expected.deliveredPieces||reported!==c.expected.reportedMinor||received!==c.expected.receivedPieces)throw new Error('Projected business quantity/collection mismatch');
 return {uniqueEvents:unique,negativeChecks,deliveredPieces:delivered,reportedMinor:reported,receivedPieces:received,transport:'real-http',projection:'separate-durable-receiver'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path=process.argv[2]??process.env.ERP_CONFORMANCE_CONFIG;if(!path)throw new Error('Provide a scoped receiver conformance JSON configuration');console.log(JSON.stringify(await checkReceiver(JSON.parse(readFileSync(path,'utf8')) as ReceiverConformanceConfig),null,2));}
