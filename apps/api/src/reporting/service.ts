import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,AccessSession,type AuthenticatedPrincipal} from '../access/service.js';
import {withTransaction,type Transaction} from '../db/transaction.js';
import {payloadHash} from '../commands/json.js';
import {policy,uuid,ReportingError,requireReport,type Query,type Report} from './models.js';
import {admissions,attempts,counts,collections,pieces,latestShipments} from './queries.js';
import {roundTimings} from './timing.js';
export class Reporting {
 constructor(readonly pool:Pool,readonly observe?:(stage:'admissions',tx:Transaction)=>Promise<void>){}
 private async scoped<T>(principal:AuthenticatedPrincipal,work:(tx:Transaction,a:AccessSession)=>Promise<T>):Promise<T>{
  for(let n=0;;n++){try{return await withTransaction(this.pool,tx=>AccessSession.inTransaction(tx,principal,a=>{a.requireCapability(policy);return work(tx,a);}), 'REPEATABLE READ');}catch(e){if((e as {code?:string}).code!=='40001'||n===3)throw e;}}
 }
 async list(principal:AuthenticatedPrincipal,q:{driverId?:string;branchId?:string;before?:string}={}):Promise<components['schemas']['ReportDayList']>{
  if(q.driverId)uuid(q.driverId);if(q.branchId)uuid(q.branchId);
  return this.scoped(principal,async(tx,a)=>{
   if(q.branchId)a.assertScope({branchId:q.branchId});const p=a.sqlPredicate(policy,'t',4);
   const days=(await tx.query<{workday_id:string;driver_id:string;driver_label:string;opened_at:Date;ended_at:Date|null}>(`SELECT w.*,
    COALESCE((SELECT min(pr.external_id) FROM tawsel.provisioning_records pr WHERE pr.tenant_id=w.tenant_id AND pr.resource_id=w.driver_id AND pr.entity='driver'
     AND EXISTS(SELECT 1 FROM tawsel.rounds r JOIN tawsel.round_admissions d USING(tenant_id,round_id)
      JOIN tawsel.monitoring_tasks t ON t.tenant_id=d.tenant_id AND t.task_id=d.task_id AND t.dispatch_cycle_id IS NOT DISTINCT FROM d.dispatch_cycle_id
      WHERE r.workday_id=w.workday_id AND t.integration_id=pr.integration_id AND ${p.text} ${q.branchId?`AND t.branch_id=$${4+p.values.length}`:''})), 'عملي') driver_label
    FROM tawsel.workdays w
    WHERE w.tenant_id=$1 AND ($2::uuid IS NULL OR w.driver_id=$2) AND ($3::timestamptz IS NULL OR w.opened_at<$3)
    AND EXISTS(SELECT 1 FROM tawsel.rounds r JOIN tawsel.round_admissions d USING(tenant_id,round_id)
     JOIN tawsel.monitoring_tasks t ON t.tenant_id=d.tenant_id AND t.task_id=d.task_id AND t.dispatch_cycle_id IS NOT DISTINCT FROM d.dispatch_cycle_id
     WHERE r.workday_id=w.workday_id AND r.tenant_id=w.tenant_id AND ${p.text} ${q.branchId?`AND t.branch_id=$${4+p.values.length}`:''})
    ORDER BY w.opened_at DESC,w.workday_id DESC LIMIT 51`,[a.context.tenantId,q.driverId??null,q.before??null,...p.values,...(q.branchId?[q.branchId]:[])])).rows;
   const branches=(await tx.query<{branch_id:string;label:string}>(`SELECT branch_id,COALESCE((SELECT min(pr.state->>'name') FROM tawsel.provisioning_records pr WHERE pr.tenant_id=b.tenant_id AND pr.resource_id=b.branch_id AND pr.entity='branch' AND ($3::uuid IS NULL OR pr.integration_id=$3)),'فرع') label FROM tawsel.branches b WHERE b.tenant_id=$1 AND b.branch_id=ANY($2::uuid[]) ORDER BY label,branch_id`,[a.context.tenantId,a.branchIds,a.context.principalKind==='integration'?a.context.sourceId:null])).rows.map(b=>({branchId:b.branch_id,label:b.label}));
   const result={items:days.slice(0,50).map(d=>({workdayId:d.workday_id,driverId:d.driver_id,driverLabel:d.driver_label,openedAt:d.opened_at.toISOString(),endedAt:d.ended_at?.toISOString()??null})),branches,nextBefore:days.length>50?days[49]!.opened_at.toISOString():null};requireReport('DayList',result);return result;
  });
 }
 async workday(principal:AuthenticatedPrincipal,id:string,q:Query={}):Promise<Report>{
  uuid(id);for(const value of [q.roundId,q.driverId,q.branchId])if(value)uuid(value);
  return this.scoped(principal,async(tx,a)=>{
   if(q.branchId)a.assertScope({branchId:q.branchId});
   const day=(await tx.query<{workday_id:string;driver_id:string;opened_at:Date;ended_at:Date|null}>(`SELECT * FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2 AND ($3::uuid IS NULL OR driver_id=$3)`,[a.context.tenantId,id,q.driverId??null])).rows[0];
   if(!day)throw new AccessDenied(true);
   const rows=await admissions(tx,a,id,q);if(!rows.length)throw new AccessDenied(true);
   await this.observe?.('admissions',tx);
   const all=await attempts(tx,a.context.tenantId,rows),selected=new Set(latestShipments(all).filter(i=>!q.outcome||(q.outcome==='deferred'?i.deferred:q.outcome==='unfinished'?!i.outcome:i.outcome?.outcome===q.outcome)).map(i=>i.taskId));
   const items=all.filter(i=>selected.has(i.taskId));
   const rounds=(await tx.query<{round_id:string;started_at:Date;ended_at:Date|null}>(`SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND workday_id=$2 AND round_id=ANY($3::uuid[]) ORDER BY started_at,round_id`,[a.context.tenantId,id,[...new Set(rows.map(r=>r.round_id))]])).rows.map(r=>({roundId:r.round_id,startedAt:r.started_at.toISOString(),endedAt:r.ended_at?.toISOString()??null}));
   const asOf=(await tx.query<{now:Date}>('SELECT transaction_timestamp() now')).rows[0]!.now.toISOString();
   const content:Omit<Report,'asOf'|'snapshotId'>={definitionVersion:'1.0.0',displayTimeZone:'Africa/Cairo',acceptedOnly:true,pendingLocalActions:'not-known-to-server',
    filters:{roundId:q.roundId??null,driverId:q.driverId??null,branchId:q.branchId??null,outcome:q.outcome??null},workdayId:id,driverId:day.driver_id,openedAt:day.opened_at.toISOString(),endedAt:day.ended_at?.toISOString()??null,
    scopeCounts:counts(all),counts:counts(items),collections:collections(items),pieces:await pieces(tx,a.context.tenantId,items),rounds,attempts:items,timing:await roundTimings(tx,a,id,rows,all,q)};
   // Content identity includes authorization. P37 must consume this exact result;
   // if it changed after the view, an expected snapshot fails instead of drifting.
   const snapshotId=payloadHash({access:a.context,...content});if(q.snapshotId&&q.snapshotId!==snapshotId)throw new ReportingError('snapshot_changed',409,'تغيّر التقرير؛ حدّثه لعرض النتائج المقبولة الأخيرة.');
   const result={...content,snapshotId,asOf};requireReport('Workday',result);return result;
  });
 }
 async timing(principal:AuthenticatedPrincipal,id:string,roundId:string,q:Query={}):Promise<components['schemas']['ReportTimingSnapshot']>{
  uuid(roundId);const report=await this.workday(principal,id,q);const timing=report.timing.find(t=>t.roundId===roundId);if(!timing)throw new AccessDenied(true);
  return {snapshotId:report.snapshotId,asOf:report.asOf,displayTimeZone:report.displayTimeZone,filters:report.filters,timing};
 }
}
