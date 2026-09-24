import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import type {components} from '../../packages/api-client/src/schema.js';
type S=components['schemas'];
/** Public contract-only assertions: no server/database imports or credentials. */
export function assertCorrectionDemo(r:{before:S['OutcomeSnapshot'];corrected:S['OutcomeSnapshot'];afterAdoption:S['OutcomeSnapshot'];final:S['OutcomeSnapshot'];recovered:S['CorrectionActionStatus'];duplicate:S['CorrectionActionResult'];adopted:S['CorrectionActionResult'];denied:S['CorrectionActionResult'];availability:S['CorrectionAvailability'];events:{event_type:string;payload:unknown}[]}){
 assert.ok(r.before.history);assert.ok(r.corrected.history);assert.ok(r.afterAdoption.history);assert.ok(r.final.history);
 assert.equal(r.before.progress.deliveredPieces,2);assert.equal(r.before.progress.collection[0]?.reportedMinor,'25000');
 assert.equal(r.corrected.progress.deliveredPieces,1);assert.equal(r.corrected.progress.collection[0]?.reportedMinor,'15000');assert.equal(r.corrected.history.length,2);assert.deepEqual(r.corrected.history[0],r.before.history[0]);
 assert.deepEqual(r.recovered.result,r.duplicate);assert.equal(r.recovered.status,'accepted');assert.equal(r.adopted.receipt.businessStatus,'accepted');
 assert.equal(r.afterAdoption.progress.deliveredPieces,2);assert.equal(r.afterAdoption.progress.collection[0]?.reportedMinor,'25000');assert.equal(r.afterAdoption.history.length,3);
 assert.equal(r.denied.receipt.businessStatus,'review-required');assert.equal(r.denied.receipt.evidenceStatus,'received');assert.equal(r.availability.allowed,false);assert.ok(r.availability.constraints.includes('dependent-receipt'));
 assert.deepEqual(r.final.history,r.afterAdoption.history);assert.equal(r.final.progress.heldReturnRequiredPieces,0);assert.equal(r.final.custody?.[0]?.balance.received,1);
 const corrections=r.events.filter(e=>e.event_type==='outcome.corrected').map(e=>(e.payload as S['CorrectionEvent']).correction);assert.equal(corrections.length,2);assert.equal(corrections[0]?.previousOutcomeId,r.before.items[0]?.outcomeId);assert.equal(corrections[1]?.previousOutcomeId,corrections[0]?.outcome.outcomeId);assert.equal(corrections[1]?.previousRevision,2);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(!process.argv[2])throw Error('Run corrections:demo then test:erp:corrections -- .local/phase-23-demo.json');const report=JSON.parse(await readFile(process.argv[2],'utf8'));assertCorrectionDemo(report);const broken=structuredClone(report);broken.final.history=[];assert.throws(()=>assertCorrectionDemo(broken));const double=structuredClone(report);double.corrected.progress.collection[0].reportedMinor='40000';assert.throws(()=>assertCorrectionDemo(double));console.log('PASS: public correction/adoption report and negative history/double-counting controls. Captured HTTP evidence; no live webhook delivery claimed.');}
