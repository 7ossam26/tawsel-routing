import cookie from '@fastify/cookie';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance,FastifyReply} from 'fastify';
import type {Pool} from 'pg';
import type {AuthConfig} from '../auth/config.js';
import {sessionCookie} from '../auth/guards.js';
import {Sessions,AuthError} from '../auth/service.js';
import {AccessDenied} from '../access/service.js';
import {ProvisioningError} from '../provisioning/schema.js';
import type {PlanningAuthenticator} from '../planning/routes.js';
import {MonitoringError,type Query,type Selection} from './models.js';
import {Monitoring,type ReadResult} from './service.js';
const properties={branchId:{type:'string',format:'uuid'},limit:{type:'integer',minimum:1,maximum:100},cursor:{type:'string',maxLength:512},sourceId:{type:'string',format:'uuid'}};
function setup(app:FastifyInstance){
 app.addHook('onRequest',async(_r,reply)=>{reply.header('Cache-Control','private, no-cache').header('Vary','Cookie, Authorization').header('X-Content-Type-Options','nosniff');});
 app.setErrorHandler((error,_r,reply)=>{
  const known=error instanceof MonitoringError||error instanceof AccessDenied||error instanceof AuthError||error instanceof ProvisioningError;
  const invalid=!!(error as {validation?:unknown}).validation;
  const status=known?error.statusCode:invalid?400:503,code=known?error.code:invalid?'validation_failed':'dependency_unavailable';
  return reply.status(status).header('Cache-Control','no-store').type('application/problem+json').send({type:`https://schemas.tawsel.invalid/problems/${code.replaceAll('_','-')}`,title:'Monitoring read failed',status,code,detail:known?error.message:invalid?'Invalid request.':'Refresh unavailable; retain the last confirmed view.',correlationId:randomUUID(),retryable:!known&&!invalid});
 });
}
function respond(reply:FastifyReply,r:ReadResult){
 reply.header('ETag',r.etag).header('X-Snapshot-Scope',r.body.scopeKey).header('X-Snapshot-Revision',String(r.body.snapshotRevision)).header('X-Refreshed-At',r.body.freshness.refreshedAt);
 return r.notModified?reply.status(304).send():reply.send(r.body);
}
const paths=[['drivers','driver',''],['trips','trip',''],['tasks','task','/history'],['workdays','workday','/history'],['actions','action','']] as const;
export async function monitoringRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator,service=new Monitoring(pool)){
 await app.register(cookie);setup(app);
 const sessions=new Sessions(pool,config),use:PlanningAuthenticator=authenticate??((r,k,work)=>sessions.use(k,r.cookies[sessionCookie(k)],work));
 for(const [path,kind,suffix] of paths)app.get(`/api/v1/monitoring/${path}/:id${suffix}`,{schema:{querystring:{type:'object',properties:{...properties,kind:{enum:['personal','company']}},required:kind==='action'?['kind','sourceId']:['kind'],additionalProperties:false}}},async(r,reply)=>{
  const q=r.query as Query&{kind:'personal'|'company';sourceId?:string};
  const s:Selection={kind,id:(r.params as {id:string}).id,...(q.sourceId?{sourceId:q.sourceId}:{})};
  return respond(reply,await use(r,q.kind,p=>service.read(p,s,q,r.headers['if-none-match'])));
 });
}
export async function monitoringIntegrationRoutes(app:FastifyInstance,pool:Pool,service=new Monitoring(pool)){
 setup(app);
 for(const [path,kind,suffix] of paths)app.get(`/api/v1/erp/monitoring/${path}/:id${suffix}`,{schema:{querystring:{type:'object',properties,required:kind==='action'?['sourceId']:[],additionalProperties:false}}},async(r,reply)=>{
  const q=r.query as Query&{sourceId?:string};const s:Selection={kind,id:(r.params as {id:string}).id,...(q.sourceId?{sourceId:q.sourceId}:{})};
  return respond(reply,await service.read({authorization:r.headers.authorization},s,q,r.headers['if-none-match']));
 });
}
