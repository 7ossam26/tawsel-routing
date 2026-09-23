import { randomUUID } from 'node:crypto';
import { payloadHash } from '../commands/json.js';
import type { Transaction } from '../db/transaction.js';
import type { Input, Member, StateRow, JobRow, Job } from './models.js';
import { admitActiveWork } from '../rounds/departure.js';

/** Caller holds tenant access/revocation lock, then P05 driver invariant lock.
 * Every future target/manual/outcome writer must take that driver lock, advance
 * execution/manual revision as appropriate and enqueue in its own transaction. */
export async function planningState(tx:Transaction,tenantId:string,driverId:string):Promise<StateRow> {
 await tx.query('INSERT INTO tawsel.planning_states (tenant_id,driver_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[tenantId,driverId]);
 return (await tx.query<StateRow>('SELECT * FROM tawsel.planning_states WHERE tenant_id=$1 AND driver_id=$2 FOR UPDATE',[tenantId,driverId])).rows[0]!;
}
interface TaskRow {
 task_id:string; kind:'personal'|'company'; branch_id:string|null; integration_id:string|null;
 source_revision:string; assignment_revision:string|null; dispatch_cycle_id:string|null;
 original:{kind:string;coordinates?:Member['coordinates']}; state:string|null; departure_at:Date|null; earliest_at:Date|null;
 location_revision:string|null; pin_source_revision:string|null; latitude:number|null;longitude:number|null;
 priority:'ordinary'|'urgent'|null; reservation_state:string|null; attempt_id:string; outcome_id:string|null; deferred:boolean|null;
}
export async function snapshot(tx:Transaction,state:StateRow):Promise<Input> {
 const ids=[state.tenant_id,state.driver_id];
 // Allocate initial identities only. Explicit retry owns successor creation;
 // planning never resets an attempt or fabricates execution timestamps.
 await tx.query(`INSERT INTO tawsel.planning_attempts (tenant_id,attempt_id,task_id,b2c_task_id,dispatch_cycle_id)
  SELECT tenant_id,gen_random_uuid(),task_id,CASE WHEN kind='personal' THEN task_id END,dispatch_cycle_id
  FROM tawsel.location_tasks t WHERE tenant_id=$1 AND driver_id=$2 AND NOT EXISTS
   (SELECT 1 FROM tawsel.planning_attempts a WHERE a.tenant_id=t.tenant_id AND a.task_id=t.task_id AND (a.dispatch_cycle_id=t.dispatch_cycle_id OR a.b2c_task_id=t.task_id)) ON CONFLICT DO NOTHING`,ids);
 const rows=(await tx.query<TaskRow>(`SELECT t.*,l.revision AS location_revision,l.source_revision AS pin_source_revision,l.latitude,l.longitude,
  c.assignment_revision,COALESCE(e.urgency,s.payload->>'priority') AS priority,p.state AS reservation_state,a.attempt_id,o.outcome_id,
  GREATEST(t.earliest_at,e.earliest_at) AS earliest_at,e.deferred
  FROM tawsel.location_tasks t LEFT JOIN tawsel.task_locations l USING(tenant_id,task_id)
  LEFT JOIN tawsel.b2b_dispatch_cycles c ON c.tenant_id=t.tenant_id AND c.dispatch_cycle_id=t.dispatch_cycle_id
  LEFT JOIN tawsel.b2b_source_snapshots s ON s.tenant_id=t.tenant_id AND s.task_id=t.task_id AND s.source_revision=t.source_revision
  LEFT JOIN tawsel.driver_planned_stops p ON p.tenant_id=t.tenant_id AND p.dispatch_cycle_id=t.dispatch_cycle_id AND p.driver_id=t.driver_id
  LEFT JOIN tawsel.task_execution_options e ON e.tenant_id=t.tenant_id AND e.task_id=t.task_id
  JOIN tawsel.planning_attempts a ON a.tenant_id=t.tenant_id AND a.task_id=t.task_id
    AND a.latest AND (a.dispatch_cycle_id=t.dispatch_cycle_id OR a.b2c_task_id=t.task_id)
  LEFT JOIN tawsel.delivery_outcomes o ON o.tenant_id=a.tenant_id AND o.attempt_id=a.attempt_id
  WHERE t.tenant_id=$1 AND t.driver_id=$2 ORDER BY t.task_id,a.attempt_id`,ids)).rows;
 const meta=(await tx.query<{kind:Input['accountKind'];revision:string|null}>(`SELECT t.kind,l.revision FROM tawsel.tenants t
  LEFT JOIN tawsel.location_planning_inputs l ON l.tenant_id=t.tenant_id AND l.driver_id=$2 WHERE t.tenant_id=$1`,ids)).rows[0]!;
 const members:Member[]=rows.map(r=>{
  const coordinates=r.location_revision ? r.pin_source_revision===r.source_revision?{latitude:r.latitude!,longitude:r.longitude!}:null
   :r.original.kind==='confirmed-pin'?r.original.coordinates!:null;
  // Eligibility anchor is explicit and fingerprinted, never Date.now() during
  // publication. Future held work without admission remains not-reserved.
  const exclusionReason:Member['exclusionReason']=r.outcome_id||r.deferred?'resolved-or-paused':r.kind==='company'&&r.state!=='held'?'not-held':!coordinates?'location-unresolved':
   r.earliest_at&&(!state.settings||r.earliest_at.getTime()>Date.parse(state.settings.plannedStartAt))?'future':
   r.kind==='company'&&r.reservation_state!=='remaining'?(r.reservation_state==='completed'||r.reservation_state==='paused'?'resolved-or-paused':'not-reserved'):null;
  return {taskId:r.task_id,attemptId:r.attempt_id,dispatchCycleId:r.dispatch_cycle_id,branchId:r.branch_id,integrationId:r.integration_id,
   sourceRevision:Number(r.source_revision),assignmentRevision:Number(r.assignment_revision??0),pinRevision:Number(r.location_revision??0),coordinates,
   priority:r.priority??'ordinary',earliestAt:r.earliest_at?.toISOString()??null,departureAt:r.departure_at?.toISOString()??null,reservationState:r.reservation_state,
   eligible:exclusionReason===null,exclusionReason,serviceEstimateSeconds:600};
 });
 return {version:1,tenantId:state.tenant_id,driverId:state.driver_id,accountKind:meta.kind,inputRevision:Number(state.input_revision),settingsRevision:Number(state.settings_revision),
  executionRevision:Number(state.execution_revision),manualRevision:Number(state.manual_revision),currentTarget:state.current_target,
  locationInputRevision:Number(meta.revision??0),settings:state.settings&&state.physical_origin?{...state.settings,origin:{kind:state.physical_origin.kind,coordinates:state.physical_origin.coordinates}}:state.settings,
  ...(state.physical_origin?{physicalOrigin:state.physical_origin}:{}),members};
}
export const fingerprint=(input:Input)=>payloadHash(input);
export function blocker(input:Input):Job['blockedReason'] {
 if(!input.settings)return 'settings-required';
 const n=input.members.filter(m=>m.eligible).length;
 if(!n)return 'no-eligible-work';
 return n+(input.settings.endpoint.kind==='branch'?1:0)>50?'capacity-exceeded':null;
}
/** No Engine calls. Inserted together with command acceptance and its intent.
 * Coalesces only pending jobs; a running lease remains fenced until completion.
 * Same fingerprint reuses a stable job, including completed/failed results. */
export async function enqueuePlanning(tx:Transaction,tenantId:string,driverId:string,sourceId:string,actionId:string):Promise<JobRow> {
 const state=await planningState(tx,tenantId,driverId);
 const prior=(await tx.query<{status:string}>('SELECT status FROM tawsel.intake_replan_intents WHERE tenant_id=$1 AND driver_id=$2 AND source_id=$3 AND action_id=$4',[tenantId,driverId,sourceId,actionId])).rows[0];
 // A new accepted trigger gets a monotonic generation even if work was removed
 // and later restored. Retries of the same intent keep their existing generation.
 if(prior?.status!=='linked'){
  state.input_revision=(await tx.query<{input_revision:string}>(`UPDATE tawsel.planning_states SET input_revision=input_revision+1 WHERE tenant_id=$1 AND driver_id=$2 RETURNING input_revision`,[tenantId,driverId])).rows[0]!.input_revision;
 }
 let input=await snapshot(tx,state);
 if(await admitActiveWork(tx,input,sourceId,actionId)){
  // Newly admitted work may become available after the original preview time.
  // Advance the next estimate's anchor, never the immutable first forecast.
  const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
  if(state.settings&&Date.parse(state.settings.plannedStartAt)<now.getTime())state.settings={...state.settings,plannedStartAt:now.toISOString()};
  const updated=(await tx.query<StateRow>('UPDATE tawsel.planning_states SET execution_revision=execution_revision+1,settings=$3,settings_revision=settings_revision+1 WHERE tenant_id=$1 AND driver_id=$2 RETURNING *',[tenantId,driverId,state.settings])).rows[0]!;
  state.execution_revision=updated.execution_revision;state.settings_revision=updated.settings_revision;
  input=await snapshot(tx,state);
 }
 const hash=fingerprint(input);
 const existing=(await tx.query<JobRow>('SELECT * FROM tawsel.planning_jobs WHERE tenant_id=$1 AND driver_id=$2 AND fingerprint=$3',[tenantId,driverId,hash])).rows[0];
 let job=existing;
 if(!job){
  await tx.query(`UPDATE tawsel.planning_jobs SET status='superseded',finished_at=clock_timestamp() WHERE tenant_id=$1 AND driver_id=$2 AND status='pending'`,[tenantId,driverId]);
  job=(await tx.query<JobRow>(`INSERT INTO tawsel.planning_jobs (tenant_id,driver_id,job_id,source_id,action_id,fingerprint,input,status,blocked_reason)
   VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8) RETURNING *`,[tenantId,driverId,randomUUID(),sourceId,actionId,hash,input,blocker(input)])).rows[0]!;
 }
 await tx.query(`UPDATE tawsel.planning_states SET latest_job_id=$3 WHERE tenant_id=$1 AND driver_id=$2`,[tenantId,driverId,job.job_id]);
 await tx.query(`INSERT INTO tawsel.intake_replan_intents (tenant_id,driver_id,source_id,action_id,status,job_id)
  VALUES ($1,$2,$3,$4,'linked',$5) ON CONFLICT(tenant_id,driver_id,source_id,action_id) DO UPDATE SET status='linked',job_id=$5 WHERE intake_replan_intents.status='pending'`,[tenantId,driverId,sourceId,actionId,job.job_id]);
 return job;
}
