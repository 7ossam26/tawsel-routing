import { ConfigurationError } from '@tawsel/shared';
import { buildApp } from './app.js';
import { parseApiConfig } from './config.js';

async function main(): Promise<void> {
  const config = parseApiConfig(process.env);
  const app = buildApp();

  await app.listen({ host: config.host, port: config.port });
  process.stdout.write(`Tawsel API listening at http://${config.host}:${config.port}\n`);
}

main().catch((error: unknown) => {
  const prefix = error instanceof ConfigurationError ? 'Configuration error' : 'API startup failed';
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`${prefix}: ${message}\n`);
  process.exitCode = 1;
});
