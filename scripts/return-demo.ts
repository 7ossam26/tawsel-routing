import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import Fastify from 'fastify';
import type {components} from '@tawsel/api-client';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {operatorToken,send} from '../apps/api/test/support/provisioning-fixture.js';
import type {AuthConfig} from '../apps/api/src/auth/config.js';
import type {PlanningAuthenticator} from '../apps/api/src/planning/routes.js';
import {returnDriverRoutes,returnReceiverRoutes} from '../apps/api/src/returns/routes.js';
import {provisioningRoutes} from '../apps/api/src/provisioning/routes.js';
import {outcomeRoutes} from '../apps/api/src/outcomes/routes.js';
import {ReturnsClient} from '../packages/api-client/src/returns.js';
import {OutcomesClient} from '../packages/api-client/src/outcomes.js';
import {conforms} from '../apps/api/src/returns/models.js';
import {assertReturn} from '../tests/erp-conformance/returns.js';

/** Real listening HTTP, scoped ERP credential, copied public-only child consumer
 * and disposable PostgreSQL. Driver identity/bootstrap are labelled fixtures. */
export async function returnDemo(){
 const db=await createTestDatabase();let f:Awaited<ReturnType<typeof outcomeCompanyFixture>>|undefined,app:ReturnType<typeof Fastify>|undefined,base='';
 try{
  await prepareAccessFixture(db.pool);f=await outcomeCompanyFixture(db,[{},{}]);const fixture=f;
  const grant=structuredClone(f.source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=3;grant.payload.returnCapabilities=['return.receive','return.dispose'];assert.equal((await send(f.app,operatorToken,grant)).statusCode,200);
  const config:AuthConfig={origin:'http://127.0.0.1',encryptionKey:Buffer.alloc(32,21),sessionSeconds:3600,issuers:{company:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'},personal:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'}}};
  const start=async()=>{const next=Fastify();app=next;const auth:PlanningAuthenticator=(_r,_k,work)=>work(fixture.principal);
   await next.register(s=>returnDriverRoutes(s,db.pool,config,auth));await next.register(s=>returnReceiverRoutes(s,db.pool));await next.register(s=>outcomeRoutes(s,db.pool,config,auth));await next.register(s=>provisioningRoutes(s,db.pool,{issuer:'https://issuer.fixture.invalid'}));next.get('/api/session/bootstrap',async()=>({csrfToken:'p21-demo',fixture:true}));base=await next.listen({host:'127.0.0.1',port:0});config.origin=base;};
  await start();
  const transport:typeof fetch=(input,init)=>fetch(new URL(String(input),base),{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),origin:base,cookie:'__Host-tawsel-browser=p21-demo'}});
  const driver=new ReturnsClient('company',transport),outcomes=new OutcomesClient('company',transport);
  const noAnswer=f.make(0,'outcome.recordNoAnswer') as components['schemas']['OutcomeNoAnswerCommand'];assert.equal((await outcomes.noAnswer(noAnswer)).receipt.businessStatus,'accepted');
  const groups=await driver.groups(),g=groups.groups[0]!,line=g.items[0]!;
  const offer=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:g.sourceBranchId,items:[{taskId:line.taskId,dispatchCycleId:line.dispatchCycleId,outcomeId:line.outcomeId,sourceLineId:line.sourceLineId,quantity:3}]});delete offer.payload.driverId;
  const result=await driver.offer(offer as components['schemas']['ReturnRequestCommand']);assert.equal(result.receipt.businessStatus,'accepted');const request=(result.response!.body as components['schemas']['ReturnCommandResult']).request;
  const waiting=await driver.confirmation(request.requestId,[{itemId:request.items[0]!.itemId,quantity:2}]);assert.equal(waiting.state,'waiting');
  // Actual API outage: a cached/local offer cannot become server confirmation.
  await app!.close();app=undefined;await assert.rejects(()=>driver.confirmation(request.requestId,[{itemId:request.items[0]!.itemId,quantity:2}]));await start();assert.equal((await driver.confirmation(request.requestId,[{itemId:request.items[0]!.itemId,quantity:2}])).state,'waiting');
  const root=fileURLToPath(new URL('../',import.meta.url));await mkdir(resolve(root,'.local'),{recursive:true});const directory=await mkdtemp(resolve(root,'.local/phase-21-consumer-'));
  for(const path of ['packages/api-client/src/returns.ts','packages/api-client/src/schema.d.ts','tests/erp-conformance/returns.ts']){const destination=resolve(directory,path);await mkdir(dirname(destination),{recursive:true});await copyFile(resolve(root,path),destination);}
  await writeFile(resolve(directory,'package.json'),JSON.stringify({private:true,type:'module'}));
  const reportPath=resolve(directory,'report.json'),env:NodeJS.ProcessEnv={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,TMP:process.env.TMP,TAWSEL_ERP_API_URL:base,TAWSEL_ERP_SERVICE_TOKEN:f.source.token,TAWSEL_RETURN_REQUEST_ID:request.requestId,TAWSEL_RETURN_REPORT:reportPath};
  const child=await promisify(execFile)(process.execPath,['--import',pathToFileURL(resolve(root,'node_modules/tsx/dist/loader.mjs')).href,resolve(directory,'tests/erp-conformance/returns.ts'),'--live'],{cwd:directory,env,timeout:30000,maxBuffer:100000});assert.match(child.stdout,/PASS:/);
  const report=JSON.parse(await readFile(reportPath,'utf8'));
  const confirmed=await driver.confirmation(request.requestId,[{itemId:request.items[0]!.itemId,quantity:2}]),unconfirmed=await driver.confirmation(request.requestId,[{itemId:request.items[0]!.itemId,quantity:3}]);assert.equal(confirmed.state,'confirmed');assert.equal(unconfirmed.state,'waiting');
  await app!.close();app=undefined;await start();const final=await driver.read(request.requestId);assertReturn(final);assert.deepEqual(final,report.final);
  const events=(await db.pool.query("SELECT event_type,recipient_id,payload FROM tawsel.outbox_intents WHERE tenant_id=$1 AND event_type LIKE 'return.%' ORDER BY created_at,event_id",[f.tenantId])).rows;assert.equal(events.length,3);
  for(const event of events){assert.equal(event.recipient_id,f.source.integrationId);assert.ok(conforms(event.event_type==='return.requested'?'RequestedEvent':event.event_type==='return.subsetReceived'?'ReceivedEvent':'DispositionEvent',event.payload));}
  return {...report,evidence:'Real HTTP/PostgreSQL/API outage and restart; driver principal/bootstrap fixtures. Copied independent native consumer has only URL/scoped token/request ID; no DB/operator/issuer inputs. Events are durable local intent, not delivered webhooks.',consumerDirectory:directory,consumerOutput:child.stdout.trim(),offerCommand:offer,waiting,confirmed,unconfirmed,events};
 }finally{await app?.close();await f?.close();await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await returnDemo();await writeFile(new URL('../.local/phase-21-demo.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('PASS: 3 offered → 2 actually received → 1 separately lost; subset confirmed, all-three claim still waits. API outage/restart and independent copied public consumer verified. Report: .local/phase-21-demo.json.');}
