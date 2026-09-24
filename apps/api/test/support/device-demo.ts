import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { components } from '@tawsel/api-client';
import { createTestDatabase } from './database.js';
import { prepareAccessFixture } from './access-fixture.js';
import { issuerFixture } from './issuer-fixture.js';
import { buildApp } from '../../src/app.js';
import { createDatabasePool } from '../../src/db/pool.js';
import type { AuthConfig } from '../../src/auth/config.js';
import { PlanningClient } from '../../../../packages/api-client/src/planning.js';
import { RoundsClient } from '../../../../packages/api-client/src/rounds.js';
import { assertRoundStart, assertSameAuthority, assertStartStatus } from '../../../../tests/erp-conformance/rounds.js';
import {DevicesClient} from '../../../../packages/api-client/src/devices.js';
import {CurrentClient} from '../../../../packages/api-client/src/current.js';
import {OutcomesClient} from '../../../../packages/api-client/src/outcomes.js';
import { roundConforms } from '../../src/rounds/models.js';

/** Real listening HTTP + application sessions/CSRF/PostgreSQL, signed issuer
 * fixture. Cookie jar is a protocol client, not a browser/device claim. */
export async function deviceDemo(){
 const db=await createTestDatabase(),issuer=await issuerFixture();let app:ReturnType<typeof buildApp>|undefined;
 try{
  await prepareAccessFixture(db.pool,`${issuer.origin}/company`);
  const config:AuthConfig={origin:'http://127.0.0.1',encryptionKey:Buffer.alloc(32,5),sessionSeconds:28800,issuers:{company:{issuer:`${issuer.origin}/company`,clientId:'tawsel-web',clientSecret:'fixture-secret'},personal:{issuer:`${issuer.origin}/personal`,clientId:'tawsel-web',clientSecret:'fixture-secret'}}};
  let base='';const restart=async()=>{app=buildApp(createDatabasePool(db.config),config);base=await app.listen({host:'127.0.0.1',port:0});config.origin=base;};await restart();
  const jar=new Map<string,string>();let loseResponse=false;
  const fetcher:typeof fetch=async(input,init)=>{
   const headers=new Headers(init?.headers);headers.set('cookie',[...jar].map(([k,v])=>`${k}=${v}`).join('; '));headers.set('origin',config.origin);
   const response=await fetch(new URL(String(input),base),{...init,headers,redirect:'manual'});
   for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0]!,at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}
   if(loseResponse&&String(input).includes('/rounds/start')){loseResponse=false;await response.arrayBuffer();throw new Error('deliberately discarded committed start response');}
   return response;
  };
  const json=async(path:string,body?:unknown)=>{
   const bootstrap=await fetcher('/api/session/bootstrap'),{csrfToken}=await bootstrap.json() as {csrfToken:string};
   const response=await fetcher(path,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify(body)});
   const value=await response.json();assert.ok(response.ok,JSON.stringify(value));return value;
  };
  const login=await json('/api/session/login',{kind:'personal'}),authorized=await fetch(login.authorizationUrl,{redirect:'manual'});
  const callback=new URL(authorized.headers.get('location')!),finished=await fetcher(`${callback.pathname}${callback.search}`);assert.equal(finished.status,302);
  const context=(await json('/api/session/context?kind=personal')).access;
  const deviceId=randomUUID();let sequence=0;
  const command=<O extends string,P extends Record<string,unknown>>(operationId:O,payload:P)=>({schemaVersion:'1.0.0' as const,payloadVersion:'1.0.0',operationId,actionId:randomUUID(),context:{kind:'device' as const,tenantId:context.tenantId,accountId:context.sourceId,deviceId,deviceGeneration:1,deviceSequence:++sequence},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown' as const}},payload});
  const created=await json('/api/v1/independent/tasks',command('task.createIndependent',{recipientName:'عميل التجربة',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24}}}));
  const planning=new PlanningClient('personal',fetcher),rounds=new RoundsClient('personal',fetcher);
  await planning.command(command('planning.saveDraft',{driverId:context.driverId,expectedSettingsRevision:0,settings:{mode:'bicycle',origin:{kind:'manual-pin',coordinates:{latitude:30.04,longitude:31.23}},endpoint:{kind:'last-customer'},plannedStartAt:new Date().toISOString()}}) as components['schemas']['PlanningSaveDraftCommand']);
  const before=await planning.plans(context.driverId);
  const manual=await planning.command(command('planning.setManualOrder',{driverId:context.driverId,expectedSettingsRevision:before.settingsRevision,expectedInputRevision:before.inputRevision,expectedManualRevision:before.manualRevision,selection:{kind:'select-first',taskId:created.response.body.task.taskId}}) as components['schemas']['PlanningManualOrderCommand']);
  const plan=(await planning.plans(context.driverId)).items[0]!;
  const ready=await rounds.readiness({driverId:context.driverId,deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[created.receipt.actionId,manual.receipt.actionId]});assert.ok(roundConforms('Readiness',ready));
  assert.deepEqual(await rounds.current(),{workday:null,round:null});
  const start=command('round.start',{driverId:context.driverId,readinessId:ready.readinessId,planId:plan.planId,expectedPlanRevision:plan.revision}) as components['schemas']['RoundStartCommand'];
  assert.equal((await fetch(new URL('/api/v1/rounds/current?kind=personal',base))).status,401);
  assert.equal((await fetcher('/api/v1/rounds/start?kind=personal',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(start)})).status,403);
  await app!.close();app=undefined;await assert.rejects(()=>rounds.start(start));
  assert.equal((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount,0);await restart();
  loseResponse=true;await assert.rejects(()=>rounds.start(start),/discarded committed/);
  const accepted=await rounds.result(start.actionId);assertStartStatus(accepted);assert.equal(accepted.status,'accepted');
  const replay=await rounds.start(start),body=replay.response!.body as components['schemas']['RoundStartResult'];assertRoundStart(body);assert.ok(roundConforms('StartResult',body));
  assert.equal(body.round.firstForecastId,plan.forecast.forecastId);
  await app!.close();app=undefined;await restart();
  assert.deepEqual(await rounds.start(start),replay);
  const another=new RoundsClient('personal',fetcher),current=await another.current();assertSameAuthority(body.round,current.round!);
  const second={...start,actionId:randomUUID(),context:{...start.context,deviceId:randomUUID()}} as components['schemas']['RoundStartCommand'];
  const secondResult=await another.start(second),secondBody=secondResult.response!.body as components['schemas']['RoundStartResult'];assert.equal(secondBody.disposition,'already-active');assertSameAuthority(body.round,secondBody.round);

  // A genuinely separate application session/cookie jar for the second phone.
  const jar2=new Map<string,string>();let loseTakeover=false;
  const fetch2:typeof fetch=async(input,init)=>{
   const headers=new Headers(init?.headers);headers.set('cookie',[...jar2].map(([k,v])=>`${k}=${v}`).join('; '));headers.set('origin',config.origin);
   const response=await fetch(new URL(String(input),base),{...init,headers,redirect:'manual'});
   for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0]!,at=pair.indexOf('=');jar2.set(pair.slice(0,at),pair.slice(at+1));}
   if(loseTakeover&&String(input).includes('/devices/takeover')){loseTakeover=false;await response.arrayBuffer();throw new Error('discarded committed takeover response');}return response;
  };
  const bootstrap2=await fetch2('/api/session/bootstrap'),csrf2=(await bootstrap2.json() as {csrfToken:string}).csrfToken;
  const login2=await fetch2('/api/session/login',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf2},body:JSON.stringify({kind:'personal'})});
  const authorized2=await fetch((await login2.json() as {authorizationUrl:string}).authorizationUrl,{redirect:'manual'}),callback2=new URL(authorized2.headers.get('location')!);assert.equal((await fetch2(callback2.pathname+callback2.search)).status,302);
  const devices1=new DevicesClient('personal',fetcher),devices2=new DevicesClient('personal',fetch2),current1=new CurrentClient('personal',fetcher),current2=new CurrentClient('personal',fetch2);
  const phone2=randomUUID(),view=await devices2.context(body.round.roundId,phone2);assert.equal(view.mode,'view-only');
  const initial=await current1.read(body.round.roundId),target=initial.targets[0]!;
  const selection={roundId:body.round.roundId,taskId:target.taskId,attemptId:target.attemptId,expectedActivityRevision:0,expectedCurrentAttemptId:null,expectedSourceRevision:target.sourceRevision,expectedAssignmentRevision:target.assignmentRevision,expectedPinRevision:target.pinRevision};
  const heading=command('current.selectHeading',selection) as components['schemas']['CurrentSelectHeadingCommand'];await current1.heading(heading);
  const oldArrival=command('current.recordArrival',{...selection,expectedActivityRevision:1,expectedCurrentAttemptId:target.attemptId}) as components['schemas']['CurrentArrivalCommand'];
  const oldOutcome=command('outcome.recordNoAnswer',{...selection,expectedActivityRevision:2,expectedCurrentAttemptId:target.attemptId}) as components['schemas']['OutcomeNoAnswerCommand'];oldOutcome.observation.observedAt='2020-01-01T00:00:00Z';
  const takeover={...command('device.takeOver',{roundId:body.round.roundId,expectedGeneration:1}),context:{...start.context,deviceId:phone2}} as components['schemas']['DeviceTakeoverCommand'];
  assert.equal((await fetch2('/api/v1/devices/takeover?kind=personal',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(takeover)})).status,403);
  await app!.close();app=undefined;await assert.rejects(()=>devices2.takeover(takeover));
  assert.equal((await db.pool.query('SELECT 1 FROM tawsel.device_takeovers')).rowCount,0);await restart();
  loseTakeover=true;await assert.rejects(()=>devices2.takeover(takeover),/discarded committed/);
  const recovered=await devices2.result(takeover.actionId);assert.equal(recovered.status,'accepted');
  await app!.close();app=undefined;await restart();
  const continued=await devices2.continueOnThisPhone(takeover);assert.ok(continued.snapshot);assert.equal(continued.snapshot.current?.currentActivity?.stage,'heading');
  assert.deepEqual(continued.result,recovered.result);assert.equal(continued.snapshot.context.owner.generation,2);
  const newContext={...oldArrival.context,deviceId:phone2,deviceGeneration:2,snapshotToken:continued.snapshot.snapshotToken!};
  assert.equal((await current2.arrival({...oldArrival,actionId:randomUUID(),context:newContext} as components['schemas']['CurrentArrivalCommand'])).receipt.businessStatus,'accepted');
  const outcomes2=new OutcomesClient('personal',fetch2);
  assert.equal((await outcomes2.noAnswer({...oldOutcome,actionId:randomUUID(),context:newContext} as components['schemas']['OutcomeNoAnswerCommand'])).receipt.businessStatus,'accepted');
  const staleArrival=await current1.arrival(oldArrival);assert.equal(staleArrival.receipt.businessStatus,'review-required');
  const received=await devices1.receive(oldOutcome),duplicate=await devices1.receive(oldOutcome);assert.equal(received.submissionStatus,'received');assert.equal(duplicate.submissionStatus,'duplicate');assert.deepEqual(received.result,duplicate.result);
  const evidence=await devices2.evidence(oldOutcome.actionId,phone2);assert.deepEqual(evidence.envelope,oldOutcome);assert.equal(evidence.result.receipt.businessStatus,'review-required');
  assert.equal((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes')).rowCount,1);assert.equal((await db.pool.query('SELECT 1 FROM tawsel.device_takeovers')).rowCount,1);
  const notifications=(await db.pool.query("SELECT event_type,recipient_id,payload FROM tawsel.outbox_intents WHERE event_type IN ('device.executionTransferred','evidence.received') ORDER BY created_at,event_id")).rows;
  assert.equal(notifications.length,3);for(const n of notifications)assert.equal(n.recipient_id,context.sourceId);
  issuer.state.active=false;await assert.rejects(()=>devices1.receive(oldOutcome),(e:unknown)=>!!e&&typeof e==='object'&&'status' in e&&e.status===401);
  assert.equal((await db.pool.query('SELECT 1 FROM tawsel.command_evidence WHERE action_id=$1',[oldOutcome.actionId])).rowCount,1);
  return {recordedAt:new Date().toISOString(),evidenceClass:'Real loopback HTTP, separate OIDC application sessions/CSRF, disposable PostgreSQL, API restart and exact public clients; signed issuer fixture; no browser or physical-device claim',view,takeover,recovered,continued,staleArrival,received,duplicate,evidence,oldOutcome,notifications};
 }finally{await app?.close();await issuer.close();await db.close();}
}
