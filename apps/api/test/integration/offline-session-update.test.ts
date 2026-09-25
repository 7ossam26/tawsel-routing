import 'fake-indexeddb/auto';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Dexie } from 'dexie';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture, ids } from '../support/access-fixture.js';
import { startedFixture } from '../support/current-fixture.js';
import { issuerFixture } from '../support/issuer-fixture.js';
import { buildApp } from '../../src/app.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { sessionCookie } from '../../src/auth/routes.js';
import { Devices } from '../../src/devices/service.js';
import { CurrentActivity } from '../../src/current/service.js';
import { Outcomes } from '../../src/outcomes/service.js';
import { LocalWork, type Download } from '../../../web/src/local-work.js';
import { bindSession, exitAccount, recoveryInput } from '../../../web/src/account-lifecycle.js';
import { ReplayCoordinator } from '../../../web/src/replay.js';
import { assertUpdateSafe } from '../../../web/src/safe-update.js';
import { SessionClient } from '../../../../packages/api-client/src/session.js';
import { SyncClient } from '../../../../packages/api-client/src/sync.js';
import { DevicesClient } from '../../../../packages/api-client/src/devices.js';
import type { components } from '@tawsel/api-client';

// Actual Sessions/OIDC protocol, HTTP handlers, domain transactions and isolated
// PostgreSQL. Issuer is the labelled signed provider fixture; IndexedDB and the
// lock scheduler are simulated here. Real browser/worker checks are separate.
let db: Awaited<ReturnType<typeof createTestDatabase>>, issuer: Awaited<ReturnType<typeof issuerFixture>>;
let app: ReturnType<typeof buildApp>, store: LocalWork;
let f: Awaited<ReturnType<typeof startedFixture>>, download: Download, scope: string;
let sessions: SessionClient, sync: SyncClient, devices: DevicesClient;
const cookies = new Map<string, string>();
const lock = <T>(_scope: string, work: () => Promise<T>) => work();

beforeEach(async () => {
  cookies.clear(); db = await createTestDatabase(); issuer = await issuerFixture(); issuer.state.subject = 'personal';
  const principal = { kind: 'account' as const, issuer: issuer.origin + '/personal', subject: 'personal' };
  await prepareAccessFixture(db.pool, undefined, undefined, { personal: principal }); f = await startedFixture(db.pool, 1, principal);
  const current = await new CurrentActivity(db.pool).read(principal, f.round.roundId);
  const ownership = await new Devices(db.pool).context(principal, f.round.roundId, f.round.owner.deviceId);
  const outcomes = await new Outcomes(db.pool).read(principal, f.round.roundId);
  app = buildApp(createDatabasePool(db.config), { origin: 'http://localhost:5173', encryptionKey: Buffer.alloc(32, 35), sessionSeconds: 3600, issuers: { company: { issuer: issuer.origin + '/company', clientId: 'tawsel-web', clientSecret: 'fixture-secret' }, personal: { issuer: issuer.origin + '/personal', clientId: 'tawsel-web', clientSecret: 'fixture-secret' } } });
  await app.ready();
  const fetcher: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers); headers.set('origin', 'http://localhost:5173');
    const response = await app.inject({ method: init?.method === 'POST' ? 'POST' : 'GET', url: String(input), headers: Object.fromEntries(headers), cookies: Object.fromEntries(cookies), ...(init?.body ? { payload: String(init.body) } : {}) });
    for (const cookie of response.cookies) { if (cookie.value) cookies.set(cookie.name, cookie.value); else cookies.delete(cookie.name); }
    return new Response(response.statusCode === 204 ? null : response.body, { status: response.statusCode, headers: response.headers as HeadersInit });
  };
  sessions = new SessionClient(fetcher); sync = new SyncClient('personal', fetcher); devices = new DevicesClient('personal', fetcher);
  await login({ kind: 'personal' });
  store = new LocalWork('p35-' + randomUUID());
  const session = await sessions.context('personal'); scope = await bindSession(store, session, f.round.owner.deviceId);
  download = { scope, format: 1, roundId: f.round.roundId, session, downloadedAt: new Date().toISOString(), ownership, current, outcomes, snapshotToken: null, plan: null, road: null };
  await store.saveDownload(download);
});
afterEach(async () => { await store?.delete(); await app?.close(); await issuer?.close(); await db?.close(); });

async function login(input: components['schemas']['LoginRequest']) {
  const start = await sessions.begin(input), response = await fetch(start.authorizationUrl, { redirect: 'manual' });
  const callback = new URL(response.headers.get('location')!);
  const completed = await app.inject({ url: callback.pathname + callback.search, cookies: Object.fromEntries(cookies) });
  for (const cookie of completed.cookies) cookies.set(cookie.name, cookie.value);
  return String(completed.headers.location);
}
async function capture(reject = false) {
  const command = f.make(); command.resources = { tripId: f.round.roundId, taskId: String(command.payload.taskId), attemptId: String(command.payload.attemptId) };
  if (reject) command.payload.expectedSourceRevision = 999;
  return store.capture(scope, command, '/rounds/current?kind=personal', !reject);
}
function coordinator() { return new ReplayCoordinator(store, { session: () => sessions.context('personal'), submit: actions => sync.submit(actions), result: id => devices.result(id), refresh: async () => {} }, lock); }

