import { setTimeout } from 'node:timers/promises';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { parseDatabaseConfig } from '../apps/api/src/db/config.js';
import { assertMigrationsCurrent } from '../apps/api/src/db/migrate.js';
import { keycloakAdministration } from '../apps/api/src/provisioning/issuer.js';
import { reconcileOne } from '../apps/api/src/provisioning/worker.js';

const issuer = process.env.TAWSEL_COMPANY_ISSUER, clientId = process.env.TAWSEL_ISSUER_WORKER_CLIENT_ID, clientSecret = process.env.TAWSEL_ISSUER_WORKER_CLIENT_SECRET;
if (!issuer || !clientId || !clientSecret) throw new Error('Configure the company issuer and dedicated issuer worker client');
const admin = keycloakAdministration({ issuer, clientId, clientSecret });
const pool = createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_DATABASE_URL, 'application'));
let stop = false;
process.on('SIGINT', () => { stop = true; }); process.on('SIGTERM', () => { stop = true; });
try {
  await assertMigrationsCurrent(pool);
  do {
    const worked = await reconcileOne(pool, issuer, admin);
    if (process.argv.includes('--once')) { console.log(worked ? 'One durable issuer intent processed; query status for its outcome.' : 'No due issuer intent.'); break; }
    if (!worked) await setTimeout(1000);
  } while (!stop);
} finally { await pool.end(); }
