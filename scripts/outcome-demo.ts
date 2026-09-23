import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import type { components } from '@tawsel/api-client';
import type { AuthConfig } from '../apps/api/src/auth/config.js';
import { roundRoutes } from '../apps/api/src/rounds/routes.js';
import { currentRoutes } from '../apps/api/src/current/routes.js';
import { outcomeRoutes } from '../apps/api/src/outcomes/routes.js';
import type { PlanningAuthenticator } from '../apps/api/src/planning/routes.js';
import { outcomeConforms } from '../apps/api/src/outcomes/models.js';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture } from '../apps/api/test/support/access-fixture.js';
import { outcomeCompanyFixture } from '../apps/api/test/support/outcome-fixture.js';
import { RoundsClient } from '../packages/api-client/src/rounds.js';
import { CurrentClient } from '../packages/api-client/src/current.js';
import { OutcomesClient } from '../packages/api-client/src/outcomes.js';
import { assertOutcomeDemo } from '../tests/erp-conformance/outcomes.js';

/** Real loopback HTTP / PostgreSQL. Only identity/bootstrap is a labelled test
 * fixture; never registered in buildApp. Uses manual planning, no Engine stub. */
export async function outcomeDemo(){
 const db=await createTestDatabase(),app=Fastify();let fixture:Awaited<ReturnType<typeof outcomeCompanyFixture>>|undefined,base='',losePartial=false;
 const transport:typeof fetch=async(input,init)=>{
  const response=await fetch(new URL(String(input),base),{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),origin:base,cookie:'__Host-tawsel-browser=p17-demo'}});
  if(losePartial&&String(input).includes('/outcomes/partial')){losePartial=false;assert.equal(response.status,200);await response.text();throw new TypeError('Demonstrated response loss after actual server commit');}return response;
 };
 try{
  await prepareAccessFixture(db.pool);
  let started:components['schemas']['RoundStartActionResult']|undefined;
  fixture=await outcomeCompanyFixture(db,[{},{}],async({principal,readiness,start})=>{
   const config:AuthConfig={origin:'http://127.0.0.1',encryptionKey:Buffer.alloc(32,17),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'demo',clientSecret:'fixture'}}};
   const auth:PlanningAuthenticator=(_r,_kind,work)=>work(principal);
   await app.register(scope=>roundRoutes(scope,db.pool,config,auth));await app.register(scope=>currentRoutes(scope,db.pool,config,auth));await app.register(scope=>outcomeRoutes(scope,db.pool,config,auth));
   app.get('/api/session/bootstrap',async()=>({csrfToken:'p17-demo',fixture:true}));
   base=await app.listen({host:'127.0.0.1',port:0});config.origin=base;
   const rounds=new RoundsClient('company',transport),ready=await rounds.readiness(readiness);start.payload.readinessId=ready.readinessId;started=await rounds.start(start as components['schemas']['RoundStartCommand']);assert.equal(started.receipt.businessStatus,'accepted');return started;
  });
  const f=fixture,current=new CurrentClient('company',transport),outcomes=new OutcomesClient('company',transport);
  const initial=await current.read(f.round.roundId),heading=f.make(0,'current.selectHeading');
  const selected=await current.heading(heading as components['schemas']['CurrentSelectHeadingCommand']);assert.equal(selected.receipt.businessStatus,'accepted');
  const arrived=await current.arrival(f.make(0,'current.recordArrival',{},1,String(heading.payload.attemptId)) as components['schemas']['CurrentArrivalCommand']);assert.equal(arrived.receipt.businessStatus,'accepted');
  const beforeResult=await current.read(f.round.roundId),partial=f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:{amountMinor:25000,currency:'EGP',exponent:2}},2,String(heading.payload.attemptId)) as components['schemas']['OutcomePartialCommand'];
  losePartial=true;await assert.rejects(outcomes.partial(partial),/response loss/);
  const freshClient=new OutcomesClient('company',transport),status=await freshClient.result(partial.actionId),retry=await freshClient.partial(partial);
  const noAnswer=f.make(1,'outcome.recordNoAnswer',{},3) as components['schemas']['OutcomeNoAnswerCommand'];const second=await outcomes.noAnswer(noAnswer);assert.equal(second.receipt.businessStatus,'accepted');
  const snapshot=await outcomes.read(f.round.roundId),after=await current.read(f.round.roundId),intents=(await db.pool.query("SELECT recipient_id,payload FROM tawsel.outbox_intents WHERE tenant_id=$1 AND event_type='outcome.recorded' ORDER BY created_at,event_id",[f.tenantId])).rows;
  for(const intent of intents){assert.equal(intent.recipient_id,f.source.integrationId);assert.equal(outcomeConforms('Event',intent.payload),true);}
  const report={evidence:'Actual loopback HTTP and isolated PostgreSQL; fixture identity/bootstrap; real manual start and commands; no live Engine, signed sender or ERP receiver.',started,initial,beforeResult,commands:{partial,noAnswer},status,retry,second,snapshot,after,events:intents.map(i=>i.payload) as {outcome:components['schemas']['OutcomeRecord']}[]};
  assertOutcomeDemo(report);return report;
 }finally{await app.close();await fixture?.close();await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=await outcomeDemo();await writeFile(new URL('../.local/phase-17-demo.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: real HTTP start → heading → arrival → partial (250 EGP, 2 delivered / 1 held) → phone-only no-answer (3 held, no fee refusal). Lost committed response recovered by the same action ID. Two tasks, one round; physical origin unchanged; 2 schema-valid durable source intents. Report: .local/phase-17-demo.json.');
}
