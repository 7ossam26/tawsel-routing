import {branchActivity} from '../branch/state.js';
import {executionFence} from '../devices/fence.js';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,withAccess,type AuthenticatedPrincipal} from '../access/service.js';
import {canonicalJson} from '../commands/json.js';
import {executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks,type Decision} from '../commands/kernel.js';
import {lockInvariants} from '../commands/locks.js';
import {activity,ownDriver} from '../current/state.js';
import {planningState,enqueuePlanning} from '../planning/queue.js';
import {authorizeDriver} from '../planning/service.js';
import type {RoundRow} from '../rounds/models.js';
import {ClosureError,requireClosure,uuid,type Close,type ClosureRecord} from './models.js';
import {closureBlocker} from './policy.js';
import {authorize,day,round,sourceItems} from './state.js';

/** Missing predecessor has no final command identity. The exact envelope can be
 * replayed after its dependencies commit; this is not an accepted local day end. */
import {DependencyPending as ClosurePending} from '../commands/dependencies.js';
export {DependencyPending as ClosurePending} from '../commands/dependencies.js';
const operations={'round.end':'EndRoundCommand','workday.end':'EndDayCommand'} as const;
function rejection(c:ActionEnvelope,driverId:string,e:ClosureError):Decision{
 const problem={type:`https://schemas.tawsel.invalid/problems/${e.code.replaceAll('_','-')}`,title:'Closure rejected',code:e.code,status:e.statusCode,detail:e.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
 return {status:'rejected',problem,response:{status:e.statusCode,body:problem},summary:{driverId,workdayId:c.payload.workdayId,roundId:c.payload.roundId,code:e.code},audit:{workdayId:c.payload.workdayId,roundId:c.payload.roundId,code:e.code,detail:e.message}};
}
export class Closures {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async command(principal:AuthenticatedPrincipal,value:unknown){
  const op=(value as ActionEnvelope|undefined)?.operationId as keyof typeof operations;
  if(!Object.hasOwn(operations,op))throw new ClosureError('validation_failed',400,'إجراء إغلاق غير مدعوم.');requireClosure(operations[op],value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as Close;
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driver=ownDriver(a);if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;a.assertScope({tenantId:device.tenantId,accountId:device.accountId});
   let r:RoundRow,record:ClosureRecord,changed=false;
   return executeCommandInTransaction(tx,a.commandScope,c,{
    async authorize(){await authorize(tx,a,p.workdayId);r=await round(tx,a,p.roundId,p.workdayId);},
    async writeDomain(){try{
     const guards=(await tx.query<{task_id:string;dispatch_cycle_id:string|null}>('SELECT task_id,dispatch_cycle_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,driver])).rows;
     await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driver},{kind:'workday',id:p.workdayId},...guards.flatMap(g=>g.dispatch_cycle_id?[{kind:'assignment' as const,id:g.dispatch_cycle_id}]:[]),...guards.map(g=>({kind:'task' as const,id:g.task_id}))]);
     await authorize(tx,a,p.workdayId);r=await round(tx,a,p.roundId,p.workdayId);const d=await day(tx,a,p.workdayId);
     const fenced=await executionFence(tx,c,r);if(fenced)return fenced;
     for(const id of c.dependsOnActionIds){
      if(id===c.actionId)throw new ClosureError('validation_failed',400,'الإجراء لا يمكن أن يعتمد على نفسه.');
      const dependency=await getCommandResult(tx,a.commandScope,id);
      if(!dependency)throw new ClosurePending(c.actionId);
      if(dependency.receipt.businessStatus!=='accepted')throw new ClosureError('sync_incomplete',409,'يوجد إجراء سابق لم يُقبل؛ راجع المزامنة قبل الإنهاء.');
     }
     const already=op==='round.end'?r.ended_at:d.ended_at;
     if(already){
      const found=(await tx.query<{record:ClosureRecord}>(op==='round.end'?'SELECT record FROM tawsel.closure_records WHERE tenant_id=$1 AND ended_round_id=$2':"SELECT record FROM tawsel.closure_records WHERE tenant_id=$1 AND workday_id=$2 AND operation_id='workday.end'",[r.tenant_id,op==='round.end'?r.round_id:d.workday_id])).rows[0];
      if(!found)throw new ClosureError('lifecycle_forbidden',409,'إغلاق سابق بلا سجل قابل للاسترجاع؛ راجع الحالة.');
      record=found.record;const body={disposition:'already-closed',closure:record};requireClosure('CommandResult',body);
      return {status:'accepted',response:{status:200,body},summary:{driverId:driver,workdayId:p.workdayId,roundId:r.round_id,closureId:record.closureId},audit:{changed:false,closureId:record.closureId},resourceVersions:{deviceGeneration:Number(r.device_generation)},intents:[]};
     }
     const active=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND ended_at IS NULL',[r.tenant_id,driver])).rows[0];
     if(p.expectedActiveRoundId!==(active?.round_id??null)||active&&(active.workday_id!==d.workday_id||active.round_id!==r.round_id))throw new ClosureError('stale_revision',409,'تغيّرت الجولة النشطة؛ حدّث اليوم قبل الإنهاء.');
     if(op==='round.end'&&!active)throw new ClosureError('lifecycle_forbidden',409,'لا توجد جولة نشطة لإنهائها.');
     if(!active){const latest=(await tx.query('SELECT round_id FROM tawsel.rounds WHERE tenant_id=$1 AND workday_id=$2 ORDER BY device_generation DESC LIMIT 1',[r.tenant_id,d.workday_id])).rows[0];if(latest?.round_id!==r.round_id)throw new ClosureError('stale_revision',409,'اختر آخر جولة في يوم العمل.');}
     if(await branchActivity(tx,r.tenant_id,driver))throw new ClosureError('lifecycle_forbidden',409,'أكمل زيارة الفرع وتأكيد القطع قبل إنهاء الجولة.');
     const before=await activity(tx,r.tenant_id,r.round_id),revision=Number((await tx.query('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,r.round_id])).rows[0]?.revision??0);
     if(p.expectedActivityRevision!==revision||p.expectedCurrentAttemptId!==(before?.attemptId??null))throw new ClosureError('stale_revision',409,'تغيّر العميل الحالي؛ حدّث الجولة.');
     const blocker=closureBlocker(before?.stage??null,p.currentAction);
     if(blocker)throw new ClosureError('lifecycle_forbidden',409,blocker==='arrived-outcome-required'?'سجّل نتيجة العميل الذي وصلت إليه قبل الإنهاء.':blocker==='explicit-pause-required'?'أكّد إيقاف الاتجاه للعميل الحالي قبل الإنهاء.':'تغيّر العميل الحالي؛ حدّث الجولة.');
     const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now,time={actionId:c.actionId,recordedAt:now.toISOString(),observation:c.observation};
     record={closureId:randomUUID(),operationId:op,workdayId:d.workday_id,driverId:driver,ownerRoundId:r.round_id,endedRoundId:active?.round_id??null,roundEndedAt:active?time.recordedAt:null,workdayEndedAt:op==='workday.end'?time.recordedAt:null,pausedActivity:before,activityRevision:revision+(before?1:0),time};
     requireClosure('Record',record);
     if(before){
      await tx.query("UPDATE tawsel.execution_attempts SET stage='paused',revision=$3 WHERE tenant_id=$1 AND round_id=$2 AND stage='heading'",[r.tenant_id,r.round_id,record.activityRevision]);
      await tx.query('INSERT INTO tawsel.round_activity_state (tenant_id,round_id,revision) VALUES ($1,$2,$3) ON CONFLICT(tenant_id,round_id) DO UPDATE SET revision=$3',[r.tenant_id,r.round_id,record.activityRevision]);
      await tx.query('INSERT INTO tawsel.current_activity_history (tenant_id,round_id,revision,source_id,action_id,operation_id,previous_activity,current_activity,action_time) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8)',[r.tenant_id,r.round_id,record.activityRevision,a.context.sourceId,c.actionId,op,before,time]);
     }
     if(active)await tx.query('UPDATE tawsel.rounds SET ended_at=$3 WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,active.round_id,now]);
     if(op==='workday.end')await tx.query('UPDATE tawsel.workdays SET ended_at=$3 WHERE tenant_id=$1 AND workday_id=$2',[r.tenant_id,d.workday_id,now]);
     await tx.query('INSERT INTO tawsel.closure_records (tenant_id,closure_id,driver_id,workday_id,owner_round_id,ended_round_id,operation_id,source_id,action_id,record) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[r.tenant_id,record.closureId,driver,d.workday_id,r.round_id,record.endedRoundId,op,a.context.sourceId,c.actionId,record]);
     // A planned branch endpoint belongs to this round. Releasing its reservation
     // is neither branch arrival nor confirmed receipt; customer custody is untouched.
     if(active)await tx.query("UPDATE tawsel.driver_planned_stops SET state='released' WHERE tenant_id=$1 AND driver_id=$2 AND stop_id=$3 AND kind='branch' AND state='remaining'",[r.tenant_id,driver,active.round_id]);
     changed=true;
     const sources=await sourceItems(tx,r.tenant_id,driver,d.workday_id),intents=[];
     for(const recipientId of [...new Set(sources.map(s=>s.integration_id))]){
      const payload={closureId:record.closureId,driverId:driver,workdayId:d.workday_id,endedRoundId:record.endedRoundId,roundEndedAt:record.roundEndedAt,workdayEndedAt:record.workdayEndedAt,time,tasks:sources.filter(s=>s.integration_id===recipientId).map(s=>({taskId:s.task_id,dispatchCycleId:s.dispatch_cycle_id,sourceReference:{tenantId:r.tenant_id,integrationId:recipientId,externalId:s.external_id},sourceDispatchCycleId:s.source_dispatch_cycle_id}))};requireClosure('Event',payload);
      if(active)intents.push({eventId:randomUUID(),recipientId,eventType:'round.ended',payloadVersion:'1.0.0',payload});
      if(op==='workday.end')intents.push({eventId:randomUUID(),recipientId,eventType:'workday.ended',payloadVersion:'1.0.0',payload});
     }
     const body={disposition:'closed',closure:record};requireClosure('CommandResult',body);
     return {status:'accepted',response:{status:200,body},summary:{driverId:driver,workdayId:p.workdayId,roundId:r.round_id,closureId:record.closureId},audit:{changed:true,closure:record},resourceVersions:{deviceGeneration:Number(r.device_generation),...(record.activityRevision?{resourceRevision:record.activityRevision}:{})},intents};
    }catch(e){if(e instanceof ClosureError)return rejection(c,driver,e);throw e;}},
    async writeProgress(){
     if(!changed)return;
     const s=await planningState(tx,r.tenant_id,driver),settings=s.settings&&Date.parse(s.settings.plannedStartAt)<Date.parse(record.time.recordedAt)?{...s.settings,plannedStartAt:record.time.recordedAt}:s.settings;
     await tx.query('UPDATE tawsel.planning_states SET current_target=NULL,execution_revision=execution_revision+1,settings=$3,settings_revision=settings_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver,settings]);
     await enqueuePlanning(tx,r.tenant_id,driver,a.context.sourceId,c.actionId);
    },...this.observe
   });
  });
 }
 async result(principal:AuthenticatedPrincipal,actionId:string):Promise<components['schemas']['ClosureActionStatus']>{
  uuid(actionId);return withAccess(this.pool,principal,async(a,tx)=>{
   const driver=ownDriver(a);await authorizeDriver(tx,a,driver);const result=await getCommandResult(tx,a.commandScope,actionId);if(!result)return {actionId,status:'pending'};
   if(!Object.hasOwn(operations,result.operationId)||result.summary.driverId!==driver)throw new AccessDenied(true);
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driver}]);await authorize(tx,a,String(result.summary.workdayId));requireClosure('ActionResult',result);
   return {actionId,status:result.receipt.businessStatus as 'accepted'|'rejected'|'review-required',result:result as components['schemas']['ClosureActionResult']};
  });
 }
}
