import cookie from '@fastify/cookie';
import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import {AccessDenied} from '../access/service.js';
import {IdempotencyConflict} from '../commands/kernel.js';
import type {AuthConfig} from '../auth/config.js';
import {requireBrowserCsrf,sessionCookie} from '../auth/guards.js';
import {AuthError,Sessions} from '../auth/service.js';
import type {PlanningAuthenticator} from '../planning/routes.js';
import {Devices} from './service.js';
import {DeviceError} from './models.js';
export async function deviceRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator,service=new Devices(pool)){
 await app.register(cookie);const sessions=new Sessions(pool,config),use:PlanningAuthenticator=authenticate??((request,kind,work)=>sessions.use(kind,request.cookies[sessionCookie(kind)],principal=>work(principal)));
 const query={type:'object',properties:{kind:{type:'string',enum:['personal','company']}},required:['kind'],additionalProperties:false};
 const viewQuery={...query,properties:{...query.properties,deviceId:{type:'string',format:'uuid'}},required:['kind','deviceId']};
 app.addHook('onRequest',async(_request,reply)=>{reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');});
 app.setErrorHandler((error,_request,reply)=>{
  if(error instanceof DeviceError||error instanceof AccessDenied||error instanceof AuthError||error instanceof IdempotencyConflict)return reply.status(error.statusCode).send({error:{code:error.code,message:error.message}});
  if((error as {validation?:unknown}).validation)return reply.status(400).send({error:{code:'validation_failed',message:'راجع بيانات الطلب.'}});
  return reply.status(500).send({error:{code:'request_failed',message:'تعذر حفظ الإجراء؛ تحقّق من حالته.'}});
 });
 app.post('/api/v1/devices/takeover',{schema:{querystring:query}},async(request,reply)=>{
  requireBrowserCsrf(request,config);const {kind}=request.query as {kind:'personal'|'company'};
  const result=await use(request,kind,p=>service.takeover(p,request.body));return reply.status(result.response?.status??202).send(result);
 });
 for(const snapshot of [false,true])app.get(`/api/v1/devices/rounds/:roundId${snapshot?'/snapshot':''}`,{schema:{querystring:viewQuery}},async request=>{
  const {kind,deviceId}=request.query as {kind:'personal'|'company';deviceId:string},{roundId}=request.params as {roundId:string};
  return snapshot?use(request,kind,p=>service.snapshot(p,roundId,deviceId)):use(request,kind,p=>service.context(p,roundId,deviceId));
 });
 app.get('/api/v1/actions/:actionId',{schema:{querystring:query}},async(request,reply)=>{
  const {kind}=request.query as {kind:'personal'|'company'},{actionId}=request.params as {actionId:string};const result=await use(request,kind,p=>service.result(p,actionId));return reply.status(result.status==='pending'?202:200).send(result);
 });
 app.get('/api/v1/evidence/:actionId',{schema:{querystring:viewQuery}},async request=>{
  const {kind,deviceId}=request.query as {kind:'personal'|'company';deviceId:string},{actionId}=request.params as {actionId:string};return use(request,kind,p=>service.evidence(p,actionId,deviceId));
 });
 app.post('/api/v1/evidence/former-device',{schema:{querystring:query}},async(request,reply)=>{
  requireBrowserCsrf(request,config);const {kind}=request.query as {kind:'personal'|'company'};
  // HTTP success acknowledges durable evidence, not business acceptance.
  const result=await use(request,kind,p=>service.receive(p,request.body));return reply.status(200).send(result);
 });
}
