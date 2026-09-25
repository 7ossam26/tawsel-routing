import 'fake-indexeddb/auto';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { Pool } from 'pg';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture, principals, ids } from '../support/access-fixture.js';
import { startedFixture } from '../support/current-fixture.js';
import { command } from '../support/planning-fixture.js';
import { syncRoutes } from '../../src/sync/routes.js';
import { Synchronization } from '../../src/sync/service.js';
import { CurrentActivity } from '../../src/current/service.js';
import { Devices } from '../../src/devices/service.js';
import { Outcomes } from '../../src/outcomes/service.js';
import { Corrections } from '../../src/corrections/service.js';
import { Rounds } from '../../src/rounds/service.js';
import { Closures } from '../../src/closure/service.js';
import { Returns } from '../../src/returns/service.js';
import { outcomeCompanyFixture } from '../support/outcome-fixture.js';
import { send, operatorToken } from '../support/provisioning-fixture.js';
import { money } from '../../src/outcomes/arithmetic.js';
import { withAccess } from '../../src/access/service.js';
import { LocalWork, type Download } from '../../../web/src/local-work.js';
import { ReplayCoordinator, type ReplayTransport } from '../../../web/src/replay.js';
import { SyncClient } from '../../../../packages/api-client/src/sync.js';
import { deferred, observeDatabaseBlock } from '../support/barriers.js';
import type { ActionEnvelope } from '../../src/commands/kernel.js';
import type { AuthConfig } from '../../src/auth/config.js';
import type { components } from '@tawsel/api-client';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const config: AuthConfig = { origin: 'http://localhost:5178', encryptionKey: Buffer.alloc(32, 34), sessionSeconds: 3600, issuers: { personal: { issuer: 'https://issuer.fixture.invalid', clientId: 'replay', clientSecret: 'fixture' }, company: { issuer: 'https://issuer.fixture.invalid', clientId: 'replay', clientSecret: 'fixture' } } };
const headers = { origin: config.origin, cookie: '__Host-tawsel-browser=p34', 'x-csrf-token': 'p34' };
beforeEach(async () => { db = await createTestDatabase(); await prepareAccessFixture(db.pool); });
afterEach(async () => { await db?.close(); });
function chain(f: Awaited<ReturnType<typeof startedFixture>>) {
  const heading = f.make(), arrival = f.make(0, 1, String(heading.payload.attemptId), 'current.recordArrival'), full = f.make(0, 2, String(heading.payload.attemptId), 'outcome.recordFull');
  const all = [heading, arrival, full];
  for (const [i, c] of all.entries()) { if (c.context.kind === 'device') c.context.deviceSequence = i + 1; c.resources = { tripId: f.round.roundId, taskId: String(c.payload.taskId), attemptId: String(c.payload.attemptId) }; c.dependsOnActionIds = i ? [all[i - 1]!.actionId] : []; }
  return all;
}
async function api() {
  const app = Fastify(); await app.register(scope => syncRoutes(scope, db.pool, config, (_r, _kind, work) => work(principals.personal)));
  return app;
}
test('A: later entry waits explicitly; original retry releases its dependent, with independent durable batch results', async () => {
  const f = await startedFixture(db.pool, 1), [heading, arrival, full] = chain(f), app = await api();
  try {
    const post = (actions: ActionEnvelope[]) => app.inject({ method: 'POST', url: '/api/v1/sync/actions?kind=personal', headers, payload: { actions } });
    expect((await app.inject({ method: 'POST', url: '/api/v1/sync/actions?kind=personal', payload: { actions: [heading] } })).statusCode).toBe(403);
    const first = await post([arrival!, heading!]); expect(first.statusCode).toBe(200);
    expect(first.json().results[0]).toEqual({ actionId: arrival!.actionId, status: 'waiting', dependencies: [heading!.actionId] });
    expect((await db.pool.query('SELECT 1 FROM tawsel.command_identities WHERE action_id=$1', [arrival!.actionId])).rowCount).toBe(0);
    const unknown = { ...full!, actionId: randomUUID(), operationId: 'report.getDaily' };
    const next = (await post([heading!, arrival!, unknown, full!])).json() as components['schemas']['SyncBatchResult'];
    expect(next.results.map(x => x.status)).toEqual(['received', 'received', 'not-received', 'received']);
    expect(next.results[0]).toEqual(first.json().results[1]);
    expect((await new Outcomes(db.pool).read(principals.personal, f.round.roundId)).progress.full).toBe(1);
    expect((await db.pool.query('SELECT resolved_versions FROM tawsel.command_replay_metadata WHERE action_id=$1', [full!.actionId])).rows[0].resolved_versions[arrival!.actionId].resourceRevision).toBe(2);
    const conflict = structuredClone(full!); conflict.payload.expectedActivityRevision = 999;
    expect((await post([conflict])).json().results[0]).toMatchObject({ status: 'not-received', code: 'idempotency_conflict' });
  } finally { await app.close(); }
});
test('A: received failed predecessor retains later evidence and performs no later mutation', async () => {
  const f = await startedFixture(db.pool, 1), [heading, arrival] = chain(f); heading!.payload.expectedSourceRevision = 99;
  const result = await new Synchronization(db.pool).submit(principals.personal, { actions: [heading, arrival] });
  expect(result.results.map(x => x.status === 'received' && x.result.receipt.businessStatus)).toEqual(['rejected', 'rejected']);
  expect((await db.pool.query('SELECT envelope FROM tawsel.command_evidence WHERE action_id=$1', [arrival!.actionId])).rows[0].envelope).toEqual(arrival);
  expect((await new CurrentActivity(db.pool).read(principals.personal, f.round.roundId)).revision).toBe(0);
});
test('A: route reorder alone remains compatible; old phone evidence after takeover is retained without execution', async () => {
  const f = await startedFixture(db.pool, 2), actions = chain(f), state = await f.planning.plans(principals.personal, ids.personalDriver);
  await f.planning.command(principals.personal, command('planning.setManualOrder', { driverId: ids.personalDriver, expectedSettingsRevision: state.settingsRevision, expectedInputRevision: state.inputRevision, expectedManualRevision: state.manualRevision, selection: { kind: 'order', taskIds: f.tasks.map(t => t.taskId).reverse() } }));
  const service = new Synchronization(db.pool);
  expect((await service.submit(principals.personal, { actions: [actions[0]] })).results[0]).toMatchObject({ status: 'received', result: { receipt: { businessStatus: 'accepted' } } });
  const takeover = command('device.takeOver', { roundId: f.round.roundId, expectedGeneration: 1 }); if (takeover.context.kind === 'device') takeover.context.deviceId = randomUUID();
  expect((await new Devices(db.pool).takeover(principals.personal, takeover)).receipt.businessStatus).toBe('accepted');
  if (takeover.context.kind !== 'device') throw Error('device');
  const fresh = await new Devices(db.pool).snapshot(principals.personal, f.round.roundId, takeover.context.deviceId);
  const ownerArrival = { ...actions[1]!, actionId: randomUUID(), dependsOnActionIds: [], context: { ...takeover.context, deviceGeneration: 2, snapshotToken: fresh.snapshotToken! } };
  const mixed = await service.submit(principals.personal, { actions: [actions[1], ownerArrival, actions[2]] });
  expect(mixed.results.map(x => x.status === 'received' && x.result.receipt.businessStatus)).toEqual(['review-required', 'accepted', 'review-required']);
  const duplicate = await service.submit(principals.personal, { actions: [actions[1], ownerArrival, actions[2]] });
  expect(duplicate).toEqual(mixed);
  expect((await new CurrentActivity(db.pool).read(principals.personal, f.round.roundId)).revision).toBe(2);
  expect((await new Outcomes(db.pool).read(principals.personal, f.round.roundId)).history).toHaveLength(0);
  const device = takeover.context.kind === 'device' ? takeover.context.deviceId : '';
  expect((await service.conflicts(principals.personal, device)).items.map(x => x.actionId).sort()).toEqual(actions.slice(1).map(x => x.actionId).sort());
  expect((await new Devices(db.pool).evidence(principals.personal, actions[2]!.actionId, device)).envelope).toEqual(actions[2]);
});
test('A: independent PostgreSQL predecessor/dependent race commits once without deadlock or an out-of-order effect', async () => {
  const f = await startedFixture(db.pool, 1), [heading, arrival] = chain(f), a = new Pool({ ...db.config, max: 1 }), b = new Pool({ ...db.config, max: 1 }), held = deferred<number>(), release = deferred();
  let first: Promise<unknown> | undefined, second: Promise<unknown> | undefined;
  try {
    first = new CurrentActivity(a, { async afterWrite(stage, tx) { if (stage === 'domain') { held.resolve((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid); await release.promise; } } }).command(principals.personal, heading);
    const holder = await held.promise, waiter = (await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    second = new Synchronization(b).submit(principals.personal, { actions: [arrival] });
    await observeDatabaseBlock(db.pool, waiter, holder); release.resolve(); await first;
    expect(await second).toMatchObject({ results: [{ status: 'received', result: { receipt: { businessStatus: 'accepted' } } }] });
    await new Synchronization(db.pool).submit(principals.personal, { actions: [heading, arrival] });
    expect((await db.pool.query('SELECT 1 FROM tawsel.current_activity_history')).rowCount).toBe(2);
  } finally { release.resolve(); await Promise.allSettled([first, second]); await a.end(); await b.end(); }
});
test('A: current owner explicitly adopts a received offline chain once while preserving its original receipts', async () => {
  const f = await startedFixture(db.pool, 1), actions = chain(f), old = actions[2]!, devices = new Devices(db.pool);
  const takeover = command('device.takeOver', { roundId: f.round.roundId, expectedGeneration: 1 });
  if (takeover.context.kind !== 'device') throw Error('device'); takeover.context.deviceId = randomUUID();
  await devices.takeover(principals.personal, takeover);
  const snapshot = await devices.snapshot(principals.personal, f.round.roundId, takeover.context.deviceId);
  const received = await new Synchronization(db.pool).submit(principals.personal, { actions });
  expect(received.results.every(x => x.status === 'received' && x.result.receipt.businessStatus === 'review-required')).toBe(true);
  const before = await devices.evidence(principals.personal, old.actionId, takeover.context.deviceId);
  expect(before.recovery.state).toBe('requires-validation');
  const adoption = command('evidence.adoptCompatible', { roundId: f.round.roundId, evidenceActionId: old.actionId, evidenceReceiptId: before.result.receipt.receiptId, expectedGeneration: 2, expectedOutcomeRevision: 0, expectedActivityRevision: 0, expectedSourceRevision: old.payload.expectedSourceRevision, expectedAssignmentRevision: old.payload.expectedAssignmentRevision, expectedPinRevision: old.payload.expectedPinRevision });
  adoption.context = { ...takeover.context, deviceGeneration: 2, snapshotToken: snapshot.snapshotToken! };
  const corrections = new Corrections(db.pool), accepted = await corrections.command(principals.personal, adoption);
  expect(accepted.receipt.businessStatus).toBe('accepted');
  expect(await corrections.command(principals.personal, adoption)).toEqual(accepted);
  expect((await devices.evidence(principals.personal, old.actionId, takeover.context.deviceId)).result).toEqual(before.result);
  expect((await new Outcomes(db.pool).read(principals.personal, f.round.roundId)).history).toHaveLength(1);
  expect((await new CurrentActivity(db.pool).read(principals.personal, f.round.roundId)).physicalOrigin).toBeNull();
});

async function queuedFixture(count = 1) {
  const f = await startedFixture(db.pool, count), store = new LocalWork('p34-' + randomUUID());
  const device = f.round.owner.deviceId;
  const session = { kind: 'personal' as const, access: await withAccess(db.pool, principals.personal, async a => a.context), expiresAt: new Date(Date.now() + 3600000).toISOString(), loginIdentifier: '+201012345678', recoveryEmailVerified: true, phoneOwnershipVerified: false as const };
  const scope = await store.select(session, device);
  const download: Download = { format: 1, scope, session, roundId: f.round.roundId, downloadedAt: new Date().toISOString(), ownership: await new Devices(db.pool).context(principals.personal, f.round.roundId, device), snapshotToken: null, current: await new CurrentActivity(db.pool).read(principals.personal, f.round.roundId), outcomes: await new Outcomes(db.pool).read(principals.personal, f.round.roundId), plan: null, road: null };
  await store.saveDownload(download);
  for (const c of chain(f)) await store.capture(scope, c, '/rounds/current?kind=personal');
  const app = await api(), origin = await app.listen({ host: '127.0.0.1', port: 0 });
  const sent: ActionEnvelope[][] = [];
  let lose = false, truncate = false;
  const client = new SyncClient('personal', async (input, init) => {
    if (String(input) === '/api/session/bootstrap') return Response.json({ csrfToken: 'p34' }); // Explicit identity/CSRF fixture; domain/API/DB are real.
    const response = await fetch(new URL(String(input), origin), { ...init, headers: { ...headers, 'content-type': 'application/json' } });
    if (init?.body) sent.push((JSON.parse(String(init.body)) as { actions: ActionEnvelope[] }).actions);
    if (lose) { lose = false; await response.arrayBuffer(); throw new TypeError('lost committed HTTP response'); }
    if (truncate) { truncate = false; await response.arrayBuffer(); return Response.json({ results: [] }); }
    return response;
  });
  const transport: ReplayTransport = {
    async session() { return { ...session, access: await withAccess(db.pool, principals.personal, async a => a.context) }; },
    submit: actions => client.submit(actions), result: id => new Devices(db.pool).result(principals.personal, id),
    async refresh(selected) {
      const fresh = await new Devices(db.pool).snapshot(principals.personal, f.round.roundId, device);
      if (!fresh.current || fresh.context.mode !== 'owner') { await store.retireConfirmedRound(selected, f.round.roundId); return; }
      await store.saveDownload({ ...download, scope: selected, current: fresh.current, outcomes: await new Outcomes(db.pool).read(principals.personal, f.round.roundId) });
    }
  };
  // Deterministic test lock, not claimed as Web Locks/browser evidence.
  let tail: Promise<unknown> = Promise.resolve();
  const lock = <T>(_scope: string, work: () => Promise<T>) => { const next = tail.then(work); tail = next.catch(() => undefined); return next; };
  return { f, store, scope, download, transport, sent, lock, lose() { lose = true; }, truncate() { truncate = true; }, async close() { await app.close(); await store.delete(); } };
}
test('B: actual journal and HTTP replay recover a lost first acknowledgement before releasing dependent actions', async () => {
  const q = await queuedFixture();
  try {
    const original = (await q.store.actions.toArray()).map(x => x.bytes), coordinator = new ReplayCoordinator(q.store, q.transport, q.lock);
    q.lose(); await expect(coordinator.run(q.scope)).rejects.toThrow('lost committed');
    expect(q.sent).toHaveLength(1); expect(q.sent[0]).toHaveLength(1);
    expect(await q.store.pending.count()).toBe(3); expect(await q.store.acknowledgements.count()).toBe(0);
    q.store.close(); await q.store.open(); // Simulated IndexedDB reopen, real server commit already exists.
    expect(await new ReplayCoordinator(q.store, q.transport, q.lock).run(q.scope)).toMatchObject({ received: 3, remaining: 0 });
    expect(q.sent[1]).toEqual(q.sent[0]);
    expect(await q.store.acknowledgements.count()).toBe(3); expect(await q.store.pending.count()).toBe(0);
    expect((await q.store.actions.toArray()).map(x => x.bytes)).toEqual(original);
    expect((await db.pool.query('SELECT 1 FROM tawsel.current_activity_history')).rowCount).toBe(3);
    expect((await new Outcomes(db.pool).read(principals.personal, q.f.round.roundId)).history).toHaveLength(1);
  } finally { await q.close(); }
});
test('B: ack transaction failure and incomplete responses retain unsent descendants; coordinated retry has one effect', async () => {
  const q = await queuedFixture();
  try {
    const coordinator = new ReplayCoordinator(q.store, q.transport, q.lock), put = q.store.acknowledgements.put.bind(q.store.acknowledgements);
    q.store.acknowledgements.put = () => { throw new Error('ack quota'); };
    await expect(coordinator.run(q.scope)).rejects.toThrow('ack quota');
    expect(await q.store.pending.count()).toBe(3); expect(await q.store.acknowledgements.count()).toBe(0);
    q.store.acknowledgements.put = put;
    q.truncate(); expect(await coordinator.run(q.scope)).toMatchObject({ remaining: 3 });
    expect(q.sent).toHaveLength(2);
    await Promise.all([coordinator.run(q.scope), new ReplayCoordinator(q.store, q.transport, q.lock).run(q.scope)]);
    expect(q.sent).toHaveLength(5); expect(await q.store.pending.count()).toBe(0);
    expect((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes')).rowCount).toBe(1);
  } finally { await q.close(); }
});
test('B: wrong/expired fresh authentication preserves all evidence and sends no commands', async () => {
  const q = await queuedFixture();
  try {
    const same = await q.transport.session();
    const wrong = { ...q.transport, session: async () => ({ ...same, access: { ...same.access, sourceId: randomUUID() } }) };
    await expect(new ReplayCoordinator(q.store, wrong, q.lock).run(q.scope)).rejects.toThrow('للحساب نفسه');
    const expired = { ...q.transport, session: async () => { throw new Error('session_expired'); } };
    await expect(new ReplayCoordinator(q.store, expired, q.lock).run(q.scope)).rejects.toThrow('session_expired');
    expect(q.sent).toHaveLength(0); expect(await q.store.actions.count()).toBe(3); expect(await q.store.pending.count()).toBe(3);
  } finally { await q.close(); }
});
test('C: pending day end and a second phone cannot start ahead of synchronization; retry needs fresh authoritative readiness', async () => {
  const q = await queuedFixture(2), rounds = new Rounds(db.pool);
  try {
    const replay = new ReplayCoordinator(q.store, q.transport, q.lock); await replay.run(q.scope);
    const end = command('workday.end', { roundId: q.f.round.roundId, workdayId: q.f.round.workdayId, expectedActiveRoundId: q.f.round.roundId, expectedActivityRevision: 3, expectedCurrentAttemptId: null, currentAction: 'require-none' });
    end.context = { ...q.f.start.context }; end.resources.tripId = q.f.round.roundId;
    const saved = await q.store.capture(q.scope, end, '/execution/closure?kind=personal', false);
    const readiness = { driverId: ids.personalDriver, deviceId: randomUUID(), planId: q.f.plan.planId, expectedPlanRevision: q.f.plan.revision, relevantActionIds: [saved.actionId] };
    await expect(rounds.readiness(principals.personal, readiness)).rejects.toMatchObject({ code: 'round_already_active' });
    let started = false;
    q.lose(); await expect(replay.beforeStart(q.scope, async () => { started = true; })).rejects.toThrow('lost committed');
    expect(started).toBe(false); expect(await q.store.pending.count()).toBe(1);
    expect((await rounds.current(principals.personal)).round).toBeNull();
    const state = await q.f.planning.plans(principals.personal, ids.personalDriver);
    await q.f.planning.command(principals.personal, command('planning.setManualOrder', { driverId: ids.personalDriver, expectedSettingsRevision: state.settingsRevision, expectedInputRevision: state.inputRevision, expectedManualRevision: state.manualRevision, selection: { kind: 'order', taskIds: [q.f.tasks[1]!.taskId] } }));
    const plan = (await q.f.planning.plans(principals.personal, ids.personalDriver)).items[0]!;
    const result = await replay.beforeStart(q.scope, async ids => {
      expect(ids).toContain(saved.actionId);
      const fresh = await rounds.readiness(principals.personal, { ...readiness, deviceId: q.f.round.owner.deviceId, planId: plan.planId, expectedPlanRevision: plan.revision, relevantActionIds: ids });
      return rounds.start(principals.personal, command('round.start', { driverId: readiness.driverId, planId: plan.planId, expectedPlanRevision: plan.revision, readinessId: fresh.readinessId }));
    });
    expect(result.receipt.businessStatus).toBe('accepted'); expect(await q.store.pending.count()).toBe(0);
    expect((await rounds.current(principals.personal)).round?.workdayId).not.toBe(q.f.round.workdayId);
  } finally { await q.close(); }
});

test('C: a newer route order still accepts the original offline outcome chain', async () => {
  const q = await queuedFixture(2);
  try {
    const before = (await q.store.actions.toArray()).map(a => a.bytes), state = await q.f.planning.plans(principals.personal, ids.personalDriver);
    await q.f.planning.command(principals.personal, command('planning.setManualOrder', { driverId: ids.personalDriver, expectedSettingsRevision: state.settingsRevision, expectedInputRevision: state.inputRevision, expectedManualRevision: state.manualRevision, selection: { kind: 'order', taskIds: q.f.tasks.map(t => t.taskId).reverse() } }));
    expect(await new ReplayCoordinator(q.store, q.transport, q.lock).run(q.scope)).toMatchObject({ received: 3, remaining: 0, review: 0 });
    expect((await q.store.actions.toArray()).map(a => a.bytes)).toEqual(before);
    expect((await new Outcomes(db.pool).read(principals.personal, q.f.round.roundId)).progress.full).toBe(1);
  } finally { await q.close(); }
});

test.each(['receipt', 'closed-day'] as const)('C: batch evidence and explicit adoption cannot override an actual %s', async boundary => {
  const f = await outcomeCompanyFixture(db, [{}]);
  try {
    const bootstrap = structuredClone(f.source.bootstrapCommand); bootstrap.actionId = randomUUID(); bootstrap.payload.sourceRevision = 3; bootstrap.payload.returnCapabilities = ['return.receive', 'return.dispose'];
    expect((await send(f.app, operatorToken, bootstrap)).statusCode).toBe(200);
    expect((await send(f.app, f.source.token, f.source.command('role.defineCapabilities', { externalId: 'role', sourceRevision: 2, name: 'Driver', capabilities: ['execution.own', 'correction.own'] }))).statusCode).toBe(200);
    expect((await new Outcomes(db.pool).command(f.principal, f.make(0, 'outcome.recordNoAnswer'))).receipt.businessStatus).toBe('accepted');
    const old = f.make(0, 'outcome.recordFull', { reportedCollection: money(35000) }, 1), devices = new Devices(db.pool), service = new Synchronization(db.pool);
    if (boundary === 'receipt') {
      const returns = new Returns(db.pool), group = (await returns.groups(f.principal)).groups[0]!;
      const requestCommand = f.planCommand('return.requestHandover', { roundId: f.round.roundId, sourceBranchId: group.sourceBranchId, items: group.items.map(item => ({ taskId: item.taskId, dispatchCycleId: item.dispatchCycleId, outcomeId: item.outcomeId, sourceLineId: item.sourceLineId, quantity: 3 })) }); delete requestCommand.payload.driverId;
      const result = await returns.request(f.principal, requestCommand); expect(result.receipt.businessStatus).toBe('accepted');
      const request = result.response!.body.request as components['schemas']['ReturnRequestView'], item = request.items[0]!;
      const receipt = f.source.command('return.confirmSubsetReceipt', { requestId: request.requestId, receivingBranchId: request.sourceBranchId, items: [{ itemId: item.itemId, expectedRevision: item.revision, quantity: 1 }] });
      const received = await f.app.inject({ method: 'POST', url: '/api/v1/erp/returns/commands/return.confirmSubsetReceipt', headers: { authorization: `Bearer ${f.source.token}` }, payload: receipt });
      expect(received.statusCode, received.body).toBe(200); expect((await returns.read(f.principal, request.requestId)).items[0]?.received).toBe(1);
    }
    const takeover = f.planCommand('device.takeOver', { roundId: f.round.roundId, expectedGeneration: 1 }); delete takeover.payload.driverId;
    if (takeover.context.kind !== 'device') throw Error('device'); takeover.context.deviceId = randomUUID();
    expect((await devices.takeover(f.principal, takeover)).receipt.businessStatus).toBe('accepted');
    const snapshot = await devices.snapshot(f.principal, f.round.roundId, takeover.context.deviceId), owner = { ...takeover.context, deviceGeneration: 2, snapshotToken: snapshot.snapshotToken! };
    if (boundary === 'closed-day') {
      const end = f.planCommand('workday.end', { roundId: f.round.roundId, workdayId: f.round.workdayId, expectedActiveRoundId: f.round.roundId, expectedActivityRevision: 1, expectedCurrentAttemptId: null, currentAction: 'require-none' }); delete end.payload.driverId; end.context = owner;
      expect((await new Closures(db.pool).command(f.principal, end)).receipt.businessStatus).toBe('accepted');
    }
    const received = (await service.submit(f.principal, { actions: [old] })).results[0]!;
    expect(received).toMatchObject({ status: 'received', result: { receipt: { businessStatus: 'review-required' } } });
    if (received.status !== 'received') throw Error('missing receipt');
    const evidence = await devices.evidence(f.principal, old.actionId, owner.deviceId);
    expect(evidence.recovery.constraints).toContain(boundary === 'receipt' ? 'dependent-receipt' : 'closed-workday');
    const adopt = f.planCommand('evidence.adoptCompatible', { roundId: f.round.roundId, evidenceActionId: old.actionId, evidenceReceiptId: received.result.receipt.receiptId, expectedGeneration: 2, expectedOutcomeRevision: 1, expectedActivityRevision: 1, expectedSourceRevision: old.payload.expectedSourceRevision, expectedAssignmentRevision: old.payload.expectedAssignmentRevision, expectedPinRevision: old.payload.expectedPinRevision }); delete adopt.payload.driverId; adopt.context = owner;
    expect((await service.submit(f.principal, { actions: [adopt] })).results[0]).toMatchObject({ status: 'received', result: { receipt: { businessStatus: 'review-required' } } });
    expect((await devices.evidence(f.principal, old.actionId, owner.deviceId)).result).toEqual(received.result);
    expect((await new Outcomes(db.pool).read(f.principal, f.round.roundId)).history).toHaveLength(1);
    expect((await db.pool.query('SELECT 1 FROM tawsel.outcome_corrections')).rowCount).toBe(0);
    expect((await db.pool.query('SELECT 1 FROM tawsel.return_transitions')).rowCount).toBe(boundary === 'receipt' ? 1 : 0);
  } finally { await f.close(); }
});
