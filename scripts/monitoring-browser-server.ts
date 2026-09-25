/** P32 isolated acceptance: actual local Keycloak, HTTP and PostgreSQL.
 * Source/identity setup is labelled fixture data; all monitored business state
 * is produced by the public source/start/current boundaries. */
import { existsSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture } from '../apps/api/test/support/access-fixture.js';
import { mixedMonitoringFixture } from '../apps/api/test/support/monitoring-fixture.js';
import { operatorToken, send } from '../apps/api/test/support/provisioning-fixture.js';
import { buildApp } from '../apps/api/src/app.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { CurrentActivity } from '../apps/api/src/current/service.js';

const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8')) as { control: string; company: string; personal: string; password: string };
const issuer = 'http://localhost:8085/realms/tawsel-company';
async function issuerAdmin(path = '', init: RequestInit = {}) {
  const token = await fetch(`${issuer}/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) });
  if (!token.ok) throw new Error('Actual local Keycloak is required.');
  const access = await token.json() as { access_token: string };
  const response = await fetch(`${issuer.replace('/realms/', '/admin/realms/')}/users${path}`, { ...init, headers: { authorization: `Bearer ${access.access_token}`, 'content-type': 'application/json' } });
  if (!response.ok) throw new Error(`Issuer setup failed: ${response.status}`); return response;
}
const username = `p32-staff-${randomUUID().slice(0, 8)}`;
const created = await issuerAdmin('', { method: 'POST', body: JSON.stringify({ username, email: `${username}@example.test`, enabled: true, emailVerified: true, firstName: 'Phase32', lastName: 'Monitor', credentials: [{ type: 'password', value: secrets.password, temporary: false }] }) });
const subject = created.headers.get('location')!.split('/').at(-1)!;
const closers: (() => Promise<unknown>)[] = [() => issuerAdmin(`/${subject}`, { method: 'DELETE' })];
try {
  const db = await createTestDatabase(); closers.unshift(() => db.close());
  await prepareAccessFixture(db.pool, issuer);
  const fixture = await mixedMonitoringFixture(db, issuer); closers.unshift(() => fixture.close());
  const grant = structuredClone(fixture.source.bootstrapCommand); grant.actionId = randomUUID(); grant.payload.sourceRevision = 4; grant.payload.subjectIds = [...new Set([...(grant.payload.subjectIds as string[]), subject])]; grant.payload.monitoringCapabilities = ['monitor.read'];
  const granted = await send(fixture.app, operatorToken, grant); if (granted.statusCode !== 200) throw new Error(granted.body);
  for (const [operation, payload] of [
    ['role.defineCapabilities', { externalId: 'monitor-role', sourceRevision: 1, name: 'Monitor', capabilities: ['monitor.read'] }],
    ['user.provision', { externalId: 'monitor-staff', sourceRevision: 1, subject, roleExternalId: 'monitor-role', branchExternalIds: ['branch'], enabled: true }]
  ] as const) { const response = await send(fixture.app, fixture.source.token, fixture.source.command(operation, payload)); if (response.statusCode !== 200) throw new Error(response.body); }
  await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE issuer=$1 AND subject=$2', [issuer, subject]);
  const auth = { origin: 'http://localhost:5173', encryptionKey: randomBytes(32), sessionSeconds: 28800, issuers: { company: { issuer, clientId: 'tawsel-web', clientSecret: secrets.company }, personal: { issuer: 'http://localhost:8085/realms/tawsel-personal', clientId: 'tawsel-web', clientSecret: secrets.personal } } };
  const app = buildApp(createDatabasePool(db.config), auth); closers.unshift(() => app.close());
  let changed = false;
  app.get('/__fixture/info', async () => ({ username, password: secrets.password, companyCode: fixture.source.code, driverId: fixture.driverId, hidden: 'SECRET RECIPIENT B' }));
  app.post('/__fixture/commit-current', async () => {
    if (!changed) { const command = fixture.make(0, 'current.selectHeading'); const result = await new CurrentActivity(db.pool).command(fixture.principal, command); if (result.receipt.businessStatus !== 'accepted') throw new Error('Current selection rejected'); changed = true; }
    return { committedAt: new Date().toISOString() };
  });
  app.get('/__fixture/state', async () => ({ views: (await db.pool.query('SELECT scope_key,revision FROM tawsel.monitoring_views ORDER BY revision DESC')).rows, current: (await db.pool.query('SELECT task_id,stage FROM tawsel.execution_attempts WHERE round_id=$1', [fixture.round.roundId])).rows }));
  await app.listen({ host: '127.0.0.1', port: 3032 });
  const stop = '.local/phase-32-browser.stop'; if (existsSync(stop)) await unlink(stop);
  let stopped = false; process.once('SIGINT', () => { stopped = true; }); process.once('SIGTERM', () => { stopped = true; });
  console.log('P32 actual monitoring harness ready on 3032.');
  while (!stopped && !existsSync(stop)) await new Promise(resolve => setTimeout(resolve, 200));
  if (existsSync(stop)) await unlink(stop);
} finally { for (const close of closers) await close(); }
