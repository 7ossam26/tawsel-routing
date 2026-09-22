import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { accessCommand, assignmentPolicy, exportPolicy, fixtureOperation, ids, monitorPolicy, ownPolicy, prepareAccessFixture, principals, readFixture, runFixtureCommand, type FixtureRecord } from '../support/access-fixture.js';
import { withAccess, type AuthenticatedPrincipal, type ScopeAssertion } from '../../src/access/service.js';
import { executeAuthorizedCommand } from '../../src/access/command.js';
import { deferred, observeDatabaseBlock } from '../support/barriers.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { buildApp } from '../../src/app.js';
import { bindSource, operatorToken, send } from '../support/provisioning-fixture.js';

describe('P06 authorization isolation — real PostgreSQL, labelled principals and synthetic resources', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeEach(async () => { db = await createTestDatabase(); await prepareAccessFixture(db.pool); });
  afterEach(async () => { await db?.close(); });
  const recordIds = async (principal: AuthenticatedPrincipal) => (await readFixture(db.pool, principal)).map(r => r.resource_id);
  test('P08: public credentials isolate identical external references across companies and integrations', async () => {
    const app = buildApp(createDatabasePool(db.config), undefined, { issuer: 'https://issuer.example.test/company', operatorToken });
    try {
      const a = await bindSource(app, []), b = await bindSource(app, []), otherSource = await bindSource(app, [], a.tenantId);
      const commands = [a,b,otherSource].map(s => s.command('branch.provision', { externalId: 'same', sourceRevision: 1, name: 'Private branch', enabled: true, location: null }));
      const responses = await Promise.all([a,b,otherSource].map((s,i) => send(app, s.token, commands[i]!)));
      expect(responses.map(r => r.statusCode)).toEqual([200,200,200]);
      expect(new Set(responses.map(r => r.json().summary.resourceId)).size).toBe(3);
      expect((await send(app, otherSource.token, a.command('branch.disable', { externalId: 'same', sourceRevision: 2 }))).statusCode).toBe(403);
      const hidden = await app.inject({ url: `/api/v1/provisioning/status?entity=branch&externalId=same&tenantId=${a.tenantId}`, headers: { authorization: `Bearer ${b.token}` } });
      expect(hidden.statusCode).toBe(400); expect(hidden.body).not.toContain(a.tenantId);
      await db.pool.query("DELETE FROM tawsel.integration_capabilities WHERE integration_id=$1 AND capability='identity.provision'", [a.integrationId]);
      expect((await send(app, a.token, commands[0]!)).statusCode).toBe(403);
      expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.branches WHERE tenant_id=$1', [a.tenantId])).rows[0].n).toBe(2);
    } finally { await app.close(); }
  });
  function accountCommand(resourceId = ids.record) {
    const command = accessCommand(resourceId);
    command.context = { kind: 'device', tenantId: ids.tenant, accountId: ids.staff, deviceId: randomUUID(), deviceGeneration: 1, deviceSequence: 1 };
    return command;
  }
  const storedCount = async () => Number((await db.pool.query('SELECT count(*) FROM tawsel.command_identities')).rows[0].count);

  test('filters staff reads by tenant and assigned branch before pagination/counts', async () => {
    expect(await recordIds(principals.staff)).toEqual([ids.record, ids.secondRecord, ids.secondBranchRecord, ids.otherDriverRecord]);
    await withAccess(db.pool, principals.staff, async (access, tx) => {
      const filter = access.sqlPredicate(monitorPolicy, 'r');
      const aggregate = await tx.query(`SELECT count(*)::int AS total FROM public.authorization_test_records r WHERE ${filter.text}`, filter.values);
      expect(aggregate.rows[0].total).toBe(4);
    });
  });

  test('own-driver and branch are independent, even if the own capability policy requests broader ownership', async () => {
    const rows = await readFixture(db.pool, principals.driver, ownPolicy);
    expect(rows.map(r => r.resource_id)).toEqual([ids.record, ids.secondRecord, ids.secondBranchRecord]);
    const command = accountCommand(ids.otherDriverRecord);
    if (command.context.kind !== 'device') throw new Error('Expected device fixture');
    command.context = { ...command.context, accountId: ids.driverAccount };
    await expect(runFixtureCommand(db.pool, principals.driver, command, ownPolicy)).rejects.toMatchObject({ statusCode: 404 });
    await db.pool.query('UPDATE tawsel.drivers SET enabled=false WHERE driver_id=$1', [ids.driver]);
    expect(await readFixture(db.pool, principals.driver, ownPolicy)).toEqual([]);
  });

  test('personal tenant reads and exports remain own-only and isolated from company identity', async () => {
    expect(await recordIds(principals.personal)).toEqual([ids.personalRecord]);
    expect((await readFixture(db.pool, principals.personal, exportPolicy)).map(r => r.resource_id)).toEqual([ids.personalRecord]);
    await expect(readFixture(db.pool, principals.personal, exportPolicy, { tenantId: ids.tenant })).rejects.toMatchObject({ statusCode: 403 });
    await expect(runFixtureCommand(db.pool, principals.personal, accessCommand())).rejects.toMatchObject({ statusCode: 403 });
  });

  test('mixed-source shared-driver trip filters contacts, counts and current/next projection', async () => {
    const rows = await readFixture(db.pool, principals.integration);
    expect(rows.map(r => r.resource_id)).toEqual([ids.record, ids.otherDriverRecord]);
    // Build fixture projection exclusively from scoped rows. Hidden current/next
    // details are null; only visible counts exist, never full-trip totals.
    const projection = { visibleCount: rows.length, current: rows.find(r => r.resource_id === ids.secondRecord) ?? null,
      next: rows.find(r => r.resource_id === ids.record)?.contact ?? null, contacts: rows.map(r => r.contact) };
    expect(projection).toEqual({ visibleCount: 2, current: null, next: 'visible-source-A', contacts: ['visible-source-A', 'other-driver'] });
    expect(JSON.stringify(projection)).not.toContain('hidden');
    await expect(runFixtureCommand(db.pool, principals.integration, accessCommand(ids.secondRecord))).rejects.toMatchObject({ statusCode: 404 });
    expect(await storedCount()).toBe(0);
  });

  test.each([ids.forbiddenRecord, ids.otherRecord, ids.personalRecord, randomUUID()])('hidden/nonexistent resource %s has identical safe denial and no writes', async resourceId => {
    await expect(runFixtureCommand(db.pool, principals.staff, accountCommand(resourceId))).rejects.toMatchObject({
      message: 'Resource unavailable', code: 'forbidden_resource', statusCode: 404
    });
    expect(await storedCount()).toBe(0);
    expect((await db.pool.query('SELECT sum(value)::int AS total FROM public.authorization_test_records')).rows[0].total).toBe(0);
  });

  test('direct deny denies operations in both branches; direct allow is still bounded by lifecycle and resources', async () => {
    await db.pool.query("INSERT INTO tawsel.user_capability_exceptions VALUES ($1,$2,'assignment.manage','deny')", [ids.tenant, ids.staff]);
    for (const resource of [ids.record, ids.secondBranchRecord]) {
      await expect(runFixtureCommand(db.pool, principals.staff, accountCommand(resource))).rejects.toMatchObject({ statusCode: 403 });
    }
    await db.pool.query("UPDATE tawsel.role_capabilities SET allowed=false WHERE tenant_id=$1 AND role_id=$2 AND capability='assignment.manage'", [ids.tenant, ids.role]);
    await db.pool.query("UPDATE tawsel.user_capability_exceptions SET effect='allow' WHERE tenant_id=$1 AND account_id=$2", [ids.tenant, ids.staff]);
    expect((await runFixtureCommand(db.pool, principals.staff, accountCommand(ids.secondBranchRecord))).receipt.businessStatus).toBe('accepted');
    await expect(runFixtureCommand(db.pool, principals.staff, accountCommand(ids.forbiddenRecord))).rejects.toMatchObject({ statusCode: 404 });
    await db.pool.query('UPDATE public.authorization_test_records SET departed=true WHERE resource_id=$1', [ids.record]);
    const rejected = await runFixtureCommand(db.pool, principals.staff, accountCommand());
    expect(rejected.receipt.businessStatus).toBe('rejected');
    expect(rejected.receipt.problem?.code).toBe('lifecycle_forbidden');
    expect((await db.pool.query('SELECT value FROM public.authorization_test_records WHERE resource_id=$1', [ids.record])).rows[0].value).toBe(0);
    expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.command_evidence')).rows[0].n).toBe(1);
  });

  test('forged body tenant, source, actor and payload scope cannot expand authenticated scope', async () => {
    for (const context of [
      { kind: 'integration' as const, tenantId: ids.otherTenant, integrationId: ids.integration },
      { kind: 'integration' as const, tenantId: ids.tenant, integrationId: ids.secondIntegration },
      { kind: 'integration' as const, tenantId: ids.tenant, integrationId: ids.integration, assertedActorId: ids.staff }
    ]) {
      await expect(runFixtureCommand(db.pool, principals.integration, { ...accessCommand(), context })).rejects.toMatchObject({ statusCode: 403 });
    }
    await expect(runFixtureCommand(db.pool, principals.integration, { ...accessCommand(), payload: { resourceId: ids.record, tenantId: ids.otherTenant } })).rejects.toThrow('Invalid fixture payload');
    const wrongOperation = { ...accessCommand(), operationId: 'test.unregistered' };
    await expect(runFixtureCommand(db.pool, principals.integration, wrongOperation)).rejects.toMatchObject({ statusCode: 403 });
    expect(await storedCount()).toBe(0);
  });

  test.each([
    ['tenant', 'UPDATE tawsel.tenants SET enabled=false WHERE tenant_id=$1', ids.tenant, principals.staff],
    ['account', 'UPDATE tawsel.accounts SET enabled=false WHERE account_id=$1', ids.staff, principals.staff],
    ['subject', 'UPDATE tawsel.identity_subjects SET enabled=false WHERE account_id=$1', ids.staff, principals.staff],
    ['membership', 'UPDATE tawsel.memberships SET enabled=false WHERE account_id=$1', ids.staff, principals.staff],
    ['integration', 'UPDATE tawsel.integrations SET enabled=false WHERE integration_id=$1', ids.integration, principals.integration]
  ] as const)('disabled %s prevents read and new command', async (_name, sql, target, principal) => {
    await db.pool.query(sql, [target]);
    await expect(readFixture(db.pool, principal)).rejects.toMatchObject({ statusCode: 403 });
    await expect(runFixtureCommand(db.pool, principal, principal.kind === 'account' ? accountCommand() : accessCommand())).rejects.toMatchObject({ statusCode: 403 });
    expect(await storedCount()).toBe(0);
  });

  test('disabled branch filters reads and blocks operations without changing capability grants', async () => {
    await db.pool.query('UPDATE tawsel.branches SET enabled=false WHERE branch_id=$1', [ids.branch]);
    expect(await recordIds(principals.staff)).toEqual([ids.secondBranchRecord]);
    await expect(runFixtureCommand(db.pool, principals.staff, accountCommand())).rejects.toMatchObject({ statusCode: 404 });
  });

  test('worker/export derive trusted identity afresh and reject forged scope; revocation affects queued work', async () => {
    const trustedJob = { principal: principals.staff }; // persisted server metadata, not request payload
    for (const forged of [{ tenantId: ids.otherTenant }, { branchId: ids.forbiddenBranch }, { driverId: ids.otherDriver }, { integrationId: ids.secondIntegration }, { accountId: ids.otherAccount }] satisfies ScopeAssertion[]) {
      await expect(readFixture(db.pool, trustedJob.principal, exportPolicy, forged)).rejects.toMatchObject({ statusCode: 403 });
    }
    expect((await readFixture(db.pool, trustedJob.principal, exportPolicy)).length).toBe(4);
    await db.pool.query('DELETE FROM tawsel.membership_branches WHERE account_id=$1 AND branch_id=$2', [ids.staff, ids.secondBranch]);
    expect((await readFixture(db.pool, trustedJob.principal, exportPolicy)).map(r => r.resource_id)).not.toContain(ids.secondBranchRecord);
    await db.pool.query("INSERT INTO tawsel.user_capability_exceptions VALUES ($1,$2,'reports.export','deny')", [ids.tenant, ids.staff]);
    await expect(readFixture(db.pool, trustedJob.principal, exportPolicy)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('accepted command, retained replay and rollback use actual guarded command transaction', async () => {
    const command = accountCommand();
    const result = await runFixtureCommand(db.pool, principals.staff, command);
    expect(result.receipt.businessStatus).toBe('accepted');
    await db.pool.query('UPDATE public.authorization_test_records SET departed=true WHERE resource_id=$1', [ids.record]);
    expect(await runFixtureCommand(db.pool, principals.staff, command)).toEqual(result); // no repeated transition
    await db.pool.query('DELETE FROM tawsel.membership_branches WHERE account_id=$1 AND branch_id=$2', [ids.staff, ids.branch]);
    await expect(runFixtureCommand(db.pool, principals.staff, command)).rejects.toMatchObject({ statusCode: 404 }); // no stale result contact leak
    expect(await storedCount()).toBe(1);
    const operation = fixtureOperation();
    operation.hooks.afterWrite = async stage => { if (stage === 'audit') throw new Error('injected after audit'); };
    await expect(executeAuthorizedCommand(db.pool, principals.staff, accountCommand(ids.secondBranchRecord), operation)).rejects.toThrow('injected after audit');
    expect((await db.pool.query('SELECT value FROM public.authorization_test_records WHERE resource_id=$1', [ids.secondBranchRecord])).rows[0].value).toBe(0);
    expect(await storedCount()).toBe(1);
  });

  test('hidden state is never evaluated to explain a lifecycle denial', async () => {
    await withAccess(db.pool, principals.integration, async (access, tx) => {
      const hidden = (await tx.query<FixtureRecord>('SELECT * FROM public.authorization_test_records WHERE resource_id=$1', [ids.secondRecord])).rows[0]!;
      let evaluated = false;
      expect(() => access.requireOperation(assignmentPolicy, hidden, () => { evaluated = true; return false; })).toThrow('Resource unavailable');
      expect(evaluated).toBe(false);
    });
  });

  test('direct SQL revocation waits for the active guarded write, then prevents subsequent work', async () => {
    const acquired = deferred<number>();
    const release = deferred();
    const operation = fixtureOperation();
    operation.hooks.afterWrite = async (stage, tx) => {
      if (stage === 'domain') {
        acquired.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
        await release.promise;
      }
    };
    const running = executeAuthorizedCommand(db.pool, principals.staff, accountCommand(), operation);
    const holderPid = await acquired.promise;
    const revoker = await db.pool.connect();
    let revoking: Promise<unknown> | undefined;
    try {
      const waiterPid = (await revoker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      revoking = revoker.query('UPDATE tawsel.memberships SET enabled=false WHERE account_id=$1', [ids.staff]);
      await observeDatabaseBlock(db.pool, waiterPid, holderPid);
      release.resolve();
      expect((await running).receipt.businessStatus).toBe('accepted');
      await revoking;
      await expect(runFixtureCommand(db.pool, principals.staff, accountCommand())).rejects.toMatchObject({ statusCode: 403 });
    } finally {
      release.resolve();
      await Promise.allSettled([running, ...(revoking ? [revoking] : [])]);
      revoker.release();
    }
  });

  test('a role revocation that wins the tenant lock is observed before a waiting command authorizes', async () => {
    const waiter = createDatabasePool(db.config);
    const revoker = await db.pool.connect();
    let waiting: Promise<unknown> | undefined;
    try {
      const waitingPid = (await waiter.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await revoker.query('BEGIN');
      const holderPid = (await revoker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await revoker.query("UPDATE tawsel.role_capabilities SET allowed=false WHERE tenant_id=$1 AND role_id=$2 AND capability='assignment.manage'", [ids.tenant, ids.role]);
      waiting = runFixtureCommand(waiter, principals.staff, accountCommand());
      const denied = expect(waiting).rejects.toMatchObject({ statusCode: 403 });
      await observeDatabaseBlock(db.pool, waitingPid, holderPid);
      await revoker.query('COMMIT');
      await denied;
      expect(await storedCount()).toBe(0);
    } finally {
      await revoker.query('ROLLBACK');
      await Promise.allSettled(waiting ? [waiting] : []);
      revoker.release();
      await waiter.end();
    }
  });
});
