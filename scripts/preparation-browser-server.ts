/** P28 private acceptance harness: actual local Keycloak, real HTTP/PostgreSQL,
 * public/browser contracts and controlled Engine HTTP. Fixture controls are
 * registered only here and never in the production application. */
import { existsSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture, ids } from '../apps/api/test/support/access-fixture.js';
import { companyPlanningFixture } from '../apps/api/test/support/planning-company-fixture.js';
import { command, draft, intake, providerFixture } from '../apps/api/test/support/planning-fixture.js';
import { IndependentIntakeService } from '../apps/api/src/b2c-intake/service.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';
import { buildApp } from '../apps/api/src/app.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';

const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8')) as { control: string; company: string; personal: string; password: string };
const companyIssuer = 'http://localhost:8085/realms/tawsel-company';
const personalIssuer = 'http://localhost:8085/realms/tawsel-personal';
const users: { issuer: string; subject: string; username: string }[] = [];

async function issuerAdmin(issuer: string, path = '', init: RequestInit = {}) {
  const token = await fetch(`${issuer}/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) });
  if (!token.ok) throw new Error(`Actual local Keycloak is required (${issuer}, ${token.status}).`);
  const access = await token.json() as { access_token: string };
  const response = await fetch(`${issuer.replace('/realms/', '/admin/realms/')}/users${path}`, { ...init, headers: { authorization: `Bearer ${access.access_token}`, 'content-type': 'application/json' } });
  if (!response.ok) throw new Error(`Issuer setup failed: ${response.status} ${await response.text()}`);
  return response;
}
async function createUser(issuer: string, prefix: string) {
  const username = issuer === personalIssuer ? `+201${String(randomBytes(4).readUInt32BE(0) % 1_000_000_000).padStart(9, '0')}` : `${prefix}-${randomUUID().slice(0, 8)}`;
  const response = await issuerAdmin(issuer, '', { method: 'POST', body: JSON.stringify({ username, email: `${username}@example.test`, enabled: true, emailVerified: true, firstName: 'Phase', lastName: 'TwentyEight', credentials: [{ type: 'password', value: secrets.password, temporary: false }] }) });
  const subject = response.headers.get('location')!.split('/').at(-1)!;
  users.push({ issuer, subject, username }); return { username, subject };
}

const personalUser = await createUser(personalIssuer, 'p28-personal');
const companyUser = await createUser(companyIssuer, 'p28-company');
const db = await createTestDatabase();
await prepareAccessFixture(db.pool, companyIssuer, undefined, { personal: { issuer: personalIssuer, subject: personalUser.subject } });
const personalPrincipal = { kind: 'account' as const, issuer: personalIssuer, subject: personalUser.subject };

await intake(db.pool, 0, 'عميلة جاهزة', personalPrincipal);
const unresolved = command('task.createIndependent', { recipientName: 'عميل يحتاج موقعًا', recipientPhone: '01012345678', destination: { kind: 'address', addressText: '١٢ شارع التحرير' } });
await new IndependentIntakeService(db.pool).create(personalPrincipal, unresolved);
await draft(db.pool, 0, { plannedStartAt: new Date(Date.now() + 60_000).toISOString() }, personalPrincipal);
const engine = await providerFixture(); await runPlanningOnce(db.pool, engine.engine);

const company = await companyPlanningFixture(db, { issuer: companyIssuer, driverSubject: companyUser.subject });
await company.task('held-one', 'ordinary', 'held');
await company.task('prepared-one', 'ordinary', 'prepared');
await company.save(); await runPlanningOnce(db.pool, engine.engine);

const auth = { origin: 'http://localhost:5173', encryptionKey: randomBytes(32), sessionSeconds: 28800, issuers: { company: { issuer: companyIssuer, clientId: 'tawsel-web', clientSecret: secrets.company }, personal: { issuer: personalIssuer, clientId: 'tawsel-web', clientSecret: secrets.personal } } };
const app = buildApp(createDatabasePool(db.config), auth);
app.get('/__fixture/info', async () => ({ personalUser: personalUser.username, companyUser: companyUser.username, password: secrets.password, companyCode: company.source.code, personalDriverId: ids.personalDriver, companyDriverId: company.driverId }));
app.post('/__fixture/personal-stale', async () => {
  await intake(db.pool, 2, 'مهمة أضيفت بعد المعاينة', personalPrincipal);
  await runPlanningOnce(db.pool, engine.engine);
  return { state: 'new-ready-plan', evidence: 'real committed intake and controlled Engine HTTP' };
});
app.post('/__fixture/company-engine-failure', async () => {
  await company.task(`engine-failure-${randomUUID().slice(0, 6)}`, 'ordinary', 'held');
  const failure = await providerFixture({ status: 503 });
  try { await runPlanningOnce(db.pool, failure.engine, { maxAttempts: 1 }); } finally { await failure.close(); }
  return { state: 'failed', evidence: 'API/database available; controlled Engine HTTP returned 503' };
});
app.get('/__fixture/state', async () => ({ rounds: (await db.pool.query('SELECT driver_id,round_id,first_plan_id,action_id FROM tawsel.rounds ORDER BY started_at')).rows, actions: (await db.pool.query("SELECT operation_id,action_id,business_status FROM tawsel.command_identities WHERE operation_id IN ('round.start','planning.setManualOrder') ORDER BY received_at")).rows, jobs: (await db.pool.query('SELECT driver_id,status,attempts,last_error FROM tawsel.planning_jobs ORDER BY created_at')).rows }));
await app.listen({ host: '127.0.0.1', port: 3028 });
await writeFile('.local/phase-28-browser.json', JSON.stringify({ personalUser: personalUser.username, companyUser: companyUser.username, password: secrets.password, companyCode: company.source.code }));
const stopFile = '.local/phase-28-browser.stop'; if (existsSync(stopFile)) await unlink(stopFile);
let stopped = false; process.once('SIGTERM', () => { stopped = true; }); process.once('SIGINT', () => { stopped = true; });
console.log('P28 actual-Keycloak preparation harness ready on 3028.');
try { while (!stopped && !existsSync(stopFile)) await new Promise(resolve => setTimeout(resolve, 200)); }
finally { await app.close(); await company.close(); await engine.close(); await db.close(); for (const user of users) await issuerAdmin(user.issuer, `/${user.subject}`, { method: 'DELETE' }); if (existsSync('.local/phase-28-browser.json')) await unlink('.local/phase-28-browser.json'); }