test('A: expiry and missing cookie recover only the original account; original evidence replays after verified OIDC', async () => {
  const action = await capture();
  await db.pool.query("UPDATE tawsel.web_sessions SET expires_at=now()-interval '1 second'");
  await expect(coordinator().run(scope)).rejects.toMatchObject({ code: 'session_expired' });
  expect(await store.unreceived(scope)).toHaveLength(1); expect(await store.actions.get([scope, action.actionId])).toEqual(action);
  expect((await db.pool.query('SELECT 1 FROM tawsel.current_activity_history')).rowCount).toBe(0);
  cookies.delete(sessionCookie('personal'));
  const recovery = (await recoveryInput(store))!;
  issuer.state.subject = 'different-person';
  expect(await login(recovery)).toContain('same_account_required'); expect(cookies.has(sessionCookie('personal'))).toBe(false);
  issuer.state.subject = 'personal'; expect(await login(recovery)).toContain('/account');
  expect(await coordinator().run(scope)).toMatchObject({ received: 1, remaining: 0 });
  expect((await store.actions.get([scope, action.actionId]))?.bytes).toBe(action.bytes);
  expect((await db.pool.query('SELECT 1 FROM tawsel.current_activity_history')).rowCount).toBe(1);
});

test('A: durable rejected evidence permits logout, fences peer capture, and remains isolated after another login', async () => {
  const action = await capture(true);
  await expect(exitAccount(store, () => sessions.logout('personal'), lock)).rejects.toThrow('ينتظر');
  expect(await coordinator().run(scope)).toMatchObject({ received: 1, remaining: 0, review: 1 });
  const result = (await store.acknowledgements.get([scope, action.actionId]))!.result;
  expect(result.receipt.businessStatus).toBe('rejected');
  const peer = new LocalWork(store.name);
  try {
    await exitAccount(store, async () => {
      expect(await peer.downloaded('personal', f.round.owner.deviceId)).toBeNull();
      await expect(peer.capture(scope, f.make(), '/rounds/current')).rejects.toThrow('غير متاح');
      await expect(peer.select(download.session, f.round.owner.deviceId)).rejects.toThrow('الخروج');
      await sessions.logout('personal');
    }, lock);
    expect(await store.selection.get('active')).toBeUndefined();
    await expect(bindSession(store, download.session, f.round.owner.deviceId)).rejects.toThrow('الخروج');
    issuer.state.subject = 'new-person'; expect(await login({ kind: 'personal' })).toContain('/account');
    await bindSession(store, await sessions.context('personal'), f.round.owner.deviceId);
    expect(await store.downloaded('personal', f.round.owner.deviceId)).toBeNull();
    await expect(coordinator().run(scope)).rejects.toThrow('الحساب');
    expect((await db.pool.query('SELECT envelope FROM tawsel.command_evidence WHERE action_id=$1', [action.actionId])).rows[0].envelope).toEqual(action.envelope);
    expect((await store.acknowledgements.get([scope, action.actionId]))?.result).toEqual(result);
  } finally { peer.close(); }
});

test('A: revoked issuer and membership cannot upload or apply outcomes; no receipt means exit remains blocked', async () => {
  const action = await capture(); issuer.state.active = false;
  await expect(sync.submit([action.envelope])).rejects.toMatchObject({ status: 401 });
  await expect(exitAccount(store, () => sessions.logout('personal'), lock)).rejects.toThrow('ينتظر');
  issuer.state.active = true; await login((await recoveryInput(store))!);
  await db.pool.query('UPDATE tawsel.memberships SET enabled=false WHERE account_id=$1', [ids.personalAccount]);
  await expect(coordinator().run(scope)).rejects.toMatchObject({ code: 'access_disabled' });
  const denied = await sync.submit([action.envelope]); expect(denied.results[0]).toMatchObject({ status: 'not-received' });
  expect(await store.unreceived(scope)).toHaveLength(1); expect(await store.acknowledgements.count()).toBe(0);
  expect((await db.pool.query('SELECT 1 FROM tawsel.command_identities WHERE action_id=$1', [action.actionId])).rowCount).toBe(0);
});

test('A: lost logout response leaves a durable sealed selection; reopening and retrying cannot expose or erase evidence', async () => {
  const action = await capture(true); await coordinator().run(scope);
  await expect(exitAccount(store, async () => { await sessions.logout('personal'); throw new TypeError('fixture dropped logout response'); }, lock)).rejects.toThrow('dropped');
  store.close(); await store.open();
  expect((await store.selection.get('active'))?.exiting).toBe(true);
  expect(await store.downloaded('personal', f.round.owner.deviceId)).toBeNull();
  await exitAccount(store, () => sessions.logout('personal'), lock);
  expect(await store.actions.get([scope, action.actionId])).toEqual(action);
  expect(await store.selection.get('active')).toBeUndefined();
});

