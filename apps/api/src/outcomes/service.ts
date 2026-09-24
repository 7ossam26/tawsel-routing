import {appendOutcome} from './persistence.js';
import {executionFence} from '../devices/fence.js';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { AccessDenied,withAccess,type AccessSession,type AuthenticatedPrincipal } from '../access/service.js';
import { executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks,type Decision } from '../commands/kernel.js';
import { canonicalJson } from '../commands/json.js';
import { lockInvariants } from '../commands/locks.js';
import type { Transaction } from '../db/transaction.js';
import { activity,eligibleTarget,own,ownDriver,physicalOrigin } from '../current/state.js';
import { CurrentError,type ActionTime } from '../current/models.js';
import { planningState,snapshot,enqueuePlanning } from '../planning/queue.js';
import { authorizeDriver } from '../planning/service.js';
import type { RoundRow } from '../rounds/models.js';
import { calculate,money,type Frozen } from './arithmetic.js';
import { OutcomeError,operations,requireOutcome,type Operation,type OutcomePayload,type OutcomeRecord } from './models.js';

async function round(tx:Transaction,a:AccessSession,id:string){
 const r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND round_id=$2 AND driver_id=$3',[a.context.tenantId,id,ownDriver(a)])).rows[0];
 if(!r)throw new AccessDenied(true);return r;
}
async function authorize(tx:Transaction,a:AccessSession){
 const driver=ownDriver(a);await authorizeDriver(tx,a,driver);
 const rows=(await tx.query('SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,driver])).rows;
 for(const row of rows)a.requireResource(own,row);
}
function rejected(c:ActionEnvelope,r:RoundRow,error:OutcomeError|CurrentError):Decision{
 const problem={type:`https://schemas.tawsel.invalid/problems/${error.code.replaceAll('_','-')}`,title:'Outcome rejected',code:error.code,status:error.statusCode,detail:error.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
 return {status:'rejected',problem,response:{status:error.statusCode,body:problem},summary:{driverId:r.driver_id,roundId:r.round_id,taskId:c.payload.taskId,code:error.code},audit:{roundId:r.round_id,taskId:c.payload.taskId,code:error.code}};
}
const uuid=(value:string)=>{if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new OutcomeError('validation_failed',400,'معرّف غير صالح.');};
export class Outcomes {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async command(principal:AuthenticatedPrincipal,value:unknown){
  const op=(value as ActionEnvelope|undefined)?.operationId as Operation;
  if(!Object.hasOwn(operations,op))throw new OutcomeError('validation_failed',400,'نوع النتيجة غير صالح.');requireOutcome(operations[op]+'Command',value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as OutcomePayload;
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driverId=ownDriver(a);if(c.context.kind!=='device')throw new AccessDenied();const device=c.context;
   a.assertScope({tenantId:device.tenantId,accountId:device.accountId});
   let r:RoundRow,accepted:OutcomeRecord,before:Awaited<ReturnType<typeof activity>>,activityRevision:number,time:ActionTime;
   return executeCommandInTransaction(tx,a.commandScope,c,{
    async authorize(){await authorize(tx,a);r=await round(tx,a,p.roundId);},
    async writeDomain(){try{
     const guards=(await tx.query<{task_id:string;dispatch_cycle_id:string|null}>('SELECT task_id,dispatch_cycle_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2',[a.context.tenantId,driverId])).rows;
     await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:driverId},{kind:'workday',id:r.workday_id},...guards.flatMap(g=>g.dispatch_cycle_id?[{kind:'assignment' as const,id:g.dispatch_cycle_id}]:[]),...guards.map(g=>({kind:'task' as const,id:g.task_id}))]);
     r=await round(tx,a,p.roundId);
     const fenced=await executionFence(tx,c,r);if(fenced)return fenced;
     const day=(await tx.query('SELECT ended_at FROM tawsel.workdays WHERE tenant_id=$1 AND workday_id=$2',[r.tenant_id,r.workday_id])).rows[0];
     if(r.ended_at||day.ended_at)throw new OutcomeError('lifecycle_forbidden',409,'الجولة أو يوم العمل انتهى.');
     before=await activity(tx,r.tenant_id,r.round_id);
     activityRevision=Number((await tx.query('SELECT revision FROM tawsel.round_activity_state WHERE tenant_id=$1 AND round_id=$2',[r.tenant_id,r.round_id])).rows[0]?.revision??0);
     if(p.expectedActivityRevision!==activityRevision||p.expectedCurrentAttemptId!==(before?.attemptId??null))throw new OutcomeError('stale_revision',409,'تغيّرت المحطة الحالية؛ حدّث الجولة.');
     if(before&&before.attemptId!==p.attemptId)throw new OutcomeError('lifecycle_forbidden',409,'أكمل أو غيّر المحطة الحالية صراحةً قبل تسجيل نتيجة أخرى.');
     const input=await snapshot(tx,await planningState(tx,r.tenant_id,driverId));
     for(const m of input.members)a.requireResource(own,{tenant_id:r.tenant_id,driver_id:driverId,branch_id:m.branchId,integration_id:m.integrationId});
     const m=await eligibleTarget(tx,a,r,input,p);
     const admission=(await tx.query('SELECT source_revision,assignment_revision FROM tawsel.round_admissions WHERE tenant_id=$1 AND round_id=$2 AND attempt_id=$3',[r.tenant_id,r.round_id,p.attemptId])).rows[0]!;
     if(Number(admission.source_revision)!==m.sourceRevision||Number(admission.assignment_revision)!==m.assignmentRevision)throw new OutcomeError('stale_revision',409,'بيانات التنفيذ لا تطابق لقطة المغادرة.');
     if((await tx.query('SELECT 1 FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND attempt_id=$2',[r.tenant_id,p.attemptId])).rowCount)throw new OutcomeError('lifecycle_forbidden',409,'سُجّلت نتيجة هذه المحاولة بالفعل.');
     let frozen:Frozen,sourceReference:OutcomeRecord['sourceReference']=null,sourceDispatchCycleId:string|null=null;
     if(m.dispatchCycleId){
      const source=(await tx.query<{payload:components['schemas']['B2bSourceSnapshot']}>('SELECT payload FROM tawsel.b2b_source_snapshots WHERE tenant_id=$1 AND task_id=$2 AND source_revision=$3',[r.tenant_id,p.taskId,admission.source_revision])).rows[0]!;
      const prior=(await tx.query(`SELECT COALESCE(sum(c.shipping_minor),0)::text AS shipping,
       COALESCE((SELECT sum(q.delivered) FROM tawsel.outcome_quantities q JOIN tawsel.delivery_outcomes o USING(tenant_id,outcome_id) WHERE NOT EXISTS (SELECT 1 FROM tawsel.delivery_outcomes newer WHERE newer.tenant_id=o.tenant_id AND newer.attempt_id=o.attempt_id AND newer.revision>o.revision) AND o.tenant_id=$1 AND o.dispatch_cycle_id=$2),0)::text AS pieces
       FROM tawsel.outcome_collections c JOIN tawsel.delivery_outcomes o USING(tenant_id,outcome_id) WHERE NOT EXISTS (SELECT 1 FROM tawsel.delivery_outcomes newer WHERE newer.tenant_id=o.tenant_id AND newer.attempt_id=o.attempt_id AND newer.revision>o.revision) AND o.tenant_id=$1 AND o.dispatch_cycle_id=$2`,[r.tenant_id,m.dispatchCycleId])).rows[0];
      frozen={kind:'company',snapshot:source.payload,previousShippingCollectedMinor:Number(prior.shipping),previousDeliveredPieces:Number(prior.pieces)};
      sourceReference={tenantId:r.tenant_id,integrationId:m.integrationId!,externalId:source.payload.externalId};
      sourceDispatchCycleId=source.payload.sourceDispatchCycleId;
     }else{
      const amount=(await tx.query('SELECT amount_minor FROM tawsel.task_collection_amounts WHERE tenant_id=$1 AND task_id=$2',[r.tenant_id,p.taskId])).rows[0];
      frozen={kind:'personal',collection:amount?money(Number(amount.amount_minor)):null};
     }
     const calculation=calculate(op,p,frozen),now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
     time={actionId:c.actionId,recordedAt:now.toISOString(),observation:c.observation};
     const attempt=(await tx.query('SELECT heading,arrival FROM tawsel.execution_attempts WHERE tenant_id=$1 AND round_id=$2 AND attempt_id=$3',[r.tenant_id,r.round_id,p.attemptId])).rows[0];
     const revision=Number((await tx.query('SELECT COALESCE(max(revision),0)+1 AS revision FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND task_id=$2',[r.tenant_id,p.taskId])).rows[0].revision);
     accepted={...calculation,outcomeId:randomUUID(),revision,roundId:r.round_id,workdayId:r.workday_id,driverId,taskId:p.taskId,attemptId:p.attemptId,dispatchCycleId:m.dispatchCycleId,branchId:m.branchId,sourceReference,sourceDispatchCycleId,sourceRevision:m.sourceRevision,assignmentRevision:m.assignmentRevision,time,heading:attempt?.heading??null,arrival:attempt?.arrival??null};
     requireOutcome('Record',accepted);
     await tx.query(`INSERT INTO tawsel.execution_attempts (tenant_id,round_id,attempt_id,task_id,stage,revision,resolution,resolved_outcome_id)
      VALUES ($1,$2,$3,$4,'resolved',$5,$6,$7) ON CONFLICT(tenant_id,round_id,attempt_id) DO UPDATE SET stage='resolved',revision=$5,resolution=$6,resolved_outcome_id=$7`,[r.tenant_id,r.round_id,p.attemptId,p.taskId,activityRevision+1,{outcomeId:accepted.outcomeId,time},accepted.outcomeId]);
     await appendOutcome(tx,r.tenant_id,a.context.sourceId,c.actionId,accepted);
     const body={outcome:accepted,current:{roundId:r.round_id,revision:activityRevision+1,currentActivity:null,physicalOrigin:await physicalOrigin(tx,r.tenant_id,driverId)}};
     requireOutcome('CommandResult',body);const event={outcome:accepted};requireOutcome('Event',event);
     return {status:'accepted',response:{status:200,body},summary:{roundId:r.round_id,driverId,taskId:p.taskId,outcomeId:accepted.outcomeId,outcomeRevision:revision},audit:{outcome:accepted,previousActivity:before},resourceVersions:{outcomeRevision:revision,resourceRevision:activityRevision+1,deviceGeneration:Number(r.device_generation)},intents:m.integrationId?[{eventId:randomUUID(),recipientId:m.integrationId,eventType:'outcome.recorded',payloadVersion:'1.0.0',payload:event}]:[]};
    }catch(error){if(error instanceof OutcomeError||error instanceof CurrentError)return rejected(c,r,error);throw error;}},
    async writeProgress(){
     // Deliberately after domain writes: a failure at either kernel checkpoint
     // rolls back history, quantities, collection, current and event intent.
     await tx.query('INSERT INTO tawsel.effective_task_outcomes (tenant_id,task_id,outcome_id) VALUES ($1,$2,$3) ON CONFLICT(tenant_id,task_id) DO UPDATE SET outcome_id=$3',[r.tenant_id,p.taskId,accepted.outcomeId]);
     if(accepted.dispatchCycleId)await tx.query("UPDATE tawsel.driver_planned_stops SET state='completed' WHERE tenant_id=$1 AND driver_id=$2 AND dispatch_cycle_id=$3",[r.tenant_id,driverId,accepted.dispatchCycleId]);
     await tx.query('INSERT INTO tawsel.round_activity_state (tenant_id,round_id,revision) VALUES ($1,$2,$3) ON CONFLICT(tenant_id,round_id) DO UPDATE SET revision=$3',[r.tenant_id,r.round_id,activityRevision+1]);
     await tx.query('INSERT INTO tawsel.current_activity_history (tenant_id,round_id,revision,source_id,action_id,operation_id,previous_activity,current_activity,action_time) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8)',[r.tenant_id,r.round_id,activityRevision+1,a.context.sourceId,c.actionId,op,before,time]);
     const state=await planningState(tx,r.tenant_id,driverId),settings=state.settings&&Date.parse(state.settings.plannedStartAt)<Date.parse(time.recordedAt)?{...state.settings,plannedStartAt:time.recordedAt}:state.settings;
     await tx.query('UPDATE tawsel.planning_states SET current_target=NULL,execution_revision=execution_revision+1,settings=$3,settings_revision=settings_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[r.tenant_id,driverId,settings]);
     await enqueuePlanning(tx,r.tenant_id,driverId,a.context.sourceId,c.actionId);
    },...this.observe
   });
  });
 }
 async read(principal:AuthenticatedPrincipal,roundId:string):Promise<components['schemas']['OutcomeSnapshot']>{
  uuid(roundId);return withAccess(this.pool,principal,async(a,tx)=>{
   await authorize(tx,a);await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:ownDriver(a)}]);await round(tx,a,roundId);
   const rows=(await tx.query<{record:OutcomeRecord}>('SELECT o.record FROM tawsel.delivery_outcomes o JOIN tawsel.planning_attempts e USING(tenant_id,attempt_id) WHERE NOT EXISTS (SELECT 1 FROM tawsel.delivery_outcomes newer WHERE newer.tenant_id=o.tenant_id AND newer.attempt_id=o.attempt_id AND newer.revision>o.revision) AND e.latest AND o.tenant_id=$1 AND o.driver_id=$2 AND o.round_id=$3 ORDER BY o.record->\'time\'->>\'recordedAt\',o.outcome_id',[a.context.tenantId,ownDriver(a),roundId])).rows;
   const all=(await tx.query<{record:OutcomeRecord;latest:boolean}>(`SELECT o.record,a.latest FROM tawsel.delivery_outcomes o JOIN tawsel.planning_attempts a USING(tenant_id,attempt_id) WHERE o.tenant_id=$1 AND o.driver_id=$2 AND o.round_id=$3 ORDER BY o.record->'time'->>'recordedAt',o.outcome_id`,[a.context.tenantId,ownDriver(a),roundId])).rows;
   const history=all.map(r=>r.record),effectiveHistory=history.filter(o=>!history.some(n=>n.attemptId===o.attemptId&&n.revision>o.revision)),latest=new Set(all.filter(r=>r.latest).map(r=>r.record.outcomeId));
   const items=rows.map(r=>r.record).filter(r=>latest.has(r.outcomeId));for(const o of history)a.requireResource(own,{tenant_id:a.context.tenantId,driver_id:o.driverId,branch_id:o.branchId,integration_id:o.sourceReference?.integrationId??null});
   const progress:components['schemas']['OutcomeProgress']={processed:items.length,full:0,partial:0,refused:0,noAnswer:0,deliveredPieces:0,heldReturnRequiredPieces:0,collection:[]};
   const custody=(await tx.query('SELECT * FROM tawsel.cycle_custody WHERE tenant_id=$1 AND outcome_id=ANY($2::uuid[])',[a.context.tenantId,items.map(o=>o.outcomeId)])).rows.map(q=>({outcomeId:q.outcome_id as string,dispatchCycleId:q.dispatch_cycle_id as string,sourceLineId:q.source_line_id as string,balance:{sourceQuantity:q.source_quantity as number,delivered:q.delivered as number,held:q.held as number,received:q.received as number,lost:q.lost as number,damaged:q.damaged as number}}));
   for(const o of items){if(o.outcome==='no-answer')progress.noAnswer++;else progress[o.outcome]++;for(const l of o.lines)progress.deliveredPieces+=l.delivered;}
   progress.heldReturnRequiredPieces=custody.reduce((n,q)=>n+q.balance.held,0);
   let reported=0n,unpaid=0n;const fees=new Map<string,{unpaid:bigint;paid:bigint}>();
   for(const o of effectiveHistory){reported+=BigInt(o.collection.reported?.amountMinor??0);const key=o.dispatchCycleId??o.taskId,f=fees.get(key)??{unpaid:0n,paid:0n};f.unpaid=f.unpaid>BigInt(o.collection.unpaidShipping.amountMinor)?f.unpaid:BigInt(o.collection.unpaidShipping.amountMinor);f.paid+=BigInt(o.collection.shipping.amountMinor);fees.set(key,f);}
   for(const f of fees.values())unpaid+=f.unpaid>f.paid?f.unpaid-f.paid:0n;
   if(effectiveHistory.some(o=>o.collection.reported!==null||o.collection.unpaidShipping.amountMinor>0))progress.collection=[{currency:'EGP',exponent:2,reportedMinor:reported.toString(),unpaidShippingMinor:unpaid.toString()}];
   const result={roundId,items,history,progress,custody};requireOutcome('Snapshot',result);return result;
  });
 }
 async result(principal:AuthenticatedPrincipal,actionId:string):Promise<components['schemas']['OutcomeActionStatus']>{
  uuid(actionId);return withAccess(this.pool,principal,async(a,tx)=>{
   await authorize(tx,a);const result=await getCommandResult(tx,a.commandScope,actionId);if(!result)return {actionId,status:'pending'};
   if(!Object.hasOwn(operations,result.operationId)||result.summary.driverId!==ownDriver(a))throw new AccessDenied(true);
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:ownDriver(a)}]);await round(tx,a,String(result.summary.roundId));
   requireOutcome('ActionResult',result);return {actionId,status:result.receipt.businessStatus as 'accepted'|'rejected'|'review-required',result:result as components['schemas']['OutcomeActionResult']};
  });
 }
}
