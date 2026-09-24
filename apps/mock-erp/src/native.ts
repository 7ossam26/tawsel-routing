import {readFile,readdir} from 'node:fs/promises';
import type {Pool} from 'pg';
import type {FastifyInstance} from 'fastify';
import {intakeClient} from '@tawsel/api-client/intake';
import {returnReceiverClient} from '@tawsel/api-client/returns';
import {provisioningClient} from '@tawsel/api-client/provisioning';
import {OutboxClient} from '@tawsel/api-client/outbox';
import {canonicalJson} from '@tawsel/api-client/validation';
import {sourceEnvelope,saveSource,sourceStatus,type SourceRecord,type SourceRow} from './source.js';
import {NativeSessions} from './native-auth.js';
import {validateNative,type ReceiverConfig} from './config.js';
import {ReceiverError} from './inbox.js';
import {consumerStatus} from './projection.js';
export async function nativeRoutes(app:FastifyInstance,pool:Pool,c:ReceiverConfig){
 validateNative(c);if(!c.native)return;
 const sessions=new NativeSessions(pool,c.native);await sessions.register(app);
 const token=c.tawselAuthorization!.replace(/^Bearer /,''),intake=intakeClient(c.tawselBaseUrl!,token),returns=returnReceiverClient(c.tawselBaseUrl!,token),provisioning=provisioningClient(c.tawselBaseUrl!,token);
 app.get('/native/state',async r=>{await sessions.use(r);return sourceStatus(pool);});
 app.get('/native/delivery',async r=>{await sessions.use(r);return new OutboxClient({baseUrl:c.tawselBaseUrl!,authorization:c.tawselAuthorization!}).queue({limit:100});});
 app.get('/native/tasks',async r=>{await sessions.use(r);const q=r.query as {cursor?:string};const result=await intake.list(q.cursor?{cursor:q.cursor}:{});if(result.status!==200)throw new ReceiverError(503,'tawsel_read_unavailable');return result.body;});
 app.get('/native/pending',async r=>{await sessions.use(r);const q=r.query as {driverId:string;branchId:string;cursor?:string};const result=await returns.pending(q.driverId,q.branchId,q.cursor);if(result.status!==200)throw new ReceiverError(result.status,'tawsel_read_unavailable');return result.body;});
 app.get('/native/return',async r=>{await sessions.use(r);const result=await returns.read((r.query as {requestId:string}).requestId);if(result.status!==200)throw new ReceiverError(result.status,'tawsel_read_unavailable');return result.body;});
 app.get('/native/provisioning',async r=>{await sessions.use(r);const q=r.query as {entity:'user';externalId:string};const result=await provisioning.status(q.entity,q.externalId);if(result.status!==200)throw new ReceiverError(result.status,'tawsel_read_unavailable');return result.body;});
 app.get('/native/projections',async r=>{
  await sessions.use(r);const rows=(await pool.query('SELECT aggregate_type,aggregate_id FROM mock_erp.streams ORDER BY aggregate_type,aggregate_id LIMIT 200')).rows;
  return Promise.all(rows.map(row=>consumerStatus(pool,c,{type:row.aggregate_type,id:row.aggregate_id})));
 });
 app.post('/native/commands',async(r,reply)=>{
  const actor=await sessions.use(r,true);let input:{actionId:string;operationId:string;payload:Record<string,unknown>;expectedRevisions:Record<string,number>};
  try{input=JSON.parse((r.body as Buffer).toString('utf8')) as typeof input;}catch{throw new ReceiverError(400,'invalid_json');}
  if(!input||Object.keys(input).some(k=>!['actionId','operationId','payload','expectedRevisions'].includes(k))||!input.payload||typeof input.payload!=='object'||!input.expectedRevisions||typeof input.expectedRevisions!=='object'||!(/^[a-f0-9-]{36}$/).test(input.actionId))throw new ReceiverError(400,'invalid_source_form');
  const command=sourceEnvelope(c,input.operationId,input.payload,input.actionId);
  const old=(await pool.query<SourceRow>('SELECT * FROM mock_erp.source_commands WHERE action_id=$1',[input.actionId])).rows[0];
  if(old){if(old.actor_subject!==actor.subject||canonicalJson(old.envelope)!==canonicalJson(command))throw new ReceiverError(409,'source_identity_conflict');return reply.status(200).send(old);}
  const p=input.payload,op=input.operationId;let keys:{kind:string;id:string}[];
  if(op.startsWith('branch.'))keys=[{kind:'branch',id:String(p.externalId)}];
  else if(op.startsWith('role.'))keys=[{kind:'role',id:String(p.externalId)}];
  else if(op.startsWith('user.'))keys=[{kind:'user',id:String(p.externalId)}];
  else if(op.startsWith('driver.'))keys=[{kind:'driver',id:String(p.externalId)}];
  else if(op.startsWith('return.'))keys=[{kind:'return',id:String(p.requestId)}];
  else keys=Array.isArray(p.items)?p.items.map((item:{externalId:string})=>({kind:'shipment',id:item.externalId})):[{kind:'shipment',id:String(p.externalId)}];
  const records:SourceRecord[]=[];
  for(const k of keys){const current=(await pool.query('SELECT desired FROM mock_erp.source_records WHERE kind=$1 AND external_id=$2',[k.kind,k.id])).rows[0];records.push({kind:k.kind,externalId:k.id,expectedRevision:input.expectedRevisions[`${k.kind}/${k.id}`]!,desired:{...current?.desired,...p,...(op==='intake.submitSnapshot'?{snapshot:p}:{})}});}
  return reply.status(202).send(await saveSource(pool,c,actor.subject,{command,records}));
 });
 // Static assets are pre-enumerated, never paths obtained from requests.
 const root=new URL('../ui-dist/',import.meta.url),mime:Record<string,string>={js:'text/javascript',css:'text/css',woff2:'font/woff2'};
 app.get('/',async(_r,reply)=>reply.type('text/html').send(await readFile(new URL('index.html',root))));
 for(const name of await readdir(new URL('assets/',root))){app.get(`/assets/${name}`,async(_r,reply)=>reply.type(mime[name.split('.').at(-1)!]??'application/octet-stream').send(await readFile(new URL(`assets/${name}`,root))));}
}
