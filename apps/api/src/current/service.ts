import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { AccessDenied,withAccess,type AccessSession,type AuthenticatedPrincipal } from '../access/service.js';
import { executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks,type Decision } from '../commands/kernel.js';
import { canonicalJson } from '../commands/json.js';
import { normalizePhone } from '../auth/crypto.js';
import { lockInvariants } from '../commands/locks.js';
import type { Transaction } from '../db/transaction.js';
import { enqueuePlanning,fingerprint,planningState,snapshot } from '../planning/queue.js';
import { authorizeDriver } from '../planning/service.js';
import type { Input } from '../planning/models.js';
import type { RoundRow } from '../rounds/models.js';
import { activity,eligibleTarget,own,ownDriver,physicalOrigin } from './state.js';
import { CurrentError,requireCurrent,type ActionTime,type Activity,type Selection,type Target } from './models.js';

async function round(tx:Transaction,a:AccessSession,roundId:string){
 const r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND round_id=$2 AND driver_id=$3',[a.context.tenantId,roundId,ownDriver(a)])).rows[0];
 if(!r)throw new AccessDenied(true);return r;
}
function inputAccess(a:AccessSession,input:Input){for(const m of input.members)a.requireResource(own,{tenant_id:input.tenantId,driver_id:input.driverId,branch_id:m.branchId,integration_id:m.integrationId});}
async function revision(tx:Transaction,tenant:string,roundId:string){return Number((await tx.query<{revision:string}>('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[tenant,roundId])).rows[0]?.revision??0);}
function rejected(c:ActionEnvelope,r:RoundRow,error:CurrentError):Decision {
 const problem={type:`https://schemas.tawsel.invalid/problems/${error.code.replaceAll('_','-')}`,title:'Current activity rejected',code:error.code,status:error.statusCode,detail:error.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
 return {status:'rejected',problem,response:{status:error.statusCode,body:problem},summary:{roundId:r.round_id,driverId:r.driver_id,taskId:c.payload.taskId??null,code:error.code},audit:{roundId:r.round_id,code:error.code}};
}
export class CurrentActivity {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async command(principal:AuthenticatedPrincipal,value:unknown){
  const op=(value as ActionEnvelope|undefined)?.operationId;
  const name=op==='current.selectHeading'?'SelectHeadingCommand':op==='current.recordArrival'?'ArrivalCommand':op==='current.correctOrigin'?'CorrectOriginCommand':null;
  if(!name)throw new CurrentError('validation_failed',400,'نوع الإجراء غير صالح.');requireCurrent(name,value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as Selection;
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;
   a.assertScope({tenantId:device.tenantId,accountId:device.accountId});
   let r:RoundRow;
   return executeCommandInTransaction(tx,a.commandScope,c,{
    async authorize(){
     await authorizeDriver(tx,a,driverId);r=await round(tx,a,p.roundId);
     // Visibility is rechecked even for a retained successful response.
     const rows=(await tx.query('SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,driverId])).rows;
     for(const row of rows)a.requireResource(own,row);
    },
    async writeDomain(){try{
     const guards=(await tx.query<{task_id:string;dispatch_cycle_id:string|null}>('SELECT task_id,dispatch_cycle_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,driverId])).rows;
     await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driverId},{kind:'workday',id:r.workday_id},...guards.flatMap(g=>g.dispatch_cycle_id?[{kind:'assignment' as const,id:g.dispatch_cycle_id}]:[]),...guards.map(g=>({kind:'task' as const,id:g.task_id}))]);
     r=await round(tx,a,p.roundId);
     if(r.ended_at)throw new CurrentError('lifecycle_forbidden',409,'الجولة انتهت.');
     if(r.owner_account_id!==device.accountId||r.owner_device_id!==device.deviceId||Number(r.device_generation)!==device.deviceGeneration)throw new CurrentError('stale_device',409,'هذه الجولة تعمل على جهاز آخر؛ حدّث حالة الجولة.');
     const state=await planningState(tx,r.tenant_id,driverId),input=await snapshot(tx,state);inputAccess(a,input);
     const before=await activity(tx,r.tenant_id,r.round_id),rev=await revision(tx,r.tenant_id,r.round_id);
     const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
     const time:ActionTime={actionId:c.actionId,recordedAt:now.toISOString(),observation:c.observation};
     let current:Activity|null=before,origin=await physicalOrigin(tx,r.tenant_id,driverId),nextRevision=rev;
     let member:Input['members'][number]|undefined;
     if(op==='current.correctOrigin'){
      const correction=c.payload as components['schemas']['CurrentCorrectOrigin'];
      if(correction.expectedOriginRevision!==(origin?.revision??0))throw new CurrentError('stale_revision',409,'تغيّرت نقطة الانطلاق؛ حدّث الجولة.');
      origin={kind:'manual-pin',coordinates:correction.coordinates,revision:(origin?.revision??0)+1,roundId:r.round_id,taskId:null,attemptId:null,time};
     }else{
      if(p.expectedActivityRevision!==rev||p.expectedCurrentAttemptId!==(before?.attemptId??null))throw new CurrentError('stale_revision',409,'تغيّرت المحطة الحالية؛ حدّث الجولة.');
      member=await eligibleTarget(tx,a,r,input,p);
      if(op==='current.selectHeading'){
       if(before?.stage==='arrived')throw new CurrentError('lifecycle_forbidden',409,'سجّل نتيجة العميل الذي وصلت إليه أولًا.');
       if(before?.attemptId===p.attemptId)throw new CurrentError('lifecycle_forbidden',409,'أنت متجه لهذا العميل بالفعل.');
       current={taskId:p.taskId,attemptId:p.attemptId,revision:rev+1,stage:'heading',heading:time,arrival:null};
       await tx.query("UPDATE tawsel.execution_attempts SET stage='paused',revision=$3 WHERE tenant_id=$1 AND round_id=$2 AND stage='heading'",[r.tenant_id,r.round_id,rev+1]);
       await tx.query(`INSERT INTO tawsel.execution_attempts (tenant_id,round_id,attempt_id,task_id,stage,first_heading,heading,revision)
        VALUES ($1,$2,$3,$4,'heading',$5,$5,$6) ON CONFLICT (tenant_id,round_id,attempt_id) DO UPDATE SET stage='heading',heading=$5,revision=$6`,[r.tenant_id,r.round_id,p.attemptId,p.taskId,time,rev+1]);
      }else{
       if(before?.stage!=='heading'||before.attemptId!==p.attemptId||before.taskId!==p.taskId)throw new CurrentError('lifecycle_forbidden',409,'اختر الاتجاه لهذا العميل قبل تسجيل الوصول.');
       current={...before,stage:'arrived',revision:rev+1,arrival:time};
       origin={kind:'last-confirmed-stop',coordinates:member.coordinates!,revision:(origin?.revision??0)+1,roundId:r.round_id,taskId:p.taskId,attemptId:p.attemptId,time};
       await tx.query("UPDATE tawsel.execution_attempts SET stage='arrived',arrival=$4,revision=$5 WHERE tenant_id=$1 AND round_id=$2 AND attempt_id=$3",[r.tenant_id,r.round_id,p.attemptId,time,rev+1]);
      }
      nextRevision=rev+1;
      await tx.query(`INSERT INTO tawsel.round_activity_state (tenant_id,round_id,revision) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,round_id) DO UPDATE SET revision=$3`,[r.tenant_id,r.round_id,nextRevision]);
      await tx.query('INSERT INTO tawsel.current_activity_history (tenant_id,round_id,revision,source_id,action_id,operation_id,previous_activity,current_activity,action_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[r.tenant_id,r.round_id,nextRevision,a.context.sourceId,c.actionId,op,before,current,time]);
     }
     if(op!=='current.selectHeading')await tx.query('INSERT INTO tawsel.physical_origin_history (tenant_id,driver_id,revision,round_id,source_id,action_id,origin) VALUES ($1,$2,$3,$4,$5,$6,$7)',[r.tenant_id,driverId,origin!.revision,r.round_id,a.context.sourceId,c.actionId,origin]);
     const target=current?{taskId:current.taskId,attemptId:current.attemptId,revision:nextRevision}:null;
     // Projection and new planning input are in the same command commit. No
     // network work, inferred arrival or mutation of an immutable forecast.
     const settings=state.settings&&Date.parse(state.settings.plannedStartAt)<now.getTime()?{...state.settings,plannedStartAt:time.recordedAt}:state.settings;
     await tx.query('UPDATE tawsel.planning_states SET current_target=$3,physical_origin=$4,execution_revision=execution_revision+1,settings=$5,settings_revision=settings_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driverId,target,origin,settings]);
     await enqueuePlanning(tx,r.tenant_id,driverId,a.context.sourceId,c.actionId);
     const intents=[];
     // A replaced heading may belong to another source. Notify that source of
     // its own paused task, never leak the new recipient/task across sources.
     if(op==='current.selectHeading'&&before){const old=input.members.find(m=>m.attemptId===before.attemptId);if(old?.integrationId)intents.push({eventId:randomUUID(),recipientId:old.integrationId,eventType:'current.headingSelected',payloadVersion:'1.0.0',payload:{roundId:r.round_id,driverId,taskId:old.taskId,attemptId:old.attemptId,activityRevision:nextRevision,stage:'paused',time}});}
     if(member?.integrationId)intents.push({eventId:randomUUID(),recipientId:member.integrationId,eventType:op==='current.selectHeading'?'current.headingSelected':'current.arrivalRecorded',payloadVersion:'1.0.0',payload:{roundId:r.round_id,driverId,taskId:member.taskId,attemptId:member.attemptId,activityRevision:nextRevision,stage:current!.stage,time}});
     for(const intent of intents)requireCurrent(intent.eventType==='current.arrivalRecorded'?'ArrivalEvent':'HeadingEvent',intent.payload);
     const body={roundId:r.round_id,revision:nextRevision,currentActivity:current,physicalOrigin:origin};
     requireCurrent('CommandResult',body);
     return {status:'accepted',response:{status:200,body},summary:{roundId:r.round_id,driverId,taskId:member?.taskId??null,activityRevision:nextRevision},audit:{roundId:r.round_id,previousActivity:before,currentActivity:current,physicalOrigin:origin},resourceVersions:{resourceRevision:nextRevision,deviceGeneration:Number(r.device_generation)},intents};
    }catch(error){if(error instanceof CurrentError)return rejected(c,r,error);throw error;}},
    async writeProgress(){/* The execution/current/planning projections above share this transaction. */},...this.observe
   });
  });
 }
 async read(principal:AuthenticatedPrincipal,roundId:string):Promise<components['schemas']['CurrentSnapshot']>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roundId))throw new CurrentError('validation_failed',400,'معرّف الجولة غير صالح.');
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);await authorizeDriver(tx,a,driverId);await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driverId}]);
   const r=await round(tx,a,roundId);if(r.ended_at)throw new CurrentError('lifecycle_forbidden',409,'الجولة انتهت.');
   const state=await planningState(tx,r.tenant_id,driverId),input=await snapshot(tx,state);inputAccess(a,input);
   const current=await activity(tx,r.tenant_id,roundId),origin=await physicalOrigin(tx,r.tenant_id,driverId);
   const details=(await tx.query<{task_id:string;recipient_name:string;phone:string;address:string|null}>(`SELECT t.task_id,t.recipient_name,COALESCE(b.recipient_phone_normalized,s.payload->>'recipientPhone') AS phone,t.original->>'addressText' AS address
    FROM tawsel.location_tasks t LEFT JOIN tawsel.b2c_tasks b USING(tenant_id,task_id) LEFT JOIN tawsel.b2b_source_snapshots s ON s.tenant_id=t.tenant_id AND s.task_id=t.task_id AND s.source_revision=t.source_revision
    JOIN tawsel.round_admissions a ON a.tenant_id=t.tenant_id AND a.task_id=t.task_id AND a.round_id=$3 WHERE t.tenant_id=$1 AND t.driver_id=$2`,[r.tenant_id,driverId,roundId])).rows;
   const now=Date.now(),targets:Target[]=input.members.filter(m=>m.eligible&&m.departureAt&&(!m.earliestAt||Date.parse(m.earliestAt)<=now)&&details.some(d=>d.task_id===m.taskId)).map(m=>{
    const d=details.find(d=>d.task_id===m.taskId)!;return {taskId:m.taskId,attemptId:m.attemptId,sourceRevision:m.sourceRevision,assignmentRevision:m.assignmentRevision,pinRevision:m.pinRevision,coordinates:m.coordinates!,recipientName:d.recipient_name,recipientPhone:normalizePhone(d.phone),address:d.address};
   });
   const plan=(await tx.query<{plan_id:string;fingerprint:string;route_policy:{orderedTaskIds:string[]}}>("SELECT * FROM tawsel.plan_revisions WHERE tenant_id=$1 AND driver_id=$2 AND state IN ('ready','manual') ORDER BY revision DESC LIMIT 1",[r.tenant_id,driverId])).rows[0];
   const next=plan?.route_policy.orderedTaskIds.map(id=>targets.find(t=>t.taskId===id)).find(t=>t&&t.attemptId!==current?.attemptId)??null;
   const result={roundId,driverId,owner:{accountId:r.owner_account_id,deviceId:r.owner_device_id,generation:Number(r.device_generation)},revision:await revision(tx,r.tenant_id,roundId),currentActivity:current,physicalOrigin:origin,planningOrigin:input.settings!.origin,nextSuggestion:next,planning:{planId:plan?.plan_id??null,updating:plan?.fingerprint!==fingerprint(input)},targets};
   requireCurrent('Snapshot',result);return result;
  });
 }
 async result(principal:AuthenticatedPrincipal,actionId:string):Promise<components['schemas']['CurrentActionStatus']>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actionId))throw new CurrentError('validation_failed',400,'معرّف الإجراء غير صالح.');
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);await authorizeDriver(tx,a,driverId);const result=await getCommandResult(tx,a.commandScope,actionId);
   if(!result)return {actionId,status:'pending'};
   if(!['current.selectHeading','current.recordArrival','current.correctOrigin'].includes(result.operationId)||result.summary.driverId!==driverId)throw new AccessDenied(true);
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driverId}]);await round(tx,a,String(result.summary.roundId));inputAccess(a,await snapshot(tx,await planningState(tx,a.context.tenantId,driverId)));
   requireCurrent('ActionResult',result);return {actionId,status:result.receipt.businessStatus as 'accepted'|'rejected'|'review-required',result:result as components['schemas']['CurrentActionResult']};
  });
 }
}
