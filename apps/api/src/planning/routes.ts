import cookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { AuthenticatedPrincipal } from '../access/service.js';
import { AccessDenied, LifecycleDenied } from '../access/service.js';
import { IdempotencyConflict } from '../commands/kernel.js';
import type { AuthConfig } from '../auth/config.js';
import { requireBrowserCsrf, sessionCookie } from '../auth/guards.js';
import { AuthError, Sessions } from '../auth/service.js';
import { PlanningError } from './models.js';
import { PlanningService } from './service.js';

export type PlanningAuthenticator=<T>(request:FastifyRequest,kind:'personal'|'company',work:(principal:AuthenticatedPrincipal)=>Promise<T>)=>Promise<T>;
export async function planningRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator){
 await app.register(cookie);
 const sessions=new Sessions(pool,config),service=new PlanningService(pool);
 const useSession:PlanningAuthenticator=authenticate??((request,kind,work)=>sessions.use(kind,request.cookies[sessionCookie(kind)],principal=>work(principal)));
 const kind={type:'string',enum:['personal','company']},query={type:'object',properties:{kind},required:['kind'],additionalProperties:false};
 app.addHook('onRequest',async(_request,reply)=>{reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');});
 app.setErrorHandler((error,_request,reply)=>{
  if(error instanceof PlanningError||error instanceof AuthError||error instanceof AccessDenied||error instanceof LifecycleDenied||error instanceof IdempotencyConflict)return reply.status(error.statusCode).send({error:{code:error.code,message:error.message}});
  if((error as {validation?:unknown}).validation)return reply.status(400).send({error:{code:'validation_failed',message:'راجع بيانات الطلب.'}});
  return reply.status(500).send({error:{code:'request_failed',message:'تعذر إكمال التخطيط.'}});
 });
 for(const operation of ['planning.saveDraft','planning.requestPreview','planning.requestReplan']){
  app.post(`/api/v1/planning/commands/${operation}`,{schema:{querystring:query}},async(request,reply)=>{
   requireBrowserCsrf(request,config);
   if((request.body as {operationId?:string})?.operationId!==operation)throw new PlanningError('validation_failed',400,'نوع العملية غير متطابق.');
   const {kind}=request.query as {kind:'company'|'personal'};
   const result=await useSession(request,kind,principal=>service.command(principal,request.body));
   return reply.status(result.response?.status??202).send(result);
  });
 }
 app.get('/api/v1/planning/jobs/:jobId',{schema:{querystring:query}},async request=>{
  const {kind}=request.query as {kind:'company'|'personal'}, {jobId}=request.params as {jobId:string};
  return useSession(request,kind,principal=>service.job(principal,jobId));
 });
 app.get('/api/v1/planning/drivers/:driverId/plans',{schema:{querystring:{...query,properties:{kind,limit:{type:'integer',minimum:1,maximum:50},beforeRevision:{type:'integer',minimum:1}}}}},async request=>{
  const {kind,limit,beforeRevision}=request.query as {kind:'company'|'personal';limit?:number;beforeRevision?:number}, {driverId}=request.params as {driverId:string};
  return useSession(request,kind,principal=>service.plans(principal,driverId,limit,beforeRevision));
 });
}
