// Standalone public consumer. Copy this example with src/{schema.d.ts,provisioning.ts}
// and supply API URL/scoped credentials; no backend, database or ERP internals.
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { provisioningClient, type ProvisioningCommand } from '../src/provisioning.js';
import type { components } from '../src/schema.js';
type Schemas = components['schemas'];
interface Config { apiUrl: string; tenantId: string; integrationId: string; token: string; companyCode: string; users: { subject: string; username: string }[]; roleCapabilities: Schemas['Capability'][]; bootstrap: Schemas['BindSourceCommand'] }
const path = process.env.TAWSEL_PROVISIONING_CONFIG ?? '.local/provisioning/consumer.json';
const config = JSON.parse(await readFile(path, 'utf8')) as Config;
const client = provisioningClient(config.apiUrl, config.token);
const mode = process.argv[2] ?? 'fixture';
const journalPath = `${path}.journal.json`;
const journal: Record<string, ProvisioningCommand> = await readFile(journalPath, 'utf8').then(s => JSON.parse(s) as Record<string, ProvisioningCommand>).catch((e: NodeJS.ErrnoException) => { if (e.code !== 'ENOENT') throw e; return {}; });
async function send(key: string, operationId: ProvisioningCommand['operationId'], payload: object) {
  if (!journal[key]) {
    journal[key] = { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId,
      context: { kind: 'integration', tenantId: config.tenantId, integrationId: config.integrationId }, resources: {}, baseVersions: {}, dependsOnActionIds: [],
      observation: { observedAt: null, clock: { quality: 'unknown' } }, payload } as ProvisioningCommand;
    // Persist intent before network. Lost response reruns the identical command.
    await writeFile(journalPath, JSON.stringify(journal, null, 2));
  }
  const response = await client.command(journal[key]);
  if (response.status !== 200 || !('receipt' in response.body) || response.body.receipt.businessStatus !== 'accepted') throw new Error(`Command ${key} not accepted (${response.status}); retain journal and inspect status`);
  console.log(`${key}: accepted`);
}
if (mode === 'bootstrap') {
  const operator = process.env.TAWSEL_PROVISIONING_OPERATOR_TOKEN;
  if (!operator) throw new Error('Operator token required for out-of-band bootstrap');
  const response = await provisioningClient(config.apiUrl, operator).command(config.bootstrap);
  if (response.status !== 200) throw new Error(`Bootstrap failed (${response.status})`);
  console.log('Operator source/subject reservation accepted. Use only the scoped service credential for ordinary provisioning.');
} else if (mode === 'fixture') {
  for (const externalId of ['cairo','giza']) await send(`branch-${externalId}`, 'branch.provision', { externalId, sourceRevision: 1, name: externalId === 'cairo' ? 'القاهرة' : 'الجيزة', enabled: true, location: null });
  await send('role', 'role.defineCapabilities', { externalId: 'driver-role', sourceRevision: 1, name: 'دور ERP قابل للتعديل', capabilities: config.roleCapabilities });
  for (const [index, user] of config.users.entries()) {
    const externalId = `driver-${index + 1}`;
    await send(externalId, 'user.provision', { externalId, sourceRevision: 1, subject: user.subject, roleExternalId: 'driver-role', branchExternalIds: ['cairo','giza'], enabled: true });
    await send(`${externalId}-reference`, 'driver.provisionReference', { externalId, sourceRevision: 1, userExternalId: externalId, enabled: true, profile: index ? 'motorcycle' : 'car', vehicleReference: `vehicle-${index + 1}` });
  }
  await send('exceptions', 'user.setCapabilityExceptions', { externalId: 'driver-1', sourceRevision: 2, exceptions: [{ capability: 'monitor.read', effect: 'deny' }, { capability: 'reports.read', effect: 'allow' }] });
  console.log('Two branches, configurable role, explicit exceptions and two driver references accepted. Issuer readiness is separate; run worker and status.');
} else if (mode === 'status') {
  for (let i = 1; i <= 2; i++) {
    const r = await client.status('user', `driver-${i}`);
    if (r.status !== 200) throw new Error(`Status denied (${r.status})`);
    console.log(JSON.stringify(r.body));
  }
} else if (mode === 'role-deny') {
  await send('role-deny', 'role.defineCapabilities', { externalId: 'driver-role', sourceRevision: 2, name: 'دور ERP قابل للتعديل', capabilities: ['monitor.read'] });
} else if (mode === 'disable') {
  await send('disable', 'user.disable', { externalId: 'driver-1', sourceRevision: 3 });
} else throw new Error('Supported modes: bootstrap, fixture, status, role-deny, disable');
