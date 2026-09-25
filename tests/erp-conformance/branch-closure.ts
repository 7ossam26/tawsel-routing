import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { components } from '../../packages/api-client/src/schema.js';
type S = components['schemas'];
/** Public JSON only: no Tawsel database, server service or UI imports. */
function request(view: S['ReturnRequestView']) {
  for (const item of view.items) {
    for (const quantity of [item.requested, item.received, item.unresolved, item.lost, item.damaged]) assert.ok(Number.isSafeInteger(quantity) && quantity >= 0);
    assert.equal(item.requested, item.received + item.unresolved + item.lost + item.damaged, 'offer portions conserve quantity');
  }
}
const examples = JSON.parse(await readFile(new URL('../../contracts/examples/valid.json', import.meta.url), 'utf8')) as { id: string; data: unknown }[];
const groups = examples.find(e => e.id === 'p31-recovered-pending-requests')!.data as S['ReturnGroups'];
assert.ok(groups.pendingRequests?.length); for (const view of groups.pendingRequests) request(view);
const malformed = structuredClone(groups.pendingRequests[0]!); malformed.items[0]!.received += 1; assert.throws(() => request(malformed));
const round = examples.find(e => e.id === 'p31-ended-round-activity-revision')!.data as S['ClosureRoundSummary']; assert.equal(round.activityRevision, 9);
if (process.argv[2]) {
  const report = JSON.parse(await readFile(process.argv[2], 'utf8')) as { publicViews: { url: string; data: unknown }[] };
  const offers = report.publicViews.filter(v => v.url.includes('/returns/requests/') && !v.url.includes('/confirmation')).map(v => v.data as S['ReturnRequestView']);
  assert.ok(offers.some(v => v.items.some(i => i.requested === 3 && i.received === 2 && i.unresolved === 1))); for (const view of offers) request(view);
  const confirmations = report.publicViews.filter(v => v.url.includes('/confirmation')).map(v => v.data as S['ReturnConfirmation']); assert.ok(confirmations.some(v => v.state === 'waiting')); assert.ok(confirmations.some(v => v.state === 'confirmed' && v.claims.some(c => c.claimed === 2 && c.confirmed === 2)));
  const summaries = report.publicViews.filter(v => v.url.includes('/summary')).map(v => v.data as S['ClosureSummary']);
  assert.ok(summaries.some(s => s.endedAt && s.carryForward.items.some(i => i.heldPieces === 1))); for (const summary of summaries) for (const r of summary.rounds) assert.ok(Number.isSafeInteger(r.activityRevision));
  const currents = report.publicViews.filter(v => v.url.includes('/current/rounds/')).map(v => v.data as S['CurrentSnapshot']);
  assert.ok(currents.some(c => c.branchActivity?.pausedActivity?.stage === 'heading')); assert.ok(currents.some(c => c.owner.generation === 2));
  const ended = summaries.find(s => s.endedAt && s.carryForward.items.some(i => i.heldPieces === 1))!;
  const unfinished = ended.carryForward.items.find(i => i.disposition === 'unfinished')!;
  assert.ok(currents.some(c => !ended.rounds.some(r => r.roundId === c.roundId) && c.targets.some(t => t.taskId === unfinished.taskId)), 'new day keeps the original held task identity');
  console.log('PASS: captured public subset/waiting, owner generation, ended summary and same-task new-day continuation.');
} else console.log('PASS: canonical P31 examples and negative conservation control (fixture evidence only).');
