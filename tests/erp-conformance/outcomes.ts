import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { components } from '../../packages/api-client/src/schema.js';
type Record=components['schemas']['OutcomeRecord'];
type Snapshot=components['schemas']['OutcomeSnapshot'];
/** Portable consumer assertions: imports public wire types only, never server,
 * database or Tawsel domain implementation. Event delivery is a separate phase. */
export function assertOutcome(o:Record){
 assert.ok(o.outcomeId);assert.ok(o.attemptId);assert.ok(o.time.actionId);assert.ok(Number.isFinite(Date.parse(o.time.recordedAt)));
 const c=o.collection;for(const m of [c.goods,c.shipping,c.unpaidShipping,...(c.reported?[c.reported]:[])]){assert.equal(m.currency,'EGP');assert.equal(m.exponent,2);assert.ok(Number.isSafeInteger(m.amountMinor)&&m.amountMinor>=0);}
 if(c.reported)assert.equal(BigInt(c.reported.amountMinor),BigInt(c.goods.amountMinor)+BigInt(c.shipping.amountMinor));
 if(o.kind==='personal'){assert.deepEqual(o.lines,[]);assert.notEqual(o.outcome,'partial');assert.equal(o.returnRequired,false);assert.equal(c.shippingStatus,'not-applicable');assert.equal(o.dispatchCycleId,null);}
 else{
  assert.ok(o.sourceReference);assert.ok(o.sourceDispatchCycleId);assert.ok(o.dispatchCycleId);assert.ok(o.lines.length);assert.equal(new Set(o.lines.map(l=>l.sourceLineId)).size,o.lines.length);
  let goods=0n;for(const l of o.lines){assert.ok(Number.isInteger(l.delivered)&&l.delivered>=0);assert.ok(Number.isInteger(l.heldReturnRequired)&&l.heldReturnRequired>=0);assert.equal(l.delivered+l.heldReturnRequired,l.sourceQuantity);goods+=BigInt(l.delivered)*BigInt(l.unitDue.amountMinor);}
  assert.equal(goods,BigInt(c.goods.amountMinor));assert.equal(o.returnRequired,o.lines.some(l=>l.heldReturnRequired>0));
  if(o.outcome==='full')assert.ok(o.lines.every(l=>l.heldReturnRequired===0));
  if(o.outcome==='partial'){assert.ok(o.lines.some(l=>l.delivered>0));assert.ok(o.lines.some(l=>l.heldReturnRequired>0));}
  if(o.outcome==='no-answer'||o.outcome==='refused')assert.ok(o.lines.every(l=>l.delivered===0));
 }
 if(o.outcome==='no-answer'){assert.equal(c.reported,null);assert.equal(c.unpaidShipping.amountMinor,0);assert.ok(['not-attempted','not-applicable'].includes(c.shippingStatus));}
 if(c.shippingStatus==='explicitly-unpaid'){assert.equal(o.outcome,'refused');assert.equal(c.reported?.amountMinor,0);assert.ok(c.unpaidShipping.amountMinor>0);}
 if(o.arrival)assert.ok(o.heading,'Arrival evidence needs the prior explicit heading');
}
export function assertOutcomeSnapshot(s:Snapshot){
 for(const o of s.items){assertOutcome(o);assert.equal(o.roundId,s.roundId);}
 assert.equal(new Set(s.items.map(o=>o.taskId)).size,s.items.length);assert.equal(s.progress.processed,s.items.length);
 assert.equal(s.progress.full,s.items.filter(o=>o.outcome==='full').length);assert.equal(s.progress.partial,s.items.filter(o=>o.outcome==='partial').length);assert.equal(s.progress.refused,s.items.filter(o=>o.outcome==='refused').length);assert.equal(s.progress.noAnswer,s.items.filter(o=>o.outcome==='no-answer').length);
 assert.equal(s.progress.deliveredPieces,s.items.flatMap(o=>o.lines).reduce((n,l)=>n+l.delivered,0));assert.equal(s.progress.heldReturnRequiredPieces,s.items.flatMap(o=>o.lines).reduce((n,l)=>n+l.heldReturnRequired,0));
 const reported=s.items.reduce((n,o)=>n+BigInt(o.collection.reported?.amountMinor??0),0n),unpaid=s.items.reduce((n,o)=>n+BigInt(o.collection.unpaidShipping.amountMinor),0n);
 if(s.progress.collection.length){assert.equal(BigInt(s.progress.collection[0]!.reportedMinor),reported);assert.equal(BigInt(s.progress.collection[0]!.unpaidShippingMinor),unpaid);}else{assert.equal(reported,0n);assert.equal(unpaid,0n);}
}
export function assertOutcomeStatus(s:components['schemas']['OutcomeActionStatus']){
 if(s.status==='pending'){assert.equal('result' in s,false);return;}
 assert.equal(s.actionId,s.result.receipt.actionId);assert.equal(s.status,s.result.receipt.businessStatus);
 if(s.status==='accepted'&&s.result.response){const b=s.result.response.body as components['schemas']['OutcomeCommandResult'];assertOutcome(b.outcome);assert.equal(b.current.currentActivity,null);}
}
export function assertOutcomeDemo(report:{snapshot:Snapshot;beforeResult:components['schemas']['CurrentSnapshot'];after:components['schemas']['CurrentSnapshot'];retry:components['schemas']['OutcomeActionResult'];status:components['schemas']['OutcomeActionStatus'];events:{outcome:Record}[]}){
 assertOutcomeSnapshot(report.snapshot);assert.deepEqual(report.snapshot.progress,{processed:2,full:0,partial:1,refused:0,noAnswer:1,deliveredPieces:2,heldReturnRequiredPieces:4,collection:[{currency:'EGP',exponent:2,reportedMinor:'25000',unpaidShippingMinor:'0'}]});
 assert.equal(report.after.currentActivity,null);assert.equal(report.after.nextSuggestion,null);assert.deepEqual(report.after.physicalOrigin,report.beforeResult.physicalOrigin);
 assert.equal(report.snapshot.items.find(o=>o.outcome==='no-answer')!.arrival,null);assertOutcomeStatus(report.status);assert.equal(report.status.status,'accepted');
 assert.deepEqual(report.retry,report.status.result);
 assert.equal(report.events.length,2);for(const e of report.events)assertOutcome(e.outcome);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]){assertOutcomeDemo(JSON.parse(await readFile(process.argv[2],'utf8')));console.log('PASS: public-only outcome checks against actual HTTP/PostgreSQL demo; fixture identity, manual plan, durable intents only.');}
 else{
  const examples=JSON.parse(await readFile(new URL('../../contracts/examples/valid.json',import.meta.url),'utf8')) as {id:string;data:unknown}[];
  const record=examples.find(e=>e.id==='p17-partial-record')!.data as Record;assertOutcome(record);
  assert.throws(()=>assertOutcome({...record,lines:record.lines.map(l=>({...l,delivered:1.5}))}));assert.throws(()=>assertOutcome({...record,collection:{...record.collection,reported:{amountMinor:24999,currency:'EGP',exponent:2}}}));
  assertOutcomeStatus(examples.find(e=>e.id==='p17-action-accepted')!.data as components['schemas']['OutcomeActionStatus']);
  console.log('PASS: canonical outcome amounts, quantities and status consumer assertions; examples, not ERP delivery evidence.');
 }
}
