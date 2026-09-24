import {randomUUID,timingSafeEqual} from 'node:crypto';
import Fastify from 'fastify';
import type {Pool} from 'pg';
import type {ReceiverConfig} from './config.js';
import {receive,ReceiverError,type ReceiptFaults} from './inbox.js';
import {conforms} from './inbox.js';
import {consumerStatus} from './projection.js';
import type {components} from '@tawsel/api-client';
import {nativeRoutes} from './native.js';
import {publicSourceStatus} from './source.js';
export function statusAuthorization(actual:string|undefined,c:ReceiverConfig){
 const expected=Buffer.from(`Bearer ${c.statusToken}`),value=Buffer.from(actual??'');
 if(value.length!==expected.length||!timingSafeEqual(value,expected))throw new ReceiverError(401,'unauthenticated');
}
export function receiverApp(pool:Pool,c:ReceiverConfig,faults:ReceiptFaults={}){
 const app=Fastify({logger:false,bodyLimit:1_048_576});
 app.removeAllContentTypeParsers();app.addContentTypeParser('application/json',{parseAs:'buffer'},(_r,b,done)=>done(null,b));
 app.addHook('onRequest',async(_r,reply)=>{reply.header('cache-control','no-store');});
 app.setErrorHandler((error,_r,reply)=>{const known=error instanceof ReceiverError,status=known?error.statusCode:503;return reply.status(status).type('application/problem+json').send({type:'https://schemas.tawsel.invalid/problems/receiver',title:'Mock ERP receiver request failed',status,code:known?error.code:'receiver_unavailable',correlationId:randomUUID(),retryable:status===503});});
 app.get('/health',async()=>({service:'external-mock-erp',version:'0.1.0'}));
 app.get('/api/v1/source/status',async r=>{statusAuthorization(r.headers.authorization,c);if(Object.keys(r.query as object).length)throw new ReceiverError(400,'invalid_query');return publicSourceStatus(pool,c);});
 app.get('/api/v1/consumer/status',async r=>{
  statusAuthorization(r.headers.authorization,c);
  const q=r.query as {aggregateType?:string;aggregateId?:string};
  if(Object.keys(q).some(k=>!['aggregateType','aggregateId'].includes(k)))throw new ReceiverError(400,'invalid_query');
  const aggregate={type:q.aggregateType,id:q.aggregateId};
  if(!conforms('consumer.schema.json#/$defs/Aggregate',aggregate))throw new ReceiverError(400,'invalid_query');
  return consumerStatus(pool,c,aggregate as components['schemas']['ConsumerAggregate']);
 });
 app.post('/api/v1/consumer/events',async(r,reply)=>{
  if(Object.keys(r.query as object).length)throw new ReceiverError(400,'invalid_query');
  const headers=Object.fromEntries(Object.entries(r.headers).map(([k,v])=>[k,typeof v==='string'?v:undefined]));
  return reply.send(await receive(pool,c,r.body as Buffer,headers,faults));
 });
 if(c.native)app.register(a=>nativeRoutes(a,pool,c));
 return app;
}
