import { Returns } from '../apps/api/src/returns/service.js';
import { Closures } from '../apps/api/src/closure/service.js';
import { CurrentActivity } from '../apps/api/src/current/service.js';
import { send, operatorToken } from '../apps/api/test/support/provisioning-fixture.js';
import type { components } from '@tawsel/api-client';
/** P30 acceptance harness: real application routes, PostgreSQL and local
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
  const response = await issuerAdmin(issuer, '', { method: 'POST', body: JSON.stringify({ username, email: `${username}@example.test`, enabled: true, emailVerified: true, firstName: 'Phase', lastName: 'Thirty', credentials: [{ type: 'password', value: secrets.password, temporary: false }] }) });
  const subject = response.headers.get('location')!.split('/').at(-1)!; users.push({ issuer, subject, username }); return { username, subject };
}

const personalUser = await createUser(personalIssuer, 'p30-personal'), companyUser = await createUser(companyIssuer, 'p30-company');
const db = await createTestDatabase(); await prepareAccessFixture(db.pool, companyIssuer, undefined, { personal: { issuer: personalIssuer, subject: personalUser.subject } });
const personalPrincipal = { kind: 'account' as const, issuer: personalIssuer, subject: personalUser.subject };
await intake(db.pool, 0, 'عميلة بدون تحصيل', personalPrincipal);
const optional = command('task.createIndependent', { recipientName: 'عميل بتحصيل اختياري', recipientPhone: '01012345678', destination: { kind: 'confirmed-pin', coordinates: { latitude: 30.06, longitude: 31.25 } }, collectionAmount: { amountMinor: 12550, currency: 'EGP', exponent: 2 } });
await new IndependentIntakeService(db.pool).create(personalPrincipal, optional);
await draft(db.pool, 0, { plannedStartAt: new Date(Date.now() + 60_000).toISOString() }, personalPrincipal);
const engine = await providerFixture(); await runPlanningOnce(db.pool, engine.engine);

const company = await companyPlanningFixture(db, { issuer: companyIssuer, driverSubject: companyUser.subject });
const bootstrap = structuredClone(company.source.bootstrapCommand); bootstrap.actionId = randomUUID(); bootstrap.payload.sourceRevision = 3; bootstrap.payload.returnCapabilities = ['return.receive', 'return.dispose'];
if ((await send(company.app, operatorToken, bootstrap)).statusCode !== 200) throw new Error('return provisioning');
if ((await send(company.app, company.source.token, company.source.command('role.defineCapabilities', { externalId: 'role', sourceRevision: 2, name: 'Driver', capabilities: ['execution.own', 'correction.own'] }))).statusCode !== 200) throw new Error('driver provisioning');
const taskIds: Record<string, string> = {};
for (const [externalId, recipientName] of [['partial','عميل الجزئي'], ['paid','عميل الرفض'], ['unpaid','عميل الشحن'], ['future','عميل التأجيل']]) {
 const snapshot = { externalId, sourceDispatchCycleId: 'cycle', sourceRevision: 1, expectedSourceRevision: 0, sourceBranchExternalId: 'branch', recipientName, recipientPhone: '01012345678', destination: {kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24}}, splittingAllowed:true, allocation:'exact-outstanding-per-unit', lines:[{sourceLineId:'pieces',description:'قميص',quantity:3,unitDue:{amountMinor:10000,currency:'EGP',exponent:2}}],shippingDue:{amountMinor:5000,currency:'EGP',exponent:2},totalDue:{amountMinor:35000,currency:'EGP',exponent:2},priority:'ordinary' };
 const result = await company.post('intake.submitSnapshot', snapshot); taskIds[externalId!] = (result.json() as {response:{body:{tasks:{taskId:string}[]}}}).response.body.tasks[0]!.taskId;
 await company.post('assignment.receiveBatch', { driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId,sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}] });
}
 await company.save(); await runPlanningOnce(db.pool, engine.engine);
const auth = { origin: 'http://localhost:5173', encryptionKey: randomBytes(32), sessionSeconds: 28800, issuers: { company: { issuer: companyIssuer, clientId: 'tawsel-web', clientSecret: secrets.company }, personal: { issuer: personalIssuer, clientId: 'tawsel-web', clientSecret: secrets.personal } } };
const app = buildApp(createDatabasePool(db.config), auth);
app.get('/__fixture/info', async () => ({ personalUser: personalUser.username, companyUser: companyUser.username, password: secrets.password, companyCode: company.source.code, personalDriverId: ids.personalDriver, companyDriverId: company.driverId, taskIds }));
// Test-only orchestration uses production commands/public native ERP routes;
// no direct mutation of outcomes, receipts, capacity or closure facts.
async function driverCommand(tenantId: string, driverId: string, operationId: string, payload: Record<string,unknown>) {
 const row=(await db.pool.query('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 ORDER BY started_at DESC LIMIT 1',[tenantId,driverId])).rows[0];
 const value=command(operationId,payload);value.context={kind:'device',tenantId,accountId:row.owner_account_id,deviceId:row.owner_device_id,deviceGeneration:Number(row.device_generation),deviceSequence:1};return {row,value};
}
app.post('/__fixture/receive', async () => {
 const returns=new Returns(db.pool),group=(await returns.groups(company.principal)).groups[0]!;
 const item=group.items.find(item=>item.taskId===taskIds.partial)!;
 const {row,value}=await driverCommand(company.tenantId,company.driverId,'return.requestHandover',{});
 value.payload={roundId:row.round_id,sourceBranchId:group.sourceBranchId,items:[{taskId:item.taskId,dispatchCycleId:item.dispatchCycleId,outcomeId:item.outcomeId,sourceLineId:item.sourceLineId,quantity:1}]};
 const offered=await returns.request(company.principal,value);
 if(offered.receipt.businessStatus!=='accepted')throw new Error(JSON.stringify(offered.receipt));
 const request=(offered.response!.body as {request:components['schemas']['ReturnRequestView']}).request,part=request.items[0]!;
 const receipt=company.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:part.itemId,expectedRevision:part.revision,quantity:1}]});
 const accepted=await company.app.inject({method:'POST',url:'/api/v1/erp/returns/commands/return.confirmSubsetReceipt',headers:{authorization:`Bearer ${company.source.token}`},payload:receipt});
 if(accepted.statusCode!==200)throw new Error(accepted.body);return accepted.json();
});
app.post('/__fixture/capacity', async () => {
 const count=Number((await db.pool.query("SELECT count(*) n FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND driver_id=$2 AND state='remaining'",[company.tenantId,company.driverId])).rows[0].n);
 for(let i=count;i<50;i++)await company.task(`capacity-${i}`,'ordinary','held');return {remaining:50};
});
app.post('/__fixture/close-personal', async () => {
 const {row,value}=await driverCommand(ids.personalTenant,ids.personalDriver,'workday.end',{});
 const current=await new CurrentActivity(db.pool).read(personalPrincipal,row.round_id);
 value.payload={workdayId:row.workday_id,roundId:row.round_id,expectedActiveRoundId:row.round_id,expectedActivityRevision:current.revision,expectedCurrentAttemptId:current.currentActivity?.attemptId??null,currentAction:'require-none'};
 const result=await new Closures(db.pool).command(personalPrincipal,value);if(result.receipt.businessStatus!=='accepted')throw new Error(JSON.stringify(result.receipt));return result;
});
app.get('/__fixture/state', async () => ({
  rounds: (await db.pool.query('SELECT driver_id,round_id,owner_device_id,device_generation FROM tawsel.rounds ORDER BY started_at')).rows,
  outcomes: (await db.pool.query("SELECT task_id,attempt_id,revision,outcome,record->'arrival' AS arrival,record->'collection' AS collection FROM tawsel.delivery_outcomes ORDER BY round_id,task_id")).rows,
  actions: (await db.pool.query("SELECT operation_id,action_id,business_status FROM tawsel.command_identities WHERE operation_id LIKE 'current.%' OR operation_id LIKE 'outcome.%' OR operation_id LIKE 'task.%' OR operation_id LIKE 'return.%' ORDER BY received_at")).rows,
  history: (await db.pool.query('SELECT round_id,revision,operation_id,current_activity FROM tawsel.current_activity_history ORDER BY round_id,revision')).rows
}));
await app.listen({ host: '127.0.0.1', port: 3030 });
const stopFile = '.local/phase-30-browser.stop'; if (existsSync(stopFile)) await unlink(stopFile);
let stopped = false; process.once('SIGTERM', () => { stopped = true; }); process.once('SIGINT', () => { stopped = true; });
console.log('P30 real-API delivery harness ready on 3030.');
try { while (!stopped && !existsSync(stopFile)) await new Promise(resolve => setTimeout(resolve, 200)); }
finally { await app.close(); await company.close(); await engine.close(); await db.close(); for (const user of users) await issuerAdmin(user.issuer, `/${user.subject}`, { method: 'DELETE' }); if (existsSync(stopFile)) await unlink(stopFile); }
