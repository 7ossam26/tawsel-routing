import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,withAccess,type AccessSession,type AuthenticatedPrincipal} from '../access/service.js';
import {canonicalJson} from '../commands/json.js';
import {executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks} from '../commands/kernel.js';
import {lockInvariants} from '../commands/locks.js';
import type {RoundRow} from '../rounds/models.js';
import {DeviceError,requireDevice,uuid} from './models.js';
import {deviceRejection,ownRound} from './state.js';
import type {Transaction} from '../db/transaction.js';
import {CurrentActivity} from '../current/service.js';
import {ownDriver} from '../current/state.js';
import {authorizeDriver} from '../planning/service.js';

async function context(tx:Transaction,r:RoundRow,deviceId:string):Promise<components['schemas']['DeviceContext']>{
 const day=(await tx.query('SELECT ended_at FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[r.tenant_id,r.workday_id])).rows[0];
 const transferred=(await tx.query('SELECT 1 FROM tawsel.device_takeovers WHERE tenant_id=$1 AND round_id=$2 AND generation=$3',[r.tenant_id,r.round_id,r.device_generation])).rowCount;
 return {roundId:r.round_id,workdayId:r.workday_id,driverId:r.driver_id,owner:{accountId:r.owner_account_id,deviceId:r.owner_device_id,generation:Number(r.device_generation)},viewerDeviceId:deviceId,mode:r.owner_device_id===deviceId?'owner':'view-only',roundState:r.ended_at?'ended':'active',workdayState:day.ended_at?'closed':'open',mayTakeover:!r.ended_at&&!day.ended_at&&r.owner_device_id!==deviceId,snapshotRequired:!!transferred&&r.owner_device_id===deviceId};
}
async function lockedRound(tx:Transaction,a:AccessSession,roundId:string){
 await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:ownDriver(a)}]);return ownRound(tx,a,roundId);
}
const supportedResult=(op:string)=>op==='device.takeOver'||op==='round.start'||op==='round.end'||op==='workday.end'||op.startsWith('current.')||op.startsWith('outcome.record')||['task.deferWhole','task.retryWhole','task.activateDeferred','task.setDriverUrgency','planning.saveDraft','planning.requestReplan','planning.requestPreview','planning.setManualOrder','location.confirmPin'].includes(op);

