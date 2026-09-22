import cookie from '@fastify/cookie';
import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { AuthConfig } from '../auth/config.js';
import { Sessions } from '../auth/service.js';
import { requireBrowserCsrf,sessionCookie } from '../auth/guards.js';
import type { AuthenticatedPrincipal } from '../access/service.js';
import type { ActionEnvelope } from '../commands/kernel.js';
import { Locations } from './service.js';
import { LocationError } from './geocoder.js';
export type LocationAuthenticator=<T>(request:FastifyRequest,kind:'personal'|'company',work:(p:AuthenticatedPrincipal)=>Promise<T>)=>Promise<T>;
export async function locationRoutes(app:FastifyInstance,pool:Pool,config:AuthConfig,service=new Locations(pool),authenticate?:LocationAuthenticator){
 await app.register(cookie);const sessions=new Sessions(pool,config);
 const auth:LocationAuthenticator=authenticate??((r,kind,work)=>sessions.use(kind,r.cookies[sessionCookie(kind)],p=>work(p)));
 function run<T>(r:FastifyRequest,work:(p:AuthenticatedPrincipal)=>Promise<T>){const kind=(r.query as {kind?:string}).kind;if(kind!=='company'&&kind!=='personal')throw new LocationError('validation_failed',400,'اختر مساحة الحساب.');return auth(r,kind,work);}
 app.addHook('onRequest',async(_r,reply)=>{reply.header('Cache-Control','no-store');});
 app.setErrorHandler((error,_r,reply)=>{const e=error as Error&{statusCode?:number;code?:string};return reply.status(e.statusCode??500).send({error:{code:e.code??'request_failed',message:e.statusCode?e.message:'تعذر إكمال الطلب.'}});});
 app.get('/api/v1/locations',r=>run(r,p=>service.list(p)));
 app.get('/api/v1/locations/:taskId',r=>run(r,p=>service.get(p,(r.params as {taskId:string}).taskId)));
 app.post('/api/v1/locations/:taskId/candidates',r=>{requireBrowserCsrf(r,config);return run(r,p=>service.search(p,(r.params as {taskId:string}).taskId,r.body));});
 app.put('/api/v1/locations/:taskId',async(r,reply)=>{
  requireBrowserCsrf(r,config);const envelope=r.body as ActionEnvelope;
  if(envelope?.resources?.taskId!==(r.params as {taskId:string}).taskId)throw new LocationError('validation_failed',400,'معرّف المهمة غير متطابق.');
  const result=await run(r,p=>service.confirm(p,envelope));return reply.status(result.response?.status??200).send(result);
 });
 app.get('/api/v1/maps/configuration',r=>run(r,async()=>({styleUrl:'/maps/style.json',coverage:'القاهرة الكبرى فقط — راجع حدود التغطية في الخريطة',attribution:'© OpenStreetMap contributors · Protomaps · ODbL'})));
}
