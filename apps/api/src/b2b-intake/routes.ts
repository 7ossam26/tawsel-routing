import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { B2bIntakeService } from './service.js';
import { SourceError, operations, type Operation } from './schema.js';
import { ProvisioningError } from '../provisioning/schema.js';
import { AccessDenied } from '../access/service.js';
import { IdempotencyConflict } from '../commands/kernel.js';

export async function b2bIntakeRoutes(app: FastifyInstance,pool: Pool) {
  const service=new B2bIntakeService(pool);
  app.addHook('onRequest',async(_req,reply)=>{reply.header('Cache-Control','no-store');});
  app.setErrorHandler((error,_request,reply)=>{
    const known=error instanceof SourceError || error instanceof ProvisioningError || error instanceof AccessDenied || error instanceof IdempotencyConflict;
    const malformed=(error as {statusCode?:number}).statusCode===400 || (error as {statusCode?:number}).statusCode===413;
    const status=known?error.statusCode:malformed?400:503;
    const code=known?error.code:malformed?'validation_failed':'dependency_unavailable';
    return reply.status(status).type('application/problem+json').send({type:`https://schemas.tawsel.invalid/problems/${code.replaceAll('_','-')}`,
      title:'Intake request failed',status,code,detail:known?error.message.slice(0,1000):malformed?'Invalid JSON request.':'Intake temporarily unavailable; retry the same action ID.',correlationId:randomUUID(),retryable:!known&&!malformed});
  });
  for(const operation of Object.keys(operations) as Operation[]) app.post(`/api/v1/intake/commands/${operation}`,{bodyLimit:1048576},async(request,reply)=>{
    if(Object.keys(request.query as object).length) throw new SourceError('validation_failed',400,'Unexpected query parameters.');
    const result=await service.command(request.headers.authorization,operation,request.body);
    return reply.status(result.response?.status ?? (result.receipt.businessStatus==='accepted'?200:409)).send(result);
  });
  app.get('/api/v1/intake/task',async request=>{
    const q=request.query as Record<string,unknown>;
    if(Object.keys(q).join(',')!=='externalId' || typeof q.externalId!=='string') throw new SourceError('validation_failed',400,'Provide externalId only.');
    return service.get(request.headers.authorization,q.externalId);
  });
  app.get('/api/v1/intake/cycles',async request=>{const q=request.query as Record<string,string>;if(Object.keys(q).some(k=>!['externalId','cursor'].includes(k)))throw new SourceError('validation_failed',400,'Invalid cycle query.');return service.cycles(request.headers.authorization,q.externalId!,q.cursor);});
  app.get('/api/v1/intake/tasks',async request=>{
    const q=request.query as Record<string,string>;
    if(Object.keys(q).some(k=>!['state','driverExternalId','limit','cursor'].includes(k)) || Object.values(q).some(v=>typeof v!=='string')) throw new SourceError('validation_failed',400,'Invalid list query.');
    return service.list(request.headers.authorization,q);
  });
  app.get('/api/v1/intake/results/:actionId',async(request,reply)=>{
    if(Object.keys(request.query as object).length)throw new SourceError('validation_failed',400,'Unexpected query parameters.');
    const result=await service.result(request.headers.authorization,(request.params as {actionId:string}).actionId);
    return reply.status(result.status==='pending'?202:200).send(result);
  });
}
