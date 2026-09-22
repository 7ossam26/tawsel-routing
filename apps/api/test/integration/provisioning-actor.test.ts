import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createTestDatabase } from '../support/database.js';
import { migrate } from '../../src/db/migrate.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { buildApp } from '../../src/app.js';
import { bindSource, credential, operatorToken, send } from '../support/provisioning-fixture.js';
import { issuerFixture } from '../support/issuer-fixture.js';
import { keycloakAdministration } from '../../src/provisioning/issuer.js';
import { reconcileOne } from '../../src/provisioning/worker.js';
import { withAccess } from '../../src/access/service.js';
import { deferred } from '../support/barriers.js';
import { conforms } from '../../src/provisioning/schema.js';
import { browserCookie, sessionCookie } from '../../src/auth/routes.js';

describe('P08 provisioning API and real PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>, app: ReturnType<typeof buildApp>;
  let issuer: Awaited<ReturnType<typeof issuerFixture>>;
  beforeEach(async () => {
    db = await createTestDatabase(); await migrate(db.pool);
    issuer = await issuerFixture();
    app = buildApp(createDatabasePool(db.config), { origin: 'http://localhost:5173', encryptionKey: Buffer.alloc(32, 8), sessionSeconds: 28800,
      issuers: { company: { issuer: `${issuer.origin}/company`, clientId: 'tawsel-web', clientSecret: 'fixture-secret' }, personal: { issuer: `${issuer.origin}/personal`, clientId: 'tawsel-web', clientSecret: 'fixture-secret' } } },
    { issuer: `${issuer.origin}/company`, operatorToken });
    await app.ready();
  });
  afterEach(async () => { await app?.close(); await issuer?.close(); await db?.close(); });
  const admin = () => keycloakAdministration({ issuer: `${issuer.origin}/realms/company`, clientId: 'provisioning-worker', clientSecret: 'fixture-admin' });
  const runWorker = () => reconcileOne(db.pool, `${issuer.origin}/company`, admin());
  async function prepared() {
    const s = await bindSource(app, ['driver','second']);
    issuer.state.adminSubjects.set('driver', true); issuer.state.adminSubjects.set('second', true);
    for (const externalId of ['cairo','giza']) expect((await send(app, s.token, s.command('branch.provision', { externalId, sourceRevision: 1, name: externalId, enabled: true, location: null }))).statusCode).toBe(200);
    expect((await send(app, s.token, s.command('role.defineCapabilities', { externalId: 'role', sourceRevision: 1, name: 'Configurable', capabilities: ['monitor.read','execution.own'] }))).statusCode).toBe(200);
    const user = s.command('user.provision', { externalId: 'driver', sourceRevision: 1, subject: 'driver', roleExternalId: 'role', branchExternalIds: ['cairo','giza'], enabled: true });
    expect((await send(app, s.token, user)).statusCode).toBe(200);
    return { ...s, user };
  }
  const status = (s: { token: string }, entity = 'user', externalId = 'driver') => app.inject({ url: `/api/v1/provisioning/status?entity=${entity}&externalId=${externalId}`, headers: { authorization: `Bearer ${s.token}` } });
  test('A: operator bootstrap, stable retry, scoped credential configuration and secret-free audit', async () => {
    const s = await bindSource(app, [randomUUID()]);
    const replay = await send(app, operatorToken, s.bootstrapCommand);
    expect(replay.statusCode).toBe(200);
    const c = await app.inject({ url: '/api/v1/provisioning/configuration', headers: { authorization: `Bearer ${s.token}` } });
    expect(c.statusCode).toBe(200); expect(c.json().identity).toEqual({ mode: 'service-operation', tenantId: s.tenantId, integrationId: s.integrationId, actorId: null });
    expect(c.json().humanDelegation).toBe(false);
    const audit = await db.pool.query('SELECT details FROM tawsel.command_audit WHERE tenant_id=$1', [s.tenantId]);
    expect(audit.rowCount).toBe(1); expect(audit.rows[0].details.service.actorId).toBeNull();
    expect(JSON.stringify(audit.rows)).not.toMatch(/secretHash|twp_/);
    expect((await app.inject({ url: '/api/v1/provisioning/configuration' })).statusCode).toBe(401);
  });
  test('A: forged actor, wrong integration, arbitrary bootstrap and expired/revoked credentials fail', async () => {
    const a = await bindSource(app, [randomUUID()]), b = await bindSource(app, [randomUUID()]);
    const next = credential();
    const command = a.command('integration.rotateCredential', { externalId: 'erp', sourceRevision: 2, ...next.fields, overlapSeconds: 0, recover: false });
    expect((await send(app, b.token, command)).statusCode).toBe(403);
    expect((await send(app, a.token, { ...command, context: { kind: 'integration', tenantId: a.tenantId, integrationId: a.integrationId, assertedActorId: randomUUID() } })).statusCode).toBe(400);
    expect((await send(app, a.token, a.bootstrapCommand)).statusCode).toBe(403);
    expect((await send(app, a.token, command)).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/v1/provisioning/configuration', headers: { authorization: `Bearer ${a.token}` } })).statusCode).toBe(403);
    expect((await send(app, next.token, a.command('integration.disableSource', { externalId: 'erp', sourceRevision: 3 }))).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/v1/provisioning/configuration', headers: { authorization: `Bearer ${next.token}` } })).statusCode).toBe(403);
  });
  test('B: duplicate/concurrent revisions produce one projection/event; conflicts and stale enable are durable rejections', async () => {
    const s = await prepared();
    const replies = await Promise.all([send(app, s.token, s.user), send(app, s.token, s.user)]);
    expect(replies[0]!.json()).toEqual(replies[1]!.json());
    expect((await db.pool.query("SELECT count(*)::int AS n FROM tawsel.command_audit WHERE tenant_id=$1 AND details->>'entity'='user'", [s.tenantId])).rows[0].n).toBe(1);
    expect((await db.pool.query("SELECT count(*)::int AS n FROM tawsel.outbox_intents WHERE tenant_id=$1 AND payload->>'entity'='user'", [s.tenantId])).rows[0].n).toBe(1);
    const sameRevision = { ...s.user, actionId: randomUUID() };
    expect((await send(app, s.token, sameRevision)).statusCode).toBe(200);
    expect((await db.pool.query("SELECT count(*)::int AS n FROM tawsel.outbox_intents WHERE tenant_id=$1 AND payload->>'entity'='user'", [s.tenantId])).rows[0].n).toBe(1);
    expect((await send(app, s.token, { ...s.user, actionId: randomUUID(), payload: { ...s.user.payload, enabled: false } })).statusCode).toBe(409);
    expect((await send(app, s.token, { ...s.user, payload: { ...s.user.payload, enabled: false } })).statusCode).toBe(409);
    const disable = s.command('user.disable', { externalId: 'driver', sourceRevision: 2 });
    expect((await send(app, s.token, disable)).statusCode).toBe(200);
    const stale = await send(app, s.token, { ...s.user, actionId: randomUUID() });
    expect(stale.statusCode).toBe(409); expect(stale.json().receipt.problem.code).toBe('stale_revision');
    expect((await db.pool.query('SELECT enabled FROM tawsel.memberships WHERE tenant_id=$1', [s.tenantId])).rows[0].enabled).toBe(false);
    expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.command_evidence WHERE tenant_id=$1', [s.tenantId])).rows[0].n).toBe(2);
  });
  test('B: issuer outage leaves committed pending intent, retry is visible, recovery verifies subject before login access', async () => {
    const s = await prepared(); issuer.state.adminUnavailable = true;
    const initial = await status(s); expect(initial.json().issuerStatus).toBe('pending'); expect(conforms('ProvisioningStatus', initial.json())).toBe(true);
    const principal = { kind: 'account' as const, issuer: `${issuer.origin}/company`, subject: 'driver' };
    await expect(withAccess(db.pool, principal, async a => a.context)).rejects.toMatchObject({ statusCode: 403 });
    expect(await runWorker()).toBe(true);
    expect((await status(s)).json()).toMatchObject({ issuerStatus: 'retry', attempts: 1, lastError: 'issuer_unavailable' });
    // Restart-equivalent: fresh worker instance reads durable due work after expiry.
    issuer.state.adminUnavailable = false;
    await db.pool.query("UPDATE tawsel.issuer_reconciliation SET next_attempt_at=now(),status='running',lease_until=now()-interval '1 second',lease_id=$1", [randomUUID()]);
    expect(await runWorker()).toBe(true);
    expect((await status(s)).json().issuerStatus).toBe('ready');
    expect(await withAccess(db.pool, principal, async a => a.context.effectiveCapabilities)).toContain('execution.own');
  });
  test('B: newer disable fences in-flight issuer verification; later retry revokes issuer sessions', async () => {
    const s = await prepared(), entered = deferred(), release = deferred();
    issuer.state.beforeAdminRead = async () => { entered.resolve(); await release.promise; };
    const worker = runWorker(); await entered.promise;
    try {
      expect((await send(app, s.token, s.command('user.disable', { externalId: 'driver', sourceRevision: 2 }))).statusCode).toBe(200);
      // Independent committed read while the issuer call is held: no business transaction waits on HTTP.
      expect((await db.pool.query('SELECT enabled FROM tawsel.memberships WHERE tenant_id=$1', [s.tenantId])).rows[0].enabled).toBe(false);
    } finally { release.resolve(); }
    await worker;
    expect((await status(s)).json().issuerStatus).toBe('pending');
    expect((await db.pool.query('SELECT enabled FROM tawsel.identity_subjects WHERE tenant_id=$1', [s.tenantId])).rows[0].enabled).toBe(false);
    await runWorker(); expect(issuer.state.adminRevocations).toEqual(['driver']);
    expect((await status(s)).json().issuerStatus).toBe('ready');
  });
  test('B: missing/cross-source/unauthorized subject references roll back domain writes and preserve audit', async () => {
    const s = await prepared();
    const bad = s.command('user.provision', { ...s.user.payload, externalId: 'intruder', subject: 'privileged-unreserved' });
    const response = await send(app, s.token, bad);
    expect(response.statusCode).toBe(403);
    expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.accounts WHERE tenant_id=$1', [s.tenantId])).rows[0].n).toBe(1);
    expect((await send(app, s.token, s.command('user.setRole', { externalId: 'driver', sourceRevision: 2, roleExternalId: 'missing' }))).statusCode).toBe(409);
    const unknown = await status(s, 'branch', 'hidden'); expect(unknown.statusCode).toBe(404); expect(unknown.body).not.toContain(s.tenantId);
    expect((await send(app, s.token, s.command('driver.provisionReference', { externalId: 'driver-ref', sourceRevision: 1, userExternalId: 'driver', enabled: true, profile: 'motorcycle', vehicleReference: 'vehicle-01' }))).statusCode).toBe(200);
    expect((await send(app, s.token, s.command('driver.provisionReference', { externalId: 'second-ref', sourceRevision: 1, userExternalId: 'driver', enabled: true, profile: 'car', vehicleReference: null }))).statusCode).toBe(409);
  });
  test('B: provision → signed fixture login → authorized context → role/exception changes → effective membership denial', async () => {
    const s = await prepared(); await runWorker();
    const browser = 'b'.repeat(64);
    const start = await app.inject({ method: 'POST', url: '/api/session/login', headers: { origin: 'http://localhost:5173', 'x-csrf-token': browser }, cookies: { [browserCookie]: browser }, payload: { kind: 'company', companyCode: s.code } });
    expect(start.statusCode).toBe(200);
    const redirect = await fetch(start.json().authorizationUrl, { redirect: 'manual' });
    const callback = new URL(redirect.headers.get('location')!);
    const finish = await app.inject({ url: callback.pathname + callback.search, cookies: { [browserCookie]: browser } });
    const cookie = finish.cookies.find(c => c.name === sessionCookie('company'));
    expect(cookie).toBeDefined();
    const context = () => app.inject({ url: '/api/session/context?kind=company', cookies: { [sessionCookie('company')]: cookie!.value } });
    expect((await context()).json().access).toMatchObject({ effectiveCapabilities: ['execution.own','monitor.read'] });
    expect((await send(app, s.token, s.command('user.setCapabilityExceptions', { externalId: 'driver', sourceRevision: 2,
      exceptions: [{ capability: 'reports.read', effect: 'allow' }, { capability: 'monitor.read', effect: 'deny' }, { capability: 'execution.own', effect: 'inherit' }] }))).statusCode).toBe(200);
    expect((await send(app, s.token, s.command('role.defineCapabilities', { externalId: 'role', sourceRevision: 2, name: 'No implicit label authority', capabilities: ['monitor.read'] }))).statusCode).toBe(200);
    expect((await context()).json().access.effectiveCapabilities).toEqual(['reports.read']);
    expect((await context()).json().access.branchIds).toHaveLength(2);
    expect((await send(app, s.token, s.command('user.disable', { externalId: 'driver', sourceRevision: 3 }))).statusCode).toBe(200);
    expect((await context()).statusCode).toBe(403);
  });
  test('C: branch/role reassignment, explicit clear, and newer re-enable keep identity stable and require issuer verification', async () => {
    const s = await prepared(); await runWorker();
    const originalId = (await status(s)).json().resourceId;
    const principal = { kind: 'account' as const, issuer: `${issuer.origin}/company`, subject: 'driver' };
    const view = () => withAccess(db.pool, principal, async a => a.context);
    expect((await send(app, s.token, s.command('role.defineCapabilities', { externalId: 'other-role', sourceRevision: 1, name: 'Second role', capabilities: ['reports.export'] }))).statusCode).toBe(200);
    expect((await send(app, s.token, s.command('user.setRole', { externalId: 'driver', sourceRevision: 2, roleExternalId: 'other-role' }))).statusCode).toBe(200);
    expect((await view()).effectiveCapabilities).toEqual(['reports.export']);
    expect((await send(app, s.token, s.command('branch.disable', { externalId: 'cairo', sourceRevision: 2 }))).statusCode).toBe(200);
    expect((await view()).branchIds).toHaveLength(1);
    expect((await send(app, s.token, s.command('user.setBranchMemberships', { externalId: 'driver', sourceRevision: 3, branchExternalIds: [] }))).statusCode).toBe(200);
    expect((await view()).branchIds).toEqual([]);
    expect((await send(app, s.token, s.command('user.setCapabilityExceptions', { externalId: 'driver', sourceRevision: 4, exceptions: [] }))).statusCode).toBe(200);
    expect((await send(app, s.token, s.command('user.disable', { externalId: 'driver', sourceRevision: 5 }))).statusCode).toBe(200);
    expect((await send(app, s.token, s.command('user.provision', { ...s.user.payload, sourceRevision: 6 }))).statusCode).toBe(200);
    await expect(view()).rejects.toMatchObject({ statusCode: 403 });
    await runWorker(); expect((await view()).sourceId).toBe(originalId);
    expect((await status(s)).json()).toMatchObject({ resourceId: originalId, sourceRevision: 6, issuerStatus: 'ready' });
    const events = await db.pool.query('SELECT payload FROM tawsel.outbox_intents WHERE tenant_id=$1', [s.tenantId]);
    expect(events.rows.every(row => conforms('ProvisioningChanged', row.payload))).toBe(true);
  });
  test('C: operator recovery rotates a disabled source; subject reservation extension cannot acquire another source', async () => {
    const s = await bindSource(app, ['driver']);
    expect((await send(app, s.token, s.command('integration.disableSource', { externalId: 'erp', sourceRevision: 2 }))).statusCode).toBe(200);
    const next = credential();
    const recovery = s.command('integration.rotateCredential', { externalId: 'erp', sourceRevision: 3, ...next.fields, overlapSeconds: 0, recover: true });
    expect((await send(app, operatorToken, recovery)).statusCode).toBe(200);
    expect((await send(app, next.token, recovery)).statusCode).toBe(200); // stable identity, fresh credential
    const extension = s.command('integration.bindSource', { ...s.bootstrapCommand.payload, sourceRevision: 4, subjectIds: ['driver','second'] });
    expect((await send(app, operatorToken, extension)).statusCode).toBe(200);
    const other = await bindSource(app, ['reserved-elsewhere']);
    expect((await send(app, operatorToken, s.command('integration.bindSource', { ...extension.payload, sourceRevision: 5, subjectIds: ['reserved-elsewhere'] }))).statusCode).toBe(403);
    expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.provisioning_subject_grants WHERE integration_id=$1', [other.integrationId])).rows[0].n).toBe(1);
  });
  test('C: process death after issuer success retains a lease and recovers from another process connection', async () => {
    const s = await prepared();
    const child = fork(fileURLToPath(new URL('../support/crash-provisioning-worker.ts', import.meta.url)), [], {
      execArgv: ['--import','tsx'], env: { ...process.env, TAWSEL_CRASH_TEST_URL: db.url }, stdio: ['ignore','ignore','ignore','ipc'], windowsHide: true
    });
    const exited = once(child, 'exit'), message = once(child, 'message');
    try {
      child.send({ issuer: `${issuer.origin}/company`, adminIssuer: `${issuer.origin}/realms/company` });
      const barrier = await Promise.race([message.then(([value]) => value), exited.then(() => { throw new Error('Worker exited before barrier'); })]);
      expect(barrier).toEqual({ barrier: 'issuer-succeeded-before-completion' });
      const during = (await status(s)).json(); expect(during).toMatchObject({ issuerStatus: 'running', attempts: 1 });
      child.kill('SIGKILL'); await exited;
      expect(await runWorker()).toBe(false); // unexpired lease cannot be stolen
      await db.pool.query("UPDATE tawsel.issuer_reconciliation SET lease_until=now()-interval '1 second'");
      const restarted = createDatabasePool(db.config);
      try { expect(await reconcileOne(restarted, `${issuer.origin}/company`, admin())).toBe(true); }
      finally { await restarted.end(); }
      expect((await status(s)).json()).toMatchObject({ issuerStatus: 'ready', attempts: 2 });
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await exited;
    }
  });
  test('C: database rejects a worker subject grant from a different integration', async () => {
    const s = await prepared(), other = await bindSource(app, ['other-subject'], s.tenantId);
    await expect(db.pool.query('UPDATE tawsel.issuer_reconciliation SET integration_id=$2 WHERE tenant_id=$1', [s.tenantId, other.integrationId])).rejects.toMatchObject({ code: '23503' });
  });
});
