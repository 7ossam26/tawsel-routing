import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { ActionEnvelope } from '../../src/commands/kernel.js';
import { hash } from '../../src/auth/crypto.js';

export const operatorToken = 'a'.repeat(64);
export function credential() {
  const credentialId = randomUUID(), secret = randomBytes(32).toString('hex');
  return { token: `twp_${credentialId}.${secret}`, fields: { credentialId, secretHash: hash(secret), expiresAt: new Date(Date.now() + 86400_000).toISOString() } };
}
export function provisioningCommand(tenantId: string, integrationId: string, operationId: string, payload: object): ActionEnvelope {
  return { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId,
    context: { kind: 'integration', tenantId, integrationId }, resources: {}, baseVersions: {}, dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } }, payload: { ...payload } };
}
export const send = (app: FastifyInstance, token: string, command: ActionEnvelope) => app.inject({ method: 'POST',
  url: `/api/v1/provisioning/commands/${command.operationId}`, headers: { authorization: `Bearer ${token}` }, payload: command });
export async function bindSource(app: FastifyInstance, subjectIds: string[] = ['driver'], tenantId = randomUUID()) {
  const integrationId = randomUUID(), key = credential(), code = `P08-${randomUUID().slice(0, 8).toUpperCase()}`;
  const command = provisioningCommand(tenantId, integrationId, 'integration.bindSource', { externalId: 'erp', sourceRevision: 1, companyCode: code, displayName: 'P08 fixture', subjectIds, ...key.fields });
  const response = await send(app, operatorToken, command);
  if (response.statusCode !== 200) throw new Error(`Fixture source bind failed: ${response.body}`);
  return { tenantId, integrationId, token: key.token, code,
    command: (operationId: string, payload: object) => provisioningCommand(tenantId, integrationId, operationId, payload), bootstrapCommand: command };
}
