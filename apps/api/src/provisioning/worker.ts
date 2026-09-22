import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { withTransaction } from '../db/transaction.js';
import type { IssuerAdministration } from './issuer.js';

interface Job { tenant_id: string; integration_id: string; account_id: string; issuer: string; subject: string; desired_enabled: boolean; generation: string; attempts: number; lease_id: string }
/** Claim and completion are separate commits. Network work has no checked-out
 * database connection. A lease fences completion; generation fences newer intent.
 * HTTP effects are idempotent GET/logout, never an unfenced external enable. */
export async function reconcileOne(pool: Pool, configuredIssuer: string, admin: IssuerAdministration): Promise<boolean> {
  const job = await withTransaction(pool, async tx => {
    const due = await tx.query<Job>(`SELECT * FROM tawsel.issuer_reconciliation WHERE issuer=$1 AND status<>'ready'
      AND next_attempt_at<=clock_timestamp() AND (lease_until IS NULL OR lease_until<clock_timestamp())
      ORDER BY next_attempt_at,account_id FOR UPDATE SKIP LOCKED LIMIT 1`, [configuredIssuer]);
    if (!due.rows[0]) return undefined;
    const row = due.rows[0], lease = randomUUID();
    await tx.query(`UPDATE tawsel.issuer_reconciliation SET status='running',lease_id=$3,
      lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1 WHERE tenant_id=$1 AND account_id=$2`, [row.tenant_id, row.account_id, lease]);
    return { ...row, attempts: row.attempts + 1, lease_id: lease };
  });
  if (!job) return false;
  let error: string | null = null;
  try {
    if (job.desired_enabled) { if (!await admin.verifySubject(job.subject)) error = 'subject_unavailable'; }
    else await admin.revokeSessions(job.subject);
  } catch { error = 'issuer_unavailable'; }
  await withTransaction(pool, async tx => {
    // Same tenant-first order as provisioning/access writers. Never acquire the
    // tenant while holding a reconciliation row from the claim transaction.
    await tx.query('SELECT tenant_id FROM tawsel.tenants WHERE tenant_id=$1 FOR UPDATE', [job.tenant_id]);
    const found = await tx.query<Job>('SELECT * FROM tawsel.issuer_reconciliation WHERE tenant_id=$1 AND account_id=$2 FOR UPDATE', [job.tenant_id, job.account_id]);
    const current = found.rows[0];
    if (!current || current.lease_id !== job.lease_id) return;
    if (current.generation !== job.generation) {
      await tx.query(`UPDATE tawsel.issuer_reconciliation SET status='pending',lease_id=null,lease_until=null,next_attempt_at=now()
        WHERE tenant_id=$1 AND account_id=$2`, [job.tenant_id, job.account_id]);
      return;
    }
    if (!error && job.desired_enabled) {
      await tx.query(`UPDATE tawsel.identity_subjects s SET enabled=true FROM tawsel.memberships m
        WHERE s.tenant_id=$1 AND s.account_id=$2 AND m.tenant_id=s.tenant_id AND m.account_id=s.account_id AND m.enabled`, [job.tenant_id, job.account_id]);
    }
    const delay = Math.min(300, 2 ** Math.min(job.attempts, 8)) + Math.floor(Math.random() * 3);
    await tx.query(`UPDATE tawsel.issuer_reconciliation SET status=$3,last_error=$4,lease_id=null,lease_until=null,
      next_attempt_at=clock_timestamp()+$5*interval '1 second' WHERE tenant_id=$1 AND account_id=$2`,
    [job.tenant_id, job.account_id, error ? 'retry' : 'ready', error, error ? delay : 0]);
  });
  return true;
}
