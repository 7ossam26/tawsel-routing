import type { components } from '@tawsel/api-client';
import type { Transaction } from '../db/transaction.js';
import { money } from './arithmetic.js';
import { OutcomeError } from './models.js';

/** Frozen prices and effective prior fees. A correction replaces its own
 * attempt, so that attempt must not be counted as an earlier collection. */
export async function deliveryFor(tx: Transaction, tenant: string, task: string, sourceRevision: number, cycle: string | null, replacingAttempt: string | null = null): Promise<components['schemas']['CurrentTarget']['delivery']> {
  if (!cycle) {
    const amount = (await tx.query('SELECT amount_minor FROM tawsel.task_collection_amounts WHERE tenant_id=$1 AND task_id=$2', [tenant, task])).rows[0];
    return { kind: 'personal', allowedActions: ['full', 'refusal', 'no-answer'], fullCollection: amount ? money(Number(amount.amount_minor)) : null, goodsDue: null, shippingDue: null, lines: [] };
  }
  const source = (await tx.query<{ payload: components['schemas']['B2bSourceSnapshot'] }>('SELECT payload FROM tawsel.b2b_source_snapshots WHERE tenant_id=$1 AND task_id=$2 AND source_revision=$3', [tenant, task, sourceRevision])).rows[0]!.payload;
  const prior = (await tx.query(`SELECT COALESCE(sum(c.shipping_minor),0)::text shipping FROM tawsel.effective_attempt_outcomes o JOIN tawsel.outcome_collections c USING(tenant_id,outcome_id)
    WHERE o.tenant_id=$1 AND o.dispatch_cycle_id=$2 AND ($3::uuid IS NULL OR o.attempt_id<>$3)`, [tenant, cycle, replacingAttempt])).rows[0];
  const goods = source.lines.reduce((sum, line) => sum + BigInt(line.quantity) * BigInt(line.unitDue.amountMinor), 0n);
  const shipping = BigInt(source.shippingDue.amountMinor) - BigInt(prior.shipping);
  if (shipping < 0n || goods + shipping > BigInt(Number.MAX_SAFE_INTEGER)) throw new OutcomeError('validation_failed', 500, 'تعذر حساب مبلغ التحصيل الحالي.');
  return { kind: 'company', allowedActions: source.splittingAllowed ? ['full', 'partial', 'refusal', 'no-answer'] : ['full', 'refusal', 'no-answer'], fullCollection: money(Number(goods + shipping)), goodsDue: money(Number(goods)), shippingDue: money(Number(shipping)), lines: source.lines.map(({ sourceLineId, description, quantity, unitDue }) => ({ sourceLineId, description, quantity, unitDue })) };
}
