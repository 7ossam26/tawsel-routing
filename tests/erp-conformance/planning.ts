import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { components } from '../../packages/api-client/src/schema.js';
import { assertRoutingCandidate } from './routing.js';

/** Public-only consumer invariants, after canonical shape validation. Does not
 * import backend/database code or imply delivery of an outbox event. */
export function assertPlanningPlan(plan:components['schemas']['PlanningPlan']){
 assert.ok(plan.input.settings);
 if(plan.routePolicy?.roadRoute){
  assert.equal(plan.routePolicy.roadRoute.geometrySource,'osrm-road');
  assert.equal(plan.routePolicy.roadRoute.mode,plan.input.settings.mode);
  assert.ok(plan.routePolicy.roadRoute.geometry.length>=2);
  assert.equal(plan.routePolicy.roadRoute.legs.length,plan.routePolicy.orderedTaskIds.length+(plan.input.settings.endpoint.kind==='last-customer'?0:1));
 }
 const eligible=plan.input.members.filter(m=>m.eligible);
 assert.ok(eligible.length+(plan.input.settings.endpoint.kind==='branch'?1:0)<=50);
 for(const m of eligible){assert.equal(m.exclusionReason,null);assert.ok(m.coordinates);if(m.earliestAt)assert.ok(Date.parse(m.earliestAt)<=Date.parse(plan.input.settings.plannedStartAt));}
 assert.equal(plan.policyValidated,plan.state!=='draft');
 if(plan.state==='manual'){
  assert.equal(plan.candidate,null);assert.equal(plan.jobId,null);assert.equal(plan.forecast.expectedFinishAt,null);
  assert.equal(plan.routePolicy!.method,'manual');
  const order=plan.routePolicy!.orderedTaskIds;
  assert.equal(new Set(order).size,order.length);
  assert.deepEqual([...order].sort(),plan.input.members.filter(m=>m.eligible).map(m=>m.taskId).sort());
  assert.deepEqual(plan.forecast.members.map(m=>m.attemptId).sort(),plan.input.members.map(m=>m.attemptId).sort());
  for(const member of plan.forecast.members){
   assert.equal(member.expectedArrivalAt,null);assert.equal(member.expectedCompletionAt,null);
   const pos=order.indexOf(member.taskId);assert.equal(member.membership,pos>=0?'manual':'excluded');assert.equal(member.position,pos>=0?pos+1:null);
  }
  if(plan.input.currentTarget)assert.equal(order[0],plan.input.currentTarget.taskId);
  let ordinary=false;
  for(const id of order){if(id===plan.input.currentTarget?.taskId)continue;const m=plan.input.members.find(m=>m.taskId===id)!;assert.equal(m.exclusionReason,null);if(m.priority==='ordinary')ordinary=true;else assert.equal(ordinary,false);}
  return plan;
 }
 assert.ok(plan.candidate);
 if(plan.state!=='draft'){
  assert.equal(plan.routePolicy!.method,'grouped-heuristic');
  assert.equal(plan.state,plan.candidate.status==='complete'?'ready':'partial');
  assert.deepEqual(plan.routePolicy!.orderedTaskIds,plan.candidate.visits.map(v=>v.taskId));
  assert.deepEqual(plan.routePolicy!.exceptions.map(e=>e.taskId).sort(),[...plan.candidate.unassignedTaskIds].sort());
  if(plan.input.currentTarget&&plan.candidate.visits.length)assert.equal(plan.candidate.visits[0]!.taskId,plan.input.currentTarget.taskId);
  let ordinary=false;
  for(const visit of plan.candidate.visits){if(visit.taskId===plan.input.currentTarget?.taskId)continue;const member=plan.input.members.find(m=>m.taskId===visit.taskId)!;if(member.priority==='ordinary')ordinary=true;else assert.equal(ordinary,false,'Urgent work must precede ordinary work');}
 }
 assert.equal(plan.forecast.kind,'planning-estimate');
 const expected=plan.input.members.filter(m=>m.eligible).map(m=>m.taskId);
 assertRoutingCandidate(plan.candidate,expected);
 assert.equal(new Set(plan.forecast.members.map(m=>m.attemptId)).size,plan.forecast.members.length);
 assert.deepEqual(plan.forecast.members.map(m=>m.attemptId).sort(),plan.input.members.map(m=>m.attemptId).sort());
 if(plan.candidate.status==='partial')assert.equal(plan.forecast.expectedFinishAt,null,'Partial workload has no complete finish estimate');
 const epoch=Date.parse(plan.forecast.timeOrigin);
 for(const member of plan.forecast.members){
  const input=plan.input.members.find(m=>m.attemptId===member.attemptId)!;
  assert.equal(member.taskId,input.taskId);assert.equal(member.sourceRevision,input.sourceRevision);assert.equal(member.pinRevision,input.pinRevision);
  const visit:components['schemas']['RoutingVisit']|undefined=plan.candidate.visits.find(v=>v.taskId===member.taskId);
  if(visit){assert.equal(member.membership,'assigned');assert.equal(Date.parse(member.expectedArrivalAt!),epoch+visit.arrivalOffsetSeconds*1000);assert.equal(Date.parse(member.expectedCompletionAt!),epoch+(visit.arrivalOffsetSeconds+visit.waitingSeconds+visit.serviceEstimateSeconds)*1000);}
  else{assert.equal(member.membership,input.eligible?'unassigned':'excluded');assert.equal(member.expectedArrivalAt,null);assert.equal(member.expectedCompletionAt,null);}
 }
 return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:components['schemas']['PlanningPlan']}[];
 const sample=examples.find(e=>e.id==='p13-partial')!.data;
 assertPlanningPlan(sample);
 for(const example of examples.filter(e=>['p14-ready','p14-partial-urgent','p14-manual','p33-plan-with-downloaded-road-context'].includes(e.id)))assertPlanningPlan(example.data);
 const manual=examples.find(e=>e.id==='p14-manual')!.data;
 assert.throws(()=>assertPlanningPlan({...manual,routePolicy:{...manual.routePolicy!,orderedTaskIds:[...manual.routePolicy!.orderedTaskIds].reverse()}}));
 assert.throws(()=>assertPlanningPlan({...sample,forecast:{...sample.forecast,expectedFinishAt:'2026-09-23T11:00:00Z'}}));
 assert.throws(()=>assertPlanningPlan({...sample,forecast:{...sample.forecast,members:[]}}));
 console.log('PASS: public planning/forecast consumer invariants, canonical examples; no live Engine or ERP sender claim.');
}
