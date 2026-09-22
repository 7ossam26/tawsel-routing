import { createDatabasePool } from '../../src/db/pool.js';
import { parseDatabaseConfig } from '../../src/db/config.js';
import { keycloakAdministration } from '../../src/provisioning/issuer.js';
import { reconcileOne } from '../../src/provisioning/worker.js';
const pool = createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_CRASH_TEST_URL, 'test'));
process.once('message', async (message: { issuer: string; adminIssuer: string }) => {
  const real = keycloakAdministration({ issuer: message.adminIssuer, clientId: 'provisioning-worker', clientSecret: 'fixture-admin' });
  try {
    await reconcileOne(pool, message.issuer, {
      async verifySubject(subject) {
        await real.verifySubject(subject);
        // Actual HTTP succeeded after a committed claim, before completion commit.
        process.send?.({ barrier: 'issuer-succeeded-before-completion' });
        return new Promise<boolean>(() => { /* Parent terminates the process. */ });
      }, revokeSessions: real.revokeSessions
    });
  } catch { process.send?.({ error: 'worker failed before crash barrier' }); }
});
