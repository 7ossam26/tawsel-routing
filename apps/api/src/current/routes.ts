import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessDenied } from '../access/service.js';
import { IdempotencyConflict } from '../commands/kernel.js';
import type { AuthConfig } from '../auth/config.js';
import { requireBrowserCsrf,sessionCookie } from '../auth/guards.js';
import { AuthError,Sessions } from '../auth/service.js';
import type { PlanningAuthenticator } from '../planning/routes.js';
import { CurrentActivity } from './service.js';
import { CurrentError,requireCurrent } from './models.js';
export async function currentRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator,service=new CurrentActivity(pool)){
 await app.register(cookie);
 const sessions=new Sessions(pool,config),use:PlanningAuthenticator=authenticate??((request,kind,work)=>sessions.use(kind,request.cookies[sessionCookie(kind)],principal=>work(principal)));
 const query={type:'object',properties:{kind:{type:'string',enum:['personal','company']}},required:['kind'],additionalProperties:false};
 app.addHook('onRequest',async(_request,reply)=>{reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');});
 app.setErrorHandler((error,_request,reply)=>{
  if(error instanceof CurrentError||error instanceof AccessDenied||error instanceof AuthError||error instanceof IdempotencyConflict)return reply.status(error.statusCode).send({error:{code:error.code,message:error.message}});
  if((error as {validation?:unknown}).validation)return reply.status(400).send({error:{code:'validation_failed',message:'راجع بيانات الطلب.'}});
  return reply.status(500).send({error:{code:'request_failed',message:'تعذر حفظ الإجراء؛ تحقّق من حالته.'}});
 });
 for(const [path,name] of [['heading','SelectHeadingCommand'],['arrival','ArrivalCommand'],['origin','CorrectOriginCommand']])app.post(`/api/v1/current/${path}`,{schema:{querystring:query}},async(request,reply)=>{
  requireBrowserCsrf(request,config);requireCurrent(name!,request.body);const {kind}=request.query as {kind:'personal'|'company'};
  const result=await use(request,kind,principal=>service.command(principal,request.body));requireCurrent('ActionResult',result);return reply.status(result.response?.status??202).send(result);
 });
 app.get('/api/v1/current/rounds/:roundId',{schema:{querystring:query}},async request=>{const {kind}=request.query as {kind:'personal'|'company'},{roundId}=request.params as {roundId:string};return use(request,kind,principal=>service.read(principal,roundId));});
 app.get('/api/v1/current/actions/:actionId',{schema:{querystring:query}},async(request,reply)=>{const {kind}=request.query as {kind:'personal'|'company'},{actionId}=request.params as {actionId:string};const result=await use(request,kind,principal=>service.result(principal,actionId));return reply.status(result.status==='pending'?202:200).send(result);});
}
