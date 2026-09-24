import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {OutboxClient} from '@tawsel/api-client/outbox';
import type {ReceiverConfig} from './config.js';
import {transaction,lockReceiver} from './database.js';
import {storeEvent,conforms,ReceiverError} from './inbox.js';
import {applyInboxOnce,consumerStatus} from './projection.js';
type Aggregate=components['schemas']['ConsumerAggregate'];
function client(c:ReceiverConfig){if(!c.tawselBaseUrl||!c.tawselAuthorization)throw new Error('Scoped Tawsel API URL/credential required for recovery');return new OutboxClient({baseUrl:c.tawselBaseUrl,authorization:c.tawselAuthorization});}
function scoped(value:unknown,c:ReceiverConfig):boolean{return !value||typeof value!=='object'||Object.entries(value).every(([k,v])=>k==='tenantId'?v===c.tenantId:k==='integrationId'||k==='recipientIntegrationId'?v===c.integrationId:scoped(v,c));}
export async function adoptSnapshot(pool:Pool,c:ReceiverConfig,aggregate:Aggregate,s:components['schemas']['ConsumerSnapshot']){
 if(!conforms('consumer.schema.json#/$defs/Snapshot',s)||!scoped(s,c)||s.aggregate.type!==aggregate.type||s.aggregate.id!==aggregate.id||s.tenantId!==c.tenantId||s.recipientIntegrationId!==c.integrationId
  ||s.state.task&&s.state.task.taskId!==aggregate.id||s.state.outcomes.some(o=>o.taskId!==aggregate.id)||s.state.returnRequest&&s.state.returnRequest.requestId!==aggregate.id||s.state.notices.some(n=>n.event.aggregate.type!==aggregate.type||n.event.aggregate.id!==aggregate.id||n.event.aggregate.recipientSequence>s.throughSequence))throw new ReceiverError(422,'invalid_snapshot');
 return transaction(pool,async tx=>{
  await lockReceiver(tx);
  await tx.query('INSERT INTO mock_erp.streams(aggregate_type,aggregate_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[aggregate.type,aggregate.id]);
  const row=(await tx.query('SELECT * FROM mock_erp.streams WHERE aggregate_type=$1 AND aggregate_id=$2',[aggregate.type,aggregate.id])).rows[0];
  if(Number(row.cursor_sequence)>=s.throughSequence)return false;
  await tx.query('UPDATE mock_erp.streams SET state=$3,cursor_sequence=$4,snapshot_sequence=$4,updated_at=clock_timestamp() WHERE aggregate_type=$1 AND aggregate_id=$2',[aggregate.type,aggregate.id,s.state,s.throughSequence]);
  await tx.query('INSERT INTO mock_erp.reconciliations(aggregate_type,aggregate_id,through_sequence,snapshot) VALUES($1,$2,$3,$4)',[aggregate.type,aggregate.id,s.throughSequence,s]);
  await tx.query('UPDATE mock_erp.scope SET revision=revision+1');return true;
 });
}
export async function reconcileStream(pool:Pool,c:ReceiverConfig,aggregate:Aggregate){
 const api=client(c);
 await transaction(pool,async tx=>{await lockReceiver(tx);await tx.query('INSERT INTO mock_erp.streams(aggregate_type,aggregate_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[aggregate.type,aggregate.id]);});
 let after=(await consumerStatus(pool,c,aggregate)).checkpoint.receivedThrough;
 try{
  for(let page=0;page<10;page++){
   const replay=await api.replay(aggregate.type,aggregate.id,after,100);
   if(!conforms('outbox.schema.json#/$defs/Replay',replay))throw new ReceiverError(422,'invalid_replay');
   for(const event of replay.events){if(event.aggregate.type!==aggregate.type||event.aggregate.id!==aggregate.id||event.aggregate.recipientSequence!==after+1)throw new ReceiverError(422,'invalid_replay');await storeEvent(pool,c,event,null);after++;}
   if(replay.nextAfterSequence===null)break;
   if(replay.nextAfterSequence!==after||!replay.events.length)throw new ReceiverError(422,'invalid_replay');
  }
 }catch(e){
  if(!(e instanceof Error)||!('status' in e)||e.status!==410||!('code' in e)||e.code!=='replay_expired')throw e;
  await adoptSnapshot(pool,c,aggregate,await api.snapshot(aggregate.type,aggregate.id));
 }
 for(let n=0;n<1000&&await applyInboxOnce(pool);n++){/* bounded atomic applications */}
 return consumerStatus(pool,c,aggregate);
}
export async function reportCheckpoint(pool:Pool,c:ReceiverConfig,aggregate:Aggregate){
 const api=client(c),status=await consumerStatus(pool,c,aggregate);
 const command=await transaction(pool,async tx=>{
  await lockReceiver(tx);
  const old=(await tx.query('SELECT * FROM mock_erp.checkpoint_reports WHERE aggregate_type=$1 AND aggregate_id=$2',[aggregate.type,aggregate.id])).rows[0];
  if(old&&!old.reported)return old.command as components['schemas']['ConsumerReportCommand'];
  if(old&&Number(old.revision)>=status.checkpoint.revision)return null;
  const value:components['schemas']['ConsumerReportCommand']={schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId:'integration.reportAppliedCheckpoint',context:{kind:'integration',tenantId:c.tenantId,integrationId:c.integrationId},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload:status.checkpoint};
  await tx.query(`INSERT INTO mock_erp.checkpoint_reports(aggregate_type,aggregate_id,revision,command) VALUES($1,$2,$3,$4)
   ON CONFLICT(aggregate_type,aggregate_id) DO UPDATE SET revision=$3,command=$4,reported=false`,[aggregate.type,aggregate.id,status.checkpoint.revision,value]);return value;
 });
 if(!command)return;
 const result=await api.command(command);
 if(result.receipt.businessStatus!=='accepted')throw new Error('Checkpoint not accepted');
 await pool.query('UPDATE mock_erp.checkpoint_reports SET reported=true WHERE aggregate_type=$1 AND aggregate_id=$2 AND command->>\'actionId\'=$3',[aggregate.type,aggregate.id,command.actionId]);
}
export async function runReceiverWorkerOnce(pool:Pool,c:ReceiverConfig){
 for(let n=0;n<100&&await applyInboxOnce(pool);n++){/* local projection without HTTP locks */}
 if(!c.tawselBaseUrl||!c.tawselAuthorization)return;
 // A request stream can arrive before the referenced task stream exists locally.
 const deps=(await pool.query(`SELECT DISTINCT item->>'taskId' id FROM mock_erp.inbox i,
  LATERAL jsonb_array_elements(i.envelope#>'{payload,request,items}') item
  WHERE i.error_code='dependency_missing' LIMIT 50`)).rows;
 for(const d of deps)await reconcileStream(pool,c,{type:'task',id:d.id as string});
 const streams=(await pool.query('SELECT aggregate_type,aggregate_id FROM mock_erp.streams ORDER BY updated_at,aggregate_type,aggregate_id LIMIT 100')).rows;
 for(const row of streams){
  const aggregate={type:row.aggregate_type,id:row.aggregate_id} as Aggregate;
  try{
   const status=await consumerStatus(pool,c,aggregate);
   if(status.checkpoint.receivedThrough<status.checkpoint.receivedHigh||!status.checkpoint.historyComplete)await reconcileStream(pool,c,aggregate);
   await reportCheckpoint(pool,c,aggregate);
  }catch{console.error('Mock ERP scoped recovery/report unavailable; durable state retained');}
  await pool.query('UPDATE mock_erp.streams SET updated_at=clock_timestamp() WHERE aggregate_type=$1 AND aggregate_id=$2',[aggregate.type,aggregate.id]);
 }
}
