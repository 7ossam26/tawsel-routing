import type { FastifyRequest } from 'fastify';
import type { AuthConfig } from './config.js';
import { equal } from './crypto.js';
import { AuthError } from './service.js';

export const browserCookie = '__Host-tawsel-browser';
export const sessionCookie = (kind: 'company' | 'personal') => `__Host-tawsel-${kind}`;

/** Same-origin mutation guard shared by session and authenticated feature routes. */
export function requireBrowserCsrf(request: FastifyRequest, config: Pick<AuthConfig, 'origin'>): string {
  const token = request.cookies[browserCookie];
  if (request.headers.origin !== config.origin
    || !token
    || typeof request.headers['x-csrf-token'] !== 'string'
    || !equal(token, request.headers['x-csrf-token'])) {
    throw new AuthError('csrf_invalid', 403);
  }
  return token;
}
