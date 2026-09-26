import {afterEach,beforeEach,expect,test} from 'vitest';
import Fastify from 'fastify';
import {randomUUID} from 'node:crypto';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture} from '../support/access-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {diagnosticsRoutes,diagnosticStatus} from '../../src/diagnostics/routes.js';
import {instrumentHttp,requestId} from '../../src/diagnostics/telemetry.js';
import {workerObservation} from '../../src/diagnostics/workers.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {RoutingEngine} from '../../src/engine/index.js';
import {engineInput} from '../support/engine-fixtures.js';
import {readFileSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {createDatabasePool} from '../../src/db/pool.js';
import {buildApp} from '../../src/app.js';
import {ReportExportStore,exportStorageStats} from '../../src/reporting/export.js';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {checkDiagnosticsIsolation} from '../../../../tests/erp-conformance/diagnostics.js';
const ajv=new Ajv2020({strict:true});(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
ajv.addSchema(JSON.parse(readFileSync(new URL('../../../../contracts/diagnostics.schema.json',import.meta.url),'utf8')));
function conforms(name:string,value:unknown){expect(ajv.validate(`https://schemas.tawsel.invalid/v1/diagnostics.schema.json#/$defs/${name}`,value),JSON.stringify(ajv.errors)).toBe(true);}

let db:Awaited<ReturnType<typeof createTestDatabase>>;
const clean:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const close of clean.splice(0).reverse())await close();await db.close();});
const token='diagnostics_test_only_0123456789abcdef',headers={authorization:`Bearer ${token}`};
test('operator diagnostics fail closed, reject selectors, omit payloads and expose real DB/queue/worker state',async()=>{
  const f=await outcomeCompanyFixture(db);clean.push(()=>f.close());
  const app=Fastify({ajv:{customOptions:{removeAdditional:false}}});clean.push(()=>app.close());
  await app.register(s=>diagnosticsRoutes(s,db.pool,{token}));
  for(const authorization of [undefined,`Bearer ${f.source.token}`,'Bearer wrong'])expect((await app.inject({url:'/internal/diagnostics/health',headers:authorization?{authorization}:{}})).statusCode).toBe(401);
  expect((await app.inject({url:'/internal/diagnostics/health?tenantId=all',headers})).statusCode).toBe(400);
  await workerObservation(db.pool,'outbox',false,12);
  const r=await app.inject({url:'/internal/diagnostics/health',headers});expect(r.statusCode,r.body).toBe(200);
  conforms('Health',r.json());const metrics=await app.inject({url:'/internal/diagnostics/metrics',headers});conforms('Metrics',metrics.json());
  expect(r.headers['cache-control']).toBe('no-store');expect(r.json().database.state).toBe('ready');expect(r.json().sender.pending).toBeGreaterThan(0);
  expect(r.json().workers.find((w:{worker:string})=>w.worker==='outbox').state).toBe('recent-loop');
  await db.pool.query("UPDATE tawsel.worker_observations SET observed_at=clock_timestamp()-interval '3 minutes'");
  expect((await diagnosticStatus(db.pool)).workers?.find(w=>w.worker==='outbox')?.state).toBe('stale');
  expect(r.body).not.toContain('recipientPhone');expect(r.body).not.toContain(f.source.token);
  const cmd=f.make(0,'outcome.recordNoAnswer');expect((await new Outcomes(db.pool).command(f.principal,cmd)).receipt.businessStatus).toBe('accepted');
  const url=`/internal/diagnostics/actions/${cmd.actionId}?tenantId=${f.tenantId}&sourceId=${f.accountId}`;
  const trace=await app.inject({url,headers});expect(trace.statusCode,trace.body).toBe(200);expect(trace.json().events.length).toBeGreaterThan(0);expect(trace.body).not.toContain('recipientName');
  conforms('Trace',trace.json());
  expect((await app.inject({url:url.replace(f.tenantId,randomUUID()),headers})).statusCode).toBe(404);
});
test('unavailable DB and unknown workers never become liveness or Engine failures; disabled surface remains closed',async()=>{
 const pool=createDatabasePool(db.config);await pool.end();const status=await diagnosticStatus(pool);conforms('Health',status);expect(status.database.state).toBe('unavailable');expect(status.workers).toBeNull();
 const app=buildApp();clean.push(()=>app.close());expect((await app.inject('/health')).statusCode).toBe(200);expect((await app.inject({url:'/internal/diagnostics/health',headers})).statusCode).toBe(404);
});
test('independent blocked transaction is observed without exposing lock SQL or tenant payload',async()=>{
 const first=await db.pool.connect(),second=await db.pool.connect();
 try{
  await first.query('BEGIN');await first.query('SELECT pg_advisory_xact_lock(38000,1)');
  const waiting=second.query('SELECT pg_advisory_xact_lock(38000,1)');
  const deadline=Date.now()+3000;let blocked=0;
  while(!blocked&&Date.now()<deadline){const status=await diagnosticStatus(db.pool);if(status.database.state==='ready')blocked=status.database.blocked;}
  expect(blocked).toBeGreaterThan(0);await first.query('COMMIT');await waiting;
 }finally{await first.query('ROLLBACK');first.release();second.release();}
});
test('export gauges show retained bytes and expiry without workbook data',()=>{
 let now=0;const store=new ReportExportStore(()=>now,1000),snapshotId='abc';
 store.put({ownerKey:'SECRET',requestKey:'SECRET',visibilityHash:'SECRET',workdayId:randomUUID(),filters:{},kind:'company',snapshotId,fileName:'SECRET',buffer:Buffer.alloc(32)});
 expect(store.stats()).toMatchObject({ready:1,bytes:32,expired:0});expect(JSON.stringify(exportStorageStats())).not.toContain('SECRET');
 now=1001;expect(store.stats()).toMatchObject({ready:0,bytes:0,expired:1});
});
test('owner CLI and public-only ERP isolation checker use real listening HTTP',async()=>{
 const f=await outcomeCompanyFixture(db);clean.push(()=>f.close());
 const app=Fastify();clean.push(()=>app.close());await app.register(s=>diagnosticsRoutes(s,db.pool,{token}));const baseUrl=await app.listen({host:'127.0.0.1',port:0});
 expect(await checkDiagnosticsIsolation(baseUrl,`Bearer ${f.source.token}`)).toEqual([{path:'/internal/diagnostics/health',status:401},{path:'/internal/diagnostics/metrics',status:401}]);
 const result=await promisify(execFile)(process.execPath,['--import','tsx','scripts/diagnostics.ts','--json'],{env:{...process.env,TAWSEL_DIAGNOSTICS_URL:baseUrl,TAWSEL_DIAGNOSTICS_TOKEN:token},windowsHide:true,timeout:15000});
 expect(JSON.parse(result.stdout).health.database.state).toBe('ready');expect(result.stdout).not.toContain(token);
},30000);
test('structured exception logging excludes arbitrary headers, query, payload and exception contents',async()=>{
  const logs:object[]=[],app=Fastify({genReqId:requestId,requestIdHeader:false});clean.push(()=>app.close());instrumentHttp(app,entry=>logs.push(entry));
  app.post('/explode/:id',async()=>{throw new Error('SECRET RECIPIENT and password');});
  const actionId=randomUUID();
  const r=await app.inject({method:'POST',url:'/explode/private-recipient?secret=PRIVATE',headers:{authorization:'Bearer SECRET',cookie:'SECRET','x-request-id':'SECRET'},payload:{actionId,recipientName:'SECRET',context:{tenantId:'SECRET'}}});
  expect(r.statusCode).toBe(500);expect(logs).toHaveLength(1);expect(logs[0]).toMatchObject({actionId,route:'/explode/:id',status:500,tenantId:null});
  expect(JSON.stringify(logs)).not.toMatch(/SECRET|PRIVATE|private-recipient|password/);expect(r.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
});
test('Engine outage leaves accepted outcome and monitoring history durable',async()=>{
  const f=await outcomeCompanyFixture(db);clean.push(()=>f.close());
  const engine=new RoutingEngine({osrm:{car:'http://127.0.0.1:1',motorcycle:'http://127.0.0.1:2',bicycle:'http://127.0.0.1:3'},vroom:'http://127.0.0.1:4',timeoutMs:100,maxConcurrent:1,maxResponseBytes:1024});
  await expect(engine.optimize(engineInput)).rejects.toMatchObject({code:'unavailable'});
  const cmd=f.make(0,'outcome.recordNoAnswer'),outcomes=new Outcomes(db.pool);
  expect((await outcomes.command(f.principal,cmd)).receipt.businessStatus).toBe('accepted');
  expect((await outcomes.command(f.principal,cmd)).receipt.businessStatus).toBe('accepted');
  expect((await db.pool.query('SELECT count(*)::int n FROM tawsel.command_identities WHERE action_id=$1',[cmd.actionId])).rows[0].n).toBe(1);
  expect((await diagnosticStatus(db.pool)).database.state).toBe('ready');
});
