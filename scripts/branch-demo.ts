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
import {b2bIntakeRoutes} from '../apps/api/src/b2b-intake/routes.js';
import {currentRoutes} from '../apps/api/src/current/routes.js';
import {outcomeRoutes} from '../apps/api/src/outcomes/routes.js';
import {ReturnsClient} from '../packages/api-client/src/returns.js';
import {CurrentClient} from '../packages/api-client/src/current.js';
import {OutcomesClient} from '../packages/api-client/src/outcomes.js';
import {BranchesClient} from '../packages/api-client/src/branches.js';
import {assertDispatch} from '../tests/erp-conformance/dispatch.js';
type S=components['schemas'];
/** Real HTTP + isolated PostgreSQL. Authentication and initial driver bootstrap
 * are labelled fixtures; the copied ERP process receives only public inputs. */
export async function branchDemo(){
 const db=await createTestDatabase();let f:Awaited<ReturnType<typeof outcomeCompanyFixture>>|undefined,app:ReturnType<typeof Fastify>|undefined,base='';
 try{
  await prepareAccessFixture(db.pool);f=await outcomeCompanyFixture(db);const fixture=f;
  const grant=structuredClone(f.source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=3;grant.payload.returnCapabilities=['return.receive','return.dispose'];assert.equal((await send(f.app,operatorToken,grant)).statusCode,200);
  assert.equal((await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch',sourceRevision:2,name:'فرع الإرسال',enabled:true,location:{latitude:30.1,longitude:31.3}}))).statusCode,200);
  const config:AuthConfig={origin:'http://127.0.0.1',encryptionKey:Buffer.alloc(32,22),sessionSeconds:3600,issuers:{company:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'},personal:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'}}};
  const start=async()=>{const next=Fastify();app=next;const auth:PlanningAuthenticator=(_r,_k,work)=>work(fixture.principal);
   await next.register(s=>returnDriverRoutes(s,db.pool,config,auth));await next.register(s=>returnReceiverRoutes(s,db.pool));await next.register(s=>outcomeRoutes(s,db.pool,config,auth));await next.register(s=>currentRoutes(s,db.pool,config,auth));await next.register(s=>b2bIntakeRoutes(s,db.pool));await next.register(s=>provisioningRoutes(s,db.pool,{issuer:'https://issuer.fixture.invalid'}));next.get('/api/session/bootstrap',async()=>({csrfToken:'p22-demo',fixture:true}));base=await next.listen({host:'127.0.0.1',port:0});config.origin=base;};await start();
  const transport:typeof fetch=(input,init)=>fetch(new URL(String(input),base),{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),origin:base,cookie:'__Host-tawsel-browser=p22-demo'}});
  const returns=new ReturnsClient('company',transport),outcomes=new OutcomesClient('company',transport),current=new CurrentClient('company',transport),branch=new BranchesClient(transport);
  assert.equal((await outcomes.noAnswer(f.make(0,'outcome.recordNoAnswer') as S['OutcomeNoAnswerCommand'])).receipt.businessStatus,'accepted');
  const g=(await returns.groups()).groups[0]!,line=g.items[0]!;
  const make=(op:string,p:object)=>{const c=fixture.planCommand(op,{roundId:fixture.round.roundId,...p});delete c.payload.driverId;return c;};
  const offer=make('return.requestHandover',{sourceBranchId:g.sourceBranchId,items:[{taskId:line.taskId,dispatchCycleId:line.dispatchCycleId,outcomeId:line.outcomeId,sourceLineId:line.sourceLineId,quantity:3}]});
  const request=((await returns.offer(offer as S['ReturnRequestCommand'])).response!.body as S['ReturnCommandResult']).request;
  assert.equal((await current.heading(f.make(1,'current.selectHeading',{},1) as S['CurrentSelectHeadingCommand'])).receipt.businessStatus,'accepted');
  const before=await current.read(f.round.roundId),interrupt=make('branch.interruptRound',{expectedActivityRevision:before.revision,expectedCurrentAttemptId:before.currentActivity!.attemptId,requestId:request.requestId,claims:[{itemId:request.items[0]!.itemId,quantity:2}],serviceEstimateSeconds:300}) as S['BranchInterruptCommand'];
  const interrupted=await branch.command(interrupt);assert.equal(interrupted.receipt.businessStatus,'accepted');const b=interrupted.response!.body as S['BranchResult'];
  const transition=(op:'branch.recordArrival'|'branch.resumeRound',v:S['BranchResult'])=>make(op,{expectedActivityRevision:v.activityRevision,expectedCurrentAttemptId:null,segmentId:v.branchActivity.segmentId,expectedBranchRevision:v.branchActivity.revision}) as S['BranchArrivalCommand']|S['BranchResumeCommand'];
  const arrival=transition('branch.recordArrival',b),arrivedResult=await branch.command(arrival);assert.equal(arrivedResult.receipt.businessStatus,'accepted');const arrived=arrivedResult.response!.body as S['BranchResult'];
  const waiting=await branch.command(transition('branch.resumeRound',arrived));assert.equal(waiting.receipt.businessStatus,'rejected');
  await app!.close();app=undefined;await assert.rejects(()=>current.read(fixture.round.roundId));await start();assert.equal((await current.read(f.round.roundId)).branchActivity?.stage,'arrived');
  const root=fileURLToPath(new URL('../',import.meta.url));await mkdir(resolve(root,'.local'),{recursive:true});const directory=await mkdtemp(resolve(root,'.local/phase-22-consumer-'));
  for(const path of ['packages/api-client/src/intake.ts','packages/api-client/src/returns.ts','packages/api-client/src/schema.d.ts','tests/erp-conformance/dispatch.ts']){const destination=resolve(directory,path);await mkdir(dirname(destination),{recursive:true});await copyFile(resolve(root,path),destination);}await writeFile(resolve(directory,'package.json'),JSON.stringify({private:true,type:'module'}));
  const reportPath=resolve(directory,'report.json'),env:NodeJS.ProcessEnv={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,TMP:process.env.TMP,TAWSEL_ERP_API_URL:base,TAWSEL_ERP_SERVICE_TOKEN:f.source.token,TAWSEL_RETURN_REQUEST_ID:request.requestId,TAWSEL_DISPATCH_REPORT:reportPath};
  const child=await promisify(execFile)(process.execPath,['--import',pathToFileURL(resolve(root,'node_modules/tsx/dist/loader.mjs')).href,resolve(directory,'tests/erp-conformance/dispatch.ts'),'--live'],{cwd:directory,env,timeout:30000,maxBuffer:100000});assert.match(child.stdout,/PASS:/);const report=JSON.parse(await readFile(reportPath,'utf8'));assertDispatch(report.old,report.fresh,report.cycles,report.received);
  const resume=transition('branch.resumeRound',arrived),resumed=await branch.command(resume);assert.equal(resumed.receipt.businessStatus,'accepted');const final=await current.read(f.round.roundId);assert.equal(final.branchActivity,null);assert.equal(final.physicalOrigin?.kind,'branch-pin');assert.equal(final.nextSuggestion?.taskId,f.tasks[1]);
  await app!.close();app=undefined;await start();assert.deepEqual(await branch.command(resume),resumed);
  const events=(await db.pool.query("SELECT event_type,recipient_id,payload FROM tawsel.outbox_intents WHERE tenant_id=$1 AND (event_type LIKE 'branch.%' OR event_type='dispatch.createdFromReceipt') ORDER BY created_at,event_id",[f.tenantId])).rows;assert.equal(events.length,4);
  return {...report,evidence:'Real listening HTTP, PostgreSQL, API outage/restart and copied external public-only consumer. Driver principal/bootstrap fixtures; no browser/device/Engine/real ERP or signed transport proof.',consumerDirectory:directory,consumerOutput:child.stdout.trim(),interrupt,interrupted,arrival,arrived:arrivedResult,waiting,resume,resumed,final,events};
 }finally{await app?.close();await f?.close();await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await branchDemo();await writeFile(new URL('../.local/phase-22-demo.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('PASS: heading pause → explicit branch arrival → wait → two-piece actual receipt/new cycle → same-round resume. Public consumer and restart recovery verified; report .local/phase-22-demo.json.');}
