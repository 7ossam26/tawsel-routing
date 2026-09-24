import type {components} from '@tawsel/api-client';
import type {Transaction} from '../db/transaction.js';
import type {AccessSession,ResourcePolicy,ResourceScope} from '../access/service.js';
import type {Action,Task,Progress} from './models.js';
export const policy:ResourcePolicy=[{capability:'monitor.read',ownership:'assigned-branches'},{capability:'execution.own',ownership:'own-driver'}];
export interface TaskRow extends ResourceScope {
 task_id:string;source_revision:string;dispatch_cycle_id:string|null;assignment_revision:string;state:Task['state'];latest:boolean;
 recipient_name:string;recipient_phone:string|null;original:{kind:string;coordinates?:Task['coordinates']};earliest_at:Date|null;departure_at:Date|null;
 attempt_id:string|null;deferred:boolean;pin_revision:string|null;pin_source_revision:string|null;latitude:number|null;longitude:number|null;
 reservation_state:string|null;outcome:Task['outcome'];outcome_revision:string|null;held:number|null;return_required:number;
}
export interface Admission {task_id:string;attempt_id:string;dispatch_cycle_id:string|null;round_id:string;admitted_at:Date;stage:'available'|'heading'|'arrived'|'paused'|'resolved'}
export type Outcome=components['schemas']['OutcomeRecord'];
export async function tasks(tx:Transaction,a:AccessSession,driverId:string|null,branchId?:string,taskId?:string):Promise<TaskRow[]>{
 const f=a.sqlPredicate(policy,'t',5);
 return (await tx.query<TaskRow>(`SELECT t.*,p.attempt_id,COALESCE(e.deferred,false) deferred,
 GREATEST(t.earliest_at,e.earliest_at) earliest_at,l.revision pin_revision,l.source_revision pin_source_revision,l.latitude,l.longitude,
 s.state reservation_state,o.outcome,o.revision outcome_revision,
 CASE WHEN t.dispatch_cycle_id IS NULL THEN NULL ELSE COALESCE(q.held,CASE WHEN o.outcome_id IS NULL AND t.state='held' THEN units.n ELSE 0 END) END::int held,
 COALESCE(q.held,0)::int return_required
 FROM tawsel.monitoring_tasks t
 LEFT JOIN tawsel.planning_attempts p ON p.tenant_id=t.tenant_id AND p.task_id=t.task_id AND p.latest AND p.dispatch_cycle_id IS NOT DISTINCT FROM t.dispatch_cycle_id
 LEFT JOIN tawsel.task_execution_options e ON e.tenant_id=t.tenant_id AND e.task_id=t.task_id AND t.latest
 LEFT JOIN LATERAL(
  SELECT revision,source_revision,latitude,longitude FROM tawsel.task_locations l WHERE l.tenant_id=t.tenant_id AND l.task_id=t.task_id AND t.latest
  UNION ALL SELECT h.revision,(h.snapshot->>'sourceRevision')::bigint,
   (h.snapshot->'pin'->'coordinates'->>'latitude')::double precision,(h.snapshot->'pin'->'coordinates'->>'longitude')::double precision
  FROM tawsel.location_history h WHERE h.tenant_id=t.tenant_id AND h.task_id=t.task_id AND NOT t.latest AND (h.snapshot->>'sourceRevision')::bigint=t.source_revision
  ORDER BY revision DESC LIMIT 1
 ) l ON true
 LEFT JOIN tawsel.driver_planned_stops s ON s.tenant_id=t.tenant_id AND s.dispatch_cycle_id=t.dispatch_cycle_id AND s.driver_id=t.driver_id
 LEFT JOIN tawsel.effective_attempt_outcomes o ON o.tenant_id=p.tenant_id AND o.attempt_id=p.attempt_id
 LEFT JOIN LATERAL(SELECT sum(held) held FROM tawsel.cycle_custody q WHERE q.tenant_id=t.tenant_id AND q.dispatch_cycle_id=t.dispatch_cycle_id) q ON true
 LEFT JOIN LATERAL(SELECT sum(quantity) n FROM tawsel.b2b_source_lines u WHERE u.tenant_id=t.tenant_id AND u.task_id=t.task_id AND u.source_revision=t.source_revision) units ON true
 WHERE t.tenant_id=$1 AND ($2::uuid IS NULL OR t.driver_id=$2) AND ($3::uuid IS NULL OR t.branch_id=$3)
 AND ($4::uuid IS NULL OR t.task_id=$4) AND ${f.text} ORDER BY t.task_id,t.dispatch_cycle_id`,[a.context.tenantId,driverId,branchId??null,taskId??null,...f.values])).rows;
}
export function task(row:TaskRow,now:number):Task{
 const coordinates=row.pin_revision?(row.pin_source_revision===row.source_revision?{latitude:row.latitude!,longitude:row.longitude!}:null):row.original.kind==='confirmed-pin'?row.original.coordinates??null:null;
 return {taskId:row.task_id,dispatchCycleId:row.dispatch_cycle_id,attemptId:row.attempt_id,branchId:row.branch_id,integrationId:row.integration_id,
 sourceRevision:Number(row.source_revision),assignmentRevision:Number(row.assignment_revision),recipientName:row.recipient_name,recipientPhone:row.recipient_phone,coordinates,
 state:row.state,earliestAt:row.earliest_at?.toISOString()??null,deferred:row.deferred,outcome:row.outcome,outcomeRevision:Number(row.outcome_revision??0),heldPieces:row.held,returnRequiredPieces:row.return_required,
 eligible:row.latest&&!row.deferred&&!row.outcome&&!!coordinates&&(!row.earliest_at||row.earliest_at.getTime()<=now)&&(row.state==='personal'||(row.state==='held'&&row.reservation_state==='remaining'))};
}
export async function admissions(tx:Transaction,a:AccessSession,branchId?:string,roundId?:string,workdayId?:string,taskId?:string):Promise<Admission[]>{
 const f=a.sqlPredicate(policy,'t',5);
 return (await tx.query<Admission>(`SELECT d.task_id,d.attempt_id,d.dispatch_cycle_id,d.round_id,d.admitted_at,COALESCE(e.stage,'available') stage
 FROM tawsel.round_admissions d JOIN tawsel.rounds r USING(tenant_id,round_id)
 JOIN tawsel.monitoring_tasks t ON t.tenant_id=d.tenant_id AND t.task_id=d.task_id AND t.dispatch_cycle_id IS NOT DISTINCT FROM d.dispatch_cycle_id AND t.driver_id=d.driver_id
 LEFT JOIN tawsel.execution_attempts e ON e.tenant_id=d.tenant_id AND e.round_id=d.round_id AND e.attempt_id=d.attempt_id
 WHERE ($1::uuid IS NULL OR t.branch_id=$1) AND ($2::uuid IS NULL OR d.round_id=$2) AND ($3::uuid IS NULL OR r.workday_id=$3) AND ($4::uuid IS NULL OR d.task_id=$4) AND ${f.text}
 ORDER BY d.admitted_at,d.round_id,d.attempt_id`,[branchId??null,roundId??null,workdayId??null,taskId??null,...f.values])).rows;
}
export async function outcomes(tx:Transaction,a:AccessSession,attemptIds:string[]):Promise<Outcome[]>{
 const f=a.sqlPredicate(policy,'o',2);
 return (await tx.query<{record:Outcome}>(`SELECT o.record FROM tawsel.delivery_outcomes o WHERE o.attempt_id=ANY($1::uuid[]) AND ${f.text} ORDER BY o.revision,o.outcome_id`,[attemptIds,...f.values])).rows.map(r=>r.record);
}
export function progress(admitted:Admission[],outcomes:Outcome[]):Progress{
 const attempts=new Map<string,Outcome>();for(const o of outcomes)attempts.set(o.attemptId,o);
 const shipments=new Map<string,string>();for(const d of admitted)shipments.set(d.task_id,d.attempt_id);
 const p:Progress={shipments:shipments.size,attempts:new Set(admitted.map(d=>d.attempt_id)).size,processedAttempts:attempts.size,processedShipments:0,fullDeliveredShipments:0,partialShipments:0,failedShipments:0,remainingShipments:0};
 for(const id of shipments.values()){const o=attempts.get(id);if(!o)p.remainingShipments++;else{p.processedShipments++;if(o.outcome==='full')p.fullDeliveredShipments++;else if(o.outcome==='partial')p.partialShipments++;else p.failedShipments++;}}
 return p;
}
/** Sanitized receipt metadata only. A rejected envelope is not authority: it
 * must name a real admission owned by its authenticated source account. */
