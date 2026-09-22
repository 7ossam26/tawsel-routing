import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import type { components } from '../../packages/api-client/src/schema.js';

/** Consumer semantic check, AFTER canonical JSON Schema validation. No Engine/backend imports.
 * Types are reusable now; public planning transport remains designed for P13/P14. */
export function assertRoutingCandidate(result:components['schemas']['RoutingOptimizationResult'],expectedTaskIds:readonly string[]) {
  assert.equal(result.policyValidated,false,'Provider candidate must not claim route-policy approval');
  const assigned=result.visits.map(v=>v.taskId),all=[...assigned,...result.unassignedTaskIds];
  assert.equal(new Set(all).size,all.length,'Repeated task');
  assert.deepEqual([...all].sort(),[...expectedTaskIds].sort(),'Missing or foreign task');
  assert.equal(result.status,result.unassignedTaskIds.length?'partial':'complete');
  assert.equal(result.customerServiceEstimateSeconds,result.visits.reduce((sum,v)=>sum+v.serviceEstimateSeconds,0));
  assert.equal(result.finishOffsetSeconds,result.travelDurationSeconds+result.customerServiceEstimateSeconds+result.waitingSeconds+result.branchServiceEstimateSeconds);
  return result;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const candidate:components['schemas']['RoutingOptimizationResult']={mode:'bicycle',status:'partial',policyValidated:false,visits:[],unassignedTaskIds:['task-a'],travelDurationSeconds:0,distanceMetres:0,customerServiceEstimateSeconds:0,branchServiceEstimateSeconds:0,waitingSeconds:0,finishOffsetSeconds:0,endpoint:{kind:'last-customer'}};
  assertRoutingCandidate(candidate,['task-a']);
  assert.throws(()=>assertRoutingCandidate({...candidate,status:'complete'},['task-a']));
  assert.throws(()=>assertRoutingCandidate({...candidate,unassignedTaskIds:['task-a','task-a']},['task-a']));
  assert.throws(()=>assertRoutingCandidate(candidate,['task-b']));
  console.log('PASS: routing candidate consumer invariants (controlled examples; no live planning endpoint).');
}
