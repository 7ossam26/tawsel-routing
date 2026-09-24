import type {Transaction} from '../db/transaction.js';
import type {OutcomeRecord} from './models.js';
/** Shared immutable ledger write for original outcomes and correction revisions. */
export async function appendOutcome(tx:Transaction,tenant:string,source:string,actionId:string,o:OutcomeRecord){
 await tx.query(`INSERT INTO tawsel.delivery_outcomes (tenant_id,outcome_id,round_id,attempt_id,task_id,driver_id,dispatch_cycle_id,branch_id,integration_id,source_revision,revision,kind,outcome,record,source_id,action_id)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,[tenant,o.outcomeId,o.roundId,o.attemptId,o.taskId,o.driverId,o.dispatchCycleId,o.branchId,o.sourceReference?.integrationId??null,o.sourceRevision,o.revision,o.kind,o.outcome,o,source,actionId]);
 for(const l of o.lines)await tx.query('INSERT INTO tawsel.outcome_quantities (tenant_id,outcome_id,task_id,source_revision,source_line_id,source_quantity,delivered,held_return_required) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[tenant,o.outcomeId,o.taskId,o.sourceRevision,l.sourceLineId,l.sourceQuantity,l.delivered,l.heldReturnRequired]);
 const c=o.collection;
 await tx.query(`INSERT INTO tawsel.outcome_collections (tenant_id,outcome_id,currency,exponent,reported_minor,goods_minor,shipping_minor,unpaid_shipping_minor,shipping_status) VALUES ($1,$2,'EGP',2,$3,$4,$5,$6,$7)`,[tenant,o.outcomeId,c.reported?.amountMinor??null,c.goods.amountMinor,c.shipping.amountMinor,c.unpaidShipping.amountMinor,c.shippingStatus]);
}
