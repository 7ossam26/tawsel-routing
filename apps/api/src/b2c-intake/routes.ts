import cookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { AuthenticatedPrincipal } from '../access/service.js';
import type { ActionEnvelope } from '../commands/kernel.js';
import type { AuthConfig } from '../auth/config.js';
import { requireBrowserCsrf, sessionCookie } from '../auth/guards.js';
import { AuthError, Sessions } from '../auth/service.js';
import { AccessDenied, LifecycleDenied } from '../access/service.js';
import { IdempotencyConflict } from '../commands/kernel.js';
import { IndependentIntakeService, IntakeError } from './service.js';

export type PersonalSessionAuthenticator = <T>(request: FastifyRequest, work: (principal: AuthenticatedPrincipal) => Promise<T>) => Promise<T>;

export async function b2cIntakeRoutes(app: FastifyInstance, pool: Pool, config: AuthConfig, authenticate?: PersonalSessionAuthenticator) {
  await app.register(cookie);
  const sessions = new Sessions(pool, config);
  const service = new IndependentIntakeService(pool);
  const useSession: PersonalSessionAuthenticator = authenticate ?? ((request, work) =>
    sessions.use('personal', request.cookies[sessionCookie('personal')], principal => work(principal)));
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof IntakeError) return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } });
    if (error instanceof AuthError) return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
    if (error instanceof AccessDenied || error instanceof LifecycleDenied || error instanceof IdempotencyConflict) {
      return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    return reply.status(500).send({ error: { code: 'request_failed', message: 'تعذر إكمال الطلب.' } });
  });
  app.get('/api/v1/independent/tasks', async request => {
    const query = request.query as { limit?: string; cursor?: string };
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    return useSession(request, principal => service.list(principal, limit, query.cursor));
  });
  app.get('/api/v1/independent/tasks/:taskId', async request => {
    const { taskId } = request.params as { taskId: string };
    return useSession(request, principal => service.get(principal, taskId));
  });
  app.post('/api/v1/independent/tasks', async (request, reply) => {
    requireBrowserCsrf(request, config);
    const result = await useSession(request, principal => service.create(principal, request.body as ActionEnvelope));
    return reply.status(result.response?.status ?? 200).send(result);
  });
  app.put('/api/v1/independent/tasks/:taskId', async request => {
    requireBrowserCsrf(request, config);
    const { taskId } = request.params as { taskId: string };
    const envelope = request.body as ActionEnvelope;
    if (envelope?.resources?.taskId !== taskId) throw new IntakeError('validation_failed', 400, 'معرّف المهمة غير متطابق.');
    return useSession(request, principal => service.revise(principal, envelope));
  });
}
