import {createHash,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {canonicalJson} from '@tawsel/api-client/validation';
import {provisioningClient,type ProvisioningCommand} from '@tawsel/api-client/provisioning';
import {intakeClient,type IntakeCommand} from '@tawsel/api-client/intake';
import {returnReceiverClient} from '@tawsel/api-client/returns';
import {transaction,lockReceiver} from './database.js';
import {conforms,ReceiverError} from './inbox.js';
import type {ReceiverConfig} from './config.js';
type S=components['schemas'];
export type SourceCommand=ProvisioningCommand|IntakeCommand|S['ReturnReceiveCommand']|S['ReturnDisposeCommand'];
const definitions:Record<string,[string,string]>={
 'branch.provision':['provisioning','Branch'],'branch.disable':['provisioning','DisableBranch'],
 'role.defineCapabilities':['provisioning','Role'],'user.provision':['provisioning','User'],
 'user.setRole':['provisioning','UserRole'],'user.setCapabilityExceptions':['provisioning','UserExceptions'],
 'user.setBranchMemberships':['provisioning','UserBranches'],'user.disable':['provisioning','DisableUser'],
 'driver.provisionReference':['provisioning','Driver'],'intake.submitSnapshot':['b2b-intake','SourceSnapshot'],
 'intake.prepare':['b2b-intake','Prepare'],'assignment.receiveBatch':['b2b-intake','ReceiveBatch'],
 'assignment.withdraw':['b2b-intake','Withdraw'],'assignment.reassignBeforeDeparture':['b2b-intake','Reassign'],
 'intake.setUrgencyBeforeDeparture':['b2b-intake','Urgency'],'dispatch.createFromReceipt':['b2b-intake','Redispatch'],
 'return.confirmSubsetReceipt':['returns','Receive'],'return.recordDisposition':['returns','Dispose']
};
export interface SourceRecord {kind:string;externalId:string;expectedRevision:number;desired:Record<string,unknown>}
export interface SourceSubmission {command:SourceCommand;records:SourceRecord[]}
export interface SourceRow {action_id:string;envelope:SourceCommand;actor_subject:string;status:'pending'|'accepted'|'rejected'|'review-required';attempts:number;lease_id:string|null;result:S['ActionResult']|null;last_error:string|null}
/** The caller is a verified native session or an explicitly configured local
 * connector operator. Never accept a subject/tenant/credential from a form. */
export async function saveSource(pool:Pool,c:ReceiverConfig,actor:string,input:SourceSubmission,faults:{beforeCommit?:()=>Promise<void>}={}){
 const command=input.command,def=definitions[command?.operationId];
 if(!def||!conforms(`${def[0]}.schema.json#/$defs/${def[1]}Command`,command))throw new ReceiverError(400,'invalid_source_command');
 if(command.context.kind!=='integration'||command.context.tenantId!==c.tenantId||command.context.integrationId!==c.integrationId)throw new ReceiverError(403,'source_scope_mismatch');
 if(!actor||!Array.isArray(input.records)||!input.records.length||input.records.length>100||input.records.some(r=>!r||!['branch','role','user','driver','shipment','return'].includes(r.kind)||typeof r.externalId!=='string'||!r.externalId||r.externalId.length>256||!Number.isSafeInteger(r.expectedRevision)||r.expectedRevision<0||!r.desired||typeof r.desired!=='object'||Array.isArray(r.desired)))throw new ReceiverError(400,'invalid_source_records');
 if(new Set(input.records.map(r=>`${r.kind}/${r.externalId}`)).size!==input.records.length)throw new ReceiverError(400,'duplicate_source_record');
 const digest=createHash('sha256').update(canonicalJson(input)).digest('hex');
 return transaction(pool,async tx=>{
  await lockReceiver(tx);
  const old=(await tx.query<SourceRow & {payload_hash:string}>('SELECT * FROM mock_erp.source_commands WHERE action_id=$1',[command.actionId])).rows[0];
  if(old){if(old.payload_hash!==digest||old.actor_subject!==actor)throw new ReceiverError(409,'source_identity_conflict');return old;}
  for(const r of input.records){const current=(await tx.query('SELECT revision FROM mock_erp.source_records WHERE kind=$1 AND external_id=$2',[r.kind,r.externalId])).rows[0];if((current?.revision??0)!==r.expectedRevision)throw new ReceiverError(409,'source_revision_conflict');}
  const row=(await tx.query<SourceRow>('INSERT INTO mock_erp.source_commands(action_id,envelope,payload_hash,actor_subject) VALUES($1,$2,$3,$4) RETURNING *',[command.actionId,command,digest,actor])).rows[0]!;
  for(const r of input.records){
   await tx.query('INSERT INTO mock_erp.source_changes(kind,external_id,revision,desired,command_id) VALUES($1,$2,$3,$4,$5)',[r.kind,r.externalId,r.expectedRevision+1,r.desired,command.actionId]);
   await tx.query('INSERT INTO mock_erp.source_records(kind,external_id,revision,desired,command_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(kind,external_id) DO UPDATE SET revision=excluded.revision,desired=excluded.desired,command_id=excluded.command_id',[r.kind,r.externalId,r.expectedRevision+1,r.desired,command.actionId]);
  }
  await faults.beforeCommit?.();return row;
 });
}
export function sourceEnvelope(c:ReceiverConfig,operationId:string,payload:object,actionId:string=randomUUID()):SourceCommand{
 return {schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId,operationId,context:{kind:'integration',tenantId:c.tenantId,integrationId:c.integrationId},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload} as SourceCommand;
}
export async function sourceStatus(pool:Pool){
 return transaction(pool,async tx=>{
  await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
  const records=(await tx.query('SELECT r.*,c.status,c.last_error,c.result FROM mock_erp.source_records r JOIN mock_erp.source_commands c ON c.action_id=r.command_id ORDER BY kind,external_id')).rows;
  const commands=(await tx.query('SELECT action_id,envelope,actor_subject,status,attempts,last_error,result,created_at,completed_at FROM mock_erp.source_commands ORDER BY ordinal DESC LIMIT 200')).rows;
  const commandCount=Number((await tx.query('SELECT count(*) FROM mock_erp.source_commands')).rows[0].count);
  return {records,commands,commandCount};
 });
}
export async function publicSourceStatus(pool:Pool,c:ReceiverConfig){
 const status=await sourceStatus(pool);
 return {schemaVersion:'1.0.0',tenantId:c.tenantId,integrationId:c.integrationId,truncated:status.records.length>200||status.commandCount>200,
  records:status.records.slice(0,200).map(r=>({kind:r.kind,externalId:r.external_id,localRevision:r.revision,commandId:r.command_id,status:r.status})),
  commands:status.commands.map(r=>({actionId:r.action_id,operationId:r.envelope.operationId,status:r.status,attempts:r.attempts,lastError:r.last_error,result:r.result}))};
}
/** Serial source lane deliberately keeps this small reference ordered. Claim and
 * completion are separate commits; no network call holds a source transaction. */
export async function runSourceOnce(pool:Pool,c:ReceiverConfig,faults:{afterClaim?:()=>Promise<void>;afterSend?:()=>Promise<void>}={}){
 if(!c.tawselBaseUrl||!c.tawselAuthorization)return false;
 const claimed=await transaction(pool,async tx=>{
  await lockReceiver(tx);
  const row=(await tx.query<SourceRow & {due:boolean;leased:boolean}>('SELECT *,next_attempt_at<=clock_timestamp() AS due,lease_until>clock_timestamp() AS leased FROM mock_erp.source_commands WHERE status=\'pending\' ORDER BY ordinal LIMIT 1 FOR UPDATE')).rows[0];
  if(!row||!row.due||row.leased)return null;
  if(row.lease_id)await tx.query("UPDATE mock_erp.source_attempts SET finished_at=clock_timestamp(),result='lease-expired' WHERE action_id=$1 AND number=$2 AND finished_at IS NULL",[row.action_id,row.attempts]);
  const lease=randomUUID();
  await tx.query("UPDATE mock_erp.source_commands SET lease_id=$2,lease_until=clock_timestamp()+interval '20 seconds',attempts=attempts+1 WHERE action_id=$1",[row.action_id,lease]);
  await tx.query('INSERT INTO mock_erp.source_attempts(action_id,number,lease_id) VALUES($1,$2,$3)',[row.action_id,row.attempts+1,lease]);
  return {...row,lease_id:lease,attempts:row.attempts+1};
 });
 if(!claimed)return false;await faults.afterClaim?.();
 let result:S['ActionResult']|null=null,error:string|null=null;
 try{
  const credential=c.tawselAuthorization.replace(/^Bearer /,''),command=claimed.envelope;
  const family=definitions[command.operationId]![0];
  const response=family==='provisioning'?await provisioningClient(c.tawselBaseUrl,credential).command(command as ProvisioningCommand):family==='b2b-intake'?await intakeClient(c.tawselBaseUrl,credential).command(command as IntakeCommand):await returnReceiverClient(c.tawselBaseUrl,credential).command(command as S['ReturnReceiveCommand']|S['ReturnDisposeCommand']);
  if(conforms('action-result.v1.schema.json',response.body)){
   const value=response.body as S['ActionResult'];
   if(value.receipt.actionId===command.actionId&&value.operationId===command.operationId)result=value;else error='mismatched_response';
  }else error=`http_${response.status}_acceptance_unknown`;
 }catch{error='connection_unavailable_acceptance_unknown';}
 await faults.afterSend?.();
 const status=result?.receipt.businessStatus??'pending';
 await transaction(pool,async tx=>{
  const update=await tx.query("UPDATE mock_erp.source_commands SET status=$3,result=$4,last_error=$5,lease_id=NULL,lease_until=NULL,next_attempt_at=clock_timestamp()+($6::int*interval '1 second'),completed_at=CASE WHEN $4::jsonb IS NULL THEN NULL ELSE clock_timestamp() END WHERE action_id=$1 AND lease_id=$2 AND status='pending'",[claimed.action_id,claimed.lease_id,status,result,error??result?.receipt.problem?.code??null,Math.min(300,2**Math.min(claimed.attempts,8))]);
  if(update.rowCount)await tx.query('UPDATE mock_erp.source_attempts SET finished_at=clock_timestamp(),result=$3 WHERE action_id=$1 AND number=$2',[claimed.action_id,claimed.attempts,result?status:error]);
 });return true;
}