test('A: a committed business rejection without a saved local receipt cannot grant account exit', async () => {
  const action = await capture(true);
  const response = await sync.submit([action.envelope]); expect(response.results[0]?.status).toBe('received');
  await expect(store.exit()).rejects.toThrow('ينتظر');
  expect(await store.unreceived(scope)).toHaveLength(1);
  await coordinator().run(scope); await store.exit();
  expect(await store.actions.count()).toBe(1); expect(await store.acknowledgements.count()).toBe(1);
});

async function historicalDatabase() {
  const fixture = JSON.parse(readFileSync(new URL('../../../web/test/fixtures/p34-local-v1.json', import.meta.url), 'utf8')) as { version: number; stores: Record<string, string> };
  const old = new Dexie('p35-released-v1-' + randomUUID()); old.version(fixture.version).stores(fixture.stores);
  for (const name of Object.keys(fixture.stores)) await old.table(name).bulkPut(await store.table(name).toArray());
  old.close(); return { old, fixture };
}

test('B: released v1 pending envelope survives a transaction-aborted upgrade, reopens and replays without translation or expiry', async () => {
  const action = await capture();
  // Captured-at age is metadata, never a purge condition or ordering authority.
  await store.actions.update([scope, action.actionId], { capturedAt: '2020-01-01T00:00:00.000Z' });
  const { old, fixture } = await historicalDatabase();
  const interrupted = new LocalWork(old.name, tx => { tx.abort(); });
  await expect(interrupted.open()).rejects.toThrow(); interrupted.close();
  const readerV1 = new Dexie(old.name); readerV1.version(fixture.version).stores(fixture.stores); await readerV1.open();
  expect(readerV1.verno).toBe(1); expect(await readerV1.table('actions').get([scope, action.actionId])).toMatchObject({ bytes: action.bytes, capturedAt: '2020-01-01T00:00:00.000Z' });
  expect(await readerV1.table('health').get('local-schema')).toBeUndefined(); readerV1.close();
  const upgraded = new LocalWork(old.name);
  try {
    await upgraded.open(); expect(upgraded.verno).toBe(2);
    expect(await upgraded.pending.count()).toBe(1); expect(await upgraded.acknowledgements.count()).toBe(0);
    expect((await upgraded.downloaded('personal', f.round.owner.deviceId))?.current).toEqual(download.current);
    await expect(assertUpdateSafe(upgraded)).rejects.toThrow('مزامنة');
    const replay = new ReplayCoordinator(upgraded, { session: () => sessions.context('personal'), submit: values => sync.submit(values), result: id => devices.result(id), refresh: async () => {} }, lock);
    expect(await replay.run(scope)).toMatchObject({ received: 1, remaining: 0 });
    expect((await upgraded.actions.get([scope, action.actionId]))?.bytes).toBe(action.bytes);
    // Receipt allows exit, but a not-yet-refreshed overlay still blocks update.
    await expect(assertUpdateSafe(upgraded)).rejects.toThrow('مزامنة');
    await upgraded.exit(); expect(await upgraded.acknowledgements.count()).toBe(1);
  } finally { await upgraded.delete(); }
});

test('B: unsupported stored payload stays visible/unsent; server version reader rejects without any action identity or effect', async () => {
  const action = await capture(), unknown = { ...action.envelope, payloadVersion: '9.0.0' } as unknown as typeof action.envelope;
  await store.actions.update([scope, action.actionId], { envelope: unknown, bytes: JSON.stringify(unknown) });
  await expect(coordinator().run(scope)).rejects.toThrow('غير مدعومة');
  await expect(sync.submit([unknown])).rejects.toMatchObject({ code: 'unsupported_schema_version', status: 400 });
  expect(await store.acknowledgements.count()).toBe(0); expect(await store.unreceived(scope)).toHaveLength(1);
  expect((await store.actions.get([scope, action.actionId]))?.bytes).toBe(JSON.stringify(unknown));
  expect((await db.pool.query('SELECT 1 FROM tawsel.command_identities WHERE action_id=$1', [action.actionId])).rowCount).toBe(0);
  await expect(store.exit()).rejects.toThrow('ينتظر');
});

test('B: an update examines every retained partition and cannot ignore an unsent action with a missing overlay', async () => {
  const action = await capture(); await store.pending.delete([scope, action.actionId]);
  await expect(assertUpdateSafe(store)).rejects.toThrow('مزامنة');
  await expect(store.exit()).rejects.toThrow('ينتظر');
  await coordinator().run(scope); await expect(assertUpdateSafe(store)).resolves.toBeUndefined();
});

test('B: older application refuses a newer local schema without deleting its pending evidence', async () => {
  const action = await capture(); const { old, fixture } = await historicalDatabase();
  const future = new Dexie(old.name); future.version(3).stores({ ...fixture.stores, future: '&id' }); await future.open(); future.close();
  const reader = new LocalWork(old.name);
  await expect(reader.open()).rejects.toThrow('أحدث'); reader.close();
  await future.open(); expect(await future.table('actions').get([scope, action.actionId])).toEqual(action); expect(await future.table('pending').count()).toBe(1); await future.delete();
});