export async function actions(tx:Transaction,a:AccessSession,rows:TaskRow[]):Promise<Action[]>{
 const scopes=rows.map(r=>({task:r.task_id,cycle:r.dispatch_cycle_id,driver:r.driver_id,revision:Number(r.source_revision)}));
 return (await tx.query<{source_id:string;action_id:string;operation_id:string;received_at:Date;accepted_at:Date|null;business_status:Action['businessStatus']}>(`WITH visible AS (
 SELECT * FROM jsonb_to_recordset($2::jsonb) AS v(task uuid,cycle uuid,driver uuid,revision bigint)), links AS (
 SELECT o.source_id,o.action_id FROM tawsel.delivery_outcomes o JOIN visible v ON v.task=o.task_id AND v.cycle IS NOT DISTINCT FROM o.dispatch_cycle_id AND v.driver=o.driver_id WHERE o.tenant_id=$1
 UNION SELECT s.source_id,s.action_id FROM tawsel.b2b_source_snapshots s JOIN visible v ON v.task=s.task_id AND s.source_revision<=v.revision WHERE s.tenant_id=$1
 UNION SELECT h.source_id,h.action_id FROM tawsel.b2b_assignment_history h JOIN visible v ON v.cycle=h.dispatch_cycle_id WHERE h.tenant_id=$1
 UNION SELECT h.source_id,h.action_id FROM tawsel.task_intake_events h JOIN visible v ON v.task=h.task_id WHERE h.tenant_id=$1
 UNION SELECT h.source_id,h.action_id FROM tawsel.location_history h JOIN visible v ON v.task=h.task_id AND (h.snapshot->>'sourceRevision')::bigint<=v.revision WHERE h.tenant_id=$1
 UNION SELECT h.source_id,h.action_id FROM tawsel.current_activity_history h JOIN tawsel.round_admissions d ON d.tenant_id=h.tenant_id AND d.round_id=h.round_id
  AND (d.task_id::text=h.current_activity->>'taskId' OR d.task_id::text=h.previous_activity->>'taskId')
  JOIN visible v ON v.task=d.task_id AND v.cycle IS NOT DISTINCT FROM d.dispatch_cycle_id AND v.driver=d.driver_id WHERE h.tenant_id=$1
 UNION SELECT h.source_id,h.action_id FROM tawsel.task_eligibility_history h JOIN visible v ON v.task=h.task_id
  JOIN tawsel.planning_attempts p ON p.tenant_id=h.tenant_id AND p.attempt_id::text=h.record->>'attemptId' AND p.dispatch_cycle_id IS NOT DISTINCT FROM v.cycle WHERE h.tenant_id=$1
 UNION SELECT q.source_id,q.action_id FROM tawsel.return_requests q JOIN tawsel.return_items i USING(tenant_id,request_id)
  JOIN visible v ON v.task=i.task_id AND v.cycle=i.dispatch_cycle_id AND v.driver=i.driver_id WHERE q.tenant_id=$1
 UNION SELECT h.source_id,h.action_id FROM tawsel.return_transitions h JOIN visible v ON v.cycle=h.dispatch_cycle_id WHERE h.tenant_id=$1
 UNION SELECT e.source_id,e.action_id FROM tawsel.command_evidence e
 JOIN tawsel.round_admissions d ON d.tenant_id=e.tenant_id AND d.task_id::text=e.envelope->'payload'->>'taskId' AND d.attempt_id::text=e.envelope->'payload'->>'attemptId' AND d.round_id::text=e.envelope->'payload'->>'roundId'
 JOIN tawsel.rounds r ON r.tenant_id=d.tenant_id AND r.round_id=d.round_id AND r.owner_account_id=e.source_id
 JOIN visible v ON v.task=d.task_id AND v.cycle IS NOT DISTINCT FROM d.dispatch_cycle_id AND v.driver=d.driver_id WHERE e.tenant_id=$1)
 SELECT c.source_id,c.action_id,c.operation_id,c.received_at,c.accepted_at,c.business_status FROM tawsel.command_identities c
 JOIN links USING(source_id,action_id) WHERE c.tenant_id=$1 AND c.business_status<>'pending' ORDER BY c.received_at,c.source_id,c.action_id`,[a.context.tenantId,JSON.stringify(scopes)])).rows.map(r=>({sourceId:r.source_id,actionId:r.action_id,operationId:r.operation_id,receivedAt:r.received_at.toISOString(),acceptedAt:r.accepted_at?.toISOString()??null,businessStatus:r.business_status}));
}
