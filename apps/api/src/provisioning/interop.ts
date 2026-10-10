import type { Transaction } from '../db/transaction.js';
import { OutcomeError } from '../outcomes/models.js';

/** Operator approval follows recipient reader installation. A source body or
 * human capability cannot switch the writer. Never rewrite retained v1 bytes. */
export async function interopVersion(tx: Transaction, tenantId: string, integrationId: string): Promise<'1.0.0' | '2.0.0'> {
  const row = (await tx.query("SELECT state->>'interopVersion' AS version FROM tawsel.provisioning_records WHERE tenant_id=$1 AND integration_id=$2 AND entity='source'", [tenantId, integrationId])).rows[0];
  return row?.version === '2.0.0' ? '2.0.0' : '1.0.0';
}
export async function requireInterop(tx: Transaction, tenantId: string, integrationId: string, version: string) {
  if (version === '2.0.0' && await interopVersion(tx, tenantId, integrationId) !== '2.0.0') {
    throw new OutcomeError('lifecycle_forbidden', 409, 'لم يعتمد المصدر نسخة التكامل الجديدة بعد.');
  }
}
