import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { AuthConfig } from '../auth/config.js';
import { requireBrowserCsrf, sessionCookie } from '../auth/guards.js';
import { Sessions } from '../auth/service.js';
import type { PlanningAuthenticator } from '../planning/routes.js';
import { Synchronization } from './service.js';

export async function syncRoutes(app: FastifyInstance, pool: Pool, config: AuthConfig, authenticate?: PlanningAuthenticator) {
  await app.register(cookie);
  const sessions = new Sessions(pool, config), service = new Synchronization(pool);
  const use: PlanningAuthenticator = authenticate ?? ((request, kind, work) => sessions.use(kind, request.cookies[sessionCookie(kind)], p => work(p)));
  const query = { type: 'object', properties: { kind: { type: 'string', enum: ['personal', 'company'] } }, required: ['kind'], additionalProperties: false };
  app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff'); });
  app.setErrorHandler((error, _request, reply) => {
    const e = error as { statusCode?: number; code?: string; message?: string };
    const status = e.statusCode ?? 500;
    return reply.status(status).send({ error: { code: status < 500 ? e.code ?? 'validation_failed' : 'request_failed', message: status < 500 ? e.message : 'تعذر تأكيد المزامنة؛ السجل محفوظ على الهاتف.' } });
  });
  app.post('/api/v1/sync/actions', { schema: { querystring: query } }, async request => {
    requireBrowserCsrf(request, config);
    return use(request, (request.query as { kind: 'personal' | 'company' }).kind, p => service.submit(p, request.body));
  });
  app.get('/api/v1/sync/conflicts', { schema: { querystring: { ...query, properties: { ...query.properties, deviceId: { type: 'string', format: 'uuid' }, afterActionId: { type: 'string', format: 'uuid' } }, required: ['kind', 'deviceId'] } } }, async request => {
    const { kind, deviceId, afterActionId } = request.query as { kind: 'personal' | 'company'; deviceId: string; afterActionId?: string };
    return use(request, kind, p => service.conflicts(p, deviceId, afterActionId));
  });
}
