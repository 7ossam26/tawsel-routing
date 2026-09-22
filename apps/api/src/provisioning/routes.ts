import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { ProvisioningConfig } from './credentials.js';
import { commandService, sourceConfiguration, provisioningStatus, type DomainWriter } from './service.js';
import { operations, ProvisioningError, type ProvisioningOperation } from './schema.js';

export async function provisioningRoutes(app: FastifyInstance, pool: Pool, config: ProvisioningConfig, domain?: DomainWriter) {
  app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
  app.setErrorHandler((error, _request, reply) => {
    const e = error as Error & { statusCode?: number; code?: string };
    const known = e instanceof ProvisioningError || e.code === 'idempotency_conflict';
    const inputError = e.statusCode === 400 || e.statusCode === 413;
    const status = known ? e.statusCode! : inputError ? 400 : 503;
    const code = known ? e.code! : inputError ? 'validation_failed' : 'dependency_unavailable';
    return reply.status(status).type('application/problem+json').send({ type: `https://schemas.tawsel.invalid/problems/${code.replaceAll('_', '-')}`,
      title: known ? e.message : inputError ? 'Invalid provisioning request' : 'Provisioning temporarily unavailable', status, code, correlationId: randomUUID(), retryable: !known && !inputError });
  });
  for (const operation of Object.keys(operations) as ProvisioningOperation[]) {
    if (!domain && !operation.startsWith('integration.')) continue;
    app.post(`/api/v1/provisioning/commands/${operation}`, { bodyLimit: 65536 }, async (request, reply) => {
      if (Object.keys(request.query as object).length) throw new ProvisioningError('validation_failed', 400, 'Unexpected query parameters');
      const result = await commandService(pool, config, request.headers.authorization, operation, request.body, domain);
      return reply.status(result.response?.status ?? (result.receipt.businessStatus === 'accepted' ? 200 : 409)).send(result);
    });
  }
  app.get('/api/v1/provisioning/configuration', async request => {
    if (Object.keys(request.query as object).length) throw new ProvisioningError('validation_failed', 400, 'Unexpected query parameters');
    return sourceConfiguration(pool, request.headers.authorization);
  });
  app.get('/api/v1/provisioning/status', async request => {
    const q = request.query as Record<string, unknown>;
    if (Object.keys(q).sort().join(',') !== 'entity,externalId' || !['source','branch','role','user','driver'].includes(q.entity as string)
      || typeof q.externalId !== 'string' || !q.externalId.length || q.externalId.length > 256) throw new ProvisioningError('validation_failed', 400, 'Invalid status query');
    return provisioningStatus(pool, request.headers.authorization, q.entity as string, q.externalId);
  });
}
