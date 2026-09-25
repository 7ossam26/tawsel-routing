import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
type Workday=components['schemas']['ReportWorkday'];
type Capture={reports:Workday[];authorization:{foreign:number;branch:number}};
/** Consumes public HTTP messages only; no server, database or fixture imports. */
export function verifyReporting(capture:Capture){
 assert.equal(capture.reports.length,3);
 const [before,after,staff]=capture.reports as [Workday,Workday,Workday];
 for(const r of capture.reports){
  assert.equal(r.definitionVersion,'1.0.0');assert.equal(r.displayTimeZone,'Africa/Cairo');assert.equal(r.acceptedOnly,true);assert.equal(r.pendingLocalActions,'not-known-to-server');assert.match(r.snapshotId,/^[a-f0-9]{64}$/);
  const c=r.counts;assert.equal(c.shipments,c.fullShipments+c.partialShipments+c.refusedShipments+c.noAnswerShipments+c.unfinishedShipments);
  assert.equal(c.processedShipments,c.fullShipments+c.partialShipments+c.refusedShipments+c.noAnswerShipments);assert.equal(c.attempts,r.attempts.length);assert.ok(c.processedAttempts<=c.attempts);
  assert.equal(new Set(r.collections.map(m=>m.currency+':'+m.exponent)).size,r.collections.length);
  for(const m of r.collections){assert.match(m.reportedMinor,/^\d+$/);assert.equal(BigInt(m.reportedMinor),BigInt(m.goodsMinor)+BigInt(m.shippingMinor));}
  if(r.pieces)assert.equal(r.pieces.dispatched,r.pieces.delivered+r.pieces.held+r.pieces.received+r.pieces.lost+r.pieces.damaged);
  for(const round of r.timing)for(const stop of round.stops){
   if(stop.arrival.status==='missing'){assert.equal(stop.arrival.observedAt,null);assert.equal(stop.travel.seconds,null);assert.equal(stop.service.seconds,null);}
   for(const value of [stop.travel,stop.service,stop.latestArrivalDifference,stop.latestCompletionDifference])assert.equal(value.seconds===null,typeof value.reason==='string');
  }
 }
 assert.deepEqual([before.counts.shipments,before.counts.processedShipments,before.counts.fullShipments],[4,2,1]);
 assert.deepEqual([after.counts.shipments,after.counts.processedShipments,after.counts.fullShipments,after.counts.fullDeliveryPercent],[4,2,2,50]);
 assert.equal(before.workdayId,after.workdayId);assert.notEqual(before.snapshotId,after.snapshotId);assert.equal(before.pieces,null);
 const first=before.timing[0]!,last=after.timing[0]!;assert.ok(first.baseline);assert.ok(first.latest);assert.notEqual(first.baseline.workloadId,first.latest.workloadId);assert.equal(first.baseline.forecastId,last.baseline?.forecastId);assert.equal(last.closure,'ended-unfinished');assert.equal(last.baselineFinishDifference.seconds,null);
 const original=before.attempts.find(a=>a.outcome?.outcome==='no-answer')!,corrected=after.attempts.find(a=>a.attemptId===original.attemptId)!;
 assert.deepEqual(corrected.history.map(h=>h.outcome),['no-answer','full']);assert.equal(corrected.outcome?.outcome,'full');
 const oldStop=first.stops.find(s=>s.attemptId===original.attemptId)!,newStop=last.stops.find(s=>s.attemptId===original.attemptId)!;
 assert.equal(oldStop.arrival.status,'missing');assert.equal(oldStop.completion.status,'uncertain');assert.deepEqual(oldStop.completion,newStop.completion);
 assert.equal(staff.counts.shipments,2);assert.equal(staff.timing[0]!.visibility,'authorized-subset');assert.equal(staff.timing[0]!.baseline,null);assert.equal(staff.timing[0]!.elapsed.seconds,null);
 assert.deepEqual(capture.authorization,{foreign:404,branch:403});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){verifyReporting(JSON.parse(await readFile(process.argv[2]??'.local/phase-36-browser-evidence.json','utf8')) as Capture);console.log('PASS: public reporting capture conformance; not a commercial ERP or live device claim.');}
