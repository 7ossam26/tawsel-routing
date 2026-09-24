// P16 isolated demo: fixture authenticated account, real HTTP commands and
// PostgreSQL; controlled planner HTTP only. Never registered by production app.
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture,principals,ids } from '../apps/api/test/support/access-fixture.js';
import { startedFixture } from '../apps/api/test/support/current-fixture.js';
import { command,providerFixture } from '../apps/api/test/support/planning-fixture.js';
import { deferred } from '../apps/api/test/support/barriers.js';
import { buildApp } from '../apps/api/src/app.js';
import { currentRoutes } from '../apps/api/src/current/routes.js';
import { roundRoutes } from '../apps/api/src/rounds/routes.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';
import { CurrentActivity } from '../apps/api/src/current/service.js';
import { deviceRoutes } from '../apps/api/src/devices/routes.js';
import { outcomeRoutes } from '../apps/api/src/outcomes/routes.js';
import type { AuthConfig } from '../apps/api/src/auth/config.js';
const db=await createTestDatabase();await prepareAccessFixture(db.pool);
const f=await startedFixture(db.pool),app=buildApp();
const config:AuthConfig={origin:'http://localhost:5178',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p16',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p16',clientSecret:'fixture'}}};
await app.register(scope=>currentRoutes(scope,db.pool,config,(_r,_kind,work)=>work(principals.personal)));
await app.register(scope=>deviceRoutes(scope,db.pool,config,(_r,_kind,work)=>work(principals.personal)));
await app.register(scope=>outcomeRoutes(scope,db.pool,config,(_r,_kind,work)=>work(principals.personal)));
await app.register(scope=>roundRoutes(scope,db.pool,config,(_r,_kind,work)=>work(principals.personal)));
app.get('/api/session/context',async()=>({kind:'personal',access:{tenantId:ids.personalTenant,sourceId:ids.personalAccount,tenantKind:'personal',principalKind:'account',branchIds:[],driverId:ids.personalDriver,effectiveCapabilities:['execution.own','correction.own']},expiresAt:new Date(Date.now()+3600000).toISOString(),recoveryEmailVerified:true,phoneOwnershipVerified:false,loginIdentifier:'P16 fixture'}));
app.get('/api/session/bootstrap',async(_r,reply)=>reply.header('Set-Cookie','__Host-tawsel-browser=p16-browser; Path=/; Secure; HttpOnly; SameSite=Strict').send({csrfToken:'p16-browser'}));
app.get('/__fixture/setup',async()=>({roundId:f.round.roundId,deviceId:f.round.owner.deviceId,taskIds:f.tasks.map(t=>t.taskId),label:'Fixture identity; real HTTP/PostgreSQL; no live Engine'}));
app.get('/__fixture/state',async()=>({snapshot:await new CurrentActivity(db.pool).read(principals.personal,f.round.roundId),history:(await db.pool.query('SELECT * FROM tawsel.current_activity_history ORDER BY revision')).rows,origins:(await db.pool.query('SELECT * FROM tawsel.physical_origin_history ORDER BY revision')).rows,actions:(await db.pool.query("SELECT action_id,operation_id,business_status FROM tawsel.command_identities WHERE operation_id LIKE 'current.%' ORDER BY received_at")).rows,forecasts:(await db.pool.query('SELECT forecast_id,workload_id FROM tawsel.forecast_revisions ORDER BY time_origin')).rows}));
let release:ReturnType<typeof deferred<void>>|undefined,running:Promise<boolean>|undefined,provider:Awaited<ReturnType<typeof providerFixture>>|undefined;
app.post('/__fixture/delay',async()=>{
 if(running)throw new Error('fixture already running');const entered=deferred();release=deferred();
 const s=await f.planning.plans(principals.personal,ids.personalDriver);await f.planning.command(principals.personal,command('planning.requestReplan',{driverId:ids.personalDriver,expectedSettingsRevision:s.settingsRevision}));
 provider=await providerFixture({async beforeResponse(){entered.resolve();await release!.promise;}});running=runPlanningOnce(db.pool,provider.engine);await entered.promise;return {waiting:true};
});
app.post('/__fixture/release',async()=>{release?.resolve();await running;if(provider){await runPlanningOnce(db.pool,provider.engine);await provider.close();provider=undefined;}running=undefined;return {released:true};});
app.post('/__fixture/cleanup',async()=>{release?.resolve();await running;await provider?.close();await db.close();return {closed:true};});
await app.listen({host:'127.0.0.1',port:3016});
let closing=false;const close=async()=>{if(closing)return;closing=true;release?.resolve();await running;await provider?.close();await app.close();await db.close();process.exit(0);};process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
console.log(`P16 isolated API demo ready. Open http://localhost:5178/rounds/current?kind=personal after starting Vite. Fixture owner device ${f.round.owner.deviceId}; use /__fixture/setup only to seed the demo browser. No real issuer/Engine/device claim.`);
