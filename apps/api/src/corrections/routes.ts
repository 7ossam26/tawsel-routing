import cookie from '@fastify/cookie';
import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import {AccessDenied} from '../access/service.js';
import {OutcomeError} from '../outcomes/models.js';
import {DeviceError} from '../devices/models.js';
import type {AuthConfig} from '../auth/config.js';
import {sessionCookie,requireBrowserCsrf} from '../auth/guards.js';
import {AuthError,Sessions} from '../auth/service.js';
import type {PlanningAuthenticator} from '../planning/routes.js';
import {Corrections} from './service.js';
import {IdempotencyConflict} from '../commands/kernel.js';
import {requireCorrection} from './models.js';
import {requireDevice} from '../devices/models.js';
export async function correctionRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator,service=new Corrections(pool)){
 await app.register(cookie);
 const sessions=new Sessions(pool,config),use:PlanningAuthenticator=authenticate??((request,kind,work)=>sessions.use(kind,request.cookies[sessionCookie(kind)],principal=>work(principal)));
 const query={type:'object',properties:{kind:{type:'string',enum:['personal','company']},deviceId:{type:'string',format:'uuid'}},required:['kind','deviceId'],additionalProperties:false};
 app.addHook('onRequest',async(_request,reply)=>{reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');});
 app.setErrorHandler((error,_request,reply)=>{
  if(error instanceof OutcomeError||error instanceof DeviceError||error instanceof AccessDenied||error instanceof AuthError||error instanceof IdempotencyConflict)return reply.status(error.statusCode).send({error:{code:error.code,message:error.message}});
  if((error as {validation?:unknown}).validation)return reply.status(400).send({error:{code:'validation_failed',message:'راجع بيانات الطلب.'}});
  return reply.status(503).send({error:{code:'request_failed',message:'تعذر حفظ التصحيح؛ تحقق من حالته قبل المحاولة.'}});
 });
 app.get('/api/v1/corrections/attempts/:attemptId',{schema:{querystring:query}},async request=>{const {kind,deviceId}=request.query as {kind:'personal'|'company';deviceId:string},{attemptId}=request.params as {attemptId:string};return use(request,kind,principal=>service.availability(principal,attemptId,deviceId));});
 const kindQuery={type:'object',properties:{kind:query.properties.kind},required:['kind'],additionalProperties:false};
 for(const path of ['outcomes','adopt'])app.post(`/api/v1/corrections/${path}`,{schema:{querystring:kindQuery}},async(request,reply)=>{
  requireBrowserCsrf(request,config);if(path==='adopt')requireDevice('AdoptionCommand',request.body);else requireCorrection('CorrectCommand',request.body);
  const {kind}=request.query as {kind:'personal'|'company'},result=await use(request,kind,principal=>service.command(principal,request.body));requireCorrection('ActionResult',result);return reply.status(result.response?.status??202).send(result);
 });
 app.get('/api/v1/corrections/actions/:actionId',{schema:{querystring:kindQuery}},async(request,reply)=>{const {kind}=request.query as {kind:'personal'|'company'},{actionId}=request.params as {actionId:string};const result=await use(request,kind,principal=>service.result(principal,actionId));return reply.status(result.status==='pending'?202:200).send(result);});
}
