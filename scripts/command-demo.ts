import { executeCommand, getCommandResult } from '../apps/api/src/commands/kernel.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { facts, fixtureHooks, makeCommand, prepareFixture, scopeA } from '../apps/api/test/support/command-fixture.js';

const db = await createTestDatabase();
try {
  await prepareFixture(db.pool);
  const command = makeCommand();
  const accepted = await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
  const retry = await executeCommand(db.pool, scopeA, command, fixtureHooks(command));
  if (JSON.stringify(accepted) !== JSON.stringify(retry)) throw new Error('Duplicate result differs');
  const restarted = createDatabasePool(db.config);
  try {
    const recovered = await getCommandResult(restarted, scopeA, command.actionId);
    if (JSON.stringify(accepted) !== JSON.stringify(recovered)) throw new Error('Durable recovery failed');
  } finally { await restarted.end(); }
  const failed = makeCommand();
  try {
    await executeCommand(db.pool, scopeA, failed, { ...fixtureHooks(failed), async afterWrite(stage) {
      if (stage === 'outbox') throw new Error('demo injected failure');
    } });
    throw new Error('Expected injected failure');
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'demo injected failure') throw error;
  }
  const rolledBack = await facts(db.pool, failed);
  if (Object.values(rolledBack).some(value => value !== 0)) throw new Error('Partial writes survived');
  process.stdout.write(JSON.stringify({
    evidence: 'Actual isolated PostgreSQL; synthetic counter, not a delivery/API',
    database: db.config.database, duplicate: 'same durable result', restart: 'recovered from fresh pool',
    accepted: await facts(db.pool, command), injectedFailure: rolledBack,
    outbox: 'pending intent only; no delivery attempted', cleanup: 'owned database dropped in finally'
  }, null, 2) + '\n');
} finally { await db.close(); }
