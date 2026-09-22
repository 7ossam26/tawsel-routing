import { parseDatabaseConfig } from '../apps/api/src/db/config.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { migrate } from '../apps/api/src/db/migrate.js';

const pool = createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_DATABASE_URL, 'application'));
try {
  const applied = await migrate(pool);
  process.stdout.write(`Application migrations: ${applied.join(', ') || 'already current'}\n`);
} finally {
  await pool.end();
}
