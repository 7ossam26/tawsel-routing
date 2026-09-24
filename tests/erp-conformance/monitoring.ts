import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
import type {MonitoringRead} from '../../packages/api-client/src/monitoring.js';
type Snapshot=components['schemas']['MonitoringSnapshot'];
type History=components['schemas']['MonitoringHistory'];
type Report={before:MonitoringRead<Snapshot>;other:MonitoringRead<Snapshot>;all:MonitoringRead<Snapshot>;unchanged:MonitoringRead<Snapshot>;partial:MonitoringRead<Snapshot>;corrected:MonitoringRead<Snapshot>;history:MonitoringRead<History>;day:MonitoringRead<History>;resync:MonitoringRead<Snapshot>;hiddenHistoryStatus:number;hiddenTaskId:string};
/** Public messages only. No DB, service, private fixture or credential imports. */
export function verifyMonitoring(r:Report){
 for(const result of [r.before,r.other,r.all,r.partial,r.corrected,r.history,r.day,r.resync])assert.equal(result.status,200);
 if(!r.before.data||!r.other.data||!r.all.data||!r.partial.data||!r.corrected.data||!r.history.data||!r.resync.data)throw new Error('Missing snapshot');
 assert.equal(r.before.data.progress.shipments,2);assert.equal(r.other.data.progress.shipments,1);assert.equal(r.all.data.progress.shipments,3);
 assert.equal(r.before.data.owner,null);assert.equal(r.before.data.plan.planId,null);assert.equal(r.before.data.nextSuggestion,null);
 assert.equal(JSON.stringify(r.before).includes(r.hiddenTaskId),false);assert.equal(JSON.stringify(r.history).includes(r.hiddenTaskId),false);assert.equal(r.hiddenHistoryStatus,404);
 assert.equal(r.unchanged.status,304);assert.equal(r.unchanged.data,null);assert.equal(r.unchanged.revision,r.before.revision);
 assert.equal(r.partial.data.progress.partialShipments,1);assert.equal(r.partial.data.progress.fullDeliveredShipments,0);
 assert.equal(r.corrected.data.progress.partialShipments,0);assert.equal(r.corrected.data.progress.fullDeliveredShipments,1);assert.equal(r.corrected.data.progress.processedAttempts,1);
 assert.ok(r.corrected.revision>r.partial.revision);assert.ok(r.partial.revision>r.before.revision);assert.equal(r.resync.revision,r.corrected.revision);
 for(const result of [r.before,r.other,r.all,r.partial,r.corrected,r.resync]){
  const p=result.data!.progress;assert.equal(p.shipments,p.processedShipments+p.remainingShipments);assert.equal(p.processedShipments,p.fullDeliveredShipments+p.partialShipments+p.failedShipments);
  assert.equal(result.data!.freshness.deviceContactAt,null);assert.equal(result.data!.freshness.integrationDelivery,'unavailable');
 }
 assert.deepEqual(r.history.data.items.filter(i=>i.kind==='outcome').map(i=>[i.outcome.outcome,i.effective]),[['partial',false],['full',true]]);
 assert.equal(r.history.data.items.filter(i=>i.kind==='correction').length,1);
 assert.deepEqual({...r.resync.data,freshness:r.corrected.data.freshness},r.corrected.data);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=JSON.parse(await readFile(process.argv[2]??'.local/phase-24-demo.json','utf8')) as Report;verifyMonitoring(report);console.log('PASS: portable monitoring HTTP capture conformance (not a live ERP application claim).');}
