import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {verifyWebhook,type SignatureHeaders} from '@tawsel/api-client/webhook-signature';
import {publicValidator,eventIdentity,canonicalJson,type Event} from '@tawsel/api-client/validation';
import {transaction,lockReceiver} from './database.js';
import type {ReceiverConfig} from './config.js';
export const conforms=publicValidator();
export class ReceiverError extends Error {constructor(readonly statusCode:number,readonly code:string){super(code);}}
export type ReceiptFaults={beforeInboxCommit?:()=>Promise<void>;afterInboxCommit?:()=>Promise<void>};
const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
export function validateEvent(e:unknown,c:ReceiverConfig):asserts e is Event {
 if(!conforms('events/sender-event.v1.schema.json',e))throw new ReceiverError(422,'unsupported_event');
 if(!eventIdentity(e as Event,c))throw new ReceiverError(403,'event_identity_mismatch');
}
export async function storeEvent(pool:Pool,c:ReceiverConfig,e:Event,wire:Buffer|null,faults:ReceiptFaults={}){
 validateEvent(e,c);const semantic=hash(canonicalJson(e));
 const result=await transaction(pool,async tx=>{
  await lockReceiver(tx);
  const old=(await tx.query('SELECT * FROM mock_erp.inbox WHERE event_id=$1',[e.eventId])).rows[0];
  const collision=(await tx.query('SELECT event_id FROM mock_erp.inbox WHERE aggregate_type=$1 AND aggregate_id=$2 AND sequence=$3',[e.aggregate.type,e.aggregate.id,e.aggregate.recipientSequence])).rows[0];
  const reason=old&&(old.semantic_hash!==semantic||(wire&&old.wire_body&&!wire.equals(old.wire_body as Buffer)))?'payload_mismatch':collision&&collision.event_id!==e.eventId?'sequence_collision':null;
  if(reason){await tx.query('INSERT INTO mock_erp.mismatches(event_id,incoming_hash,reason) VALUES($1,$2,$3)',[e.eventId,wire?hash(wire):semantic,reason]);return {reason};}
  if(old){if(wire&&!old.wire_body)await tx.query('UPDATE mock_erp.inbox SET wire_body=$2 WHERE event_id=$1',[e.eventId,wire]);return {duplicate:true};}
  await tx.query('INSERT INTO mock_erp.streams(aggregate_type,aggregate_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[e.aggregate.type,e.aggregate.id]);
  await tx.query('INSERT INTO mock_erp.inbox(event_id,aggregate_type,aggregate_id,sequence,envelope,semantic_hash,wire_body) VALUES($1,$2,$3,$4,$5,$6,$7)',[e.eventId,e.aggregate.type,e.aggregate.id,e.aggregate.recipientSequence,e,semantic,wire]);
  await tx.query('UPDATE mock_erp.scope SET revision=revision+1');
  await faults.beforeInboxCommit?.();return {duplicate:false};
 });
 if(result.reason)throw new ReceiverError(409,result.reason);
 await faults.afterInboxCommit?.();
 return {schemaVersion:'1.0.0' as const,tenantId:c.tenantId,recipientIntegrationId:c.integrationId,eventId:e.eventId,acknowledgement:'received' as const};
}
export async function receive(pool:Pool,c:ReceiverConfig,body:Buffer,headers:SignatureHeaders,faults:ReceiptFaults={}){
 if(!verifyWebhook(body,headers,c,c.keys))throw new ReceiverError(401,'invalid_signature');
 let e:unknown;try{e=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));}catch{throw new ReceiverError(400,'invalid_json');}
 validateEvent(e,c);return storeEvent(pool,c,e,body,faults);
}
