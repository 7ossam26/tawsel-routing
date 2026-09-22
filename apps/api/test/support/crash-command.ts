import { createDatabasePool } from '../../src/db/pool.js';
import { parseDatabaseConfig } from '../../src/db/config.js';
import { executeCommand, type ActionEnvelope } from '../../src/commands/kernel.js';
import { fixtureHooks, scopeA } from './command-fixture.js';

const pool = createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_CRASH_TEST_URL, 'test'));
process.once('message', async (message: { command: ActionEnvelope; beforeCommit: boolean }) => {
  try {
    const hooks = fixtureHooks(message.command);
    if (message.beforeCommit) hooks.afterWrite = async (stage, tx) => {
      if (stage === 'result') {
        const { rows } = await tx.query('SELECT pg_backend_pid() AS pid');
        process.send?.({ barrier: 'before-commit', backendPid: rows[0].pid });
        await new Promise(() => { /* Parent kills this process at the observable barrier. */ });
      }
    };
    await executeCommand(pool, scopeA, message.command, hooks);
    // The business result is deliberately never transmitted to the caller.
    process.send?.({ barrier: 'committed-before-response' });
  } catch (error) {
    process.send?.({ error: error instanceof Error ? error.message : String(error) });
    await pool.end();
    process.exitCode = 1;
    process.disconnect?.();
  }
});
