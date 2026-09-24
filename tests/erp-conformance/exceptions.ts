import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { components } from '../../packages/api-client/src/schema.js';

type S = components['schemas'];
/** Public JSON boundary only. Server tables and browser implementation are not imported. */
export function assertDelivery(view: S['CurrentTarget']['delivery']) {
  assert.ok(view.lines, 'P30 frozen allocation must be present');
  if (view.kind === 'personal') { assert.deepEqual(view.lines, []); assert.equal(view.shippingDue, null); assert.ok(!view.allowedActions.includes('partial')); return; }
  for (const line of view.lines) { assert.ok(Number.isSafeInteger(line.quantity) && line.quantity > 0); assert.ok(Number.isSafeInteger(line.unitDue.amountMinor)); }
  const goods = view.lines.reduce((sum, line) => sum + BigInt(line.quantity) * BigInt(line.unitDue.amountMinor), 0n);
  assert.equal(goods, BigInt(view.goodsDue!.amountMinor)); assert.equal(goods + BigInt(view.shippingDue!.amountMinor), BigInt(view.fullCollection!.amountMinor));
}
const examples = JSON.parse(await readFile(new URL('../../contracts/examples/valid.json', import.meta.url), 'utf8')) as { id: string; data: unknown }[];
const delivery = examples.find(item => item.id === 'p30-frozen-piece-delivery')!.data as S['CurrentTarget']['delivery']; assertDelivery(delivery);
assert.equal(delivery.lines![0]!.unitDue.amountMinor * 2 + delivery.shippingDue!.amountMinor, 25000);
const bad = structuredClone(delivery); bad.fullCollection!.amountMinor = 25000; assert.throws(() => assertDelivery(bad));
if (process.argv[2]) {
  const report = JSON.parse(await readFile(process.argv[2], 'utf8')) as { publicViews: { url: string; data: S['CurrentSnapshot'] | S['CorrectionAvailability'] }[] };
  const current = report.publicViews.filter(view => view.url.includes('/current/rounds/')).map(view => view.data as S['CurrentSnapshot']); assert.ok(current.length);
  for (const snapshot of current) for (const target of snapshot.targets) assertDelivery(target.delivery);
  assert.ok(current.some(snapshot => snapshot.targets.some(target => target.delivery.fullCollection?.amountMinor === 30000 && target.delivery.shippingDue?.amountMinor === 0)), 'retry does not recollect shipping');
  const corrections = report.publicViews.filter(view => view.url.includes('/corrections/attempts/')).map(view => view.data as S['CorrectionAvailability']);
  assert.ok(corrections.some(view => view.originalOutcome?.revision === 1 && view.effectiveOutcomeRevision === 2));
  assert.ok(corrections.some(view => !view.allowed && view.constraints.includes('dependent-receipt')));
  for (const view of corrections) { assertDelivery(view.delivery!); assert.ok(view.executionRoundId, 'current ownership anchor must be supplied'); }
  console.log('PASS: captured real HTTP frozen inputs, original/effective history, prior fee and receipt denial. No ERP-specific database access.');
} else console.log('PASS: canonical P30 examples and negative amount control; fixture evidence only.');
