import {beforeEach,afterEach,test,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import Fastify from 'fastify';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture,principals,ids} from '../support/access-fixture.js';
import {startedFixture} from '../support/current-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {mixedMonitoringFixture} from '../support/monitoring-fixture.js';
import {send,operatorToken} from '../support/provisioning-fixture.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {Corrections} from '../../src/corrections/service.js';
import {Eligibility} from '../../src/eligibility/service.js';
import {Returns} from '../../src/returns/service.js';
import {Branches} from '../../src/branch/service.js';
import type {components} from '@tawsel/api-client';
import {money} from '../../src/outcomes/arithmetic.js';
import {Reporting} from '../../src/reporting/service.js';
import {reportingRoutes} from '../../src/reporting/routes.js';
import {collections} from '../../src/reporting/queries.js';
import type {Attempt} from '../../src/reporting/models.js';
import {deferred} from '../support/barriers.js';
import type {AuthConfig} from '../../src/auth/config.js';
import {reportingFixture} from '../support/reporting-fixture.js';
import {CurrentActivity} from '../../src/current/service.js';
import {Closures} from '../../src/closure/service.js';
import {runPlanningOnce} from '../../src/planning/worker.js';
import {intake,command} from '../support/planning-fixture.js';
import {formatWorkdayInstant} from '@tawsel/api-client/closure';
import {mkdtemp,copyFile,unlink,rmdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readMigrations,migrate} from '../../src/db/migrate.js';
let db:Awaited<ReturnType<typeof createTestDatabase>>;
const closers:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const close of closers.splice(0).reverse())await close();await db?.close();});
async function company(overrides:Parameters<typeof outcomeCompanyFixture>[1]=[{},{}]){
 const f=await outcomeCompanyFixture(db,overrides);closers.push(()=>f.close());
 const r=await send(f.app,f.source.token,f.source.command('role.defineCapabilities',{externalId:'role',sourceRevision:2,name:'Driver',capabilities:['execution.own','correction.own','reports.read']}));expect(r.statusCode,r.body).toBe(200);return f;
}
test('A: six full plus one phone failure is seven processed of eighteen; sixteen full is 88.9%, never eighteen delivered',async()=>{
 const f=await startedFixture(db.pool,18),outcomes=new Outcomes(db.pool),reports=new Reporting(db.pool);
 for(let n=0;n<7;n++){const c=f.make(n,n,null,n===6?'outcome.recordNoAnswer':'outcome.recordFull');expect((await outcomes.command(principals.personal,c)).receipt.businessStatus).toBe('accepted');}
 const first=await reports.workday(principals.personal,f.round.workdayId);
 expect(first.counts).toMatchObject({shipments:18,attempts:18,processedAttempts:7,fullShipments:6,noAnswerShipments:1,unfinishedShipments:11});expect(first.pieces).toBeNull();
 for(let n=7;n<18;n++)expect((await outcomes.command(principals.personal,f.make(n,n,null,n===17?'outcome.recordNoAnswer':'outcome.recordFull'))).receipt.businessStatus).toBe('accepted');
 const last=await reports.workday(principals.personal,f.round.workdayId);expect(last.counts).toMatchObject({processedAttempts:18,fullShipments:16,noAnswerShipments:2,fullDeliveryPercent:88.9});
 await expect(reports.workday(principals.personal,f.round.workdayId,{snapshotId:first.snapshotId})).rejects.toMatchObject({code:'snapshot_changed'});
 expect((await reports.workday(principals.personal,f.round.workdayId,{outcome:'no-answer'}))).toMatchObject({scopeCounts:{shipments:18},counts:{shipments:2,fullShipments:0}});
});
test('A: real partial/refusal/prepaid results, duplicate replay and correction replace effective totals while preserving originals',async()=>{
 const f=await company([{}, {}, {lines:[{sourceLineId:'pieces',description:'prepaid',quantity:3,unitDue:money(0)}],shippingDue:money(0),totalDue:money(0)}, {}]);
 const service=new Outcomes(db.pool),reports=new Reporting(db.pool);
 const partial=f.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)});
 expect((await service.command(f.principal,partial)).receipt.businessStatus).toBe('accepted');await service.command(f.principal,partial);
 expect((await service.command(f.principal,f.make(1,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000)},1))).receipt.businessStatus).toBe('accepted');
 expect((await service.command(f.principal,f.make(2,'outcome.recordFull',{reportedCollection:money(0)},2))).receipt.businessStatus).toBe('accepted');
 expect((await service.command(f.principal,f.make(3,'outcome.recordRefusal',{shippingPayment:'refused',reportedCollection:money(0)},3))).receipt.businessStatus).toBe('accepted');
 const before=await reports.workday(f.principal,f.round.workdayId);expect(before.counts).toMatchObject({shipments:4,attempts:4,partialShipments:1,fullShipments:1,refusedShipments:2});
 expect(before.collections).toEqual([{currency:'EGP',exponent:2,reportedMinor:'30000',goodsMinor:'20000',shippingMinor:'10000',unpaidShippingMinor:'5000',unreportedAttempts:0}]);
 const original=before.attempts.find(i=>i.taskId===f.tasks[0])!.outcome!,c=f.planCommand('outcome.correct',{roundId:f.round.roundId,taskId:original.taskId,attemptId:original.attemptId,expectedOutcomeRevision:original.revision,replacement:{outcome:'full',reportedCollection:money(35000)}});delete c.payload.driverId;
 expect((await new Corrections(db.pool).command(f.principal,c)).receipt.businessStatus).toBe('accepted');
 const after=await reports.workday(f.principal,f.round.workdayId);expect(after.collections[0]!.reportedMinor).toBe('40000');expect(after.counts.fullShipments).toBe(2);
 expect(after.attempts.find(i=>i.taskId===original.taskId)!.history).toContainEqual(original);expect(after.attempts.find(i=>i.taskId===original.taskId)!.corrections).toHaveLength(1);
 expect(after.pieces).toEqual({dispatched:12,delivered:6,held:6,returnRequired:6,received:0,lost:0,damaged:0});
});
test('A: explicit retry adds an attempt, never a shipment, quantity or repeated shipping fee',async()=>{
 const f=await company([{}]),outcomes=new Outcomes(db.pool),eligibility=new Eligibility(db.pool);
 expect((await outcomes.command(f.principal,f.make(0,'outcome.recordRefusal',{shippingPayment:'collected',reportedCollection:money(5000)}))).receipt.businessStatus).toBe('accepted');
 const state=(await eligibility.read(f.principal,f.round.roundId)).items.find(i=>i.taskId===f.tasks[0])!;
 const retry=f.make(0,'task.retryWhole',{expectedEligibilityRevision:state.revision},1);expect((await eligibility.command(f.principal,retry)).receipt.businessStatus).toBe('accepted');
 const newAttempt=(await db.pool.query('SELECT attempt_id FROM tawsel.planning_attempts WHERE tenant_id=$1 AND task_id=$2 AND latest',[f.tenantId,f.tasks[0]])).rows[0].attempt_id as string;
 const full=f.make(0,'outcome.recordFull',{attemptId:newAttempt,reportedCollection:money(30000)},1);
 expect((await outcomes.command(f.principal,full)).receipt.businessStatus).toBe('accepted');
 const report=await new Reporting(db.pool).workday(f.principal,f.round.workdayId);
 expect(report.counts).toMatchObject({shipments:1,attempts:2,processedAttempts:2,fullShipments:1,failedAttempts:1});
 expect(report.collections[0]).toMatchObject({reportedMinor:'35000',shippingMinor:'5000',goodsMinor:'30000',unpaidShippingMinor:'0'});expect(report.pieces).toMatchObject({dispatched:3,delivered:3,held:0});
});
test('A: current report capability, tenant, branch and driver scope apply before totals and original history',async()=>{
 const f=await mixedMonitoringFixture(db);closers.push(()=>f.close());
 await db.pool.query("INSERT INTO tawsel.role_capabilities SELECT tenant_id,role_id,'reports.read',true FROM tawsel.roles WHERE tenant_id=$1",[f.tenantId]);
 await db.pool.query('DELETE FROM tawsel.membership_branches WHERE tenant_id=$1 AND account_id=$2 AND branch_id=$3',[f.tenantId,f.accountId,f.hiddenBranchId]);
 const reports=new Reporting(db.pool),report=await reports.workday(f.principal,f.round.workdayId);
 expect(report.counts.shipments).toBe(2);expect(JSON.stringify(report)).not.toContain(f.hiddenId);expect(JSON.stringify(report)).not.toContain('SECRET');
 await expect(reports.workday(f.principal,f.round.workdayId,{branchId:f.hiddenBranchId})).rejects.toMatchObject({statusCode:403});
 await expect(reports.workday(principals.personal,f.round.workdayId)).rejects.toMatchObject({statusCode:404});
 await expect(reports.workday(f.principal,f.round.workdayId,{driverId:ids.personalDriver})).rejects.toMatchObject({statusCode:404});
 await db.pool.query("DELETE FROM tawsel.role_capabilities WHERE tenant_id=$1 AND capability='reports.read'",[f.tenantId]);
 await expect(reports.workday(f.principal,f.round.workdayId,{snapshotId:report.snapshotId})).rejects.toMatchObject({statusCode:403});
});
test('A: confirmed subset and disposition consume once-per-cycle pieces, including idempotent receipt replay',async()=>{
 const f=await company([{}]);const grant=structuredClone(f.source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=3;grant.payload.returnCapabilities=['return.receive','return.dispose'];expect((await send(f.app,operatorToken,grant)).statusCode).toBe(200);
 await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordNoAnswer'));
 const returns=new Returns(db.pool),group=(await returns.groups(f.principal)).groups[0]!,item=group.items[0]!;
 const c=f.planCommand('return.requestHandover',{roundId:f.round.roundId,sourceBranchId:group.sourceBranchId,items:[{taskId:item.taskId,dispatchCycleId:item.dispatchCycleId,outcomeId:item.outcomeId,sourceLineId:item.sourceLineId,quantity:3}]});delete c.payload.driverId;
 const result=await returns.request(f.principal,c);expect(result.receipt.businessStatus).toBe('accepted');
 const request=(result.response!.body as {request:{requestId:string;sourceBranchId:string;items:{itemId:string;revision:number}[]}}).request;
 const receipt=f.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,expectedRevision:0,quantity:1}]});
 const post=(command:typeof receipt)=>f.app.inject({method:'POST',url:`/api/v1/erp/returns/commands/${command.operationId}`,headers:{authorization:`Bearer ${f.source.token}`},payload:command});
 const received=await post(receipt);expect(received.statusCode,received.body).toBe(200);expect((await post(receipt)).json()).toEqual(received.json());
 const disposed=await post(f.source.command('return.recordDisposition',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,expectedRevision:1,quantity:1}],disposition:'lost'}));expect(disposed.statusCode,disposed.body).toBe(200);
 const report=await new Reporting(db.pool).workday(f.principal,f.round.workdayId);expect(report.pieces).toEqual({dispatched:3,delivered:0,held:1,returnRequired:1,received:1,lost:1,damaged:0});expect(report.attempts[0]!.returns).toHaveLength(2);expect(report.collections[0]!.reportedMinor).toBe('0');
});
test('A: a concurrent accepted outcome cannot tear a repeatable-read report; next snapshot sees its committed amount',async()=>{
 const f=await company([{}]),held=deferred<void>(),release=deferred<void>();
 const read=new Reporting(db.pool,async()=>{held.resolve();await release.promise;}).workday(f.principal,f.round.workdayId);
 try{await held.promise;expect((await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordFull',{reportedCollection:money(35000)}))).receipt.businessStatus).toBe('accepted');}finally{release.resolve();}
 expect((await read).collections).toEqual([]);expect((await new Reporting(db.pool).workday(f.principal,f.round.workdayId)).collections[0]!.reportedMinor).toBe('35000');
});
test('A: HTTP report validates filters, lists only authorized days and does not accept pending client money',async()=>{
 const f=await startedFixture(db.pool,1),app=Fastify({ajv:{customOptions:{removeAdditional:false}}});closers.push(()=>app.close());
 const config={origin:'http://localhost',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{}} as AuthConfig;
 await app.register(s=>reportingRoutes(s,db.pool,config,(_r,_k,work)=>work(principals.personal)));
 const list=await app.inject({url:'/api/v1/reports/workdays?kind=personal'});expect(list.statusCode,list.body).toBe(200);expect(list.json().items[0].workdayId).toBe(f.round.workdayId);
 const url=`/api/v1/reports/workdays/${f.round.workdayId}?kind=personal`;
 const response=await app.inject({url});expect(response.statusCode,response.body).toBe(200);expect(response.json()).toMatchObject({acceptedOnly:true,pendingLocalActions:'not-known-to-server',collections:[]});
 expect((await app.inject({url:url+'&pendingMinor=35000'})).statusCode).toBe(400);expect((await app.inject({url:url+'&roundId='+randomUUID()})).statusCode).toBe(404);
});
test('A: currency-safe accumulator never adds unlike currencies (labelled forward-compatible arithmetic fixture)',async()=>{
 const f=await company([{}]);await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordFull',{reportedCollection:money(35000)}));
 const report=await new Reporting(db.pool).workday(f.principal,f.round.workdayId),usd=structuredClone(report.attempts[0]!);
 const fixture=usd as unknown as {outcome:{collection:Record<string,{currency?:string}>}};for(const m of Object.values(fixture.outcome.collection))if(typeof m==='object'&&m)m.currency='USD';usd.taskId=randomUUID();usd.attemptId=randomUUID();usd.dispatchCycleId=randomUUID();
 expect(collections([...report.attempts,usd] as Attempt[]).map(c=>[c.currency,c.reportedMinor])).toEqual([['EGP','35000'],['USD','35000']]);
 // The released source contract still accepts only EGP, so this is arithmetic
 // evidence, not a claim that multi-currency intake is currently supported.
 const body={externalId:'foreign',sourceDispatchCycleId:'cycle',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'branch',recipientName:'foreign',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30,longitude:31}},splittingAllowed:false,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'x',description:'x',quantity:1,unitDue:{amountMinor:100,currency:'USD',exponent:2}}],shippingDue:money(0),totalDue:money(100),priority:'ordinary'};
 await expect(f.post('intake.submitSnapshot',body)).rejects.toThrow();
});
test('B: actual worker captures baseline/revisions; delayed receipt never substitutes arrival, and a phone failure has no travel/service',async()=>{
 const f=await reportingFixture(db.pool);closers.push(()=>f.close());const current=new CurrentActivity(db.pool),outcomes=new Outcomes(db.pool);
 const heading=f.make(0,'current.selectHeading');heading.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};expect((await current.command(principals.personal,heading)).receipt.businessStatus).toBe('accepted');
 await runPlanningOnce(db.pool,f.provider.engine);
 const attempt=String(heading.payload.attemptId),arrival=f.make(0,'current.recordArrival',1,attempt);arrival.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};
 await new Promise(resolve=>setTimeout(resolve,60));expect((await current.command(principals.personal,arrival)).receipt.businessStatus).toBe('accepted');
 const full=f.make(0,'outcome.recordFull',2,attempt);full.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};expect((await outcomes.command(principals.personal,full)).receipt.businessStatus).toBe('accepted');
 const phone=f.make(1,'outcome.recordNoAnswer',3);phone.observation={observedAt:new Date().toISOString(),clock:{quality:'uncertain'}};expect((await outcomes.command(principals.personal,phone)).receipt.businessStatus).toBe('accepted');
 const report=await new Reporting(db.pool).workday(principals.personal,f.round.workdayId),timing=report.timing[0]!,stop=timing.stops.find(s=>s.attemptId===attempt)!;
 expect(timing.baseline?.forecastId).toBe(f.plan.forecast.forecastId);expect(timing.baseline?.workloadId).toBe(f.plan.forecast.workloadId);expect(timing.revisions.length).toBeGreaterThan(1);
 expect(stop.arrival.observedAt).toBe(arrival.observation.observedAt);expect(Date.parse(stop.arrival.recordedAt!)-Date.parse(stop.arrival.observedAt!)).toBeGreaterThanOrEqual(60);
 expect(stop.travel.seconds).toBe((Date.parse(arrival.observation.observedAt!)-Date.parse(heading.observation.observedAt!))/1000);expect(stop.service.seconds).toBe((Date.parse(full.observation.observedAt!)-Date.parse(arrival.observation.observedAt!))/1000);
 const stored=f.plan.forecast.members.find(m=>m.attemptId===attempt)!;expect(stop.baseline?.expectedArrivalAt).toBe(stored.expectedArrivalAt);expect(stop.baselineArrivalDifference.seconds).toBe((Date.parse(arrival.observation.observedAt!)-Date.parse(stored.expectedArrivalAt!))/1000);
 const noAnswer=timing.stops.find(s=>s.taskId===f.tasks[1]!.taskId)!;expect(noAnswer.arrival.status).toBe('missing');expect(noAnswer.travel).toEqual({seconds:null,reason:'missing-boundary'});expect(noAnswer.service.seconds).toBeNull();expect(noAnswer.completion.status).toBe('uncertain');expect(noAnswer.latestCompletionDifference.seconds).toBeNull();
 const original=stop.completion,c=command('outcome.correct',{roundId:f.round.roundId,taskId:stop.taskId,attemptId:stop.attemptId,expectedOutcomeRevision:report.attempts.find(i=>i.attemptId===attempt)!.outcome!.revision,replacement:{outcome:'no-answer'}});c.context={...f.start.context};c.observation={observedAt:new Date(Date.now()+3_600_000).toISOString(),clock:{quality:'known'}};
 expect((await new Corrections(db.pool).command(principals.personal,c)).receipt.businessStatus).toBe('accepted');expect((await new Reporting(db.pool).workday(principals.personal,f.round.workdayId)).timing[0]!.stops.find(s=>s.attemptId===attempt)!.completion).toEqual(original);
});
test('B: added workload has no fabricated first forecast, early closure is unfinished and later forecasts do not rewrite resolved stops',async()=>{
 const f=await reportingFixture(db.pool);closers.push(()=>f.close());
 const phone=f.make(0,'outcome.recordNoAnswer');phone.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};await new Outcomes(db.pool).command(principals.personal,phone);
 const before=await new Reporting(db.pool).workday(principals.personal,f.round.workdayId);
 const extra=await intake(db.pool,9);await runPlanningOnce(db.pool,f.provider.engine);
 const changed=await new Reporting(db.pool).workday(principals.personal,f.round.workdayId);expect(changed.counts.shipments).toBe(3);expect(changed.timing[0]!.scopeChanged).toBe(true);expect(changed.timing[0]!.baseline?.customerAttempts).toBe(2);
 const added=changed.timing[0]!.stops.find(s=>s.taskId===extra.taskId)!;expect(added.baseline).toBeNull();expect(added.latest?.workloadId).not.toBe(f.plan.forecast.workloadId);
 expect(changed.timing[0]!.stops.find(s=>s.taskId===f.tasks[0]!.taskId)!.latest).toEqual(before.timing[0]!.stops.find(s=>s.taskId===f.tasks[0]!.taskId)!.latest);
 const end=command('workday.end',{workdayId:f.round.workdayId,roundId:f.round.roundId,expectedActiveRoundId:f.round.roundId,expectedActivityRevision:1,expectedCurrentAttemptId:null,currentAction:'require-none'});end.context={...f.start.context};end.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};
 expect((await new Closures(db.pool).command(principals.personal,end)).receipt.businessStatus).toBe('accepted');const ended=await new Reporting(db.pool).workday(principals.personal,f.round.workdayId);
 expect(ended.timing[0]).toMatchObject({closure:'ended-unfinished',unfinishedAttempts:2,baselineFinishDifference:{seconds:null,reason:'unfinished'}});
 expect((await new Reporting(db.pool).timing(principals.personal,f.round.workdayId,f.round.roundId,{snapshotId:ended.snapshotId})).timing).toEqual(ended.timing[0]);
});
test('B: action-time dates cross midnight and Cairo offset change within one explicit workday; backwards/unknown clocks remain unavailable',async()=>{
 const f=await reportingFixture(db.pool,1);closers.push(()=>f.close());const current=new CurrentActivity(db.pool),heading=f.make(0,'current.selectHeading');
 heading.observation={observedAt:'2026-10-29T20:30:00.000Z',clock:{quality:'known'}};await current.command(principals.personal,heading);
 const arrived=f.make(0,'current.recordArrival',1,String(heading.payload.attemptId));arrived.observation={observedAt:'2026-10-29T22:30:00.000Z',clock:{quality:'known'}};await current.command(principals.personal,arrived);
 const report=await new Reporting(db.pool).workday(principals.personal,f.round.workdayId),stop=report.timing[0]!.stops[0]!;expect(report.workdayId).toBe(f.round.workdayId);expect(stop.travel.seconds).toBe(7200);
 expect(formatWorkdayInstant(stop.heading.observedAt!,'en-GB')).toContain('29/10/2026, 23:30:00 GMT+3');expect(formatWorkdayInstant(stop.arrival.observedAt!,'en-GB')).toContain('30/10/2026, 00:30:00 GMT+2');
 const full=f.make(0,'outcome.recordFull',2,String(heading.payload.attemptId));full.observation={observedAt:'2026-10-29T22:29:00.000Z',clock:{quality:'known'}};await new Outcomes(db.pool).command(principals.personal,full);
 expect((await new Reporting(db.pool).workday(principals.personal,f.round.workdayId)).timing[0]!.stops[0]!.service).toEqual({seconds:null,reason:'clock-order'});
});
test('B: actual branch interruption keeps separate service units and paused scope, without inventing customer arrival',async()=>{
 const f=await company();const grant=structuredClone(f.source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=3;grant.payload.returnCapabilities=['return.receive'];expect((await send(f.app,operatorToken,grant)).statusCode).toBe(200);
 expect((await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch',sourceRevision:2,name:'فرع المصدر',enabled:true,location:{latitude:30.1,longitude:31.3}}))).statusCode).toBe(200);
 await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordNoAnswer'));const returns=new Returns(db.pool),group=(await returns.groups(f.principal)).groups[0]!,item=group.items[0]!;
 const make=(op:string,payload:object)=>{const c=f.planCommand(op,{roundId:f.round.roundId,...payload});delete c.payload.driverId;return c;};
 const offered=await returns.request(f.principal,make('return.requestHandover',{sourceBranchId:group.sourceBranchId,items:[{taskId:item.taskId,dispatchCycleId:item.dispatchCycleId,outcomeId:item.outcomeId,sourceLineId:item.sourceLineId,quantity:3}]}));const request=(offered.response!.body as components['schemas']['ReturnCommandResult']).request;
 const heading=f.make(1,'current.selectHeading',{},1);await new CurrentActivity(db.pool).command(f.principal,heading);
 const branch=new Branches(db.pool),interrupted=await branch.command(f.principal,make('branch.interruptRound',{expectedActivityRevision:2,expectedCurrentAttemptId:String(heading.payload.attemptId),requestId:request.requestId,claims:[{itemId:request.items[0]!.itemId,quantity:1}],serviceEstimateSeconds:300}));expect(interrupted.receipt.businessStatus).toBe('accepted');
 const report=await new Reporting(db.pool).workday(f.principal,f.round.workdayId),round=report.timing[0]!;
 expect(report.counts).toMatchObject({shipments:2,attempts:2,processedAttempts:1});expect(round.interrupted).toBe(true);expect(round.branchVisits).toHaveLength(1);expect(round.branchVisits[0]).toMatchObject({stage:'heading',serviceEstimateSeconds:300,arrival:{status:'missing'},service:{seconds:null}});
 expect(round.latest).toMatchObject({kind:'branch',branchStops:1});expect(round.stops.find(s=>s.taskId===f.tasks[1])!.latest?.membership).toBe('paused');expect(round.stops.find(s=>s.taskId===f.tasks[1])!.arrival.status).toBe('missing');
});
test('B: upgrade preserves real pre-P36 forecast/start data and leaves unavailable historical start observation null',async()=>{
 const old=await createTestDatabase(),root=resolve('.local'),directory=await mkdtemp(join(root,'p36-upgrade-')),url=pathToFileURL(directory+'/'),files=(await readMigrations()).slice(0,26).map(m=>m.name);
 if(dirname(directory)!==root)throw new Error('Refuse cleanup outside task-local directory');
 try{
  for(const file of files)await copyFile(new URL(`../../../../db/migrations/${file}`,import.meta.url),new URL(file,url));await prepareAccessFixture(old.pool,undefined,url);
  const f=await reportingFixture(old.pool,1);try{
   expect(f.start.observation.clock.quality).toBe('known');
   const heading=f.make(0,'current.selectHeading');heading.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};
   expect((await new CurrentActivity(old.pool).command(principals.personal,heading)).receipt.businessStatus).toBe('accepted');
   const arrival=f.make(0,'current.recordArrival',1,String(heading.payload.attemptId));arrival.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};
   expect((await new CurrentActivity(old.pool).command(principals.personal,arrival)).receipt.businessStatus).toBe('accepted');
   const before=(await old.pool.query('SELECT to_jsonb(r) record FROM tawsel.rounds r')).rows;
   expect(await migrate(old.pool)).toEqual(['0027_reporting_provenance.sql','0028_worker_observations.sql']);expect((await old.pool.query('SELECT to_jsonb(r) record FROM tawsel.rounds r')).rows).toEqual(before);
   const report=await new Reporting(old.pool).workday(principals.personal,f.round.workdayId);expect(report.timing[0]!.start).toMatchObject({status:'missing',observedAt:null});expect(report.timing[0]!.baseline?.forecastId).toBe(f.plan.forecast.forecastId);
   const stop=report.timing[0]!.stops[0]!;expect(stop.arrival.status).toBe('available');expect(stop.travel.seconds).not.toBeNull();expect(stop.baseline?.identityMatches).toBe(false);expect(stop.baselineArrivalDifference).toEqual({seconds:null,reason:'identity-unavailable'});
   expect((await old.pool.query('SELECT observation FROM tawsel.command_replay_metadata WHERE action_id=$1',[f.start.actionId])).rows[0].observation).toBeNull();
  }finally{await f.close();}
 }finally{await old.close();for(const file of files)await unlink(join(directory,file));await rmdir(directory);}
},60_000); // This case creates and upgrades a second real retained-schema database.
test('B: new provenance rolls back with a failed command and is immutable after accepted replay',async()=>{
 const f=await reportingFixture(db.pool,1);closers.push(()=>f.close());const c=f.make(0,'outcome.recordFull');c.observation={observedAt:new Date().toISOString(),clock:{quality:'known',estimatedOffsetMilliseconds:1234}};
 await expect(new Outcomes(db.pool,{async afterWrite(stage){if(stage==='result')throw new Error('injected after provenance write');}}).command(principals.personal,c)).rejects.toThrow('injected after provenance');
 expect((await db.pool.query('SELECT * FROM tawsel.command_replay_metadata WHERE action_id=$1',[c.actionId])).rowCount).toBe(0);expect((await new Reporting(db.pool).workday(principals.personal,f.round.workdayId)).counts.processedAttempts).toBe(0);
 expect((await new Outcomes(db.pool).command(principals.personal,c)).receipt.businessStatus).toBe('accepted');
 const row=(await db.pool.query('SELECT observation,expected_versions FROM tawsel.command_replay_metadata WHERE action_id=$1',[c.actionId])).rows[0];expect(row.observation).toEqual(c.observation);expect(row.expected_versions).toMatchObject({expectedSourceRevision:c.payload.expectedSourceRevision,expectedPinRevision:c.payload.expectedPinRevision});
 await expect(db.pool.query('UPDATE tawsel.command_replay_metadata SET observation=NULL WHERE action_id=$1',[c.actionId])).rejects.toMatchObject({code:'23514'});
 expect((await new Reporting(db.pool).workday(principals.personal,f.round.workdayId)).timing[0]!.stops[0]!.completion.status).toBe('uncertain');
});

