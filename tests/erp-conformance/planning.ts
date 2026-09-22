import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { components } from '../../packages/api-client/src/schema.js';
import { assertRoutingCandidate } from './routing.js';

/** Public-only consumer invariants, after canonical shape validation. Does not
 * import backend/database code or imply delivery of an outbox event. */
export function assertPlanningPlan(plan:components['schemas']['PlanningPlan']){
 assert.equal(plan.state,'draft');assert.equal(plan.policyValidated,false);
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
  const visit=plan.candidate.visits.find(v=>v.taskId===member.taskId);
  if(visit){assert.equal(member.membership,'assigned');assert.equal(Date.parse(member.expectedArrivalAt!),epoch+visit.arrivalOffsetSeconds*1000);assert.equal(Date.parse(member.expectedCompletionAt!),epoch+(visit.arrivalOffsetSeconds+visit.waitingSeconds+visit.serviceEstimateSeconds)*1000);}
  else{assert.equal(member.membership,input.eligible?'unassigned':'excluded');assert.equal(member.expectedArrivalAt,null);assert.equal(member.expectedCompletionAt,null);}
 }
 return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:components['schemas']['PlanningPlan']}[];
 const sample=examples.find(e=>e.id==='p13-partial')!.data;
 assertPlanningPlan(sample);
 assert.throws(()=>assertPlanningPlan({...sample,forecast:{...sample.forecast,expectedFinishAt:'2026-09-23T11:00:00Z'}}));
 assert.throws(()=>assertPlanningPlan({...sample,forecast:{...sample.forecast,members:[]}}));
 console.log('PASS: public planning/forecast consumer invariants, canonical examples; no live Engine or ERP sender claim.');
}
