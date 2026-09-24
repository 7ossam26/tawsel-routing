import type {Pool,PoolClient} from 'pg';
import type {components} from '@tawsel/api-client';
import {emptyProjection,projectEvent,type ProjectionState} from '@tawsel/api-client/projection';
import type {Event} from '@tawsel/api-client/validation';
import {transaction,lockReceiver} from './database.js';
import {conforms,ReceiverError} from './inbox.js';
import type {ReceiverConfig} from './config.js';
export type ProjectionFaults={afterProjectionWrite?:(event:Event)=>Promise<void>;beforeProjectionCommit?:(event:Event)=>Promise<void>;afterProjectionCommit?:()=>Promise<void>};
type Row={event_id:string;envelope:Event;sequence:string;aggregate_type:string;aggregate_id:string;cursor_sequence:string;snapshot_sequence:string;state:ProjectionState|null};
async function dependencies(tx:PoolClient,e:Event){
 if(e.eventType!=='return.requested')return true;
 const request=e.payload.request as components['schemas']['ReturnRequestView'];
 for(const item of request.items){
  const found=await tx.query(`SELECT 1 FROM mock_erp.streams s WHERE s.aggregate_type='task' AND s.aggregate_id=$1
   AND (s.state->'outcomes' @> $2::jsonb OR EXISTS(SELECT 1 FROM mock_erp.transitions t
   WHERE t.payload#>>'{outcome,outcomeId}'=$3 OR t.payload#>>'{correction,outcome,outcomeId}'=$3))`,[item.taskId,JSON.stringify([{outcomeId:item.outcomeId}]),item.outcomeId]);
  if(!found.rowCount)return false;
 }
 return true;
}
/** Scope row serializes small reference-consumer transactions. No network work
 * occurs while locked; restart needs no in-memory claim or lost lease. */
export async function applyInboxOnce(pool:Pool,faults:ProjectionFaults={}):Promise<boolean>{
 const result=await transaction(pool,async tx=>{
  await lockReceiver(tx);
  const rows=(await tx.query<Row>(`SELECT i.*,s.cursor_sequence,s.snapshot_sequence,s.state FROM mock_erp.inbox i JOIN mock_erp.streams s USING(aggregate_type,aggregate_id)
   WHERE i.applied_at IS NULL AND (i.sequence<=s.snapshot_sequence OR i.sequence=s.cursor_sequence+1)
   ORDER BY i.attempts,i.received_at,i.event_id LIMIT 100`)).rows;
  for(const r of rows){
   // Old transitions covered by a current-state snapshot still enter real history.
   const covered=Number(r.sequence)<=Number(r.snapshot_sequence);
   if(!covered&&!await dependencies(tx,r.envelope)){
    await tx.query("UPDATE mock_erp.inbox SET error_code='dependency_missing',attempts=attempts+1 WHERE event_id=$1",[r.event_id]);await tx.query('UPDATE mock_erp.scope SET revision=revision+1');continue;
   }
   await tx.query('SAVEPOINT projection');
   try{
    if(!covered){
     const state=projectEvent(r.state??emptyProjection(),r.envelope);
     if(!conforms('consumer.schema.json#/$defs/State',state))throw new Error('Invalid projected state');
     await tx.query('UPDATE mock_erp.streams SET state=$3,cursor_sequence=$4,last_error=null,updated_at=clock_timestamp() WHERE aggregate_type=$1 AND aggregate_id=$2',[r.aggregate_type,r.aggregate_id,state,r.sequence]);
    }
    await faults.afterProjectionWrite?.(r.envelope);
    await tx.query('INSERT INTO mock_erp.transitions(event_id,event_type,payload) VALUES($1,$2,$3)',[r.event_id,r.envelope.eventType,r.envelope.payload]);
    await tx.query('UPDATE mock_erp.inbox SET applied_at=clock_timestamp(),error_code=null,attempts=attempts+1 WHERE event_id=$1',[r.event_id]);
    await tx.query('UPDATE mock_erp.scope SET revision=revision+1');
    await faults.beforeProjectionCommit?.(r.envelope);
    return true;
   }catch(e){
    await tx.query('ROLLBACK TO SAVEPOINT projection');
    const code=e instanceof Error&&e.message==='projection_limit'?'projection_limit':'projection_failed';
    await tx.query('UPDATE mock_erp.inbox SET error_code=$2,attempts=attempts+1 WHERE event_id=$1',[r.event_id,code]);
    await tx.query('UPDATE mock_erp.scope SET revision=revision+1');return false;
   }
  }
  return false;
 });
 if(result)await faults.afterProjectionCommit?.();return result;
}
export async function consumerStatus(pool:Pool,c:ReceiverConfig,aggregate:components['schemas']['ConsumerAggregate']):Promise<components['schemas']['ConsumerStatus']>{
 return transaction(pool,async tx=>{
  await lockReceiver(tx);
  const s=(await tx.query('SELECT * FROM mock_erp.streams WHERE aggregate_type=$1 AND aggregate_id=$2',[aggregate.type,aggregate.id])).rows[0];
  if(!s)throw new ReceiverError(404,'stream_unavailable');
  const rows=(await tx.query<{sequence:string;applied_at:Date|null;received_at:Date;error_code:string|null}>('SELECT sequence,applied_at,received_at,error_code FROM mock_erp.inbox WHERE aggregate_type=$1 AND aggregate_id=$2 ORDER BY sequence',[aggregate.type,aggregate.id])).rows;
  let received=0,applied=0;for(const r of rows){const n=Number(r.sequence);if(n===received+1)received=n;if(n===applied+1&&r.applied_at)applied=n;}
  const high=Number(rows.at(-1)?.sequence??0),pending=rows.filter(r=>!r.applied_at),cursor=Number(s.cursor_sequence),snapshot=Number(s.snapshot_sequence);
  const error=pending.find(r=>r.error_code)?.error_code??(high>Math.max(cursor,snapshot)&&!pending.some(r=>Number(r.sequence)===cursor+1)?'sequence_gap':applied<snapshot?'history_unavailable':null);
  const latest=(values:(Date|null)[])=>values.filter((d):d is Date=>!!d).sort((a,b)=>b.getTime()-a.getTime())[0]?.toISOString()??null;
  const revision=Number((await tx.query('SELECT revision FROM mock_erp.scope')).rows[0].revision);
  return {checkpoint:{schemaVersion:'1.0.0',tenantId:c.tenantId,recipientIntegrationId:c.integrationId,aggregate,revision,receivedThrough:received,receivedHigh:high,appliedThrough:applied,projectedThrough:cursor,snapshotThrough:snapshot,historyComplete:applied>=snapshot,receivedAt:latest(rows.map(r=>r.received_at)),appliedAt:latest(rows.map(r=>r.applied_at)),pendingCount:pending.length,lastError:error as components['schemas']['ConsumerCheckpoint']['lastError']},state:s.state as ProjectionState|null};
 });
}
