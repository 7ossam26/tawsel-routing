import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {withTransaction,type Transaction} from '../db/transaction.js';
import {authenticateService,unavailable,type ServiceBinding} from '../provisioning/credentials.js';
import {ProvisioningError} from '../provisioning/schema.js';
import {envelope,type Intent} from './envelope.js';
import {senderEventConforms} from './validation.js';

const base=`SELECT o.*,d.status,d.attempts,d.next_attempt_at,d.lease_until,d.received_at,d.last_error,d.body,
 (SELECT p.event_id FROM tawsel.outbox_intents p JOIN tawsel.outbox_deliveries pd USING(tenant_id,event_id)
 WHERE p.recipient_kind='integration' AND p.tenant_id=o.tenant_id AND p.recipient_id=o.recipient_id AND p.aggregate_type=o.aggregate_type AND p.aggregate_id=o.aggregate_id
 AND p.recipient_sequence<o.recipient_sequence AND pd.status<>'received' ORDER BY p.recipient_sequence LIMIT 1) blocked_by
 FROM tawsel.outbox_intents o JOIN tawsel.outbox_deliveries d USING(tenant_id,event_id)`;
type Row=Intent&{status:components['schemas']['OutboxDelivery']['status'];attempts:number;next_attempt_at:Date;lease_until:Date|null;received_at:Date|null;last_error:string|null;blocked_by:string|null;body:Buffer|null};
function delivery(r:Row):components['schemas']['OutboxDelivery']{return {eventId:r.event_id,eventType:r.event_type,aggregate:{type:r.aggregate_type,id:r.aggregate_id,recipientSequence:Number(r.recipient_sequence)},createdAt:r.created_at.toISOString(),status:r.status,attempts:r.attempts,nextAttemptAt:r.next_attempt_at.toISOString(),leaseUntil:r.lease_until?.toISOString()??null,receivedAt:r.received_at?.toISOString()??null,lastError:r.last_error,projectionStatus:'unknown',blockedBy:r.blocked_by};}
export class OutboxReads{
 constructor(readonly pool:Pool){}
 private access<T>(auth:string|undefined,work:(tx:Transaction,b:ServiceBinding)=>Promise<T>){return withTransaction(this.pool,async tx=>work(tx,await authenticateService(tx,auth,false,'integration.manage')),'REPEATABLE READ');}
 queue(auth:string|undefined,limit:number,cursor?:string):Promise<components['schemas']['OutboxQueue']>{return this.access(auth,async(tx,b)=>{
  const rows=(await tx.query<Row>(`${base} WHERE o.tenant_id=$1 AND o.recipient_id=$2 AND ($3::uuid IS NULL OR o.event_id>$3) ORDER BY o.event_id LIMIT $4`,[b.tenantId,b.integrationId,cursor??null,limit+1])).rows;
  const counts=(await tx.query(`SELECT count(*) FILTER(WHERE status='pending')::int pending,count(*) FILTER(WHERE status='sending')::int sending,
   count(*) FILTER(WHERE status='failed')::int failed,count(*) FILTER(WHERE status='received')::int received,
   min(o.created_at) FILTER(WHERE status<>'received') oldest
   FROM tawsel.outbox_deliveries d JOIN tawsel.outbox_intents o USING(tenant_id,event_id) WHERE d.tenant_id=$1 AND d.recipient_id=$2`,[b.tenantId,b.integrationId])).rows[0];
  return {items:rows.slice(0,limit).map(delivery),nextCursor:rows.length>limit?rows[limit-1]!.event_id:null,counts:{pending:Number(counts.pending),sending:Number(counts.sending),failed:Number(counts.failed),received:Number(counts.received)},oldestUnreceivedAt:(counts.oldest as Date|null)?.toISOString()??null,projectionStatus:'unknown'};
 });}
 detail(auth:string|undefined,eventId:string,limit:number,before?:number):Promise<components['schemas']['OutboxDetail']>{return this.access(auth,async(tx,b)=>{
  const row=(await tx.query<Row>(`${base} WHERE o.tenant_id=$1 AND o.recipient_id=$2 AND o.event_id=$3`,[b.tenantId,b.integrationId,eventId])).rows[0];if(!row)throw unavailable();
  const attempts=(await tx.query(`SELECT * FROM tawsel.outbox_delivery_attempts WHERE tenant_id=$1 AND event_id=$2 AND ($3::integer IS NULL OR attempt_number<$3)
   ORDER BY attempt_number DESC LIMIT $4`,[b.tenantId,eventId,before??null,limit+1])).rows;
  return {delivery:delivery(row),attempts:attempts.slice(0,limit).map(a=>({attemptId:a.attempt_id as string,number:Number(a.attempt_number),startedAt:(a.started_at as Date).toISOString(),finishedAt:(a.finished_at as Date|null)?.toISOString()??null,keyId:a.key_id as string|null,deliveryTimestamp:String(a.delivery_timestamp),result:a.result as components['schemas']['OutboxAttempt']['result'],errorCode:a.error_code as string|null,httpStatus:a.http_status as number|null})),nextAttemptBefore:attempts.length>limit?Number(attempts[limit-1]!.attempt_number):null};
 });}
 replay(auth:string|undefined,kind:string,id:string,after:number,limit:number):Promise<components['schemas']['OutboxReplay']>{return this.access(auth,async(tx,b)=>{
  const stream=(await tx.query('SELECT last_sequence FROM tawsel.outbox_streams WHERE tenant_id=$1 AND recipient_id=$2 AND aggregate_type=$3 AND aggregate_id=$4',[b.tenantId,b.integrationId,kind,id])).rows[0];
  const head=Number(stream?.last_sequence??0);
  const rows=(await tx.query<Row>(`${base} WHERE o.tenant_id=$1 AND o.recipient_id=$2 AND o.aggregate_type=$3 AND o.aggregate_id=$4 AND o.recipient_sequence>$5 ORDER BY o.recipient_sequence LIMIT $6`,[b.tenantId,b.integrationId,kind,id,after,limit+1])).rows;
  if(after<head&&(!rows.length||rows.some((r,i)=>Number(r.recipient_sequence)!==after+i+1)||(rows.length<=limit&&Number(rows.at(-1)!.recipient_sequence)<head)))throw new ProvisioningError('replay_expired',410,'Retained history is incomplete; use scoped reconciliation and retain historical limitations');
  const events=rows.slice(0,limit).map(r=>r.body?JSON.parse(r.body.toString('utf8')):envelope(r));
  if(!events.every(senderEventConforms))throw new ProvisioningError('dependency_unavailable',503,'Retained event requires a supported reader');
  return {events,nextAfterSequence:rows.length>limit?Number(rows[limit-1]!.recipient_sequence):null,retention:'indefinite-no-purge',projectionStatus:'unknown'};
 });}
}
