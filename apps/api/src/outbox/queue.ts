import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {withTransaction} from '../db/transaction.js';
import {eventBytes,type Intent} from './envelope.js';

export interface Claim {
 tenantId:string;integrationId:string;eventId:string;attemptId:string;attempt:number;
 body:Buffer;url:string;keyId:string|null;encryptedSecret:string|null;timestamp:string;
}
export async function claimDelivery(pool:Pool,leaseMs=30_000):Promise<Claim|undefined>{
 if(!Number.isInteger(leaseMs)||leaseMs<100||leaseMs>60_000)throw new Error('Invalid outbox lease');
 return withTransaction(pool,async tx=>{
  // At most one in-flight event per integration. Least recently served first;
  // endpoint row locks and SKIP LOCKED allow independent workers to make progress.
  const endpoint=(await tx.query(`SELECT e.* FROM tawsel.outbox_endpoints e
   JOIN tawsel.integrations i USING(tenant_id,integration_id) JOIN tawsel.tenants t USING(tenant_id)
   WHERE e.enabled AND i.enabled AND t.enabled
   AND NOT EXISTS(SELECT 1 FROM tawsel.outbox_deliveries d WHERE d.tenant_id=e.tenant_id AND d.recipient_id=e.integration_id AND d.status='sending' AND d.lease_until>clock_timestamp())
   AND EXISTS(SELECT 1 FROM tawsel.outbox_deliveries d WHERE d.tenant_id=e.tenant_id AND d.recipient_id=e.integration_id AND d.status<>'received' AND d.next_attempt_at<=clock_timestamp())
   ORDER BY e.last_claimed_at,e.tenant_id,e.integration_id FOR UPDATE OF e SKIP LOCKED LIMIT 1`)).rows[0];
  if(!endpoint)return;
  // A concurrent claim can commit while the discovery statement is evaluating
  // its old snapshot. Recheck with a fresh statement under the endpoint lock.
  if((await tx.query(`SELECT 1 FROM tawsel.outbox_deliveries WHERE tenant_id=$1 AND recipient_id=$2
   AND status='sending' AND lease_until>clock_timestamp() LIMIT 1`,[endpoint.tenant_id,endpoint.integration_id])).rowCount)return;
  await tx.query('UPDATE tawsel.outbox_endpoints SET last_claimed_at=clock_timestamp() WHERE tenant_id=$1 AND integration_id=$2',[endpoint.tenant_id,endpoint.integration_id]);
  const row=(await tx.query<Intent & {body:Buffer|null;attempts:number;lease_id:string|null;timestamp:string}>(`SELECT o.*,d.body,d.attempts,d.lease_id,
   GREATEST(floor(extract(epoch FROM clock_timestamp())*1000)::bigint,COALESCE(d.last_timestamp+1,0))::text timestamp
   FROM tawsel.outbox_deliveries d JOIN tawsel.outbox_intents o USING(tenant_id,event_id)
   WHERE d.tenant_id=$1 AND d.recipient_id=$2 AND d.status<>'received' AND d.next_attempt_at<=clock_timestamp()
   AND (d.status<>'sending' OR d.lease_until<=clock_timestamp())
   AND NOT EXISTS(SELECT 1 FROM tawsel.outbox_intents prior JOIN tawsel.outbox_deliveries pd USING(tenant_id,event_id)
    WHERE prior.recipient_kind='integration' AND prior.tenant_id=o.tenant_id AND prior.recipient_id=o.recipient_id AND prior.aggregate_type=o.aggregate_type
    AND prior.aggregate_id=o.aggregate_id AND prior.recipient_sequence<o.recipient_sequence AND pd.status<>'received')
   ORDER BY d.next_attempt_at,o.created_at,o.recipient_sequence FOR UPDATE OF d SKIP LOCKED LIMIT 1`,[endpoint.tenant_id,endpoint.integration_id])).rows[0];
  if(!row)return;
  const attemptId=randomUUID(),body=row.body??eventBytes(row);
  if(row.lease_id)await tx.query("UPDATE tawsel.outbox_delivery_attempts SET result='lease-expired',finished_at=clock_timestamp(),error_code='lease_expired' WHERE tenant_id=$1 AND attempt_id=$2 AND result='sending'",[row.tenant_id,row.lease_id]);
  const key=(await tx.query('SELECT key_id,encrypted_secret FROM tawsel.outbox_signing_keys WHERE tenant_id=$1 AND integration_id=$2 AND retired_at IS NULL',[row.tenant_id,row.recipient_id])).rows[0];
  await tx.query(`UPDATE tawsel.outbox_deliveries SET status='sending',body=$3,attempts=attempts+1,lease_id=$4,
   lease_until=clock_timestamp()+$5*interval '1 millisecond',last_timestamp=$6 WHERE tenant_id=$1 AND event_id=$2`,[row.tenant_id,row.event_id,body,attemptId,leaseMs,row.timestamp]);
  await tx.query(`INSERT INTO tawsel.outbox_delivery_attempts(tenant_id,event_id,attempt_id,attempt_number,key_id,delivery_timestamp,result)
   VALUES($1,$2,$3,$4,$5,$6,'sending')`,[row.tenant_id,row.event_id,attemptId,row.attempts+1,key?.key_id??null,row.timestamp]);
  return {tenantId:row.tenant_id,integrationId:row.recipient_id,eventId:row.event_id,attemptId,attempt:row.attempts+1,
   body,url:endpoint.url as string,keyId:key?.key_id as string??null,encryptedSecret:key?.encrypted_secret as string??null,timestamp:row.timestamp};
 });
}
export function retryDelay(attempt:number,random=Math.random):number{
 const cap=Math.min(300_000,1000*2**Math.min(19,Math.max(0,attempt-1)));
 return Math.floor(cap/2+random()*cap/2);
}
export async function completeDelivery(pool:Pool,claim:Claim,result:{received:boolean;error?:string;httpStatus?:number}):Promise<boolean>{
 return withTransaction(pool,async tx=>{
  const row=await tx.query(`UPDATE tawsel.outbox_deliveries SET status=$4,lease_id=null,lease_until=null,
   received_at=CASE WHEN $4='received' THEN COALESCE(received_at,clock_timestamp()) ELSE received_at END,
   last_error=$5,next_attempt_at=clock_timestamp()+$6*interval '1 millisecond'
   WHERE tenant_id=$1 AND event_id=$2 AND lease_id=$3 AND lease_until>clock_timestamp() RETURNING event_id`,
  [claim.tenantId,claim.eventId,claim.attemptId,result.received?'received':'failed',result.error??null,retryDelay(claim.attempt)]);
  if(!row.rowCount)return false;
  await tx.query(`UPDATE tawsel.outbox_delivery_attempts SET result=$3,finished_at=clock_timestamp(),error_code=$4,http_status=$5
   WHERE tenant_id=$1 AND attempt_id=$2`,[claim.tenantId,claim.attemptId,result.received?'received':'failed',result.error??null,result.httpStatus??null]);
  // Receipt is not projection application. Keep source intent pending/retained.
  return true;
 });
}
