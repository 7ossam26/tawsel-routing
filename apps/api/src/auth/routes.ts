import cookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { AccountKind, AuthConfig } from './config.js';
import { Sessions, AuthError, type LoginInput } from './service.js';
import { conforms } from './schemas.js';
import { equal, hash, randomToken } from './crypto.js';

export const browserCookie = '__Host-tawsel-browser';
export const sessionCookie = (kind: AccountKind) => `__Host-tawsel-${kind}`;
const options = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' };

export async function authRoutes(app: FastifyInstance, pool: Pool, config: AuthConfig) {
  await app.register(cookie);
  const sessions = new Sessions(pool, config);
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('X-Content-Type-Options', 'nosniff');
  });
  app.setErrorHandler((error, _request, reply) => {
    const failure = error instanceof AuthError ? error : new AuthError('invalid_request', 500);
    if (failure.statusCode === 429) reply.header('Retry-After', '60');
    return reply.status(failure.statusCode).send({ error: { code: failure.code, message: failure.message } });
  });
  const valid = <T>(schema: string, value: unknown): T => {
    if (!conforms(schema, value)) throw new AuthError('invalid_request');
    return value as T;
  };
  const csrf = (request: FastifyRequest) => {
    const token = request.cookies[browserCookie];
    if (request.headers.origin !== config.origin || !token || typeof request.headers['x-csrf-token'] !== 'string' || !equal(token, request.headers['x-csrf-token'])) throw new AuthError('csrf_invalid', 403);
    return token;
  };
  app.get('/api/session/bootstrap', async (request, reply) => {
    await sessions.rate(request.ip, 'bootstrap', 120);
    const existing = request.cookies[browserCookie];
    const token = existing && /^[A-Za-z0-9_-]{43}$/.test(existing) ? existing : randomToken();
    reply.setCookie(browserCookie, token, { ...options, maxAge: 30 * 86400 });
    return { csrfToken: token };
  });
  app.post('/api/session/company', async request => {
    csrf(request);
    await sessions.rate(request.ip, 'entry');
    const input = valid<{ code: string }>('CompanyRequest', request.body);
    const company = await sessions.company(input.code);
    return { code: company.code, displayName: company.display_name };
  });
  for (const [path, intent] of [['login', undefined], ['register', 'register'], ['recover', 'recover']] as const) {
    app.post(`/api/session/${path}`, async request => {
      const browser = csrf(request);
      await sessions.rate(request.ip, 'entry');
      const input = valid<LoginInput>('LoginRequest', request.body);
      if (intent) input.intent = intent;
      return sessions.begin(input, browser, request.cookies[sessionCookie(input.kind)]);
    });
  }
  app.get('/api/session/callback', async (request, reply) => {
    await sessions.rate(request.ip, 'callback', 60);
    valid('CallbackQuery', request.query);
    const url = new URL(request.url, config.origin);
    const hint = await pool.query<{ kind: AccountKind }>('SELECT kind FROM tawsel.login_attempts WHERE state_hash=$1 AND browser_hash=$2', [hash(url.searchParams.get('state') ?? ''), hash(request.cookies[browserCookie] ?? '')]);
    try {
      const completed = await sessions.complete(url, request.cookies[browserCookie] ?? '');
      reply.setCookie(sessionCookie(completed.kind), completed.cookie, { ...options, maxAge: 30 * 86400 });
      return reply.redirect(`${config.origin}/account?kind=${completed.kind}`);
    } catch (error) {
      const code = error instanceof AuthError ? error.code : 'login_failed';
      return reply.redirect(`${config.origin}/login?kind=${hint.rows[0]?.kind ?? 'company'}&error=${code}`);
    }
  });
  for (const path of ['/api/session/context', '/api/account/status']) {
    app.get(path, async request => {
      await sessions.rate(request.ip, 'context', 120);
      const { kind } = valid<{ kind: AccountKind }>('KindRequest', request.query);
      return sessions.context(kind, request.cookies[sessionCookie(kind)]);
    });
  }
  app.post('/api/session/refresh', async request => {
    csrf(request);
    await sessions.rate(request.ip, 'refresh', 30);
    const { kind } = valid<{ kind: AccountKind }>('KindRequest', request.body);
    return sessions.context(kind, request.cookies[sessionCookie(kind)], true);
  });
  app.post('/api/session/logout', async (request, reply) => {
    csrf(request);
    await sessions.rate(request.ip, 'logout', 30);
    const { kind } = valid<{ kind: AccountKind }>('KindRequest', request.body);
    await sessions.logout(kind, request.cookies[sessionCookie(kind)]);
    reply.clearCookie(sessionCookie(kind), options);
    return reply.status(204).send();
  });
}
