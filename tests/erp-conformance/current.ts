import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { components } from '../../packages/api-client/src/schema.js';
type Snapshot=components['schemas']['CurrentSnapshot'];
/** Public-only semantics. No application/database or operator credentials. */
export function assertCurrentSnapshot(s:Snapshot){
 assert.ok(s.roundId);assert.ok(s.owner.deviceId);assert.ok(s.owner.generation>0);
 if(s.currentActivity){
  assert.ok(s.targets.some(t=>t.taskId===s.currentActivity!.taskId&&t.attemptId===s.currentActivity!.attemptId));
  assert.equal(s.currentActivity.revision,s.revision);
  assert.notEqual(s.nextSuggestion?.attemptId,s.currentActivity.attemptId);
  assert.ok(Number.isFinite(Date.parse(s.currentActivity.heading.recordedAt)));
  if(s.currentActivity.stage==='arrived'){assert.ok(s.currentActivity.arrival);assert.ok(Number.isFinite(Date.parse(s.currentActivity.arrival.recordedAt)));}
  else assert.equal(s.currentActivity.arrival,null);
 }
 if(s.physicalOrigin){assert.deepEqual(s.planningOrigin,{kind:s.physicalOrigin.kind,coordinates:s.physicalOrigin.coordinates});assert.ok(s.physicalOrigin.time.actionId);}
}
export function assertExplicitTransition(before:Snapshot,after:Snapshot,kind:'heading'|'arrival'){
 assertCurrentSnapshot(before);assertCurrentSnapshot(after);assert.equal(after.roundId,before.roundId);assert.equal(after.revision,before.revision+1);
 if(kind==='heading'){assert.equal(after.currentActivity?.stage,'heading');assert.deepEqual(after.physicalOrigin,before.physicalOrigin,'Heading never establishes physical arrival');}
 else{assert.equal(after.currentActivity?.stage,'arrived');assert.equal(after.currentActivity?.attemptId,before.currentActivity?.attemptId);assert.equal(after.physicalOrigin?.kind,'last-confirmed-stop');assert.equal(after.physicalOrigin?.attemptId,after.currentActivity?.attemptId);assert.deepEqual(after.physicalOrigin?.time,after.currentActivity?.arrival);}
}
export function assertCurrentStatus(s:components['schemas']['CurrentActionStatus']){
 if(s.status==='pending'){assert.equal('result' in s,false);return;}
 assert.equal(s.actionId,s.result.receipt.actionId);assert.equal(s.status,s.result.receipt.businessStatus);
 assert.ok(['current.selectHeading','current.recordArrival','current.correctOrigin'].includes(s.result.operationId));
 if(s.status==='accepted'&&s.result.response){const b=s.result.response.body as components['schemas']['CurrentCommandResult'];assert.ok(b.roundId);if(b.currentActivity?.stage==='arrived')assert.ok(b.currentActivity.arrival);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:unknown}[];
 for(const id of ['p16-heading-action-accepted','p16-arrival-action-accepted','p16-action-pending'])assertCurrentStatus(examples.find(e=>e.id===id)!.data as components['schemas']['CurrentActionStatus']);
 const s=examples.find(e=>e.id==='p16-snapshot-arrived')!.data as Snapshot;assertCurrentSnapshot(s);
 assert.throws(()=>assertCurrentSnapshot({...s,nextSuggestion:s.targets[0]!}));
 assert.throws(()=>assertCurrentSnapshot({...s,currentActivity:{...s.currentActivity!,arrival:null}}));
 if(process.argv[2]){
  const report=JSON.parse(await readFile(process.argv[2],'utf8')) as {before:{snapshot:Snapshot};heading:{snapshot:Snapshot};committed:{snapshot:Snapshot};after:{snapshot:Snapshot}};
  assertExplicitTransition(report.before.snapshot,report.heading.snapshot,'heading');assertExplicitTransition(report.heading.snapshot,report.committed.snapshot,'arrival');assert.deepEqual(report.after.snapshot.currentActivity,report.committed.snapshot.currentActivity);assert.deepEqual(report.after.snapshot.physicalOrigin,report.committed.snapshot.physicalOrigin);
  console.log('PASS: public-only assertions against the actual browser HTTP/PostgreSQL report. Fixture identity/planner; no native ERP or live provider claim.');
 }else console.log('PASS: current/next/physical-origin/action-status canonical consumer assertions; example data, not live transport evidence.');
}
