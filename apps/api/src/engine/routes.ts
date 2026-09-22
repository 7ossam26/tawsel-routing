import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import type { AuthConfig } from '../auth/config.js';
import { Sessions } from '../auth/service.js';
import { sessionCookie } from '../auth/guards.js';
import { AccessSession } from '../access/service.js';
import { validateModel } from './models.js';

export async function routingRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig) {
  await app.register(cookie);
  const sessions=new Sessions(pool,config);
  app.get('/api/v1/routing/profiles',{
    schema:{querystring:{type:'object',properties:{kind:{type:'string',enum:['company','personal']}},required:['kind'],additionalProperties:false}}
  },async(request,reply)=>{
    reply.header('Cache-Control','no-store');
    const {kind}=request.query as {kind:'company'|'personal'};
    return sessions.use(kind,request.cookies[sessionCookie(kind)],principal=>AccessSession.run(pool,principal,async access=>{
      access.requireCapability([{capability:'planning.manage',ownership:'assigned-branches'},{capability:'execution.own',ownership:'own-driver'}]);
      const result:components['schemas']['RoutingProfiles']={modes:['car','motorcycle','bicycle'],defaultCustomerServiceSeconds:600,liveVerification:'not-checked'};
      validateModel('Profiles',result,true);return result;
    }));
  });
}
