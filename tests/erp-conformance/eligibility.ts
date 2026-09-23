import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
import {assertOutcomeSnapshot} from './outcomes.js';
type Snapshot=components['schemas']['EligibilitySnapshot'];
type Status=components['schemas']['EligibilityActionStatus'];
export function assertEligibility(s:Snapshot){
 assert.equal(new Set(s.items.map(x=>x.taskId)).size,s.items.length);
 for(const item of s.items){assert.ok(item.attemptId);assert.ok(Number.isSafeInteger(item.revision)&&item.revision>=0);for(const a of Object.values(item.actions)){assert.equal(a.allowed,a.blocker===null);assert.equal(a.allowed,a.message===null);}if(item.deferred)assert.ok(item.earliestAt);}
 for(const record of s.history){assert.ok(record.time.actionId);assert.ok(Number.isFinite(Date.parse(record.time.recordedAt)));if(record.operationId==='task.retryWhole')assert.notEqual(record.attemptId,record.previousAttemptId);else assert.equal(record.attemptId,record.previousAttemptId);if(record.sourceReference){assert.ok(record.dispatchCycleId);assert.ok(record.sourceDispatchCycleId);}}
}
export function assertEligibilityStatus(s:Status){
 if(s.status==='pending'){assert.equal('result' in s,false);return;}
 assert.equal(s.actionId,s.result.receipt.actionId);assert.equal(s.status,s.result.receipt.businessStatus);
 if(s.status==='accepted'){const body=s.result.response!.body as components['schemas']['EligibilityCommandResult'];assert.equal(body.change.taskId,body.state.taskId);assert.equal(body.change.attemptId,body.state.attemptId);assert.equal(body.change.revision,body.state.revision);}
}
export function assertEligibilityDemo(report:{eligibility:Snapshot;outcomes:components['schemas']['OutcomeSnapshot'];status:Status;retry:components['schemas']['EligibilityActionResult'];current:components['schemas']['CurrentSnapshot']}){
 assertEligibility(report.eligibility);assertEligibilityStatus(report.status);assert.equal(report.status.status,'accepted');assert.deepEqual(report.retry,report.status.result);
 assertOutcomeSnapshot(report.outcomes);assert.equal(report.outcomes.history!.length,2);assert.equal(report.outcomes.progress.processed,1);assert.equal(report.outcomes.progress.full,1);assert.equal(report.outcomes.progress.collection[0]!.reportedMinor,'35000');
 assert.equal(report.outcomes.history!.reduce((n,o)=>n+o.collection.shipping.amountMinor,0),5000);
 const future=report.eligibility.items.find(x=>x.deferred)!;assert.ok(future);assert.equal(future.urgency,'urgent');assert.equal(future.actions.activate.blocker,'earliest-time');assert.equal(report.current.currentActivity,null);assert.equal(report.current.physicalOrigin,null);assert.equal(report.current.nextSuggestion,null);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]){assertEligibilityDemo(JSON.parse(await readFile(process.argv[2],'utf8')));console.log('PASS: public-only eligibility/collection conformance against real HTTP demo.');}
 else{const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:unknown}[];assertEligibility(examples.find(x=>x.id==='p18-snapshot')!.data as Snapshot);assertEligibilityStatus(examples.find(x=>x.id==='p18-action-status')!.data as Status);console.log('PASS: canonical eligibility/read/recovery examples; no real ERP or event transport claimed.');}
}
