import Fastify, { type FastifyInstance } from 'fastify';
import type { HealthResponse } from '@tawsel/shared';
import type { Pool } from 'pg';
import { authRoutes } from './auth/routes.js';
import type { AuthConfig } from './auth/config.js';
import { provisioningRoutes } from './provisioning/routes.js';
import type { ProvisioningConfig } from './provisioning/credentials.js';
import { writeProjection } from './provisioning/domain.js';
import { b2cIntakeRoutes } from './b2c-intake/routes.js';
import { b2bIntakeRoutes } from './b2b-intake/routes.js';
import { locationRoutes } from './locations/routes.js';
import { mapAssetRoutes } from './locations/assets.js';
import { routingRoutes } from './engine/routes.js';
import { planningRoutes } from './planning/routes.js';

const healthResponse: HealthResponse = {
  service: 'tawsel-api',
  status: 'ok',
  scope: 'workspace',
  engine: 'not-checked'
};

export function buildApp(database?: Pool, auth?: AuthConfig, provisioning?: ProvisioningConfig): FastifyInstance {
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        removeAdditional: false
      }
    }
  });

  if (database) app.addHook('onClose', async () => { await database.end(); });
  app.register(async scope => { await mapAssetRoutes(scope); });
  if (database && auth) app.register(async scope => { await authRoutes(scope, database, auth); });
  if (database && auth) app.register(async scope => { await b2cIntakeRoutes(scope, database, auth); });
  if (database && auth) app.register(async scope => { await locationRoutes(scope, database, auth); });
  if (database && auth) app.register(async scope => { await routingRoutes(scope, database, auth); });
  if (database && auth) app.register(async scope => { await planningRoutes(scope, database, auth); });
  if (database && provisioning) app.register(async scope => { await provisioningRoutes(scope, database, provisioning, writeProjection); });
  if (database && provisioning) app.register(async scope => { await b2bIntakeRoutes(scope, database); });

  app.setErrorHandler((error, _request, reply) => {
    const failure = error instanceof Error
      ? error as Error & { statusCode?: number; validation?: unknown }
      : undefined;

    if (failure?.validation) {
      return reply.status(400).send({
        error: {
          code: 'request_validation_failed',
          message: 'Request validation failed'
        }
      });
    }

    return reply.status(failure?.statusCode ?? 500).send({
      error: {
        code: 'request_failed',
        message: failure?.statusCode && failure.statusCode < 500
          ? failure.message
          : 'Request failed'
      }
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({
      error: {
        code: 'route_not_found',
        message: 'Route not found'
      }
    })
  );

  app.get(
    '/health',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {}
        }
      }
    },
    async () => healthResponse
  );

  return app;
}
