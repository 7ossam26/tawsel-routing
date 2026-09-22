// Public-consumer conformance; only the published HTTP client/types and config.
// No Tawsel database or application module is imported.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { provisioningClient, type ProvisioningCommand } from '../../packages/api-client/src/provisioning.js';
const config = JSON.parse(await readFile(process.env.TAWSEL_PROVISIONING_CONFIG ?? '.local/provisioning/consumer.json', 'utf8')) as { apiUrl: string; token: string; tenantId: string; integrationId: string };
const client = provisioningClient(config.apiUrl, config.token);
const discovery = await client.configuration();
assert.equal(discovery.status, 200); assert.ok('identity' in discovery.body);
assert.equal(discovery.body.identity.integrationId, config.integrationId);
assert.equal(discovery.body.identity.actorId, null); assert.equal(discovery.body.humanDelegation, false);
const externalId = `conformance-${randomUUID()}`;
const original: ProvisioningCommand = { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId: 'branch.provision',
  context: { kind: 'integration', tenantId: config.tenantId, integrationId: config.integrationId }, resources: {}, baseVersions: {}, dependsOnActionIds: [],
  observation: { observedAt: null, clock: { quality: 'unknown' } }, payload: { externalId, sourceRevision: 1, name: 'Isolated conformance branch', enabled: true, location: null } };
const first = await client.command(original), replay = await client.command(original);
assert.equal(first.status, 200); assert.deepEqual(first, replay);
const changed = await client.command({ ...original, payload: { ...original.payload, name: 'Changed under same action' } });
assert.equal(changed.status, 409);
const forged = structuredClone(original) as ProvisioningCommand & { context: { assertedActorId?: string } };
forged.context.assertedActorId = randomUUID();
assert.equal((await client.command(forged)).status, 400);
assert.equal((await client.command({ ...original, context: { ...original.context, integrationId: randomUUID() } })).status, 403);
const disabled: ProvisioningCommand = { ...original, actionId: randomUUID(), operationId: 'branch.disable', payload: { externalId, sourceRevision: 2 } };
assert.equal((await client.command(disabled)).status, 200);
const stale = await client.command({ ...original, actionId: randomUUID() });
assert.equal(stale.status, 409); assert.ok('receipt' in stale.body); assert.equal(stale.body.receipt.problem?.code, 'stale_revision');
const status = await client.status('branch', externalId);
assert.equal(status.status, 200); assert.ok('sourceRevision' in status.body); assert.equal(status.body.sourceRevision, 2);
assert.equal((await client.status('branch', randomUUID())).status, 404);
console.log('PASS: public HTTP discovery, command replay/conflict, forged actor/wrong-source denial, versioned disable/stale rejection and scoped status. Created conformance branch remains disabled.');
