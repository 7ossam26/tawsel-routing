import { test, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createTestDatabase } from '../support/database.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { migrate, readMigrations, assertMigrationsCurrent } from '../../src/db/migrate.js';
import { executeCommand, getCommandResult } from '../../src/commands/kernel.js';
import { makeCommand, scopeA } from '../support/command-fixture.js';

test('failed upgrade rolls back DDL and ledger, old service still reads original command; forward fix survives reconnect', async () => {
  const db = await createTestDatabase(), directory = await mkdtemp(join(tmpdir(), 'tawsel-release-'));
  const url = pathToFileURL(directory + '/');
  try {
    const migrations = await readMigrations();
    for (const m of migrations.slice(0, -1)) await writeFile(join(directory, m.name), m.sql);
    await migrate(db.pool, url);
    await db.pool.query('INSERT INTO tawsel.tenant_keys VALUES ($1)', [scopeA.tenantId]);
    await db.pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'integration')", [scopeA.tenantId, scopeA.sourceId]);
    const command = makeCommand();
    const accepted = await executeCommand(db.pool, scopeA, command, {
      async writeDomain() { return { status: 'accepted', response: { status: 200, body: { retained: true } }, summary: { retained: true }, audit: { fixture: true }, resourceVersions: {}, intents: [] }; },
      async writeProgress() { /* Migration probe has no domain effect. */ }
    });
    const bytes = await db.pool.query('SELECT to_jsonb(e) AS evidence FROM tawsel.command_evidence e');
    const last = migrations.at(-1)!;
    await writeFile(join(directory, last.name), last.sql + '\nCREATE TABLE tawsel.failed_release_probe(id integer); SELECT 1/0;');
    await expect(migrate(db.pool, url)).rejects.toThrow();
    expect((await db.pool.query("SELECT to_regclass('tawsel.failed_release_probe') AS p, to_regclass('tawsel.worker_observations') AS w")).rows[0]).toEqual({ p: null, w: null });
    expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.schema_migrations')).rows[0].n).toBe(27);
    // Old process can keep serving the old schema after the failed transaction.
    expect(await getCommandResult(db.pool, scopeA, command.actionId)).toEqual(accepted);
    await writeFile(join(directory, last.name), last.sql);
    const applied = await Promise.all([migrate(db.pool, url), migrate(db.pool, url)]);
    expect(applied.flat()).toEqual([last.name]);
    const restarted = createDatabasePool(db.config);
    try {
      await assertMigrationsCurrent(restarted);
      expect(await getCommandResult(restarted, scopeA, command.actionId)).toEqual(accepted);
      expect((await restarted.query('SELECT to_jsonb(e) AS evidence FROM tawsel.command_evidence e')).rows).toEqual(bytes.rows);
      expect(await migrate(restarted)).toEqual([]);
    } finally { await restarted.end(); }
    expect(await readFile(join(directory, last.name), 'utf8')).toBe(last.sql);
  } finally { await db.close(); await rm(directory, { recursive: true, force: true }); }
});
