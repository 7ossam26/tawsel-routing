import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { AccessDenied, withAccess, type AccessSession, type AuthenticatedPrincipal, type ResourcePolicy } from '../access/service.js';
import { executeCommandInTransaction, getCommandResult, type ActionEnvelope, type CommandHooks, type Decision } from '../commands/kernel.js';
import { canonicalJson } from '../commands/json.js';
import { lockInvariants } from '../commands/locks.js';
import type { Transaction } from '../db/transaction.js';
import { fingerprint, planningState, snapshot } from '../planning/queue.js';
import { authorizeDriver } from '../planning/service.js';
import type { Input, Plan } from '../planning/models.js';
import { validateCompleteRoute, validateOrder } from '../planning/policy.js';
import { EngineError } from '../engine/index.js';
import { admitMembers } from './departure.js';
import { activity } from '../current/state.js';
import { requireRound, RoundError, roundView, type Readiness, type ReadinessRequest, type RoundRow, type Start, type Workday } from './models.js';

const own:ResourcePolicy=[{capability:'execution.own',ownership:'own-driver'}];
function ownDriver(a:AccessSession,driverId?:string):string {
 if(a.context.principalKind!=='account'||!a.context.driverId)throw new AccessDenied();
 a.requireCapability(own);if(driverId!==undefined)a.assertScope({driverId});
 return a.context.driverId;
}
function inputAccess(a:AccessSession,input:Input){
 for(const m of input.members)a.requireResource(own,{tenant_id:input.tenantId,driver_id:input.driverId,branch_id:m.branchId,integration_id:m.integrationId});
 if(input.settings?.endpoint.kind==='branch')a.requireResource(own,{tenant_id:input.tenantId,driver_id:input.driverId,branch_id:input.settings.endpoint.branchId,integration_id:null});
}
async function active(tx:Transaction,tenantId:string,driverId:string){return (await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND ended_at IS NULL',[tenantId,driverId])).rows[0];}
async function workday(tx:Transaction,tenantId:string,driverId:string):Promise<Workday|null>{
 const row=(await tx.query<{workday_id:string;opened_at:Date}>('SELECT * FROM tawsel.workdays WHERE tenant_id=$1 AND driver_id=$2 AND ended_at IS NULL',[tenantId,driverId])).rows[0];
 return row?{workdayId:row.workday_id,driverId,state:'open',openedAt:row.opened_at.toISOString()}:null;
}
async function acceptedDependencies(tx:Transaction,a:AccessSession,ids:readonly string[]){
 if(!ids.length)return;
 const rows=(await tx.query<{action_id:string}>(`SELECT action_id FROM tawsel.command_identities WHERE tenant_id=$1 AND source_id=$2 AND action_id=ANY($3::uuid[]) AND business_status='accepted'`,[a.context.tenantId,a.context.sourceId,ids])).rows;
 if(new Set(rows.map(r=>r.action_id)).size!==new Set(ids).size)throw new RoundError('sync_incomplete',409,'زامن الإجراءات المطلوبة قبل بدء الجولة.');
}
interface Selected {plan_id:string;revision:string;state:Plan['state'];fingerprint:string;route_policy:Plan['routePolicy']|null;candidate:Plan['candidate'];forecast_id:string;workload_id:string}
async function selectedPlan(tx:Transaction,a:AccessSession,p:{driverId:string;planId:string;expectedPlanRevision:number}){
 const state=await planningState(tx,a.context.tenantId,p.driverId),input=await snapshot(tx,state);inputAccess(a,input);
 const plan=(await tx.query<Selected>(`SELECT p.*,f.forecast_id,f.workload_id FROM tawsel.plan_revisions p JOIN tawsel.forecast_revisions f USING(tenant_id,plan_id)
  WHERE p.tenant_id=$1 AND p.driver_id=$2 AND p.plan_id=$3`,[input.tenantId,p.driverId,p.planId])).rows[0];
 if(!plan||state.current_plan_id!==p.planId||Number(plan.revision)!==p.expectedPlanRevision||plan.fingerprint!==fingerprint(input))throw new RoundError('stale_revision',409,'تغيّر العمل؛ أعد تحميل الخطة.');
 if(!['ready','manual'].includes(plan.state)||!plan.route_policy||input.currentTarget)throw new RoundError('plan_not_startable',409,'اختر خطة كاملة أو ترتيبًا يدويًا صالحًا.');
 const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
 if(input.members.some(m=>m.eligible&&m.earliestAt&&Date.parse(m.earliestAt)>now.getTime()))throw new RoundError('plan_not_startable',409,'بعض العمل لم يحن موعده بعد.');
 try{validateOrder(input,plan.route_policy.orderedTaskIds);if(plan.state==='ready'){if(!plan.candidate||plan.candidate.status!=='complete')throw new EngineError('invalid_response');validateCompleteRoute(input,plan.candidate);}}
 catch(error){if(error instanceof EngineError)throw new RoundError('plan_not_startable',409,'الخطة لا تطابق العمل المتاح أو حد المحطات.');throw error;}
 return {state,input,plan};
}
function rejected(c:ActionEnvelope,e:RoundError):Decision {
 const problem={type:`https://schemas.tawsel.invalid/problems/${e.code.replaceAll('_','-')}`,title:'Round start rejected',code:e.code,status:e.statusCode,detail:e.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
 return {status:'rejected',problem,response:{status:e.statusCode,body:problem},summary:{driverId:c.payload.driverId,code:e.code},audit:{driverId:c.payload.driverId,code:e.code}};
}
export class Rounds {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async readiness(principal:AuthenticatedPrincipal,value:unknown):Promise<Readiness>{
  requireRound('ReadinessRequest',value);const p=JSON.parse(canonicalJson(value)) as ReadinessRequest;
  return withAccess(this.pool,principal,async(a,tx)=>{
   ownDriver(a,p.driverId);await authorizeDriver(tx,a,p.driverId);
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:p.driverId}]);
   if(await active(tx,a.context.tenantId,p.driverId))throw new RoundError('round_already_active',409,'الجولة بدأت؛ افتح الجولة الحالية.');
   await acceptedDependencies(tx,a,p.relevantActionIds);
   const {plan}=await selectedPlan(tx,a,p),readinessId=randomUUID();
   const row=(await tx.query<{issued_at:Date;expires_at:Date}>(`INSERT INTO tawsel.start_readiness (tenant_id,driver_id,readiness_id,account_id,device_id,plan_id,fingerprint,relevant_action_ids,expires_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp()+interval '60 seconds') RETURNING issued_at,expires_at`,[a.context.tenantId,p.driverId,readinessId,a.context.sourceId,p.deviceId,p.planId,plan.fingerprint,p.relevantActionIds])).rows[0]!;
   return {readinessId,driverId:p.driverId,deviceId:p.deviceId,planId:p.planId,planRevision:Number(plan.revision),inputFingerprint:plan.fingerprint,verifiedActionIds:p.relevantActionIds,issuedAt:row.issued_at.toISOString(),expiresAt:row.expires_at.toISOString()};
  });
 }
 async start(principal:AuthenticatedPrincipal,value:unknown){
  requireRound('StartCommand',value);const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as Start;
  return withAccess(this.pool,principal,async(a,tx)=>{
   if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;
   ownDriver(a,p.driverId);a.assertScope({tenantId:device.tenantId,accountId:device.accountId});
   return executeCommandInTransaction(tx,a.commandScope,c,{
    async authorize(){
     await authorizeDriver(tx,a,p.driverId);
     const rows=(await tx.query('SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,p.driverId])).rows;
     for(const row of rows)a.requireResource(own,row);
    },
    async writeDomain(){try{
     // Discover complete guards before acquisition. Any intervening assignment
     // change is detected by locked fingerprint validation before mutation.
     const before=(await tx.query<{task_id:string;dispatch_cycle_id:string|null}>('SELECT task_id,dispatch_cycle_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2 ORDER BY task_id',[a.context.tenantId,p.driverId])).rows;
     const day=await workday(tx,a.context.tenantId,p.driverId),dayId=randomUUID();
     // Closure can end the observed day while start waits for the driver lock.
     // Reserve a fresh candidate too; never recreate the now-closed day ID.
     await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:p.driverId},{kind:'workday',id:dayId},...(day?[{kind:'workday' as const,id:day.workdayId}]:[]),...before.flatMap(m=>m.dispatch_cycle_id?[{kind:'assignment' as const,id:m.dispatch_cycle_id}]:[]),...before.map(m=>({kind:'task' as const,id:m.task_id}))]);
     const existing=await active(tx,a.context.tenantId,p.driverId);
     if(existing){
      inputAccess(a,await snapshot(tx,await planningState(tx,a.context.tenantId,p.driverId)));
      const body={disposition:'already-active',workday:await workday(tx,a.context.tenantId,p.driverId),round:{...roundView(existing),currentActivity:await activity(tx,existing.tenant_id,existing.round_id)}};
      return {status:'accepted',response:{status:200,body},summary:{driverId:p.driverId,roundId:existing.round_id,workdayId:existing.workday_id},audit:{driverId:p.driverId,roundId:existing.round_id,changed:false},resourceVersions:{deviceGeneration:Number(existing.device_generation)},intents:[]};
     }
     const ready=(await tx.query<{fingerprint:string;relevant_action_ids:string[]}>(`SELECT fingerprint,relevant_action_ids FROM tawsel.start_readiness
      WHERE tenant_id=$1 AND driver_id=$2 AND readiness_id=$3 AND account_id=$4 AND device_id=$5 AND plan_id=$6 AND expires_at>clock_timestamp()`,[a.context.tenantId,p.driverId,p.readinessId,a.context.sourceId,device.deviceId,p.planId])).rows[0];
     if(!ready)throw new RoundError('sync_required',409,'حدّث المزامنة والخطة قبل بدء الجولة.');
     await acceptedDependencies(tx,a,[...ready.relevant_action_ids,...c.dependsOnActionIds]);
     const {input,plan}=await selectedPlan(tx,a,p);
     if(ready.fingerprint!==plan.fingerprint)throw new RoundError('stale_revision',409,'تغيّر العمل بعد المزامنة.');
     const roundId=randomUUID();
     // The explicit branch endpoint consumes capacity for later admissions too.
     if(input.settings!.endpoint.kind==='branch')await tx.query(`INSERT INTO tawsel.driver_planned_stops (tenant_id,driver_id,stop_id,kind,branch_id,state) VALUES ($1,$2,$3,'branch',$4,'remaining')`,[input.tenantId,p.driverId,roundId,input.settings!.endpoint.branchId]);
     const reserved=Number((await tx.query(`SELECT count(*) AS n FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND driver_id=$2 AND state='remaining'`,[input.tenantId,p.driverId])).rows[0].n);
     if(reserved>50)throw new RoundError('capacity_exceeded',409,'تجاوزت الخطة حد المحطات.');
     const currentDay=await workday(tx,input.tenantId,p.driverId);
     if(!currentDay)await tx.query('INSERT INTO tawsel.workdays (tenant_id,driver_id,workday_id) VALUES ($1,$2,$3)',[input.tenantId,p.driverId,dayId]);
     const generation=Number((await tx.query('SELECT COALESCE(max(device_generation),0)+1 AS n FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2',[input.tenantId,p.driverId])).rows[0].n);
     const r=(await tx.query<RoundRow>(`INSERT INTO tawsel.rounds (tenant_id,driver_id,round_id,workday_id,owner_account_id,owner_device_id,device_generation,first_plan_id,first_forecast_id,first_workload_id,readiness_id,source_id,action_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$5,$12) RETURNING *`,[input.tenantId,p.driverId,roundId,currentDay?.workdayId??dayId,a.context.sourceId,device.deviceId,generation,plan.plan_id,plan.forecast_id,plan.workload_id,p.readinessId,c.actionId])).rows[0]!;
     await tx.query('INSERT INTO tawsel.round_publications (tenant_id,driver_id,round_id,plan_id) VALUES ($1,$2,$3,$4)',[input.tenantId,p.driverId,roundId,plan.plan_id]);
     const members=input.members.filter(m=>m.eligible);
     await admitMembers(tx,input.tenantId,p.driverId,roundId,members,a.context.sourceId,c.actionId,'start');
     await tx.query(`UPDATE tawsel.planning_states SET execution_revision=execution_revision+1,input_revision=input_revision+1 WHERE tenant_id=$1 AND driver_id=$2`,[input.tenantId,p.driverId]);
     await tx.query(`UPDATE tawsel.planning_jobs SET status='superseded',lease_id=null,lease_until=null,finished_at=clock_timestamp() WHERE tenant_id=$1 AND driver_id=$2 AND status IN ('pending','running')`,[input.tenantId,p.driverId]);
     const round=roundView(r),body={disposition:'started',workday:await workday(tx,input.tenantId,p.driverId),round};
     return {status:'accepted',response:{status:200,body},summary:{driverId:p.driverId,roundId,workdayId:r.workday_id,firstForecastId:plan.forecast_id,firstWorkloadId:plan.workload_id},audit:{driverId:p.driverId,roundId,readinessId:p.readinessId,changed:true},resourceVersions:{deviceGeneration:generation},
      intents:[...new Set(members.flatMap(m=>m.integrationId?[m.integrationId]:[]))].sort().map(recipientId=>({eventId:randomUUID(),recipientId,eventType:'round.started',payloadVersion:'1.0.0',payload:{roundId,workdayId:r.workday_id,driverId:p.driverId,startedAt:round.startedAt,firstPlanId:plan.plan_id,firstForecastId:plan.forecast_id,firstWorkloadId:plan.workload_id,taskIds:members.filter(m=>m.integrationId===recipientId).map(m=>m.taskId)}}))};
    }catch(error){if(error instanceof RoundError)return rejected(c,error);throw error;}},
    async writeProgress(){/* Start publishes the plan; heading and arrival remain explicit P16 actions. */},...this.observe
   });
  });
 }
 async current(principal:AuthenticatedPrincipal):Promise<components['schemas']['RoundCurrent']>{
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);await authorizeDriver(tx,a,driverId);await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driverId}]);
   inputAccess(a,await snapshot(tx,await planningState(tx,a.context.tenantId,driverId)));
   const r=await active(tx,a.context.tenantId,driverId);return {workday:await workday(tx,a.context.tenantId,driverId),round:r?{...roundView(r),currentActivity:await activity(tx,r.tenant_id,r.round_id)}:null};
  });
 }
 async result(principal:AuthenticatedPrincipal,actionId:string):Promise<components['schemas']['RoundActionStatus']>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actionId))throw new RoundError('validation_failed',400,'معرّف الإجراء غير صالح.');
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);await authorizeDriver(tx,a,driverId);
   const result=await getCommandResult(tx,a.commandScope,actionId);
   if(!result)return {actionId,status:'pending'};
   if(result.operationId!=='round.start'||result.summary.driverId!==driverId)throw new AccessDenied(true);
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driverId}]);
   inputAccess(a,await snapshot(tx,await planningState(tx,a.context.tenantId,driverId)));
   requireRound('StartActionResult',result);
   return {actionId,status:result.receipt.businessStatus as 'accepted'|'rejected'|'review-required',result:result as components['schemas']['RoundStartActionResult']};
  });
 }
}
