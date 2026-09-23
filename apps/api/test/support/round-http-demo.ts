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
import { roundConforms } from '../../src/rounds/models.js';

/** Real listening HTTP + application sessions/CSRF/PostgreSQL, signed issuer
 * fixture. Cookie jar is a protocol client, not a browser/device claim. */
export async function runRoundHttpDemo(){
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
  const pending=await rounds.result(randomUUID());assertStartStatus(pending);assert.equal(pending.status,'pending');
  const snapshot=await json(`/api/v1/independent/tasks/${created.response.body.task.taskId}`);assert.equal(snapshot.editable,false);
  assert.equal((await db.pool.query('SELECT * FROM tawsel.rounds')).rowCount,1);
  return {recordedAt:new Date().toISOString(),evidence:'Real listening HTTP, application session/CSRF, isolated PostgreSQL, API restart; signed issuer fixture; no browser, live Engine or physical-device claim',readiness:ready,start,accepted,replay,current,secondResult,pending,firstForecast:plan.forecast,departedTask:snapshot,rounds:(await db.pool.query('SELECT round_id,workday_id,device_generation,first_forecast_id FROM tawsel.rounds')).rows};
 }finally{await app?.close();await issuer.close();await db.close();}
}
