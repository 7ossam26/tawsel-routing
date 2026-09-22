import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { ActionEnvelope } from '../../src/commands/kernel.js';
import { b2cIntakeRoutes, type PersonalSessionAuthenticator } from '../../src/b2c-intake/routes.js';
import type { AuthConfig } from '../../src/auth/config.js';
import { createTestDatabase } from '../support/database.js';
import { ids, prepareAccessFixture, principals } from '../support/access-fixture.js';

const origin = 'http://localhost:5173';
const config: AuthConfig = {
  origin, encryptionKey: Buffer.alloc(32, 1), sessionSeconds: 3600,
  issuers: {
    company: { issuer: 'https://company.fixture.invalid', clientId: 'company', clientSecret: 'secret' },
    personal: { issuer: 'https://personal.fixture.invalid', clientId: 'personal', clientSecret: 'secret' }
  }
};
const headers = (subject = 'personal') => ({ origin, 'x-csrf-token': 'fixture-csrf', cookie: '__Host-tawsel-browser=fixture-csrf', 'x-fixture-subject': subject });

function command(payload: Record<string, unknown>, operationId = 'task.createIndependent', task?: { id: string; revision: number }): ActionEnvelope {
  return {
    schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId,
    context: { kind: 'device', tenantId: ids.personalTenant, accountId: ids.personalAccount, deviceId: randomUUID(), deviceGeneration: 1, deviceSequence: 1 },
    resources: task ? { taskId: task.id } : {}, baseVersions: task ? { resourceRevision: task.revision } : {}, dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } }, payload
  };
}
const valid = (name = 'منى أحمد') => ({ recipientName: name, recipientPhone: '01012345678', destination: { kind: 'address', addressText: '١٢ شارع التحرير، الدقي' } });

