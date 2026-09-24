import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import {ProvisioningError} from '../provisioning/schema.js';
import {OutboxService} from './service.js';
import {OutboxReads} from './reads.js';
import type {OutboxConfig} from './config.js';

const invalid=()=>new ProvisioningError('validation_failed',400,'Invalid delivery request');
function uuid(value:unknown):string{if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value))throw invalid();return value;}
function integer(value:unknown,fallback:number,min:number,max:number):number{if(value===undefined)return fallback;if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<min||Number(value)>max)throw invalid();return Number(value);}
function query(raw:unknown,allowed:string[]){const q=raw as Record<string,unknown>;if(Object.keys(q).some(k=>!allowed.includes(k)))throw invalid();return q;}
export async function outboxRoutes(app:FastifyInstance,pool:Pool,config?:OutboxConfig){
 const reads=new OutboxReads(pool),service=config?new OutboxService(pool,config):undefined;
 app.addHook('onRequest',async(_r,reply)=>{reply.header('cache-control','no-store');});
 app.setErrorHandler((error,_r,reply)=>{
  const e=error as Error&{statusCode?:number;code?:string},known=e instanceof ProvisioningError||e.code==='idempotency_conflict';
  const status=known?e.statusCode!:e.statusCode===400||e.statusCode===413?400:503;
  const code=known?e.code!:status===400?'validation_failed':'dependency_unavailable';
  return reply.status(status).type('application/problem+json').send({type:`https://schemas.tawsel.invalid/problems/${code.replaceAll('_','-')}`,title:known?e.message:'Delivery operation unavailable',status,code,correlationId:randomUUID(),retryable:status===503});
 });
 for(const op of ['integration.configureWebhook','integration.rotateSigningKey','integration.retryDelivery'])app.post(`/api/v1/integration/commands/${op}`,{bodyLimit:16384},async(request,reply)=>{
  query(request.query,[]);if(!service)throw new ProvisioningError('dependency_unavailable',503,'Outbox operator configuration is missing');
  const result=await service.command(request.headers.authorization,op,request.body);return reply.status(result.response?.status??200).send(result);
 });
 app.get('/api/v1/integration/deliveries',async r=>{const q=query(r.query,['limit','cursor']);return reads.queue(r.headers.authorization,integer(q.limit,50,1,100),q.cursor===undefined?undefined:uuid(q.cursor));});
 app.get('/api/v1/integration/deliveries/:eventId',async r=>{const q=query(r.query,['limit','beforeAttempt']);return reads.detail(r.headers.authorization,uuid((r.params as {eventId:string}).eventId),integer(q.limit,50,1,100),q.beforeAttempt===undefined?undefined:integer(q.beforeAttempt,0,1,2147483647));});
 app.get('/api/v1/integration/replay',async r=>{const q=query(r.query,['aggregateType','aggregateId','afterSequence','limit']);if(!['task','assignment','trip','workday','return-request','integration'].includes(String(q.aggregateType)))throw invalid();return reads.replay(r.headers.authorization,String(q.aggregateType),uuid(q.aggregateId),integer(q.afterSequence,0,0,Number.MAX_SAFE_INTEGER),integer(q.limit,50,1,100));});
}
