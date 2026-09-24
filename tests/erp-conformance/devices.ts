import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
type S=components['schemas'];
export interface DeviceDemoReport {view:S['DeviceContext'];takeover:S['DeviceTakeoverCommand'];recovered:S['DeviceActionStatus'];continued:{result:S['ActionResult'];snapshot:S['DeviceSnapshot']|null};received:S['DeviceEvidenceSubmissionResult'];duplicate:S['DeviceEvidenceSubmissionResult'];evidence:S['DeviceEvidence'];oldOutcome:S['OutcomeNoAnswerCommand']}
export function assertDeviceDemo(r:DeviceDemoReport){
 assert.equal(r.view.mode,'view-only');assert.equal(r.view.mayTakeover,true);assert.equal(r.recovered.status,'accepted');assert.deepEqual(r.recovered.result,r.continued.result);
 const snapshot=r.continued.snapshot;assert.ok(snapshot);assert.equal(snapshot.context.owner.generation,r.takeover.payload.expectedGeneration+1);assert.equal(snapshot.context.mode,'owner');assert.ok(snapshot.snapshotToken);assert.equal(snapshot.current?.roundId,r.view.roundId);
 assert.equal(r.received.submissionStatus,'received');assert.equal(r.duplicate.submissionStatus,'duplicate');assert.deepEqual(r.received.result,r.duplicate.result);
 assert.equal(r.evidence.durableReceipt,true);assert.equal(r.evidence.result.receipt.evidenceStatus,'received');assert.equal(r.evidence.result.receipt.businessStatus,'review-required');assert.equal(r.evidence.result.receipt.committedAt,undefined);assert.deepEqual(r.evidence.envelope,r.oldOutcome);assert.equal(r.evidence.recovery.adoptionImplemented,false);
}
export function assertDeviceNotifications(events:{event_type:string;recipient_id:string;payload:Record<string,unknown>}[],accountId:string){
 assert.equal(events.length,3);assert.equal(events.filter(e=>e.event_type==='device.executionTransferred').length,1);
 for(const e of events){assert.equal(e.recipient_id,accountId);assert.ok(e.payload.actionId);assert.ok(e.payload.roundId);assert.ok(e.payload.driverId);assert.equal(e.payload.snapshotToken,undefined);assert.equal(e.payload.envelope,undefined);
  if(e.event_type==='device.executionTransferred')assert.equal(e.payload.generation,2);else{assert.equal(e.event_type,'evidence.received');assert.equal(e.payload.businessStatus,'review-required');assert.equal(e.payload.code,'stale_device');}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]){const report=JSON.parse(await readFile(process.argv[2],'utf8'));assertDeviceDemo(report);assertDeviceNotifications(report.notifications,report.view.owner.accountId);console.log('PASS: public-only two-device HTTP report and account-notification conformance; no ERP mutation/receipt implied.');}
 else{const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:unknown}[];const get=(id:string)=>examples.find(e=>e.id===`p20-${id}`)!.data;const report={view:get('view'),takeover:get('takeover-command'),recovered:get('action-status'),continued:{result:get('takeover-result'),snapshot:get('snapshot')},received:get('received'),duplicate:get('duplicate'),evidence:get('evidence'),oldOutcome:get('former-outcome')} as DeviceDemoReport;assertDeviceDemo(report);assertDeviceNotifications([1,2,3].map(i=>({event_type:i===1?'device.executionTransferred':'evidence.received',recipient_id:report.view.owner.accountId,payload:get(`notification-${i}`) as Record<string,unknown>})),report.view.owner.accountId);console.log('PASS: canonical public device/evidence/notification example semantics; not a live external ERP check.');}
}
