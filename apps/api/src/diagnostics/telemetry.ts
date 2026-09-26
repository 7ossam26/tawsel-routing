import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export type Metric = 'http' | 'transaction' | 'query' | 'poolWait' | 'commit' | 'engine' | 'export';
type Series = { count: number; errors: number; values: number[] };
const series = new Map<Metric, Series>();
/** Bounded process-local rolling samples, never advertised as a load-run SLO. */
export function measure(name: Metric, milliseconds: number, failed = false) {
  const s = series.get(name) ?? { count: 0, errors: 0, values: [] };
  s.count++; if (failed) s.errors++;
  s.values.push(Math.max(0, milliseconds)); if (s.values.length > 1024) s.values.shift(); series.set(name, s);
}
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  return [...values].sort((a, b) => a - b)[Math.ceil(p * values.length) - 1]!;
}
export function metrics() {
  return Object.fromEntries([...series].map(([name, s]) => [name, {
    count: s.count, errors: s.errors, retained: s.values.length,
    p50Ms: percentile(s.values, .5), p95Ms: percentile(s.values, .95), p99Ms: percentile(s.values, .99)
  }]));
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function correlation(value: unknown): string | null { return typeof value === 'string' && uuid.test(value) ? value : null; }
/** Allowlist only: no headers, URLs/query strings, exception messages, stacks or recipient bodies. */
export function instrumentHttp(app: FastifyInstance, write: (entry: object) => void = entry => process.stdout.write(`${JSON.stringify(entry)}\n`)) {
  const starts = new WeakMap<object, number>();
  app.addHook('onRequest', async (request, reply) => {
    starts.set(request, performance.now()); reply.header('X-Request-Id', request.id);
  });
  app.addHook('onResponse', async (request, reply) => {
    const durationMs = performance.now() - (starts.get(request) ?? performance.now());
    measure('http', durationMs, reply.statusCode >= 400);
    const body = request.body as { actionId?: unknown; context?: { tenantId?: unknown; accountId?: unknown; integrationId?: unknown } } | null;
    // Identifiers are untrusted correlation hints; authorization remains in domain handlers.
    const entry = { kind: 'http', requestId: request.id, route: request.routeOptions.url ?? 'unmatched',
      method: request.method, status: reply.statusCode, durationMs,
      actionId: correlation(body?.actionId), tenantId: correlation(body?.context?.tenantId),
      sourceId: correlation(body?.context?.integrationId ?? body?.context?.accountId) };
    try { write(entry); } catch { /* Diagnostics must not change a committed result. */ }
  });
}
export const requestId = () => randomUUID();
