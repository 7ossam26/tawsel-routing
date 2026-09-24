import {deliveryFor} from '../outcomes/delivery.js';
import type {Pool} from 'pg';
import {AccessDenied,withAccess,type AccessSession,type AuthenticatedPrincipal,type ResourcePolicy} from '../access/service.js';
import type {Transaction} from '../db/transaction.js';
import {ownDriver} from '../current/state.js';
import {ownRound} from '../devices/state.js';
import {uuid} from '../devices/models.js';
import type {RoundRow} from '../rounds/models.js';
import type {OutcomeRecord} from '../outcomes/models.js';
import {lockDriver} from '../returns/state.js';
import {requireCorrection,type Availability} from './models.js';
export const correctionPolicy:ResourcePolicy=[{capability:'correction.own',ownership:'own-driver'}];
const messages:Record<Availability['constraints'][number],string>={
 'closed-workday':'انتهى يوم العمل؛ السجل محفوظ للمراجعة.',
 'dependent-receipt':'أكد الفرع استلامًا أو تصرفًا في القطع؛ السجل محفوظ والمراجعة التجارية لدى الشركة.',
 'dependent-redispatch':'بدأت دورة إرسال أخرى؛ السجل محفوظ والمراجعة التجارية لدى الشركة.',
 'claimed-handover':'القطع مرتبطة بتسليم فرع جارٍ؛ أكمل تأكيد الاستلام وراجع الشركة بشأن الاختلاف.',
 'changed-assignment':'تغيّرت حيازة الشحنة؛ حدّث التفاصيل.',
 'changed-source':'تغيّرت بيانات المصدر؛ حدّث التفاصيل.',
 'changed-attempt':'بدأت محاولة لاحقة؛ راجع سجل المحاولات.',
 'not-current-owner':'التنفيذ على هاتف آخر؛ افتح الحالة الحالية.',
 'correction-not-authorized':'التصحيح غير متاح لهذا الحساب.',
 'outcome-required':'لا توجد نتيجة مسجلة لتصحيحها.'
};
/** Read only after taking the same driver/workday/assignment/task locks as receipt. */
export async function correctionState(tx:Transaction,a:AccessSession,attemptId:string,deviceId:string,allowMissing=false){
 const admission=(await tx.query(`SELECT d.*,p.latest FROM tawsel.round_admissions d JOIN tawsel.planning_attempts p USING(tenant_id,attempt_id)
 WHERE d.tenant_id=$1 AND d.driver_id=$2 AND d.attempt_id=$3 ORDER BY d.admitted_at DESC LIMIT 1`,[a.context.tenantId,ownDriver(a),attemptId])).rows[0];
 if(!admission)throw new AccessDenied(true);
 const round=await ownRound(tx,a,admission.round_id);
 const latest=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 ORDER BY device_generation DESC LIMIT 1',[round.tenant_id,round.driver_id])).rows[0]!;
 const effective=(await tx.query<{record:OutcomeRecord}>('SELECT record FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND attempt_id=$2 ORDER BY revision DESC LIMIT 1',[round.tenant_id,attemptId])).rows[0]?.record??null;
 const constraints:Availability['constraints']=[];
 const day=(await tx.query('SELECT ended_at FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[round.tenant_id,round.workday_id])).rows[0];
 if(day.ended_at)constraints.push('closed-workday');
 if(latest.owner_device_id!==deviceId)constraints.push('not-current-owner');
 if(!a.effectiveCapabilities.includes('correction.own'))constraints.push('correction-not-authorized');
 if(admission.dispatch_cycle_id){
  if((await tx.query('SELECT 1 FROM tawsel.retry_dependencies WHERE tenant_id=$1 AND dispatch_cycle_id=$2',[round.tenant_id,admission.dispatch_cycle_id])).rowCount)constraints.push('dependent-receipt');
  const cycle=(await tx.query('SELECT latest FROM tawsel.b2b_dispatch_cycles WHERE tenant_id=$1 AND dispatch_cycle_id=$2',[round.tenant_id,admission.dispatch_cycle_id])).rows[0];
  if(!cycle?.latest)constraints.push('dependent-redispatch');
  if((await tx.query(`SELECT 1 FROM tawsel.branch_activities b JOIN tawsel.return_items i ON i.tenant_id=b.tenant_id AND i.request_id=b.request_id
   WHERE b.tenant_id=$1 AND b.active AND i.dispatch_cycle_id=$2 AND EXISTS (SELECT 1 FROM jsonb_array_elements(b.record->'claims') claim WHERE claim->>'itemId'=i.item_id::text)`,[round.tenant_id,admission.dispatch_cycle_id])).rowCount)constraints.push('claimed-handover');
 }
 const task=(await tx.query(`SELECT t.*,c.assignment_revision FROM tawsel.location_tasks t LEFT JOIN tawsel.b2b_dispatch_cycles c ON c.tenant_id=t.tenant_id AND c.dispatch_cycle_id=t.dispatch_cycle_id WHERE t.tenant_id=$1 AND t.task_id=$2`,[round.tenant_id,admission.task_id])).rows[0];
 if(!task||task.driver_id!==round.driver_id||task.dispatch_cycle_id!==admission.dispatch_cycle_id||Number(task.assignment_revision??0)!==Number(admission.assignment_revision))constraints.push('changed-assignment');
 if(!task||Number(task.source_revision)!==Number(admission.source_revision))constraints.push('changed-source');
 if(!admission.latest)constraints.push('changed-attempt');
 if(!effective&&!allowMissing)constraints.push('outcome-required');
 const commercial=constraints.some(c=>['closed-workday','dependent-receipt','dependent-redispatch','claimed-handover'].includes(c));
 const original=(await tx.query<{record:OutcomeRecord}>('SELECT record FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND attempt_id=$2 ORDER BY revision LIMIT 1',[round.tenant_id,attemptId])).rows[0]?.record??null;
 const delivery=await deliveryFor(tx,round.tenant_id,admission.task_id,Number(admission.source_revision),admission.dispatch_cycle_id,attemptId);
 const view:Availability={delivery,originalOutcome:original,executionRoundId:latest.round_id,roundId:round.round_id,taskId:admission.task_id,attemptId,effectiveOutcomeRevision:effective?.revision??0,effectiveOutcome:effective,allowed:constraints.length===0,constraints,nextSteps:commercial?['view-history','erp-commercial-review']:constraints.length?['refresh-state','view-history']:['view-history'],message:constraints[0]?messages[constraints[0]]:'يمكنك تصحيح خطأ التسجيل مع حفظ السجل الأصلي.'};
 requireCorrection('Availability',view);return {view,round,latest,admission};
}
export async function availability(pool:Pool,principal:AuthenticatedPrincipal,attemptId:string,deviceId:string){
 uuid(attemptId);uuid(deviceId);return withAccess(pool,principal,async(a,tx)=>{
  await lockDriver(tx,a.context.tenantId,ownDriver(a));return (await correctionState(tx,a,attemptId,deviceId)).view;
 });
}
