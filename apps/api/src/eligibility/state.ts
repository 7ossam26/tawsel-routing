import type {Transaction} from '../db/transaction.js';
import type {Member} from '../planning/models.js';
import {denied,type Blocker,type Facts,type Choice} from './policy.js';
import type {State} from './models.js';
export const messages:Record<Blocker,string>={
 'not-held':'الشحنة ليست معك الآن.','different-driver':'المحاولة تخص مندوباً آخر.',
 'receipt-or-disposition':'سُجّل استلام أو تصرف في الشحنة؛ لا يمكن إعادتها للتوصيل.',
 'partial-or-delivered':'لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي.',
 'current-customer':'أكمل العميل الحالي أو غيّر وجهتك صراحةً أولاً.',
 'result-required':'سجّل نتيجة المحاولة قبل طلب إعادة المحاولة.',
 'not-deferred':'هذا العمل ليس بحاجة للإتاحة بلا نتيجة؛ راجع الإجراء المتاح.',
 'earliest-time':'لم يحن وقت الإتاحة بعد.','location-required':'حدّد موقعاً صالحاً أولاً.',
 'capacity':'الجولة بها ٥٠ محطة متبقية؛ أكمل محطة قبل الإضافة.'
};
/** Caller owns the driver lock. Receipt/disposal writers use retry_dependencies
 * under the same assignment/task locks; P21/P22 supply those commands. */
export async function stateFor(tx:Transaction,tenant:string,driver:string,m:Member,current:string|null,remaining:number){
 const option=(await tx.query('SELECT revision,deferred FROM tawsel.task_execution_options WHERE tenant_id=$1 AND task_id=$2',[tenant,m.taskId])).rows[0];
 const outcome=(await tx.query(`SELECT o.outcome_id,o.outcome,o.driver_id FROM tawsel.delivery_outcomes o WHERE tenant_id=$1 AND attempt_id=$2 ORDER BY revision DESC LIMIT 1`,[tenant,m.attemptId])).rows[0];
 const line=(await tx.query(`SELECT COALESCE(sum(q.delivered),0)::int delivered FROM tawsel.outcome_quantities q JOIN tawsel.delivery_outcomes o USING(tenant_id,outcome_id) WHERE NOT EXISTS (SELECT 1 FROM tawsel.delivery_outcomes newer WHERE newer.tenant_id=o.tenant_id AND newer.attempt_id=o.attempt_id AND newer.revision>o.revision) AND o.tenant_id=$1 AND o.task_id=$2 AND o.dispatch_cycle_id=$3`,[tenant,m.taskId,m.dispatchCycleId])).rows[0];
 const cycle=m.dispatchCycleId?(await tx.query('SELECT state,driver_id FROM tawsel.b2b_dispatch_cycles WHERE tenant_id=$1 AND dispatch_cycle_id=$2',[tenant,m.dispatchCycleId])).rows[0]:null;
 const dependency=m.dispatchCycleId?!!(await tx.query('SELECT 1 FROM tawsel.retry_dependencies WHERE tenant_id=$1 AND dispatch_cycle_id=$2 LIMIT 1',[tenant,m.dispatchCycleId])).rowCount:false;
 const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
 const facts:Facts={held:!m.dispatchCycleId||cycle?.state==='held',sameDriver:(!cycle||cycle.driver_id===driver)&&(!outcome||outcome.driver_id===driver),current:current===m.attemptId,deferred:option?.deferred??false,outcome:outcome?.outcome??null,whole:Number(line.delivered)===0,dependency,future:!!m.earliestAt&&Date.parse(m.earliestAt)>now.getTime(),located:!!m.coordinates,remaining};
 facts.needsAdmission=!!m.dispatchCycleId&&cycle?.state==='held'&&!outcome&&m.reservationState!=='remaining';
 const actions={} as State['actions'];for(const choice of ['defer','retry','activate','urgency'] as Choice[]){const blocker=denied(facts,choice);actions[choice]={allowed:blocker===null,blocker,message:blocker?messages[blocker]:null};}
 const state:State={taskId:m.taskId,attemptId:m.attemptId,revision:Number(option?.revision??0),sourceRevision:m.sourceRevision,assignmentRevision:m.assignmentRevision,pinRevision:m.pinRevision,earliestAt:m.earliestAt,urgency:m.priority,deferred:facts.deferred,latestOutcomeId:outcome?.outcome_id??null,actions};
 return {state,facts};
}
