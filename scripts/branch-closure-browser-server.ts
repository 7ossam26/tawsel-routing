/** P31 isolated acceptance: real local identity, API, two databases and native ERP.
 * Routing is controlled HTTP; initial source/identity setup is labelled fixture. */
import { existsSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture, ids } from '../apps/api/test/support/access-fixture.js';
import { companyPlanningFixture } from '../apps/api/test/support/planning-company-fixture.js';
import { draft, intake, providerFixture } from '../apps/api/test/support/planning-fixture.js';
import { send, operatorToken } from '../apps/api/test/support/provisioning-fixture.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';
import { buildApp } from '../apps/api/src/app.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { createReceiverDatabase } from './mock-erp-database.js';
import { receiverProcess } from '../apps/mock-erp/test/support/process.js';
import { receiverWorker } from '../apps/api/test/support/receiver-harness.js';
import { saveSource, sourceEnvelope, sourceStatus } from '../apps/mock-erp/src/source.js';
import type { ReceiverConfig } from '../apps/mock-erp/src/config.js';

const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8')) as { control: string; company: string; personal: string; erp: string; password: string };
const companyIssuer = 'http://localhost:8085/realms/tawsel-company', personalIssuer = 'http://localhost:8085/realms/tawsel-personal';
const users: { issuer: string; subject: string; username: string }[] = [];
async function issuerAdmin(issuer: string, path = '', init: RequestInit = {}) {
  const token = await fetch(`${issuer}/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) });
  if (!token.ok) throw new Error('Actual local Keycloak required');
  const access = await token.json() as { access_token: string };
  const response = await fetch(`${issuer.replace('/realms/', '/admin/realms/')}/users${path}`, { ...init, headers: { authorization: `Bearer ${access.access_token}`, 'content-type': 'application/json' } });
  if (!response.ok) throw new Error(`Issuer setup failed: ${response.status}`); return response;
}
async function createUser(issuer: string, prefix: string) {
  const username = issuer === personalIssuer ? `+201${String(randomBytes(4).readUInt32BE(0) % 1_000_000_000).padStart(9, '0')}` : `${prefix}-${randomUUID().slice(0, 8)}`;
  const response = await issuerAdmin(issuer, '', { method: 'POST', body: JSON.stringify({ username, email: `${username}@example.test`, enabled: true, emailVerified: true, firstName: 'Phase31', lastName: prefix, credentials: [{ type: 'password', value: secrets.password, temporary: false }] }) });
  const subject = response.headers.get('location')!.split('/').at(-1)!; const user = { issuer, username, subject }; users.push(user); return user;
}
const cleanup: (() => Promise<unknown>)[] = [];
try {
const personalUser = await createUser(personalIssuer, 'personal'), companyUser = await createUser(companyIssuer, 'driver'), staffUser = await createUser(companyIssuer, 'staff');
const db = await createTestDatabase(); cleanup.push(() => db.close()); await prepareAccessFixture(db.pool, companyIssuer, undefined, { personal: { issuer: personalIssuer, subject: personalUser.subject } });
const personalPrincipal = { kind: 'account' as const, issuer: personalIssuer, subject: personalUser.subject };
await intake(db.pool, 0, 'عميل اليوم التالي', personalPrincipal); await intake(db.pool, 1, 'عميل غير منتهٍ', personalPrincipal);
await draft(db.pool, 0, { plannedStartAt: new Date(Date.now() + 60_000).toISOString() }, personalPrincipal);
const engine = await providerFixture(); cleanup.push(() => engine.close()); await runPlanningOnce(db.pool, engine.engine);
const company = await companyPlanningFixture(db, { issuer: companyIssuer, driverSubject: companyUser.subject });
cleanup.push(() => company.close());
const bootstrap = structuredClone(company.source.bootstrapCommand); bootstrap.actionId = randomUUID(); bootstrap.payload.sourceRevision = 3; bootstrap.payload.returnCapabilities = ['return.receive', 'return.dispose'];
if ((await send(company.app, operatorToken, bootstrap)).statusCode !== 200) throw new Error('return provisioning');
const taskIds: Record<string, string> = {};
for (const [externalId, recipientName] of [['return', 'عميل المرتجع'], ['continue', 'العميل المتوقف'], ['next', 'عميل اليوم التالي']]) {
  const snapshot = { externalId, sourceDispatchCycleId: 'cycle', sourceRevision: 1, expectedSourceRevision: 0, sourceBranchExternalId: 'branch', recipientName, recipientPhone: '01012345678', destination: { kind: 'confirmed-pin', coordinates: { latitude: 30.05, longitude: 31.24 } }, splittingAllowed: true, allocation: 'exact-outstanding-per-unit', lines: [{ sourceLineId: 'pieces', description: 'قميص', quantity: 3, unitDue: { amountMinor: 10000, currency: 'EGP', exponent: 2 } }], shippingDue: { amountMinor: 5000, currency: 'EGP', exponent: 2 }, totalDue: { amountMinor: 35000, currency: 'EGP', exponent: 2 }, priority: 'ordinary' };
  const result = await company.post('intake.submitSnapshot', snapshot); taskIds[externalId!] = (result.json() as { response: { body: { tasks: { taskId: string }[] } } }).response.body.tasks[0]!.taskId;
  await company.post('assignment.receiveBatch', { driverExternalId: 'policy-driver', receiptAsserted: true, items: [{ externalId, sourceDispatchCycleId: 'cycle', expectedSourceRevision: 1, expectedAssignmentRevision: 0, assignmentRevision: 1 }] });
}
const auth = { origin: 'http://localhost:5173', encryptionKey: randomBytes(32), sessionSeconds: 28800, issuers: { company: { issuer: companyIssuer, clientId: 'tawsel-web', clientSecret: secrets.company }, personal: { issuer: personalIssuer, clientId: 'tawsel-web', clientSecret: secrets.personal } } };
const app = buildApp(createDatabasePool(db.config), auth, { issuer: companyIssuer, operatorToken }); cleanup.push(() => app.close());
let ready = false;
app.get('/__fixture/info', async (_request, reply) => ready ? { personalUser: personalUser.username, companyUser: companyUser.username, staffUser: staffUser.username, password: secrets.password, companyCode: company.source.code, personalDriverId: ids.personalDriver, companyDriverId: company.driverId, taskIds } : reply.code(503).send({ ready: false }));
app.get('/__fixture/state', async () => ({ rounds: (await db.pool.query('SELECT driver_id,round_id,workday_id,owner_device_id,device_generation,ended_at FROM tawsel.rounds ORDER BY started_at')).rows, actions: (await db.pool.query("SELECT operation_id,action_id,business_status FROM tawsel.command_identities WHERE operation_id LIKE 'branch.%' OR operation_id LIKE 'return.%' OR operation_id IN ('device.takeOver','round.end','workday.end') ORDER BY received_at")).rows }));
await app.listen({ host: '127.0.0.1', port: 3031 });
const erp = await createReceiverDatabase(); cleanup.push(() => erp.close());
const config: ReceiverConfig = { tenantId: company.tenantId, integrationId: company.source.integrationId, host: '127.0.0.1', port: 5191, testLoopback: true, statusToken: randomBytes(32).toString('hex'), keys: [{ keyId: 'p31', secret: randomBytes(32).toString('hex') }], tawselBaseUrl: 'http://127.0.0.1:3031', tawselAuthorization: `Bearer ${company.source.token}`, native: { privateTestOnly: true, origin: 'http://localhost:5191', issuer: companyIssuer, clientId: 'erp-reference', clientSecret: secrets.erp, sessionKey: randomBytes(32).toString('hex'), adminSubjects: [staffUser.subject] } };
const receiver = await receiverProcess(erp.url, config); cleanup.push(() => receiver.close());
const worker = await receiverWorker(erp.url, config, { mode: 'source-worker' }); cleanup.push(() => worker.close());
// Public source commands populate native selectors; no receipt/custody row seeding.
for (const [kind, operationId, payload] of [
  ['branch', 'branch.provision', { externalId: 'branch', sourceRevision: 2, name: 'فرع المصدر', enabled: true, location: { latitude: 30.1, longitude: 31.3 } }],
  ['driver', 'driver.provisionReference', { externalId: 'policy-driver', sourceRevision: 2, userExternalId: 'policy-driver', enabled: true, profile: 'bicycle', vehicleReference: null }]
] as const) {
  const command = sourceEnvelope(config, operationId, payload); await saveSource(erp.pool, config, staffUser.subject, { command, records: [{ kind, externalId: payload.externalId, expectedRevision: 0, desired: { ...payload } }] });
}
const deadline = Date.now() + 30_000;
while (true) { const state = await sourceStatus(erp.pool); if (state.commands.length === 2 && state.commands.every(c => c.status === 'accepted')) break; if (Date.now() > deadline) throw new Error(`Native source setup not accepted: ${JSON.stringify(state.commands.map(c => ({status:c.status,error:c.last_error})))}`); await new Promise(resolve => setTimeout(resolve, 200)); }
await company.save(); await runPlanningOnce(db.pool, engine.engine);
ready = true;
const stopFile = '.local/phase-31-browser.stop'; if (existsSync(stopFile)) await unlink(stopFile);
let stopped = false; process.once('SIGTERM', () => { stopped = true; }); process.once('SIGINT', () => { stopped = true; });
console.log('P31 real-API/native-ERP harness ready on 3031.');
while (!stopped && !existsSync(stopFile)) { await runPlanningOnce(db.pool, engine.engine); await new Promise(resolve => setTimeout(resolve, 200)); }
} finally { for (const close of cleanup.reverse()) await close(); for (const user of users) await issuerAdmin(user.issuer, `/${user.subject}`, { method: 'DELETE' }); if (existsSync('.local/phase-31-browser.stop')) await unlink('.local/phase-31-browser.stop'); }
