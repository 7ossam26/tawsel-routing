import cookie from '@fastify/cookie';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import type {AuthConfig} from '../auth/config.js';
import {requireBrowserCsrf,sessionCookie} from '../auth/guards.js';
import {Sessions,AuthError} from '../auth/service.js';
import {AccessDenied} from '../access/service.js';
import {ProvisioningError} from '../provisioning/schema.js';
import {IdempotencyConflict} from '../commands/kernel.js';
import type {PlanningAuthenticator} from '../planning/routes.js';
import {ReturnError} from './models.js';
import {Returns} from './service.js';
import {ReturnReceiver} from './receiver.js';
function errors(app:FastifyInstance){
 app.addHook('onRequest',async(_r,reply)=>{reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');});
 app.setErrorHandler((error,_r,reply)=>{const known=error instanceof ReturnError||error instanceof AccessDenied||error instanceof AuthError||error instanceof ProvisioningError||error instanceof IdempotencyConflict;
  const invalid=!!(error as {validation?:unknown}).validation||(error as {statusCode?:number}).statusCode===400;
  const status=known?error.statusCode:invalid?400:503,code=known?error.code:invalid?'validation_failed':'dependency_unavailable';
  return reply.status(status).type('application/problem+json').send({type:`https://schemas.tawsel.invalid/problems/${code.replaceAll('_','-')}`,title:'Return request failed',status,code,detail:known?error.message:invalid?'Invalid request.':'لم يتأكد الحفظ؛ انتظر أو أعد نفس الطلب.',correlationId:randomUUID(),retryable:!known&&!invalid});});
}
export async function returnDriverRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator,service=new Returns(pool)){
 await app.register(cookie);errors(app);const sessions=new Sessions(pool,config),use:PlanningAuthenticator=authenticate??((r,k,work)=>sessions.use(k,r.cookies[sessionCookie(k)],work));
 const query={type:'object',properties:{kind:{enum:['personal','company']}},required:['kind'],additionalProperties:false};
 app.post('/api/v1/returns/request',{schema:{querystring:query}},async(r,reply)=>{requireBrowserCsrf(r,config);const result=await use(r,(r.query as {kind:'company'}).kind,p=>service.request(p,r.body));return reply.status(result.response?.status??(result.receipt.businessStatus==='accepted'?200:result.receipt.problem?.status??409)).send(result);});
 app.get('/api/v1/returns/groups',{schema:{querystring:query}},async r=>use(r,(r.query as {kind:'company'}).kind,p=>service.groups(p)));
 app.get('/api/v1/returns/requests/:requestId',{schema:{querystring:query}},async r=>use(r,(r.query as {kind:'company'}).kind,p=>service.read(p,(r.params as {requestId:string}).requestId)));
 app.post('/api/v1/returns/requests/:requestId/confirmation',{schema:{querystring:query}},async r=>{requireBrowserCsrf(r,config);return use(r,(r.query as {kind:'company'}).kind,p=>service.confirm(p,(r.params as {requestId:string}).requestId,r.body));});
 app.get('/api/v1/returns/actions/:actionId',{schema:{querystring:query}},async(r,reply)=>{const result=await use(r,(r.query as {kind:'company'}).kind,p=>service.result(p,(r.params as {actionId:string}).actionId));return reply.status(result.status==='pending'?202:200).send(result);});
}
export async function returnReceiverRoutes(app:FastifyInstance,pool:Pool,service=new ReturnReceiver(pool)){
 errors(app);
 for(const operation of ['return.confirmSubsetReceipt','return.recordDisposition'] as const)app.post(`/api/v1/erp/returns/commands/${operation}`,async(r,reply)=>{const result=await service.command(r.headers.authorization,operation,r.body);return reply.status(result.response?.status??(result.receipt.businessStatus==='accepted'?200:result.receipt.problem?.status??409)).send(result);});
 app.get('/api/v1/erp/returns/actions/:actionId',async(r,reply)=>{const result=await service.result(r.headers.authorization,(r.params as {actionId:string}).actionId);return reply.status(result.status==='pending'?202:200).send(result);});
 app.get('/api/v1/erp/returns/requests/:requestId',async r=>service.read(r.headers.authorization,(r.params as {requestId:string}).requestId));
 app.get('/api/v1/erp/returns/pending',{schema:{querystring:{type:'object',properties:{driverId:{type:'string'},sourceBranchId:{type:'string'},cursor:{type:'string'}},required:['driverId','sourceBranchId'],additionalProperties:false}}},async r=>{const q=r.query as {driverId:string;sourceBranchId:string;cursor?:string};return service.list(r.headers.authorization,q.driverId,q.sourceBranchId,q.cursor);});
}
