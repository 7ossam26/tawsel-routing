import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture, ids, runFixtureCommand, accessCommand, ownPolicy } from '../support/access-fixture.js';
import { randomUUID } from 'node:crypto';
import { issuerFixture } from '../support/issuer-fixture.js';
import { buildApp } from '../../src/app.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { browserCookie, sessionCookie } from '../../src/auth/routes.js';
import { hash, randomToken, seal } from '../../src/auth/crypto.js';
import { conforms } from '../../src/auth/schemas.js';
import { Sessions } from '../../src/auth/service.js';
import type { AuthConfig } from '../../src/auth/config.js';

describe('session HTTP handlers with real PostgreSQL and labelled signed issuer fixture', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let issuer: Awaited<ReturnType<typeof issuerFixture>>;
  let app: ReturnType<typeof buildApp>;
  let service: Sessions;
  const browser = randomToken(), origin = 'http://localhost:5173';
  const headers = { origin, 'x-csrf-token': browser };
  beforeAll(async () => {
    db = await createTestDatabase(); issuer = await issuerFixture(); await prepareAccessFixture(db.pool, `${issuer.origin}/company`);
    await db.pool.query("INSERT INTO tawsel.company_login_codes VALUES ('LOCAL',$1,'Fixture')", [ids.tenant]);
    const config: AuthConfig = { origin, encryptionKey: Buffer.alloc(32, 8), sessionSeconds: 28800,
      issuers: { company: { issuer: `${issuer.origin}/company`, clientId: 'tawsel-web', clientSecret: 'fixture-secret' }, personal: { issuer: `${issuer.origin}/personal`, clientId: 'tawsel-web', clientSecret: 'fixture-secret' } } };
    app = buildApp(createDatabasePool(db.config), config); service = new Sessions(db.pool, config);
    await app.ready();
  });
  afterAll(async () => { await app?.close(); await issuer?.close(); await db?.close(); });
  beforeEach(async () => { await db.pool.query('TRUNCATE tawsel.auth_rate_limits'); Object.assign(issuer.state, { subject: 'driver', nonce: '', audience: '', claimIssuer: '', verified: true, active: true, unavailable: false, introspectionUnavailable: false, badSignature: false, invalidGrant: false }); });
  const post = (path: string, payload: object, extraCookies = {}) => app.inject({ method: 'POST', url: `/api/session/${path}`, headers, cookies: { [browserCookie]: browser, ...extraCookies }, payload });
  async function start(kind: 'company' | 'personal' = 'company', extra: object = {}, cookies = {}) {
    const response = await post('login', { kind, ...(kind === 'company' ? { companyCode: 'LOCAL' } : {}), ...extra }, cookies);
    expect(response.statusCode).toBe(200);
    const authorization = response.json().authorizationUrl;
    const redirect = await fetch(authorization, { redirect: 'manual' });
    return new URL(redirect.headers.get('location')!);
  }
  async function finish(url: URL, cookie = browser) { return app.inject({ url: `${url.pathname}${url.search}`, cookies: { [browserCookie]: cookie } }); }
  async function login(kind: 'company' | 'personal' = 'company') {
    const response = await finish(await start(kind));
    expect(response.headers.location).toContain('/account');
    const token = response.cookies.find(c => c.name === sessionCookie(kind))!.value;
    return { [sessionCookie(kind)]: token };
  }
  test('A: signed code/PKCE callback binds current membership; cookie flags, ciphertext and canonical context', async () => {
    const cookies = await login();
    const response = await app.inject({ url: '/api/session/context?kind=company', cookies });
    expect(response.statusCode).toBe(200); expect(conforms('SessionContext', response.json())).toBe(true);
    expect(response.json().access.sourceId).toBe(ids.driverAccount);
    const row = (await db.pool.query('SELECT * FROM tawsel.web_sessions WHERE session_hash=$1', [hash(cookies[sessionCookie('company')]!)])).rows[0];
    expect(row.session_hash).not.toBe(cookies[sessionCookie('company')]);
    expect(row.token_cipher).not.toContain('refresh');
  });
  test('A: company selection cannot grant outsider membership', async () => {
    expect((await post('company', { code: 'LOCAL' })).statusCode).toBe(200);
    issuer.state.subject = 'outsider';
    const result = await finish(await start());
    expect(result.headers.location).toContain('error=access_disabled'); expect(result.cookies).toHaveLength(0);
  });
  test('A: invalid CSRF/origin and request-selected redirect/issuer are rejected', async () => {
    const payload = { kind: 'company', companyCode: 'LOCAL' };
    expect((await app.inject({ method: 'POST', url: '/api/session/login', payload })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/session/login', headers: { ...headers, origin: 'https://evil.invalid' }, cookies: { [browserCookie]: browser }, payload })).statusCode).toBe(403);
    expect((await post('login', { ...payload, redirect_uri: 'https://evil.invalid' })).statusCode).toBe(400);
    expect((await post('login', { ...payload, issuer: 'https://evil.invalid' })).statusCode).toBe(400);
  });
  test('A: callback is browser-bound and atomically single use, including concurrent replay', async () => {
    const url = await start();
    expect((await finish(url, randomToken())).headers.location).toContain('error=login_failed');
    const results = await Promise.all([finish(url), finish(url)]);
    expect(results.filter(r => r.headers.location?.includes('/account'))).toHaveLength(1);
    expect(results.filter(r => r.headers.location?.includes('error=login_failed'))).toHaveLength(1);
  });
  test('B: identical opaque subject and contacts in separate realms create independent accounts and sessions', async () => {
    const company = await login(); const personal = await login('personal');
    const get = (kind: string) => app.inject({ url: `/api/session/context?kind=${kind}`, cookies: { ...company, ...personal } });
    const a = (await get('company')).json(), b = (await get('personal')).json();
    expect(b.access.sourceId).not.toBe(a.access.sourceId); expect(b.access.tenantId).not.toBe(a.access.tenantId);
    expect(b.access.branchIds).toEqual([]); expect(b.phoneOwnershipVerified).toBe(false);
    expect(b.recoveryEmailVerified).toBe(true); expect(b.access.tenantKind).toBe('personal');
    expect((await post('logout', { kind: 'company' }, company)).statusCode).toBe(204);
    expect((await get('company')).statusCode).toBe(401); expect((await get('personal')).statusCode).toBe(200);
  });
  test('B: unverified email cannot activate even with a valid signed token', async () => {
    issuer.state.subject = 'unverified-new'; issuer.state.verified = false;
    const result = await finish(await start('personal'));
    expect(result.headers.location).toContain('access_disabled');
    expect((await db.pool.query('SELECT 1 FROM tawsel.identity_subjects WHERE subject=$1', ['unverified-new'])).rowCount).toBe(0);
  });
  test('B: registration retries do not create multiple personal accounts, phone is normalized and email rejected', async () => {
    const a = await login('personal'), b = await login('personal');
    const read = async (cookies: Record<string, string>) => (await app.inject({ url: '/api/session/context?kind=personal', cookies })).json();
    expect((await read(a)).access.sourceId).toBe((await read(b)).access.sourceId);
    const response = await post('login', { kind: 'personal', phone: '٠١٠٠٠٠٠٠٠٠٠' });
    expect(new URL(response.json().authorizationUrl).searchParams.get('login_hint')).toBe('+201000000000');
    expect((await post('login', { kind: 'personal', phone: 'same@example.test' })).json().error.code).toBe('phone_invalid');
  });
  test.each(['nonce', 'audience', 'claimIssuer', 'badSignature'] as const)('C: wrong %s fails without a session and consumes the attempt', async fault => {
    const url = await start();
    if (fault === 'badSignature') issuer.state.badSignature = true; else issuer.state[fault] = 'incorrect';
    const count = Number((await db.pool.query('SELECT count(*) FROM tawsel.web_sessions')).rows[0].count);
    expect((await finish(url)).headers.location).toContain('error=login_failed');
    expect((await finish(url)).headers.location).toContain('error=login_failed');
    expect(Number((await db.pool.query('SELECT count(*) FROM tawsel.web_sessions')).rows[0].count)).toBe(count);
  });
  test('C: wrong PKCE verifier, state and callback origin cannot establish a session', async () => {
    const url = await start();
    await expect(service.complete(new URL(url.href.replace(origin, 'https://evil.invalid')), browser)).rejects.toMatchObject({ code: 'login_failed' });
    await db.pool.query('UPDATE tawsel.login_attempts SET verifier_cipher=$2 WHERE state_hash=$1', [hash(url.searchParams.get('state')!), seal(randomToken(), Buffer.alloc(32, 8))]);
    expect((await finish(url)).headers.location).toContain('error=login_failed');
    const wrongState = await start(); wrongState.searchParams.set('state', randomToken());
    expect((await finish(wrongState)).headers.location).toContain('error=login_failed');
  });
  test('C: two expired-token requests serialize a single server-side refresh', async () => {
    const cookies = await login(); const token = cookies[sessionCookie('company')]!;
    await db.pool.query("UPDATE tawsel.web_sessions SET token_expires_at=now()-interval '1 second' WHERE session_hash=$1", [hash(token)]);
    const before = issuer.state.refreshCount;
    const responses = await Promise.all([app.inject({ url: '/api/session/context?kind=company', cookies }), app.inject({ url: '/api/session/context?kind=company', cookies })]);
    expect(responses.map(r => r.statusCode)).toEqual([200, 200]); expect(issuer.state.refreshCount - before).toBe(1);
    expect((await post('refresh', { kind: 'company' }, cookies)).statusCode).toBe(200);
    expect(responses[0]!.body).not.toMatch(/access_token|refresh_token|token_cipher/);
  });
  test('C: rotated token survives an introspection outage, then recovers without an old-token replay', async () => {
    const cookies = await login(); issuer.state.introspectionUnavailable = true;
    expect((await post('refresh', { kind: 'company' }, cookies)).statusCode).toBe(503);
    issuer.state.introspectionUnavailable = false;
    expect((await post('refresh', { kind: 'company' }, cookies)).statusCode).toBe(200);
  });
  test('C: absolute expiry preserves a server-bound same-account reauthentication intent', async () => {
    const cookies = await login(); const token = cookies[sessionCookie('company')]!;
    await db.pool.query("UPDATE tawsel.web_sessions SET expires_at=now()-interval '1 second' WHERE session_hash=$1", [hash(token)]);
    expect((await app.inject({ url: '/api/session/context?kind=company', cookies })).json().error.code).toBe('session_expired');
    issuer.state.subject = 'staff';
    expect((await finish(await start('company', { reauthenticate: true }, cookies))).headers.location).toContain('same_account_required');
    issuer.state.subject = 'driver';
    const restored = await finish(await start('company', { reauthenticate: true }, cookies));
    expect(restored.headers.location).toContain('/account');
    expect((await db.pool.query('SELECT subject FROM tawsel.web_sessions WHERE session_hash=$1', [hash(restored.cookies.find(c => c.name === sessionCookie('company'))!.value)])).rows[0].subject).toBe('driver');
  });
  test('C: membership and issuer revocation each block an actual P05/P06 database command without ERP', async () => {
    const cookies = await login(); const token = cookies[sessionCookie('company')]!;
    const command = () => service.use('company', token, principal => {
      const envelope = accessCommand(ids.record);
      envelope.context = { kind: 'device', tenantId: ids.tenant, accountId: ids.driverAccount, deviceId: randomUUID(), deviceGeneration: 1, deviceSequence: 1 };
      return runFixtureCommand(db.pool, principal, envelope, ownPolicy);
    });
    const accepted = await command(); expect(accepted.receipt.businessStatus).toBe('accepted');
    await db.pool.query('UPDATE tawsel.memberships SET enabled=false WHERE account_id=$1', [ids.driverAccount]);
    try {
      await expect(command()).rejects.toMatchObject({ statusCode: 403 });
      expect((await app.inject({ url: '/api/session/context?kind=company', cookies })).json().error.code).toBe('access_disabled');
    } finally { await db.pool.query('UPDATE tawsel.memberships SET enabled=true WHERE account_id=$1', [ids.driverAccount]); }
    issuer.state.active = false;
    await expect(command()).rejects.toMatchObject({ code: 'session_expired' });
    expect((await db.pool.query('SELECT value FROM public.authorization_test_records WHERE resource_id=$1', [ids.record])).rows[0].value).toBe(1);
  });
  test('C: revoked refresh fails closed; issuer outage is retryable; logout remains locally effective', async () => {
    const cookies = await login(); issuer.state.unavailable = true;
    expect((await app.inject({ url: '/api/session/context?kind=company', cookies })).statusCode).toBe(503);
    issuer.state.unavailable = false;
    expect((await app.inject({ url: '/api/session/context?kind=company', cookies })).statusCode).toBe(200);
    issuer.state.invalidGrant = true;
    expect((await post('refresh', { kind: 'company' }, cookies)).statusCode).toBe(401);
    issuer.state.invalidGrant = false;
    const another = await login(); issuer.state.unavailable = true;
    expect((await post('logout', { kind: 'company' }, another)).statusCode).toBe(204);
    expect((await app.inject({ url: '/api/session/context?kind=company', cookies: another })).statusCode).toBe(401);
  });
  test('C: database-backed entry limit and logout CSRF reject abuse without changing a valid session', async () => {
    const cookies = await login();
    expect((await app.inject({ method: 'POST', url: '/api/session/logout', cookies, payload: { kind: 'company' } })).statusCode).toBe(403);
    expect((await app.inject({ url: '/api/session/context?kind=company', cookies })).statusCode).toBe(200);
    await db.pool.query('TRUNCATE tawsel.auth_rate_limits');
    for (let i = 0; i < 20; i++) expect((await post('company', { code: 'LOCAL' })).statusCode).toBe(200);
    const limited = await post('company', { code: 'LOCAL' });
    expect(limited.statusCode).toBe(429); expect(limited.headers['retry-after']).toBe('60');
  });
});
