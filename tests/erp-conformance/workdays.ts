import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
type Summary=components['schemas']['ClosureSummary'];
type Carry=components['schemas']['ClosureCarryForward'];
export function assertWorkdaySummary(s:Summary){
 assert.equal(s.displayTimeZone,'Africa/Cairo');assert.equal(new Set(s.rounds.map(r=>r.roundId)).size,s.rounds.length);
 assert.equal(s.scope.shipments,s.scope.fullShipments+s.scope.partialShipments+s.scope.refusedShipments+s.scope.noAnswerShipments+s.scope.unfinishedShipments);
 assert.ok(s.scope.processedAttempts<=s.scope.attempts);assert.equal(s.scope.processedAttempts,new Set(s.outcomes.map(o=>o.attemptId)).size);
 assert.ok(s.scope.shipments<=s.scope.attempts);
 assert.equal(s.outcomes.reduce((n,o)=>n+BigInt(o.collection.reported?.amountMinor??0),0n).toString(),s.collection[0]?.reportedMinor??'0');
 assert.equal(s.carryForward.workdayId,s.workdayId);assertCarry(s.carryForward);
}
export function assertCarry(c:Carry){
 assert.equal(new Set(c.items.map(i=>i.taskId)).size,c.items.length);
 for(const item of c.items){assert.equal(item.eligibleNow,item.blocker===null);if(item.deferred)assert.equal(item.eligibleNow,false);if(item.sourceReference){assert.ok(item.dispatchCycleId);assert.ok(item.sourceDispatchCycleId);assert.ok(item.heldPieces!==null);}else{assert.equal(item.dispatchCycleId,null);assert.equal(item.heldPieces,null);}if(item.outcome)assert.equal(item.eligibleNow,false);}
}
export interface WorkdayDemoReport {
 closed:Summary;next:Summary;carriedBefore:Carry;carriedAfter:Carry;
 status:components['schemas']['ClosureActionStatus'];replay:components['schemas']['ClosureActionResult'];
}
export function assertWorkdayDemo(r:WorkdayDemoReport){
 assertWorkdaySummary(r.closed);assertWorkdaySummary(r.next);assertCarry(r.carriedBefore);assertCarry(r.carriedAfter);
 assert.equal(r.closed.rounds.length,2);assert.ok(r.closed.endedAt);assert.notEqual(r.closed.workdayId,r.next.workdayId);
 assert.deepEqual(r.closed.scope,{shipments:4,attempts:4,processedAttempts:2,fullShipments:1,partialShipments:0,refusedShipments:1,noAnswerShipments:0,unfinishedShipments:2});
 assert.equal(r.closed.collection[0]?.reportedMinor,'35000');assert.equal(r.status.status,'accepted');assert.deepEqual(r.status.result,r.replay);
 assert.equal(r.carriedBefore.items.length,3);assert.equal(r.carriedAfter.items.length,3);
 for(const before of r.carriedBefore.items){const after=r.carriedAfter.items.find(i=>i.taskId===before.taskId)!;assert.ok(after);for(const key of ['attemptId','dispatchCycleId','sourceReference','sourceDispatchCycleId','sourceRevision','assignmentRevision','earliestAt','deferred','heldPieces','unpaidShippingMinor'] as const)assert.deepEqual(after[key],before[key]);}
 const unpaid=r.carriedAfter.items.find(i=>i.disposition==='return-required')!;assert.equal(unpaid.heldPieces,3);assert.equal(unpaid.unpaidShippingMinor,'5000');assert.equal(unpaid.eligibleNow,false);
 assert.equal(r.carriedAfter.items.find(i=>i.deferred)?.eligibleNow,false);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]){assertWorkdayDemo(JSON.parse(await readFile(process.argv[2],'utf8')));console.log('PASS: public-only workday/carry-forward conformance against real HTTP demo.');}
 else{const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:unknown}[];assertWorkdaySummary(examples.find(e=>e.id==='p19-summary')!.data as Summary);assertCarry(examples.find(e=>e.id==='p19-carry-forward')!.data as Carry);console.log('PASS: canonical workday summary/carry-forward examples; no ERP receiver or settlement claim.');}
}
