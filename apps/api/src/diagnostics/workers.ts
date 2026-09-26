import type { Pool } from 'pg';
/** Observability failure never rewrites a business outcome. Missing/stale evidence is explicit. */
export async function workerObservation(pool: Pool, worker: 'planning' | 'outbox' | 'provisioning', worked: boolean, elapsedMs: number) {
  try {
    await pool.query(`INSERT INTO tawsel.worker_observations(worker,worked,elapsed_ms) VALUES($1,$2,$3)
      ON CONFLICT(worker) DO UPDATE SET observed_at=clock_timestamp(),worked=$2,elapsed_ms=$3`, [worker, worked, elapsedMs]);
  } catch { process.stderr.write('Worker observation unavailable; inspect database readiness.\n'); }
}
