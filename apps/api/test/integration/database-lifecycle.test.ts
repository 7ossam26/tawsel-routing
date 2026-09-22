import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { migrate, assertMigrationsCurrent } from '../../src/db/migrate.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { parseDatabaseConfig } from '../../src/db/config.js';
import { withTransaction } from '../../src/db/transaction.js';
import { buildApp } from '../../src/app.js';

describe('real PostgreSQL migration lifecycle', () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeAll(async () => { db = await createTestDatabase(); });
  afterAll(async () => { await db?.close(); });

  test('applies fresh SQL once, serializes concurrent runners, verifies checksums', async () => {
    const results = await Promise.all([migrate(db.pool), migrate(db.pool)]);
    expect(results.flat()).toEqual(['0001_command_foundation.sql']);
    await expect(assertMigrationsCurrent(db.pool)).resolves.toBeUndefined();
    const tables = await db.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='tawsel' ORDER BY tablename");
    expect(tables.rows.map(r => r.tablename)).toEqual([
      'command_audit', 'command_evidence', 'command_identities', 'command_sources',
      'outbox_intents', 'schema_migrations', 'tenant_keys'
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
