import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { withTransaction } from './transaction.js';

const migrationDirectory = new URL('../../../../db/migrations/', import.meta.url);

export async function readMigrations(directory: URL = migrationDirectory) {
  const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  if (!names.length) throw new Error('No migrations found');
  return Promise.all(names.map(async (name, index) => {
    if (!new RegExp(`^${String(index + 1).padStart(4, '0')}_[a-z0-9_]+\\.sql$`).test(name)) {
      throw new Error('Migrations must have contiguous, versioned filenames');
    }
    const sql = (await readFile(new URL(name, directory), 'utf8')).replaceAll('\r\n', '\n');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

export async function migrate(pool: Pool, directory?: URL): Promise<string[]> {
  const migrations = await readMigrations(directory);
  return withTransaction(pool, async tx => {
    await tx.query('SELECT pg_advisory_xact_lock(18005, 1)');
    const initialized = await tx.query("SELECT to_regclass('tawsel.schema_migrations') AS name");
    if (!initialized.rows[0].name) {
      const existing = await tx.query(`SELECT nspname FROM pg_namespace
        WHERE nspname NOT IN ('public', 'information_schema') AND nspname NOT LIKE 'pg_%'
        UNION ALL SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname = 'public'`);
      if (existing.rowCount) throw new Error('Refusing nonempty uninitialized database');
      await tx.query(`CREATE SCHEMA tawsel;
        CREATE TABLE tawsel.schema_migrations (
          name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
        )`);
    }
    const applied = await tx.query<{ name: string; checksum: string }>('SELECT name, checksum FROM tawsel.schema_migrations ORDER BY name');
    for (const [index, row] of applied.rows.entries()) {
      if (migrations[index]?.name !== row.name || migrations[index]?.checksum !== row.checksum) {
        throw new Error('Migration history differs from checked-in SQL; refusing target');
      }
    }
    const pending = migrations.slice(applied.rows.length);
    for (const item of pending) {
      await tx.query(item.sql);
      await tx.query('INSERT INTO tawsel.schema_migrations (name, checksum) VALUES ($1, $2)', [item.name, item.checksum]);
    }
    return pending.map(item => item.name);
  });
}

export async function assertMigrationsCurrent(pool: Pool): Promise<void> {
  const expected = await readMigrations();
  const actual = await pool.query<{ name: string; checksum: string }>('SELECT name, checksum FROM tawsel.schema_migrations ORDER BY name');
  if (actual.rows.length !== expected.length || actual.rows.some((row, i) => row.name !== expected[i]?.name || row.checksum !== expected[i]?.checksum)) {
    throw new Error('Database migrations are not current; run npm run db:migrate');
  }
}
