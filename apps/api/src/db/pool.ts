import { Pool, type ClientBase } from 'pg';
import { databaseMarker, type DatabaseConfig } from './config.js';

export async function assertDatabaseTarget(client: ClientBase, config: DatabaseConfig): Promise<void> {
  const result = await client.query<{ name: string; owner: string; marker: string | null; version: number }>(`
    SELECT current_database() AS name, pg_get_userbyid(datdba) AS owner,
      shobj_description(oid, 'pg_database') AS marker,
      current_setting('server_version_num')::integer AS version
    FROM pg_database WHERE datname = current_database()`);
  const target = result.rows[0];
  if (!target || target.name !== config.database || target.owner !== config.user
    || target.marker !== databaseMarker(config.purpose) || target.version < 180000 || target.version >= 190000) {
    throw new Error('Refusing unexpected database: name, owner, purpose marker or PostgreSQL 18 version does not match');
  }
  const foreignExtensions = await client.query("SELECT extname FROM pg_extension WHERE extname <> 'plpgsql'");
  if (foreignExtensions.rowCount) throw new Error('Refusing database with non-application extensions (including Nominatim/PostGIS)');
}

export function createDatabasePool(config: DatabaseConfig, onIdleError: (error: Error) => void = () => {
  process.stderr.write('Tawsel database idle connection failed; the connection was discarded\n');
}): Pool {
  const pool = new Pool({
    ...config, max: 10, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000,
    application_name: 'tawsel-api',
    onConnect: async client => { await assertDatabaseTarget(client, config); }
  });
  pool.on('error', onIdleError);
  return pool;
}
