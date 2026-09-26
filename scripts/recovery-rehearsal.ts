/** Windows-only destructive-fault rehearsal confined to a fresh, ACL-protected
 * temporary directory and clusters created here. Never accepts a database URL. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, readdir, stat, writeFile } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { Pool } from 'pg';
import Fastify from 'fastify';
import { chromium } from '@playwright/test';
import { prepareOutboxBusiness } from './outbox-demo.js';
import { createReceiverDatabase } from './mock-erp-database.js';
import { receiverProcess } from '../apps/mock-erp/test/support/process.js';
import { senderProcess } from '../apps/api/test/support/receiver-harness.js';
import { OutboxClient } from '@tawsel/api-client/outbox';
import { runOutboxOnce } from '../apps/api/src/outbox/worker.js';
import { applyInboxOnce } from '../apps/mock-erp/src/projection.js';
import { authRoutes } from '../apps/api/src/auth/routes.js';
import { outcomeRoutes } from '../apps/api/src/outcomes/routes.js';
import { parseAuthConfig } from '../apps/api/src/auth/config.js';
import { protect, recover, readProtected } from './recovery-store.js';
import { checkReceiver } from '../tests/erp-conformance/receiver.js';

async function command(binary: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return new Promise<string>((yes, no) => {
    const child = spawn(binary, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', b => output += String(b)); child.stderr.on('data', b => output += String(b));
    child.once('error', no); child.once('exit', code => code === 0 ? yes(output.trim()) : no(new Error(`${binary.split(/[\\/]/).at(-1)} failed (${code}); inspect private rehearsal logs`)));
  });
}
async function freePort() {
  const s = createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening');
  const port = (s.address() as { port: number }).port; await new Promise<void>(r => s.close(() => r())); return port;
}
async function waitFor(check: () => Promise<boolean>, name: string, limit = 60000) {
  const deadline = Date.now() + limit;
  while (Date.now() < deadline) { if (await check()) return; await setTimeout(250); }
  throw new Error(`Timed out: ${name}`);
}
if (process.platform !== 'win32') throw new Error('This rehearsal uses Windows ACLs and native PostgreSQL; see recovery runbook for target requirements');
const pgBin = process.env.TAWSEL_RECOVERY_PG_BIN ?? 'C:/Program Files/PostgreSQL/18/bin';
const installation = resolve('.local/identity/keycloak-26.7.4');
const root = await mkdtemp(join(process.env.LOCALAPPDATA!, 'TawselRecovery-'));
assert.match(root, /^[a-zA-Z0-9:/\\_. -]+$/, 'PostgreSQL requires an ASCII local path in this Windows setup');
const who = JSON.parse(await command('powershell.exe', ['-NoProfile', '-Command', '[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value | ConvertTo-Json'])) as string;
await command('icacls.exe', [root, '/inheritance:r', '/grant:r', `*${who}:(OI)(CI)F`]);
const p = (name: string) => join(root, name), slash = (s: string) => s.replaceAll('\\', '/');
const java = p('jdk/bin/java.exe');
for (const dir of ['primary', 'archive', 'base', 'vault', 'restore']) await mkdir(p(dir));
await writeFile(p('rehearsal.json'), JSON.stringify({ id: randomUUID(), scope: 'disposable-local-only', createdAt: new Date().toISOString() }));
const keyPath = p('recovery.key'); await writeFile(keyPath, randomBytes(32));
const password = randomBytes(32).toString('hex'); await writeFile(p('password'), password);
const primaryPort = await freePort(), restorePort = await freePort(), issuerPort = await freePort(), apiPort = await freePort();
const pgEnv = { ...process.env, PGPASSWORD: password }, pg = (name: string, args: string[]) => command(join(pgBin, `${name}.exe`), args, pgEnv);
const connect = (port: number, database = 'postgres') => `postgresql://rehearsal:${password}@127.0.0.1:${port}/${database}?sslmode=disable`;
const storeScript = p('recovery-store.ts'); await cp(resolve('scripts/recovery-store.ts'), storeScript);
const archiveCommand = `"${slash(process.execPath)}" "${slash(storeScript)}" archive "%p" "${slash(p('archive'))}/%f.enc" "${slash(keyPath)}"`;
const restoreCommand = `"${slash(process.execPath)}" "${slash(storeScript)}" restore "${slash(p('archive'))}/%f.enc" "%p" "${slash(keyPath)}"`;
const confString = (s: string) => `'${s.replaceAll("'", "''")}'`;
const report: Record<string, unknown> = { startedAt: new Date().toISOString(), destinationClass: 'same-host-local-filesystem', separateFailureDomain: false, root, node: process.version, keycloak: '26.7.4', targets: { rpoSeconds: 900, rtoSeconds: 14400 }, liveReadiness: false };
let primaryRunning = false, restoredRunning = false, issuerChild: ChildProcess | undefined;
let admin: Pool | undefined, restoredAdmin: Pool | undefined;
let business: Awaited<ReturnType<typeof prepareOutboxBusiness>> | undefined;
let consumer: Awaited<ReturnType<typeof createReceiverDatabase>> | undefined;
let receiver: Awaited<ReturnType<typeof receiverProcess>> | undefined;
let sender: Awaited<ReturnType<typeof senderProcess>> | undefined;
let restoredApp: Pool | undefined, restoredConsumer: Pool | undefined;
let api: ReturnType<typeof Fastify> | undefined;
let activeBrowser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let sourceDetached = false;
let kcHome = p('keycloak');
const issuerOrigin = `http://127.0.0.1:${issuerPort}`, origin = `http://localhost:${apiPort}`;
const subject = randomUUID(), loginPassword = `Rehearsal-${randomBytes(20).toString('hex')}`, clientSecret = randomBytes(32).toString('hex');
const authEnv = { TAWSEL_ORIGIN: origin, TAWSEL_SESSION_KEY: randomBytes(32).toString('hex'), TAWSEL_COMPANY_ISSUER: `${issuerOrigin}/realms/recovery-company`, TAWSEL_COMPANY_CLIENT_ID: 'tawsel-web', TAWSEL_COMPANY_CLIENT_SECRET: clientSecret, TAWSEL_PERSONAL_ISSUER: `${issuerOrigin}/realms/recovery-personal`, TAWSEL_PERSONAL_CLIENT_ID: 'tawsel-web', TAWSEL_PERSONAL_CLIENT_SECRET: clientSecret };
async function stopIssuer() {
  if (issuerChild && issuerChild.exitCode === null) { const done = once(issuerChild, 'exit'); issuerChild.kill(); await done; }
  issuerChild = undefined;
}
async function startIssuer(port: number, initial: boolean) {
  const env = { ...process.env, KC_DB: 'postgres', KC_DB_URL: `jdbc:postgresql://127.0.0.1:${port}/recovery_identity`, KC_DB_USERNAME: 'recovery_identity', KC_DB_PASSWORD: password };
  const args = ['-Xms128m', '-Xmx512m', '-Djava.util.concurrent.ForkJoinPool.common.threadFactory=io.quarkus.bootstrap.forkjoin.QuarkusForkJoinWorkerThreadFactory', `-Dkc.home.dir=${kcHome}`, `-Djboss.server.config.dir=${join(kcHome, 'conf')}`, `-Dkeycloak.theme.dir=${join(kcHome, 'themes')}`, '-cp', join(kcHome, 'lib/quarkus-run.jar'), 'io.quarkus.bootstrap.runner.QuarkusEntryPoint', 'start-dev', '--http-host=127.0.0.1', `--http-port=${issuerPort}`, `--hostname=${issuerOrigin}`, '--cache=local', ...(initial ? ['--import-realm'] : [])];
  const start = (built: boolean) => {
    const child = spawn(java, [...(built ? ['-Dkc.config.built=true'] : []), ...args], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; child.stdout!.on('data', b => log += String(b)); child.stderr!.on('data', b => log += String(b));
    child.once('exit', () => { void writeFile(p(`issuer-${port}-${built}.log`), log); }); return child;
  };
  issuerChild = start(false);
  await waitFor(async () => {
    if (issuerChild!.exitCode === 10) issuerChild = start(true);
    else if (issuerChild!.exitCode !== null) throw new Error('Issuer failed; inspect private issuer log');
    try { return (await fetch(`${authEnv.TAWSEL_COMPANY_ISSUER}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
  }, 'isolated Keycloak', 120000);
}
async function openApi(pool: Pool, env: NodeJS.ProcessEnv) {
  const config = parseAuthConfig(env), app = Fastify();
  await app.register(s => authRoutes(s, pool, config)); await app.register(s => outcomeRoutes(s, pool, config));
  app.get('/account', async () => 'Recovery checkpoint');
  await app.listen({ host: '127.0.0.1', port: apiPort }); return app;
}
async function login() {
  const browser = await chromium.launch({ headless: true });
  activeBrowser = browser;
  try {
    const context = await browser.newContext(), page = await context.newPage();
    context.setDefaultTimeout(30000); context.setDefaultNavigationTimeout(30000);
    const bootstrap = await context.request.get(`${origin}/api/session/bootstrap`); assert.equal(bootstrap.status(), 200);
    const csrf = (await bootstrap.json()).csrfToken as string;
    const begun = await context.request.post(`${origin}/api/session/login`, { headers: { origin, 'x-csrf-token': csrf }, data: { kind: 'company', companyCode: 'RECOVERY' } });
    assert.equal(begun.status(), 200); await page.goto((await begun.json()).authorizationUrl);
    await page.locator('#username').fill('recovery-driver'); await page.locator('#password').fill(loginPassword);
    await page.locator('#kc-login').click(); await page.waitForURL(`${origin}/account?kind=company`);
    const access = await context.request.get(`${origin}/api/session/context?kind=company`); assert.equal(access.status(), 200, `Recovered context: ${await access.text()}`);
    assert.equal((await access.json()).access.sourceId, business!.f.accountId);
    const read = await context.request.get(`${origin}/api/v1/outcomes/rounds/${business!.f.round.roundId}?kind=company`); assert.equal(read.status(), 200);
    return { browser, context, csrf, outcomes: await read.json() as unknown };
  } catch (error) { await browser.close(); throw error; }
}
try {
  report.postgres = await pg('postgres', ['--version']);
  assert.match(String(report.postgres), /PostgreSQL\) 18\./);
  await pg('initdb', ['-D', p('primary'), '-U', 'rehearsal', '--auth=scram-sha-256', `--pwfile=${p('password')}`, '--encoding=UTF8', '--locale=C']);
  await writeFile(p('primary/postgresql.auto.conf'), `listen_addresses='127.0.0.1'\nport=${primaryPort}\nwal_level=replica\narchive_mode=on\narchive_timeout=60\narchive_command=${confString(archiveCommand)}\n`);
  await pg('pg_ctl', ['-D', p('primary'), '-l', p('primary.log'), '-w', 'start']); primaryRunning = true;
  admin = new Pool({ connectionString: connect(primaryPort) });
  await admin.query('CREATE DATABASE tawsel_test_control'); await admin.query("COMMENT ON DATABASE tawsel_test_control IS 'tawsel:test-control:v1'");
  await admin.query(`CREATE ROLE recovery_identity LOGIN PASSWORD '${password}'`); await admin.query('CREATE DATABASE recovery_identity OWNER recovery_identity');
  process.env.TAWSEL_TEST_ADMIN_URL = connect(primaryPort, 'tawsel_test_control');
  // Copy installed binaries; never start/modify the existing issuer or its H2 data.
  await mkdir(kcHome); for (const dir of ['bin', 'lib', 'conf', 'providers', 'themes']) await cp(join(installation, dir), join(kcHome, dir), { recursive: true });
  await cp(resolve('.local/identity/jdk-25.0.4.1+1'), p('jdk'), { recursive: true });
  await mkdir(join(kcHome, 'data/import'), { recursive: true });
  for (const kind of ['company', 'personal']) {
    await writeFile(join(kcHome, `data/import/${kind}.json`), JSON.stringify({ realm: `recovery-${kind}`, enabled: true, sslRequired: 'none', registrationAllowed: false,
      clients: [{ clientId: 'tawsel-web', secret: clientSecret, enabled: true, protocol: 'openid-connect', publicClient: false, standardFlowEnabled: true, directAccessGrantsEnabled: false, redirectUris: [`${origin}/api/session/callback`], defaultClientScopes: ['basic', 'profile', 'email'],
        protocolMappers: [{ name: 'own-api-audience', protocol: 'openid-connect', protocolMapper: 'oidc-audience-mapper', config: { 'included.client.audience': 'tawsel-web', 'access.token.claim': 'true', 'id.token.claim': 'false', 'introspection.token.claim': 'true' } }],
        attributes: { 'pkce.code.challenge.method': 'S256' } }],
      users: kind === 'company' ? [{ id: subject, username: 'recovery-driver', enabled: true, emailVerified: true, email: 'recovery@example.test', firstName: 'Recovery', lastName: 'Fixture', credentials: [{ type: 'password', value: loginPassword, temporary: false }] }] : [] }));
  }
  await startIssuer(primaryPort, true);
  report.java = await command(java, ['--version']);
  await command('tar.exe', ['-cf', p('issuer-config.tar'), '-C', kcHome, 'conf', 'providers', 'themes']);
  await protect(p('issuer-config.tar'), p('vault/issuer-config.tar.enc'), keyPath);
  // A failed destination must be visible in the real archiver, not merely a unit test.
  const failedBefore = Number((await admin.query('SELECT failed_count FROM pg_stat_archiver')).rows[0].failed_count);
  const brokenCommand = archiveCommand.replace('/archive/', '/unavailable/');
  await admin.query(`ALTER SYSTEM SET archive_command = ${confString(brokenCommand)}`); await admin.query('SELECT pg_reload_conf()');
  await setTimeout(1100); await admin.query('SELECT pg_switch_wal()');
  await waitFor(async () => Number((await admin!.query('SELECT failed_count FROM pg_stat_archiver')).rows[0].failed_count) > failedBefore, 'observable archive failure');
  report.archiveFailureObserved = true;
  await admin.query(`ALTER SYSTEM SET archive_command = ${confString(archiveCommand)}`); await admin.query('SELECT pg_reload_conf()');
  await pg('pg_basebackup', ['-h', '127.0.0.1', '-p', String(primaryPort), '-U', 'rehearsal', '-D', p('base'), '-Ft', '-X', 'stream', '--checkpoint=fast']);
  for (const name of await readdir(p('base'))) await protect(p(`base/${name}`), p(`vault/${name}.enc`), keyPath);
  report.baseCompletedAt = new Date().toISOString();
  console.log('Checkpoint A: encrypted base backup and real archive failure/recovery observed; same-host storage only.');
  await writeFile(p('checkpoint-a.json'), JSON.stringify(report, null, 2));
  // These databases and all task/action/event records are committed AFTER the base.
  business = await prepareOutboxBusiness({ issuer: authEnv.TAWSEL_COMPANY_ISSUER, driverSubject: subject }); consumer = await createReceiverDatabase();
  await business.db.pool.query("INSERT INTO tawsel.company_login_codes VALUES ('RECOVERY',$1,'Recovery fixture')", [business.scope.tenantId]);
  const receiverConfig = { ...business.scope, keys: [business.key], statusToken: randomBytes(32).toString('hex'), host: '127.0.0.1', port: 0, testLoopback: true };
  receiver = await receiverProcess(consumer.url, receiverConfig);
  const senderConfig = { encryptionKey: randomBytes(32), keys: [{ ...business.scope, ...business.key }], destinations: [{ ...business.scope, url: `${receiver.url}/api/v1/consumer/events` }], testLoopback: true };
  sender = await senderProcess(business.db.url, senderConfig);
  const outbox = new OutboxClient({ baseUrl: sender.url, authorization: `Bearer ${business.f.source.token}` });
  const envelope = (op: string, payload: object) => business!.f.source.command(op, payload) as Parameters<OutboxClient['command']>[0];
  await outbox.command(envelope('integration.configureWebhook', { url: senderConfig.destinations[0]!.url, enabled: true, expectedRevision: 0 }));
  await outbox.command(envelope('integration.rotateSigningKey', { keyId: business.key.keyId, overlapSeconds: 300 }));
  await assert.rejects(runOutboxOnce(business.db.pool, senderConfig, { async afterSend() { throw new Error('response-loss'); } }), /response-loss/);
  const inboxBefore = (await consumer.pool.query('SELECT event_id,wire_body FROM mock_erp.inbox ORDER BY event_id')).rows;
  assert.equal(inboxBefore.length, 1); await applyInboxOnce(consumer.pool);
  api = await openApi(business.db.pool, authEnv); const beforeLogin = await login(); const knownOutcomes = beforeLogin.outcomes; await beforeLogin.browser.close(); await api.close(); api = undefined;
  const immutable = async (pool: Pool) => (await pool.query('SELECT to_jsonb(e) AS row FROM tawsel.command_identities e ORDER BY action_id')).rows;
  const evidence = await immutable(business.db.pool), queueBefore = await outbox.queue({ limit: 100 });
  assert(evidence.length > 10, 'Require actual committed command identities, hashes and receipts');
  const recoveryConfig = { authEnv, receiverConfig: { ...receiverConfig, port: Number(new URL(receiver.url).port) }, senderConfig: { ...senderConfig, encryptionKey: senderConfig.encryptionKey.toString('hex') }, appUrl: business.db.url, consumerUrl: consumer.url, authorization: `Bearer ${business.f.source.token}` };
  report.databaseBytes = (await admin.query("SELECT datname,pg_database_size(oid)::text AS bytes FROM pg_database WHERE datname NOT IN ('template0','template1','postgres') ORDER BY datname")).rows;
  await writeFile(p('configuration.json'), JSON.stringify(recoveryConfig)); await protect(p('configuration.json'), p('vault/configuration.enc'), keyPath);
  await stopIssuer(); await receiver.close(); receiver = undefined; await sender.close(); sender = undefined;
  const checkpointAt = new Date().toISOString();
  const target = 'tawsel_recovery_checkpoint';
  const lsn = (await admin.query('SELECT pg_create_restore_point($1) AS lsn', [target])).rows[0].lsn as string;
  const wal = (await admin.query('SELECT pg_walfile_name($1::pg_lsn) AS name', [lsn])).rows[0].name as string;
  await admin.query('SELECT pg_switch_wal()');
  await waitFor(async () => { try { await readProtected(p(`archive/${wal}.enc`), keyPath); return true; } catch { return false; } }, 'checkpoint archived', 90000);
  const archivedAt = new Date().toISOString();
  // Not included: proves named PITR actually stops, rather than booting a copy of live data.
  await admin.query('CREATE TABLE public.after_recovery_target(id int)');
  const laterWal = (await admin.query('SELECT pg_walfile_name(pg_current_wal_insert_lsn()) AS name')).rows[0].name as string;
  await admin.query('SELECT pg_switch_wal()');
  await waitFor(async () => { try { await readProtected(p(`archive/${laterWal}.enc`), keyPath); return true; } catch { return false; } }, 'post-target negative control archived', 90000);
  report.postTargetWalArchived = laterWal;
  report.backupObjects = await Promise.all((await readdir(p('vault'))).map(async name => ({ name, bytes: (await stat(p(`vault/${name}`))).size })));
  const incidentAt = new Date().toISOString(), recoveryStart = performance.now();
  await business.f.close(); await business.db.detach(); await consumer.detach(); sourceDetached = true;
  await admin.end(); admin = undefined;
  await pg('pg_ctl', ['-D', p('primary'), '-m', 'immediate', '-w', 'stop']); primaryRunning = false;
  // Restore from authenticated objects only into our fresh empty sibling directory.
  assert.deepEqual(await readdir(p('restore')), []);
  await recover(p('vault/base.tar.enc'), p('restore-base.tar'), keyPath);
  await recover(p('vault/pg_wal.tar.enc'), p('restore-wal.tar'), keyPath);
  await command('tar.exe', ['-xf', p('restore-base.tar'), '-C', p('restore')]);
  await command('tar.exe', ['-xf', p('restore-wal.tar'), '-C', p('restore/pg_wal')]);
  await recover(p('vault/backup_manifest.enc'), p('restore/backup_manifest'), keyPath);
  await pg('pg_verifybackup', [p('restore')]); report.baseVerified = true;
  await writeFile(p('restore/postgresql.auto.conf'), `listen_addresses='127.0.0.1'\nport=${restorePort}\narchive_mode=off\nrestore_command=${confString(restoreCommand)}\nrecovery_target_name='${target}'\nrecovery_target_action='promote'\n`);
  await writeFile(p('restore/recovery.signal'), '');
  await pg('pg_ctl', ['-D', p('restore'), '-l', p('restore.log'), '-w', 'start']); restoredRunning = true;
  restoredAdmin = new Pool({ connectionString: connect(restorePort) });
  // pg_ctl -w can return when hot standby is readable, before target promotion.
  await waitFor(async () => (await restoredAdmin!.query('SELECT pg_is_in_recovery() AS recovering')).rows[0].recovering === false, 'PITR promotion', 90000);
  assert.equal((await restoredAdmin.query("SELECT to_regclass('public.after_recovery_target') AS marker")).rows[0].marker, null);
  assert.equal((await restoredAdmin.query('SELECT pg_is_in_recovery() AS recovering')).rows[0].recovering, false);
  const recovered = JSON.parse((await readProtected(p('vault/configuration.enc'), keyPath)).toString()) as typeof recoveryConfig;
  const retarget = (url: string) => { const u = new URL(url); assert.equal(u.port, String(primaryPort)); u.port = String(restorePort); return u.href; };
  restoredApp = new Pool({ connectionString: retarget(recovered.appUrl) }); restoredConsumer = new Pool({ connectionString: retarget(recovered.consumerUrl) });
  assert.deepEqual(await immutable(restoredApp), evidence);
  assert.deepEqual((await restoredConsumer.query('SELECT event_id,wire_body FROM mock_erp.inbox ORDER BY event_id')).rows, inboxBefore);
  // Old sessions are deliberately revoked after point-in-time recovery; require fresh login.
  await restoredApp.query('UPDATE tawsel.web_sessions SET revoked=true');
  const recoveredHome = p('restored-keycloak'); await mkdir(recoveredHome);
  for (const dir of ['bin', 'lib']) await cp(join(kcHome, dir), join(recoveredHome, dir), { recursive: true });
  await recover(p('vault/issuer-config.tar.enc'), p('restore-issuer-config.tar'), keyPath);
  await command('tar.exe', ['-xf', p('restore-issuer-config.tar'), '-C', recoveredHome]);
  kcHome = recoveredHome;
  await startIssuer(restorePort, false); api = await openApi(restoredApp, recovered.authEnv);
  const afterLogin = await login(); assert.deepEqual(afterLogin.outcomes, knownOutcomes);
  const action = business.knownAction;
  assert(evidence.some(e => (e.row as { action_id: string; business_status: string }).action_id === action.actionId && e.row.business_status === 'accepted'));
  const recoveredAction = await afterLogin.context.request.get(`${origin}/api/v1/outcomes/actions/${action.actionId}?kind=company`); assert.equal(recoveredAction.status(), 200);
  const duplicate = await afterLogin.context.request.post(`${origin}/api/v1/outcomes/no-answer?kind=company`, { headers: { origin, 'x-csrf-token': afterLogin.csrf }, data: action });
  assert.equal(duplicate.status(), 200);
  assert.deepEqual(await duplicate.json(), (await recoveredAction.json()).result);
  assert.deepEqual(await immutable(restoredApp), evidence);
  // Expired credentials may not read recovered outcomes silently.
  await restoredApp.query("UPDATE tawsel.web_sessions SET expires_at=clock_timestamp()-interval '1 second'");
  const expired = await afterLogin.context.request.get(`${origin}/api/v1/outcomes/rounds/${business.f.round.roundId}?kind=company`); assert.equal(expired.status(), 401);
  await afterLogin.browser.close();
  receiver = await receiverProcess(retarget(recovered.consumerUrl), recovered.receiverConfig);
  const restoredSenderConfig = { ...recovered.senderConfig, encryptionKey: Buffer.from(recovered.senderConfig.encryptionKey, 'hex') };
  sender = await senderProcess(retarget(recovered.appUrl), restoredSenderConfig);
  const restoredOutbox = new OutboxClient({ baseUrl: sender.url, authorization: recovered.authorization });
  assert.deepEqual(await restoredOutbox.queue({ limit: 100 }), queueBefore);
  report.checkpoint = { checkpointAt, archivedAt, incidentAt, lsn, wal, actionId: action.actionId, roundId: business.f.round.roundId, eventId: inboxBefore[0].event_id, commandCount: evidence.length };
  report.loginAndCheckpointVerifiedAt = new Date().toISOString();
  console.log('Checkpoint B: WAL-only business checkpoint, real restored Keycloak login, outcome/action API and durable inbox match.');
  await writeFile(p('checkpoint-b.json'), JSON.stringify(report, null, 2));
  // Simulate only lease expiry (not a business row change). The checkpoint keeps
  // a received/applied inbox event whose sender never recorded the acknowledgement.
  await restoredApp.query("UPDATE tawsel.outbox_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE status='sending'");
  for (let n = 0; n < 100 && await runOutboxOnce(restoredApp, restoredSenderConfig); n++) { /* real signed HTTP */ }
  for (let n = 0; n < 100 && await applyInboxOnce(restoredConsumer); n++) { /* real durable projection */ }
  const queue = await restoredOutbox.queue({ limit: 100 }); assert.equal(queue.counts.pending + queue.counts.sending + queue.counts.failed, 0);
  const transitions = (await restoredConsumer.query('SELECT event_id FROM mock_erp.transitions ORDER BY event_id')).rows;
  assert.equal(transitions.length, queue.items.length); assert.equal(new Set(transitions.map(t => t.event_id)).size, transitions.length);
  assert.equal(transitions.filter(t => t.event_id === inboxBefore[0].event_id).length, 1);
  const aggregates = [...new Map(queue.items.map(i => [`${i.aggregate.type}/${i.aggregate.id}`, { type: i.aggregate.type, id: i.aggregate.id }])).values()];
  report.publicConformance = await checkReceiver({ apiUrl: sender.url, callbackUrl: `${receiver.url}/api/v1/consumer/events`, statusUrl: `${receiver.url}/api/v1/consumer/status`, authorization: recovered.authorization, statusAuthorization: `Bearer ${recovered.receiverConfig.statusToken}`, ...business.scope, signingKey: recovered.receiverConfig.keys[0]!, aggregates, expected: { deliveredPieces: 2, reportedMinor: 25000, receivedPieces: 1 } });
  await receiver.close(); receiver = await receiverProcess(retarget(recovered.consumerUrl), recovered.receiverConfig);
  await sender.close(); sender = await senderProcess(retarget(recovered.appUrl), restoredSenderConfig);
  assert.equal(await runOutboxOnce(restoredApp, restoredSenderConfig), false); assert.equal(await applyInboxOnce(restoredConsumer), false);
  assert.deepEqual((await restoredConsumer.query('SELECT event_id FROM mock_erp.transitions ORDER BY event_id')).rows, transitions);
  assert.deepEqual(await immutable(restoredApp), evidence);
  report.replay = { events: transitions.length, duplicateEffects: 0, senderRestart: true, receiverRestart: true, expiredSessionRejected: true, freshLogin: true };
  report.measured = { checkpointAgeAtIncidentSeconds: (Date.parse(incidentAt) - Date.parse(checkpointAt)) / 1000, archiveLagSeconds: (Date.parse(archivedAt) - Date.parse(checkpointAt)) / 1000, serviceRestoreSeconds: (performance.now() - recoveryStart) / 1000, lostKnownCommittedActions: 0 };
  report.completedAt = new Date().toISOString(); report.status = 'passed-local-only';
  console.log('Checkpoint C: restart/replay preserves one effect per event; expired sessions rejected. Local recovery passed.');
} catch (error) {
  report.status = 'failed'; report.failure = error instanceof Error ? error.message : 'Unknown failure';
  report.failureStack = error instanceof Error ? error.stack : undefined;
  console.error(`Rehearsal failed: ${String(report.failure)}`);
  process.exitCode = 1;
} finally {
  await activeBrowser?.close();
  await api?.close(); await receiver?.close(); await sender?.close(); await stopIssuer();
  await restoredApp?.end(); await restoredConsumer?.end(); await restoredAdmin?.end(); await admin?.end();
  if (!sourceDetached) { await business?.f.close(); await business?.db.detach(); await consumer?.detach(); }
  // Stop only clusters created in this invocation. Preserve files for inspection;
  // never recursively delete or drop restored/live databases during cleanup.
  if (restoredRunning) await pg('pg_ctl', ['-D', p('restore'), '-m', 'fast', '-w', 'stop']);
  if (primaryRunning) await pg('pg_ctl', ['-D', p('primary'), '-m', 'fast', '-w', 'stop']);
  await writeFile(p('report.json'), JSON.stringify(report, null, 2));
  await mkdir('.local', { recursive: true }); await writeFile('.local/phase-40-restore.json', JSON.stringify(report, null, 2));
  console.log(`Rehearsal report: .local/phase-40-restore.json (${String(report.status)})`);
  // All owned service teardown and report writes are awaited before returning
  // the observed status to the caller/scheduled-job wrapper.
}
process.exit(process.exitCode ?? 0);
