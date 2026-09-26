import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { parseDatabaseConfig } from '../apps/api/src/db/config.js';
import { assertMigrationsCurrent } from '../apps/api/src/db/migrate.js';

const kind = process.argv[2];
const pool = createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_DATABASE_URL, 'application'));
try {
  await assertMigrationsCurrent(pool);
  if (kind === 'api') {
    const response = await fetch('http://127.0.0.1:3001/health', { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('API unavailable');
  } else if (['planning', 'outbox', 'provisioning'].includes(kind ?? '')) {
    const result = await pool.query("SELECT 1 FROM tawsel.worker_observations WHERE worker=$1 AND observed_at > clock_timestamp()-interval '120 seconds'", [kind]);
    if (!result.rowCount) throw new Error('Worker observation stale');
  } else throw new Error('Unknown health target');
} catch {
  process.stderr.write('Local service/database readiness unavailable; inspect private diagnostics.\n');
  process.exitCode = 1;
} finally { await pool.end(); }
