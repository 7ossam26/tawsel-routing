import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {emptyProjection,projectEvent,type ProjectionState} from '@tawsel/api-client/projection';
import {publicValidator,eventIdentity} from '@tawsel/api-client/validation';
import {withTransaction,type Transaction} from '../db/transaction.js';
import {authenticateService,unavailable,type ServiceBinding} from '../provisioning/credentials.js';
import {ProvisioningError} from '../provisioning/schema.js';
import {envelope,type Intent} from './envelope.js';
const conforms=publicValidator();
export async function recordCheckpoint(tx:Transaction,b:ServiceBinding,p:components['schemas']['ConsumerCheckpoint']){
 const key=[b.tenantId,b.integrationId,p.aggregate.type,p.aggregate.id];
 const stream=(await tx.query('SELECT last_sequence FROM tawsel.outbox_streams WHERE tenant_id=$1 AND recipient_id=$2 AND aggregate_type=$3 AND aggregate_id=$4',key)).rows[0];
 if(!stream||p.tenantId!==b.tenantId||p.recipientIntegrationId!==b.integrationId)throw unavailable();
 if(p.appliedThrough>p.receivedThrough||p.receivedThrough>p.receivedHigh||p.receivedHigh>Number(stream.last_sequence)||p.snapshotThrough>p.projectedThrough||p.projectedThrough>Number(stream.last_sequence)||p.appliedThrough>p.projectedThrough||p.historyComplete!==(p.appliedThrough>=p.snapshotThrough))throw new ProvisioningError('validation_failed',400,'Inconsistent receiver checkpoint');
 const old=(await tx.query('SELECT * FROM tawsel.outbox_consumer_checkpoints WHERE tenant_id=$1 AND recipient_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 FOR UPDATE',key)).rows[0];
 if(old&&(p.revision<Number(old.revision)||p.appliedThrough<old.checkpoint.appliedThrough||p.projectedThrough<old.checkpoint.projectedThrough||p.receivedThrough<old.checkpoint.receivedThrough))throw new ProvisioningError('stale_revision',409,'Receiver checkpoint regressed');
 if(old&&p.revision===Number(old.revision)){
  if(JSON.stringify(old.checkpoint)!==JSON.stringify(JSON.parse(JSON.stringify(p)))){
   const equal=(await tx.query('SELECT $1::jsonb=$2::jsonb AS same',[old.checkpoint,p])).rows[0].same;if(!equal)throw new ProvisioningError('stale_revision',409,'Checkpoint revision reused');
  }
  return {checkpoint:old.checkpoint,reportedAt:(old.reported_at as Date).toISOString(),evidence:'receiver-reported' as const};
 }
 const row=(await tx.query(`INSERT INTO tawsel.outbox_consumer_checkpoints(tenant_id,recipient_id,aggregate_type,aggregate_id,revision,checkpoint) VALUES($1,$2,$3,$4,$5,$6)
  ON CONFLICT(tenant_id,recipient_id,aggregate_type,aggregate_id) DO UPDATE SET revision=$5,checkpoint=$6,reported_at=clock_timestamp() RETURNING reported_at`,[...key,p.revision,p])).rows[0];
 return {checkpoint:p,reportedAt:(row.reported_at as Date).toISOString(),evidence:'receiver-reported' as const};
}
export class ReconciliationReads{
 constructor(readonly pool:Pool){}
 report(auth:string|undefined,kind:string,id:string):Promise<components['schemas']['ConsumerReportRead']>{return withTransaction(this.pool,async tx=>{
  const b=await authenticateService(tx,auth,false,'integration.manage'),key=[b.tenantId,b.integrationId,kind,id];
  if(!(await tx.query('SELECT 1 FROM tawsel.outbox_streams WHERE tenant_id=$1 AND recipient_id=$2 AND aggregate_type=$3 AND aggregate_id=$4',key)).rowCount)throw unavailable();
  const row=(await tx.query('SELECT * FROM tawsel.outbox_consumer_checkpoints WHERE tenant_id=$1 AND recipient_id=$2 AND aggregate_type=$3 AND aggregate_id=$4',key)).rows[0];
  return {report:row?{checkpoint:row.checkpoint,reportedAt:(row.reported_at as Date).toISOString(),evidence:'receiver-reported'}:null};
 },'REPEATABLE READ');}
 snapshot(auth:string|undefined,kind:string,id:string):Promise<components['schemas']['ConsumerSnapshot']>{return withTransaction(this.pool,async tx=>{
  const b=await authenticateService(tx,auth,false,'integration.manage'),key=[b.tenantId,b.integrationId,kind,id];
  // Same source lock as operational reports serializes cache creation without
  // locking producer stream rows or holding a database lock during HTTP.
  await tx.query('SELECT integration_id FROM tawsel.integrations WHERE tenant_id=$1 AND integration_id=$2 FOR UPDATE',[b.tenantId,b.integrationId]);
  const stream=(await tx.query('SELECT last_sequence FROM tawsel.outbox_streams WHERE tenant_id=$1 AND recipient_id=$2 AND aggregate_type=$3 AND aggregate_id=$4',key)).rows[0];if(!stream)throw unavailable();
  const cached=(await tx.query('SELECT * FROM tawsel.outbox_projection_snapshots WHERE tenant_id=$1 AND recipient_id=$2 AND aggregate_type=$3 AND aggregate_id=$4',key)).rows[0];
  let sequence=Number(cached?.through_sequence??0),state=(cached?.state??emptyProjection()) as ProjectionState;
  const head=Number(stream.last_sequence);
  const rows=(await tx.query<Intent&{body:Buffer|null}>(`SELECT o.*,d.body FROM tawsel.outbox_intents o LEFT JOIN tawsel.outbox_deliveries d USING(tenant_id,event_id)
   WHERE o.tenant_id=$1 AND o.recipient_id=$2 AND o.aggregate_type=$3 AND o.aggregate_id=$4 AND o.recipient_sequence>$5 AND o.recipient_sequence<=$6 ORDER BY o.recipient_sequence LIMIT 10001`,[...key,sequence,head])).rows;
  if(rows.length>10000)throw new ProvisioningError('dependency_unavailable',503,'Checkpoint catch-up exceeds 10000 retained transitions');
  for(const r of rows){
   if(Number(r.recipient_sequence)!==sequence+1)throw new ProvisioningError('dependency_unavailable',503,'No authoritative checkpoint covers missing history');
   const event=r.body?JSON.parse(r.body.toString('utf8')):envelope(r);
   if(!conforms('events/sender-event.v1.schema.json',event)||!eventIdentity(event,{tenantId:b.tenantId,integrationId:b.integrationId}))throw new ProvisioningError('dependency_unavailable',503,'Unsupported retained event');
   state=projectEvent(state,event);sequence++;
  }
  if(sequence!==head||!conforms('consumer.schema.json#/$defs/State',state))throw new ProvisioningError('dependency_unavailable',503,'Current checkpoint unavailable');
  const saved=(await tx.query(`INSERT INTO tawsel.outbox_projection_snapshots(tenant_id,recipient_id,aggregate_type,aggregate_id,through_sequence,state) VALUES($1,$2,$3,$4,$5,$6)
   ON CONFLICT(tenant_id,recipient_id,aggregate_type,aggregate_id) DO UPDATE SET through_sequence=$5,state=$6,captured_at=clock_timestamp() RETURNING captured_at`,[...key,sequence,state])).rows[0];
  return {schemaVersion:'1.0.0',tenantId:b.tenantId,recipientIntegrationId:b.integrationId,aggregate:{type:kind as components['schemas']['ConsumerAggregate']['type'],id},throughSequence:sequence,capturedAt:(saved.captured_at as Date).toISOString(),state,history:'current-state-only',retention:'indefinite-no-purge'};
 },'REPEATABLE READ');}
}
