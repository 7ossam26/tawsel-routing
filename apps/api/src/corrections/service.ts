import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,withAccess,type AuthenticatedPrincipal} from '../access/service.js';
import {canonicalJson} from '../commands/json.js';
import {executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks,type Decision} from '../commands/kernel.js';
import {activity,eligibleTarget,ownDriver} from '../current/state.js';
import {CurrentError} from '../current/models.js';
import {executionFence} from '../devices/fence.js';
import {requireDevice,uuid} from '../devices/models.js';
import {ownRound} from '../devices/state.js';
import {lockDriver} from '../returns/state.js';
import {planningState,snapshot,enqueuePlanning} from '../planning/queue.js';
import {calculate,money,type Frozen} from '../outcomes/arithmetic.js';
import {appendOutcome} from '../outcomes/persistence.js';
import {operations,requireOutcome,OutcomeError,type Operation,type OutcomePayload} from '../outcomes/models.js';
import {correctionPolicy,correctionState,availability} from './state.js';
import {requireCorrection,type Correct,type Correction,type Adoption} from './models.js';

const operationFor={full:'outcome.recordFull',partial:'outcome.recordPartial',refused:'outcome.recordRefusal','no-answer':'outcome.recordNoAnswer'} as const;
export class Corrections {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 availability(principal:AuthenticatedPrincipal,attemptId:string,deviceId:string){return availability(this.pool,principal,attemptId,deviceId);}
 async command(principal:AuthenticatedPrincipal,value:unknown){
  const adoption=(value as ActionEnvelope|undefined)?.operationId==='evidence.adoptCompatible';
  if(adoption)requireDevice('AdoptionCommand',value);else requireCorrection('CorrectCommand',value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as Correct & Adoption;
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driver=ownDriver(a);if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;
   a.assertScope({tenantId:device.tenantId,accountId:device.accountId});
   let evidence:ActionEnvelope|null=null,correction:Correction,state:Awaited<ReturnType<typeof correctionState>>,activityRevision=0,before:Awaited<ReturnType<typeof activity>>=null;
   const authorize=async()=>{
    a.requireCapability(correctionPolicy);await ownRound(tx,a,p.roundId);
    if(adoption){
     const original=await getCommandResult(tx,a.commandScope,p.evidenceActionId);
     if(!original||original.summary.driverId!==driver||original.summary.roundId!==p.roundId)throw new AccessDenied(true);
     evidence=(await tx.query<{envelope:ActionEnvelope}>('SELECT envelope FROM tawsel.command_evidence WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3',[a.context.tenantId,a.context.sourceId,p.evidenceActionId])).rows[0]?.envelope??null;
    }else{
     if(!(await tx.query('SELECT 1 FROM tawsel.round_admissions WHERE tenant_id=$1 AND driver_id=$2 AND round_id=$3 AND task_id=$4 AND attempt_id=$5',[a.context.tenantId,driver,p.roundId,p.taskId,p.attemptId])).rowCount)throw new AccessDenied(true);
    }
   };
   const reject=(error:OutcomeError|CurrentError):Decision=>{
    const problem={type:`https://schemas.tawsel.invalid/problems/${error.code.replaceAll('_','-')}`,title:'Correction requires review',code:error.code,status:error.statusCode,detail:error.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
    const payload={actionId:c.actionId,roundId:p.roundId,driverId:driver,businessStatus:'review-required',code:error.code};requireDevice('EvidenceEvent',payload);
    return {status:'review-required',retentionHold:true,problem,response:{status:error.statusCode,body:{problem,...(state?{availability:state.view}:{})}},summary:{driverId:driver,roundId:p.roundId,taskId:state?.view.taskId??null,code:error.code},audit:{code:error.code,evidenceActionId:adoption?p.evidenceActionId:null,availability:state?.view??null},evidenceIntents:[{eventId:randomUUID(),recipientId:device.accountId,recipientKind:'account',eventType:'evidence.received',payloadVersion:'1.0.0',payload}]};
   };
   return executeCommandInTransaction(tx,a.commandScope,c,{authorize,async writeDomain(){try{
    await lockDriver(tx,a.context.tenantId,driver,p.roundId);await authorize();
    let target=p.attemptId,op:Operation,payload:OutcomePayload;
    if(adoption){
     const original=await getCommandResult(tx,a.commandScope,p.evidenceActionId);
     if(!evidence||!original||original.receipt.receiptId!==p.evidenceReceiptId||original.receipt.businessStatus==='accepted'||!Object.hasOwn(operations,evidence.operationId))throw new OutcomeError('lifecycle_forbidden',409,'الدليل غير متاح لاعتماد نتيجة تسليم؛ راجع السجل المحفوظ.');
     requireOutcome(operations[evidence.operationId as Operation]+'Command',evidence);
     if(evidence.context.kind!=='device')throw new OutcomeError('lifecycle_forbidden',409,'الدليل لا يخص هاتف تنفيذ.');
     const old=evidence.context,round=await ownRound(tx,a,p.roundId);
     const known=(await tx.query(`SELECT 1 FROM tawsel.device_takeovers WHERE tenant_id=$1 AND round_id=$2 AND ((generation=$3 AND device_id=$4) OR (generation=$3+1 AND former_device_id=$4))`,[a.context.tenantId,p.roundId,old.deviceGeneration,old.deviceId])).rowCount;
     if(!known||old.deviceGeneration>=Number(round.device_generation))throw new OutcomeError('stale_device',409,'هذا ليس سجل جيل سابق معروف لهذه الجولة.');
     if((await tx.query('SELECT 1 FROM tawsel.outcome_corrections WHERE tenant_id=$1 AND evidence_source_id=$2 AND evidence_action_id=$3',[a.context.tenantId,a.context.sourceId,p.evidenceActionId])).rowCount)throw new OutcomeError('stale_revision',409,'اعتُمد هذا الدليل بالفعل؛ افتح النتيجة الحالية.');
     target=String(evidence.payload.attemptId);op=evidence.operationId as Operation;payload=evidence.payload as OutcomePayload;
    }else{
     op=operationFor[p.replacement.outcome];
     // Only result/pieces/reported collection/shipping choice may be replaced.
     const {outcome:_,...fields}=p.replacement;void _;
     payload={roundId:p.roundId,taskId:p.taskId,attemptId:p.attemptId,expectedActivityRevision:0,expectedCurrentAttemptId:null,expectedSourceRevision:0,expectedAssignmentRevision:0,expectedPinRevision:0,...fields};
    }
    state=await correctionState(tx,a,target,device.deviceId,adoption);
    if(state.round.round_id!==p.roundId)throw new AccessDenied(true);
    const fenced=await executionFence(tx,c,state.latest);if(fenced)return fenced;
    if(!state.view.allowed)throw new OutcomeError('lifecycle_forbidden',409,state.view.message);
    if(state.view.effectiveOutcomeRevision!==p.expectedOutcomeRevision)throw new OutcomeError('stale_revision',409,'تغيّرت النتيجة؛ راجع الأصل والتصحيح الحالي قبل الحفظ.');
    const r=state.round,previous=state.view.effectiveOutcome;
    for(const id of [...c.dependsOnActionIds,...(evidence?.dependsOnActionIds??[])]){
     const dep=await getCommandResult(tx,a.commandScope,id);
     if(!dep||dep.receipt.businessStatus!=='accepted')throw new OutcomeError('sync_incomplete',409,'يوجد إجراء سابق غير مقبول؛ راجع المزامنة أولًا.');
    }
    const input=await snapshot(tx,await planningState(tx,r.tenant_id,driver)),member=input.members.find(m=>m.attemptId===target&&m.taskId===state.view.taskId);
    if(!member)throw new OutcomeError('stale_revision',409,'تغيّرت المحاولة أو الحيازة.');
    activityRevision=Number((await tx.query('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,r.round_id])).rows[0]?.revision??0);
    before=await activity(tx,r.tenant_id,r.round_id);
    if(adoption){
     if(p.expectedGeneration!==device.deviceGeneration||p.expectedActivityRevision!==activityRevision||p.expectedSourceRevision!==member.sourceRevision||p.expectedAssignmentRevision!==member.assignmentRevision||p.expectedPinRevision!==member.pinRevision)throw new OutcomeError('stale_revision',409,'حدّث الحالة المؤكدة قبل اعتماد الدليل.');
     if(payload.taskId!==member.taskId||payload.expectedSourceRevision!==member.sourceRevision||payload.expectedAssignmentRevision!==member.assignmentRevision||payload.expectedPinRevision!==member.pinRevision)throw new OutcomeError('stale_revision',409,'بيانات الدليل لا تطابق لقطة التنفيذ الحالية.');
    }
    payload={...payload,expectedActivityRevision:activityRevision,expectedCurrentAttemptId:before?.attemptId??null,expectedSourceRevision:member.sourceRevision,expectedAssignmentRevision:member.assignmentRevision,expectedPinRevision:member.pinRevision};
    if(!previous){
     if(r.ended_at||state.latest.round_id!==r.round_id)throw new OutcomeError('lifecycle_forbidden',409,'انتهت الجولة؛ لا يمكن إنشاء نتيجة جديدة لها.');
     if(before&&before.attemptId!==target)throw new OutcomeError('lifecycle_forbidden',409,'أكمل أو غيّر المحطة الحالية قبل اعتماد النتيجة.');
     await eligibleTarget(tx,a,r,input,payload);
    }
    let frozen:Frozen,sourceReference=previous?.sourceReference??null,sourceDispatchCycleId=previous?.sourceDispatchCycleId??null;
    if(member.dispatchCycleId){
     const source=(await tx.query<{payload:components['schemas']['B2bSourceSnapshot']}>('SELECT payload FROM tawsel.b2b_source_snapshots WHERE tenant_id=$1 AND task_id=$2 AND source_revision=$3',[r.tenant_id,member.taskId,member.sourceRevision])).rows[0]!;
     const prior=(await tx.query(`SELECT COALESCE(sum(c.shipping_minor),0)::text shipping,COALESCE(sum((SELECT sum(q.delivered) FROM tawsel.outcome_quantities q WHERE q.tenant_id=o.tenant_id AND q.outcome_id=o.outcome_id)),0)::text pieces
      FROM tawsel.effective_attempt_outcomes o JOIN tawsel.outcome_collections c USING(tenant_id,outcome_id) WHERE o.tenant_id=$1 AND o.dispatch_cycle_id=$2 AND o.attempt_id<>$3`,[r.tenant_id,member.dispatchCycleId,target])).rows[0];
     frozen={kind:'company',snapshot:source.payload,previousShippingCollectedMinor:Number(prior.shipping),previousDeliveredPieces:Number(prior.pieces)};
     sourceReference={tenantId:r.tenant_id,integrationId:member.integrationId!,externalId:source.payload.externalId};sourceDispatchCycleId=source.payload.sourceDispatchCycleId;
    }else{
     const amount=(await tx.query('SELECT amount_minor FROM tawsel.task_collection_amounts WHERE tenant_id=$1 AND task_id=$2',[r.tenant_id,member.taskId])).rows[0];frozen={kind:'personal',collection:amount?money(Number(amount.amount_minor)):null};
    }
    const calculation=calculate(op,payload,frozen),now=(await tx.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!.now;
    const attempt=(await tx.query('SELECT heading,arrival FROM tawsel.execution_attempts WHERE tenant_id=$1 AND round_id=$2 AND attempt_id=$3',[r.tenant_id,r.round_id,target])).rows[0];
    const revision=Number((await tx.query('SELECT COALESCE(max(revision),0)+1 n FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND task_id=$2',[r.tenant_id,member.taskId])).rows[0].n);
    const outcome={...calculation,outcomeId:randomUUID(),revision,roundId:r.round_id,workdayId:r.workday_id,driverId:driver,taskId:member.taskId,attemptId:target,dispatchCycleId:member.dispatchCycleId,branchId:member.branchId,sourceReference,sourceDispatchCycleId,sourceRevision:member.sourceRevision,assignmentRevision:member.assignmentRevision,time:{actionId:c.actionId,recordedAt:now.toISOString(),observation:evidence?.observation??c.observation},heading:previous?.heading??attempt?.heading??null,arrival:previous?.arrival??attempt?.arrival??null};
    requireOutcome('Record',outcome);
    if(!previous)await tx.query(`INSERT INTO tawsel.execution_attempts (tenant_id,round_id,attempt_id,task_id,stage,revision,resolution,resolved_outcome_id) VALUES ($1,$2,$3,$4,'resolved',$5,$6,$7)
     ON CONFLICT(tenant_id,round_id,attempt_id) DO UPDATE SET stage='resolved',revision=$5,resolution=$6,resolved_outcome_id=$7`,[r.tenant_id,r.round_id,target,member.taskId,activityRevision+1,{outcomeId:outcome.outcomeId,time:outcome.time},outcome.outcomeId]);
    await appendOutcome(tx,r.tenant_id,a.context.sourceId,c.actionId,outcome);
    correction={correctionId:randomUUID(),previousOutcomeId:previous?.outcomeId??null,previousRevision:previous?.revision??0,outcome,evidenceActionId:adoption?p.evidenceActionId:null,evidenceReceiptId:adoption?p.evidenceReceiptId:null};requireCorrection('Record',correction);
    await tx.query(`INSERT INTO tawsel.outcome_corrections (tenant_id,correction_id,attempt_id,outcome_id,previous_outcome_id,previous_revision,source_id,action_id,evidence_source_id,evidence_action_id,evidence_receipt_id,record) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[r.tenant_id,correction.correctionId,target,outcome.outcomeId,correction.previousOutcomeId,correction.previousRevision,a.context.sourceId,c.actionId,adoption?a.context.sourceId:null,correction.evidenceActionId,correction.evidenceReceiptId,correction]);
    const event={correction,previousOutcome:previous};requireCorrection('Event',event);
    const intents:Extract<Decision,{status:'accepted'}>['intents']=member.integrationId?[{eventId:randomUUID(),recipientId:member.integrationId,eventType:previous?'outcome.corrected':'outcome.recorded',payloadVersion:'1.0.0',payload:previous?event:{outcome}}]:[];
    if(adoption){const payload={evidenceActionId:p.evidenceActionId,evidenceReceiptId:p.evidenceReceiptId,correctionId:correction.correctionId,outcomeId:outcome.outcomeId,outcomeRevision:revision};requireCorrection('AdoptionEvent',payload);intents.push({eventId:randomUUID(),recipientId:device.accountId,recipientKind:'account',eventType:'evidence.adoptionResolved',payloadVersion:'1.0.0',payload});}
    requireCorrection('Result',{correction});
    return {status:'accepted',response:{status:200,body:{correction}},summary:{driverId:driver,roundId:r.round_id,taskId:member.taskId,outcomeId:outcome.outcomeId,outcomeRevision:revision},audit:event,resourceVersions:{outcomeRevision:revision,deviceGeneration:device.deviceGeneration},intents};
   }catch(error){if(error instanceof OutcomeError||error instanceof CurrentError)return reject(error);throw error;}},async writeProgress(){
    const o=correction.outcome,r=state.round;
    await tx.query('INSERT INTO tawsel.effective_task_outcomes (tenant_id,task_id,outcome_id) VALUES ($1,$2,$3) ON CONFLICT(tenant_id,task_id) DO UPDATE SET outcome_id=$3',[r.tenant_id,o.taskId,o.outcomeId]);
    if(!correction.previousOutcomeId){
     if(o.dispatchCycleId)await tx.query("UPDATE tawsel.driver_planned_stops SET state='completed' WHERE tenant_id=$1 AND driver_id=$2 AND dispatch_cycle_id=$3",[r.tenant_id,driver,o.dispatchCycleId]);
     await tx.query('INSERT INTO tawsel.round_activity_state (tenant_id,round_id,revision) VALUES ($1,$2,$3) ON CONFLICT(tenant_id,round_id) DO UPDATE SET revision=$3',[r.tenant_id,r.round_id,activityRevision+1]);
     await tx.query('INSERT INTO tawsel.current_activity_history (tenant_id,round_id,revision,source_id,action_id,operation_id,previous_activity,current_activity,action_time) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8)',[r.tenant_id,r.round_id,activityRevision+1,a.context.sourceId,c.actionId,c.operationId,before,o.time]);
     await tx.query('UPDATE tawsel.planning_states SET current_target=NULL WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver]);
    }
    await tx.query('UPDATE tawsel.planning_states SET execution_revision=execution_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver]);
    await enqueuePlanning(tx,r.tenant_id,driver,a.context.sourceId,c.actionId);
   },...this.observe});
  });
 }
 async result(principal:AuthenticatedPrincipal,actionId:string){
  uuid(actionId);return withAccess(this.pool,principal,async(a,tx)=>{
   const driver=ownDriver(a),result=await getCommandResult(tx,a.commandScope,actionId);if(!result)return {actionId,status:'pending' as const};
   if(!['outcome.correct','evidence.adoptCompatible'].includes(result.operationId)||result.summary.driverId!==driver)throw new AccessDenied(true);
   await lockDriver(tx,a.context.tenantId,driver);await ownRound(tx,a,String(result.summary.roundId));
   return {actionId,status:result.receipt.businessStatus,result};
  });
 }
}
