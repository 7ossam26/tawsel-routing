import { timingSafeEqual } from 'node:crypto';
import { statfs } from 'node:fs/promises';
import { totalmem, freemem, availableParallelism } from 'node:os';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { withTransaction } from '../db/transaction.js';
import { metrics } from './telemetry.js';
import { exportStorageStats } from '../reporting/export.js';

export interface DiagnosticsConfig { token: string }
export function diagnosticsConfig(env = process.env): DiagnosticsConfig | undefined {
  const token = env.TAWSEL_DIAGNOSTICS_TOKEN;
  if (!token) return undefined;
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('Diagnostics requires a dedicated random operator token of 32–256 characters');
  if (token === env.TAWSEL_PROVISIONING_OPERATOR_TOKEN) throw new Error('Diagnostics token must be separate from provisioning');
  return { token };
}
export async function diagnosticStatus(pool: Pool) {
  const observedAt = new Date().toISOString();
  try {
    return await withTransaction(pool, async tx => {
      await tx.query("SET LOCAL statement_timeout='1500ms'");
      const database = (await tx.query(`SELECT current_setting('server_version') version,
        (SELECT count(*)::int FROM pg_stat_activity WHERE datname=current_database() AND state='active') active,
        (SELECT count(*)::int FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0) blocked,
        (SELECT deadlocks::float8 FROM pg_stat_database WHERE datname=current_database()) deadlocks`)).rows[0];
      const workers = (await tx.query(`SELECT worker,observed_at,worked,elapsed_ms,
        extract(epoch FROM clock_timestamp()-observed_at)*1000 age_ms FROM tawsel.worker_observations ORDER BY worker`)).rows;
      const planning = (await tx.query(`SELECT count(*) FILTER(WHERE status='pending')::int pending,
        count(*) FILTER(WHERE status='running')::int running, count(*) FILTER(WHERE status='failed')::int failed,
        count(*) FILTER(WHERE status='pending' AND blocked_reason IS NOT NULL)::int blocked,
        count(*) FILTER(WHERE status='running' AND lease_until<clock_timestamp())::int expired_leases,
        coalesce(max(extract(epoch FROM clock_timestamp()-created_at)*1000) FILTER(WHERE status IN ('pending','running')),0)::float8 oldest_ms,
        count(*) FILTER(WHERE last_error IS NOT NULL)::int engine_errors FROM tawsel.planning_jobs`)).rows[0];
      const sender = (await tx.query(`SELECT count(*) FILTER(WHERE d.status='pending')::int pending,
        count(*) FILTER(WHERE d.status='sending')::int sending,count(*) FILTER(WHERE d.status='failed')::int failed,
        count(*) FILTER(WHERE d.status='received')::int received,
        count(*) FILTER(WHERE d.status='sending' AND d.lease_until<clock_timestamp())::int expired_leases,
        coalesce(max(extract(epoch FROM clock_timestamp()-o.created_at)*1000) FILTER(WHERE d.status<>'received'),0)::float8 oldest_ms
        FROM tawsel.outbox_deliveries d JOIN tawsel.outbox_intents o USING(tenant_id,event_id)`)).rows[0];
      const projection = (await tx.query(`SELECT count(*)::int streams,
        count(*) FILTER(WHERE c.reported_at IS NULL)::int unknown,
        coalesce(sum(greatest(0,s.last_sequence-coalesce((c.checkpoint->>'appliedThrough')::bigint,0))),0)::float8 unapplied_or_unreported,
        max(extract(epoch FROM clock_timestamp()-c.reported_at)*1000)::float8 oldest_report_ms
        FROM tawsel.outbox_streams s LEFT JOIN tawsel.outbox_consumer_checkpoints c USING(tenant_id,recipient_id,aggregate_type,aggregate_id)`)).rows[0];
      // Filesystem size traversal can exceed the query budget even when SQL is
      // healthy. Keep this optional gauge from aborting readiness/queue evidence.
      let bytes: number | null = null;
      await tx.query('SAVEPOINT diagnostic_size');
      try { bytes = (await tx.query('SELECT pg_database_size(current_database())::float8 bytes')).rows[0].bytes; }
      catch { await tx.query('ROLLBACK TO SAVEPOINT diagnostic_size'); }
      await tx.query('RELEASE SAVEPOINT diagnostic_size');
      return { observedAt, liveness: 'alive', database: { state: 'ready', ...database, bytes },
        workers: ['planning','outbox','provisioning'].map(worker => {
          const row = workers.find(r => r.worker === worker);
          return { worker, state: !row ? 'unknown' : Number(row.age_ms) > 120_000 ? 'stale' : 'recent-loop',
            observedAt: row?.observed_at?.toISOString() ?? null, ageMs: row ? Number(row.age_ms) : null,
            elapsedMs: row ? Number(row.elapsed_ms) : null, worked: row?.worked ?? null };
        }), planning, sender, projection, engine: { availability: 'not-probed', persistedJobErrors: planning.engine_errors },
        backup: { readiness: 'unverified', lastVerifiedRestoreAt: null } };
    }, 'REPEATABLE READ');
  } catch {
    return { observedAt, liveness: 'alive', database: { state: 'unavailable' }, workers: null, planning: null,
      sender: null, projection: null, engine: { availability: 'unknown' }, backup: { readiness: 'unverified', lastVerifiedRestoreAt: null } };
  }
}
export async function diagnosticsRoutes(app: FastifyInstance, pool: Pool, config: DiagnosticsConfig) {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(config.token)) throw new Error('Invalid diagnostics token');
  app.addHook('onRequest', async (r, reply) => {
    reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');
    const expected=Buffer.from(`Bearer ${config.token}`),actual=Buffer.from(r.headers.authorization??'');
    if (expected.length!==actual.length || !timingSafeEqual(expected,actual)) return reply.status(401).send({error:'diagnostics_unauthenticated'});
  });
  const schema = {querystring:{type:'object',additionalProperties:false,properties:{}}};
  app.get('/internal/diagnostics/health',{schema},async()=>diagnosticStatus(pool));
  app.get('/internal/diagnostics/actions/:actionId',{schema:{params:{type:'object',required:['actionId'],properties:{actionId:{type:'string',format:'uuid'}}},querystring:{type:'object',required:['tenantId','sourceId'],additionalProperties:false,properties:{tenantId:{type:'string',format:'uuid'},sourceId:{type:'string',format:'uuid'}}}}},async(r,reply)=>{
    const {actionId}=r.params as {actionId:string},{tenantId,sourceId}=r.query as {tenantId:string;sourceId:string};
    const result=await withTransaction(pool,async tx=>{
      const action=(await tx.query(`SELECT action_id,operation_id,business_status,received_at,accepted_at FROM tawsel.command_identities
        WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3`,[tenantId,sourceId,actionId])).rows[0];
      if(!action)return null;
      const events=(await tx.query(`SELECT o.event_id,o.aggregate_type,o.aggregate_id,o.recipient_id,o.recipient_sequence,
        d.status,d.attempts,d.next_attempt_at,d.lease_until,d.received_at,
        c.reported_at,c.checkpoint->>'appliedThrough' applied_through,c.checkpoint->>'pendingCount' receiver_pending
        FROM tawsel.outbox_intents o LEFT JOIN tawsel.outbox_deliveries d USING(tenant_id,event_id)
        LEFT JOIN tawsel.outbox_consumer_checkpoints c ON c.tenant_id=o.tenant_id AND c.recipient_id=o.recipient_id
          AND c.aggregate_type=o.aggregate_type AND c.aggregate_id=o.aggregate_id
        WHERE o.tenant_id=$1 AND o.source_id=$2 AND o.action_id=$3 ORDER BY o.event_id LIMIT 101`,[tenantId,sourceId,actionId])).rows;
      return {action,events:events.slice(0,100),truncated:events.length>100,interpretation:'Receiver application is last reported evidence; sender received is only durable inbox acknowledgement.'};
    });
    return result??reply.status(404).send({error:'action_unavailable'});
  });
  app.get('/internal/diagnostics/metrics',{schema},async()=>{
    const disk=await statfs(process.cwd()).then(s=>({scope:'application-working-directory',availableBytes:s.bavail*s.bsize,totalBytes:s.blocks*s.bsize})).catch(()=>null);
    return {observedAt:new Date().toISOString(),scope:'this-api-process',uptimeSeconds:process.uptime(),
      metrics:metrics(),exports:exportStorageStats(),pool:{total:pool.totalCount,idle:pool.idleCount,waiting:pool.waitingCount,max:pool.options.max},
      process:{memory:process.memoryUsage(),cpuMicroseconds:process.cpuUsage()},host:{logicalCpus:availableParallelism(),totalMemoryBytes:totalmem(),freeMemoryBytes:freemem()},disk,
      interpretation:'Nearest-rank percentiles of last 1024 samples per metric, lifetime counts/errors. Not a capacity or freshness target assessment.'};
  });
}
