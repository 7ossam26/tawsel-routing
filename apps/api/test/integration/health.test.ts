import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@tawsel/shared';
import { buildApp } from '../../src/app.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function startRealServer(): Promise<string> {
  app = buildApp();
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe('HTTP health boundary', () => {
  it('starts a real server and returns workspace health without claiming Engine success', async () => {
    const origin = await startRealServer();
    const response = await fetch(`${origin}/health`);
    const body = await response.json() as HealthResponse;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      service: 'tawsel-api',
      status: 'ok',
      scope: 'workspace',
      engine: 'not-checked'
    });
  });

  it('returns a stable validation error for unsupported health query input', async () => {
    const origin = await startRealServer();
    const response = await fetch(`${origin}/health?claim=routing-success`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'request_validation_failed',
        message: 'Request validation failed'
      }
    });
  });

  it('returns a stable not-found error instead of a fake domain endpoint', async () => {
    const origin = await startRealServer();
    const response = await fetch(`${origin}/deliveries`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'route_not_found',
        message: 'Route not found'
      }
    });
  });
});
