import type {components} from '@tawsel/api-client';
import type {AccessSession} from '../access/service.js';
import type {Transaction} from '../db/transaction.js';
import {policy,type Attempt,type Outcome,type Query,type Counts,type Report} from './models.js';
export interface Admission {
 task_id:string;attempt_id:string;round_id:string;driver_id:string;dispatch_cycle_id:string|null;branch_id:string|null;integration_id:string|null;
 source_revision:string;assignment_revision:string;pin_revision:string;admitted_at:Date;recipient_name:string;
}
/** Scope is applied in SQL before reading history, money, forecasts or counts.
 * The admission owns the historical driver; current reassignment is not authority. */
export async function admissions(tx:Transaction,a:AccessSession,workdayId:string,q:Query):Promise<Admission[]>{
 const filter=a.sqlPredicate(policy,'v',5);
 return (await tx.query<Admission>(`WITH v AS (
 SELECT d.*,t.branch_id,t.integration_id,t.recipient_name FROM tawsel.round_admissions d
 JOIN tawsel.monitoring_tasks t ON t.tenant_id=d.tenant_id AND t.task_id=d.task_id
 AND t.dispatch_cycle_id IS NOT DISTINCT FROM d.dispatch_cycle_id
 ) SELECT v.* FROM v JOIN tawsel.rounds r USING(tenant_id,round_id)
 WHERE r.workday_id=$1 AND ($2::uuid IS NULL OR v.round_id=$2) AND ($3::uuid IS NULL OR v.driver_id=$3)
 AND ($4::uuid IS NULL OR v.branch_id=$4) AND ${filter.text}
 ORDER BY v.admitted_at,v.round_id,v.attempt_id`,[workdayId,q.roundId??null,q.driverId??null,q.branchId??null,...filter.values])).rows;
}
export async function attempts(tx:Transaction,tenant:string,rows:Admission[]):Promise<Attempt[]>{
 const ids=[...new Set(rows.map(r=>r.attempt_id))],rounds=[...new Set(rows.map(r=>r.round_id))];
 const history=(await tx.query<{record:Outcome}>(`SELECT record FROM tawsel.delivery_outcomes
 WHERE tenant_id=$1 AND attempt_id=ANY($2::uuid[]) AND round_id=ANY($3::uuid[]) ORDER BY revision,outcome_id`,[tenant,ids,rounds])).rows.map(r=>r.record);
 const corrections=(await tx.query<{record:components['schemas']['CorrectionRecord']}>(`SELECT record FROM tawsel.outcome_corrections WHERE tenant_id=$1 AND outcome_id=ANY($2::uuid[]) ORDER BY previous_revision,correction_id`,[tenant,history.map(o=>o.outcomeId)])).rows.map(r=>r.record);
 const changes=(await tx.query<{record:components['schemas']['EligibilityRecord']}>(`SELECT record FROM tawsel.task_eligibility_history WHERE tenant_id=$1 AND record->>'attemptId'=ANY($2::text[]) AND record->>'roundId'=ANY($3::text[]) ORDER BY revision`,[tenant,ids,rounds])).rows.map(r=>r.record);
 const returns=(await tx.query<{dispatch_cycle_id:string;transition_id:string;kind:'received'|'lost'|'damaged';source_line_id:string;quantity:number}>(`SELECT * FROM tawsel.return_transitions WHERE tenant_id=$1 AND dispatch_cycle_id=ANY($2::uuid[]) ORDER BY transition_id`,[tenant,rows.flatMap(r=>r.dispatch_cycle_id?[r.dispatch_cycle_id]:[])])).rows;
 const unique=new Map<string,Admission>();for(const r of rows)unique.set(r.attempt_id,r);
 return [...unique.values()].map(r=>{
  const originals=history.filter(o=>o.attemptId===r.attempt_id),outcome=originals.at(-1)??null;
  // An outcome only belongs to its actual admitted round, even if its attempt
  // appeared in more than one round before resolution.
  const admission=rows.find(d=>d.attempt_id===r.attempt_id&&d.round_id===outcome?.roundId)??r;
  return {taskId:r.task_id,attemptId:r.attempt_id,roundId:admission.round_id,dispatchCycleId:r.dispatch_cycle_id,branchId:r.branch_id,recipientName:r.recipient_name,
   sourceRevision:Number(admission.source_revision),assignmentRevision:Number(admission.assignment_revision),pinRevision:Number(admission.pin_revision),admittedAt:admission.admitted_at.toISOString(),
   outcome,history:originals,corrections:corrections.filter(c=>c.outcome.attemptId===r.attempt_id),deferred:changes.filter(c=>c.attemptId===r.attempt_id).at(-1)?.deferred??false,
   returns:returns.filter(t=>t.dispatch_cycle_id===r.dispatch_cycle_id).map(t=>({transitionId:t.transition_id,kind:t.kind,sourceLineId:t.source_line_id,quantity:t.quantity}))};
 });
}
export function latestShipments(items:Attempt[]){
 const shipments=new Map<string,Attempt>();
 for(const item of items)shipments.set(item.taskId,item);
 return [...shipments.values()];
}
export function counts(items:Attempt[]):Counts{
 const latest=latestShipments(items),processed=items.filter(i=>i.outcome);
 const c:Counts={shipments:latest.length,attempts:items.length,processedAttempts:processed.length,failedAttempts:processed.filter(i=>i.outcome!.outcome==='refused'||i.outcome!.outcome==='no-answer').length,
  deferredAttempts:items.filter(i=>i.deferred).length,processedShipments:0,fullShipments:0,partialShipments:0,refusedShipments:0,noAnswerShipments:0,unfinishedShipments:0,deferredShipments:0,fullDeliveryPercent:null};
 for(const item of latest){if(item.deferred)c.deferredShipments++;if(!item.outcome)c.unfinishedShipments++;else{c.processedShipments++;c[item.outcome.outcome==='full'?'fullShipments':item.outcome.outcome==='partial'?'partialShipments':item.outcome.outcome==='refused'?'refusedShipments':'noAnswerShipments']++;}}
 c.fullDeliveryPercent=c.shipments?Math.round(c.fullShipments/c.shipments*1000)/10:null;return c;
}
/** Collection is additive across distinct accepted attempts; correction revisions
 * replace, never add to, the same attempt. Outstanding fee uses max less later
 * collected shipping per cycle, avoiding double fees on explicit retries. */
