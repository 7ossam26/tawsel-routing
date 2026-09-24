import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {mixedMonitoringFixture} from '../apps/api/test/support/monitoring-fixture.js';
import {send} from '../apps/api/test/support/provisioning-fixture.js';
import {monitoringRoutes} from '../apps/api/src/monitoring/routes.js';
import {outcomeRoutes} from '../apps/api/src/outcomes/routes.js';
import {correctionRoutes} from '../apps/api/src/corrections/routes.js';
import {MonitoringClient} from '../packages/api-client/src/monitoring.js';
import type {AuthConfig} from '../apps/api/src/auth/config.js';
import {verifyMonitoring} from '../tests/erp-conformance/monitoring.js';
export async function monitoringDemo(){
 const db=await createTestDatabase();let f:Awaited<ReturnType<typeof mixedMonitoringFixture>>|undefined;const driver=Fastify();
 try{
  await prepareAccessFixture(db.pool);f=await mixedMonitoringFixture(db);const fixture=f;
  assert.equal((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode,200);
  const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p24',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p24',clientSecret:'fixture'}}};
  await driver.register(s=>monitoringRoutes(s,db.pool,config,(_r,_k,work)=>work(fixture.principal)));
  await driver.register(s=>outcomeRoutes(s,db.pool,config,(_r,_k,work)=>work(fixture.principal)));
  await driver.register(s=>correctionRoutes(s,db.pool,config,(_r,_k,work)=>work(fixture.principal)));
  const origin=await f.app.listen({host:'127.0.0.1',port:0}),driverOrigin=await driver.listen({host:'127.0.0.1',port:0});
  const a=new MonitoringClient({baseUrl:origin,authorization:`Bearer ${f.source.token}`}),b=new MonitoringClient({baseUrl:origin,authorization:`Bearer ${f.second.token}`}),own=new MonitoringClient({baseUrl:driverOrigin,kind:'company'});
  const before=await a.driver(f.driverId),other=await b.driver(f.driverId),all=await own.driver(f.driverId);
  assert.equal(before.status,200);assert.equal(other.status,200);assert.equal(all.status,200);
  const unchanged=await a.driver(f.driverId,{etag:before.etag});assert.equal(unchanged.status,304);
  const post=async(path:string,body:unknown)=>{const r=await fetch(driverOrigin+path+'?kind=company',{method:'POST',headers:{'Content-Type':'application/json',Origin:config.origin,Cookie:'__Host-tawsel-browser=p24','X-CSRF-Token':'p24'},body:JSON.stringify(body)});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;};
  const command=f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:{amountMinor:25000,currency:'EGP',exponent:2}});
  const outcome=await post('/api/v1/outcomes/partial',command),partial=await a.driver(f.driverId);
  const original=outcome.response.body.outcome,correct=f.planCommand('outcome.correct',{roundId:f.round.roundId,taskId:original.taskId,attemptId:original.attemptId,expectedOutcomeRevision:original.revision,replacement:{outcome:'full',reportedCollection:{amountMinor:35000,currency:'EGP',exponent:2}}});delete correct.payload.driverId;
  await post('/api/v1/corrections/outcomes',correct);
  const corrected=await a.driver(f.driverId),history=await a.taskHistory(f.tasks[0]!),day=await a.workdayHistory(f.round.workdayId),resync=await a.driver(f.driverId);
  const hidden=await fetch(`${origin}/api/v1/erp/monitoring/tasks/${f.hiddenId}/history`,{headers:{Authorization:`Bearer ${f.source.token}`}});
  const report={evidence:'real-loopback-HTTP-and-isolated-PostgreSQL',fixtures:'Issuer principal and shared-driver source reference are setup fixtures; no native ERP or physical device.',before,other,all,unchanged,partial,corrected,history,day,resync,hiddenHistoryStatus:hidden.status,hiddenTaskId:f.hiddenId};
  verifyMonitoring(report);await mkdir('.local',{recursive:true});await writeFile('.local/phase-24-demo.json',JSON.stringify(report,null,2)+'\n');return report;
 }finally{await driver.close();await f?.close();await db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await monitoringDemo();console.log('PASS: scoped HTTP snapshots, 304/full resync, partial-to-full correction history and source isolation. Report: .local/phase-24-demo.json');}
