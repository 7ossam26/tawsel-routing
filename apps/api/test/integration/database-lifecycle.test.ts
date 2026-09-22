import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { migrate, assertMigrationsCurrent } from '../../src/db/migrate.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { parseDatabaseConfig } from '../../src/db/config.js';
import { withTransaction } from '../../src/db/transaction.js';
import { buildApp } from '../../src/app.js';
import { mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { executeCommand, getCommandResult } from '../../src/commands/kernel.js';
import { makeCommand, scopeA } from '../support/command-fixture.js';
import { withAccess } from '../../src/access/service.js';

describe('real PostgreSQL migration lifecycle', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeAll(async () => { db = await createTestDatabase(); });
  afterAll(async () => { await db?.close(); });

  test('applies fresh SQL once, serializes concurrent runners, verifies checksums', async () => {
    const results = await Promise.all([migrate(db.pool), migrate(db.pool)]);
    expect(results.flat()).toEqual(['0001_command_foundation.sql', '0002_tenant_access.sql', '0003_identity_sessions.sql']);
    await expect(assertMigrationsCurrent(db.pool)).resolves.toBeUndefined();
    const tables = await db.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='tawsel' ORDER BY tablename");
    expect(tables.rows.map(r => r.tablename)).toEqual([
      'accounts', 'auth_rate_limits', 'branches', 'capabilities', 'command_audit', 'command_evidence', 'command_identities', 'command_sources', 'company_login_codes',
      'drivers', 'identity_subjects', 'integration_branches', 'integration_capabilities', 'integrations',
      'login_attempts', 'membership_branches', 'memberships', 'outbox_intents', 'role_capabilities', 'roles', 'schema_migrations',
      'tenant_keys', 'tenants', 'user_capability_exceptions', 'web_sessions'
    ]);
    await db.pool.query("UPDATE tawsel.schema_migrations SET checksum='changed'");
    await expect(migrate(db.pool)).rejects.toThrow('Migration history differs');
    // This database belongs exclusively to this suite and is dropped afterAll.
  });

  test('refuses Engine names, URL overrides and wrong target markers', async () => {
    expect(() => parseDatabaseConfig(db.url.replace(db.config.database, 'nominatim'), 'application')).toThrow();
    expect(() => parseDatabaseConfig(`${db.url}&database=nominatim`, 'test')).toThrow();
    const wrong = createDatabasePool({ ...db.config, purpose: 'application' });
    try { await expect(wrong.query('SELECT 1')).rejects.toThrow('Refusing unexpected database'); }
    finally { await wrong.end(); }
  });

  test('upgrades real P05 data without rewriting commands or granting legacy keys access', async () => {
    const old = await createTestDatabase();
    const directory = await mkdtemp(join(tmpdir(), 'tawsel-p06-migration-'));
    try {
      await writeFile(join(directory, '0001_command_foundation.sql'), await readFile(new URL('../../../../db/migrations/0001_command_foundation.sql', import.meta.url)));
      await migrate(old.pool, pathToFileURL(directory + '/'));
      await old.pool.query('INSERT INTO tawsel.tenant_keys VALUES ($1)', [scopeA.tenantId]);
      await old.pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'integration')", [scopeA.tenantId, scopeA.sourceId]);
      const command = makeCommand();
      const before = await executeCommand(old.pool, scopeA, command, {
        async writeDomain() { return { status: 'accepted', response: { status: 200, body: { retained: true } }, summary: { retained: true }, audit: { fixture: true }, resourceVersions: {}, intents: [] }; },
        async writeProgress() { /* No domain table in this migration-only fixture. */ }
      });
      expect(await migrate(old.pool)).toEqual(['0002_tenant_access.sql', '0003_identity_sessions.sql']);
      expect(await getCommandResult(old.pool, scopeA, command.actionId)).toEqual(before);
      expect(await migrate(old.pool)).toEqual([]);
      await expect(withAccess(old.pool, { kind: 'integration', integrationId: scopeA.sourceId }, async a => a.commandScope)).rejects.toMatchObject({ statusCode: 403 });
      expect((await old.pool.query('SELECT count(*)::int AS n FROM tawsel.tenants')).rows[0].n).toBe(0);
    } finally {
      await old.close();
      await unlink(join(directory, '0001_command_foundation.sql'));
      await rmdir(directory);
    }
  });

  test('refuses uninitialized nonempty database before application DDL', async () => {
    const other = await createTestDatabase();
    try {
      await other.pool.query('CREATE TABLE public.foreign_data (id integer)');
      await expect(migrate(other.pool)).rejects.toThrow('nonempty');
      expect((await other.pool.query("SELECT to_regnamespace('tawsel') AS name")).rows[0].name).toBeNull();
    } finally { await other.close(); }
  });

  test('rolls back a failed transaction and returns the connection to the pool', async () => {
    await db.pool.query('CREATE TABLE public.transaction_probe (id integer)');
    await expect(withTransaction(db.pool, async tx => {
      await tx.query('INSERT INTO public.transaction_probe VALUES (1)');
      throw new Error('injected');
    })).rejects.toThrow('injected');
    expect((await db.pool.query('SELECT * FROM public.transaction_probe')).rowCount).toBe(0);
    expect(db.pool.waitingCount).toBe(0);
    expect((await db.pool.query('SELECT 1 AS alive')).rows[0].alive).toBe(1);
  });

  test('Fastify shutdown drains and closes its owned PostgreSQL pool', async () => {
    const ownedPool = createDatabasePool(db.config);
    const app = buildApp(ownedPool);
    try {
      await ownedPool.query('SELECT 1');
      expect((await app.inject('/health')).statusCode).toBe(200);
    } finally { await app.close(); }
    expect(ownedPool.totalCount).toBe(0);
    await expect(ownedPool.query('SELECT 1')).rejects.toThrow('Cannot use a pool after calling end');
  });
});