export function collections(items:Attempt[]):Report['collections']{
 const currencies=new Map<string,Report['collections'][number]>(),cycles=new Map<string,{unpaid:bigint;shipping:bigint;key:string}>();
 for(const item of items){const c=item.outcome?.collection;if(!c)continue;
  const key=`${c.goods.currency}:${c.goods.exponent}`,row=currencies.get(key)??{currency:c.goods.currency,exponent:c.goods.exponent,reportedMinor:'0',goodsMinor:'0',shippingMinor:'0',unpaidShippingMinor:'0',unreportedAttempts:0};
  for(const [field,money] of [['reportedMinor',c.reported],['goodsMinor',c.goods],['shippingMinor',c.shipping]] as const)row[field]=(BigInt(row[field])+BigInt(money?.amountMinor??0)).toString();
  if(c.reported===null)row.unreportedAttempts++;
  currencies.set(key,row);
  const cycleKey=`${item.dispatchCycleId??item.taskId}:${key}`,cycle=cycles.get(cycleKey)??{unpaid:0n,shipping:0n,key};
  const unpaid=BigInt(c.unpaidShipping.amountMinor);if(unpaid>cycle.unpaid)cycle.unpaid=unpaid;cycle.shipping+=BigInt(c.shipping.amountMinor);cycles.set(cycleKey,cycle);
 }
 for(const cycle of cycles.values()){const row=currencies.get(cycle.key)!;row.unpaidShippingMinor=(BigInt(row.unpaidShippingMinor)+(cycle.unpaid>cycle.shipping?cycle.unpaid-cycle.shipping:0n)).toString();}
 return [...currencies.values()].sort((a,b)=>a.currency.localeCompare(b.currency)||a.exponent-b.exponent);
}
/** Current accepted disposition of the selected dispatch cycles, once per line.
 * It deliberately remains separate from historical outcome/attempt quantities. */
export async function pieces(tx:Transaction,tenant:string,items:Attempt[]):Promise<Report['pieces']>{
 const cycles=[...new Set(items.flatMap(i=>i.dispatchCycleId?[i.dispatchCycleId]:[]))];if(!cycles.length)return null;
 const rows=(await tx.query<{quantity:number;delivered:number;received:number;lost:number;damaged:number;return_required:number}>(`SELECT l.quantity,
 COALESCE(q.delivered,0)::int delivered,COALESCE(b.received,0)::int received,COALESCE(b.lost,0)::int lost,COALESCE(b.damaged,0)::int damaged,
 COALESCE(q.held_return_required,0)::int return_required
 FROM tawsel.b2b_dispatch_cycles c JOIN tawsel.b2b_source_lines l USING(tenant_id,task_id,source_revision)
 LEFT JOIN tawsel.planning_attempts p ON p.tenant_id=c.tenant_id AND p.dispatch_cycle_id=c.dispatch_cycle_id AND p.latest
 LEFT JOIN tawsel.effective_attempt_outcomes o ON o.tenant_id=p.tenant_id AND o.attempt_id=p.attempt_id
 LEFT JOIN tawsel.outcome_quantities q ON q.tenant_id=o.tenant_id AND q.outcome_id=o.outcome_id AND q.source_line_id=l.source_line_id
 LEFT JOIN tawsel.return_balances b ON b.tenant_id=c.tenant_id AND b.dispatch_cycle_id=c.dispatch_cycle_id AND b.source_line_id=l.source_line_id
 WHERE c.tenant_id=$1 AND c.dispatch_cycle_id=ANY($2::uuid[])`,[tenant,cycles])).rows;
 const result={dispatched:0,delivered:0,held:0,returnRequired:0,received:0,lost:0,damaged:0};
 for(const r of rows){result.dispatched+=r.quantity;result.delivered+=r.delivered;result.received+=r.received;result.lost+=r.lost;result.damaged+=r.damaged;result.held+=r.quantity-r.delivered-r.received-r.lost-r.damaged;result.returnRequired+=Math.max(0,r.return_required-r.received-r.lost-r.damaged);}return result;
}