export class Devices {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async context(principal:AuthenticatedPrincipal,roundId:string,deviceId:string){
  uuid(roundId);uuid(deviceId);return withAccess(this.pool,principal,async(a,tx)=>context(tx,await lockedRound(tx,a,roundId),deviceId));
 }
 async snapshot(principal:AuthenticatedPrincipal,roundId:string,deviceId:string):Promise<components['schemas']['DeviceSnapshot']>{
  uuid(roundId);uuid(deviceId);return withAccess(this.pool,principal,async(a,tx)=>{
   const r=await lockedRound(tx,a,roundId),view=await context(tx,r,deviceId);
   const current=r.ended_at?null:await new CurrentActivity(this.pool).readLocked(a,tx,roundId);
   const token=view.mode==='owner'?(await tx.query<{snapshot_token:string}>('SELECT snapshot_token FROM tawsel.device_takeovers WHERE tenant_id=$1 AND round_id=$2 AND generation=$3',[r.tenant_id,r.round_id,r.device_generation])).rows[0]?.snapshot_token??null:null;
   const result={context:view,confirmedAt:(await tx.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!.now.toISOString(),current,snapshotToken:token};requireDevice('Snapshot',result);return result;
  });
 }
 async result(principal:AuthenticatedPrincipal,actionId:string):Promise<components['schemas']['DeviceActionStatus']>{
  uuid(actionId);return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);await authorizeDriver(tx,a,driverId);const result=await getCommandResult(tx,a.commandScope,actionId);
   if(!result)return {actionId,status:'pending'};
   if(!supportedResult(result.operationId)||result.summary.driverId!==driverId||typeof result.summary.roundId!=='string')throw new AccessDenied(true);
   await lockedRound(tx,a,result.summary.roundId);
   return {actionId,status:result.receipt.businessStatus as 'accepted'|'rejected'|'review-required',result};
  });
 }
 async evidence(principal:AuthenticatedPrincipal,actionId:string,deviceId:string):Promise<components['schemas']['DeviceEvidence']>{
  uuid(actionId);uuid(deviceId);return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);await authorizeDriver(tx,a,driverId);const result=await getCommandResult(tx,a.commandScope,actionId);
   if(!result||!supportedResult(result.operationId)||result.summary.driverId!==driverId||typeof result.summary.roundId!=='string')throw new AccessDenied(true);
   const r=await lockedRound(tx,a,result.summary.roundId);
   const envelope=(await tx.query<{envelope:ActionEnvelope}>('SELECT envelope FROM tawsel.command_evidence WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3',[a.context.tenantId,a.context.sourceId,actionId])).rows[0]?.envelope??null;
   const constraints:components['schemas']['DeviceRecovery']['constraints']=[];
   const day=(await tx.query('SELECT ended_at FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[r.tenant_id,r.workday_id])).rows[0];
   if(day.ended_at)constraints.push('closed-workday');
   const latest=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 ORDER BY device_generation DESC LIMIT 1',[r.tenant_id,driverId])).rows[0]!;
   if(latest.owner_device_id!==deviceId)constraints.push('not-current-owner');
   if(!a.effectiveCapabilities.includes('correction.own'))constraints.push('correction-not-authorized');
   if(!envelope||!['current.recordArrival','outcome.recordFull','outcome.recordPartial','outcome.recordRefusal','outcome.recordNoAnswer'].includes(envelope.operationId))constraints.push('unsupported-operation');
   let effectiveOutcomeRevision=0;
   if(envelope?.payload.taskId){
    const p=envelope.payload;
    const admitted=(await tx.query<{dispatch_cycle_id:string|null}>('SELECT dispatch_cycle_id FROM tawsel.round_admissions WHERE tenant_id=$1 AND round_id=$2 AND task_id=$3 AND attempt_id=$4',[r.tenant_id,r.round_id,p.taskId,p.attemptId])).rows[0];
    // A rejected envelope may contain caller-supplied foreign IDs. Preserve it,
    // but never probe resource revisions/dependencies outside this admission.
    if(!admitted){if(!constraints.includes('unsupported-operation'))constraints.push('unsupported-operation');}
    else{
    const task=(await tx.query(`SELECT t.driver_id,t.dispatch_cycle_id,t.source_revision,c.assignment_revision FROM tawsel.location_tasks t
     LEFT JOIN tawsel.b2b_dispatch_cycles c ON c.tenant_id=t.tenant_id AND c.dispatch_cycle_id=t.dispatch_cycle_id
     WHERE t.tenant_id=$1 AND t.task_id=$2 AND t.dispatch_cycle_id IS NOT DISTINCT FROM $3::uuid`,[r.tenant_id,p.taskId,admitted?.dispatch_cycle_id??null])).rows[0];
    if(!admitted||!task||task.driver_id!==driverId||task.dispatch_cycle_id!==admitted.dispatch_cycle_id||Number(task.assignment_revision??0)!==p.expectedAssignmentRevision)constraints.push('changed-assignment');
    if(!task||Number(task.source_revision)!==p.expectedSourceRevision)constraints.push('changed-source');
    if(!(await tx.query('SELECT 1 FROM tawsel.planning_attempts WHERE tenant_id=$1 AND attempt_id=$2 AND latest',[r.tenant_id,p.attemptId])).rowCount)constraints.push('changed-attempt');
    if(admitted?.dispatch_cycle_id&&(await tx.query('SELECT 1 FROM tawsel.retry_dependencies WHERE tenant_id=$1 AND dispatch_cycle_id=$2',[r.tenant_id,admitted.dispatch_cycle_id])).rowCount)constraints.push('dependent-receipt');
    effectiveOutcomeRevision=Number((await tx.query('SELECT COALESCE(max(revision),0) n FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND attempt_id=$2',[r.tenant_id,p.attemptId])).rows[0].n);
    }
   }
   const activityRevision=Number((await tx.query('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,r.round_id])).rows[0]?.revision??0);
   const recovery:components['schemas']['DeviceRecovery']={adoptionImplemented:false,state:constraints.length?'blocked':'requires-validation',constraints,currentGeneration:Number(latest.device_generation),effectiveOutcomeRevision,activityRevision};
   const response={actionId,result,envelope,durableReceipt:true as const,recovery};requireDevice('Evidence',response);return response;
  });
 }
 async receive(principal:AuthenticatedPrincipal,value:unknown):Promise<components['schemas']['DeviceEvidenceSubmissionResult']>{
  requireDevice('FormerSubmission',value);const c=JSON.parse(canonicalJson(value)) as ActionEnvelope;
  return withAccess(this.pool,principal,async(a,tx)=>{
   if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;a.assertScope({tenantId:device.tenantId,accountId:device.accountId});
   let r:RoundRow,duplicate=true;
   const result=await executeCommandInTransaction(tx,a.commandScope,c,{
    async authorize(){
     r=await ownRound(tx,a,String(c.payload.roundId));
     if(c.payload.taskId){const visible=(await tx.query('SELECT 1 FROM tawsel.round_admissions WHERE tenant_id=$1 AND round_id=$2 AND task_id=$3 AND attempt_id=$4',[r.tenant_id,r.round_id,c.payload.taskId,c.payload.attemptId])).rowCount;if(!visible)throw new AccessDenied(true);}
    },
    async writeDomain(){
     duplicate=false;r=await lockedRound(tx,a,r.round_id);
     // Only a real earlier generation of this round is eligible for review.
     // Unknown device/generation is retained as rejected evidence, never authority.
     const known=(await tx.query(`SELECT 1 FROM tawsel.device_takeovers WHERE tenant_id=$1 AND round_id=$2 AND
       ((generation=$3 AND device_id=$4) OR (generation=$3+1 AND former_device_id=$4))`,[r.tenant_id,r.round_id,device.deviceGeneration,device.deviceId])).rowCount;
     const former=!!known&&device.deviceGeneration<Number(r.device_generation);
     return deviceRejection(c,r,new DeviceError(former?'stale_device':'lifecycle_forbidden',409,former?'حُفظ سجل الهاتف السابق للمراجعة؛ لم يُطبّق.':'حُفظ الدليل دون تطبيق؛ هذا ليس جيلاً سابقاً معروفاً لهذه الجولة.'));
    },async writeProgress(){throw new Error('Evidence receipt must never accept execution');},...this.observe
   });
   return {submissionStatus:duplicate?'duplicate':'received',result};
  });
 }
 async takeover(principal:AuthenticatedPrincipal,value:unknown){
  requireDevice('TakeoverCommand',value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as components['schemas']['DeviceTakeover'];
  return withAccess(this.pool,principal,async(a,tx)=>{
   if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;
   a.assertScope({tenantId:device.tenantId,accountId:device.accountId});let r:RoundRow;
   return executeCommandInTransaction(tx,a.commandScope,c,{
    async authorize(){r=await ownRound(tx,a,p.roundId);},
    async writeDomain(){try{
     await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:r.driver_id},{kind:'workday',id:r.workday_id}]);
     r=await ownRound(tx,a,p.roundId);
     const day=(await tx.query('SELECT ended_at FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[r.tenant_id,r.workday_id])).rows[0];
     if(r.ended_at||day.ended_at)throw new DeviceError('lifecycle_forbidden',409,'الجولة أو اليوم انتهى؛ لا يمكن إعادة فتحه بنقل التنفيذ.');
     if(Number(r.device_generation)!==p.expectedGeneration)throw new DeviceError('stale_revision',409,'تغيّر جهاز التنفيذ؛ حدّث الجولة قبل التأكيد.');
     if(r.owner_device_id===device.deviceId)throw new DeviceError('lifecycle_forbidden',409,'هذا الهاتف يملك التنفيذ بالفعل؛ حمّل الحالة الحالية.');
     const generation=Number(r.device_generation)+1;
     if(!Number.isSafeInteger(generation))throw new DeviceError('lifecycle_forbidden',409,'تعذر إنشاء جيل جديد.');
     await tx.query('INSERT INTO tawsel.device_takeovers (tenant_id,round_id,generation,account_id,former_device_id,device_id,source_id,action_id,snapshot_token) VALUES ($1,$2,$3,$4,$5,$6,$4,$7,$8)',[r.tenant_id,r.round_id,generation,a.context.sourceId,r.owner_device_id,device.deviceId,c.actionId,randomUUID()]);
     await tx.query('UPDATE tawsel.rounds SET owner_device_id=$3,device_generation=$4 WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,r.round_id,device.deviceId,generation]);
     const body={roundId:r.round_id,workdayId:r.workday_id,driverId:r.driver_id,owner:{accountId:r.owner_account_id,deviceId:device.deviceId,generation},snapshotRequired:true};requireDevice('TakeoverResult',body);
     const event={actionId:c.actionId,roundId:r.round_id,driverId:r.driver_id,generation};requireDevice('TransferEvent',event);
     return {status:'accepted',response:{status:200,body},summary:{roundId:r.round_id,workdayId:r.workday_id,driverId:r.driver_id,generation},audit:{roundId:r.round_id,formerDeviceId:r.owner_device_id,deviceId:device.deviceId,generation},resourceVersions:{deviceGeneration:generation},intents:[{eventId:randomUUID(),recipientId:r.owner_account_id,recipientKind:'account',eventType:'device.executionTransferred',payloadVersion:'1.0.0',payload:event}],retentionHold:true};
    }catch(e){if(e instanceof DeviceError)return deviceRejection(c,r,e);throw e;}},
    async writeProgress(){/* Ownership does not change current activity, assignment or progress. */},...this.observe
   });
  });
 }
}
