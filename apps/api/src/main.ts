import { ConfigurationError } from '@tawsel/shared';
import { buildApp } from './app.js';
import { parseApiConfig } from './config.js';
import { parseDatabaseConfig } from './db/config.js';
import { createDatabasePool } from './db/pool.js';
import { assertMigrationsCurrent } from './db/migrate.js';
import { parseAuthConfig } from './auth/config.js';

async function main(): Promise<void> {
  const config = parseApiConfig(process.env);
  const database = createDatabasePool(parseDatabaseConfig(process.env.TAWSEL_DATABASE_URL, 'application'));
  const auth = parseAuthConfig(process.env);
  const app = buildApp(database, auth, { issuer: auth.issuers.company.issuer,
    ...(process.env.TAWSEL_PROVISIONING_OPERATOR_TOKEN ? { operatorToken: process.env.TAWSEL_PROVISIONING_OPERATOR_TOKEN } : {}) });

  try {
    await assertMigrationsCurrent(database);
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    await app.close();
    throw error;
  }
  const shutdown = () => { void app.close().catch(() => { process.exitCode = 1; }); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.stdout.write(`Tawsel API listening at http://${config.host}:${config.port}\n`);
}

main().catch((error: unknown) => {
  const prefix = error instanceof ConfigurationError ? 'Configuration error' : 'API startup failed';
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`${prefix}: ${message}\n`);
  process.exitCode = 1;
});
