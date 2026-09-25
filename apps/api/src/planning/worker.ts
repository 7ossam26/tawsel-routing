import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { withTransaction, type Transaction } from '../db/transaction.js';
import { lockInvariants } from '../commands/locks.js';
import { EngineError, type OptimizationInput, type OptimizationResult, type RouteResult } from '../engine/index.js';
import { validateModel } from '../engine/models.js';
import { enqueuePlanning, fingerprint, planningState, snapshot } from './queue.js';
import type { JobRow, Job } from './models.js';
import { instant, planRoute, validateCompleteRoute, type Planner } from './policy.js';
export type { Planner } from './policy.js';

export interface Claim extends JobRow { lease_id:string; lease_until:Date }
async function driverLock(tx:Transaction,tenantId:string,driverId:string) {
 // Access/provisioning lock first, then the same driver invariant as intake.
 await tx.query('SELECT tenant_id FROM tawsel.tenants WHERE tenant_id=$1 FOR SHARE',[tenantId]);
 await lockInvariants(tx,tenantId,[{kind:'driver',id:driverId}]);
}
export async function materializeLegacyIntent(pool:Pool):Promise<boolean> {
 const row=(await pool.query<{tenant_id:string;driver_id:string;source_id:string;action_id:string}>(`SELECT * FROM tawsel.intake_replan_intents WHERE status='pending' ORDER BY created_at LIMIT 1`)).rows[0];
 if(!row)return false;
 await withTransaction(pool,async tx=>{
  await driverLock(tx,row.tenant_id,row.driver_id);
  const pending=(await tx.query(`SELECT 1 FROM tawsel.intake_replan_intents WHERE tenant_id=$1 AND driver_id=$2 AND source_id=$3 AND action_id=$4 AND status='pending'`,[row.tenant_id,row.driver_id,row.source_id,row.action_id])).rowCount;
  if(pending)await enqueuePlanning(tx,row.tenant_id,row.driver_id,row.source_id,row.action_id);
 });return true;
}
export async function claimPlanningJob(pool:Pool,leaseMs=90_000):Promise<Claim|undefined> {
 if(!Number.isInteger(leaseMs)||leaseMs<100||leaseMs>300_000)throw new Error('Planning lease must be 100–300000 ms');
 // Discovery owns no row lock. Each candidate is rechecked under the global
 // lock order; publication can never deadlock with a command waiting on a job.
 const candidates=(await pool.query<{tenant_id:string;driver_id:string}>(`SELECT DISTINCT j.tenant_id,j.driver_id FROM tawsel.planning_jobs j
  WHERE ((j.status='pending' AND j.blocked_reason IS NULL AND j.next_attempt_at<=clock_timestamp())
   OR (j.status='running' AND j.lease_until<=clock_timestamp()))
  AND NOT EXISTS(SELECT 1 FROM tawsel.planning_jobs r WHERE r.tenant_id=j.tenant_id AND r.driver_id=j.driver_id AND r.status='running' AND r.lease_until>clock_timestamp())
  ORDER BY j.tenant_id,j.driver_id LIMIT 32`)).rows;
 for(const c of candidates){
  const claim=await withTransaction(pool,async tx=>{
   await driverLock(tx,c.tenant_id,c.driver_id);
   const state=await planningState(tx,c.tenant_id,c.driver_id);
   const running=(await tx.query<JobRow>(`SELECT * FROM tawsel.planning_jobs WHERE tenant_id=$1 AND driver_id=$2 AND status='running' FOR UPDATE`,[c.tenant_id,c.driver_id])).rows[0];
   if(running){
    const expired=(await tx.query('SELECT 1 WHERE $1::timestamptz<=clock_timestamp()',[running.lease_until])).rowCount;
    if(!expired)return undefined;
    if(running.job_id!==state.latest_job_id)await tx.query(`UPDATE tawsel.planning_jobs SET status='superseded',lease_id=null,lease_until=null,finished_at=clock_timestamp() WHERE tenant_id=$1 AND job_id=$2`,[c.tenant_id,running.job_id]);
   }
   const row=(await tx.query<JobRow>(`SELECT * FROM tawsel.planning_jobs WHERE tenant_id=$1 AND job_id=$2
    AND ((status='pending' AND blocked_reason IS NULL AND next_attempt_at<=clock_timestamp()) OR (status='running' AND lease_until<=clock_timestamp())) FOR UPDATE`,[c.tenant_id,state.latest_job_id])).rows[0];
   if(!row)return undefined;
   const claimed=(await tx.query<Claim>(`UPDATE tawsel.planning_jobs SET status='running',lease_id=$3,lease_until=clock_timestamp()+$4*interval '1 millisecond',attempts=attempts+1
    WHERE tenant_id=$1 AND job_id=$2 RETURNING *`,[row.tenant_id,row.job_id,randomUUID(),leaseMs])).rows[0]!;
   await tx.query(`INSERT INTO tawsel.planning_job_attempts (tenant_id,job_id,lease_id,attempt,lease_until) VALUES ($1,$2,$3,$4,$5)`,[claimed.tenant_id,claimed.job_id,claimed.lease_id,claimed.attempts,claimed.lease_until]);
   return claimed;
  });
  if(claim)return claim;
 }
 return undefined;
}
export function engineInput(job:JobRow):OptimizationInput {
 const s=job.input.settings!;
 return {mode:s.mode,accountKind:job.input.accountKind,origin:s.origin,endpoint:s.endpoint,tasks:job.input.members.filter(m=>m.eligible).map(m=>({taskId:m.taskId,coordinates:m.coordinates!,serviceEstimateSeconds:m.serviceEstimateSeconds}))};
}
/** Atomic append and pointer update; the lease fence prevents duplicate
 * effective publication even if a lost worker later returns. */
