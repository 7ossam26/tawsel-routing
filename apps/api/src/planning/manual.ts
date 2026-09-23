import { randomUUID } from 'node:crypto';
import type { components } from '@tawsel/api-client';
import type { Transaction } from '../db/transaction.js';
import { EngineError } from '../engine/index.js';
import { PlanningError, type Input, type Plan, type StateRow } from './models.js';
import { fingerprint, planningState, snapshot } from './queue.js';
import { eligibleMembers, validateOrder } from './policy.js';

async function lastOrder(tx:Transaction,input:Input) {
 return (await tx.query<{plan_id:string;route_policy:NonNullable<Plan['routePolicy']>}>(`SELECT plan_id,route_policy FROM tawsel.plan_revisions
  WHERE tenant_id=$1 AND driver_id=$2 AND state IN ('ready','manual') ORDER BY revision DESC LIMIT 1`,[input.tenantId,input.driverId])).rows[0];
}
/** A retained order is a suggestion requiring an explicit new manual revision.
 * Old estimates remain historical; no road/arrival estimate is transplanted. */
export async function continuation(tx:Transaction,input:Input):Promise<components['schemas']['PlanningContinuation']|null> {
 const prior=await lastOrder(tx,input);if(!prior)return null;
 const ids=prior.route_policy.orderedTaskIds.filter(id=>input.members.some(m=>m.taskId===id&&m.eligible));
 try{validateOrder(input,ids);}catch(error){if(error instanceof EngineError)return null;throw error;}
 return {sourcePlanId:prior.plan_id,orderedTaskIds:ids,mode:'reoptimization-pending',requiresManualConfirmation:true,roadMetricsAvailable:false};
}
/** Called inside the command transaction, with tenant/driver/state locks held. */
export async function publishManual(tx:Transaction,state:StateRow,input:Input,p:components['schemas']['PlanningManualOrder'],sourceId:string,actionId:string):Promise<components['schemas']['PlanningManualResult']> {
 if(p.expectedInputRevision!==input.inputRevision||p.expectedManualRevision!==input.manualRevision)throw new PlanningError('stale_revision',409,'تغيّر العمل أو الترتيب؛ أعد تحميل الخطة.');
 let order:string[];
 try {
  const members=eligibleMembers(input);
  if(p.selection.kind==='order')order=p.selection.taskIds;
  else {
   const first=p.selection.taskId,prior=await lastOrder(tx,input);
   const retained=prior?.route_policy.orderedTaskIds??[];
   const rest=[...members].sort((a,b)=>{
    const rank=(id:string,urgent:boolean)=>id===input.currentTarget?.taskId?0:urgent?1:2;
    return rank(a.taskId,a.priority==='urgent')-rank(b.taskId,b.priority==='urgent')||
     (retained.indexOf(a.taskId)<0?Number.MAX_SAFE_INTEGER:retained.indexOf(a.taskId))-(retained.indexOf(b.taskId)<0?Number.MAX_SAFE_INTEGER:retained.indexOf(b.taskId))||a.taskId.localeCompare(b.taskId);
   }).map(m=>m.taskId);
   order=[first,...rest.filter(id=>id!==first)];
  }
  validateOrder(input,order);
 }catch(error){if(error instanceof EngineError)throw new PlanningError('invalid_manual_order',409,'اختر عملًا متاحًا مع الحفاظ على المحطة الحالية ثم العاجل وحدّ المحطات.');throw error;}
 await tx.query(`UPDATE tawsel.planning_states SET manual_revision=manual_revision+1,input_revision=input_revision+1 WHERE tenant_id=$1 AND driver_id=$2`,[input.tenantId,input.driverId]);
 const current=await snapshot(tx,await planningState(tx,input.tenantId,input.driverId)),hash=fingerprint(current);
 // Explicit manual acceptance fences both pending and in-flight work. A later
 // automatic/source trigger or explicit replan can request NEW optimization.
 await tx.query(`UPDATE tawsel.planning_jobs SET status='superseded',lease_id=null,lease_until=null,finished_at=clock_timestamp()
  WHERE tenant_id=$1 AND driver_id=$2 AND status IN ('pending','running')`,[input.tenantId,input.driverId]);
 const planId=randomUUID(),forecastId=randomUUID(),workloadId=randomUUID(),revision=Number(state.next_plan_revision);
 const routePolicy={version:1,method:'manual',orderedTaskIds:order,exceptions:[]};
 await tx.query(`INSERT INTO tawsel.plan_revisions (tenant_id,driver_id,plan_id,revision,fingerprint,state,route_policy,input,source_id,action_id)
  VALUES ($1,$2,$3,$4,$5,'manual',$6,$7,$8,$9)`,[input.tenantId,input.driverId,planId,revision,hash,routePolicy,current,sourceId,actionId]);
 await tx.query(`INSERT INTO tawsel.forecast_revisions (tenant_id,forecast_id,plan_id,workload_id,time_origin) VALUES ($1,$2,$3,$4,$5)`,[input.tenantId,forecastId,planId,workloadId,current.settings!.plannedStartAt]);
 for(const member of current.members){
  const position=order.indexOf(member.taskId);
  await tx.query(`INSERT INTO tawsel.forecast_members (tenant_id,forecast_id,attempt_id,task_id,dispatch_cycle_id,source_revision,assignment_revision,pin_revision,membership,exclusion_reason,position)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[input.tenantId,forecastId,member.attemptId,member.taskId,member.dispatchCycleId,member.sourceRevision,member.assignmentRevision,member.pinRevision,position>=0?'manual':'excluded',member.exclusionReason,position>=0?position+1:null]);
 }
 await tx.query(`UPDATE tawsel.planning_states SET current_plan_id=$3,next_plan_revision=next_plan_revision+1 WHERE tenant_id=$1 AND driver_id=$2`,[input.tenantId,input.driverId,planId]);
 for(const recipient of [...new Set(current.members.flatMap(m=>m.integrationId?[m.integrationId]:[]))].sort())await tx.query(`INSERT INTO tawsel.outbox_intents (tenant_id,event_id,source_id,action_id,recipient_id,event_type,payload_version,payload)
  VALUES ($1,$2,$3,$4,$5,'plan.revisionPublished','1.0.0',$6)`,[input.tenantId,randomUUID(),sourceId,actionId,recipient,{jobId:null,planId,driverId:input.driverId,revision,forecastId,workloadId,state:'manual',status:'manual',policyValidated:true}]);
 return {planId,revision,manualRevision:current.manualRevision,inputRevision:current.inputRevision};
}
