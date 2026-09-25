import type { ActionEnvelope, Decision } from './kernel.js';
import type { Transaction } from '../db/transaction.js';
import type { RoundRow } from '../rounds/models.js';
import { DeviceError } from '../devices/models.js';
import { deviceRejection } from '../devices/state.js';

export class DependencyPending extends Error {
  readonly code = 'sync_incomplete';
  readonly statusCode = 409;
  constructor(readonly actionId: string, readonly dependencies: string[] = []) {
    super('زامن الإجراءات السابقة أولًا؛ الطلب محفوظ على الهاتف.');
  }
}
const continuation = new Set(['current.selectHeading', 'current.recordArrival', 'outcome.recordFull', 'outcome.recordPartial', 'outcome.recordRefusal', 'outcome.recordNoAnswer']);

/** Called under the driver's invariant lock, after the owner fence. Committed
 * results are immutable. Never lock predecessor identities while holding the
 * driver lock: an in-flight predecessor may itself be waiting for that lock. */
export async function executionDependencies(tx: Transaction, c: ActionEnvelope, r: RoundRow): Promise<Decision | null> {
  if (!c.dependsOnActionIds.length) return null;
  const fail = (detail: string) => deviceRejection(c, r, new DeviceError('sync_incomplete', 409, detail));
  if (c.dependsOnActionIds.includes(c.actionId)) return fail('الإجراء يعتمد على نفسه؛ حُفظ للمراجعة.');
  const rows = (await tx.query(`SELECT i.action_id,i.business_status,i.result_summary,m.device_id,m.generation,m.device_sequence,m.round_id
    FROM tawsel.command_identities i LEFT JOIN tawsel.command_replay_metadata m USING(tenant_id,source_id,action_id)
    WHERE i.tenant_id=$1 AND i.source_id=$2 AND i.action_id=ANY($3::uuid[])`, [r.tenant_id, r.owner_account_id, c.dependsOnActionIds])).rows;
  const missing = c.dependsOnActionIds.filter(id => !rows.some(row => row.action_id === id && row.result_summary));
  if (missing.length) throw new DependencyPending(c.actionId, missing);
  for (const row of rows) {
    if (row.business_status !== 'accepted') return fail('وصل إجراء سابق ولم يُقبل؛ الأدلة محفوظة للمراجعة.');
    if (row.result_summary.summary.roundId !== r.round_id) return fail('الإجراء السابق لا يخص الجولة نفسها.');
    if (continuation.has(c.operationId) && c.context.kind === 'device' && row.device_id &&
      (row.device_id !== c.context.deviceId || Number(row.generation) !== c.context.deviceGeneration || Number(row.device_sequence) >= c.context.deviceSequence)) return fail('تسلسل الهاتف أو جيل الإجراء السابق غير متوافق.');
  }
  // Bind the local projected activity version to the latest committed dependency.
  // Other task/source/assignment/owner checks still run in the original handler.
  const versions = rows.flatMap(row => typeof row.result_summary.receipt.resourceVersions?.resourceRevision === 'number' ? [row.result_summary.receipt.resourceVersions.resourceRevision as number] : []);
  if (continuation.has(c.operationId) && versions.length && c.payload.expectedActivityRevision !== Math.max(...versions)) return fail('نسخة المحطة لا تطابق نتيجة الإجراء السابق؛ لم يتغير السجل الأصلي.');
  return null;
}
