import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { components } from '../../packages/api-client/src/schema.js';

type S = components['schemas'];
type Action = { actionId: string; bytes: string; envelope: S['SyncBatch']['actions'][number] };
type Journal = { actions: Action[]; pending: unknown[]; acks: Array<{ actionId: string; result: S['ActionResult'] }> };
// Consumer assertions read public envelopes/receipts and reported local identity,
// never Tawsel's database tables or internal service modules.
function recovered(report: { original: Journal; recovered: Journal }, businessStatus: 'accepted' | 'review-required') {
  assert.equal(report.original.actions.length, 3);
  assert.deepEqual(report.recovered.actions, report.original.actions);
  assert.equal(report.recovered.pending.length, 0);
  assert.equal(report.recovered.acks.length, 3);
  assert.equal(new Set(report.recovered.acks.map(a => a.actionId)).size, 3);
  for (const action of report.original.actions) {
    assert.equal(action.bytes, JSON.stringify(action.envelope));
    const ack = report.recovered.acks.find(a => a.actionId === action.actionId)!;
    assert.equal(ack.result.operationId, action.envelope.operationId);
    assert.equal(ack.result.receipt.actionId, action.actionId);
    assert.equal(ack.result.receipt.evidenceStatus, 'received');
    assert.equal(ack.result.receipt.businessStatus, businessStatus);
    if (businessStatus === 'review-required') assert.equal(ack.result.receipt.committedAt, undefined);
  }
}
const examples = JSON.parse(await readFile(new URL('../../contracts/examples/valid.json', import.meta.url), 'utf8')) as Array<{ id: string; data: unknown }>;
const get = <T>(id: string) => examples.find(e => e.id === id)!.data as T;
const batch = get<S['SyncBatch']>('p34-batch'), mixed = get<S['SyncBatchResult']>('p34-mixed-results'), waiting = get<S['SyncEntry']>('p34-waiting');
assert.equal(batch.actions[0]!.context.kind, 'device');
assert.deepEqual(mixed.results.map(e => e.status), ['received', 'not-received']);
assert.equal(mixed.results[0]!.status === 'received' && mixed.results[0]!.result.receipt.businessStatus, 'accepted');
assert.equal('result' in mixed.results[1]!, false);
assert.equal(waiting.status, 'waiting'); assert.equal('result' in waiting, false);
assert.deepEqual(get<S['SyncConflicts']>('p34-conflicts-empty'), { items: [], nextActionId: null });
if (process.argv[2]) {
  const first = JSON.parse(await readFile(process.argv[2], 'utf8')); recovered(first, 'accepted');
  assert.ok(process.argv[3], 'Supply the separate takeover browser report.');
  const second = JSON.parse(await readFile(process.argv[3], 'utf8')) as { original: Journal; recovered: Journal; conflicts: S['SyncConflicts'] };
  recovered(second, 'review-required');
  const outcome = second.conflicts.items.find(e => e.envelope?.operationId === 'outcome.recordFull'); assert.ok(outcome);
  assert.ok(outcome.recovery.adoptedOutcomeId); assert.equal(outcome.result.receipt.businessStatus, 'review-required');
  assert.deepEqual(outcome.envelope, second.original.actions.find(a => a.actionId === outcome.actionId)!.envelope);
  assert.deepEqual(outcome.result, second.recovered.acks.find(a => a.actionId === outcome.actionId)!.result);
  console.log('PASS: public replay receipts and explicit-adoption evidence from two separate browser reports; no ERP application or physical-phone claim.');
} else console.log('PASS: canonical sync per-entry/waiting/receipt semantics; examples only. Supply both browser reports for connected evidence.');
