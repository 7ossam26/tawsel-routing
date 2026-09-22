import { timingSafeEqual } from 'node:crypto';
import { hash } from '../auth/crypto.js';
import type { Transaction } from '../db/transaction.js';
import { ProvisioningError } from './schema.js';

export interface ProvisioningConfig { issuer: string; operatorToken?: string }
export interface ServiceBinding { tenantId: string; integrationId: string; credentialId: string | null; operator: boolean }
export const unavailable = () => new ProvisioningError('forbidden_resource', 403, 'Access unavailable for this operation or scope');
export const identityView = (b: ServiceBinding) => ({ mode: 'service-operation' as const, tenantId: b.tenantId, integrationId: b.integrationId, actorId: null });
export function isOperator(authorization: string | undefined, config: ProvisioningConfig): boolean {
  if (!config.operatorToken) return false;
  if (!/^[a-f0-9]{64}$/.test(config.operatorToken)) throw new Error('Operator token must be 32 random bytes in hex');
  return timingSafeEqual(Buffer.from(hash(authorization ?? '')), Buffer.from(hash(`Bearer ${config.operatorToken}`)));
}
/** Tenant lock comes before credential/source lookup and remains held through
 * the command. Revocation and rotation use the same lock, including reads. */
export async function authenticateService(tx: Transaction, authorization: string | undefined, write: boolean, capability = 'identity.provision'): Promise<ServiceBinding> {
  const match = /^Bearer twp_([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(authorization ?? '');
  if (!match || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(match[1]!)) {
    throw new ProvisioningError('unauthorized', 401, 'Service credential required');
  }
  const located = await tx.query('SELECT tenant_id FROM tawsel.service_credentials WHERE credential_id=$1', [match[1]]);
  const tenantId = located.rows[0]?.tenant_id as string | undefined;
  if (!tenantId) throw unavailable();
  const tenant = await tx.query(`SELECT enabled FROM tawsel.tenants WHERE tenant_id=$1 FOR ${write ? 'UPDATE' : 'SHARE'}`, [tenantId]);
  const found = await tx.query(`SELECT c.integration_id,c.secret_hash FROM tawsel.service_credentials c
    JOIN tawsel.integrations i USING (tenant_id,integration_id)
    WHERE c.tenant_id=$1 AND c.credential_id=$2 AND NOT c.revoked AND c.expires_at>clock_timestamp() AND i.enabled`, [tenantId, match[1]]);
  const row = found.rows[0];
  if (!tenant.rows[0]?.enabled || !row || !timingSafeEqual(Buffer.from(row.secret_hash as string), Buffer.from(hash(match[2]!)))) throw unavailable();
  const cap = await tx.query(`SELECT 1 FROM tawsel.integration_capabilities WHERE tenant_id=$1 AND integration_id=$2 AND capability=$3`, [tenantId, row.integration_id, capability]);
  if (!cap.rowCount) throw unavailable();
  return { tenantId, integrationId: row.integration_id as string, credentialId: match[1]!, operator: false };
}
