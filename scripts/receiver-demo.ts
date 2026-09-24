import {randomBytes} from 'node:crypto';
import {writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {components} from '@tawsel/api-client';
import {OutboxClient} from '@tawsel/api-client/outbox';
import {prepareOutboxBusiness} from './outbox-demo.js';
import {createReceiverDatabase} from './mock-erp-database.js';
import {receiverProcess} from '../apps/mock-erp/test/support/process.js';
import {receiverWorker,senderProcess} from '../apps/api/test/support/receiver-harness.js';
import {runOutboxOnce} from '../apps/api/src/outbox/worker.js';
import {checkReceiver,type ReceiverConformanceConfig} from '../tests/erp-conformance/receiver.js';
import type {ReceiverConfig} from '../apps/mock-erp/src/config.js';

/** Setup is deliberately internal and labelled. The child consumer and portable
 * checker receive public artifacts/credentials only, over actual HTTP. */
export async function receiverDemo(options:{entry?:string;cwd?:string;checker?:string}={}){
 const f=await prepareOutboxBusiness(),db=await createReceiverDatabase();
 const c:ReceiverConfig={...f.scope,keys:[f.key],statusToken:randomBytes(32).toString('hex'),host:'127.0.0.1',port:0,testLoopback:true};
 let receiver=await receiverProcess(db.url,c,undefined,options);
 const senderConfig={encryptionKey:randomBytes(32),keys:[{...f.scope,...f.key}],destinations:[{...f.scope,url:`${receiver.url}/api/v1/consumer/events`}],testLoopback:true};
 let sender=await senderProcess(f.db.url,senderConfig);
 c.tawselBaseUrl=sender.url;c.tawselAuthorization=`Bearer ${f.f.source.token}`;
 const api=new OutboxClient({baseUrl:sender.url,authorization:c.tawselAuthorization});
 const command=(op:string,p:object)=>f.f.source.command(op,p) as Parameters<OutboxClient['command']>[0];
 let worker:Awaited<ReturnType<typeof receiverWorker>>|undefined;
 try{
  await api.command(command('integration.configureWebhook',{url:senderConfig.destinations[0]!.url,enabled:true,expectedRevision:0}));
  await api.command(command('integration.rotateSigningKey',{keyId:f.key.keyId,overlapSeconds:300}));
  // Sender completion response loss after an actual durable callback; kill-like
  // interruption outside completion leaves its committed lease for recovery.
  await runOutboxOnce(f.db.pool,senderConfig,{async afterSend(){throw new Error('injected sender completion loss');}}).catch(e=>{if(e.message!=='injected sender completion loss')throw e;});
  const receivedBefore=(await db.pool.query('SELECT event_id,applied_at FROM mock_erp.inbox')).rows;
  if(receivedBefore.length!==1||receivedBefore[0].applied_at!==null)throw new Error('Missing separate durable receipt');
  const firstId=receivedBefore[0].event_id as string;
  const receiverPort=new URL(receiver.url).port,senderPort=new URL(sender.url).port;
  await receiver.close();await sender.close();
  receiver=await receiverProcess(db.url,{...c,port:Number(receiverPort)},undefined,options);
  sender=await senderProcess(f.db.url,senderConfig,Number(senderPort));
  await f.db.pool.query("UPDATE tawsel.outbox_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE event_id=$1",[firstId]);
  for(let n=0;n<100&&await runOutboxOnce(f.db.pool,senderConfig);n++){/* actual signed sender drain */}
  const queue=await api.queue({limit:100});if(queue.counts.failed||queue.counts.pending||queue.counts.sending)throw new Error('Sender did not drain');
  const aggregates=[...new Map(queue.items.map(i=>[`${i.aggregate.type}/${i.aggregate.id}`,{type:i.aggregate.type,id:i.aggregate.id}])).values()];
  worker=await receiverWorker(db.url,c,options);
  const conformance:ReceiverConformanceConfig={apiUrl:sender.url,callbackUrl:`${receiver.url}/api/v1/consumer/events`,statusUrl:`${receiver.url}/api/v1/consumer/status`,authorization:c.tawselAuthorization,statusAuthorization:`Bearer ${c.statusToken}`,...f.scope,signingKey:f.key,aggregates,expected:{deliveredPieces:2,reportedMinor:25000,receivedPieces:1}};
  const result=options.checker?await externalConformance(options.checker,conformance,options.cwd):await checkReceiver(conformance);
  const snapshots=[];for(const a of aggregates)snapshots.push(await api.snapshot(a.type,a.id));
  const deadline=Date.now()+15000;let reports:components['schemas']['ConsumerReportRead'][]=[];
  do{reports=await Promise.all(aggregates.map(a=>api.applied(a.type,a.id)));if(reports.every(r=>r.report&&r.report.checkpoint.pendingCount===0))break;await new Promise(r=>setTimeout(r,100));}while(Date.now()<deadline);
  if(reports.some(r=>!r.report||r.report.checkpoint.pendingCount!==0))throw new Error('No independent applied reports');
  const history=(await db.pool.query('SELECT event_type,payload FROM mock_erp.transitions ORDER BY event_type')).rows;
  if(history.length!==result.uniqueEvents)throw new Error('Duplicate/missing transition history');
  const firstAttempts=(await f.db.pool.query('SELECT result FROM tawsel.outbox_delivery_attempts WHERE event_id=$1 ORDER BY attempt_number',[firstId])).rows.map(r=>r.result);
  if(firstAttempts.join(',')!=='lease-expired,received')throw new Error('Sender restart not observed');
  return {result:{...result,senderRestart:true,receiverRestart:true,firstAttempts,appliedReports:reports.length},snapshots,reports,history};
 }finally{await worker?.close();await receiver.close();await sender.close();await db.close();await f.close();}
}
async function externalConformance(checker:string,config:ReceiverConformanceConfig,cwd?:string):Promise<Awaited<ReturnType<typeof checkReceiver>>>{
 const directory=await mkdtemp(join(tmpdir(),'tawsel-conformance-')),path=join(directory,'config.json');await writeFile(path,JSON.stringify(config));
 const env:NodeJS.ProcessEnv={};for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[checker,path],{env,windowsHide:true,stdio:['ignore','pipe','pipe'],...(cwd?{cwd}:{})});let out='',err='';child.stdout.on('data',x=>out+=String(x));child.stderr.on('data',x=>err+=String(x));
  child.once('error',reject);child.once('exit',code=>{if(code!==0)reject(new Error(`Public checker ${code}: ${err}`));else try{resolve(JSON.parse(out) as Awaited<ReturnType<typeof checkReceiver>>);}catch{reject(new Error('Invalid checker output'));}});
 });}finally{await rm(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const demo=await receiverDemo(process.env.MOCK_ERP_DEMO_ENTRY?{entry:process.env.MOCK_ERP_DEMO_ENTRY,...(process.env.MOCK_ERP_DEMO_CWD?{cwd:process.env.MOCK_ERP_DEMO_CWD}:{}),...(process.env.MOCK_ERP_DEMO_CHECKER?{checker:process.env.MOCK_ERP_DEMO_CHECKER}:{})}:{});
 await mkdir('.local',{recursive:true});await writeFile('.local/phase-26-demo.json',JSON.stringify(demo,null,2)+'\n');console.log(JSON.stringify(demo.result,null,2));
}
