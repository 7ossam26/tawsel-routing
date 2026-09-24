import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {verifyWebhook,type WebhookKey,type WebhookScope} from '../../packages/api-client/src/webhook-signature.js';
import type {components} from '../../packages/api-client/src/schema.js';

export interface OutboxCapture {
 acknowledgementLevel:'controlled-process-memory';scope:WebhookScope;fixtureKeys:WebhookKey[];
 deliveries:{bodyBase64:string;headers:Record<string,string>}[];
 queue:components['schemas']['OutboxQueue'];
}
/** Portable consumer of public bytes/status only. No Tawsel database, operator
 * credential or server imports. Verify captured signatures at their send times. */
export function checkOutboxCapture(c:OutboxCapture){
 if(c.acknowledgementLevel!=='controlled-process-memory'||c.queue.projectionStatus!=='unknown'||!c.deliveries.length)throw new Error('Missing truthful sender evidence');
 const seen=new Map<string,string>(),sequences=new Map<string,number>();let duplicateCount=0;
 const types=new Set<string>();
 for(const d of c.deliveries){
  const body=Buffer.from(d.bodyBase64,'base64'),now=Number(d.headers['x-tawsel-delivery-timestamp']);
  if(!Number.isFinite(now)||!verifyWebhook(body,d.headers,c.scope,c.fixtureKeys,now))throw new Error('Invalid exact-byte signature');
  const e=JSON.parse(body.toString('utf8')) as components['schemas']['EventEnvelope'];
  if(e.schemaVersion!=='1.0.0'||e.payloadVersion!=='1.0.0'||e.tenantId!==c.scope.tenantId||e.recipientIntegrationId!==c.scope.integrationId||e.eventKind!=='transition'||!e.eventId||!Number.isSafeInteger(e.aggregate.recipientSequence))throw new Error('Unsupported event or recipient');
  const previous=seen.get(e.eventId);if(previous){if(previous!==d.bodyBase64)throw new Error('Retry changed immutable event bytes');duplicateCount++;continue;}
  const key=`${e.aggregate.type}/${e.aggregate.id}`,last=sequences.get(key)??0;
  if(e.aggregate.recipientSequence!==last+1)throw new Error('Recipient sequence gap');
  sequences.set(key,e.aggregate.recipientSequence);seen.set(e.eventId,d.bodyBase64);types.add(e.eventType);
 }
 if(c.queue.items.some(i=>i.projectionStatus!=='unknown'||i.status!=='received')||c.queue.counts.received!==seen.size)throw new Error('Receipt/application or count mismatch');
 return {uniqueEvents:seen.size,duplicateDeliveries:duplicateCount,eventTypes:[...types].sort(),projectionStatus:'unknown' as const,acknowledgementLevel:c.acknowledgementLevel};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const path=process.argv[2];if(!path)throw new Error('Usage: node --import tsx tests/erp-conformance/outbox.ts <capture.json>');
 console.log(JSON.stringify(checkOutboxCapture(JSON.parse(readFileSync(path,'utf8')) as OutboxCapture),null,2));
}