export async function persistPlanningResult(pool:Pool,job:Claim,outcome:{candidate:OptimizationResult;roadRoute?:RouteResult|null}|{error:NonNullable<Job['error']>},maxAttempts=3):Promise<boolean> {
 return withTransaction(pool,async tx=>{
  await driverLock(tx,job.tenant_id,job.driver_id);
  const state=await planningState(tx,job.tenant_id,job.driver_id);
  const row=(await tx.query<JobRow>(`SELECT * FROM tawsel.planning_jobs WHERE tenant_id=$1 AND job_id=$2 AND status='running'
   AND lease_id=$3 AND lease_until>clock_timestamp() FOR UPDATE`,[job.tenant_id,job.job_id,job.lease_id])).rows[0];
  if(!row)return false;
  // Re-read authoritative members/revisions while holding the SAME driver lock
  // as intake, pin and future execution writers. Caller-supplied claim input is
  // never publication authority. A timeout/error for stale input is stale too.
  const currentInput=await snapshot(tx,state);
  if(state.latest_job_id!==row.job_id || fingerprint(currentInput)!==row.fingerprint){
   await tx.query(`UPDATE tawsel.planning_jobs SET status='superseded',candidate=$3,last_error=$4,lease_id=null,lease_until=null,finished_at=clock_timestamp()
    WHERE tenant_id=$1 AND job_id=$2`,[row.tenant_id,row.job_id,'candidate' in outcome?outcome.candidate:null,'error' in outcome?outcome.error:null]);
   await enqueuePlanning(tx,row.tenant_id,row.driver_id,row.source_id,row.action_id);
   return false;
  }
  let result=outcome;
  if('candidate' in result){
   try{validateCompleteRoute(row.input,result.candidate);}catch(error){if(!(error instanceof EngineError))throw error;result={error:error.toJSON()};}
  }
  if('error' in result){
   const retry=['busy','timeout','cancelled','unavailable','http_error'].includes(result.error.code)&&row.attempts<maxAttempts;
   await tx.query(`UPDATE tawsel.planning_jobs SET status=$3,last_error=$4,lease_id=null,lease_until=null,
    next_attempt_at=clock_timestamp()+$5*interval '1 second',finished_at=CASE WHEN $3='failed' THEN clock_timestamp() ELSE NULL END WHERE tenant_id=$1 AND job_id=$2`,
   [row.tenant_id,row.job_id,retry?'pending':'failed',result.error,Math.min(300,2**Math.min(row.attempts,8))]);
   return true;
  }
  const candidate=result.candidate;
  const planState=candidate.status==='complete'?'ready':'partial';
  const currentMissing=!!row.input.currentTarget&&candidate.unassignedTaskIds.includes(row.input.currentTarget.taskId);
  const routePolicy={version:1,method:'grouped-heuristic',roadRoute:result.roadRoute??null,orderedTaskIds:candidate.visits.map(v=>v.taskId),exceptions:candidate.unassignedTaskIds.map(taskId=>({taskId,reason:taskId===row.input.currentTarget?.taskId?'unassigned-current':currentMissing?'blocked-by-current':row.input.members.find(m=>m.taskId===taskId)!.priority==='urgent'?'unassigned-urgent':'unassigned-ordinary'}))};
  const planId=randomUUID(),forecastId=randomUUID(),workloadId=randomUUID(),revision=Number(state.next_plan_revision),anchor=row.input.settings!.plannedStartAt;
  await tx.query(`INSERT INTO tawsel.plan_revisions (tenant_id,driver_id,plan_id,job_id,revision,fingerprint,candidate,state,route_policy) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[row.tenant_id,row.driver_id,planId,row.job_id,revision,row.fingerprint,candidate,planState,routePolicy]);
  await tx.query(`INSERT INTO tawsel.forecast_revisions (tenant_id,forecast_id,plan_id,workload_id,time_origin,expected_finish_at) VALUES ($1,$2,$3,$4,$5,$6)`,
   [row.tenant_id,forecastId,planId,workloadId,anchor,candidate.status==='complete'?instant(anchor,candidate.finishOffsetSeconds):null]);
  for(const member of row.input.members){
   const index=candidate.visits.findIndex(v=>v.taskId===member.taskId),visit=candidate.visits[index];
   await tx.query(`INSERT INTO tawsel.forecast_members (tenant_id,forecast_id,attempt_id,task_id,dispatch_cycle_id,source_revision,assignment_revision,pin_revision,
    membership,exclusion_reason,position,expected_arrival_at,expected_completion_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
   [row.tenant_id,forecastId,member.attemptId,member.taskId,member.dispatchCycleId,member.sourceRevision,member.assignmentRevision,member.pinRevision,
    visit?'assigned':member.eligible?'unassigned':'excluded',member.exclusionReason,visit?index+1:null,visit?instant(anchor,visit.arrivalOffsetSeconds):null,
    visit?instant(anchor,visit.arrivalOffsetSeconds+visit.waitingSeconds+visit.serviceEstimateSeconds):null]);
  }
  await tx.query(`UPDATE tawsel.planning_jobs SET status=$3,candidate=$4,plan_id=$5,lease_id=null,lease_until=null,last_error=null,finished_at=clock_timestamp() WHERE tenant_id=$1 AND job_id=$2`,[row.tenant_id,row.job_id,candidate.status,candidate,planId]);
  await tx.query(`UPDATE tawsel.planning_states SET current_plan_id=$3,next_plan_revision=next_plan_revision+1 WHERE tenant_id=$1 AND driver_id=$2`,[row.tenant_id,row.driver_id,planId]);
  // Only identity metadata is shared. Never send a mixed-source route/workload
  // or task IDs to an integration owning only some of the driver's work.
  for(const recipient of [...new Set(row.input.members.flatMap(m=>m.integrationId?[m.integrationId]:[]))].sort()){
   await tx.query(`INSERT INTO tawsel.outbox_intents (tenant_id,event_id,source_id,action_id,recipient_id,event_type,payload_version,payload)
    VALUES ($1,$2,$3,$4,$5,'plan.revisionPublished','1.0.0',$6)`,[row.tenant_id,randomUUID(),row.source_id,row.action_id,recipient,
    {jobId:row.job_id,planId,driverId:row.driver_id,revision,forecastId,workloadId,state:planState,status:candidate.status,policyValidated:true}]);
  }
  return true;
 });
}
export async function runPlanningOnce(pool:Pool,planner:Planner,options:{leaseMs?:number;maxAttempts?:number;signal?:AbortSignal}={}):Promise<boolean> {
 const migrated=await materializeLegacyIntent(pool),leaseMs=options.leaseMs??90_000;
 const job=await claimPlanningJob(pool,leaseMs);
 if(!job)return migrated;
 // The entire Engine request and response body run after claim COMMIT, with no
 // transaction or checked-out connection. Deadline leaves time for completion.
 let outcome:Parameters<typeof persistPlanningResult>[2];
 try {
  const timeout=AbortSignal.timeout(Math.max(1,leaseMs-100));
  const signal=options.signal?AbortSignal.any([timeout,options.signal]):timeout;
  const candidate=await planRoute(job.input,planner,signal);
  let roadRoute:RouteResult|null=null;
  if(planner.route&&candidate.visits.length){
   const settings=job.input.settings!,coordinates=[settings.origin.coordinates,...candidate.visits.map(visit=>visit.coordinates),...(settings.endpoint.kind==='last-customer'?[]:[settings.endpoint.coordinates])];
   try{
    const road=await planner.route({mode:settings.mode,coordinates},AbortSignal.any([signal,AbortSignal.timeout(Math.max(1,Math.min(3000,leaseMs/10)))]));
    validateModel('RouteResult',road,true);
    if(road.mode===settings.mode&&road.legs.length===coordinates.length-1)roadRoute=road;
   }catch{ /* Road display is optional; do not discard a valid plan if unavailable. */ }
  }
  outcome={candidate,roadRoute};
 }catch(error){outcome={error:error instanceof EngineError?error.toJSON():{code:'provider_error',provider:'boundary'}};}
 await persistPlanningResult(pool,job,outcome,options.maxAttempts??3);
 return true;
}
