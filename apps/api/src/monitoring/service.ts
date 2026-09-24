import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,AccessSession,type AuthenticatedPrincipal} from '../access/service.js';
import {withTransaction,type Transaction} from '../db/transaction.js';
import {authenticateService} from '../provisioning/credentials.js';
import {payloadHash} from '../commands/json.js';
import {MonitoringError,requireMonitoring,uuid,type Query,type Selection,type Snapshot,type History,type View} from './models.js';
import {tasks,task,admissions,outcomes,progress,actions,policy,type TaskRow} from './queries.js';
type RoundRow={round_id:string;driver_id:string;workday_id:string;started_at:Date;ended_at:Date|null;owner_account_id:string;owner_device_id:string;device_generation:string};
type Data=Omit<Snapshot,'scopeKey'|'snapshotRevision'|'lastCommittedChange'|'freshness'|'nextCursor'>|Omit<History,'scopeKey'|'snapshotRevision'|'lastCommittedChange'|'freshness'|'nextCursor'>|{action:components['schemas']['MonitoringAction']};
const round=(r:RoundRow)=>({roundId:r.round_id,workdayId:r.workday_id,startedAt:r.started_at.toISOString(),endedAt:r.ended_at?.toISOString()??null});
export type ReadResult={body:View;etag:string;notModified:boolean};
export const matches=(header:string|undefined,etag:string)=>header?.split(',').some(v=>v.trim()==='*'||v.trim().replace(/^W\//,'')===etag)??false;

export class Monitoring {
 constructor(readonly pool:Pool,readonly observe?:(stage:'snapshot'|'tasks'|'projection',tx:Transaction)=>Promise<void>){}
 async read(identity:AuthenticatedPrincipal|{authorization:string|undefined},selection:Selection,query:Query={},ifNoneMatch?:string):Promise<ReadResult>{
  uuid(selection.id);if(selection.sourceId)uuid(selection.sourceId);if(query.branchId)uuid(query.branchId);
  const limit=query.limit??50;if(!Number.isInteger(limit)||limit<1||limit>100)throw new MonitoringError('validation_failed',400,'Page size must be 1–100.');
  for(let attempt=0;attempt<5;attempt++){
   try{return await withTransaction(this.pool,async tx=>{
    const principal='authorization' in identity?{kind:'integration' as const,integrationId:(await authenticateService(tx,identity.authorization,false,'monitor.read')).integrationId}:identity;
    return AccessSession.inTransaction(tx,principal,async a=>{
     a.requireCapability(policy);if(query.branchId)a.assertScope({branchId:query.branchId});
     const scopeKey=payloadHash({version:1,context:a.context,selection,branchId:query.branchId??null});
     // A competing newer replacement causes SQLSTATE 40001, never a late overwrite.
     await tx.query('SELECT revision FROM tawsel.monitoring_views WHERE tenant_id=$1 AND scope_key=$2 FOR UPDATE',[a.context.tenantId,scopeKey]);
     await this.observe?.('snapshot',tx);
     const built=await this.project(tx,a,selection,query);
     await this.observe?.('projection',tx);
     const change=(await tx.query<{recorded_at:Date;correlation_id:string}>(`SELECT recorded_at,correlation_id FROM tawsel.monitoring_change_marks
      WHERE tenant_id=$1 AND (task_id=ANY($2::uuid[]) OR ($3::uuid IS NOT NULL AND task_id IS NULL AND driver_id=$3))
      ORDER BY recorded_at DESC,relation_name,resource_id LIMIT 1`,[a.context.tenantId,built.rows.filter(r=>r.latest).map(r=>r.task_id),built.fullDriver])).rows[0];
     const accepted=built.actions.filter(c=>c.acceptedAt).sort((l,r)=>l.acceptedAt!.localeCompare(r.acceptedAt!)).at(-1);
     const lastCommittedChange=change&&(!accepted||change.recorded_at.toISOString()>=accepted.acceptedAt!)?{recordedAt:change.recorded_at.toISOString(),correlationId:change.correlation_id}
      :accepted?{recordedAt:accepted.acceptedAt!,correlationId:payloadHash({sourceId:accepted.sourceId,actionId:accepted.actionId})}:null;
     const lastReceivedActionAt=built.actions.at(-1)?.receivedAt??null;
     const meaning={...built.data,lastCommittedChange,lastReceivedActionAt};
     const contentHash=payloadHash(meaning);
     const version=(await tx.query<{revision:string}>(`INSERT INTO tawsel.monitoring_views(tenant_id,scope_key,content_hash,revision) VALUES($1,$2,$3,1)
      ON CONFLICT(tenant_id,scope_key) DO UPDATE SET content_hash=excluded.content_hash,
      revision=CASE WHEN monitoring_views.content_hash=excluded.content_hash THEN monitoring_views.revision ELSE monitoring_views.revision+1 END RETURNING revision`,[a.context.tenantId,scopeKey,contentHash])).rows[0]!;
     let offset=0;
     if(query.cursor){
      let c:{scope?:unknown;hash?:unknown;offset?:unknown};
      try{c=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'));}catch{throw new MonitoringError('validation_failed',400,'Invalid cursor.');}
      if(!c||typeof c!=='object'||!Number.isSafeInteger(c.offset)||Number(c.offset)<0||typeof c.scope!=='string'||typeof c.hash!=='string')throw new MonitoringError('validation_failed',400,'Invalid cursor.');
      if(c.scope!==scopeKey||c.hash!==contentHash)throw new MonitoringError('snapshot_changed',409,'View changed; restart pagination.');
      offset=Number(c.offset);
     }
     const items='items' in built.data?built.data.items:[];
     const nextCursor=offset+limit<items.length?Buffer.from(JSON.stringify({scope:scopeKey,hash:contentHash,offset:offset+limit})).toString('base64url'):null;
     const refreshedAt=(await tx.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!.now.toISOString();
     const body={...built.data,...('items' in built.data?{items:items.slice(offset,offset+limit)}:{}),scopeKey,snapshotRevision:Number(version.revision),lastCommittedChange,nextCursor,
      freshness:{refreshedAt,receivedEvidenceOnly:true,deviceContactAt:null,lastReceivedActionAt,integrationDelivery:'unavailable'}} as View;
     requireMonitoring(selection.kind==='action'?'ActionSnapshot':selection.kind==='task'||selection.kind==='workday'?'History':'Snapshot',body);
     const etag=`"${scopeKey}.${version.revision}.${offset}.${limit}"`;
     return {body,etag,notModified:matches(ifNoneMatch,etag)};
    });
   },'REPEATABLE READ');}catch(error){if((error as {code?:string}).code!=='40001'||attempt===4)throw error;}
  }
  throw new Error('Unreachable read retry');
 }

 private async project(tx:Transaction,a:AccessSession,s:Selection,q:Query){
  const tenant=a.context.tenantId;
  let r:RoundRow|undefined,driverId:string|null=null,dayId:string|undefined;
  if(s.kind==='driver'){
   driverId=s.id;
   const filter=a.sqlPredicate(policy,'t',5);
   r=(await tx.query<RoundRow>(`SELECT r.* FROM tawsel.rounds r WHERE r.tenant_id=$1 AND r.driver_id=$2 AND ($3::boolean OR EXISTS(
    SELECT 1 FROM tawsel.round_admissions d JOIN tawsel.monitoring_tasks t ON t.tenant_id=d.tenant_id AND t.task_id=d.task_id AND t.dispatch_cycle_id IS NOT DISTINCT FROM d.dispatch_cycle_id AND t.driver_id=d.driver_id
    WHERE d.tenant_id=r.tenant_id AND d.round_id=r.round_id AND ($4::uuid IS NULL OR t.branch_id=$4) AND ${filter.text}))
    ORDER BY r.started_at DESC,r.round_id DESC LIMIT 1`,[tenant,driverId,a.context.principalKind==='account'&&a.context.driverId===driverId&&!q.branchId,q.branchId??null,...filter.values])).rows[0];
  }else if(s.kind==='trip'){
   r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND round_id=$2',[tenant,s.id])).rows[0];
   if(!r)throw new AccessDenied(true);driverId=r.driver_id;
  }else if(s.kind==='workday'){
   const day=(await tx.query<{driver_id:string}>('SELECT driver_id FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[tenant,s.id])).rows[0];
   if(!day)throw new AccessDenied(true);driverId=day.driver_id;dayId=s.id;
  }
  const rows=await tasks(tx,a,driverId,q.branchId,s.kind==='task'?s.id:undefined);
  await this.observe?.('tasks',tx);
  const own=driverId!==null&&a.context.principalKind==='account'&&a.context.driverId===driverId&&!q.branchId;
  if(!rows.length&&!own)throw new AccessDenied(true);
  // Private full-round metadata requires all underlying current task scopes.
  // Scoped staff/integrations always receive only visible order/meaning.
  let full=own;
  if(full){
   const all=(await tx.query<TaskRow>('SELECT * FROM tawsel.monitoring_tasks WHERE tenant_id=$1 AND driver_id=$2',[tenant,driverId])).rows;
   full=all.every(row=>a.canRead(policy,row));
  }
  const received=await actions(tx,a,rows);
  if(s.kind==='action'){
   const action=received.find(c=>c.actionId===s.id&&c.sourceId===s.sourceId);if(!action)throw new AccessDenied(true);
   return {data:{action} as Data,rows:rows.filter(row=>row.task_id===s.id),actions:[action],fullDriver:null};
  }
  let admitted=await admissions(tx,a,q.branchId,s.kind==='driver'||s.kind==='trip'?r?.round_id:undefined,dayId,s.kind==='task'?s.id:undefined);
  if(s.kind==='driver'&&!r)admitted=[];
  if((s.kind==='trip'||s.kind==='workday')&&!admitted.length&&!own)throw new AccessDenied(true);
  const reports=await outcomes(tx,a,admitted.map(d=>d.attempt_id));
  if(s.kind==='task'||s.kind==='workday'){
   const visibleRows=s.kind==='workday'?rows.filter(row=>admitted.some(d=>d.task_id===row.task_id&&d.dispatch_cycle_id===row.dispatch_cycle_id)):rows;
   const historyActions=s.kind==='workday'?await actions(tx,a,visibleRows):received;
   const items:History['items']=[];
   if(s.kind==='workday'){
    const roundIds=[...new Set(admitted.map(d=>d.round_id))];
    const rs=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND workday_id=$2 AND (round_id=ANY($3::uuid[]) OR $4::boolean) ORDER BY started_at,round_id',[tenant,s.id,roundIds,own])).rows;
    items.push(...rs.map(r=>({kind:'round' as const,round:round(r)})));
   }
   const cycles=(await tx.query<{dispatch_cycle_id:string;task_id:string;driver_id:string|null;source_revision:string;assignment_revision:string;state:'unassigned'|'prepared'|'held'|'withdrawn';received_at:Date|null;departure_at:Date|null;latest:boolean}>('SELECT * FROM tawsel.b2b_dispatch_cycles WHERE tenant_id=$1 AND dispatch_cycle_id=ANY($2::uuid[]) ORDER BY task_id,source_revision,dispatch_cycle_id',[tenant,visibleRows.flatMap(row=>row.dispatch_cycle_id?[row.dispatch_cycle_id]:[])])).rows;
   items.push(...cycles.map(c=>({kind:'cycle' as const,cycle:{dispatchCycleId:c.dispatch_cycle_id,taskId:c.task_id,driverId:c.driver_id,sourceRevision:Number(c.source_revision),assignmentRevision:Number(c.assignment_revision),state:c.state,receivedAt:c.received_at?.toISOString()??null,departureAt:c.departure_at?.toISOString()??null,latest:c.latest}})));
   items.push(...admitted.map(d=>({kind:'attempt' as const,attempt:{attemptId:d.attempt_id,taskId:d.task_id,roundId:d.round_id,dispatchCycleId:d.dispatch_cycle_id,admittedAt:d.admitted_at.toISOString(),stage:d.stage}})));
   items.push(...reports.map(o=>({kind:'outcome' as const,outcome:o,effective:!reports.some(n=>n.attemptId===o.attemptId&&n.revision>o.revision)})));
   const corrections=(await tx.query<{record:components['schemas']['CorrectionRecord']}>('SELECT record FROM tawsel.outcome_corrections WHERE tenant_id=$1 AND outcome_id=ANY($2::uuid[]) ORDER BY previous_revision,correction_id',[tenant,reports.map(o=>o.outcomeId)])).rows;
   items.push(...corrections.map(c=>({kind:'correction' as const,correction:c.record})),...historyActions.map(action=>({kind:'action' as const,action})));
   return {data:{resourceId:s.id,progress:progress(admitted,reports),items} as Data,rows:visibleRows,actions:historyActions,fullDriver:full?driverId:null};
  }
  if(!driverId)throw new AccessDenied(true);
  const now=(await tx.query<{now:Date}>('SELECT transaction_timestamp() now')).rows[0]!.now.getTime();
  const currentRows=rows.filter(row=>row.latest),visible=currentRows.map(row=>task(row,now));
  const roundItems=rows.filter(row=>admitted.some(d=>d.task_id===row.task_id&&d.dispatch_cycle_id===row.dispatch_cycle_id)).map(row=>{
   const d=admitted.filter(d=>d.task_id===row.task_id&&d.dispatch_cycle_id===row.dispatch_cycle_id).at(-1)!;
   const o=reports.filter(o=>o.attemptId===d.attempt_id).at(-1);
   return {...task(row,now),attemptId:d.attempt_id,outcome:o?.outcome??null,outcomeRevision:o?.revision??0,eligible:!r?.ended_at&&row.attempt_id===d.attempt_id&&task(row,now).eligible};
  });
  const items=s.kind==='trip'?roundItems:[...visible,...rows.filter(row=>!row.latest&&row.return_required>0).map(row=>task(row,now))];
  const p=r?progress(admitted,reports):progress(currentRows.filter(row=>row.state==='held'||row.state==='personal').map((row,i)=>({task_id:row.task_id,attempt_id:row.attempt_id??row.task_id,dispatch_cycle_id:row.dispatch_cycle_id,round_id:'',admitted_at:new Date(i),stage:'available'})),[]);
  let current:Snapshot['current']=null;
  if(r&&!r.ended_at){
   const e=(await tx.query<{task_id:string;attempt_id:string;stage:'heading'|'arrived'}>("SELECT task_id,attempt_id,stage FROM tawsel.execution_attempts WHERE tenant_id=$1 AND round_id=$2 AND stage IN ('heading','arrived')",[tenant,r.round_id])).rows[0];
   const target=e&&visible.find(t=>t.taskId===e.task_id&&t.attemptId===e.attempt_id);
   if(e&&target)current={kind:'customer',taskId:e.task_id,attemptId:e.attempt_id,branchId:target.branchId,stage:e.stage};
  }
  const branch=r?(await tx.query<{branch_id:string;integration_id:string;record:{stage:'heading'|'arrived'|'awaiting-receipt'}}> (`SELECT b.record,q.branch_id,q.integration_id FROM tawsel.branch_activities b JOIN tawsel.return_requests q USING(tenant_id,request_id) WHERE b.tenant_id=$1 AND b.round_id=$2 AND b.active`,[tenant,r.round_id])).rows[0]:undefined;
  if(branch&&a.canRead(policy,{tenant_id:tenant,driver_id:driverId,branch_id:branch.branch_id,integration_id:branch.integration_id})&&(!q.branchId||q.branchId===branch.branch_id))current={kind:'branch',taskId:null,attemptId:null,branchId:branch.branch_id,stage:branch.record.stage};
  const plan=(await tx.query<{plan_id:string;revision:string;route_policy:{orderedTaskIds:string[]}}>(`SELECT * FROM tawsel.plan_revisions WHERE tenant_id=$1 AND driver_id=$2 AND state IN ('ready','manual','branch') ${r?.ended_at?'AND created_at<=$3':''} ORDER BY revision DESC LIMIT 1`,r?.ended_at?[tenant,driverId,r.ended_at]:[tenant,driverId])).rows[0];
  const ordered=plan?.route_policy.orderedTaskIds??[];
  // Select the actual next eligible target before redaction; skipping a hidden
  // next target would misrepresent the shared route as heading to our task.
  const rawEligible=(await tx.query<{task_id:string}>(`SELECT p.task_id FROM tawsel.planning_attempts p JOIN tawsel.location_tasks t USING(tenant_id,task_id)
   LEFT JOIN tawsel.effective_attempt_outcomes o ON o.tenant_id=p.tenant_id AND o.attempt_id=p.attempt_id
   LEFT JOIN tawsel.task_execution_options e ON e.tenant_id=p.tenant_id AND e.task_id=p.task_id
   LEFT JOIN tawsel.task_locations l ON l.tenant_id=t.tenant_id AND l.task_id=t.task_id
   LEFT JOIN tawsel.driver_planned_stops s ON s.tenant_id=t.tenant_id AND s.dispatch_cycle_id=t.dispatch_cycle_id AND s.driver_id=t.driver_id
   WHERE p.tenant_id=$1 AND t.driver_id=$2 AND p.latest AND p.dispatch_cycle_id IS NOT DISTINCT FROM t.dispatch_cycle_id AND o.outcome_id IS NULL AND NOT COALESCE(e.deferred,false)
   AND (t.kind='personal' OR (t.state='held' AND s.state='remaining'))
   AND (GREATEST(t.earliest_at,e.earliest_at) IS NULL OR GREATEST(t.earliest_at,e.earliest_at)<=transaction_timestamp())
   AND CASE WHEN l.task_id IS NOT NULL THEN l.source_revision=t.source_revision ELSE t.original->>'kind'='confirmed-pin' END
   AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM tawsel.round_admissions d WHERE d.tenant_id=p.tenant_id AND d.round_id=$3 AND d.attempt_id=p.attempt_id))
   AND NOT EXISTS(SELECT 1 FROM tawsel.execution_attempts x WHERE x.tenant_id=p.tenant_id AND x.attempt_id=p.attempt_id AND x.stage IN ('heading','arrived'))`,[tenant,driverId,r?.round_id??null])).rows.map(x=>x.task_id);
  const nextId=ordered.find(id=>rawEligible.includes(id));
  const nextSuggestion=r?.ended_at||branch?null:visible.find(t=>t.taskId===nextId&&t.eligible)??null;
  const day=r?(await tx.query<{workday_id:string;opened_at:Date;ended_at:Date|null}>('SELECT * FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[tenant,r.workday_id])).rows[0]:undefined;
  const held=currentRows.filter(t=>t.state==='held'&&(t.held??0)>0),prepared=currentRows.filter(t=>t.state==='prepared'),returns=rows.filter(t=>t.return_required>0);
  const data:Data={driverId,workday:day?{workdayId:day.workday_id,openedAt:day.opened_at.toISOString(),endedAt:day.ended_at?.toISOString()??null}:null,round:r?round(r):null,current,nextSuggestion,
   plan:{planId:full?plan?.plan_id??null:null,revision:full&&plan?Number(plan.revision):null,orderedTaskIds:ordered.filter(id=>items.some(t=>t.taskId===id))},
   owner:full&&r?{accountId:r.owner_account_id,deviceId:r.owner_device_id,generation:Number(r.device_generation)}:null,progress:p,
   groups:{preparedShipments:new Set(prepared.map(t=>t.task_id)).size,heldShipments:new Set([...held,...returns].map(t=>t.task_id)).size,deferredShipments:currentRows.filter(t=>t.deferred||t.earliest_at&&t.earliest_at.getTime()>now).length,returnRequiredShipments:new Set(returns.map(t=>t.task_id)).size,heldPieces:held.reduce((n,t)=>n+(t.held??0),0)+returns.filter(t=>!t.latest).reduce((n,t)=>n+t.return_required,0),returnRequiredPieces:returns.reduce((n,t)=>n+t.return_required,0)},items};
  return {data,rows,actions:received,fullDriver:full?driverId:null};
 }
}