describe('P09 independent intake — real handlers and isolated PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof Fastify>;
  let otherPersonal: typeof principals.personal;
  beforeEach(async () => {
    db = await createTestDatabase();
    await prepareAccessFixture(db.pool);
    const tenant = randomUUID(), account = randomUUID(), driver = randomUUID();
    otherPersonal = { kind: 'account', issuer: principals.personal.issuer, subject: 'personal-other' };
    await db.pool.query('INSERT INTO tawsel.tenant_keys VALUES ($1)', [tenant]);
    await db.pool.query("INSERT INTO tawsel.tenants (tenant_id,kind) VALUES ($1,'personal')", [tenant]);
    await db.pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'account')", [tenant, account]);
    await db.pool.query("INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'personal')", [tenant, account]);
    await db.pool.query("INSERT INTO tawsel.memberships (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'personal')", [tenant, account]);
    await db.pool.query('INSERT INTO tawsel.identity_subjects (issuer,subject,tenant_id,account_id) VALUES ($1,$2,$3,$4)', [otherPersonal.issuer, otherPersonal.subject, tenant, account]);
    await db.pool.query('INSERT INTO tawsel.drivers (tenant_id,driver_id,account_id) VALUES ($1,$2,$3)', [tenant, driver, account]);
    const authenticate: PersonalSessionAuthenticator = (request, work) => {
      const subject = request.headers['x-fixture-subject'];
      const principal = subject === 'personal-other' ? otherPersonal : subject === 'company-driver' ? principals.driver : principals.personal;
      return work(principal);
    };
    app = Fastify({ logger: false });
    await app.register(async (scope: FastifyInstance) => { await b2cIntakeRoutes(scope, db.pool, config, authenticate); });
    await app.ready();
  });
  afterEach(async () => { await app?.close(); await db?.close(); });

  test('rejects missing/invalid phones, invalid money and company account intake without a task write', async () => {
    const malformed = await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers(), payload: {} });
    expect(malformed.statusCode).toBe(400);
    for (const payload of [
      { ...valid(), recipientPhone: '' },
      { ...valid(), recipientPhone: '123' },
      { ...valid(), collectionAmount: { amountMinor: 10.5, currency: 'EGP', exponent: 2 } },
      { ...valid(), collectionAmount: { amountMinor: 100, currency: 'USD', exponent: 2 } },
      { ...valid(), itemPrices: [{ amountMinor: 100 }] }
    ]) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers(), payload: command(payload) });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatchObject({ code: 'validation_failed' });
    }
    const company = command(valid());
    company.context = { kind: 'device', tenantId: ids.tenant, accountId: ids.driverAccount, deviceId: randomUUID(), deviceGeneration: 1, deviceSequence: 1 };
    const denied = await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers('company-driver'), payload: company });
    expect(denied.statusCode).toBe(403);
    expect(Number((await db.pool.query('SELECT count(*) FROM tawsel.b2c_tasks')).rows[0].count)).toBe(0);
  });

  test('stores an address-only task as visible but not execution-ready and recovers a lost response by action ID', async () => {
    const create = command(valid());
    const first = await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers(), payload: create });
    const replay = await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers(), payload: create });
    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(201);
    expect(replay.json()).toEqual(first.json());
    const task = first.json().response.body.task;
    expect(task).toMatchObject({ locationReadiness: 'needs-resolution', executionReady: false, revision: 1 });
    expect(task).not.toHaveProperty('collectionAmount');
    expect(Number((await db.pool.query('SELECT count(*) FROM tawsel.b2c_tasks')).rows[0].count)).toBe(1);
    expect(Number((await db.pool.query("SELECT count(*) FROM tawsel.task_intake_events WHERE event_type='task.independentCreated'")).rows[0].count)).toBe(1);
  });

  test('keeps same-address tasks independent, revises only one, and locks stale/departed edits', async () => {
    const first = (await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers(), payload: command(valid('منى الأولى')) })).json().response.body.task;
    const second = (await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers(), payload: command(valid('منى الثانية')) })).json().response.body.task;
    expect(first.taskId).not.toBe(second.taskId);
    const revision = command({ ...valid('منى بعد التصحيح'), taskId: first.taskId, expectedRevision: 1 }, 'task.reviseIndependent', { id: first.taskId, revision: 1 });
    const changed = await app.inject({ method: 'PUT', url: `/api/v1/independent/tasks/${first.taskId}`, headers: headers(), payload: revision });
    expect(changed.statusCode).toBe(200);
    expect(changed.json().response.body.task).toMatchObject({ recipientName: 'منى بعد التصحيح', revision: 2 });
    const unchanged = await app.inject({ method: 'GET', url: `/api/v1/independent/tasks/${second.taskId}`, headers: { 'x-fixture-subject': 'personal' } });
    expect(unchanged.json()).toMatchObject({ recipientName: 'منى الثانية', revision: 1 });
    const stale = command({ ...valid('كتابة قديمة'), taskId: first.taskId, expectedRevision: 1 }, 'task.reviseIndependent', { id: first.taskId, revision: 1 });
    expect((await app.inject({ method: 'PUT', url: `/api/v1/independent/tasks/${first.taskId}`, headers: headers(), payload: stale })).json().receipt.problem.code).toBe('stale_revision');
    await db.pool.query('UPDATE tawsel.b2c_tasks SET departure_at=clock_timestamp() WHERE task_id=$1', [first.taskId]);
    const departed = command({ ...valid('بعد المغادرة'), taskId: first.taskId, expectedRevision: 2 }, 'task.reviseIndependent', { id: first.taskId, revision: 2 });
    expect((await app.inject({ method: 'PUT', url: `/api/v1/independent/tasks/${first.taskId}`, headers: headers(), payload: departed })).json().receipt.problem.code).toBe('departed_edit_forbidden');
  });

  test('hides guessed IDs from another personal account for reads and mutations', async () => {
    const created = (await app.inject({ method: 'POST', url: '/api/v1/independent/tasks', headers: headers(), payload: command(valid()) })).json().response.body.task;
    const hidden = await app.inject({ method: 'GET', url: `/api/v1/independent/tasks/${created.taskId}`, headers: { 'x-fixture-subject': 'personal-other' } });
    expect(hidden.statusCode).toBe(404);
    const revise = command({ ...valid('اختراق'), taskId: created.taskId, expectedRevision: 1 }, 'task.reviseIndependent', { id: created.taskId, revision: 1 });
    const denied = await app.inject({ method: 'PUT', url: `/api/v1/independent/tasks/${created.taskId}`, headers: headers('personal-other'), payload: revise });
    expect(denied.statusCode).toBe(403); // body tenant/account assertions cannot switch the authenticated personal account
    const owner = await app.inject({ method: 'GET', url: `/api/v1/independent/tasks/${created.taskId}`, headers: { 'x-fixture-subject': 'personal' } });
    expect(owner.json().recipientName).toBe('منى أحمد');
  });
});
