import type { Transaction } from '../db/transaction.js';
import type { ActionEnvelope } from '../commands/kernel.js';
import { getCommandResult } from '../commands/kernel.js';
import { requireCurrent } from '../current/models.js';

/** Explicit outcome adoption can use received former-phone movements as evidence,
 * without applying them or fabricating an arrival. Earlier outcomes must already
 * be accepted/adopted; missing or invalid history never qualifies. */
export async function compatibleEvidenceDependencies(tx: Transaction, original: ActionEnvelope): Promise<boolean> {
  if (original.context.kind !== 'device') return false;
  const scope = { tenantId: original.context.tenantId, sourceId: original.context.accountId };
  const visiting = new Set<string>();
  let inspected = 0;
  async function visit(parent: ActionEnvelope): Promise<boolean> {
    if (++inspected > 1000 || visiting.has(parent.actionId)) return false;
    visiting.add(parent.actionId);
    for (const id of parent.dependsOnActionIds) {
      const result = await getCommandResult(tx, scope, id);
      if (!result || result.summary.roundId !== original.payload.roundId || id === parent.actionId) return false;
      if (result.receipt.businessStatus === 'accepted') continue;
      if ((await tx.query('SELECT 1 FROM tawsel.outcome_corrections WHERE tenant_id=$1 AND evidence_source_id=$2 AND evidence_action_id=$3', [scope.tenantId, scope.sourceId, id])).rowCount) continue;
      const c = (await tx.query<{ envelope: ActionEnvelope }>('SELECT envelope FROM tawsel.command_evidence WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3', [scope.tenantId, scope.sourceId, id])).rows[0]?.envelope;
      if (!c || c.context.kind !== 'device' || parent.context.kind !== 'device' || result.receipt.problem?.code !== 'stale_device' ||
        !['current.selectHeading', 'current.recordArrival'].includes(c.operationId) || c.context.deviceId !== parent.context.deviceId || c.context.deviceGeneration !== parent.context.deviceGeneration || c.context.deviceSequence >= parent.context.deviceSequence ||
        ['roundId', 'taskId', 'attemptId', 'expectedSourceRevision', 'expectedAssignmentRevision', 'expectedPinRevision'].some(field => c.payload[field] !== parent.payload[field])) return false;
      try { requireCurrent(c.operationId === 'current.selectHeading' ? 'SelectHeadingCommand' : 'ArrivalCommand', c); } catch { return false; }
      if (!await visit(c)) return false;
    }
    visiting.delete(parent.actionId);
    return true;
  }
  return visit(original);
}
