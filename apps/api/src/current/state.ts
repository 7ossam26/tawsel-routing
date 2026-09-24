import type { AccessSession, ResourcePolicy } from '../access/service.js';
import { AccessDenied } from '../access/service.js';
import type { Transaction } from '../db/transaction.js';
import type { Input } from '../planning/models.js';
import type { RoundRow } from '../rounds/models.js';
import { CurrentError, type Activity, type PhysicalOrigin, type Selection } from './models.js';
export const own:ResourcePolicy=[{capability:'execution.own',ownership:'own-driver'}];
export function ownDriver(a:AccessSession){
 if(a.context.principalKind!=='account'||!a.context.driverId)throw new AccessDenied();
 a.requireCapability(own);return a.context.driverId;
}
export async function activity(tx:Transaction,tenantId:string,roundId:string):Promise<Activity|null>{
 const r=(await tx.query<{task_id:string;attempt_id:string;stage:Activity['stage'];revision:string;heading:Activity['heading'];arrival:Activity['arrival']}>(`SELECT * FROM tawsel.execution_attempts WHERE tenant_id=$1 AND round_id=$2 AND stage IN ('heading','arrived')`,[tenantId,roundId])).rows[0];
 return r?{taskId:r.task_id,attemptId:r.attempt_id,stage:r.stage,revision:Number(r.revision),heading:r.heading,arrival:r.arrival}:null;
}
export async function physicalOrigin(tx:Transaction,tenantId:string,driverId:string):Promise<PhysicalOrigin|null>{
 return (await tx.query<{origin:PhysicalOrigin}>('SELECT origin FROM tawsel.physical_origin_history WHERE tenant_id=$1 AND driver_id=$2 ORDER BY revision DESC LIMIT 1',[tenantId,driverId])).rows[0]?.origin??null;
}
/** Caller holds the driver lock. Authority is checked again under the lock. */
export async function eligibleTarget(tx:Transaction,a:AccessSession,r:RoundRow,input:Input,p:Selection){
 a.assertScope({tenantId:r.tenant_id,driverId:r.driver_id});
 const m=input.members.find(m=>m.taskId===p.taskId&&m.attemptId===p.attemptId);
 if(!m)throw new CurrentError('lifecycle_forbidden',409,'المحطة ليست ضمن العمل المتاح لك.');
 a.requireResource(own,{tenant_id:r.tenant_id,driver_id:r.driver_id,branch_id:m.branchId,integration_id:m.integrationId});
 const admitted=(await tx.query('SELECT 1 FROM tawsel.round_admissions WHERE tenant_id=$1 AND round_id=$2 AND attempt_id=$3 AND task_id=$4',[r.tenant_id,r.round_id,p.attemptId,p.taskId])).rowCount;
 const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
 if(!admitted||!m.eligible||!m.departureAt||(m.earliestAt&&Date.parse(m.earliestAt)>now.getTime()))throw new CurrentError('lifecycle_forbidden',409,'المحطة غير متاحة للتنفيذ الآن.');
 if(m.dispatchCycleId&&(await tx.query('SELECT 1 FROM tawsel.retry_dependencies WHERE tenant_id=$1 AND dispatch_cycle_id=$2 LIMIT 1',[r.tenant_id,m.dispatchCycleId])).rowCount)throw new CurrentError('lifecycle_forbidden',409,'سُجّل استلام أو تصرف؛ القطع ليست متاحة للتوصيل.');
 if(m.sourceRevision!==p.expectedSourceRevision||m.assignmentRevision!==p.expectedAssignmentRevision||m.pinRevision!==p.expectedPinRevision)throw new CurrentError('stale_revision',409,'تغيّرت بيانات المحطة؛ حدّثها قبل المتابعة.');
 return m;
}
