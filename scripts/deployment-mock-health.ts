import { readConfig } from '../apps/mock-erp/src/config.js';
import { receiverPool, assertReceiverMigrationsCurrent } from '../apps/mock-erp/src/database.js';
const config = readConfig(), pool = receiverPool();
try {
  await assertReceiverMigrationsCurrent(pool, config);
  if (config.host !== '127.0.0.1') throw new Error('Private staging mock must bind IPv4 loopback');
  const response = await fetch(`http://127.0.0.1:${config.port}/health`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok || (await response.json() as {service:string}).service !== 'external-mock-erp') throw new Error('Mock unavailable');
} catch { console.error('Private mock readiness unavailable'); process.exitCode = 1; }
finally { await pool.end(); }
