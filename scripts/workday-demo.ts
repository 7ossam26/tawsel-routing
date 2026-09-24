import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import Fastify from 'fastify';
import type {components} from '@tawsel/api-client';
import type {ActionEnvelope} from '../apps/api/src/commands/kernel.js';
import type {AuthConfig} from '../apps/api/src/auth/config.js';
import type {PlanningAuthenticator} from '../apps/api/src/planning/routes.js';
import {planningRoutes} from '../apps/api/src/planning/routes.js';
import {roundRoutes} from '../apps/api/src/rounds/routes.js';
import {currentRoutes} from '../apps/api/src/current/routes.js';
import {outcomeRoutes} from '../apps/api/src/outcomes/routes.js';
import {eligibilityRoutes} from '../apps/api/src/eligibility/routes.js';
import {closureRoutes} from '../apps/api/src/closure/routes.js';
import {closureConforms} from '../apps/api/src/closure/models.js';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {RoundsClient} from '../packages/api-client/src/rounds.js';
import {PlanningClient} from '../packages/api-client/src/planning.js';
import {CurrentClient} from '../packages/api-client/src/current.js';
import {OutcomesClient} from '../packages/api-client/src/outcomes.js';
import {EligibilityClient} from '../packages/api-client/src/eligibility.js';
import {ClosureClient} from '../packages/api-client/src/closure.js';
import {assertWorkdayDemo} from '../tests/erp-conformance/workdays.js';

/** Real loopback HTTP/manual plans/PostgreSQL. Only session/bootstrap and issuer
 * binding are labelled fixtures, never installed in the production app. */
