import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { databaseMarker, parseDatabaseConfig } from '../../src/db/config.js';
import { createDatabasePool } from '../../src/db/pool.js';

export async function createTestDatabase() {
  const raw = process.env.TAWSEL_TEST_ADMIN_URL;
  if (!raw) throw new Error('Real PostgreSQL required: run npm run db:local:start; see docs/operations.md');
  const url = new URL(raw);
  if (url.pathname !== '/tawsel_test_control') throw new Error('Test admin must target tawsel_test_control');
  // Reuse strict URL/TLS/loopback validation without granting migration access to control DB.
  const name = `tawsel_test_${randomUUID().replaceAll('-', '')}`;
  const testUrl = new URL(url);
  testUrl.pathname = `/${name}`;
  const config = parseDatabaseConfig(testUrl.href, 'test');
  const admin = new Pool({ ...config, database: 'tawsel_test_control', max: 1, connectionTimeoutMillis: 5000 });
  let created = false;
  try {
    const target = await admin.query(`SELECT pg_get_userbyid(datdba) AS owner, shobj_description(oid, 'pg_database') AS marker
      FROM pg_database WHERE datname=current_database()`);
    if (target.rows[0]?.marker !== 'tawsel:test-control:v1' || target.rows[0]?.owner !== config.user) {
      throw new Error('Refusing unmarked or unowned test control database');
    }
    await admin.query(`CREATE DATABASE ${name}`);
    created = true;
    await admin.query(`COMMENT ON DATABASE ${name} IS '${databaseMarker('test')}'`);
    const pool = createDatabasePool(config);
    let closed = false;
    return {
      pool, config, url: testUrl.href,
      async close() {
        if (closed) return;
        closed = true;
        try {
          await pool.end();
          // Only the database created by this invocation. Never FORCE/disconnect unrelated sessions.
          await admin.query(`DROP DATABASE ${name}`);
        } finally { await admin.end(); }
      }
    };
  } catch (error) {
    try { if (created) await admin.query(`DROP DATABASE ${name}`); }
    finally { await admin.end(); }
    throw error;
  }
}
