import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import Fastify from 'fastify';
import type {components} from '@tawsel/api-client';
import type {AuthConfig} from '../apps/api/src/auth/config.js';
import type {PlanningAuthenticator} from '../apps/api/src/planning/routes.js';
import {roundRoutes} from '../apps/api/src/rounds/routes.js';
import {currentRoutes} from '../apps/api/src/current/routes.js';
import {outcomeRoutes} from '../apps/api/src/outcomes/routes.js';
import {eligibilityRoutes} from '../apps/api/src/eligibility/routes.js';
import {eligibilityConforms} from '../apps/api/src/eligibility/models.js';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {RoundsClient} from '../packages/api-client/src/rounds.js';
import {CurrentClient} from '../packages/api-client/src/current.js';
import {OutcomesClient} from '../packages/api-client/src/outcomes.js';
import {EligibilityClient} from '../packages/api-client/src/eligibility.js';
import {assertEligibilityDemo} from '../tests/erp-conformance/eligibility.js';

/** Actual loopback HTTP and PostgreSQL, fixture identity/bootstrap only. No
 * fixture auth is installed in the production app; no Engine is required. */
export async function eligibilityDemo(){
 const db=await createTestDatabase(),app=Fastify();let fixture:Awaited<ReturnType<typeof outcomeCompanyFixture>>|undefined,base='',loseRetry=false;
 const transport:typeof fetch=async(input,init)=>{
  const response=await fetch(new URL(String(input),base),{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),origin:base,cookie:'__Host-tawsel-browser=p18-demo'}});
  if(loseRetry&&String(input).includes('/eligibility/retry')){loseRetry=false;assert.equal(response.status,200);await response.text();throw new TypeError('Lost committed retry response');}return response;
 };
 try{
  await prepareAccessFixture(db.pool);
  fixture=await outcomeCompanyFixture(db,[{},{}],async({principal,readiness,start})=>{
   const config:AuthConfig={origin:'http://127.0.0.1',encryptionKey:Buffer.alloc(32,18),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'}}};
   const auth:PlanningAuthenticator=(_r,_kind,work)=>work(principal);
   await app.register(scope=>roundRoutes(scope,db.pool,config,auth));await app.register(scope=>currentRoutes(scope,db.pool,config,auth));await app.register(scope=>outcomeRoutes(scope,db.pool,config,auth));await app.register(scope=>eligibilityRoutes(scope,db.pool,config,auth));
   app.get('/api/session/bootstrap',async()=>({csrfToken:'p18-demo',fixture:true}));base=await app.listen({host:'127.0.0.1',port:0});config.origin=base;
   const rounds=new RoundsClient('company',transport),ready=await rounds.readiness(readiness);start.payload.readinessId=ready.readinessId;const result=await rounds.start(start as components['schemas']['RoundStartCommand']);assert.equal(result.receipt.businessStatus,'accepted');return result;
  });
  const f=fixture,client=new EligibilityClient('company',transport),outcomeClient=new OutcomesClient('company',transport);
  async function make(index:number,op:string,extra:Record<string,unknown>={}){
   const read=await client.read(f.round.roundId),s=read.items.find(x=>x.taskId===f.tasks[index])!;
   return f.make(index,op,{attemptId:s.attemptId,expectedSourceRevision:s.sourceRevision,expectedAssignmentRevision:s.assignmentRevision,expectedPinRevision:s.pinRevision,...(op.startsWith('task.')?{expectedEligibilityRevision:s.revision}:{}),...extra},read.activityRevision,read.currentAttemptId);
  }
  const refused=await outcomeClient.refusal(await make(0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:{amountMinor:5000,currency:'EGP',exponent:2}}) as components['schemas']['OutcomeRefusalCommand']);assert.equal(refused.receipt.businessStatus,'accepted');
  const retryCommand=await make(0,'task.retryWhole') as components['schemas']['EligibilityRetryCommand'];loseRetry=true;await assert.rejects(client.retry(retryCommand),/Lost committed/);
  const fresh=new EligibilityClient('company',transport),status=await fresh.result(retryCommand.actionId),retry=await fresh.retry(retryCommand);
  const full=await outcomeClient.full(await make(0,'outcome.recordFull',{reportedCollection:{amountMinor:30000,currency:'EGP',exponent:2}}) as components['schemas']['OutcomeFullCommand']);assert.equal(full.receipt.businessStatus,'accepted');
  const deferCommand=await make(1,'task.deferWhole',{earliestAt:new Date(Date.now()+86400000).toISOString()}) as components['schemas']['EligibilityDeferCommand'];const deferred=await client.defer(deferCommand);assert.equal(deferred.receipt.businessStatus,'accepted');
  const urgencyCommand=await make(1,'task.setDriverUrgency',{urgency:'urgent'}) as components['schemas']['EligibilityUrgencyCommand'];const urgent=await client.urgency(urgencyCommand);assert.equal(urgent.receipt.businessStatus,'accepted');
  const activateCommand=await make(1,'task.activateDeferred') as components['schemas']['EligibilityActivateCommand'];const denied=await client.activate(activateCommand);assert.equal(denied.receipt.businessStatus,'rejected');
  const eligibility=await client.read(f.round.roundId),outcomes=await outcomeClient.read(f.round.roundId),current=await new CurrentClient('company',transport).read(f.round.roundId);
  const events=(await db.pool.query("SELECT event_type,recipient_id,payload FROM tawsel.outbox_intents WHERE tenant_id=$1 AND event_type IN ('task.retryAdmitted','task.deferred','task.driverUrgencyChanged') ORDER BY created_at,event_id",[f.tenantId])).rows;
  for(const e of events){assert.equal(e.recipient_id,f.source.integrationId);assert.equal(eligibilityConforms('Event',e.payload),true);}assert.equal(events.length,3);
  const report={evidence:'Real loopback HTTP and disposable PostgreSQL; fixture identity/bootstrap; public ERP intake and real manual start. No live Engine, physical receipt, browser UI, signed delivery or ERP receiver evidence.',commands:{retry:retryCommand,defer:deferCommand,urgency:urgencyCommand,activate:activateCommand},status,retry,deferred,urgent,denied,eligibility,outcomes,current,events};assertEligibilityDemo(report);return report;
 }finally{await app.close();await fixture?.close();await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=await eligibilityDemo();await writeFile(new URL('../.local/phase-18-demo.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: start → refusal (50 EGP shipping) → explicit retry with lost-response recovery → full (300 EGP goods); exactly 350 total. Future urgent second task stays visible but inactive. Report: .local/phase-18-demo.json.');
}
