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
import {ReportExports,type ExportRequest} from './export.js';
const id={type:'string',format:'uuid'};
const shared={kind:{enum:['personal','company']},branchId:id,driverId:id};
const filters={...shared,roundId:id,outcome:{enum:['full','partial','refused','no-answer','unfinished','deferred']},snapshotId:{type:'string',pattern:'^[a-f0-9]{64}$'}};
export async function reportingRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,authenticate?:PlanningAuthenticator,service=new Reporting(pool),exports=new ReportExports(pool)){
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
 const exportFilters={type:'object',properties:{roundId:id,driverId:id,branchId:id,outcome:filters.outcome},additionalProperties:false};
 app.post('/api/v1/reports/workdays/:workdayId/exports',{schema:{querystring:{type:'object',properties:{kind:shared.kind},required:['kind'],additionalProperties:false},body:{type:'object',properties:{snapshotId:{type:'string',pattern:'^[a-f0-9]{64}$'},filters:exportFilters},required:['snapshotId'],additionalProperties:false}}},async(r,reply)=>{
  const q=r.query as {kind:'personal'|'company'},workdayId=(r.params as {workdayId:string}).workdayId,result=await use(r,q.kind,p=>exports.create(p,q.kind,workdayId,r.body as ExportRequest));return reply.status(201).send(result);
 });
 app.get('/api/v1/report-exports/:exportId',{schema:{querystring:{type:'object',properties:{kind:shared.kind},required:['kind'],additionalProperties:false},params:{type:'object',properties:{exportId:id},required:['exportId'],additionalProperties:false}}},async r=>{
  const q=r.query as {kind:'personal'|'company'};return use(r,q.kind,p=>exports.status(p,q.kind,(r.params as {exportId:string}).exportId));
 });
 app.get('/api/v1/report-exports/:exportId/download',{schema:{querystring:{type:'object',properties:{kind:shared.kind},required:['kind'],additionalProperties:false},params:{type:'object',properties:{exportId:id},required:['exportId'],additionalProperties:false}}},async(r,reply)=>{
  const q=r.query as {kind:'personal'|'company'},result=await use(r,q.kind,p=>exports.download(p,q.kind,(r.params as {exportId:string}).exportId));return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition',`attachment; filename="${result.status.fileName}"`).header('Content-Length',String(result.buffer.byteLength)).send(result.buffer);
 });
}
