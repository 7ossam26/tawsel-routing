import { readConfig } from '../apps/mock-erp/src/config.js';
import { receiverPool, assertReceiverMigrationsCurrent } from '../apps/mock-erp/src/database.js';
import { assertReceiverListenerHealthy } from '../apps/mock-erp/src/health.js';
const config = readConfig(), pool = receiverPool();
try {
  await assertReceiverMigrationsCurrent(pool, config);
  await assertReceiverListenerHealthy(config);
} catch { console.error('Mock readiness unavailable'); process.exitCode = 1; }
finally { await pool.end(); }
