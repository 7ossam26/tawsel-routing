import {AccessDenied,type AccessSession} from '../access/service.js';
import type {Transaction} from '../db/transaction.js';
import {own,ownDriver} from './state.js';

/** Attempt identity freezes the company cycle. The current task projection is
 * deliberately not an authorization anchor for retained execution history. */
export async function authorizeHistoricalAttempt(tx:Transaction,a:AccessSession,attemptId:string){
 const row=(await tx.query(`SELECT p.tenant_id,c.branch_id,c.integration_id
  FROM tawsel.planning_attempts p LEFT JOIN tawsel.b2b_dispatch_cycles c
  ON c.tenant_id=p.tenant_id AND c.dispatch_cycle_id=p.dispatch_cycle_id
  WHERE p.tenant_id=$1 AND p.attempt_id=$2`,[a.context.tenantId,attemptId])).rows[0];
 if(!row)throw new AccessDenied(true);
 a.requireResource(own,{...row,driver_id:ownDriver(a)});
}

/** Accepted audit and rejected envelopes survive response compaction. Inspect
 * every original attempt represented in a response (including a paused previous
 * heading), rather than trusting a caller's current task or replay payload. */
export async function authorizeRetainedExecution(tx:Transaction,a:AccessSession,actionId:string){
 const stored=(await tx.query(`SELECT c.result_summary,c.response_body,h.details,e.envelope
  FROM tawsel.command_identities c LEFT JOIN tawsel.command_audit h USING(tenant_id,source_id,action_id)
  LEFT JOIN tawsel.command_evidence e USING(tenant_id,source_id,action_id)
  WHERE c.tenant_id=$1 AND c.source_id=$2 AND c.action_id=$3 AND c.result_summary IS NOT NULL`,
 [a.context.tenantId,a.context.sourceId,actionId])).rows;
 const attempts=new Set<string>();
 const visit=(value:unknown):void=>{
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
   if((key==='attemptId'||key==='previousAttemptId'||key==='expectedCurrentAttemptId')&&typeof item==='string')attempts.add(item);
   else visit(item);
  }
 };
 for(const row of stored)visit(row);
 for(const id of attempts)await authorizeHistoricalAttempt(tx,a,id);
 // Legacy summaries without attempt metadata may only recover if all original
 // admissions of that task/round are visible; stable task IDs alone grant none.
 if(stored.length&&!attempts.size){
  const summary=stored[0]!.result_summary.summary;
  if(typeof summary.taskId==='string'){
   const admissions=(await tx.query<{attempt_id:string}>(`SELECT attempt_id FROM tawsel.round_admissions
    WHERE tenant_id=$1 AND round_id=$2 AND task_id=$3 AND driver_id=$4`,
   [a.context.tenantId,summary.roundId,summary.taskId,ownDriver(a)])).rows;
   if(!admissions.length)throw new AccessDenied(true);
   for(const row of admissions)await authorizeHistoricalAttempt(tx,a,row.attempt_id);
  }
 }
}
