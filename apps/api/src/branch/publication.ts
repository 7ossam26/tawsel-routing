import {randomUUID} from 'node:crypto';
import type {Transaction} from '../db/transaction.js';
import {planningState,snapshot,fingerprint} from '../planning/queue.js';
import type {BranchActivity} from './models.js';
/** The branch segment has exactly one active stop. Customer slots stay reserved
 * for admission, and their forecast membership is explicitly paused. */
export async function publishBranch(tx:Transaction,tenant:string,driver:string,b:BranchActivity,source:string,action:string){
 const state=await planningState(tx,tenant,driver),input=await snapshot(tx,state);
 const planId=randomUUID(),forecastId=randomUUID(),workloadId=randomUUID();
 const routePolicy={version:1,method:'branch-service',orderedTaskIds:[],exceptions:[],branchStop:{segmentId:b.segmentId,branchId:b.sourceBranchId,coordinates:b.coordinates,serviceEstimateSeconds:b.serviceEstimateSeconds}};
 await tx.query(`UPDATE tawsel.planning_jobs SET status='superseded',lease_id=null,lease_until=null,finished_at=clock_timestamp() WHERE tenant_id=$1 AND driver_id=$2 AND status IN ('pending','running')`,[tenant,driver]);
 await tx.query(`INSERT INTO tawsel.plan_revisions (tenant_id,driver_id,plan_id,revision,fingerprint,state,route_policy,input,source_id,action_id) VALUES ($1,$2,$3,$4,$5,'branch',$6,$7,$8,$9)`,[tenant,driver,planId,state.next_plan_revision,fingerprint(input),routePolicy,input,source,action]);
 await tx.query('INSERT INTO tawsel.forecast_revisions (tenant_id,forecast_id,plan_id,workload_id,time_origin) VALUES ($1,$2,$3,$4,$5)',[tenant,forecastId,planId,workloadId,input.settings!.plannedStartAt]);
 for(const m of input.members){const i=b.retainedSequence.findIndex(s=>s.attemptId===m.attemptId);
  await tx.query(`INSERT INTO tawsel.forecast_members (tenant_id,forecast_id,attempt_id,task_id,dispatch_cycle_id,source_revision,assignment_revision,pin_revision,membership,exclusion_reason,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[tenant,forecastId,m.attemptId,m.taskId,m.dispatchCycleId,m.sourceRevision,m.assignmentRevision,m.pinRevision,i>=0?'paused':'excluded',i>=0?'branch-service':m.exclusionReason,i>=0?i+1:null]);
 }
 await tx.query('UPDATE tawsel.planning_states SET current_plan_id=$3,next_plan_revision=next_plan_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[tenant,driver,planId]);
 for(const recipient of [...new Set(input.members.flatMap(m=>m.integrationId?[m.integrationId]:[]))])await tx.query(`INSERT INTO tawsel.outbox_intents (tenant_id,event_id,source_id,action_id,recipient_id,event_type,payload_version,payload)
 VALUES ($1,$2,$3,$4,$5,'plan.revisionPublished','1.0.0',$6)`,[tenant,randomUUID(),source,action,recipient,{jobId:null,planId,driverId:driver,revision:Number(state.next_plan_revision),forecastId,workloadId,state:'branch',status:'branch',policyValidated:true}]);
 return planId;
}
