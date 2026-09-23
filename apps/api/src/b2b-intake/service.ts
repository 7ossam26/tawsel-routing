import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessSession, type ResourcePolicy, type ResourceScope } from '../access/service.js';
import { canonicalJson, payloadHash } from '../commands/json.js';
import { executeCommandInTransaction, getCommandResult, type ActionEnvelope, type CommandHooks, type Decision } from '../commands/kernel.js';
import { lockInvariants } from '../commands/locks.js';
import { withTransaction, type Transaction } from '../db/transaction.js';
import { authenticateService, identityView, type ServiceBinding } from '../provisioning/credentials.js';
import { record } from '../provisioning/service.js';
import { enqueuePlanning } from '../planning/queue.js';
import { DepartureCapacityError } from '../rounds/departure.js';
import { SourceError, validateCommand, type Operation, type Snapshot, type Task, type AssignmentReference } from './schema.js';

const policy = (capability: 'intake.prepare' | 'assignment.manage'): ResourcePolicy => [{ capability, ownership: 'assigned-branches' }];
const readPolicy: ResourcePolicy = [...policy('intake.prepare'), ...policy('assignment.manage')];
const capability = (operation: string) => operation.startsWith('assignment.') ? 'assignment.manage' as const : 'intake.prepare' as const;
export interface TaskRow extends ResourceScope {
  task_id: string; external_id: string; source_revision: string; payload: Snapshot; payload_hash: string;
  dispatch_cycle_id: string; source_dispatch_cycle_id: string; assignment_revision: string; assignment_hash: string | null;
  state: Task['state']; driver_external_id: string | null; received_at: Date | null; departure_at: Date | null;
  reserved: boolean; planning_pending: boolean; planning_job_status: Task['planningStatus'] | null; execution_confirmed: boolean;
}
const select = `SELECT t.*,s.payload,s.payload_hash,c.dispatch_cycle_id,c.source_dispatch_cycle_id,c.assignment_revision,c.assignment_hash,
 c.state,c.driver_id,c.driver_external_id,c.received_at,c.departure_at,
 CASE WHEN l.task_id IS NOT NULL THEN l.source_revision=t.source_revision ELSE s.payload->'destination'->>'kind'='confirmed-pin' END AS execution_confirmed,
 EXISTS(SELECT 1 FROM tawsel.driver_planned_stops p WHERE p.tenant_id=t.tenant_id AND p.dispatch_cycle_id=c.dispatch_cycle_id AND p.driver_id=c.driver_id AND p.state='remaining') AS reserved,
 EXISTS(SELECT 1 FROM tawsel.intake_replan_intents p WHERE p.tenant_id=t.tenant_id AND p.driver_id=c.driver_id AND p.source_id=t.integration_id) AS planning_pending,
 (SELECT j.status FROM tawsel.planning_states ps JOIN tawsel.planning_jobs j ON j.tenant_id=ps.tenant_id AND j.job_id=ps.latest_job_id WHERE ps.tenant_id=t.tenant_id AND ps.driver_id=c.driver_id) AS planning_job_status
 FROM tawsel.b2b_tasks t JOIN tawsel.b2b_source_snapshots s USING (tenant_id,task_id,source_revision)
 JOIN tawsel.b2b_dispatch_cycles c USING (tenant_id,task_id)
 LEFT JOIN tawsel.task_locations l USING (tenant_id,task_id)`;
