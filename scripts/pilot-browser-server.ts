/** Private P41 rehearsal: real isolated DB/OIDC; explicitly selected routing.
 * Never mount these controls in the application or expose this server publicly. */
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture } from '../apps/api/test/support/access-fixture.js';
import { providerFixture } from '../apps/api/test/support/planning-fixture.js';
import { buildApp } from '../apps/api/src/app.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { RoutingEngine } from '../apps/api/src/engine/index.js';
import { loadEngineConfig } from '../apps/api/src/engine/config.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';

const mode = process.env.TAWSEL_PILOT_ENGINE ?? 'fixture';
if (!['fixture', 'live'].includes(mode)) throw new Error('TAWSEL_PILOT_ENGINE must be fixture or live');
const issuer = 'http://localhost:8085/realms/tawsel-personal';
const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8')) as { control: string; personal: string; company: string };
const cleanup: (() => Promise<unknown>)[] = [];
const stop = '.local/phase-41-browser.stop';
async function admin(path: string, init: RequestInit) {
  const token = await fetch(`${issuer}/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) });
  if (!token.ok) throw new Error('Local Keycloak control client unavailable');
  const { access_token } = await token.json() as { access_token: string };
  const response = await fetch(`${issuer.replace('/realms/', '/admin/realms/')}/users${path}`, { ...init, headers: { authorization: `Bearer ${access_token}`, 'content-type': 'application/json' } });
  if (!response.ok) throw new Error(`Pilot issuer setup/cleanup failed (${response.status})`);
  return response;
}
try {
  const username = `+201${String(randomBytes(4).readUInt32BE() % 1_000_000_000).padStart(9, '0')}`;
  const password = `P41-${randomUUID()}!`;
  const created = await admin('', { method: 'POST', body: JSON.stringify({ username, email: `pilot-${randomUUID()}@example.test`, enabled: true, emailVerified: true, firstName: 'Pilot', lastName: 'Test', credentials: [{ type: 'password', value: password, temporary: false }] }) });
  const subject = created.headers.get('location')!.split('/').at(-1)!;
  cleanup.push(() => admin(`/${subject}`, { method: 'DELETE' }));
  const db = await createTestDatabase(); cleanup.push(() => db.close());
  await prepareAccessFixture(db.pool, 'http://localhost:8085/realms/tawsel-company', undefined, { personal: { issuer, subject } });
  const provider = mode === 'fixture' ? await providerFixture() : null;
  if (provider) cleanup.push(() => provider.close());
  const engine = provider?.engine ?? new RoutingEngine(loadEngineConfig());
  const app = buildApp(createDatabasePool(db.config), { origin: 'http://localhost:5173', encryptionKey: randomBytes(32), sessionSeconds: 28800, issuers: { personal: { issuer, clientId: 'tawsel-web', clientSecret: secrets.personal }, company: { issuer: 'http://localhost:8085/realms/tawsel-company', clientId: 'tawsel-web', clientSecret: secrets.company } } });
  cleanup.push(() => app.close());
  const info = { username, password, engine: mode, evidenceClass: 'Local desktop rehearsal; actual OIDC/HTTP/PostgreSQL, synthetic account/tasks. Routing mode is explicit. No physical device/owner approval.' };
  app.get('/__fixture/info', async () => info);
  const credentials = '.local/phase-41-credentials.json';
  if (existsSync(stop)) await unlink(stop);
  // Exclusive creation prevents silently overwriting credentials from another run.
  await writeFile(credentials, JSON.stringify(info, null, 2), { flag: 'wx', mode: 0o600 });
  cleanup.push(() => unlink(credentials));
  await app.listen({ host: '127.0.0.1', port: 3041 });
  let stopped = false;
  process.once('SIGINT', () => { stopped = true; }); process.once('SIGTERM', () => { stopped = true; });
  console.log(`P41 isolated rehearsal ready; routing=${mode}. Private credentials: ${credentials}. Stop via ${stop}.`);
  while (!stopped && !existsSync(stop)) {
    await runPlanningOnce(db.pool, engine, { maxAttempts: 1 });
    await new Promise(resolve => setTimeout(resolve, 200));
  }
} finally {
  const failures: unknown[] = [];
  for (const close of cleanup.reverse()) { try { await close(); } catch (error) { failures.push(error); } }
  if (failures.length) {
    console.error(`Pilot cleanup incomplete (${failures.length} failures); inspect the harness-owned resources.`);
    process.exitCode = 1;
  } else if (existsSync(stop)) {
    // Teardown acknowledgement comes only after database and issuer cleanup.
    await unlink(stop);
  }
}
