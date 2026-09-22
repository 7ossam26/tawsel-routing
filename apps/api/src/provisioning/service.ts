import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { withTransaction, type Transaction } from '../db/transaction.js';
import { executeCommandInTransaction, type ActionEnvelope, type Decision } from '../commands/kernel.js';
import { canonicalJson, payloadHash } from '../commands/json.js';
import { authenticateService, identityView, isOperator, unavailable, type ProvisioningConfig, type ServiceBinding } from './credentials.js';
import { operations, ProvisioningError, validateCommand, type ProvisioningOperation } from './schema.js';

type Payload = Record<string, unknown> & { externalId: string; sourceRevision: number };
export interface Projection { resource_id: string; source_revision: string; payload_hash: string; last_action_id: string; state: Record<string, unknown> }
export const sourceKey = (b: ServiceBinding) => [b.tenantId, b.integrationId];
export async function record(tx: Transaction, b: ServiceBinding, entity: string, externalId: string): Promise<Projection | undefined> {
  return (await tx.query<Projection>(`SELECT * FROM tawsel.provisioning_records
    WHERE tenant_id=$1 AND integration_id=$2 AND entity=$3 AND external_id=$4`, [...sourceKey(b), entity, externalId])).rows[0];
}
export async function saveRecord(tx: Transaction, b: ServiceBinding, entity: string, p: Payload, id: string, state: object, actionId: string, digest: string) {
  await tx.query(`INSERT INTO tawsel.provisioning_records
    (tenant_id,integration_id,entity,external_id,resource_id,source_revision,payload_hash,last_action_id,state)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT (tenant_id,integration_id,entity,external_id)
    DO UPDATE SET source_revision=$6,payload_hash=$7,last_action_id=$8,state=$9::jsonb`,
  [...sourceKey(b), entity, p.externalId, id, p.sourceRevision, digest, actionId, canonicalJson(state)]);
}
export function rejection(code: 'stale_revision' | 'idempotency_conflict' | 'dependency_missing' | 'forbidden_resource', actionId: string): Decision {
  const status = code === 'forbidden_resource' ? 403 : 409;
  const problem = { type: `https://schemas.tawsel.invalid/problems/${code.replaceAll('_', '-')}`, title: 'Provisioning command cannot be applied', code, status, correlationId: randomUUID(), actionId, retryable: false };
  return { status: 'rejected', problem, response: { status, body: problem }, summary: { code }, audit: { code } };
}
export function accepted(b: ServiceBinding, command: ActionEnvelope, entity: string, externalId: string, id: string, revision: number, issuerStatus: string, changed: boolean): Decision {
  const summary = { entity, externalId, resourceId: id, sourceRevision: revision, issuerStatus };
  return { status: 'accepted', resourceVersions: { sourceRevision: revision }, response: { status: 200, body: summary }, summary,
    audit: { ...summary, service: identityView(b), credentialId: b.credentialId, operator: b.operator, changed },
    intents: changed ? [{ eventId: randomUUID(), recipientId: b.integrationId, eventType: 'provisioning.changed', payloadVersion: '1.0.0',
      payload: { entity, externalId, resourceId: id, sourceRevision: revision, actionId: command.actionId, service: identityView(b) } }] : [] };
}
async function insertCredential(tx: Transaction, b: ServiceBinding, p: Payload) {
  const expires = new Date(p.expiresAt as string).getTime();
  if (expires <= Date.now() || expires > Date.now() + 366 * 86400_000) throw new ProvisioningError('validation_failed', 400, 'Credential expiry must be within one year');
  await tx.query(`INSERT INTO tawsel.service_credentials (credential_id,tenant_id,integration_id,secret_hash,expires_at)
    VALUES ($1,$2,$3,$4,$5)`, [p.credentialId, ...sourceKey(b), p.secretHash, p.expiresAt]);
}
async function bootstrap(tx: Transaction, command: ActionEnvelope, config: ProvisioningConfig): Promise<ServiceBinding> {
  const c = command.context;
  if (c.kind !== 'integration') throw unavailable();
  const b: ServiceBinding = { tenantId: c.tenantId, integrationId: c.integrationId, operator: true, credentialId: null };
  const p = command.payload as Payload;
  await tx.query('INSERT INTO tawsel.tenant_keys VALUES ($1) ON CONFLICT DO NOTHING', [b.tenantId]);
  await tx.query("INSERT INTO tawsel.tenants (tenant_id,kind) VALUES ($1,'company') ON CONFLICT DO NOTHING", [b.tenantId]);
  const tenant = await tx.query("SELECT kind,enabled FROM tawsel.tenants WHERE tenant_id=$1 FOR UPDATE", [b.tenantId]);
  if (tenant.rows[0]?.kind !== 'company' || !tenant.rows[0]?.enabled) throw unavailable();
  await tx.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'integration') ON CONFLICT DO NOTHING", sourceKey(b));
  await tx.query('INSERT INTO tawsel.integrations (tenant_id,integration_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', sourceKey(b));
  const existing = await tx.query('SELECT issuer FROM tawsel.provisioning_sources WHERE tenant_id=$1 AND integration_id=$2', sourceKey(b));
  if (existing.rows[0] && existing.rows[0].issuer !== config.issuer) throw unavailable();
  await tx.query('INSERT INTO tawsel.provisioning_sources VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [...sourceKey(b), config.issuer]);
  // No bootstrap reassignment of an existing company code or subject.
  const code = await tx.query('SELECT tenant_id FROM tawsel.company_login_codes WHERE code=$1', [p.companyCode]);
  if (code.rows[0] && code.rows[0].tenant_id !== b.tenantId) throw unavailable();
  return b;
}
export type DomainWriter = (tx: Transaction, b: ServiceBinding, command: ActionEnvelope) => Promise<Decision>;
export async function commandService(pool: Pool, config: ProvisioningConfig, authorization: string | undefined,
  operation: ProvisioningOperation, value: unknown, domain?: DomainWriter) {
  validateCommand(operation, value);
  const command = JSON.parse(canonicalJson(value)) as ActionEnvelope;
  return withTransaction(pool, async tx => {
    const operator = isOperator(authorization, config);
    let b: ServiceBinding;
    if (operation === 'integration.bindSource') {
      if (!operator) throw unavailable();
      b = await bootstrap(tx, command, config);
    } else if (operator && operation === 'integration.rotateCredential' && command.context.kind === 'integration') {
      b = { tenantId: command.context.tenantId, integrationId: command.context.integrationId, operator: true, credentialId: null };
      const tenant = await tx.query('SELECT enabled FROM tawsel.tenants WHERE tenant_id=$1 FOR UPDATE', [b.tenantId]);
      if (!tenant.rows[0]?.enabled) throw unavailable();
    } else b = await authenticateService(tx, authorization, true);
    if (command.context.kind !== 'integration' || command.context.tenantId !== b.tenantId || command.context.integrationId !== b.integrationId) throw unavailable();
    if (operation.startsWith('integration.') && !b.operator) {
      const grant = await tx.query("SELECT 1 FROM tawsel.integration_capabilities WHERE tenant_id=$1 AND integration_id=$2 AND capability='integration.manage'", sourceKey(b));
      if (!grant.rowCount) throw unavailable();
    }
    return executeCommandInTransaction(tx, { tenantId: b.tenantId, sourceId: b.integrationId }, command, {
      async writeDomain(tx) {
        const decision = operation.startsWith('integration.') ? await writeSource(tx, b, command, config) : domain ? await domain(tx, b, command) : (() => { throw new Error('Missing provisioning writer'); })();
        // Rejections retain the verified identity too, without copying secrets.
        decision.audit = { ...decision.audit, service: identityView(b), credentialId: b.credentialId, operator: b.operator };
        return decision;
      },
      async writeProgress() { /* Access tables and mapping revision are the projection. */ }
    });
  });
}
async function writeSource(tx: Transaction, b: ServiceBinding, command: ActionEnvelope, config: ProvisioningConfig): Promise<Decision> {
  const p = command.payload as Payload, prior = await record(tx, b, 'source', p.externalId);
  const digest = payloadHash({ operationId: command.operationId, payload: p });
  if (prior && p.sourceRevision <= Number(prior.source_revision)) {
    if (p.sourceRevision < Number(prior.source_revision)) return rejection('stale_revision', command.actionId);
    return digest === prior.payload_hash ? accepted(b, command, 'source', p.externalId, b.integrationId, p.sourceRevision, 'not-required', false) : rejection('idempotency_conflict', command.actionId);
  }
  if (command.operationId === 'integration.bindSource') {
    const any = await tx.query("SELECT 1 FROM tawsel.provisioning_records WHERE tenant_id=$1 AND integration_id=$2 AND entity='source'", sourceKey(b));
    if (any.rowCount && !prior) return rejection('idempotency_conflict', command.actionId);
    if (prior && prior.state.companyCode !== p.companyCode) return rejection('forbidden_resource', command.actionId);
    await tx.query('INSERT INTO tawsel.company_login_codes VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [p.companyCode, b.tenantId, p.displayName]);
    for (const subject of p.subjectIds as string[]) {
      // Already bound subjects cannot be acquired by a new source.
      const bound = await tx.query('SELECT 1 FROM tawsel.identity_subjects WHERE issuer=$1 AND subject=$2', [config.issuer, subject]);
      const reserved = await tx.query('SELECT tenant_id,integration_id FROM tawsel.provisioning_subject_grants WHERE issuer=$1 AND subject=$2', [config.issuer, subject]);
      const own = reserved.rows[0]?.tenant_id === b.tenantId && reserved.rows[0]?.integration_id === b.integrationId;
      if ((!own && (bound.rowCount || reserved.rowCount))) return rejection('forbidden_resource', command.actionId);
      await tx.query('INSERT INTO tawsel.provisioning_subject_grants VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [config.issuer, subject, ...sourceKey(b)]);
    }
    if (prior) {
      // Extending an operator reservation does not rotate or resurrect a source.
      const original = await tx.query('SELECT secret_hash,expires_at FROM tawsel.service_credentials WHERE credential_id=$1 AND tenant_id=$2 AND integration_id=$3', [p.credentialId, ...sourceKey(b)]);
      if (original.rows[0]?.secret_hash !== p.secretHash) return rejection('forbidden_resource', command.actionId);
    } else {
      for (const cap of ['identity.provision', 'integration.manage']) await tx.query('INSERT INTO tawsel.integration_capabilities VALUES ($1,$2,$3)', [...sourceKey(b), cap]);
      await insertCredential(tx, b, p);
    }
    if (p.intakeCapabilities !== undefined) {
      await tx.query("DELETE FROM tawsel.integration_capabilities WHERE tenant_id=$1 AND integration_id=$2 AND capability IN ('intake.prepare','assignment.manage')", sourceKey(b));
      for (const cap of p.intakeCapabilities as string[]) await tx.query('INSERT INTO tawsel.integration_capabilities VALUES ($1,$2,$3)', [...sourceKey(b), cap]);
    }
  } else {
    if (!prior) return rejection('dependency_missing', command.actionId);
    if (command.operationId === 'integration.rotateCredential') {
      if (p.recover && !b.operator) return rejection('forbidden_resource', command.actionId);
      await tx.query(`UPDATE tawsel.service_credentials SET expires_at=LEAST(expires_at,clock_timestamp()+$3*interval '1 second')
        WHERE tenant_id=$1 AND integration_id=$2`, [...sourceKey(b), p.overlapSeconds]);
      await insertCredential(tx, b, p);
      if (p.recover) await tx.query('UPDATE tawsel.integrations SET enabled=true WHERE tenant_id=$1 AND integration_id=$2', sourceKey(b));
    } else {
      await tx.query('UPDATE tawsel.integrations SET enabled=false WHERE tenant_id=$1 AND integration_id=$2', sourceKey(b));
      await tx.query('UPDATE tawsel.service_credentials SET revoked=true WHERE tenant_id=$1 AND integration_id=$2', sourceKey(b));
    }
  }
  await saveRecord(tx, b, 'source', p, b.integrationId, { companyCode: p.companyCode ?? prior?.state.companyCode }, command.actionId, digest);
  return accepted(b, command, 'source', p.externalId, b.integrationId, p.sourceRevision, 'not-required', true);
}
export async function sourceConfiguration(pool: Pool, authorization: string | undefined): Promise<components['schemas']['SourceConfiguration']> {
  return withTransaction(pool, async tx => {
    const b = await authenticateService(tx, authorization, false);
    const grant = await tx.query("SELECT 1 FROM tawsel.integration_capabilities WHERE tenant_id=$1 AND integration_id=$2 AND capability='integration.manage'", sourceKey(b));
    if (!grant.rowCount) throw unavailable();
    const source = await tx.query('SELECT issuer FROM tawsel.provisioning_sources WHERE tenant_id=$1 AND integration_id=$2', sourceKey(b));
    const grants = (await tx.query<{capability:string}>('SELECT capability FROM tawsel.integration_capabilities WHERE tenant_id=$1 AND integration_id=$2',sourceKey(b))).rows.map(r=>r.capability);
    const intake = [
      ...(grants.includes('intake.prepare') ? ['intake.submitSnapshot','intake.prepare','intake.setUrgencyBeforeDeparture'] : []),
      ...(grants.includes('assignment.manage') ? ['assignment.receiveBatch','assignment.withdraw','assignment.reassignBeforeDeparture'] : []),
      ...(grants.some(c=>c==='intake.prepare'||c==='assignment.manage') ? ['intake.getTask','intake.listTasks','intake.getBatchResult'] : [])
    ];
    return { identity: identityView(b), issuer: source.rows[0]!.issuer as string, supportedVersions: ['1.0.0'],
      allowedOperations: [...Object.keys(operations).filter(o => o !== 'integration.bindSource'), 'integration.getConfiguration', 'provisioning.getStatus', ...intake], humanDelegation: false };
  });
}

export async function provisioningStatus(pool: Pool, authorization: string | undefined, entity: string, externalId: string): Promise<components['schemas']['ProvisioningStatus']> {
  return withTransaction(pool, async tx => {
    const b = await authenticateService(tx, authorization, false);
    const row = await record(tx, b, entity, externalId);
    if (!row) throw new ProvisioningError('forbidden_resource', 404, 'Resource unavailable');
    const issuer = entity === 'user' ? (await tx.query(`SELECT status,attempts,next_attempt_at,last_error
      FROM tawsel.issuer_reconciliation WHERE tenant_id=$1 AND integration_id=$2 AND account_id=$3`, [...sourceKey(b), row.resource_id])).rows[0] : undefined;
    const enabled = entity === 'source' ? (await tx.query('SELECT enabled FROM tawsel.integrations WHERE tenant_id=$1 AND integration_id=$2', sourceKey(b))).rows[0]?.enabled as boolean : typeof row.state.enabled === 'boolean' ? row.state.enabled : null;
    return { entity: entity as components['schemas']['ProvisioningStatus']['entity'], externalId, resourceId: row.resource_id, enabled,
      sourceRevision: Number(row.source_revision), lastActionId: row.last_action_id,
      issuerStatus: issuer?.status ?? 'not-required', attempts: issuer?.attempts ?? 0,
      nextAttemptAt: issuer && issuer.status !== 'ready' ? (issuer.next_attempt_at as Date).toISOString() : null, lastError: issuer?.last_error ?? null };
  });
}
