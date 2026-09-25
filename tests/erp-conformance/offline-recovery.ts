import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { components } from '../../packages/api-client/src/schema.js';

type S = components['schemas'];
type Journal = { actions: Array<{ actionId: string; bytes: string; envelope: S['ActionEnvelope'] }>; pending: unknown[]; acks: Array<{ actionId: string; result: S['ActionResult'] }> };
const examples = JSON.parse(await readFile(new URL('../../contracts/examples/valid.json', import.meta.url), 'utf8')) as Array<{ id: string; data: unknown }>;
const login = examples.find(x => x.id === 'p35-same-account-recovery-fixture')!.data as S['LoginRequest'];
assert.equal(login.reauthenticate, true); assert.ok(login.expectedAccount?.accountId); assert.ok(login.expectedAccount.tenantId);

if (!process.argv[2]) console.log('PASS: canonical expected-account recovery restriction; schema example only. Supply both P35 browser reports for actual public-receipt conformance.');
else {
  const first = JSON.parse(await readFile(process.argv[2], 'utf8')) as { original: Journal; recovered: Journal; workerBlocked: { reason: string }; migration: { aborted: boolean; rolledBack: boolean; before: unknown[]; after: unknown[]; afterAbort: unknown[]; pendingBefore: unknown[]; pendingAfter: unknown[] } };
  const second = JSON.parse(await readFile(process.argv[3]!, 'utf8')) as { original: Journal; retained: Journal; conflicts: S['SyncConflicts'] };
  for (const [original, retained, status] of [[first.original, first.recovered, 'accepted'], [second.original, second.retained, 'review-required']] as const) {
    assert.deepEqual(retained.actions, original.actions); assert.equal(retained.pending.length, 0); assert.equal(retained.acks.length, 3);
    for (const action of original.actions) {
      assert.equal(action.bytes, JSON.stringify(action.envelope));
      const received = retained.acks.find(a => a.actionId === action.actionId)!;
      assert.equal(received.result.receipt.actionId, action.actionId); assert.equal(received.result.receipt.evidenceStatus, 'received'); assert.equal(received.result.receipt.businessStatus, status);
      if (status === 'review-required') assert.equal(received.result.receipt.committedAt, undefined);
    }
  }
  assert.equal(first.workerBlocked.reason, 'pending'); assert.equal(first.migration.aborted, true); assert.equal(first.migration.rolledBack, true);
  assert.deepEqual(first.migration.after, first.migration.before); assert.deepEqual(first.migration.afterAbort, first.migration.before); assert.deepEqual(first.migration.pendingAfter, first.migration.pendingBefore);
  for (const action of second.original.actions) {
    const evidence = second.conflicts.items.find(x => x.actionId === action.actionId); assert.ok(evidence);
    assert.deepEqual(evidence.envelope, action.envelope); assert.equal(evidence.result.receipt.businessStatus, 'review-required'); assert.equal(evidence.recovery.adoptedOutcomeId, null);
  }
  console.log('PASS: original public envelopes/receipts survive recovery, native upgrade rollback and logout with server-retained unresolved evidence. No Tawsel database/internal-service dependency or ERP-application claim.');
}
