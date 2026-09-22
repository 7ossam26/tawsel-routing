import type { Pool } from 'pg';
import { withTransaction } from '../db/transaction.js';

// Explicit operator invocation only; database time and a fixed 30-day minimum.
// No deletion API. Identities/history remain for at least business-record lifetime.
export async function compactCommandResponses(pool: Pool, limit = 100): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Compaction batch limit must be 1..1000');
  return withTransaction(pool, async tx => {
    const compacted = await tx.query(`WITH candidates AS (
      SELECT c.tenant_id,c.source_id,c.action_id FROM tawsel.command_identities c
      WHERE c.finalized_at < clock_timestamp() - interval '30 days'
        AND c.business_status IN ('accepted','rejected') AND NOT c.retention_hold
        AND c.response_body IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM tawsel.outbox_intents o
          WHERE o.tenant_id=c.tenant_id AND o.source_id=c.source_id AND o.action_id=c.action_id AND o.state <> 'resolved')
      ORDER BY c.tenant_id,c.source_id,c.action_id LIMIT $1 FOR UPDATE OF c SKIP LOCKED
    ) UPDATE tawsel.command_identities c SET response_body=NULL,response_status=NULL,compacted_at=clock_timestamp()
      FROM candidates x WHERE c.tenant_id=x.tenant_id AND c.source_id=x.source_id AND c.action_id=x.action_id
      RETURNING c.action_id`, [limit]);
    return compacted.rowCount ?? 0;
  });
}
