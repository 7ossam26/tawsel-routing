// Local fixture/operator tooling only. No Tawsel database access or Engine setup.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
const dir = '.local/provisioning';
await mkdir(dir, { recursive: true });
const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8'));
let setup;
try { setup = JSON.parse(await readFile(`${dir}/setup.json`, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  setup = { operatorToken: randomBytes(32).toString('hex'), tenantId: randomUUID(), integrationId: randomUUID(), credentialId: randomUUID(), secret: randomBytes(32).toString('hex'), password: `Local-${randomBytes(18).toString('hex')}!`, users: [] };
  await writeFile(`${dir}/setup.json`, JSON.stringify(setup, null, 2));
}
await writeFile('.env.provisioning.local', `TAWSEL_PROVISIONING_OPERATOR_TOKEN=${setup.operatorToken}\nTAWSEL_ISSUER_WORKER_CLIENT_ID=local-test-control\nTAWSEL_ISSUER_WORKER_CLIENT_SECRET=${secrets.control}\n`);
const issuer = 'http://localhost:8085/realms/tawsel-company';
const request = async (url, init) => {
  const r = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`Local issuer fixture setup failed (${r.status}); no fallback issuer used`);
  return r;
};
const token = await (await request(`${issuer}/protocol/openid-connect/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) })).json();
const usersUrl = 'http://localhost:8085/admin/realms/tawsel-company/users';
const headers = { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' };
for (let i = 0; i < 2; i++) {
  const username = `p08-${setup.integrationId.slice(0, 8)}-${i + 1}`;
  let users = await (await request(`${usersUrl}?${new URLSearchParams({ username, exact: 'true' })}`, { headers })).json();
  if (!users.length) {
    await request(usersUrl, { method: 'POST', headers, body: JSON.stringify({ username, enabled: true, emailVerified: true, firstName: 'Phase08', lastName: 'Local fixture', email: `${username}@example.test`, credentials: [{ type: 'password', value: setup.password, temporary: false }] }) });
    users = await (await request(`${usersUrl}?${new URLSearchParams({ username, exact: 'true' })}`, { headers })).json();
  }
  if (users.length !== 1 || !users[0].id) throw new Error('Ambiguous local issuer subject');
  setup.users[i] = { username, subject: users[0].id };
  await writeFile(`${dir}/setup.json`, JSON.stringify(setup, null, 2));
}
// Preserve the original immutable bootstrap/action envelope and consumer journal.
let consumer;
try { consumer = JSON.parse(await readFile(`${dir}/consumer.json`, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  consumer = { apiUrl: 'http://127.0.0.1:3001', tenantId: setup.tenantId, integrationId: setup.integrationId,
    token: `twp_${setup.credentialId}.${setup.secret}`, companyCode: 'P08LOCAL', users: setup.users,
    roleCapabilities: ['execution.own', 'monitor.read'], bootstrap: { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId: 'integration.bindSource',
      context: { kind: 'integration', tenantId: setup.tenantId, integrationId: setup.integrationId }, resources: {}, baseVersions: {}, dependsOnActionIds: [], observation: { observedAt: null, clock: { quality: 'unknown' } },
      payload: { externalId: 'erp', sourceRevision: 1, companyCode: 'P08LOCAL', displayName: 'شركة اختبار تكامل ERP', subjectIds: setup.users.map(u => u.subject), credentialId: setup.credentialId, secretHash: createHash('sha256').update(setup.secret).digest('hex'), expiresAt: new Date(Date.now() + 365 * 86400000).toISOString() } } };
  await writeFile(`${dir}/consumer.json`, JSON.stringify(consumer, null, 2));
}
console.log('Local issuer subjects and private operator/consumer files ready. Start the P08 API, then run provisioning:bootstrap and provisioning:demo. No passwords or tokens printed.');
