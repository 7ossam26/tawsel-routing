import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,withAccess,type AccessSession,type AuthenticatedPrincipal} from '../access/service.js';
import {executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks,type Decision} from '../commands/kernel.js';
import {canonicalJson} from '../commands/json.js';
import {lockInvariants} from '../commands/locks.js';
import type {Transaction} from '../db/transaction.js';
import {activity,own,ownDriver} from '../current/state.js';
import {planningState,snapshot,enqueuePlanning} from '../planning/queue.js';
import {authorizeDriver} from '../planning/service.js';
import type {Input} from '../planning/models.js';
import type {RoundRow} from '../rounds/models.js';
import {EligibilityError,operations,requireEligibility,type Operation,type Payload,type Record as Change} from './models.js';
import {stateFor,messages} from './state.js';
import {denied,type Choice} from './policy.js';
const choices:Record<Operation,Choice>={'task.deferWhole':'defer','task.retryWhole':'retry','task.activateDeferred':'activate','task.setDriverUrgency':'urgency'};
const events:Record<Operation,string>={'task.deferWhole':'task.deferred','task.retryWhole':'task.retryAdmitted','task.activateDeferred':'task.deferredActivated','task.setDriverUrgency':'task.driverUrgencyChanged'};
async function round(tx:Transaction,a:AccessSession,id:string){
 const row=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND round_id=$2 AND driver_id=$3',[a.context.tenantId,id,ownDriver(a)])).rows[0];if(!row)throw new AccessDenied(true);return row;
}
async function authorize(tx:Transaction,a:AccessSession){
 const driver=ownDriver(a);await authorizeDriver(tx,a,driver);
 for(const row of (await tx.query('SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,driver])).rows)a.requireResource(own,row);
}
async function remaining(tx:Transaction,input:Input){return input.accountKind==='company'?Number((await tx.query("SELECT count(*) n FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND driver_id=$2 AND state='remaining'",[input.tenantId,input.driverId])).rows[0].n):input.members.filter(m=>m.eligible).length;}
function rejection(c:ActionEnvelope,r:RoundRow,e:EligibilityError):Decision{
 const problem={type:`https://schemas.tawsel.invalid/problems/${e.code.replaceAll('_','-')}`,title:'Eligibility change rejected',code:e.code,status:e.statusCode,detail:e.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
 return {status:'rejected',problem,response:{status:e.statusCode,body:problem},summary:{driverId:r.driver_id,roundId:r.round_id,taskId:c.payload.taskId,code:e.code},audit:{taskId:c.payload.taskId,code:e.code,detail:e.message}};
}
const uuid=(value:string)=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new EligibilityError('validation_failed',400,'معرّف غير صالح.');};
export class Eligibility {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async command(principal:AuthenticatedPrincipal,value:unknown){
  const op=(value as ActionEnvelope|undefined)?.operationId as Operation;
  if(!Object.hasOwn(operations,op))throw new EligibilityError('validation_failed',400,'إجراء غير مدعوم.');requireEligibility(operations[op]+'Command',value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as Payload;
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driver=ownDriver(a);if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;a.assertScope({tenantId:device.tenantId,accountId:device.accountId});
   let r:RoundRow,change:Change;
   return executeCommandInTransaction(tx,a.commandScope,c,{
    async authorize(){await authorize(tx,a);r=await round(tx,a,p.roundId);},
    async writeDomain(){try{
     const guards=(await tx.query<{task_id:string;dispatch_cycle_id:string|null}>('SELECT task_id,dispatch_cycle_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,driver])).rows;
     await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driver},{kind:'workday',id:r.workday_id},...guards.flatMap(g=>g.dispatch_cycle_id?[{kind:'assignment' as const,id:g.dispatch_cycle_id}]:[]),...guards.map(g=>({kind:'task' as const,id:g.task_id}))]);
     r=await round(tx,a,p.roundId);
     if(r.ended_at||(await tx.query('SELECT ended_at FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[r.tenant_id,r.workday_id])).rows[0].ended_at)throw new EligibilityError('lifecycle_forbidden',409,'انتهت الجولة أو يوم العمل.');
     if(r.owner_account_id!==device.accountId||r.owner_device_id!==device.deviceId||Number(r.device_generation)!==device.deviceGeneration)throw new EligibilityError('stale_device',409,'الجولة على جهاز آخر؛ حدّث حالتها.');
     const current=await activity(tx,r.tenant_id,r.round_id),revision=Number((await tx.query('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,r.round_id])).rows[0]?.revision??0);
     if(p.expectedActivityRevision!==revision||p.expectedCurrentAttemptId!==(current?.attemptId??null))throw new EligibilityError('stale_revision',409,'تغيّر العميل الحالي؛ حدّث الجولة.');
     const planning=await planningState(tx,r.tenant_id,driver),input=await snapshot(tx,planning),m=input.members.find(m=>m.taskId===p.taskId&&m.attemptId===p.attemptId);
     if(!m)throw new EligibilityError('stale_revision',409,'المحاولة لم تعد متاحة لك.');
     a.requireResource(own,{tenant_id:r.tenant_id,driver_id:driver,branch_id:m.branchId,integration_id:m.integrationId});
     const {state,facts}=await stateFor(tx,r.tenant_id,driver,m,current?.attemptId??null,await remaining(tx,input));
     if(state.revision!==p.expectedEligibilityRevision||m.sourceRevision!==p.expectedSourceRevision||m.assignmentRevision!==p.expectedAssignmentRevision||m.pinRevision!==p.expectedPinRevision)throw new EligibilityError('stale_revision',409,'تغيّرت المهمة؛ حدّث بياناتها.');
     const choice=choices[op],reason=denied(facts,choice);if(reason)throw new EligibilityError(reason==='capacity'?'capacity_exceeded':'lifecycle_forbidden',409,`${reason}: ${messages[reason]}`);
     const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
     if(choice==='defer'&&Date.parse(p.earliestAt!)<=now.getTime())throw new EligibilityError('validation_failed',400,'وقت التأجيل يجب أن يكون في المستقبل.');
     let attemptId=m.attemptId;
     if(choice==='retry'){
      attemptId=randomUUID();
      await tx.query('UPDATE tawsel.planning_attempts SET latest=false WHERE tenant_id=$1 AND attempt_id=$2',[r.tenant_id,m.attemptId]);
      await tx.query('INSERT INTO tawsel.planning_attempts (tenant_id,attempt_id,task_id,b2c_task_id,dispatch_cycle_id,previous_attempt_id) VALUES ($1,$2,$3,$4,$5,$6)',[r.tenant_id,attemptId,m.taskId,m.dispatchCycleId?null:m.taskId,m.dispatchCycleId,m.attemptId]);
     }
     const earliestAt=choice==='defer'?p.earliestAt!:state.earliestAt,urgency=choice==='urgency'?p.urgency!:state.urgency,isDeferred=choice==='defer'?true:choice==='retry'||choice==='activate'?false:state.deferred;
     await tx.query(`INSERT INTO tawsel.task_execution_options (tenant_id,task_id,attempt_id,revision,earliest_at,urgency,deferred) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(tenant_id,task_id) DO UPDATE SET attempt_id=$3,revision=$4,
       earliest_at=CASE WHEN $8 THEN $5 ELSE task_execution_options.earliest_at END,
       urgency=CASE WHEN $9 THEN $6 ELSE task_execution_options.urgency END,deferred=$7`,[r.tenant_id,m.taskId,attemptId,state.revision+1,choice==='defer'?earliestAt:null,choice==='urgency'?urgency:null,isDeferred,choice==='defer',choice==='urgency']);
     if(m.dispatchCycleId&&choice!=='urgency')await tx.query("UPDATE tawsel.driver_planned_stops SET state=$3 WHERE tenant_id=$1 AND dispatch_cycle_id=$2",[r.tenant_id,m.dispatchCycleId,choice==='defer'?(facts.outcome?'completed':'paused'):'remaining']);
     // Future held work can have no reservation yet. Explicit activation creates
     // it only after the same capacity test; there is no uncounted backlog.
     if(m.dispatchCycleId&&(choice==='retry'||choice==='activate'))await tx.query(`INSERT INTO tawsel.driver_planned_stops (tenant_id,stop_id,driver_id,kind,dispatch_cycle_id,state) VALUES ($1,$2,$3,'customer',$4,'remaining') ON CONFLICT(tenant_id,dispatch_cycle_id) DO NOTHING`,[r.tenant_id,randomUUID(),driver,m.dispatchCycleId]);
     const updated=await snapshot(tx,planning),member=updated.members.find(x=>x.taskId===m.taskId)!;
     const source=m.dispatchCycleId?(await tx.query('SELECT t.external_id,c.source_dispatch_cycle_id FROM tawsel.b2b_tasks t JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,task_id) WHERE t.tenant_id=$1 AND c.dispatch_cycle_id=$2',[r.tenant_id,m.dispatchCycleId])).rows[0]:null;
     change={operationId:op,roundId:r.round_id,driverId:driver,taskId:m.taskId,previousAttemptId:m.attemptId,attemptId,revision:state.revision+1,earliestAt:member.earliestAt,urgency:member.priority,deferred:isDeferred,
      sourceReference:source?{tenantId:r.tenant_id,integrationId:m.integrationId!,externalId:source.external_id}:null,sourceDispatchCycleId:source?.source_dispatch_cycle_id??null,sourceRevision:m.sourceRevision,assignmentRevision:m.assignmentRevision,dispatchCycleId:m.dispatchCycleId,
      time:{actionId:c.actionId,recordedAt:now.toISOString(),observation:c.observation}};
     requireEligibility('Record',change);
     await tx.query('INSERT INTO tawsel.task_eligibility_history (tenant_id,task_id,revision,source_id,action_id,record) VALUES ($1,$2,$3,$4,$5,$6)',[r.tenant_id,m.taskId,change.revision,a.context.sourceId,c.actionId,change]);
     const body={change,state:(await stateFor(tx,r.tenant_id,driver,member,current?.attemptId??null,await remaining(tx,updated))).state};requireEligibility('CommandResult',body);
     const event={change};requireEligibility('Event',event);
     return {status:'accepted',response:{status:200,body},summary:{roundId:r.round_id,driverId:driver,taskId:m.taskId,revision:change.revision},audit:{change,previousState:state},resourceVersions:{resourceRevision:change.revision,deviceGeneration:Number(r.device_generation)},intents:m.integrationId?[{eventId:randomUUID(),recipientId:m.integrationId,eventType:events[op],payloadVersion:'1.0.0',payload:event}]:[]};
    }catch(e){if(e instanceof EligibilityError)return rejection(c,r,e);throw e;}},
    async writeProgress(){
     const s=await planningState(tx,r.tenant_id,driver),settings=s.settings&&Date.parse(s.settings.plannedStartAt)<Date.parse(change.time.recordedAt)?{...s.settings,plannedStartAt:change.time.recordedAt}:s.settings;
     await tx.query('UPDATE tawsel.planning_states SET execution_revision=execution_revision+1,settings=$3,settings_revision=settings_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driver,settings]);
     await enqueuePlanning(tx,r.tenant_id,driver,a.context.sourceId,c.actionId);
    },...this.observe
   });
  });
 }
 async read(principal:AuthenticatedPrincipal,roundId:string):Promise<components['schemas']['EligibilitySnapshot']>{
  uuid(roundId);return withAccess(this.pool,principal,async(a,tx)=>{
   await authorize(tx,a);const driver=ownDriver(a);await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driver}]);const r=await round(tx,a,roundId),current=await activity(tx,r.tenant_id,r.round_id);
   const input=await snapshot(tx,await planningState(tx,r.tenant_id,driver)),n=await remaining(tx,input),items=[];
   for(const m of input.members)items.push((await stateFor(tx,r.tenant_id,driver,m,current?.attemptId??null,n)).state);
   const history=(await tx.query<{record:Change}>("SELECT h.record FROM tawsel.task_eligibility_history h JOIN tawsel.location_tasks t USING(tenant_id,task_id) WHERE h.tenant_id=$1 AND t.driver_id=$2 ORDER BY h.record->'time'->>'recordedAt',h.task_id,h.revision",[r.tenant_id,driver])).rows.map(x=>x.record);
   const result={roundId,activityRevision:Number((await tx.query('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,roundId])).rows[0]?.revision??0),currentAttemptId:current?.attemptId??null,items,history};requireEligibility('Snapshot',result);return result;
  });
 }
 async result(principal:AuthenticatedPrincipal,actionId:string):Promise<components['schemas']['EligibilityActionStatus']>{
  uuid(actionId);return withAccess(this.pool,principal,async(a,tx)=>{
   await authorize(tx,a);const result=await getCommandResult(tx,a.commandScope,actionId);if(!result)return {actionId,status:'pending'};
   if(!Object.hasOwn(operations,result.operationId)||result.summary.driverId!==ownDriver(a))throw new AccessDenied(true);await round(tx,a,String(result.summary.roundId));requireEligibility('ActionResult',result);
   return {actionId,status:result.receipt.businessStatus as 'accepted'|'rejected'|'review-required',result:result as components['schemas']['EligibilityActionResult']};
  });
 }
}
