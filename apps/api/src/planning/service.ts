import type { Pool } from 'pg';
import { continuation, publishManual } from './manual.js';
import type { components } from '@tawsel/api-client';
import { AccessDenied, LifecycleDenied, withAccess, type AccessSession, type AuthenticatedPrincipal, type ResourcePolicy } from '../access/service.js';
import { executeCommandInTransaction, type ActionEnvelope } from '../commands/kernel.js';
import { lockInvariants } from '../commands/locks.js';
import { canonicalJson } from '../commands/json.js';
import type { Transaction } from '../db/transaction.js';
import { enqueuePlanning, fingerprint, planningState, snapshot } from './queue.js';
import { jobView, PlanningError, requirePlanning, type Input, type JobRow, type Plan } from './models.js';

const policy:ResourcePolicy=[{capability:'planning.manage',ownership:'assigned-branches'},{capability:'execution.own',ownership:'own-driver'}];
export async function authorizeDriver(tx:Transaction,a:AccessSession,driverId:string) {
 if(a.context.principalKind!=='account')throw new AccessDenied();
 a.requireCapability(policy);
 const driver=(await tx.query<{account_id:string}>(`SELECT d.account_id FROM tawsel.drivers d JOIN tawsel.accounts a USING(tenant_id,account_id)
  JOIN tawsel.memberships m USING(tenant_id,account_id) WHERE d.tenant_id=$1 AND d.driver_id=$2 AND d.enabled AND a.enabled AND m.enabled`,[a.context.tenantId,driverId])).rows[0];
 if(!driver)throw new AccessDenied(true);
 const scope={tenant_id:a.context.tenantId,driver_id:driverId,integration_id:null,branch_id:null as string|null};
 if(a.context.tenantKind==='personal')a.requireResource(policy,scope);
 else {
  const branches=(await tx.query<{branch_id:string}>('SELECT branch_id FROM tawsel.membership_branches WHERE tenant_id=$1 AND account_id=$2 ORDER BY branch_id',[a.context.tenantId,driver.account_id])).rows;
  if(!branches.length)throw new AccessDenied(true);
  for(const b of branches)a.requireResource(policy,{...scope,branch_id:b.branch_id});
 }
}
function authorizeInput(a:AccessSession,input:Input) {
 for(const m of input.members)a.requireResource(policy,{tenant_id:input.tenantId,driver_id:input.driverId,branch_id:m.branchId,integration_id:m.integrationId});
 if(input.settings?.endpoint.kind==='branch')a.requireResource(policy,{tenant_id:input.tenantId,driver_id:input.driverId,branch_id:input.settings.endpoint.branchId,integration_id:null});
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(value:string){if(!uuid.test(value))throw new PlanningError('validation_failed',400,'معرّف التخطيط غير صالح.');}
export class PlanningService {
 constructor(readonly pool:Pool){}
 async command(principal:AuthenticatedPrincipal,value:unknown) {
  const operation=(value as ActionEnvelope|undefined)?.operationId;
  const name=operation==='planning.saveDraft'?'SaveDraftCommand':operation==='planning.requestPreview'?'RequestPreviewCommand':operation==='planning.requestReplan'?'RequestReplanCommand':operation==='planning.setManualOrder'?'ManualOrderCommand':null;
  if(!name)throw new PlanningError('validation_failed',400,'نوع عملية التخطيط غير صالح.');
  requirePlanning(name,value);
  const command=JSON.parse(canonicalJson(value)) as ActionEnvelope;
  const p=command.payload as components['schemas']['PlanningSaveDraft'];
  return withAccess(this.pool,principal,async(a,tx)=>{
   if(command.context.kind!=='device')throw new AccessDenied();
   a.assertScope({tenantId:command.context.tenantId,accountId:command.context.accountId});
   return executeCommandInTransaction(tx,a.commandScope,command,{
    async authorize(){await authorizeDriver(tx,a,p.driverId);},
    async writeDomain(){
     await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:p.driverId}]);
     const state=await planningState(tx,a.context.tenantId,p.driverId),input=await snapshot(tx,state);
     authorizeInput(a,input);
     if(input.members.some(m=>m.departureAt)&&a.context.driverId!==p.driverId)throw new LifecycleDenied();
     if(Number(state.settings_revision)!==p.expectedSettingsRevision)throw new PlanningError('stale_revision',409,'تغيّرت إعدادات التخطيط؛ أعد تحميل النسخة الحالية.');
     if(operation==='planning.setManualOrder'){
      const result=await publishManual(tx,state,input,command.payload as components['schemas']['PlanningManualOrder'],a.context.sourceId,command.actionId);
      return {status:'accepted',response:{status:200,body:result},summary:{planId:result.planId,driverId:p.driverId},audit:{driverId:p.driverId,planId:result.planId,manualRevision:result.manualRevision},resourceVersions:{planningInputRevision:result.inputRevision},intents:[]};
     }
     if(operation==='planning.saveDraft'){
      const active=(await tx.query('SELECT round_id FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND ended_at IS NULL',[input.tenantId,p.driverId])).rowCount;
      // Changing active vehicle/endpoint requires a later execution transition
      // that updates reserved branch capacity and the published route together.
      if(active&&(p.settings.mode!==input.settings?.mode||canonicalJson(p.settings.endpoint)!==canonicalJson(input.settings?.endpoint)))throw new LifecycleDenied();
      if((input.accountKind==='company'&&p.settings.endpoint.kind==='fixed')||(input.accountKind==='personal'&&p.settings.endpoint.kind==='branch'))throw new PlanningError('validation_failed',400,'نقطة النهاية غير متاحة لهذا الحساب.');
      if(p.settings.endpoint.kind==='branch'){
       const branch=(await tx.query('SELECT branch_id FROM tawsel.branches WHERE tenant_id=$1 AND branch_id=$2 AND enabled',[input.tenantId,p.settings.endpoint.branchId])).rows[0];
       a.requireResource(policy,branch?{tenant_id:input.tenantId,driver_id:p.driverId,branch_id:branch.branch_id,integration_id:null}:undefined);
      }
      await tx.query(`UPDATE tawsel.planning_states SET settings=$3,settings_revision=settings_revision+1 WHERE tenant_id=$1 AND driver_id=$2`,[input.tenantId,p.driverId,p.settings]);
     }
     const job=await enqueuePlanning(tx,input.tenantId,p.driverId,a.context.sourceId,command.actionId);
     return {status:'accepted',response:{status:202,body:{settingsRevision:job.input.settingsRevision,job:jobView(job,job.job_id)}},
      summary:{jobId:job.job_id,driverId:p.driverId},audit:{driverId:p.driverId,jobId:job.job_id},resourceVersions:{planningInputRevision:job.input.inputRevision},intents:[]};
    },async writeProgress(){}
   });
  });
 }
 async job(principal:AuthenticatedPrincipal,jobId:string){
  id(jobId);return withAccess(this.pool,principal,async(a,tx)=>{
   const row=(await tx.query<JobRow>('SELECT * FROM tawsel.planning_jobs WHERE tenant_id=$1 AND job_id=$2',[a.context.tenantId,jobId])).rows[0];
   if(!row)throw new AccessDenied(true);
   await authorizeDriver(tx,a,row.driver_id);authorizeInput(a,row.input);
   const state=(await tx.query<{latest_job_id:string|null}>('SELECT latest_job_id FROM tawsel.planning_states WHERE tenant_id=$1 AND driver_id=$2',[row.tenant_id,row.driver_id])).rows[0]!;
   return jobView(row,state.latest_job_id);
  });
 }
 async plans(principal:AuthenticatedPrincipal,driverId:string,limit=20,beforeRevision?:number):Promise<components['schemas']['PlanningPlans']>{
  id(driverId);
  if(!Number.isInteger(limit)||limit<1||limit>50||(beforeRevision!==undefined&&(!Number.isSafeInteger(beforeRevision)||beforeRevision<1)))throw new PlanningError('validation_failed',400,'صفحة الخطط غير صالحة.');
  return withAccess(this.pool,principal,async(a,tx)=>{
   await authorizeDriver(tx,a,driverId);
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driverId}]);
   const state=await planningState(tx,a.context.tenantId,driverId),current=await snapshot(tx,state);
   authorizeInput(a,current);
   const rows=(await tx.query<{plan_id:string;job_id:string|null;revision:string;fingerprint:string;state:Plan['state'];route_policy:Plan['routePolicy']|null;candidate:Plan['candidate'];input:Input;created_at:Date}>(`SELECT p.*,COALESCE(p.input,j.input) AS input FROM tawsel.plan_revisions p
    LEFT JOIN tawsel.planning_jobs j USING(tenant_id,job_id) WHERE p.tenant_id=$1 AND p.driver_id=$2 AND ($3::bigint IS NULL OR p.revision<$3)
    ORDER BY p.revision DESC LIMIT $4`,[a.context.tenantId,driverId,beforeRevision??null,limit+1])).rows;
   const items:Plan[]=[];
   for(const r of rows.slice(0,limit)){
    authorizeInput(a,r.input);
    const f=(await tx.query<{forecast_id:string;workload_id:string;time_origin:Date;expected_finish_at:Date|null}>('SELECT * FROM tawsel.forecast_revisions WHERE tenant_id=$1 AND plan_id=$2',[a.context.tenantId,r.plan_id])).rows[0]!;
    const members=(await tx.query<{task_id:string;attempt_id:string;dispatch_cycle_id:string|null;source_revision:string;assignment_revision:string;pin_revision:string;membership:Plan['forecast']['members'][number]['membership'];exclusion_reason:string|null;position:number|null;expected_arrival_at:Date|null;expected_completion_at:Date|null}>(`SELECT * FROM tawsel.forecast_members WHERE tenant_id=$1 AND forecast_id=$2 ORDER BY position NULLS LAST,task_id`,[a.context.tenantId,f.forecast_id])).rows;
    items.push({planId:r.plan_id,jobId:r.job_id,driverId,revision:Number(r.revision),fingerprint:r.fingerprint,state:r.state,current:state.current_plan_id===r.plan_id,
     inputCurrent:r.fingerprint===fingerprint(current),policyValidated:r.route_policy!==null,...(r.route_policy?{routePolicy:r.route_policy}:{}),candidate:r.candidate,input:r.input,createdAt:r.created_at.toISOString(),forecast:{forecastId:f.forecast_id,workloadId:f.workload_id,kind:'planning-estimate',timeOrigin:f.time_origin.toISOString(),expectedFinishAt:f.expected_finish_at?.toISOString()??null,
      members:members.map(m=>({taskId:m.task_id,attemptId:m.attempt_id,dispatchCycleId:m.dispatch_cycle_id,sourceRevision:Number(m.source_revision),assignmentRevision:Number(m.assignment_revision),pinRevision:Number(m.pin_revision),membership:m.membership,exclusionReason:m.exclusion_reason,position:m.position,expectedArrivalAt:m.expected_arrival_at?.toISOString()??null,expectedCompletionAt:m.expected_completion_at?.toISOString()??null}))}});
   }
   const latest=state.latest_job_id?(await tx.query<JobRow>('SELECT * FROM tawsel.planning_jobs WHERE tenant_id=$1 AND job_id=$2',[a.context.tenantId,state.latest_job_id])).rows[0]:undefined;
   if(latest)authorizeInput(a,latest.input);
   const effective=(await tx.query<{fingerprint:string;state:Plan['state']}>('SELECT fingerprint,state FROM tawsel.plan_revisions WHERE tenant_id=$1 AND plan_id=$2',[a.context.tenantId,state.current_plan_id])).rows[0];
   const alreadyUsable=effective&&['ready','manual'].includes(effective.state)&&effective.fingerprint===fingerprint(current);
   const retained=!alreadyUsable&&latest&&(latest.status==='failed'||latest.status==='pending'||latest.status==='running'||latest.status==='partial')?await continuation(tx,current):null;
   return {items,nextCursor:rows.length>limit?Number(rows[limit-1]!.revision):null,settingsRevision:Number(state.settings_revision),inputRevision:current.inputRevision,manualRevision:current.manualRevision,continuation:retained,latestJob:latest?jobView(latest,state.latest_job_id):null};
  });
 }
}
