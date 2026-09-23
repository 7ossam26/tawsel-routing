import type { Transaction } from '../db/transaction.js';
import type { Input, Member } from '../planning/models.js';

export class DepartureCapacityError extends Error {
 readonly code='capacity_exceeded';readonly statusCode=409;
 constructor(){super('تجاوزت الإضافة حد المحطات؛ لم يُقبل أي عمل إضافي.');}
}

/** Shared admission boundary for receipt, source/pin resolution and independent
 * intake. enqueuePlanning invokes it in the accepting command, never a worker.
 * Reservations, not an old plan's time horizon, establish active admission. */
export async function admitActiveWork(tx:Transaction,input:Input,sourceId:string,actionId:string){
 const round=(await tx.query<{round_id:string}>(`SELECT round_id FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND ended_at IS NULL`,[input.tenantId,input.driverId])).rows[0];
 if(!round)return false;
 const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
 const members=input.members.filter(m=>m.exclusionReason!=='resolved-or-paused'&&m.coordinates&&(!m.earliestAt||Date.parse(m.earliestAt)<=now.getTime())&&
  (input.accountKind==='personal'||(m.reservationState==='remaining'&&m.exclusionReason!=='not-held')));
 const reserved=Number((await tx.query(`SELECT count(*) AS n FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND driver_id=$2 AND state='remaining'`,[input.tenantId,input.driverId])).rows[0].n);
 if((input.accountKind==='personal'?members.length:reserved)>50)throw new DepartureCapacityError();
 const prior=Number((await tx.query('SELECT count(*) AS n FROM tawsel.round_admissions WHERE tenant_id=$1 AND round_id=$2',[input.tenantId,round.round_id])).rows[0].n);
 await admitMembers(tx,input.tenantId,input.driverId,round.round_id,members,sourceId,actionId,'active-admission');
 const after=Number((await tx.query('SELECT count(*) AS n FROM tawsel.round_admissions WHERE tenant_id=$1 AND round_id=$2',[input.tenantId,round.round_id])).rows[0].n);
 return after>prior;
}

/** Caller owns the driver/task guards. Immutable admission identifies exactly
 * which source/assignment/pin entered execution; later pin correction is separate. */
export async function admitMembers(tx:Transaction,tenantId:string,driverId:string,roundId:string,members:Member[],sourceId:string,actionId:string,boundary:'start'|'active-admission') {
 for(const m of [...members].sort((a,b)=>a.taskId.localeCompare(b.taskId))){
  const inserted=await tx.query(`INSERT INTO tawsel.round_admissions
   (tenant_id,driver_id,round_id,task_id,attempt_id,dispatch_cycle_id,source_revision,assignment_revision,pin_revision,boundary,source_id,action_id)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING RETURNING admitted_at`,
  [tenantId,driverId,roundId,m.taskId,m.attemptId,m.dispatchCycleId,m.sourceRevision,m.assignmentRevision,m.pinRevision,boundary,sourceId,actionId]);
  if(!inserted.rowCount)continue;
  if(m.dispatchCycleId)await tx.query('UPDATE tawsel.b2b_dispatch_cycles SET departure_at=COALESCE(departure_at,$3) WHERE tenant_id=$1 AND dispatch_cycle_id=$2',[tenantId,m.dispatchCycleId,inserted.rows[0].admitted_at]);
  else await tx.query('UPDATE tawsel.b2c_tasks SET departure_at=COALESCE(departure_at,$3) WHERE tenant_id=$1 AND task_id=$2',[tenantId,m.taskId,inserted.rows[0].admitted_at]);
 }
}
