import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,withAccess,type AuthenticatedPrincipal} from '../access/service.js';
import {canonicalJson} from '../commands/json.js';
import {executeCommandInTransaction,type ActionEnvelope,type CommandHooks} from '../commands/kernel.js';
import {activity,own,ownDriver,physicalOrigin} from '../current/state.js';
import {authorizeDriver} from '../planning/service.js';
import {executionFence} from '../devices/fence.js';
import {planningState,snapshot,enqueuePlanning} from '../planning/queue.js';
import {publishManual} from '../planning/manual.js';
import type {RoundRow} from '../rounds/models.js';
import {confirmation,lockDriver,requestRow,requestView} from '../returns/state.js';
import {ReturnError,unique} from '../returns/models.js';
import {rejection} from '../returns/service.js';
import {requireBranch} from './models.js';
import {branchActivity} from './state.js';
import {publishBranch} from './publication.js';
const ops={'branch.interruptRound':'InterruptCommand','branch.recordArrival':'ArrivalCommand','branch.resumeRound':'ResumeCommand'} as const;
export class Branches{
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async command(principal:AuthenticatedPrincipal,value:unknown){
  const op=(value as ActionEnvelope)?.operationId as keyof typeof ops;
  if(!Object.hasOwn(ops,op))throw new ReturnError('validation_failed',400,'إجراء الفرع غير صالح.');requireBranch(ops[op],value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as components['schemas']['BranchInterrupt']&components['schemas']['BranchTransition'];
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driver=ownDriver(a);if(a.context.tenantKind!=='company'||c.context.kind!=='device')throw new AccessDenied();a.assertScope({tenantId:c.context.tenantId,accountId:c.context.accountId});
   let r:RoundRow;
   const authorize=async()=>{
    await authorizeDriver(tx,a,driver);
    r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND round_id=$2 AND driver_id=$3',[a.context.tenantId,p.roundId,driver])).rows[0]!;if(!r)throw new AccessDenied(true);
    const id=op==='branch.interruptRound'?p.requestId:(await tx.query('SELECT request_id FROM tawsel.branch_activities WHERE tenant_id=$1 AND segment_id=$2 AND round_id=$3 AND driver_id=$4',[r.tenant_id,p.segmentId,r.round_id,driver])).rows[0]?.request_id;
    if(!id)throw new AccessDenied(true);await requestRow(tx,a,id);
    for(const row of (await tx.query('SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver])).rows)a.requireResource(own,row);
   };
   return executeCommandInTransaction(tx,a.commandScope,c,{authorize,async writeDomain(){try{
    await lockDriver(tx,a.context.tenantId,driver,p.roundId);await authorize();const fence=await executionFence(tx,c,r);if(fence)return fence;
    if(r.ended_at)throw new ReturnError('lifecycle_forbidden',409,'الجولة انتهت.');
    const before=await activity(tx,r.tenant_id,r.round_id),rev=Number((await tx.query('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,r.round_id])).rows[0]?.revision??0);
    if(p.expectedActivityRevision!==rev||p.expectedCurrentAttemptId!==(before?.attemptId??null))throw new ReturnError('stale_revision',409,'تغيّر النشاط الحالي؛ حدّث الجولة.');
    let b=await branchActivity(tx,r.tenant_id,driver);
    const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() now')).rows[0]!.now,time={actionId:c.actionId,recordedAt:now.toISOString(),observation:c.observation};
    const state=await planningState(tx,r.tenant_id,driver),input=await snapshot(tx,state);
    if(op==='branch.interruptRound'){
     if(b||before?.stage==='arrived')throw new ReturnError('lifecycle_forbidden',409,b?'أكمل زيارة الفرع الحالية.':'سجّل نتيجة العميل الذي وصلت إليه أولًا.');
     const request=await requestRow(tx,a,p.requestId),view=await requestView(tx,request);unique(p.claims.map(x=>x.itemId));confirmation(view,p.claims);
     if(p.claims.some(x=>view.items.find(i=>i.itemId===x.itemId)!.eligibility==='superseded'))throw new ReturnError('stale_revision',409,'تغيّرت حيازة القطع المعروضة.');
     const location=(await tx.query(`SELECT p.state->'location' AS location FROM tawsel.provisioning_records p JOIN tawsel.branches b ON b.tenant_id=p.tenant_id AND b.branch_id=p.resource_id WHERE p.tenant_id=$1 AND p.integration_id=$2 AND p.entity='branch' AND p.resource_id=$3 AND b.enabled`,[r.tenant_id,request.integration_id,request.branch_id])).rows[0]?.location;
     if(!location)throw new ReturnError('dependency_missing',409,'حدّد المصدر موقع فرع الإرسال أولًا.');
     const prior=(await tx.query('SELECT plan_id,route_policy FROM tawsel.plan_revisions WHERE tenant_id=$1 AND driver_id=$2 AND state IN (\'ready\',\'manual\') ORDER BY revision DESC LIMIT 1',[r.tenant_id,driver])).rows[0];
     if(!prior)throw new ReturnError('dependency_missing',409,'خطة العملاء المحفوظة غير متاحة.');
     const eligible=input.members.filter(m=>m.eligible);const order=[...(before?[before.taskId]:[]),...prior.route_policy.orderedTaskIds,...eligible.map(m=>m.taskId)] as string[];
     const retained=[...new Set(order)].flatMap(id=>{const m=eligible.find(m=>m.taskId===id);return m?[{taskId:id,attemptId:m.attemptId}]:[];});
     b={segmentId:randomUUID(),roundId:r.round_id,requestId:request.request_id,sourceBranchId:request.branch_id,revision:1,stage:'heading',coordinates:location,serviceEstimateSeconds:p.serviceEstimateSeconds,claims:p.claims,retainedPlanId:prior.plan_id,retainedSequence:retained,pausedActivity:before,heading:time,arrival:null,resumed:null};
     if(retained.length>50)throw new ReturnError('capacity_exceeded',409,'العمل المقبول يتجاوز حد المحطات.');
     await tx.query("UPDATE tawsel.execution_attempts SET stage='paused',revision=$3 WHERE tenant_id=$1 AND round_id=$2 AND stage='heading'",[r.tenant_id,r.round_id,rev+1]);
     await tx.query('INSERT INTO tawsel.branch_activities (tenant_id,segment_id,round_id,driver_id,request_id,active,record) VALUES ($1,$2,$3,$4,$5,true,$6)',[r.tenant_id,b.segmentId,r.round_id,driver,b.requestId,b]);
    }else{
     if(!b||b.segmentId!==p.segmentId||b.revision!==p.expectedBranchRevision)throw new ReturnError('stale_revision',409,'تغيّرت زيارة الفرع؛ حدّث الجولة.');
     const request=await requestRow(tx,a,b.requestId);
     if(op==='branch.recordArrival'){
      if(b.stage!=='heading')throw new ReturnError('lifecycle_forbidden',409,'الوصول مسجّل بالفعل.');
      b={...b,stage:'arrived',revision:b.revision+1,arrival:time};
      const prior=await physicalOrigin(tx,r.tenant_id,driver),origin={kind:'branch-pin' as const,coordinates:b.coordinates,revision:(prior?.revision??0)+1,roundId:r.round_id,taskId:null,attemptId:null,time};
      await tx.query('INSERT INTO tawsel.physical_origin_history (tenant_id,driver_id,revision,round_id,source_id,action_id,origin) VALUES ($1,$2,$3,$4,$5,$6,$7)',[r.tenant_id,driver,origin.revision,r.round_id,a.context.sourceId,c.actionId,origin]);
      await tx.query('UPDATE tawsel.planning_states SET physical_origin=$3 WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver,origin]);
     }else{
      if(b.stage!=='arrived')throw new ReturnError('lifecycle_forbidden',409,'أكّد الوصول إلى الفرع أولًا.');
      if(confirmation(await requestView(tx,request),b.claims).state!=='confirmed')throw new ReturnError('dependency_missing',409,'بانتظار تأكيد الفرع للقطع التي سلّمتها. الباقي يظل ظاهرًا بحالته.');
      b={...b,stage:'resumed',revision:b.revision+1,resumed:time};
     }
     await tx.query('UPDATE tawsel.branch_activities SET active=$3,record=$4 WHERE tenant_id=$1 AND segment_id=$2',[r.tenant_id,b.segmentId,b.stage!=='resumed',b]);
    }
    await tx.query('INSERT INTO tawsel.branch_activity_history (tenant_id,segment_id,revision,source_id,action_id,record) VALUES ($1,$2,$3,$4,$5,$6)',[r.tenant_id,b.segmentId,b.revision,a.context.sourceId,c.actionId,b]);
    await tx.query('INSERT INTO tawsel.round_activity_state (tenant_id,round_id,revision) VALUES ($1,$2,$3) ON CONFLICT(tenant_id,round_id) DO UPDATE SET revision=$3',[r.tenant_id,r.round_id,rev+1]);
    await tx.query('INSERT INTO tawsel.current_activity_history (tenant_id,round_id,revision,source_id,action_id,operation_id,previous_activity,current_activity,action_time) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8)',[r.tenant_id,r.round_id,rev+1,a.context.sourceId,c.actionId,op,before,time]);
    await tx.query('UPDATE tawsel.planning_states SET current_target=NULL,execution_revision=execution_revision+1,input_revision=input_revision+1,settings=jsonb_set(settings,\'{plannedStartAt}\',to_jsonb($3::text)),settings_revision=settings_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver,time.recordedAt]);
    let planId:string|null;
    if(b.stage==='resumed'){
     const fresh=await planningState(tx,r.tenant_id,driver),next=await snapshot(tx,fresh);
     const rank=new Map(b.retainedSequence.map((s,i)=>[s.attemptId,i]));
     const order=next.members.filter(m=>m.eligible).sort((x,y)=>Number(y.priority==='urgent')-Number(x.priority==='urgent')||(rank.get(x.attemptId)??1e6)-(rank.get(y.attemptId)??1e6)||x.taskId.localeCompare(y.taskId)).map(m=>m.taskId);
     if(order.length){planId=(await publishManual(tx,fresh,next,{driverId:driver,expectedSettingsRevision:next.settingsRevision,expectedInputRevision:next.inputRevision,expectedManualRevision:next.manualRevision,selection:{kind:'order',taskIds:order}},a.context.sourceId,c.actionId)).planId;}
     else {planId=null;await tx.query('UPDATE tawsel.planning_states SET current_plan_id=NULL WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver]);}
     await enqueuePlanning(tx,r.tenant_id,driver,a.context.sourceId,c.actionId);
    }else planId=await publishBranch(tx,r.tenant_id,driver,b,a.context.sourceId,c.actionId);
    const body={branchActivity:b,activityRevision:rev+1,planId};requireBranch('Result',body);
    const payload={segmentId:b.segmentId,roundId:r.round_id,driverId:driver,sourceBranchId:b.sourceBranchId,stage:b.stage,activityRevision:rev+1,time};requireBranch('Event',payload);
    const request=await requestRow(tx,a,b.requestId);
    return {status:'accepted',response:{status:200,body},summary:{roundId:r.round_id,driverId:driver,segmentId:b.segmentId},audit:{branchActivity:b},resourceVersions:{resourceRevision:rev+1,deviceGeneration:Number(r.device_generation)},intents:[{eventId:randomUUID(),recipientId:request.integration_id,eventType:op==='branch.interruptRound'?'branch.roundInterrupted':op==='branch.recordArrival'?'branch.arrivalRecorded':'branch.roundResumed',payloadVersion:'1.0.0',payload}]};
   }catch(e){if(e instanceof ReturnError)return rejection(c,e,{driverId:driver,roundId:p.roundId});throw e;}},async writeProgress(){},...this.observe});
  });
 }
}
