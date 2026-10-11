/** Isolated producer fixtures plus an independently installed public consumer.
 * No running issuer, deployment, shared database or native ERP is used here. */
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {operatorToken,send} from '../apps/api/test/support/provisioning-fixture.js';
import {Outcomes} from '../apps/api/src/outcomes/service.js';
import {money} from '../apps/api/src/outcomes/arithmetic.js';
import {OutboxService} from '../apps/api/src/outbox/service.js';
import {runOutboxOnce} from '../apps/api/src/outbox/worker.js';
import {createReceiverDatabase} from './mock-erp-database.js';
import {migrateReceiver} from '../apps/mock-erp/src/database.js';
import {receiverProcess} from '../apps/mock-erp/test/support/process.js';
import {receiverWorker} from '../apps/api/test/support/receiver-harness.js';

const run=promisify(execFile),manifest=JSON.parse(await readFile('dist/erp-handoff/docs/erp/release-manifest.json','utf8'));
const directory=await mkdtemp(join(tmpdir(),'tawsel-clean-consumer-'));
const close:(()=>Promise<unknown>)[]=[];
try{
 await cp('dist/erp-handoff/dist/erp-reference',directory,{recursive:true});
 for(const artifact of manifest.artifacts.filter((a:{path:string})=>a.path.startsWith('dist/erp-reference/'))){
  const bytes=await readFile(join(directory,artifact.path.slice('dist/erp-reference/'.length)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),artifact.sha256);
 }
 const env:NodeJS.ProcessEnv={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[k])env[k]=process.env[k];
 const npmCli=process.env.npm_execpath??resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 await run(process.execPath,[npmCli,'ci','--ignore-scripts'],{cwd:directory,env,windowsHide:true,maxBuffer:2*1024*1024});
 const probe=await run(process.execPath,['--input-type=module','-e',"for(const name of ['@tawsel/api','@tawsel/shared']){try{await import(name);throw new Error('Internal package leaked')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}}console.log('Internal imports unavailable')"],{cwd:directory,env,windowsHide:true});
 const db=await createTestDatabase();close.push(()=>db.close());await prepareAccessFixture(db.pool);
 const f=await outcomeCompanyFixture(db,[{}]);close.push(()=>f.close());
 const grant=structuredClone(f.source.bootstrapCommand);grant.actionId=randomUUID();Object.assign(grant.payload,{sourceRevision:3,interopVersion:'2.0.0',erpCompanyId:randomUUID(),intakeCapabilities:['intake.prepare','assignment.manage'],returnCapabilities:['return.receive','return.dispose'],monitoringCapabilities:['monitor.read']});
 assert.equal((await send(f.app,operatorToken,grant)).statusCode,200);
 const command=f.make(0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000),rejection:{catalogVersion:'1.0.0',code:'wrong-product'}});command.payloadVersion='2.0.0';
 assert.equal((await new Outcomes(db.pool).command(f.principal,command)).receipt.businessStatus,'accepted');
 const receiver=await createReceiverDatabase();close.push(()=>receiver.close());
 const scope={tenantId:f.tenantId,integrationId:f.source.integrationId},key={keyId:'clean-consumer-fixture',secret:randomBytes(32).toString('hex')};
 await migrateReceiver(receiver.pool,scope);
 const receiverConfig={...scope,statusToken:randomBytes(32).toString('hex'),keys:[key],host:'127.0.0.1',port:0,testLoopback:true};
 const options={entry:join(directory,'mock-erp/dist/main.js'),cwd:directory,startupTimeoutMs:30000};
 let consumerProcess=await receiverProcess(receiver.url,receiverConfig,undefined,options);close.push(()=>consumerProcess.close());
 const config={encryptionKey:randomBytes(32),destinations:[{...scope,url:consumerProcess.url+'/api/v1/consumer/events'}],keys:[{...scope,...key}],testLoopback:true};
 const sender=new OutboxService(db.pool,config),auth=`Bearer ${f.source.token}`;
 for(const [op,payload] of [['integration.configureWebhook',{url:config.destinations[0]!.url,enabled:true,expectedRevision:0}],['integration.rotateSigningKey',{keyId:key.keyId,overlapSeconds:300}]] as const)assert.equal((await sender.command(auth,op,f.source.command(op,payload))).receipt.businessStatus,'accepted');
 for(let i=0;i<100&&await runOutboxOnce(db.pool,config);i++){/* actual signed HTTP */}
 const worker=await receiverWorker(receiver.url,receiverConfig,{entry:options.entry,cwd:directory,once:true});try{await worker.complete();}finally{await worker.close();}
 const records=(await receiver.pool.query("SELECT envelope->>'eventType' type,envelope->>'payloadVersion' version,applied_at IS NOT NULL applied FROM mock_erp.inbox ORDER BY received_at")).rows;
 assert.ok(records.some(e=>e.type==='outcome.recorded'&&e.version==='2.0.0'&&e.applied));assert.ok(records.every(e=>e.applied));
 await consumerProcess.close();consumerProcess=await receiverProcess(receiver.url,receiverConfig,undefined,options);
 const proof={status:'passed',completedAt:new Date().toISOString(),sourceCommit:manifest.release.baseCommit,sourceSha256:manifest.release.sourceSha256,consumerRuntimeSha256:manifest.consumerRuntimeSha256,installation:'Copied public bundle, npm ci --ignore-scripts, allowlisted environment; internal source imports unavailable',internalImports:probe.stdout.trim(),consumerRestarted:true,events:records,classification:'Actual disposable PostgreSQL and signed HTTP to a separate installed public consumer process and worker; producer authenticated-principal/operator fixtures. No Keycloak, browser/device, native Shahn, target-host or deployment certification.'};
 await writeFile('docs/verification/integration-clean-consumer-2026-10-11.json',JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify(proof,null,2));
}finally{
 for(const dispose of close.reverse())await dispose();
 if(directory.startsWith(join(tmpdir(),'tawsel-clean-consumer-')))await rm(directory,{recursive:true,force:true});
}