export async function workdayDemo(){
 const db=await createTestDatabase(),app=Fastify();let fixture:Awaited<ReturnType<typeof outcomeCompanyFixture>>|undefined,base='',loseClose=false;
 const transport:typeof fetch=async(input,init)=>{const response=await fetch(new URL(String(input),base),{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),origin:base,cookie:'__Host-tawsel-browser=p19-demo'}});if(loseClose&&String(input).includes('/closure/day')){loseClose=false;assert.equal(response.status,200);await response.text();throw new TypeError('Lost committed day-end response');}return response;};
 try{
  await prepareAccessFixture(db.pool);
  fixture=await outcomeCompanyFixture(db,[{},{},{},{}],async({principal,readiness,start})=>{
   const config:AuthConfig={origin:'http://127.0.0.1',encryptionKey:Buffer.alloc(32,19),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'}}};const auth:PlanningAuthenticator=(_r,_kind,work)=>work(principal);
   await app.register(scope=>planningRoutes(scope,db.pool,config,auth));await app.register(scope=>roundRoutes(scope,db.pool,config,auth));await app.register(scope=>currentRoutes(scope,db.pool,config,auth));await app.register(scope=>outcomeRoutes(scope,db.pool,config,auth));await app.register(scope=>eligibilityRoutes(scope,db.pool,config,auth));await app.register(scope=>closureRoutes(scope,db.pool,config,auth));
   app.get('/api/session/bootstrap',async()=>({csrfToken:'p19-demo',fixture:true}));base=await app.listen({host:'127.0.0.1',port:0});config.origin=base;
   const rounds=new RoundsClient('company',transport),ready=await rounds.readiness(readiness);start.payload.readinessId=ready.readinessId;return rounds.start(start as components['schemas']['RoundStartCommand']);
  });
  const f=fixture,client=new ClosureClient('company',transport),outcomes=new OutcomesClient('company',transport),eligibility=new EligibilityClient('company',transport),rounds=new RoundsClient('company',transport),planning=new PlanningClient('company',transport);
  await outcomes.full(f.make(0,'outcome.recordFull',{reportedCollection:{amountMinor:35000,currency:'EGP',exponent:2}}) as components['schemas']['OutcomeFullCommand']);
  await outcomes.refusal(f.make(1,'outcome.recordRefusal',{shippingPayment:'refused',reportedCollection:{amountMinor:0,currency:'EGP',exponent:2}},1) as components['schemas']['OutcomeRefusalCommand']);
  await eligibility.defer(f.make(3,'task.deferWhole',{earliestAt:new Date(Date.now()+86400000).toISOString(),expectedEligibilityRevision:0},2) as components['schemas']['EligibilityDeferCommand']);
  await new CurrentClient('company',transport).heading(f.make(2,'current.selectHeading',{},2) as components['schemas']['CurrentSelectHeadingCommand']);
  const original=await eligibility.read(f.round.roundId),heading=original.currentAttemptId!;
  function close(round:components['schemas']['RoundRound'],context:ActionEnvelope['context'],op:string,revision:number,current:string|null){const c=f.planCommand(op,{workdayId:round.workdayId,roundId:round.roundId,expectedActiveRoundId:round.roundId,expectedActivityRevision:revision,expectedCurrentAttemptId:current,currentAction:current?'pause-heading':'require-none'});delete c.payload.driverId;c.context={...context};return c;}
  const endRoundCommand=close(f.round,f.start.context,'round.end',3,heading) as components['schemas']['ClosureEndRoundCommand'],endRound=await client.endRound(endRoundCommand);assert.ok('receipt' in endRound);assert.equal(endRound.receipt.businessStatus,'accepted');
  assert.equal((await rounds.current()).workday?.workdayId,f.round.workdayId);assert.equal((await rounds.current()).round,null);
  async function nextStart(){
   const state=await planning.plans(f.driverId);await planning.command(f.planCommand('planning.setManualOrder',{expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:[f.tasks[2]]}}) as components['schemas']['PlanningManualOrderCommand']);
   const plan=(await planning.plans(f.driverId)).items[0]!,start=f.planCommand('round.start',{planId:plan.planId,expectedPlanRevision:plan.revision});start.context={...f.start.context};if(start.context.kind!=='device')throw new Error('device');
   const ready=await rounds.readiness({driverId:f.driverId,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});start.payload.readinessId=ready.readinessId;
   const result=await rounds.start(start as components['schemas']['RoundStartCommand']);assert.equal(result.receipt.businessStatus,'accepted');const round=(result.response!.body as components['schemas']['RoundStartResult']).round;start.context.deviceGeneration=round.owner.generation;return {round,start};
  }
  const second=await nextStart();assert.equal(second.round.workdayId,f.round.workdayId);
  const carriedBefore=await client.carryForward(f.round.workdayId),endDayCommand=close(second.round,second.start.context,'workday.end',0,null) as components['schemas']['ClosureEndDayCommand'];
  loseClose=true;await assert.rejects(client.endDay(endDayCommand),/Lost committed/);
  const fresh=new ClosureClient('company',transport),status=await fresh.result(endDayCommand.actionId),replay=await fresh.endDay(endDayCommand);assert.ok('receipt' in replay);
  const closed=await fresh.summary(f.round.workdayId),third=await nextStart(),next=await fresh.summary(third.round.workdayId),carriedAfter=await fresh.carryForward(third.round.workdayId);
  const events=(await db.pool.query("SELECT event_type,recipient_id,payload FROM tawsel.outbox_intents WHERE tenant_id=$1 AND event_type IN ('round.ended','workday.ended') ORDER BY created_at,event_id",[f.tenantId])).rows;assert.equal(events.length,3);
  for(const e of events){assert.equal(e.recipient_id,f.source.integrationId);assert.equal(closureConforms('Event',e.payload),true);}
  const report={evidence:'Real loopback HTTP, manual planning, public ERP intake and disposable PostgreSQL. Fixture session/bootstrap and enabled issuer subject; no live Engine, browser, physical receipt, signed delivery, ERP receiver or offline queue claim.',commands:{endRound:endRoundCommand,endDay:endDayCommand},endRound,status,replay,closed,next,carriedBefore,carriedAfter,events};assertWorkdayDemo(report);return report;
 }finally{await app.close();await fixture?.close();await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await workdayDemo();await writeFile(new URL('../.local/phase-19-demo.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log('PASS: two rounds in one explicit day → lost committed day-end response → exact recovery → new workday with original held work/deferral/unpaid return. Report: .local/phase-19-demo.json.');}
