/** P29 acceptance harness: real application routes, PostgreSQL and local
 * Keycloak. Routing is the existing labelled controlled HTTP fixture. */
import { existsSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture, ids } from '../apps/api/test/support/access-fixture.js';
import { companyPlanningFixture } from '../apps/api/test/support/planning-company-fixture.js';
import { command, draft, intake, providerFixture } from '../apps/api/test/support/planning-fixture.js';
import { IndependentIntakeService } from '../apps/api/src/b2c-intake/service.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';
import { buildApp } from '../apps/api/src/app.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { send } from '../apps/api/test/support/provisioning-fixture.js';

const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8')) as { control: string; company: string; personal: string; password: string };
const companyIssuer = 'http://localhost:8085/realms/tawsel-company', personalIssuer = 'http://localhost:8085/realms/tawsel-personal';
const users: { issuer: string; subject: string; username: string }[] = [];
async function issuerAdmin(issuer: string, path = '', init: RequestInit = {}) {
  const token = await fetch(`${issuer}/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) });
  if (!token.ok) throw new Error(`Actual local Keycloak is required (${issuer}, ${token.status}).`);
  const access = await token.json() as { access_token: string };
  const response = await fetch(`${issuer.replace('/realms/', '/admin/realms/')}/users${path}`, { ...init, headers: { authorization: `Bearer ${access.access_token}`, 'content-type': 'application/json' } });
  if (!response.ok) throw new Error(`Issuer setup failed: ${response.status} ${await response.text()}`); return response;
}
async function createUser(issuer: string, prefix: string) {
  const username = issuer === personalIssuer ? `+201${String(randomBytes(4).readUInt32BE(0) % 1_000_000_000).padStart(9, '0')}` : `${prefix}-${randomUUID().slice(0, 8)}`;
  const response = await issuerAdmin(issuer, '', { method: 'POST', body: JSON.stringify({ username, email: `${username}@example.test`, enabled: true, emailVerified: true, firstName: 'Phase', lastName: 'TwentyNine', credentials: [{ type: 'password', value: secrets.password, temporary: false }] }) });
  const subject = response.headers.get('location')!.split('/').at(-1)!; users.push({ issuer, subject, username }); return { username, subject };
}

const personalUser = await createUser(personalIssuer, 'p29-personal'), companyUser = await createUser(companyIssuer, 'p29-company');
const db = await createTestDatabase(); await prepareAccessFixture(db.pool, companyIssuer, undefined, { personal: { issuer: personalIssuer, subject: personalUser.subject } });
const personalPrincipal = { kind: 'account' as const, issuer: personalIssuer, subject: personalUser.subject };
await intake(db.pool, 0, 'عميلة بدون تحصيل', personalPrincipal);
const optional = command('task.createIndependent', { recipientName: 'عميل بتحصيل اختياري', recipientPhone: '01012345678', destination: { kind: 'confirmed-pin', coordinates: { latitude: 30.06, longitude: 31.25 } }, collectionAmount: { amountMinor: 12550, currency: 'EGP', exponent: 2 } });
await new IndependentIntakeService(db.pool).create(personalPrincipal, optional);
await draft(db.pool, 0, { plannedStartAt: new Date(Date.now() + 60_000).toISOString() }, personalPrincipal);
const engine = await providerFixture(); await runPlanningOnce(db.pool, engine.engine);

const company = await companyPlanningFixture(db, { issuer: companyIssuer, driverSubject: companyUser.subject });
if (process.env.TAWSEL_REPLAY_FIXTURE === '1') {
  const grant = await send(company.app, company.source.token, company.source.command('role.defineCapabilities', { externalId: 'role', sourceRevision: 2, name: 'Driver', capabilities: ['execution.own', 'correction.own'] }));
  if (grant.statusCode !== 200) throw new Error('Replay fixture correction capability failed');
}
await company.task('ordinary-delivery', 'ordinary', 'held'); await company.save(); await runPlanningOnce(db.pool, engine.engine);
const auth = { origin: 'http://localhost:5173', encryptionKey: randomBytes(32), sessionSeconds: 28800, issuers: { company: { issuer: companyIssuer, clientId: 'tawsel-web', clientSecret: secrets.company }, personal: { issuer: personalIssuer, clientId: 'tawsel-web', clientSecret: secrets.personal } } };
const app = buildApp(createDatabasePool(db.config), auth);
app.get('/__fixture/info', async () => ({ personalUser: personalUser.username, companyUser: companyUser.username, password: secrets.password, companyCode: company.source.code, personalDriverId: ids.personalDriver, companyDriverId: company.driverId }));
app.get('/__fixture/state', async () => ({
  rounds: (await db.pool.query('SELECT driver_id,round_id,owner_device_id,device_generation FROM tawsel.rounds ORDER BY started_at')).rows,
  outcomes: (await db.pool.query("SELECT task_id,attempt_id,outcome,record->'arrival' AS arrival,record->'collection' AS collection FROM tawsel.delivery_outcomes ORDER BY round_id,task_id")).rows,
  actions: (await db.pool.query("SELECT operation_id,action_id,business_status FROM tawsel.command_identities WHERE operation_id LIKE 'current.%' OR operation_id LIKE 'outcome.%' OR operation_id='device.takeOver' ORDER BY received_at")).rows,
  history: (await db.pool.query('SELECT round_id,revision,operation_id,current_activity FROM tawsel.current_activity_history ORDER BY round_id,revision')).rows
}));
await app.listen({ host: '127.0.0.1', port: 3029 });
const stopFile = '.local/phase-29-browser.stop'; if (existsSync(stopFile)) await unlink(stopFile);
let stopped = false; process.once('SIGTERM', () => { stopped = true; }); process.once('SIGINT', () => { stopped = true; });
console.log('P29 real-API delivery harness ready on 3029.');
try { while (!stopped && !existsSync(stopFile)) await new Promise(resolve => setTimeout(resolve, 200)); }
finally { await app.close(); await company.close(); await engine.close(); await db.close(); for (const user of users) await issuerAdmin(user.issuer, `/${user.subject}`, { method: 'DELETE' }); if (existsSync(stopFile)) await unlink(stopFile); }
