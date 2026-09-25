import cookie from '@fastify/cookie';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import type {AuthConfig} from '../auth/config.js';
import {sessionCookie} from '../auth/guards.js';
import {Sessions,AuthError} from '../auth/service.js';
import {AccessDenied} from '../access/service.js';
import type {PlanningAuthenticator} from '../planning/routes.js';
import {ReportingError,type Query} from './models.js';
import {Reporting} from './service.js';
const id={type:'string',format:'uuid'};
const shared={kind:{enum:['personal','company']},branchId:id,driverId:id};
const filters={...shared,roundId:id,outcome:{enum:['full','partial','refused','no-answer','unfinished','deferred']},snapshotId:{type:'string',pattern:'^[a-f0-9]{64}$'}};
export async function reportingRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator,service=new Reporting(pool)){
 await app.register(cookie);
 app.addHook('onRequest',async(_r,reply)=>{reply.header('Cache-Control','private, no-store').header('Vary','Cookie').header('X-Content-Type-Options','nosniff');});
 app.setErrorHandler((error,_r,reply)=>{
  const known=error instanceof ReportingError||error instanceof AccessDenied||error instanceof AuthError,invalid=!!(error as {validation?:unknown}).validation;
  const status=known?error.statusCode:invalid?400:503,code=known?error.code:invalid?'validation_failed':'dependency_unavailable';
  return reply.status(status).type('application/problem+json').send({type:`https://schemas.tawsel.invalid/problems/${code.replaceAll('_','-')}`,title:'Report unavailable',status,code,detail:known?error.message:invalid?'Invalid report filter.':'تعذر تحميل التقرير؛ حاول مجددًا.',correlationId:randomUUID(),retryable:!known&&!invalid});
 });
 const sessions=new Sessions(pool,config),use:PlanningAuthenticator=authenticate??((r,k,work)=>sessions.use(k,r.cookies[sessionCookie(k)],work));
 app.get('/api/v1/reports/workdays',{schema:{querystring:{type:'object',properties:{...shared,before:{type:'string',format:'date-time'}},required:['kind'],additionalProperties:false}}},async r=>{
  const q=r.query as Query&{kind:'personal'|'company';before?:string};return use(r,q.kind,p=>service.list(p,q));
 });
 app.get('/api/v1/reports/workdays/:workdayId',{schema:{querystring:{type:'object',properties:filters,required:['kind'],additionalProperties:false}}},async r=>{
  const q=r.query as Query&{kind:'personal'|'company'};return use(r,q.kind,p=>service.workday(p,(r.params as {workdayId:string}).workdayId,q));
 });
 app.get('/api/v1/reports/workdays/:workdayId/rounds/:roundId/timing',{schema:{querystring:{type:'object',properties:filters,required:['kind'],additionalProperties:false}}},async r=>{
  const q=r.query as Query&{kind:'personal'|'company'},params=r.params as {workdayId:string;roundId:string};return use(r,q.kind,p=>service.timing(p,params.workdayId,params.roundId,q));
 });
}
