import {afterEach,beforeEach,describe,test,expect} from 'vitest';
import Fastify from 'fastify';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture} from '../support/access-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {deferred} from '../support/barriers.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {CurrentActivity} from '../../src/current/service.js';
import {money} from '../../src/outcomes/arithmetic.js';
import {Monitoring} from '../../src/monitoring/service.js';
import {monitoringRoutes} from '../../src/monitoring/routes.js';
import type {Snapshot} from '../../src/monitoring/models.js';
import type {AuthConfig} from '../../src/auth/config.js';
import {randomUUID} from 'node:crypto';
import {send} from '../support/provisioning-fixture.js';
import {Eligibility} from '../../src/eligibility/service.js';
import {startedFixture} from '../support/current-fixture.js';
import {principals} from '../support/access-fixture.js';
import type {History} from '../../src/monitoring/models.js';
import {correctionRoutes} from '../../src/corrections/routes.js';
import {mixedMonitoringFixture} from '../support/monitoring-fixture.js';
import type {AuthenticatedPrincipal} from '../../src/access/service.js';
import {monitoringDemo} from '../../../../scripts/monitoring-demo.js';
import {verifyMonitoring} from '../../../../tests/erp-conformance/monitoring.js';
import {Closures} from '../../src/closure/service.js';
import {Rounds} from '../../src/rounds/service.js';
import type {components} from '@tawsel/api-client';
const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p24',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p24',clientSecret:'fixture'}}};
describe('P24 coherent monitoring — real API and isolated PostgreSQL',()=>{
 let db:Awaited<ReturnType<typeof createTestDatabase>>;
 const closers:(()=>Promise<unknown>)[]=[];
 beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
 afterEach(async()=>{for(const close of closers.splice(0).reverse())await close();await db?.close();});
 async function fixture(count=2,service=new Monitoring(db.pool)){
  const f=await outcomeCompanyFixture(db,Array.from({length:count},()=>({})));closers.push(()=>f.close());
  const app=Fastify();await app.register(scope=>monitoringRoutes(scope,db.pool,config,(_r,_k,work)=>work(f.principal),service));await app.ready();closers.push(()=>app.close());
  const url=`/api/v1/monitoring/trips/${f.round.roundId}?kind=company`;
  const get=async(headers:Record<string,string>={})=>{const r=await app.inject({url,headers});expect(r.statusCode,r.body).toBe(200);return {r,b:r.json() as Snapshot};};
  return {...f,api:app,url,get};
 }
 test('B: six full and one failed are seven processed of eighteen; refresh is independent of idle action time',async()=>{
  const f=await fixture(18),outcomes=new Outcomes(db.pool);
  for(let i=0;i<6;i++)expect((await outcomes.command(f.principal,f.make(i,'outcome.recordFull',{reportedCollection:money(35000)},i))).receipt.businessStatus).toBe('accepted');
  expect((await outcomes.command(f.principal,f.make(6,'outcome.recordNoAnswer',{},6))).receipt.businessStatus).toBe('accepted');
  const {r,b}=await f.get();expect(b.progress).toEqual({shipments:18,attempts:18,processedAttempts:7,processedShipments:7,fullDeliveredShipments:6,partialShipments:0,failedShipments:1,remainingShipments:11});
  expect(b.current).toBeNull();expect(b.nextSuggestion?.taskId).toBe(f.tasks[7]);expect(b.groups.returnRequiredPieces).toBe(3);
  expect(b.freshness).toMatchObject({receivedEvidenceOnly:true,deviceContactAt:null,integrationDelivery:'unavailable'});
  const unchanged=await f.api.inject({url:f.url,headers:{'if-none-match':`"unrelated", W/${r.headers.etag}`}});
  expect(unchanged.statusCode,unchanged.body).toBe(304);expect(unchanged.body).toBe('');expect(unchanged.headers['x-snapshot-revision']).toBe(String(b.snapshotRevision));
  expect(Date.parse(String(unchanged.headers['x-refreshed-at']))).toBeGreaterThanOrEqual(Date.parse(b.freshness.refreshedAt));
  const resync=(await f.get()).b;expect({...resync,freshness:b.freshness}).toEqual(b);
  expect(JSON.stringify(b)).not.toMatch(/offline|applied|unsentCount/);
  expect(b.lastCommittedChange?.correlationId).toMatch(/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/);
 });
 test('B: outcome commits between snapshot queries without mixing old current and new counters',async()=>{
  const reached=deferred(),release=deferred();let pause=false;
  const service=new Monitoring(db.pool,async stage=>{if(pause&&stage==='tasks'){pause=false;reached.resolve();await release.promise;}});
  const f=await fixture(2,service),current=new CurrentActivity(db.pool);
  const heading=f.make(0,'current.selectHeading');await current.command(f.principal,heading);
  const initial=(await f.get()).b;expect(initial.current?.taskId).toBe(f.tasks[0]);
  pause=true;const pending=f.api.inject(f.url);await reached.promise;
  try{
   const result=await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordFull',{reportedCollection:money(35000)},1,String(heading.payload.attemptId)));
   expect(result.receipt.businessStatus).toBe('accepted');release.resolve();
   const response=await pending;expect(response.statusCode,response.body).toBe(200);const old=response.json() as Snapshot;
   expect(old.progress).toEqual(initial.progress);expect(old.current).toEqual(initial.current);expect(old.snapshotRevision).toBe(initial.snapshotRevision);
   const fresh=(await f.get()).b;expect(fresh.current).toBeNull();expect(fresh.progress.fullDeliveredShipments).toBe(1);expect(fresh.progress.remainingShipments).toBe(1);expect(fresh.nextSuggestion?.taskId).toBe(f.tasks[1]);expect(fresh.snapshotRevision).toBeGreaterThan(old.snapshotRevision);
  }finally{release.resolve();await pending;}
 });
 test('C: older first read loses ledger insertion race and retries instead of regressing the latest revision',async()=>{
  const reached=deferred<number>(),release=deferred();let pause=true,retries=0;
  const service=new Monitoring(db.pool,async(stage,tx)=>{if(stage==='snapshot')retries++;if(pause&&stage==='tasks'){pause=false;reached.resolve(Number((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid));await release.promise;}});
  const f=await fixture(2,service),pending=f.api.inject(f.url);const readPid=await reached.promise;
  try{
   let writePid=0;const writer=new Outcomes(db.pool,{async afterWrite(stage,tx){if(stage==='domain')writePid=Number((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid);}});
   expect((await writer.command(f.principal,f.make(0,'outcome.recordFull',{reportedCollection:money(35000)}))).receipt.businessStatus).toBe('accepted');expect(writePid).not.toBe(readPid);
   const newer=await new Monitoring(db.pool).read(f.principal,{kind:'trip',id:f.round.roundId});release.resolve();
   const older=await pending;expect(older.statusCode,older.body).toBe(200);expect(older.json().snapshotRevision).toBe(newer.body.snapshotRevision);expect(older.json().progress.fullDeliveredShipments).toBe(1);expect(retries).toBe(2);
  }finally{release.resolve();await pending;}
 });
 test('C: corrections preserve original history, invalidate cursors, and revisions survive full refresh and replans',async()=>{
  const f=await fixture(3),outcomes=new Outcomes(db.pool);
  expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own']}))).statusCode).toBe(200);
  expect((await outcomes.command(f.principal,f.make(0,'outcome.recordNoAnswer'))).receipt.businessStatus).toBe('accepted');
  const initial=(await f.get()).b,first=await f.api.inject(f.url+'&limit=1');expect(first.statusCode,first.body).toBe(200);expect(first.json().progress.shipments).toBe(3);expect(first.json().items).toHaveLength(1);
  const second=await f.api.inject(f.url+'&limit=1&cursor='+first.json().nextCursor);expect(second.statusCode,second.body).toBe(200);expect(second.json().items[0].taskId).not.toBe(first.json().items[0].taskId);
  const original=(await outcomes.read(f.principal,f.round.roundId)).items[0]!;
  const correct=f.planCommand('outcome.correct',{roundId:f.round.roundId,taskId:original.taskId,attemptId:original.attemptId,expectedOutcomeRevision:original.revision,replacement:{outcome:'partial',pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}});delete correct.payload.driverId;
  const app=Fastify();await app.register(s=>correctionRoutes(s,db.pool,config,(_r,_k,work)=>work(f.principal)));await app.ready();closers.push(()=>app.close());
  const correction=await app.inject({method:'POST',url:'/api/v1/corrections/outcomes?kind=company',headers:{origin:config.origin,cookie:'__Host-tawsel-browser=p24','x-csrf-token':'p24'},payload:correct});expect(correction.statusCode,correction.body).toBe(200);
  const changed=(await f.get()).b;expect(changed.snapshotRevision).toBeGreaterThan(initial.snapshotRevision);expect(changed.progress).toMatchObject({shipments:3,attempts:3,processedAttempts:1,processedShipments:1,partialShipments:1,failedShipments:0});expect(changed.groups.returnRequiredPieces).toBe(1);
  const stale=await f.api.inject(f.url+'&limit=1&cursor='+first.json().nextCursor);expect(stale.statusCode,stale.body).toBe(409);expect(stale.json().code).toBe('snapshot_changed');
  const history=await f.api.inject(`/api/v1/monitoring/tasks/${original.taskId}/history?kind=company`);expect(history.statusCode,history.body).toBe(200);const h=history.json() as History;
  expect(h.items.filter(i=>i.kind==='outcome').map(i=>[i.outcome.outcome,i.effective])).toEqual([['no-answer',false],['partial',true]]);expect(h.items.filter(i=>i.kind==='correction')).toHaveLength(1);
  const planned=await f.service.plans(f.principal,f.driverId);expect((await f.service.command(f.principal,f.planCommand('planning.setManualOrder',{expectedSettingsRevision:planned.settingsRevision,expectedInputRevision:planned.inputRevision,expectedManualRevision:planned.manualRevision,selection:{kind:'order',taskIds:[f.tasks[2],f.tasks[1]]}}))).receipt.businessStatus).toBe('accepted');
  const revised=(await f.get()).b;expect(revised.snapshotRevision).toBeGreaterThan(changed.snapshotRevision);expect(revised.progress).toEqual(changed.progress);expect(revised.nextSuggestion?.taskId).toBe(f.tasks[2]);
  expect((await new Monitoring(db.pool).read(f.principal,{kind:'trip',id:f.round.roundId})).body.snapshotRevision).toBe(revised.snapshotRevision);
 });
 test('C: retry adds an attempt, not a shipment; partial and failed remain different units',async()=>{
  const f=await fixture(2),outcomes=new Outcomes(db.pool),eligibility=new Eligibility(db.pool);
  await outcomes.command(f.principal,f.make(0,'outcome.recordNoAnswer'));
  const state=await eligibility.read(f.principal,f.round.roundId),t=state.items.find(t=>t.taskId===f.tasks[0])!;
  const retry=f.planCommand('task.retryWhole',{roundId:f.round.roundId,taskId:t.taskId,attemptId:t.attemptId,expectedSourceRevision:t.sourceRevision,expectedAssignmentRevision:t.assignmentRevision,expectedPinRevision:t.pinRevision,expectedActivityRevision:state.activityRevision,expectedCurrentAttemptId:state.currentAttemptId,expectedEligibilityRevision:t.revision});delete retry.payload.driverId;
  expect((await eligibility.command(f.principal,retry)).receipt.businessStatus).toBe('accepted');
  const after=(await f.get()).b;expect(after.progress).toMatchObject({shipments:2,attempts:3,processedAttempts:1,processedShipments:0,failedShipments:0,remainingShipments:2});
  const next=await eligibility.read(f.principal,f.round.roundId),member=next.items.find(t=>t.taskId===f.tasks[0])!;
  const full=f.make(0,'outcome.recordFull',{reportedCollection:money(35000)},next.activityRevision,next.currentAttemptId);full.payload.attemptId=member.attemptId;
  expect((await outcomes.command(f.principal,full)).receipt.businessStatus).toBe('accepted');
  expect((await f.get()).b.progress).toMatchObject({shipments:2,attempts:3,processedAttempts:2,processedShipments:1,fullDeliveredShipments:1,remainingShipments:1});
 });
 test('C: unsent phone action is unknown; received rejected evidence is visible without becoming an outcome',async()=>{
  const f=await fixture(1),before=(await f.get()).b,c=f.make(0,'outcome.recordFull',{reportedCollection:money(35000)});
  expect((await f.get()).b.snapshotRevision).toBe(before.snapshotRevision);
  expect((await f.api.inject(`/api/v1/monitoring/actions/${c.actionId}?kind=company&sourceId=${f.accountId}`)).statusCode).toBe(404);
  if(c.context.kind!=='device')throw new Error('fixture device');c.context.deviceId=randomUUID();
  const rejected=await new Outcomes(db.pool).command(f.principal,c);expect(rejected.receipt.businessStatus).toBe('review-required');
  const received=(await f.get()).b;expect(received.progress).toEqual(before.progress);expect(received.snapshotRevision).toBeGreaterThan(before.snapshotRevision);expect(received.freshness.lastReceivedActionAt).not.toBe(before.freshness.lastReceivedActionAt);
  const action=await f.api.inject(`/api/v1/monitoring/actions/${c.actionId}?kind=company&sourceId=${f.accountId}`);expect(action.statusCode,action.body).toBe(200);expect(action.json().action).toMatchObject({actionId:c.actionId,businessStatus:'review-required',acceptedAt:null});expect(action.body).not.toContain('reportedCollection');
 });
 test('C: personal driver projection has no company custody or prepared work and rejects company IDs',async()=>{
  const f=await startedFixture(db.pool,1),service=new Monitoring(db.pool);
  const read=await service.read(principals.personal,{kind:'trip',id:f.round.roundId});const b=read.body as Snapshot;
  expect(b.items).toHaveLength(1);expect(b.items[0]).toMatchObject({state:'personal',branchId:null,integrationId:null,heldPieces:null});expect(b.progress.shipments).toBe(1);expect(b.groups.returnRequiredPieces).toBe(0);
  await expect(service.read(principals.personal,{kind:'task',id:randomUUID()})).rejects.toMatchObject({statusCode:404});
 });
 test('C: staff branch filters, revoked scope, and direct history IDs obey current authorization',async()=>{
  const f=await mixedMonitoringFixture(db);closers.push(()=>f.close());
  expect((await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'viewer',sourceRevision:1,name:'Viewer',capabilities:['monitor.read']}))).statusCode).toBe(200);
  const user=await send(f.app,f.source.token,f.source.command('user.provision',{externalId:'policy-staff',sourceRevision:1,subject:'policy-staff',roleExternalId:'viewer',branchExternalIds:['branch'],enabled:true}));expect(user.statusCode,user.body).toBe(200);
  const staffId=user.json().response.body.resourceId as string;
  await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1 AND account_id=$2',[f.tenantId,staffId]);
  await db.pool.query('INSERT INTO tawsel.membership_branches VALUES($1,$2,$3)',[f.tenantId,staffId,f.hiddenBranchId]);
  const principal:AuthenticatedPrincipal={kind:'account',issuer:'https://issuer.fixture.invalid',subject:'policy-staff'},app=Fastify();await app.register(s=>monitoringRoutes(s,db.pool,config,(_r,_k,work)=>work(principal)));await app.ready();closers.push(()=>app.close());
  const url=`/api/v1/monitoring/drivers/${f.driverId}?kind=company`,all=await app.inject(url);expect(all.statusCode,all.body).toBe(200);expect(all.json().progress.shipments).toBe(3);
  const aBranch=all.json().items.find((t:{taskId:string})=>t.taskId===f.tasks[0]).branchId;
  const a=await app.inject(url+'&branchId='+aBranch),b=await app.inject(url+'&branchId='+f.hiddenBranchId);
  expect(a.json().progress.shipments).toBe(2);expect(b.json().progress.shipments).toBe(1);expect(a.json().scopeKey).not.toBe(b.json().scopeKey);
  await db.pool.query('DELETE FROM tawsel.membership_branches WHERE tenant_id=$1 AND account_id=$2 AND branch_id=$3',[f.tenantId,staffId,f.hiddenBranchId]);
  const revoked=await app.inject({url,headers:{'if-none-match':String(all.headers.etag)}});expect(revoked.statusCode,revoked.body).toBe(200);expect(revoked.json().scopeKey).not.toBe(all.json().scopeKey);expect(revoked.json().progress.shipments).toBe(2);expect(revoked.body).not.toContain(f.hiddenId);
  expect((await app.inject(url+'&branchId='+f.hiddenBranchId)).statusCode).toBe(403);
  expect((await app.inject(`/api/v1/monitoring/tasks/${f.hiddenId}/history?kind=company`)).statusCode).toBe(404);
 });
 test('C: prepared and future held work stay outside round denominator, with explicit current-holder groups',async()=>{
  const f=await fixture(1),prepared=await f.task('upcoming','ordinary','prepared'),future=await f.task('tomorrow','ordinary','held','2099-01-01T00:00:00Z');
  const read=await f.api.inject(`/api/v1/monitoring/drivers/${f.driverId}?kind=company`);expect(read.statusCode,read.body).toBe(200);const b=read.json() as Snapshot;
  expect(b.progress.shipments).toBe(1);expect(b.groups).toMatchObject({preparedShipments:1,heldShipments:2,deferredShipments:1,heldPieces:4,returnRequiredPieces:0});
  expect(b.items.find(t=>t.taskId===prepared)).toMatchObject({state:'prepared',eligible:false,heldPieces:0});expect(b.items.find(t=>t.taskId===future)).toMatchObject({state:'held',eligible:false,heldPieces:1});
  expect(b.nextSuggestion?.taskId).toBe(f.tasks[0]);
 });
 test('C: real HTTP/public client demonstration and portable consumer reject semantic mutations',async()=>{
  const report=await monitoringDemo();verifyMonitoring(report);
  const double=structuredClone(report);if(double.corrected.data)double.corrected.data.progress.fullDeliveredShipments++;expect(()=>verifyMonitoring(double)).toThrow();
  const leak=structuredClone(report);if(leak.before.data)leak.before.data.items[0]!.taskId=leak.hiddenTaskId;expect(()=>verifyMonitoring(leak)).toThrow();
  const history=structuredClone(report);if(history.history.data)history.history.data.items=history.history.data.items.filter(i=>i.kind!=='correction');expect(()=>verifyMonitoring(history)).toThrow();
 },30_000);
 test('C: source-only later round cannot replace an integration’s last authorized round or expose its ID',async()=>{
  const f=await mixedMonitoringFixture(db);closers.push(()=>f.close());const outcomes=new Outcomes(db.pool);
  for(let i=0;i<2;i++)expect((await outcomes.command(f.principal,f.make(i,'outcome.recordFull',{reportedCollection:money(35000)},i))).receipt.businessStatus).toBe('accepted');
  const end=f.planCommand('round.end',{roundId:f.round.roundId,workdayId:f.round.workdayId,expectedActiveRoundId:f.round.roundId,expectedActivityRevision:2,expectedCurrentAttemptId:null,currentAction:'require-none'});delete end.payload.driverId;
  expect((await new Closures(db.pool).command(f.principal,end)).receipt.businessStatus).toBe('accepted');
  const plans=await f.service.plans(f.principal,f.driverId);
  expect((await f.service.command(f.principal,f.planCommand('planning.setManualOrder',{expectedSettingsRevision:plans.settingsRevision,expectedInputRevision:plans.inputRevision,expectedManualRevision:plans.manualRevision,selection:{kind:'order',taskIds:[f.hiddenId]}}))).receipt.businessStatus).toBe('accepted');
  const plan=(await f.service.plans(f.principal,f.driverId)).items[0]!,start=f.planCommand('round.start',{planId:plan.planId,expectedPlanRevision:plan.revision});if(start.context.kind!=='device')throw new Error('fixture device');
  const rounds=new Rounds(db.pool),ready=await rounds.readiness(f.principal,{driverId:f.driverId,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});start.payload.readinessId=ready.readinessId;
  const started=await rounds.start(f.principal,start);expect(started.receipt.businessStatus).toBe('accepted');const newer=(started.response!.body as components['schemas']['RoundStartResult']).round;
  const a=await f.snapshotA();expect(a.round?.roundId).toBe(f.round.roundId);expect(JSON.stringify(a)).not.toContain(newer.roundId);expect(a.progress).toMatchObject({shipments:2,fullDeliveredShipments:2});expect(a.current).toBeNull();expect(a.nextSuggestion).toBeNull();
  expect((await f.monitorGet(f.source,`trips/${newer.roundId}`)).statusCode).toBe(404);
  const b=await f.monitorGet(f.second);expect(b.statusCode,b.body).toBe(200);expect(b.json().round.roundId).toBe(newer.roundId);expect(b.json().progress.shipments).toBe(1);
  const historical=await f.monitorGet(f.second,`trips/${f.round.roundId}`);expect(historical.statusCode,historical.body).toBe(200);expect(historical.json().items[0].eligible).toBe(false);
 });
});
