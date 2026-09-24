import type {Transaction} from '../db/transaction.js';
import {AccessDenied,type AccessSession,type ResourcePolicy,type ResourceScope} from '../access/service.js';
import {lockInvariants} from '../commands/locks.js';
import {own} from '../current/state.js';
import {requireReturn,ReturnError,unique,type RequestView,type Item} from './models.js';
export const receiver:ResourcePolicy=[{capability:'return.receive',ownership:'assigned-branches'},{capability:'return.dispose',ownership:'assigned-branches'}];
export interface RequestRow extends ResourceScope {request_id:string;round_id:string;requested_at:Date;driver_id:string;branch_id:string;integration_id:string}
export const policy=(a:AccessSession)=>a.context.principalKind==='integration'?receiver:own;
export async function requestRow(tx:Transaction,a:AccessSession,id:string){
 return a.requireResource(policy(a),(await tx.query<RequestRow>('SELECT * FROM tawsel.return_requests WHERE tenant_id=$1 AND request_id=$2',[a.context.tenantId,id])).rows[0]);
}
/** Receipt/requests share execution's guards, including the original workday.
 * Driver guards serialize across later rounds too; receipt after day-end is valid. */
export async function lockDriver(tx:Transaction,tenant:string,driver:string,roundId?:string){
 await lockInvariants(tx,tenant,[{kind:'driver',id:driver}]);
 const guards=(await tx.query<{task_id:string;dispatch_cycle_id:string|null}>('SELECT task_id,dispatch_cycle_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[tenant,driver])).rows;
 const days=(await tx.query<{workday_id:string}>('SELECT DISTINCT workday_id FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND (ended_at IS NULL OR round_id=$3)',[tenant,driver,roundId??null])).rows;
 await lockInvariants(tx,tenant,[...days.map(d=>({kind:'workday' as const,id:d.workday_id})),...guards.flatMap(g=>g.dispatch_cycle_id?[{kind:'assignment' as const,id:g.dispatch_cycle_id}]:[]),...guards.map(g=>({kind:'task' as const,id:g.task_id}))]);
}
export async function requestView(tx:Transaction,row:RequestRow):Promise<RequestView>{
 const rows=(await tx.query(`SELECT i.*,o.attempt_id,o.source_revision,t.external_id,c.source_dispatch_cycle_id,c.state,c.driver_id AS holder,
 a.latest,q.source_quantity,COALESCE(current_quantity.delivered,0) AS delivered,q.source_quantity-COALESCE(current_quantity.delivered,0) AS held_return_required,COALESCE(b.received,0) AS all_received,COALESCE(b.lost,0) AS all_lost,COALESCE(b.damaged,0) AS all_damaged
 FROM tawsel.return_items i JOIN tawsel.delivery_outcomes o USING(tenant_id,outcome_id)
 JOIN tawsel.planning_attempts a USING(tenant_id,attempt_id)
 JOIN tawsel.b2b_tasks t ON t.tenant_id=i.tenant_id AND t.task_id=i.task_id
 JOIN tawsel.b2b_dispatch_cycles c ON c.tenant_id=i.tenant_id AND c.dispatch_cycle_id=i.dispatch_cycle_id
 JOIN tawsel.outcome_quantities q ON q.tenant_id=i.tenant_id AND q.outcome_id=i.outcome_id AND q.source_line_id=i.source_line_id
 LEFT JOIN tawsel.cycle_custody current_quantity ON current_quantity.tenant_id=i.tenant_id AND current_quantity.dispatch_cycle_id=i.dispatch_cycle_id AND current_quantity.source_line_id=i.source_line_id
 LEFT JOIN tawsel.return_balances b ON b.tenant_id=i.tenant_id AND b.dispatch_cycle_id=i.dispatch_cycle_id AND b.source_line_id=i.source_line_id
 WHERE i.tenant_id=$1 AND i.request_id=$2 ORDER BY i.item_id`,[row.tenant_id,row.request_id])).rows;
 const items:Item[]=rows.map(i=>({itemId:i.item_id,taskId:i.task_id,dispatchCycleId:i.dispatch_cycle_id,outcomeId:i.outcome_id,attemptId:i.attempt_id,sourceLineId:i.source_line_id,externalId:i.external_id,sourceDispatchCycleId:i.source_dispatch_cycle_id,sourceRevision:Number(i.source_revision),revision:Number(i.revision),requested:i.requested,received:i.received,lost:i.lost,damaged:i.damaged,unresolved:i.requested-i.received-i.lost-i.damaged,
 eligibility:!i.latest||i.state!=='held'||i.holder!==row.driver_id?'superseded':i.requested===i.received+i.lost+i.damaged?'settled':'pending',
 custody:{sourceQuantity:i.source_quantity,delivered:i.delivered,held:i.held_return_required-i.all_received-i.all_lost-i.all_damaged,received:i.all_received,lost:i.all_lost,damaged:i.all_damaged}}));
 const result={requestId:row.request_id,driverId:row.driver_id,sourceBranchId:row.branch_id,integrationId:row.integration_id,roundId:row.round_id,requestedAt:row.requested_at.toISOString(),items};requireReturn('RequestView',result);return result;
}
/** Caller holds the same driver guard as a future P22 resume transaction. */
export function confirmation(request:RequestView,claims:{itemId:string;quantity:number}[]){
 requireReturn('ConfirmationQuery',{claims});unique(claims.map(c=>c.itemId));
 const items=claims.map(c=>{const item=request.items.find(i=>i.itemId===c.itemId);if(!item)throw new AccessDenied(true);if(c.quantity>item.requested)throw new ReturnError('validation_failed',400,'الكمية أكبر من المعروض.');
  return {itemId:c.itemId,claimed:c.quantity,confirmed:Math.min(c.quantity,item.received),waiting:Math.max(0,c.quantity-item.received)};});
 const state=items.some(i=>i.waiting>0)?'waiting' as const:'confirmed' as const;
 return {requestId:request.requestId,state,message:state==='waiting'?'بانتظار تأكيد الفرع للقطع التي سلّمتها.':'أكد الفرع استلام القطع المحددة. الباقي ظاهر بحالته.',claims:items};
}
