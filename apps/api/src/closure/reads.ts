import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {withAccess,type AccessSession,type AuthenticatedPrincipal} from '../access/service.js';
import type {Transaction} from '../db/transaction.js';
import {lockInvariants} from '../commands/locks.js';
import {ownDriver} from '../current/state.js';
import {planningState,snapshot} from '../planning/queue.js';
import {requireClosure,uuid,type CarryForward,type Summary} from './models.js';
import {authorize,day,type DayRow} from './state.js';
type Outcome=components['schemas']['OutcomeRecord'];
/** Current holder query, deliberately separate from historical workday counts. */
async function carried(tx:Transaction,a:AccessSession,d:DayRow,asOf:string):Promise<CarryForward>{
 const input=await snapshot(tx,await planningState(tx,d.tenant_id,d.driver_id)),ids=input.members.map(m=>m.taskId);
 const histories=(await tx.query<{record:Outcome}>('SELECT record FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND task_id=ANY($2::uuid[]) ORDER BY revision',[d.tenant_id,ids])).rows.map(r=>r.record);
 const options=new Map((await tx.query<{task_id:string;deferred:boolean}>('SELECT task_id,deferred FROM tawsel.task_execution_options WHERE tenant_id=$1 AND task_id=ANY($2::uuid[])',[d.tenant_id,ids])).rows.map(r=>[r.task_id,r.deferred]));
 const cycles=new Map((await tx.query<{task_id:string;state:string;integration_id:string;external_id:string;source_dispatch_cycle_id:string;quantity:string;dependency:boolean}>(`SELECT c.task_id,c.state,t.integration_id,t.external_id,c.source_dispatch_cycle_id,
 (SELECT sum(l.quantity)::text FROM tawsel.b2b_source_lines l WHERE l.tenant_id=t.tenant_id AND l.task_id=t.task_id AND l.source_revision=t.source_revision) quantity,
 EXISTS(SELECT 1 FROM tawsel.retry_dependencies x WHERE x.tenant_id=c.tenant_id AND x.dispatch_cycle_id=c.dispatch_cycle_id) dependency
 FROM tawsel.b2b_dispatch_cycles c JOIN tawsel.b2b_tasks t USING(tenant_id,task_id) WHERE c.tenant_id=$1 AND c.driver_id=$2`,[d.tenant_id,d.driver_id])).rows.map(r=>[r.task_id,r]));
 const admitted=new Set((await tx.query<{task_id:string}>(`SELECT DISTINCT d.task_id FROM tawsel.round_admissions d JOIN tawsel.rounds r USING(tenant_id,round_id) WHERE r.tenant_id=$1 AND r.workday_id=$2`,[d.tenant_id,d.workday_id])).rows.map(r=>r.task_id));
 const items:CarryForward['items']=[];
 const custody=new Map((await tx.query<{dispatch_cycle_id:string;held:number}>('SELECT dispatch_cycle_id,sum(held)::int held FROM tawsel.cycle_custody WHERE tenant_id=$1 AND driver_id=$2 GROUP BY dispatch_cycle_id',[d.tenant_id,d.driver_id])).rows.map(r=>[r.dispatch_cycle_id,r.held]));
 for(const m of input.members){
  const cycle=cycles.get(m.taskId);if(m.dispatchCycleId&&cycle?.state!=='held')continue;
  const history=histories.filter(o=>o.taskId===m.taskId&&o.dispatchCycleId===m.dispatchCycleId),outcome=history.find(o=>o.attemptId===m.attemptId);
  if(outcome?.outcome==='full')continue;
  const deferred=options.get(m.taskId)??false,returned=m.dispatchCycleId?custody.get(m.dispatchCycleId)??0:0;
  if(m.dispatchCycleId&&outcome&&returned===0)continue;
  const blocker:CarryForward['items'][number]['blocker']=cycle?.dependency?'receipt-or-disposition':outcome?'result-required':deferred?'deferred':m.earliestAt&&Date.parse(m.earliestAt)>Date.parse(asOf)?'earliest-time':!m.coordinates?'location-required':m.dispatchCycleId&&m.reservationState!=='remaining'?'capacity-admission':null;
  let unpaid=0n,paid=0n;for(const o of history){const amount=BigInt(o.collection.unpaidShipping.amountMinor);if(amount>unpaid)unpaid=amount;paid+=BigInt(o.collection.shipping.amountMinor);}
  items.push({taskId:m.taskId,attemptId:m.attemptId,dispatchCycleId:m.dispatchCycleId,
   sourceReference:cycle?{tenantId:d.tenant_id,integrationId:cycle.integration_id,externalId:cycle.external_id}:null,sourceDispatchCycleId:cycle?.source_dispatch_cycle_id??null,
   sourceRevision:m.sourceRevision,assignmentRevision:m.assignmentRevision,pinRevision:m.pinRevision,earliestAt:m.earliestAt,deferred,admittedInWorkday:admitted.has(m.taskId),outcome:outcome?.outcome??null,
   disposition:outcome?(m.dispatchCycleId?'return-required':'unsuccessful'):'unfinished',eligibleNow:blocker===null,blocker,heldReturnRequiredPieces:returned,
   heldPieces:cycle?(outcome?returned:Number(cycle.quantity)):null,unpaidShippingMinor:(unpaid>paid?unpaid-paid:0n).toString()});
 }
 const result={workdayId:d.workday_id,driverId:ownDriver(a),asOf,items};requireClosure('CarryForward',result);return result;
}
export class WorkdayReads {
 constructor(readonly pool:Pool){}
 async carryForward(principal:AuthenticatedPrincipal,workdayId:string):Promise<CarryForward>{
  uuid(workdayId);return withAccess(this.pool,principal,async(a,tx)=>{
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:ownDriver(a)}]);await authorize(tx,a,workdayId);const d=await day(tx,a,workdayId),now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
   return carried(tx,a,d,now.toISOString());
  });
 }
 async summary(principal:AuthenticatedPrincipal,workdayId:string):Promise<Summary>{
  uuid(workdayId);return withAccess(this.pool,principal,async(a,tx)=>{
   await lockInvariants(tx,a.context.tenantId,[{kind:'driver',id:ownDriver(a)}]);await authorize(tx,a,workdayId);const d=await day(tx,a,workdayId),now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
   const rounds=(await tx.query<{round_id:string;started_at:Date;ended_at:Date|null;first_plan_id:string;first_forecast_id:string;first_workload_id:string}>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND workday_id=$2 ORDER BY device_generation',[d.tenant_id,workdayId])).rows.map(r=>({roundId:r.round_id,startedAt:r.started_at.toISOString(),endedAt:r.ended_at?.toISOString()??null,firstPlanId:r.first_plan_id,firstForecastId:r.first_forecast_id,firstWorkloadId:r.first_workload_id}));
   const admissions=(await tx.query<{task_id:string;attempt_id:string}>(`SELECT d.task_id,d.attempt_id FROM tawsel.round_admissions d JOIN tawsel.rounds r USING(tenant_id,round_id) WHERE r.tenant_id=$1 AND r.workday_id=$2 ORDER BY d.admitted_at,r.device_generation,d.attempt_id`,[d.tenant_id,workdayId])).rows;
   const outcomes=(await tx.query<{record:Outcome}>(`SELECT o.record FROM tawsel.delivery_outcomes o JOIN tawsel.rounds r USING(tenant_id,round_id) WHERE r.tenant_id=$1 AND r.workday_id=$2 ORDER BY o.record->'time'->>'recordedAt',o.revision,o.outcome_id`,[d.tenant_id,workdayId])).rows.map(r=>r.record);
   const latest=new Map(admissions.map(m=>[m.task_id,m.attempt_id]));
   const scope:Summary['scope']={shipments:latest.size,attempts:new Set(admissions.map(m=>m.attempt_id)).size,processedAttempts:new Set(outcomes.map(o=>o.attemptId)).size,fullShipments:0,partialShipments:0,refusedShipments:0,noAnswerShipments:0,unfinishedShipments:0};
   for(const attempt of latest.values()){
    const o=outcomes.find(o=>o.attemptId===attempt);if(!o){scope.unfinishedShipments++;continue;}
    scope[o.outcome==='no-answer'?'noAnswerShipments':o.outcome==='full'?'fullShipments':o.outcome==='partial'?'partialShipments':'refusedShipments']++;
   }
   const reported=outcomes.reduce((n,o)=>n+BigInt(o.collection.reported?.amountMinor??0),0n),unreported=outcomes.filter(o=>o.collection.reported===null).length;
   const result:Summary={workdayId,driverId:d.driver_id,displayTimeZone:'Africa/Cairo',openedAt:d.opened_at.toISOString(),endedAt:d.ended_at?.toISOString()??null,asOf:now.toISOString(),rounds,scope,collection:outcomes.length?[{currency:'EGP',exponent:2,reportedMinor:reported.toString(),unreportedAttempts:unreported}]:[],outcomes,carryForward:await carried(tx,a,d,now.toISOString())};
   requireClosure('Summary',result);return result;
  });
 }
}