const key = (b: ServiceBinding) => [b.tenantId, b.integrationId];
function stableId(b: ServiceBinding, externalId: string) {
  const hex = createHash('sha256').update(canonicalJson(['b2b-task-v1', ...key(b), externalId])).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
async function load(tx: Transaction, b: ServiceBinding, externalId: string, lock = false) {
  return (await tx.query<TaskRow>(`${select} WHERE t.tenant_id=$1 AND t.integration_id=$2 AND t.external_id=$3${lock ? ' FOR UPDATE OF t,c' : ''}`, [...key(b), externalId])).rows[0];
}
export function view(row: TaskRow): Task {
  return { taskId: row.task_id, dispatchCycleId: row.dispatch_cycle_id, externalId: row.external_id,
    sourceDispatchCycleId: row.source_dispatch_cycle_id, sourceRevision: Number(row.source_revision), assignmentRevision: Number(row.assignment_revision),
    state: row.state, driverId: row.driver_id, driverExternalId: row.driver_external_id, receivedAt: row.received_at?.toISOString() ?? null,
    editable: row.departure_at === null, planningEligible: row.state === 'held' && row.reserved,
    planningStatus: row.state === 'held' ? row.planning_job_status ?? (row.planning_pending ? 'pending' : 'not-requested') : 'not-requested',
    locationReadiness: row.execution_confirmed ? 'confirmed' : 'needs-resolution', snapshot: row.payload };
}
export function rejection(command: ActionEnvelope, error: SourceError): Decision {
  const problem = { type: `https://schemas.tawsel.invalid/problems/${error.code.replaceAll('_','-')}`, title: 'Source command rejected',
    code: error.code, status: error.statusCode, detail: error.message, actionId: command.actionId, correlationId: randomUUID(), retryable: false };
  return { status: 'rejected', problem, response: { status: error.statusCode, body: problem }, summary: { code: error.code }, audit: { code: error.code } };
}
function fail(code: SourceError['code'], message: string, status = 409): never { throw new SourceError(code, status, message); }

async function branch(tx: Transaction, b: ServiceBinding, access: AccessSession, externalId: string, cap: 'intake.prepare' | 'assignment.manage') {
  const mapped = await record(tx, b, 'branch', externalId);
  const id = mapped?.resource_id;
  access.requireResource(policy(cap), id ? { tenant_id: b.tenantId, integration_id: b.integrationId, branch_id: id, driver_id: null } : undefined);
  return id!;
}
/** Discover holders before sorted driver/task locks, then re-read. An unlocked
 * new holder rejects rather than acquiring another driver out of global order. P15
 * must use these same driver/task locks before setting departure_at. */
async function lockTasks(tx: Transaction, b: ServiceBinding, externalIds: string[], extraDrivers: string[] = []) {
  const before: (TaskRow | undefined)[] = [];
  for(const id of externalIds) before.push(await load(tx,b,id));
  const drivers = [...new Set([...extraDrivers,...before.flatMap(r => r?.driver_id ? [r.driver_id] : [])])];
  await lockInvariants(tx, b.tenantId, [...drivers.map(id => ({ kind: 'driver' as const, id })), ...externalIds.map(id => ({ kind: 'task' as const, id: stableId(b,id) }))]);
  const rows = [];
  for (let i=0; i<externalIds.length; i++) {
    const row = await load(tx,b,externalIds[i]!,true);
    if (row?.driver_id && row.driver_id !== before[i]?.driver_id && !drivers.includes(row.driver_id)) fail('stale_revision', 'Assignment changed while acquiring locks; reload and submit a new command.');
    rows.push(row);
  }
  return rows;
}
function assertEditable(row: TaskRow) { if (row.departure_at) fail('departed_edit_forbidden', 'Shipment is frozen by departure; ordinary ERP edits are unavailable.'); }
async function saveSnapshot(tx: Transaction,b: ServiceBinding,command: ActionEnvelope,taskId: string,snapshot: Snapshot,digest: string) {
  await tx.query(`INSERT INTO tawsel.b2b_source_snapshots (tenant_id,task_id,source_revision,payload,payload_hash,source_id,action_id)
    VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)`, [b.tenantId,taskId,snapshot.sourceRevision,canonicalJson(snapshot),digest,b.integrationId,command.actionId]);
  for (const l of snapshot.lines) await tx.query(`INSERT INTO tawsel.b2b_source_lines
    (tenant_id,task_id,source_revision,source_line_id,quantity,unit_due_minor,currency,exponent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
  [b.tenantId,taskId,snapshot.sourceRevision,l.sourceLineId,l.quantity,l.unitDue.amountMinor,l.unitDue.currency,l.unitDue.exponent]);
}
function accepted(b: ServiceBinding,command: ActionEnvelope,tasks: Task[],eventType: string,changed = true): Decision {
  return { status: 'accepted', resourceVersions: {}, response: { status:200,body:{ tasks } }, summary: { tasks: tasks.map(t => ({ taskId:t.taskId,externalId:t.externalId,state:t.state,sourceRevision:t.sourceRevision,assignmentRevision:t.assignmentRevision })) },
    audit: { service:identityView(b),credentialId:b.credentialId,changed,taskIds:tasks.map(t=>t.taskId) },
    intents: changed ? tasks.map(task=>({eventId:randomUUID(),recipientId:b.integrationId,eventType,payloadVersion:'1.0.0',payload:{actionId:command.actionId,task}})) : [] };
}
async function snapshotCommand(tx: Transaction,b: ServiceBinding,access: AccessSession,command: ActionEnvelope): Promise<Decision> {
  const p=command.payload as Snapshot;
  const branchId=await branch(tx,b,access,p.sourceBranchExternalId,'intake.prepare');
  const [old]=await lockTasks(tx,b,[p.externalId]);
  const digest=payloadHash({operationId:command.operationId,payload:p});
  if(old) {
    access.requireResource(policy('intake.prepare'),old);
    if(p.sourceRevision===Number(old.source_revision) && digest===old.payload_hash) return accepted(b,command,[view(old)],'task.snapshotAccepted',false);
    assertEditable(old);
    if(p.sourceRevision<=Number(old.source_revision)) fail(p.sourceRevision===Number(old.source_revision)?'idempotency_conflict':'stale_revision','Source revision already exists; do not overwrite its content.');
    if(p.expectedSourceRevision!==Number(old.source_revision)) fail('stale_revision','expectedSourceRevision must match the accepted snapshot.');
    if(old.branch_id!==branchId || old.source_dispatch_cycle_id!==p.sourceDispatchCycleId) fail('lifecycle_forbidden','Origin branch and dispatch-cycle identity cannot be changed; redispatch belongs to the actual-return workflow.');
    await tx.query('UPDATE tawsel.b2b_tasks SET source_revision=$3 WHERE tenant_id=$1 AND task_id=$2',[b.tenantId,old.task_id,p.sourceRevision]);
  } else {
    if(p.expectedSourceRevision!==0) fail('stale_revision','Initial snapshot requires expectedSourceRevision=0.');
    await tx.query(`INSERT INTO tawsel.b2b_tasks (tenant_id,integration_id,task_id,external_id,branch_id,source_revision) VALUES ($1,$2,$3,$4,$5,$6)`, [...key(b),stableId(b,p.externalId),p.externalId,branchId,p.sourceRevision]);
    await tx.query(`INSERT INTO tawsel.b2b_dispatch_cycles (tenant_id,integration_id,task_id,dispatch_cycle_id,source_dispatch_cycle_id) VALUES ($1,$2,$3,$4,$5)`,[...key(b),stableId(b,p.externalId),randomUUID(),p.sourceDispatchCycleId]);
  }
  await saveSnapshot(tx,b,command,stableId(b,p.externalId),p,digest);
  if(old?.state==='held') {
    const current=(await load(tx,b,p.externalId))!;
    await reserve(tx,b,current);
    await ensureCapacity(tx,b,[current.driver_id!]);
    await queueReplan(tx,b,command,[current.driver_id!]);
  }
  return accepted(b,command,[view((await load(tx,b,p.externalId))!)],'task.snapshotAccepted');
}

async function driver(tx:Transaction,b:ServiceBinding,externalId:string) {
  const mapped=await record(tx,b,'driver',externalId);
  if(!mapped) fail('dependency_missing','driverExternalId must reference an enabled driver provisioned by this source.');
  const found=await tx.query<{driver_id:string;account_id:string}>(`SELECT d.driver_id,d.account_id FROM tawsel.drivers d
    JOIN tawsel.accounts a USING(tenant_id,account_id) JOIN tawsel.memberships m USING(tenant_id,account_id)
    WHERE d.tenant_id=$1 AND d.driver_id=$2 AND d.enabled AND a.enabled AND m.enabled`,[b.tenantId,mapped.resource_id]);
  if(!found.rows[0]) fail('forbidden_resource','Driver or membership is disabled.',403);
  return found.rows[0];
}
async function driverBranch(tx:Transaction,b:ServiceBinding,driverId:string,branchId:string) {
  const found=await tx.query(`SELECT 1 FROM tawsel.drivers d JOIN tawsel.membership_branches m USING(tenant_id,account_id)
    WHERE d.tenant_id=$1 AND d.driver_id=$2 AND m.branch_id=$3`,[b.tenantId,driverId,branchId]);
  if(!found.rowCount) fail('forbidden_resource','Driver must belong to every originating branch in the batch.',403);
}
async function reserve(tx:Transaction,b:ServiceBinding,row:TaskRow) {
  const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
  const eligible=row.state==='held' && row.execution_confirmed
    && (!row.payload.earliestAt || Date.parse(row.payload.earliestAt)<=now.getTime());
  if(eligible) await tx.query(`INSERT INTO tawsel.driver_planned_stops (tenant_id,driver_id,stop_id,kind,dispatch_cycle_id,state)
    VALUES ($1,$2,$3,'customer',$3,'remaining') ON CONFLICT (tenant_id,dispatch_cycle_id)
    DO UPDATE SET driver_id=$2,state='remaining'`,[b.tenantId,row.driver_id,row.dispatch_cycle_id]);
  else await tx.query(`UPDATE tawsel.driver_planned_stops SET state='released' WHERE tenant_id=$1 AND dispatch_cycle_id=$2`,[b.tenantId,row.dispatch_cycle_id]);
}
async function ensureCapacity(tx:Transaction,b:ServiceBinding,drivers:string[]) {
  for(const id of [...new Set(drivers)].sort()) {
    const count=Number((await tx.query(`SELECT count(*) AS count FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND driver_id=$2 AND state='remaining'`,[b.tenantId,id])).rows[0]!.count);
    if(count>50) fail('capacity_exceeded','Entire addition rejected: at most 50 remaining planned stops, including branch visits. No shipment in this batch was newly assigned.');
  }
}
async function queueReplan(tx:Transaction,b:ServiceBinding,command:ActionEnvelope,drivers:string[]) {
  for(const id of [...new Set(drivers)].sort()) await enqueuePlanning(tx,b.tenantId,id,b.integrationId,command.actionId);
}
async function assignmentCommand(tx:Transaction,b:ServiceBinding,access:AccessSession,command:ActionEnvelope):Promise<Decision> {
  const p=command.payload as {driverExternalId:string;items:AssignmentReference[];receiptAsserted?:boolean};
  const receiving=command.operationId==='assignment.receiveBatch';
  const cap=receiving?'assignment.manage':'intake.prepare';
  const target=await driver(tx,b,p.driverExternalId);
  const rows=await lockTasks(tx,b,p.items.map(i=>i.externalId),[target.driver_id]);
  const changed:Task[]=[];
  const results:Task[]=[];
  for(let i=0;i<p.items.length;i++) {
    const item=p.items[i]!,row=access.requireResource(policy(cap),rows[i]);
    await driverBranch(tx,b,target.driver_id,row.branch_id!);
    if(item.sourceDispatchCycleId!==row.source_dispatch_cycle_id) fail('lifecycle_forbidden','Unknown dispatch cycle; do not create a replacement cycle to bypass history.');
    const digest=payloadHash({operationId:command.operationId,item,driverExternalId:p.driverExternalId,receiptAsserted:p.receiptAsserted??false});
    if(item.assignmentRevision===Number(row.assignment_revision) && digest===row.assignment_hash) { results.push(view(row)); continue; }
    assertEditable(row);
    if(item.assignmentRevision<=Number(row.assignment_revision)) fail(item.assignmentRevision===Number(row.assignment_revision)?'idempotency_conflict':'stale_revision','Assignment revision already exists.');
    if(item.expectedAssignmentRevision!==Number(row.assignment_revision) || item.expectedSourceRevision!==Number(row.source_revision)) fail('stale_revision','Reload source and assignment revisions before resubmitting.');
    if(row.state==='held' || (row.state==='prepared' && row.driver_id!==target.driver_id)) fail('lifecycle_forbidden','Use explicit predeparture reassignment/withdrawal to change an existing holder or prepared driver.');
    await tx.query(`UPDATE tawsel.b2b_dispatch_cycles SET assignment_revision=$3,assignment_hash=$4,state=$5,driver_id=$6,driver_external_id=$7,
      received_at=CASE WHEN $5='held' THEN clock_timestamp() ELSE NULL END WHERE tenant_id=$1 AND dispatch_cycle_id=$2`,
    [b.tenantId,row.dispatch_cycle_id,item.assignmentRevision,digest,receiving?'held':'prepared',target.driver_id,p.driverExternalId]);
    await reserve(tx,b,(await load(tx,b,item.externalId))!);
    const task=view((await load(tx,b,item.externalId))!);
    changed.push(task);results.push(task);
  }
  await ensureCapacity(tx,b,[target.driver_id]);
  if(receiving && changed.length) await queueReplan(tx,b,command,[target.driver_id]);
  // Return command-time state after replan intent has been recorded.
  const tasks:Task[]=[];
  for(const task of results) tasks.push(view((await load(tx,b,task.externalId))!));
  for(const task of tasks.filter(t=>changed.some(c=>c.taskId===t.taskId)))await tx.query(`INSERT INTO tawsel.b2b_assignment_history (tenant_id,dispatch_cycle_id,assignment_revision,state,source_id,action_id)
    VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,[b.tenantId,task.dispatchCycleId,task.assignmentRevision,canonicalJson(task),b.integrationId,command.actionId]);
  const decision=accepted(b,command,tasks,receiving?'assignment.received':'assignment.prepared',false);
  if(decision.status==='accepted') decision.intents=changed.map(t=>({eventId:randomUUID(),recipientId:b.integrationId,eventType:receiving?'assignment.received':'assignment.prepared',payloadVersion:'1.0.0',payload:{actionId:command.actionId,task:tasks.find(v=>v.taskId===t.taskId)!}}));
  decision.audit.changed=changed.length>0;
  return decision;
}

async function changeAssignment(tx:Transaction,b:ServiceBinding,access:AccessSession,command:ActionEnvelope):Promise<Decision> {
  const p=command.payload as AssignmentReference & {driverExternalId?:string;receiptAsserted?:boolean};
  const reassign=command.operationId==='assignment.reassignBeforeDeparture';
  const target=reassign?await driver(tx,b,p.driverExternalId!):undefined;
  const [locked]=await lockTasks(tx,b,[p.externalId],target?[target.driver_id]:[]);
  const row=access.requireResource(policy('assignment.manage'),locked);
  const digest=payloadHash({operationId:command.operationId,payload:p});
  if(p.assignmentRevision===Number(row.assignment_revision) && digest===row.assignment_hash) return accepted(b,command,[view(row)],reassign?'assignment.reassigned':'assignment.withdrawn',false);
  assertEditable(row);
  if(p.assignmentRevision<=Number(row.assignment_revision)) fail(p.assignmentRevision===Number(row.assignment_revision)?'idempotency_conflict':'stale_revision','Assignment revision already exists.');
  if(p.expectedAssignmentRevision!==Number(row.assignment_revision) || p.expectedSourceRevision!==Number(row.source_revision)) fail('stale_revision','Reload source and assignment revisions before resubmitting.');
  if(p.sourceDispatchCycleId!==row.source_dispatch_cycle_id || !['prepared','held'].includes(row.state)) fail('lifecycle_forbidden','Only existing prepared or held work in this dispatch cycle can be changed.');
  if(target) {
    await driverBranch(tx,b,target.driver_id,row.branch_id!);
    if(target.driver_id===row.driver_id) fail('lifecycle_forbidden','Reassignment requires a different driver.');
    if(p.receiptAsserted!==(row.state==='held')) fail('validation_failed','Held reassignment requires receiptAsserted=true; prepared reassignment requires false.',400);
  }
  await tx.query(`UPDATE tawsel.b2b_dispatch_cycles SET assignment_revision=$3,assignment_hash=$4,state=$5,driver_id=$6,driver_external_id=$7,
    received_at=CASE WHEN $5='held' THEN clock_timestamp() ELSE NULL END WHERE tenant_id=$1 AND dispatch_cycle_id=$2`,
  [b.tenantId,row.dispatch_cycle_id,p.assignmentRevision,digest,target?row.state:'withdrawn',target?.driver_id??null,p.driverExternalId??null]);
  const changed=(await load(tx,b,p.externalId))!;
  await reserve(tx,b,changed);
  await ensureCapacity(tx,b,target?[target.driver_id]:[]);
  if(row.state==='held') await queueReplan(tx,b,command,[row.driver_id!,...(target?[target.driver_id]:[])]);
  const task=view((await load(tx,b,p.externalId))!);
  await tx.query(`INSERT INTO tawsel.b2b_assignment_history (tenant_id,dispatch_cycle_id,assignment_revision,state,source_id,action_id)
    VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,[b.tenantId,row.dispatch_cycle_id,p.assignmentRevision,canonicalJson(task),b.integrationId,command.actionId]);
  return accepted(b,command,[task],reassign?'assignment.reassigned':'assignment.withdrawn');
}
async function urgency(tx:Transaction,b:ServiceBinding,access:AccessSession,command:ActionEnvelope) {
  const p=command.payload as {externalId:string;sourceDispatchCycleId:string;sourceRevision:number;expectedSourceRevision:number;priority:Snapshot['priority']};
  const [locked]=await lockTasks(tx,b,[p.externalId]);
  const row=access.requireResource(policy('intake.prepare'),locked);
  const digest=payloadHash({operationId:command.operationId,payload:p});
  if(p.sourceRevision===Number(row.source_revision) && digest===row.payload_hash) return accepted(b,command,[view(row)],'task.urgencyChanged',false);
  assertEditable(row);
  if(p.sourceRevision<=Number(row.source_revision)) fail(p.sourceRevision===Number(row.source_revision)?'idempotency_conflict':'stale_revision','Source revision already exists.');
  if(p.expectedSourceRevision!==Number(row.source_revision)) fail('stale_revision','expectedSourceRevision must match the accepted source snapshot.');
  if(p.sourceDispatchCycleId!==row.source_dispatch_cycle_id) fail('lifecycle_forbidden','Unknown dispatch cycle.');
  const snapshot={...row.payload,sourceRevision:p.sourceRevision,expectedSourceRevision:p.expectedSourceRevision,priority:p.priority};
  await saveSnapshot(tx,b,command,row.task_id,snapshot,digest);
  await tx.query('UPDATE tawsel.b2b_tasks SET source_revision=$3 WHERE tenant_id=$1 AND task_id=$2',[b.tenantId,row.task_id,p.sourceRevision]);
  if(row.state==='held') await queueReplan(tx,b,command,[row.driver_id!]);
  return accepted(b,command,[view((await load(tx,b,p.externalId))!)],'task.urgencyChanged');
}

export class B2bIntakeService {
  constructor(readonly pool: Pool, readonly observe?: Pick<CommandHooks,'afterWrite'>) {}
  async command(authorization: string | undefined, operation: Operation, value: unknown) {
    validateCommand(operation,value);
    const command=JSON.parse(canonicalJson(value)) as ActionEnvelope;
    return withTransaction(this.pool,async tx=>{
      const b=await authenticateService(tx,authorization,false,capability(operation));
      return AccessSession.inTransaction(tx,{kind:'integration',integrationId:b.integrationId},async access=>{
        access.assertScope(command.context);
        return executeCommandInTransaction(tx,access.commandScope,command,{
          async authorize() {
            access.requireCapability(policy(capability(operation)));
            if(operation==='intake.submitSnapshot') await branch(tx,b,access,(command.payload as Snapshot).sourceBranchExternalId,'intake.prepare');
            else {
              const ids=Array.isArray(command.payload.items)?(command.payload.items as AssignmentReference[]).map(i=>i.externalId):[command.payload.externalId as string];
              for(const id of ids) access.requireResource(policy(capability(operation)),await load(tx,b,id));
            }
          },
          async writeDomain() {
            try {
              if(operation==='intake.submitSnapshot') return await snapshotCommand(tx,b,access,command);
              if(operation==='intake.prepare' || operation==='assignment.receiveBatch') return await assignmentCommand(tx,b,access,command);
              if(operation==='assignment.withdraw' || operation==='assignment.reassignBeforeDeparture') return await changeAssignment(tx,b,access,command);
              if(operation==='intake.setUrgencyBeforeDeparture') return await urgency(tx,b,access,command);
              throw new Error('Operation not implemented');
            } catch(error) { if(error instanceof SourceError) return rejection(command,error); if(error instanceof DepartureCapacityError)return rejection(command,new SourceError(error.code,error.statusCode,error.message)); throw error; }
          },
          async writeProgress() { /* No execution outcome is implied by intake. */ },
          ...this.observe
        });
      });
    });
  }
  async get(authorization: string | undefined, externalId: string) {
    if(!externalId || externalId.length>256) throw new SourceError('validation_failed',400,'externalId required (1–256 characters).');
    return this.read(authorization,async(tx,b,access)=>view(access.requireResource(readPolicy,await load(tx,b,externalId))));
  }
  async list(authorization:string|undefined,query:{state?:string;driverExternalId?:string;limit?:string;cursor?:string}) {
    const limit=query.limit===undefined?20:Number(query.limit);
    if(!Number.isInteger(limit)||limit<1||limit>100 || (query.state!==undefined&&!['unassigned','prepared','held','withdrawn'].includes(query.state))
      || (query.cursor!==undefined&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(query.cursor))
      || (query.driverExternalId!==undefined&&(!query.driverExternalId.length||query.driverExternalId.length>256))) throw new SourceError('validation_failed',400,'Invalid intake list filter or cursor.');
    return this.read(authorization,async(tx,_b,access)=>{
      const scoped=access.sqlPredicate(readPolicy,'t');
      const values:unknown[]=[...scoped.values];
      let where=scoped.text;
      const add=(sql:string,value:unknown)=>{values.push(value);where+=` AND ${sql}=$${values.length}`;};
      if(query.state)add('c.state',query.state);
      if(query.driverExternalId)add('c.driver_external_id',query.driverExternalId);
      if(query.cursor){values.push(query.cursor);where+=` AND t.task_id>$${values.length}::uuid`;}
      values.push(limit+1);
      const rows=(await tx.query<TaskRow>(`${select} WHERE ${where} ORDER BY t.task_id LIMIT $${values.length}`,values)).rows;
      return {items:rows.slice(0,limit).map(view),...(rows.length>limit?{nextCursor:rows[limit-1]!.task_id}:{})};
    });
  }
  async result(authorization:string|undefined,actionId:string) {
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionId)) throw new SourceError('validation_failed',400,'Invalid action UUID.');
    return this.read(authorization,async(tx,b,access)=>{
      const result=await getCommandResult(tx,{tenantId:b.tenantId,sourceId:b.integrationId},actionId);
      // An uncommitted/unknown action is not durable acceptance. Keep source pending.
      if(!result) return {actionId,status:'pending' as const};
      if(!Object.hasOwn(operationsForResult,result.operationId)) throw new SourceError('forbidden_resource',404,'Resource unavailable.');
      access.requireCapability(policy(capability(result.operationId)));
      const tasks=result.summary.tasks as {taskId:string}[]|undefined;
      for(const task of tasks??[]) {
        const row=(await tx.query<TaskRow>(`${select} WHERE t.tenant_id=$1 AND t.integration_id=$2 AND t.task_id=$3`,[...key(b),task.taskId])).rows[0];
        access.requireResource(readPolicy,row);
      }
      return {actionId,status:result.receipt.businessStatus,result};
    });
  }
  private async read<T>(authorization: string | undefined,work:(tx:Transaction,b:ServiceBinding,access:AccessSession)=>Promise<T>) {
    return withTransaction(this.pool,async tx=>{
      // Either intake grant can read its own source; no identity.provision prerequisite.
      let b:ServiceBinding;
      try { b=await authenticateService(tx,authorization,false,'intake.prepare'); }
      catch(error) { if((error as {code?:string}).code!=='forbidden_resource') throw error; b=await authenticateService(tx,authorization,false,'assignment.manage'); }
      return AccessSession.inTransaction(tx,{kind:'integration',integrationId:b.integrationId},access=>work(tx,b,access));
    });
  }
}
const operationsForResult={'intake.submitSnapshot':true,'intake.prepare':true,'assignment.receiveBatch':true,'assignment.withdraw':true,'assignment.reassignBeforeDeparture':true,'intake.setUrgencyBeforeDeparture':true};
