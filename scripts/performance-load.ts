/** Isolated local benchmark. Identity/setup are fixtures; HTTP, rendering, transactions,
 * signed sender and separate restricted receiver databases are the actual application paths. */
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {cpus,release,platform} from 'node:os';
import Fastify from 'fastify';
import {chromium,type Page} from '@playwright/test';
import {createServer} from 'vite';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {currentRoutes} from '../apps/api/src/current/routes.js';
import {monitoringRoutes} from '../apps/api/src/monitoring/routes.js';
import {mapAssetRoutes} from '../apps/api/src/locations/assets.js';
import {outboxRoutes} from '../apps/api/src/outbox/routes.js';
import {diagnosticsRoutes,diagnosticStatus} from '../apps/api/src/diagnostics/routes.js';
import {instrumentHttp,requestId,metrics} from '../apps/api/src/diagnostics/telemetry.js';
import {observeCommits,type CommitInterval} from '../apps/api/src/diagnostics/commit-clock.js';
import {workerObservation} from '../apps/api/src/diagnostics/workers.js';
import {withAccess} from '../apps/api/src/access/service.js';
import type {PlanningAuthenticator} from '../apps/api/src/planning/routes.js';
import type {AuthConfig} from '../apps/api/src/auth/config.js';
import {OutboxClient} from '@tawsel/api-client/outbox';
import {runOutboxBatch} from '../apps/api/src/outbox/worker.js';
import {runPlanningOnce} from '../apps/api/src/planning/worker.js';
import {RoutingEngine} from '../apps/api/src/engine/index.js';
import {createReceiverDatabase} from './mock-erp-database.js';
import {migrateReceiver} from '../apps/mock-erp/src/database.js';
import {receiverApp} from '../apps/mock-erp/src/app.js';
import type {ReceiverConfig} from '../apps/mock-erp/src/config.js';
import {applyInboxOnce} from '../apps/mock-erp/src/projection.js';
import {reportCheckpoint} from '../apps/mock-erp/src/recovery.js';
import {summarize,type Measurement,type Condition} from './performance-accounting.js';
import {checkDiagnosticsIsolation} from '../tests/erp-conformance/diagnostics.js';

