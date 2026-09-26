/** Operator orchestration only. The installed consumer/checkers below have their
 * own process, role and allowlisted environment, with no Tawsel internals. */
import {readFile,writeFile,mkdir,mkdtemp,cp,unlink} from 'node:fs/promises';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {once} from 'node:events';
import {promisify} from 'node:util';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {migrate} from '../apps/api/src/db/migrate.js';
import {createDatabasePool} from '../apps/api/src/db/pool.js';
import {buildApp} from '../apps/api/src/app.js';
import {bindSource,send,operatorToken} from '../apps/api/test/support/provisioning-fixture.js';
import {createReceiverDatabase} from './mock-erp-database.js';
import {receiverProcess} from '../apps/mock-erp/test/support/process.js';
import {receiverWorker} from '../apps/api/test/support/receiver-harness.js';
import {OutboxClient} from '@tawsel/api-client/outbox';
import type {ReceiverConfig} from '../apps/mock-erp/src/config.js';
import type {SourceConformanceConfig} from '../tests/erp-conformance/source.js';
const secrets=JSON.parse(await readFile('.local/identity/secrets.json','utf8')) as {control:string;company:string;personal:string;password:string};
const issuer='http://localhost:8085/realms/tawsel-company';
async function admin(path:string,init:RequestInit={}){const t=await fetch(`${issuer}/protocol/openid-connect/token`,{method:'POST',body:new URLSearchParams({grant_type:'client_credentials',client_id:'local-test-control',client_secret:secrets.control})});if(!t.ok)throw new Error('Real local Keycloak required');const token=await t.json() as {access_token:string};const r=await fetch(`${issuer.replace('/realms/','/admin/realms/')}/users${path}`,{...init,headers:{authorization:`Bearer ${token.access_token}`,'content-type':'application/json'}});if(!r.ok)throw new Error(`Issuer setup ${r.status}`);return r;}
const username=`p27-external-${randomUUID().slice(0,8)}`,user=await admin('',{method:'POST',body:JSON.stringify({username,email:`${username}@example.test`,enabled:true,emailVerified:true,firstName:'External',lastName:'Reference',credentials:[{type:'password',value:secrets.password,temporary:false}]})}),subject=user.headers.get('location')!.split('/').at(-1)!;
const db=await createTestDatabase(),erp=await createReceiverDatabase();await migrate(db.pool);
const bootstrap=buildApp(createDatabasePool(db.config),undefined,{issuer,operatorToken});await bootstrap.ready();
const source=await bindSource(bootstrap,[subject]),grant=structuredClone(source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=2;grant.payload.intakeCapabilities=['intake.prepare','assignment.manage'];grant.payload.returnCapabilities=['return.receive','return.dispose'];
if((await send(bootstrap,operatorToken,grant)).statusCode!==200)throw new Error('Operator grant failed');await bootstrap.close();
const scope={tenantId:source.tenantId,integrationId:source.integrationId},key={keyId:'p27-standalone',secret:randomBytes(32).toString('hex')};
const release=JSON.parse(await readFile('docs/erp/release-manifest.json','utf8')) as {release:{sourceSha256:string};consumerRuntimeSha256:string;artifacts:{path:string;sha256:string;bytes:number;source?:string}[]};
const startedAt=new Date().toISOString();
const npmCli=resolve(process.env.npm_execpath??'.local/runtime/node_modules/npm/bin/npm-cli.js');
const npmVersion=(await promisify(execFile)(process.execPath,[npmCli,'--version'],{windowsHide:true})).stdout.trim();
const postgresVersion=String((await db.pool.query('SHOW server_version')).rows[0].server_version);
const directory=await mkdtemp(join(tmpdir(),'tawsel-p42-consumer-'));await cp('dist/erp-handoff/dist/erp-reference',directory,{recursive:true});
for(const artifact of release.artifacts.filter(a=>a.path.startsWith('dist/erp-reference/'))){const bytes=await readFile(join(directory,artifact.path.slice('dist/erp-reference/'.length)));if(createHash('sha256').update(bytes).digest('hex')!==artifact.sha256)throw new Error('Copied consumer artifact drift');}
const runtimeEnv:NodeJS.ProcessEnv={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[k])runtimeEnv[k]=process.env[k];
const installed=await promisify(execFile)(process.execPath,[npmCli,'ci','--ignore-scripts'],{cwd:directory,env:runtimeEnv,windowsHide:true,maxBuffer:2*1024*1024});await mkdir('.local',{recursive:true});await writeFile('.local/phase-42-standalone-install.log',installed.stdout+installed.stderr);
const probe=await promisify(execFile)(process.execPath,['--input-type=module','-e',"for(const name of ['@tawsel/api','@tawsel/shared']){try{await import(name);throw new Error('Internal package leaked')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}}console.log('Internal imports unavailable')"],{cwd:directory,env:runtimeEnv,windowsHide:true});
const config:ReceiverConfig={...scope,host:'127.0.0.1',port:3012,testLoopback:true,statusToken:randomBytes(32).toString('hex'),keys:[key],tawselBaseUrl:'http://127.0.0.1:3011',tawselAuthorization:`Bearer ${source.token}`};
const consumerConfig=join(directory,'receiver.json');await writeFile(consumerConfig,JSON.stringify(config));
const sender={encryptionKey:randomBytes(32).toString('hex'),keys:[{...scope,...key}],destinations:[{...scope,url:'http://127.0.0.1:3012/api/v1/consumer/events'}],testLoopback:true};
const apiConfig=join(resolve('.local'),`phase-27-api-${randomUUID()}.json`);await writeFile(apiConfig,JSON.stringify({databaseUrl:db.url,issuer,workerSecret:secrets.control,port:3011,outbox:sender,auth:{origin:'http://localhost:5173',encryptionKey:randomBytes(32).toString('hex'),sessionSeconds:28800,issuers:{company:{issuer,clientId:'tawsel-web',clientSecret:secrets.company},personal:{issuer:'http://localhost:8085/realms/tawsel-personal',clientId:'tawsel-web',clientSecret:secrets.personal}}}}));
async function apiProcess(){
 const child=spawn(process.execPath,['--import','tsx','apps/api/test/support/source-api-process.ts'],{windowsHide:true,env:{...runtimeEnv,TAWSEL_SOURCE_TEST_CONFIG:apiConfig},stdio:['ignore','pipe','pipe']});let out='',err='';child.stderr.on('data',b=>err+=String(b));const exit=once(child,'exit');
 await new Promise<void>((res,rej)=>{const timer=setTimeout(()=>rej(new Error(`API startup unavailable ${err}`)),20000);child.once('exit',()=>{clearTimeout(timer);rej(new Error(`API exited ${err}`));});child.stdout.on('data',b=>{out+=String(b);if(out.includes('address')){clearTimeout(timer);res();}});});
 return {async close(){if(child.exitCode===null&&!child.killed)child.kill();await exit;}};
}
const options={entry:join(directory,'mock-erp/dist/main.js'),cwd:directory,startupTimeoutMs:30000};
let api:Awaited<ReturnType<typeof apiProcess>>|undefined,receiver:Awaited<ReturnType<typeof receiverProcess>>|undefined,worker:Awaited<ReturnType<typeof receiverWorker>>|undefined;
const publicOutbox=new OutboxClient({baseUrl:config.tawselBaseUrl!,authorization:config.tawselAuthorization!});
const cc:SourceConformanceConfig={apiUrl:config.tawselBaseUrl!,receiverUrl:'http://127.0.0.1:3012',...scope,credential:source.token,statusToken:config.statusToken,driverSubject:subject,entry:options.entry,consumerConfig};
const conformancePath=join(directory,'source-conformance.json'),consumerEnv={...runtimeEnv,MOCK_ERP_DATABASE_URL:erp.url};
async function run(stage:string){await writeFile(conformancePath,JSON.stringify(cc));const r=await promisify(execFile)(process.execPath,[join(directory,'conformance/source.mjs'),conformancePath,stage],{cwd:directory,env:consumerEnv,windowsHide:true,maxBuffer:16*1024*1024});return JSON.parse(r.stdout) as Record<string,unknown>;}
try{
 api=await apiProcess();receiver=await receiverProcess(erp.url,config,undefined,options);
 await publicOutbox.command(source.command('integration.configureWebhook',{url:sender.destinations[0]!.url,enabled:true,expectedRevision:0}) as Parameters<OutboxClient['command']>[0]);await publicOutbox.command(source.command('integration.rotateSigningKey',{keyId:key.keyId,overlapSeconds:300}) as Parameters<OutboxClient['command']>[0]);
 const prepared=await run('prepare');console.log('Standalone source provisioning and two prepared/received tasks passed');
 await api.close();const pending=await run('offline-save');await receiver.close();receiver=await receiverProcess(erp.url,config,undefined,options);api=await apiProcess();const resumed=await run('resume');if(pending.actionId!==resumed.recoveredActionId)throw new Error('Restart changed action identity');
 const proxy=createServer(async(req,res)=>{
  try{if(!req.url?.startsWith('/api/')){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Separate driver session for public conformance</title>');return;}
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v&& !['host','connection','content-length'].includes(k))headers.set(k,Array.isArray(v)?v.join(','):v);
   const r=await fetch(`${cc.apiUrl}${req.url}`,{method:req.method!,headers,redirect:'manual',...(chunks.length?{body:Buffer.concat(chunks)}:{})});res.statusCode=r.status;for(const [k,v] of r.headers)if(!['set-cookie','transfer-encoding','content-encoding','content-length'].includes(k))res.setHeader(k,v);if(r.headers.getSetCookie().length)res.setHeader('set-cookie',r.headers.getSetCookie());res.end(Buffer.from(await r.arrayBuffer()));
  }catch{res.statusCode=503;res.end('Test proxy unavailable');}
 });proxy.listen(5173,'localhost');await once(proxy,'listening');
 const browser=await chromium.launch();try{
  const context=await browser.newContext(),page=await context.newPage();
  // An explicit test reverse proxy for the existing exact Tawsel OIDC redirect.
  // This is only a browser origin shell; all authentication is the actual API/issuer.
  await page.goto('http://localhost:5173/');const start=await page.evaluate(async code=>{const b=await(await fetch('/api/session/bootstrap')).json();return(await fetch('/api/session/login',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':b.csrfToken},body:JSON.stringify({kind:'company',companyCode:code})})).json();},source.code);
  await page.goto(start.authorizationUrl);await page.locator('#username').fill(username);await page.locator('#password').fill(secrets.password);await page.locator('#kc-login').click();await page.waitForURL('http://localhost:5173/account?kind=company');
  cc.driverCookie=(await context.cookies('http://localhost:5173')).map(c=>`${c.name}=${c.value}`).join('; ');cc.driverOrigin='http://localhost:5173';
 }finally{await browser.close();proxy.closeAllConnections();await new Promise<void>((res,rej)=>proxy.close(e=>e?rej(e):res()));}
 const executed=await run('execute');console.log('Standalone manual plan/start/outcomes, subset, disposition, departed rejection and new cycle passed');
 await receiver.close();await api.close();api=await apiProcess();receiver=await receiverProcess(erp.url,config,undefined,options);worker=await receiverWorker(erp.url,config,options);
 // Sender leases/retry schedules expire naturally, without direct DB fixes.
 const deadline=Date.now()+60000;let queue=await publicOutbox.queue({limit:100});while(queue.counts.pending||queue.counts.sending||queue.counts.failed){if(Date.now()>deadline)throw new Error('Sender did not recover naturally');await new Promise(r=>setTimeout(r,500));queue=await publicOutbox.queue({limit:100});}
 const aggregates=[...new Map(queue.items.map(i=>[`${i.aggregate.type}/${i.aggregate.id}`,i.aggregate])).values()].map(a=>({type:a.type,id:a.id}));
 const receiverCheck=join(directory,'receiver-conformance.json');await writeFile(receiverCheck,JSON.stringify({apiUrl:cc.apiUrl,callbackUrl:`${cc.receiverUrl}/api/v1/consumer/events`,statusUrl:`${cc.receiverUrl}/api/v1/consumer/status`,authorization:config.tawselAuthorization,statusAuthorization:`Bearer ${config.statusToken}`,...scope,signingKey:key,aggregates,expected:{deliveredPieces:1,reportedMinor:15000,receivedPieces:1}}));
 const checked=await promisify(execFile)(process.execPath,[join(directory,'conformance/receiver.mjs'),receiverCheck],{cwd:directory,env:runtimeEnv,windowsHide:true,maxBuffer:4*1024*1024}),result=JSON.parse(checked.stdout) as Record<string,unknown>;
 const reports=[];for(const a of aggregates)reports.push(await publicOutbox.applied(a.type,a.id));
 const evidence={directory,probe:probe.stdout.trim(),prepared,pending,resumed,executed,result,apiProcessRestarts:2,receiverProcessRestarts:2,reports};
 const proof={status:'passed',startedAt,completedAt:new Date().toISOString(),sourceSha256:release.release.sourceSha256,consumerRuntimeSha256:release.consumerRuntimeSha256,runtime:{node:process.version,npm:npmVersion,postgres:postgresVersion,configuredKeycloak:'26.7.4'},installation:'clean copied public bundle; npm ci --ignore-scripts',internalImports:probe.stdout.trim(),consumerEnvironment:'allowlisted OS variables plus own MOCK_ERP_DATABASE_URL; config holds scoped public service/status/signing credentials',apiProcessRestarts:2,receiverProcessRestarts:2,stableSourceActionId:pending.actionId,originalIdRecovered:pending.actionId===resumed.recoveredActionId,reporting:executed.reporting,result,appliedReports:reports,classification:'Actual local PostgreSQL, Keycloak, HTTP and separate processes. Operator bootstrap uses isolated server fixtures; consumer uses only public artifacts. Explicit manual planning; no live Engine, physical-device, target-host or vendor ERP claim.'};
 await writeFile('docs/verification/integration-local-2026-09-26.json',JSON.stringify(proof,null,2)+'\n');await writeFile('.local/phase-42-standalone-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({directory,...result,apiProcessRestarts:2,receiverProcessRestarts:2,stableActionId:pending.actionId},null,2));
}finally{
 await worker?.close();await receiver?.close();await api?.close();await erp.close();await db.close();await admin(`/${subject}`,{method:'DELETE'});
 for(const path of [apiConfig,consumerConfig,conformancePath,join(directory,'receiver-conformance.json')])await unlink(path).catch(e=>{if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;});
}