const profiles={smoke:{drivers:5,observers:2,rounds:2,engineJobs:1},baseline:{drivers:5,observers:2,rounds:50,engineJobs:1},ramp:{drivers:10,observers:5,rounds:20,engineJobs:4},stress:{drivers:15,observers:10,rounds:10,engineJobs:8}};
const profile=process.argv[2]??'smoke';if(!(profile in profiles))throw new Error('Select smoke, baseline, ramp or stress');
const settings=profiles[profile as keyof typeof profiles],origin='http://localhost:5188',epoch=()=>performance.timeOrigin+performance.now(),sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function bounded<T>(work:Promise<T>,ms:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work,new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),ms);})]);}finally{clearTimeout(timer);}}
const clean:(()=>Promise<unknown>)[]=[],samples:Measurement[]=[],commits=new Map<string,CommitInterval>(),applied=new Map<string,number>();
const http:{count:number;errors:number;timeouts:number}={count:0,errors:0,timeouts:0};
const log:object[]=[],httpRoutes=new Map<string,number>(),startedAt=new Date().toISOString();
let receiverPaused=false,stopped=false,workerErrorCount=0;
await mkdir('.local/performance',{recursive:true});
try{
 const db=await createTestDatabase();clean.push(()=>db.close());await prepareAccessFixture(db.pool);
 const owned:{database:string;role?:string}[]=[{database:db.config.database}];
 const journal=async()=>writeFile(`.local/performance/${profile}-progress.json`,JSON.stringify({profile,startedAt,settings,owned,samples,finished:false},null,2)+'\n');await journal();
 const fixtures:Awaited<ReturnType<typeof outcomeCompanyFixture>>[]=[];
 for(let n=0;n<settings.drivers;n++){const f=await outcomeCompanyFixture(db,[{},{}],undefined,{issuer:`https://driver-${n}.fixture.invalid`});fixtures.push(f);clean.push(()=>f.close());}
 const receivers:{storage:Awaited<ReturnType<typeof createReceiverDatabase>>;config:ReceiverConfig;url:string}[]=[];
 for(const f of fixtures){
  const storage=await createReceiverDatabase();clean.push(()=>storage.close());
  owned.push({database:new URL(storage.url).pathname.slice(1),role:storage.role});await journal();
  const config={tenantId:f.tenantId,integrationId:f.source.integrationId,keys:[{keyId:'benchmark',secret:randomBytes(32).toString('hex')}],statusToken:randomBytes(32).toString('hex'),host:'127.0.0.1',port:0,testLoopback:true};
  await migrateReceiver(storage.pool,config);const app=receiverApp(storage.pool,config);clean.push(()=>app.close());
  // A paused receiver returns 503, exercising actual sender retry/accounting.
  app.addHook('onRequest',async(_r,reply)=>{if(receiverPaused)return reply.status(503).send({error:'benchmark_receiver_outage'});});
  const url=await app.listen({host:'127.0.0.1',port:0});receivers.push({storage,config,url});
 }
 const sender={encryptionKey:randomBytes(32),keys:receivers.map(r=>({...r.config,...r.config.keys[0]!})),destinations:receivers.map(r=>({...r.config,url:`${r.url}/api/v1/consumer/events`})),testLoopback:true};
 const app=Fastify({genReqId:requestId,requestIdHeader:false,ajv:{customOptions:{removeAdditional:false}}});clean.push(()=>app.close());
 instrumentHttp(app,entry=>{const e=entry as {status:number;route:string};http.count++;if(e.status>=400)http.errors++;const key=`${e.status} ${e.route}`;httpRoutes.set(key,(httpRoutes.get(key)??0)+1);if(log.length<200)log.push(entry);});
 const pick=(cookie:string|undefined)=>{const index=Number(/fixture-driver=(\d+)/.exec(cookie??'')?.[1]??-1);const f=fixtures[index];if(!f)throw new Error('Benchmark fixture identity absent');return f;};
 const auth={origin,encryptionKey:randomBytes(32),sessionSeconds:3600,issuers:{}} as AuthConfig;
 const authenticate:PlanningAuthenticator=(r,_kind,work)=>{
  const f=pick(r.headers.cookie),id=(r.body as {actionId?:string}|undefined)?.actionId;
  return observeCommits(()=>work(f.principal),interval=>{if(id)commits.set(id,interval);});
 };
 await app.register(s=>mapAssetRoutes(s));
 await app.register(s=>currentRoutes(s,db.pool,auth,authenticate));await app.register(s=>monitoringRoutes(s,db.pool,auth,authenticate));
 await app.register(s=>outboxRoutes(s,db.pool,sender));
 const operator=randomBytes(32).toString('hex');await app.register(s=>diagnosticsRoutes(s,db.pool,{token:operator}));
 app.get('/api/session/context',async r=>withAccess(db.pool,pick(r.headers.cookie).principal,a=>Promise.resolve({access:a.context})));
 const api=await app.listen({host:'127.0.0.1',port:0});
 const clients=fixtures.map(f=>new OutboxClient({baseUrl:api,authorization:`Bearer ${f.source.token}`}));
 for(const [i,f] of fixtures.entries()){
  const command=(op:string,payload:object)=>f.source.command(op,payload) as Parameters<OutboxClient['command']>[0];
  await clients[i]!.command(command('integration.configureWebhook',{url:sender.destinations[i]!.url,enabled:true,expectedRevision:0}));
  await clients[i]!.command(command('integration.rotateSigningKey',{keyId:'benchmark',overlapSeconds:300}));
 }
 async function apply(){if(receiverPaused)return;await Promise.all(receivers.map(async r=>{
  for(let i=0;i<100;i++){
   let eventId:string|undefined;
   const worked=await applyInboxOnce(r.storage.pool,{beforeProjectionCommit:async e=>{eventId=e.eventId;},afterProjectionCommit:async()=>{if(eventId)applied.set(eventId,epoch());}});
   if(!worked)break;
  }
 }));}
 async function pump(){const t=performance.now();await runOutboxBatch(db.pool,sender,{},4);await workerObservation(db.pool,'outbox',true,performance.now()-t);await apply();}
 for(let i=0;i<1000;i++){await pump();const q=await db.pool.query("SELECT count(*)::int n FROM tawsel.outbox_deliveries WHERE status<>'received'");if(!q.rows[0].n)break;if(i===999)throw new Error('Seed sender did not drain');}
 // Startup and fixture loading are excluded explicitly, never failed workload samples.
 process.env.VITE_TAWSEL_API_BASE_URL=api;
 const web=await createServer({root:'apps/web',configFile:'apps/web/vite.config.ts',server:{host:'localhost',port:5188,strictPort:true}});clean.push(()=>web.close());await web.listen();
 const browser=await chromium.launch({headless:true});clean.push(()=>browser.close());
 const pages:{page:Page;driver:number;offsetMs:number;uncertaintyMs:number}[]=[];
 for(let n=0;n<settings.observers;n++){
  const context=await browser.newContext({viewport:{width:1280,height:850},reducedMotion:'reduce'});const driver=n%settings.drivers;
  await context.addCookies([{name:'fixture-driver',value:String(driver),url:origin}]);const page=await context.newPage();
  await page.goto(`${origin}/__fixtures/performance?kind=company&driverId=${fixtures[driver]!.driverId}`);await page.waitForSelector('[data-monitoring-revision]:not([data-monitoring-revision="0"])');
  await page.waitForSelector('.maplibregl-canvas');await page.locator('.maplibregl-canvas').evaluate(canvas=>canvas.setAttribute('data-benchmark-canvas','retained'));
  let best={offsetMs:0,uncertaintyMs:Infinity};
  for(let k=0;k<7;k++){const before=epoch(),remote=await page.evaluate(()=>performance.timeOrigin+performance.now()),after=epoch();if((after-before)/2<best.uncertaintyMs)best={offsetMs:(before+after)/2-remote,uncertaintyMs:(after-before)/2+1};}
  pages.push({page,driver,...best});
 }
 const resources:object[]=[],dbClock=[];
 for(let k=0;k<7;k++){const before=epoch(),remote=Number((await db.pool.query('SELECT extract(epoch FROM clock_timestamp())*1000 AS now')).rows[0].now),after=epoch();dbClock.push({offsetMs:(before+after)/2-remote,uncertaintyMs:(after-before)/2+1});}
 const worker=(async()=>{while(!stopped){try{await pump();}catch{workerErrorCount++;}await sleep(50);}})();
 clean.push(async()=>{stopped=true;await worker;});
 const engine=new RoutingEngine();
 const revisions=fixtures.map(()=>0),previous:(string|null)[]=fixtures.map(()=>null);
 async function wave(condition:Condition='healthy',faultMs=0){
  let resumedAt:number|undefined;
  const cdp=condition==='background'?await pages[0]!.page.context().newCDPSession(pages[0]!.page):undefined;
  if(cdp)await cdp.send('Page.setWebLifecycleState',{state:'frozen'});
  if(condition==='receiver-outage')receiverPaused=true;
  const captureAt=epoch();if(condition==='offline-unsent')await sleep(faultMs);
  const actions=await Promise.all(fixtures.map(async(f,i)=>{
   const index=revisions[i]!%2,cmd=f.make(index,'current.selectHeading',{},revisions[i],previous[i]);const before=epoch();
   try{
    const response=await fetch(`${api}/api/v1/current/heading?kind=company`,{method:'POST',headers:{'content-type':'application/json',origin,cookie:`fixture-driver=${i}; __Host-tawsel-browser=benchmark`,'x-csrf-token':'benchmark'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(15000)});
    const result=await response.json() as {receipt?:{businessStatus:string}};
    if(!response.ok||result.receipt?.businessStatus!=='accepted')throw new Error(`http-${response.status}`);
    revisions[i]!++;previous[i]=String(cmd.payload.attemptId);
    const interval=commits.get(cmd.actionId);if(!interval)throw new Error('missing-commit');
    return {cmd,interval,error:null,driver:i};
   }catch(error){if(error instanceof Error&&error.name==='TimeoutError')http.timeouts++;return {cmd,interval:commits.get(cmd.actionId)??{beforeMs:before,afterMs:epoch()},error:error instanceof Error&&error.name==='TimeoutError'?'timeout':'command-failed',driver:i};}
  }));
  if(condition==='receiver-outage'||condition==='background'){
   await sleep(faultMs);resources.push({condition,at:'during-fault',status:await diagnosticStatus(db.pool)});resumedAt=epoch();receiverPaused=false;
   if(cdp){await cdp.send('Page.setWebLifecycleState',{state:'active'});await cdp.detach();}
  }
  const engineRuns=Promise.all(Array.from({length:settings.engineJobs},async()=>{try{const t=performance.now();const worked=await runPlanningOnce(db.pool,engine);await workerObservation(db.pool,'planning',worked,performance.now()-t);}catch{workerErrorCount++;}}));
  await Promise.all([
   ...actions.map(async a=>{
    const m:Measurement={id:a.cmd.actionId,condition,boundary:'erp',startBeforeMs:a.interval.beforeMs,startAfterMs:a.interval.afterMs,endMs:null,clockUncertaintyMs:1,error:a.error,...(resumedAt?{recoveryStartMs:resumedAt}:{}),...(condition==='offline-unsent'?{unsentMs:a.interval.beforeMs-captureAt}:{})};
    if(!a.error){const events=(await db.pool.query<{event_id:string}>('SELECT event_id FROM tawsel.outbox_intents WHERE action_id=$1 AND recipient_kind=\'integration\'',[a.cmd.actionId])).rows;
     const deadline=epoch()+15000;while(events.some(e=>!applied.has(e.event_id))&&epoch()<deadline)await sleep(25);
     if(!events.length)m.error='missing-event';else if(events.every(e=>applied.has(e.event_id)))m.endMs=Math.max(...events.map(e=>applied.get(e.event_id)!));else m.error='timeout';
    }samples.push(m);
   }),
   ...pages.map(async p=>{
    const a=actions[p.driver]!;const m:Measurement={id:`${a.cmd.actionId}:${p.driver}`,condition,boundary:'view',startBeforeMs:a.interval.beforeMs,startAfterMs:a.interval.afterMs,endMs:null,clockUncertaintyMs:p.uncertaintyMs,error:a.error,...(resumedAt?{recoveryStartMs:resumedAt}:{}),...(condition==='offline-unsent'?{unsentMs:a.interval.beforeMs-captureAt}:{})};
    if(!a.error)try{
     await p.page.waitForFunction(taskId=>document.querySelector('[data-current-task]')?.getAttribute('data-current-task')===taskId,String(a.cmd.payload.taskId),{timeout:15000});
     const time=await bounded(p.page.evaluate(()=>new Promise<number>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.timeOrigin+performance.now()))))),5000);
     m.endMs=time+p.offsetMs;
    }catch{m.error='timeout';}samples.push(m);
   }),engineRuns
  ]);
 }
 console.log(`Running ${profile}: ${JSON.stringify(settings)}; fixtures seeded, actual browser/API/receiver paths ready.`);
 const measurementStarted=epoch();
 for(let n=0;n<settings.rounds;n++){await wave();await journal();if(n%10===0){resources.push({condition:'healthy',wave:n,status:await diagnosticStatus(db.pool),metrics:await(await fetch(`${api}/internal/diagnostics/metrics`,{headers:{authorization:`Bearer ${operator}`}})).json()});console.log(`Completed wave ${n+1}/${settings.rounds}`);}}
 const measurementEnded=epoch();
 // Idle polling changes transport refresh while action time/revision remain unchanged.
 const idleBefore=await pages[0]!.page.locator('.monitor-freshness').innerText(),revisionBefore=await pages[0]!.page.locator('main').getAttribute('data-monitoring-revision');await sleep(2200);
 const idleAfter=await pages[0]!.page.locator('.monitor-freshness').innerText(),revisionAfter=await pages[0]!.page.locator('main').getAttribute('data-monitoring-revision');
 console.log('Measuring receiver outage/recovery');await wave('receiver-outage',2500);await journal();
 console.log('Measuring frozen browser/recovery');await wave('background',2500);await journal();
 console.log('Measuring unsent dispatch hold');await wave('offline-unsent',1500);await journal();
 if(profile==='stress'){
  // Explicit injected saturation, separate from natural workload and healthy percentiles.
  const held=[];for(let n=0;n<10;n++)held.push(await db.pool.connect());
  const release=Promise.all(held.map(async client=>{try{await client.query('SELECT pg_sleep(6)');}finally{client.release();}}));
  const saturated=wave('saturation');await sleep(1000);
  resources.push({condition:'saturation',injected:'10 independent checked-out application connections running pg_sleep(6)',pool:{total:db.pool.totalCount,idle:db.pool.idleCount,waiting:db.pool.waitingCount}});
  await release;await saturated;await journal();
 }
 const first=fixtures[0]!,lastAction=samples.findLast(s=>s.boundary==='erp')!;
 const diagnosticsIsolation=await checkDiagnosticsIsolation(api,`Bearer ${first.source.token}`);
 const page=pages[0]!.page;
 const canvasReused=await page.locator('.maplibregl-canvas').getAttribute('data-benchmark-canvas')==='retained';
 await page.locator('.active-route__list button').nth(1).click();
 await page.waitForFunction(()=>document.querySelector('.route-marker--selected')?.textContent==='2');
 const desktopOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(!canvasReused||desktopOverflow)throw new Error('Map reuse or desktop layout invariant failed');
 await page.locator('.active-route__list button').nth(0).focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('.route-marker--selected')?.textContent==='1');
 // Publish current receiver checkpoints using the same authenticated public reporting boundary.
 for(const [i,r] of receivers.entries()){
  const config={...r.config,tawselBaseUrl:api,tawselAuthorization:`Bearer ${fixtures[i]!.source.token}`};
  for(const aggregate of (await r.storage.pool.query('SELECT aggregate_type type,aggregate_id id FROM mock_erp.streams')).rows)await reportCheckpoint(r.storage.pool,config,aggregate);
 }
 const ownActions=new Set((await db.pool.query<{action_id:string}>('SELECT action_id FROM tawsel.command_identities WHERE tenant_id=$1 AND source_id=$2',[first.tenantId,first.accountId])).rows.map(r=>r.action_id));
 const traced=samples.find(s=>s.condition==='receiver-outage'&&s.boundary==='erp'&&ownActions.has(s.id))!;
 const trace=await(await fetch(`${api}/internal/diagnostics/actions/${traced.id}?tenantId=${first.tenantId}&sourceId=${first.accountId}`,{headers:{authorization:`Bearer ${operator}`}})).json();
 await pages[0]!.page.screenshot({path:`.local/performance/${profile}.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});await sleep(300);const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.screenshot({path:`.local/performance/${profile}-mobile.png`,fullPage:true});if(mobileOverflow)throw new Error('Mobile layout overflow');
 if(profile==='smoke'){
  let failNext=true;
  await page.route('**/maps/style.json',async route=>{if(failNext){failNext=false;await route.abort();}else await route.continue();});
  await page.reload();await page.waitForSelector('.active-route__map[hidden]',{state:'attached'});
  await page.waitForSelector('.maplibregl-canvas',{timeout:20000});await page.unroute('**/maps/style.json');
  console.log('Actual map network failure and bounded retry recovery verified.');
 }
 const clockAfter=await Promise.all(pages.map(async p=>{const before=epoch(),remote=await p.page.evaluate(()=>performance.timeOrigin+performance.now()),after=epoch();return {offsetMs:(before+after)/2-remote,uncertaintyMs:(after-before)/2+1,initial:p.offsetMs};}));
 // Enlarge every browser uncertainty by observed end-of-run clock offset change and probe bound.
 const driftBound=Math.max(...clockAfter.map(c=>Math.abs(c.offsetMs-c.initial)+c.uncertaintyMs));for(const s of samples)if(s.boundary==='view')s.clockUncertaintyMs+=driftBound;
 const report={schemaVersion:1,profile,startedAt,finishedAt:new Date().toISOString(),environment:{label:'local Windows development harness; fixture identities, live PostgreSQL/HTTP/Chromium',node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,browser:browser.version(),database:(await db.pool.query('SHOW server_version')).rows[0],targetHost:'unrun',engine:'real configured adapters attempted; inspect persisted errors, no fixture success substituted'},workload:{...settings,seed:'deterministic alternating headings over two seeded tasks per driver; UUID identities randomized',activeViews:pages.length,durationMs:measurementEnded-measurementStarted,committedActions:settings.drivers*settings.rounds,senderConcurrency:4,workerPollMs:50,monitorPollMs:1000},clock:{method:'same-host monotonic epochs; actual Tawsel COMMIT bracket; receiver completion after real projection COMMIT; browser 7-probe min-RTT offset plus end drift bound; no remote NTP claim',databaseProbes:dbClock,browserProbes:pages.map(p=>({offsetMs:p.offsetMs,uncertaintyMs:p.uncertaintyMs})),endProbes:clockAfter,driftBound},ui:{canvasReused,selectedMarker:true,keyboardSelection:true,desktopOverflow,mobileOverflow,fixtureIdentity:true,api:'real'},diagnosticsIsolation,http,httpByRoute:Object.fromEntries(httpRoutes),requestLog:log,deliveryAttempts:(await db.pool.query('SELECT result,count(*)::int count FROM tawsel.outbox_delivery_attempts GROUP BY result')).rows,workerErrorCount,metrics:metrics(),idle:{idleBefore,idleAfter,revisionBefore,revisionAfter},summary:((['healthy','receiver-outage','background','offline-unsent','saturation'] as const).flatMap(c=>(['view','erp'] as const).map(b=>summarize(samples,b,c)))),samples,resources,trace,lastActionId:lastAction.id,finalStatus:await diagnosticStatus(db.pool),limits:['Development Vite; cold loading excluded and recorded separately.','Two observers means two active single-driver views; ERP measures every driver.','Render endpoint is matching React DOM plus two animation frames, a paint opportunity, not physical display latency.','Serial waves wait for all measured paths; workload is bounded closed-loop, not an open-loop arrival capacity claim.','No target-host, live Engine version/dataset, phone, backup restore or universal capacity claim.']};
 await writeFile(`.local/performance/${profile}.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({profile,summary:report.summary,http,workerErrorCount,idle:report.idle},null,2));
}catch(error){await writeFile(`.local/performance/${profile}-failure.json`,JSON.stringify({profile,startedAt,failedAt:new Date().toISOString(),error:error instanceof Error?error.name:'unknown',samples},null,2)+'\n');throw error;}
finally{for(const close of clean.reverse())await close();}
