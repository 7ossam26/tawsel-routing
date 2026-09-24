import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,test} from 'vitest';
import {Pool} from 'pg';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture,principals} from '../support/access-fixture.js';
import {startedFixture} from '../support/current-fixture.js';
import {command} from '../support/planning-fixture.js';
import {deferred,observeDatabaseBlock} from '../support/barriers.js';
import {Devices} from '../../src/devices/service.js';
import type {CommandHooks} from '../../src/commands/kernel.js';
import {Rounds} from '../../src/rounds/service.js';
import {CurrentActivity} from '../../src/current/service.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {Eligibility} from '../../src/eligibility/service.js';
import {Closures} from '../../src/closure/service.js';
import {Locations} from '../../src/locations/service.js';
import {PlanningService} from '../../src/planning/service.js';
import type {ActionEnvelope} from '../../src/commands/kernel.js';
import {deviceConforms} from '../../src/devices/models.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {ids} from '../support/access-fixture.js';
import {compactCommandResponses} from '../../src/commands/retention.js';
import {deviceDemo} from '../support/device-demo.js';
import {assertDeviceDemo} from '../../../../tests/erp-conformance/devices.js';
import {mkdir,copyFile,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {migrate} from '../../src/db/migrate.js';

let db:Awaited<ReturnType<typeof createTestDatabase>>;
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{await db?.close();});
function take(f:Awaited<ReturnType<typeof startedFixture>>,deviceId=randomUUID(),expectedGeneration=f.round.owner.generation){
 if(f.start.context.kind!=='device')throw new Error('device');
 const c=command('device.takeOver',{roundId:f.round.roundId,expectedGeneration});c.context={...f.start.context,deviceId};return c;
}
for(const duplicate of [true,false])test(`A: independent takeover connections serialize ${duplicate?'same action':'competing devices'} and recover lost response`,async()=>{
 const f=await startedFixture(db.pool,1),a=new Pool({...db.config,max:1}),b=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();
 let first:Promise<unknown>|undefined,second:Promise<unknown>|undefined;
 try{
  const c=take(f),other=duplicate?c:take(f),hooks:Pick<CommandHooks,'afterWrite'>={async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid);await release.promise;}}};
  first=new Devices(a,hooks).takeover(principals.personal,c);const holder=await held.promise,waiter=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  second=new Devices(b).takeover(principals.personal,other);await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();
  const [one,two]=await Promise.all([first,second]) as Awaited<ReturnType<Devices['takeover']>>[];
  expect(one!.receipt.businessStatus).toBe('accepted');if(duplicate)expect(two).toEqual(one);else expect(two!.receipt.problem?.code).toBe('stale_revision');
  expect(await new Devices(db.pool).takeover(principals.personal,c)).toEqual(one);
  expect((await new Rounds(db.pool).current(principals.personal)).round).toMatchObject({roundId:f.round.roundId,owner:{deviceId:c.context.kind==='device'?c.context.deviceId:'',generation:2}});
  expect((await db.pool.query('SELECT 1 FROM tawsel.device_takeovers')).rowCount).toBe(1);
  expect((await db.pool.query("SELECT 1 FROM tawsel.outbox_intents WHERE event_type='device.executionTransferred'")).rowCount).toBe(1);
  expect((await db.pool.query('SELECT 1 FROM tawsel.rounds')).rowCount).toBe(1);
  await expect(new Devices(db.pool).takeover(principals.personal,{...c,payload:{...c.payload,expectedGeneration:2}})).rejects.toMatchObject({code:'idempotency_conflict'});
 }finally{release.resolve();await Promise.allSettled([first,second]);await a.end();await b.end();}
});
test('A: another account and forged account context cannot transfer the same driver; failures roll back ownership',async()=>{
 const f=await startedFixture(db.pool,1),c=take(f),devices=new Devices(db.pool);
 await expect(devices.takeover(principals.driver,c)).rejects.toMatchObject({statusCode:403});
 const forged=structuredClone(c);if(forged.context.kind==='device')forged.context.accountId=randomUUID();
 await expect(devices.takeover(principals.personal,forged)).rejects.toMatchObject({statusCode:403});
 for(const fault of ['domain','progress','audit','outbox','result']){
  await expect(new Devices(db.pool,{async afterWrite(stage){if(stage===fault)throw new Error(fault);}}).takeover(principals.personal,c)).rejects.toThrow(fault);
  expect((await db.pool.query('SELECT 1 FROM tawsel.device_takeovers')).rowCount).toBe(0);
  expect((await new Rounds(db.pool).current(principals.personal)).round?.owner).toEqual(f.round.owner);
 }
 await expect(db.pool.query('UPDATE tawsel.rounds SET device_generation=2,owner_device_id=$1',[randomUUID()])).rejects.toMatchObject({code:'23514'});
});

async function transfer(f:Awaited<ReturnType<typeof startedFixture>>){
 const d=new Devices(db.pool),c=take(f);expect((await d.takeover(principals.personal,c)).receipt.businessStatus).toBe('accepted');
 if(c.context.kind!=='device')throw new Error('device');
 const snapshot=await d.snapshot(principals.personal,f.round.roundId,c.context.deviceId);expect(snapshot.snapshotToken).toBeTruthy();
 return {...c.context,deviceGeneration:snapshot.context.owner.generation,snapshotToken:snapshot.snapshotToken!};
}
function close(f:Awaited<ReturnType<typeof startedFixture>>,op='workday.end'){
 const c=command(op,{workdayId:f.round.workdayId,roundId:f.round.roundId,expectedActiveRoundId:f.round.roundId,expectedActivityRevision:0,expectedCurrentAttemptId:null,currentAction:'require-none'});c.context={...f.start.context};return c;
}
test('B: mandatory snapshot, former arrival/outcome never overwrite accepted new-owner state; exact evidence survives restart',async()=>{
 const f=await startedFixture(db.pool,2),devices=new Devices(db.pool),current=new CurrentActivity(db.pool),outcomes=new Outcomes(db.pool);
 const c=take(f);if(c.context.kind!=='device')throw new Error('device');
 expect(await devices.context(principals.personal,f.round.roundId,c.context.deviceId)).toMatchObject({mode:'view-only',mayTakeover:true});
 const oldHeading=f.make();await current.command(principals.personal,oldHeading);
 const attempt=String(oldHeading.payload.attemptId),oldArrival=f.make(0,1,attempt,'current.recordArrival'),oldOutcome=f.make(0,2,attempt,'outcome.recordNoAnswer');
 oldOutcome.observation={observedAt:'2020-01-01T00:00:00Z',clock:{quality:'unknown'}};
 const moved=await devices.takeover(principals.personal,c);expect(moved.response!.body).not.toHaveProperty('snapshotToken');
 const newArrival=structuredClone(oldArrival);newArrival.actionId=randomUUID();newArrival.context={...c.context,deviceGeneration:2};
 expect((await current.command(principals.personal,newArrival)).receipt.problem?.code).toBe('sync_required');
 const download=await devices.snapshot(principals.personal,f.round.roundId,c.context.deviceId);expect(deviceConforms('Snapshot',download)).toBe(true);
 expect(download.current?.currentActivity?.stage).toBe('heading');expect(download.current?.owner.generation).toBe(2);
 newArrival.actionId=randomUUID();newArrival.context.snapshotToken=download.snapshotToken!;
 expect((await current.command(principals.personal,newArrival)).receipt.businessStatus).toBe('accepted');
 const newOutcome={...oldOutcome,actionId:randomUUID(),context:newArrival.context};expect((await outcomes.command(principals.personal,newOutcome)).receipt.businessStatus).toBe('accepted');
 const before=await outcomes.read(principals.personal,f.round.roundId);
 for(const stale of [oldArrival,oldOutcome]){
  const result=await (stale.operationId==='current.recordArrival'?current:outcomes).command(principals.personal,stale);
  expect(result.receipt).toMatchObject({evidenceStatus:'received',businessStatus:'review-required',problem:{code:'stale_device'}});expect(result.receipt).not.toHaveProperty('committedAt');
  expect((await db.pool.query('SELECT envelope FROM tawsel.command_evidence WHERE action_id=$1',[stale.actionId])).rows[0].envelope).toEqual(stale);
  expect(await new Devices(db.pool).receive(principals.personal,stale)).toEqual({submissionStatus:'duplicate',result});
  expect(await new Devices(db.pool).result(principals.personal,stale.actionId)).toMatchObject({status:'review-required',result});
 }
 expect(await outcomes.read(principals.personal,f.round.roundId)).toEqual(before);
 expect((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes')).rowCount).toBe(1);
 expect((await current.read(principals.personal,f.round.roundId)).currentActivity).toBeNull();
 const again=take(f);again.payload.expectedGeneration=2;await devices.takeover(principals.personal,again);
 expect(await devices.takeover(principals.personal,c)).toEqual(moved);expect((await new Rounds(db.pool).current(principals.personal)).round?.owner.generation).toBe(3);
});
test('B: every existing execution operation, active planning and pins preserve old-generation evidence',async()=>{
 const f=await startedFixture(db.pool,1);await transfer(f);
 const calls:{c:ActionEnvelope;run:(c:ActionEnvelope)=>Promise<{receipt:{businessStatus:string;problem?:{code:string}}}>}[]=[];
 for(const op of ['current.selectHeading','current.recordArrival','current.correctOrigin']){
  const c=f.make(0,0,null,op);if(op==='current.correctOrigin')c.payload={roundId:f.round.roundId,expectedOriginRevision:0,coordinates:{latitude:30.05,longitude:31.24}};
  if(op==='current.recordArrival')c.payload.expectedCurrentAttemptId=c.payload.attemptId;
  calls.push({c,run:c=>new CurrentActivity(db.pool).command(principals.personal,c)});
 }
 const outcome=f.make(0,0,null,'outcome.recordNoAnswer');calls.push({c:outcome,run:c=>new Outcomes(db.pool).command(principals.personal,c)});
 for(const op of ['task.retryWhole','task.deferWhole','task.activateDeferred','task.setDriverUrgency']){
  const c=f.make(0,0,null,op);c.payload.expectedEligibilityRevision=0;if(op==='task.deferWhole')c.payload.earliestAt='2030-01-01T00:00:00Z';if(op==='task.setDriverUrgency')c.payload.urgency='urgent';
  calls.push({c,run:c=>new Eligibility(db.pool).command(principals.personal,c)});
 }
 for(const op of ['round.end','workday.end'])calls.push({c:close(f,op),run:c=>new Closures(db.pool).command(principals.personal,c)});
 const state=await f.planning.plans(principals.personal,f.round.driverId);
 for(const op of ['planning.requestReplan','planning.requestPreview','planning.setManualOrder','planning.saveDraft']){
  const c=command(op,{driverId:f.round.driverId,expectedSettingsRevision:state.settingsRevision});c.context={...f.start.context};
  if(op==='planning.setManualOrder')Object.assign(c.payload,{expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:f.tasks.map(t=>t.taskId)}});
  if(op==='planning.saveDraft')c.payload.settings=f.plan.input.settings;
  calls.push({c,run:c=>new PlanningService(db.pool).command(principals.personal,c)});
 }
 const location=command('location.confirmPin',{taskId:f.tasks[0]!.taskId,expectedSourceRevision:1,expectedLocationRevision:1,selection:{kind:'manual',coordinates:{latitude:30.06,longitude:31.25}},confirmed:true});location.context={...f.start.context};location.resources={taskId:f.tasks[0]!.taskId};
 calls.push({c:location,run:c=>new Locations(db.pool).confirm(principals.personal,c)});
 const before=(await db.pool.query('SELECT to_jsonb(p) p FROM tawsel.planning_states p')).rows;
 for(const {c,run} of calls){const result=await run(c);expect(result.receipt,c.operationId).toMatchObject({businessStatus:'review-required',problem:{code:'stale_device'}});expect((await db.pool.query('SELECT envelope FROM tawsel.command_evidence WHERE action_id=$1',[c.actionId])).rows[0].envelope).toEqual(c);}
 expect((await db.pool.query('SELECT to_jsonb(p) p FROM tawsel.planning_states p')).rows).toEqual(before);
 expect((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes UNION ALL SELECT 1 FROM tawsel.closure_records UNION ALL SELECT 1 FROM tawsel.task_eligibility_history UNION ALL SELECT 1 FROM tawsel.current_activity_history')).rowCount).toBe(0);
});
test('B: evidence-only first receipt is durable, duplicate is distinct and failures cannot falsely acknowledge it',async()=>{
 const f=await startedFixture(db.pool,1);await transfer(f);const c=f.make(0,0,null,'outcome.recordNoAnswer');
 for(const fault of ['evidence','audit','outbox','result']){
  await expect(new Devices(db.pool,{async afterWrite(stage){if(stage===fault)throw new Error(fault);}}).receive(principals.personal,c)).rejects.toThrow(fault);
  expect((await new Devices(db.pool).result(principals.personal,c.actionId)).status).toBe('pending');
  expect((await db.pool.query('SELECT 1 FROM tawsel.command_evidence WHERE action_id=$1',[c.actionId])).rowCount).toBe(0);
  expect((await db.pool.query('SELECT 1 FROM tawsel.outbox_intents WHERE action_id=$1',[c.actionId])).rowCount).toBe(0);
 }
 const devices=new Devices(db.pool),first=await devices.receive(principals.personal,c);expect(first.submissionStatus).toBe('received');expect(first.result.receipt.businessStatus).toBe('review-required');
 expect(await devices.receive(principals.personal,c)).toEqual({...first,submissionStatus:'duplicate'});
 const events=(await db.pool.query('SELECT event_type,recipient_id,payload FROM tawsel.outbox_intents WHERE action_id=$1',[c.actionId])).rows;
 expect(events).toEqual([{event_type:'evidence.received',recipient_id:ids.personalAccount,payload:{actionId:c.actionId,roundId:f.round.roundId,driverId:f.round.driverId,businessStatus:'review-required',code:'stale_device'}}]);expect(deviceConforms('EvidenceEvent',events[0].payload)).toBe(true);
 expect((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes')).rowCount).toBe(0);
 await expect(devices.receive(principals.personal,{...c,observation:{...c.observation,observedAt:'2021-01-01T00:00:00Z'}})).rejects.toMatchObject({code:'idempotency_conflict'});
});
test('B: all outcome endpoint variants retain evidence with only submitting-account notification intent',async()=>{
 const f=await outcomeCompanyFixture(db,[{}]);try{
  const c=f.planCommand('device.takeOver',{roundId:f.round.roundId,expectedGeneration:1});delete c.payload.driverId;if(c.context.kind!=='device')throw new Error('device');c.context.deviceId=randomUUID();
  const devices=new Devices(db.pool);await devices.takeover(f.principal,c);
  for(const [op,extra] of [['outcome.recordFull',{}],['outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:1}],reportedCollection:{amountMinor:15000,currency:'EGP',exponent:2}}],['outcome.recordRefusal',{shippingPayment:'refused'}],['outcome.recordNoAnswer',{}]] as const){
   const old=f.make(0,op,extra),result=await new Outcomes(db.pool).command(f.principal,old);expect(result.receipt.businessStatus).toBe('review-required');
   const rows=(await db.pool.query('SELECT recipient_id,event_type FROM tawsel.outbox_intents WHERE action_id=$1',[old.actionId])).rows;expect(rows).toEqual([{recipient_id:f.accountId,event_type:'evidence.received'}]);
  }
  const events=(await db.pool.query("SELECT recipient_id,payload FROM tawsel.outbox_intents WHERE event_type='device.executionTransferred'")).rows;expect(events).toHaveLength(1);expect(events[0].recipient_id).toBe(f.accountId);expect(deviceConforms('TransferEvent',events[0].payload)).toBe(true);
  const invalidNotification=`INSERT INTO tawsel.outbox_intents (tenant_id,event_id,source_id,action_id,recipient_id,recipient_kind,event_type,payload_version,payload)
   VALUES ($1,$2,$3,$4,$5,'account',$6,'1.0.0','{}')`;
  await expect(db.pool.query(invalidNotification,[f.tenantId,randomUUID(),f.accountId,c.actionId,randomUUID(),'evidence.received'])).rejects.toMatchObject({code:'23514'});
  await expect(db.pool.query(invalidNotification,[f.tenantId,randomUUID(),f.accountId,c.actionId,f.accountId,'outcome.recorded'])).rejects.toMatchObject({code:'23514'});
  expect((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes')).rowCount).toBe(0);
 }finally{await f.close();}
});

test('C: closed day is a hard recovery constraint, evidence remains durable and current account scoped',async()=>{
 const f=await startedFixture(db.pool,1),device=await transfer(f),devices=new Devices(db.pool),c=f.make(0,0,null,'outcome.recordNoAnswer');
 const receipt=await devices.receive(principals.personal,c),before=await devices.evidence(principals.personal,c.actionId,device.deviceId);
 expect(before).toMatchObject({durableReceipt:true,envelope:c,recovery:{adoptionImplemented:true,state:'requires-validation',constraints:[]}});
 expect((await devices.evidence(principals.personal,c.actionId,f.round.owner.deviceId)).recovery.constraints).toContain('not-current-owner');
 const end=close(f);end.context=device;expect((await new Closures(db.pool).command(principals.personal,end)).receipt.businessStatus).toBe('accepted');
 const blocked=await devices.evidence(principals.personal,c.actionId,device.deviceId);expect(blocked.recovery.constraints).toContain('closed-workday');expect(blocked.result).toEqual(receipt.result);expect(blocked.envelope).toEqual(c);
 const reTake=take(f);reTake.payload.expectedGeneration=2;reTake.observation.observedAt='2020-01-01T00:00:00Z';expect((await devices.takeover(principals.personal,reTake)).receipt.problem?.code).toBe('lifecycle_forbidden');
 expect((await new Rounds(db.pool).current(principals.personal)).workday).toBeNull();
 expect((await db.pool.query('SELECT 1 FROM tawsel.delivery_outcomes')).rowCount).toBe(0);
 expect((await devices.result(principals.driver,c.actionId)).status).toBe('pending');
 await expect(devices.evidence(principals.driver,c.actionId,device.deviceId)).rejects.toMatchObject({statusCode:404});
 await db.pool.query("UPDATE tawsel.command_identities SET finalized_at=clock_timestamp()-interval '45 days' WHERE action_id=$1",[c.actionId]);
 await compactCommandResponses(db.pool);expect((await devices.evidence(principals.personal,c.actionId,device.deviceId)).envelope).toEqual(c);
 await db.pool.query('UPDATE tawsel.accounts SET enabled=false WHERE tenant_id=$1 AND account_id=$2',[ids.personalTenant,ids.personalAccount]);
 await expect(devices.evidence(principals.personal,c.actionId,device.deviceId)).rejects.toMatchObject({statusCode:403});
});
test('C: future receipt/redispatch dependency blocks recovery without changing evidence; hidden branch/resource cannot leak',async()=>{
 const f=await outcomeCompanyFixture(db,[{}]);try{
  const old=f.make(0,'outcome.recordNoAnswer'),c=f.planCommand('device.takeOver',{roundId:f.round.roundId,expectedGeneration:1});delete c.payload.driverId;if(c.context.kind!=='device')throw new Error('device');c.context.deviceId=randomUUID();
  const devices=new Devices(db.pool);expect((await devices.takeover(f.principal,c)).receipt.businessStatus).toBe('accepted');
  const received=await devices.receive(f.principal,old),cycle=f.plan.input.members[0]!.dispatchCycleId;
  // Explicit P21 producer fixture: no physical receipt API exists in P20.
  await db.pool.query("INSERT INTO tawsel.retry_dependencies (tenant_id,dispatch_cycle_id,dependency_id,reason) VALUES ($1,$2,$3,'branch-received')",[f.tenantId,cycle,randomUUID()]);
  const read=await devices.evidence(f.principal,old.actionId,c.context.deviceId);expect(read.recovery.constraints).toContain('dependent-receipt');expect(read.result).toEqual(received.result);expect(read.envelope).toEqual(old);
  const forged={...old,actionId:randomUUID(),payload:{...old.payload,taskId:randomUUID()}};await expect(devices.receive(f.principal,forged)).rejects.toMatchObject({statusCode:404});
  await db.pool.query('DELETE FROM tawsel.membership_branches WHERE tenant_id=$1 AND account_id=$2',[f.tenantId,f.accountId]);
  await expect(devices.evidence(f.principal,old.actionId,c.context.deviceId)).rejects.toMatchObject({statusCode:404});
  expect((await db.pool.query('SELECT envelope FROM tawsel.command_evidence WHERE action_id=$1',[old.actionId])).rows[0].envelope).toEqual(old);
 }finally{await f.close();}
});
for(const operation of ['outcome','closure'])for(const takeoverFirst of [true,false])test(`C: independent ${operation}/takeover commits preserve authority (${takeoverFirst?'takeover':'execution'} first)`,async()=>{
 const f=await startedFixture(db.pool,1),c=take(f),execute=operation==='outcome'?f.make(0,0,null,'outcome.recordNoAnswer'):close(f),a=new Pool({...db.config,max:1}),b=new Pool({...db.config,max:1}),held=deferred<number>(),release=deferred();
 let first:Promise<unknown>|undefined,second:Promise<unknown>|undefined;
 const run=(pool:Pool,hooks?:Pick<CommandHooks,'afterWrite'>)=>operation==='outcome'?new Outcomes(pool,hooks).command(principals.personal,execute):new Closures(pool,hooks).command(principals.personal,execute);
 try{
  const hooks:Pick<CommandHooks,'afterWrite'>={async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() pid')).rows[0].pid);await release.promise;}}};
  first=takeoverFirst?new Devices(a,hooks).takeover(principals.personal,c):run(a,hooks);const holder=await held.promise,waiter=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  second=takeoverFirst?run(b):new Devices(b).takeover(principals.personal,c);await observeDatabaseBlock(db.pool,waiter,holder);release.resolve();const [one,two]=await Promise.all([first,second]) as Awaited<ReturnType<Devices['takeover']>>[];
  expect(one!.receipt.businessStatus).toBe('accepted');expect(two!.receipt.businessStatus).toBe(takeoverFirst?'review-required':operation==='closure'?'rejected':'accepted');
  if(takeoverFirst)expect(two!.receipt.problem?.code).toBe('stale_device');
  expect((await db.pool.query(`SELECT 1 FROM tawsel.${operation==='outcome'?'delivery_outcomes':'closure_records'}`)).rowCount).toBe(takeoverFirst?0:1);
  if(operation==='closure'&&!takeoverFirst)expect((await db.pool.query('SELECT 1 FROM tawsel.device_takeovers')).rowCount).toBe(0);
 }finally{release.resolve();await Promise.allSettled([first,second]);await a.end();await b.end();}
});
test('C: real two-session HTTP/client lost-response/restart demonstration',async()=>{assertDeviceDemo(await deviceDemo());},30_000);
test('C: retained nonadmitted IDs cannot probe effective outcomes or private resource revisions',async()=>{
 const f=await startedFixture(db.pool,2),device=await transfer(f),devices=new Devices(db.pool),outcomes=new Outcomes(db.pool);
 const valid=f.make(0,0,null,'outcome.recordNoAnswer');valid.context=device;await outcomes.command(principals.personal,valid);
 const spoofed=f.make(0,0,null,'outcome.recordNoAnswer');spoofed.payload.taskId=f.tasks[1]!.taskId;
 const unknown={...spoofed,actionId:randomUUID(),payload:{...spoofed.payload,taskId:randomUUID(),attemptId:randomUUID()}};
 for(const c of [spoofed,unknown])expect((await outcomes.command(principals.personal,c)).receipt.businessStatus).toBe('review-required');
 const a=await devices.evidence(principals.personal,spoofed.actionId,device.deviceId),b=await devices.evidence(principals.personal,unknown.actionId,device.deviceId);
 expect(a.recovery).toEqual(b.recovery);expect(a.recovery.effectiveOutcomeRevision).toBe(0);expect(a.recovery.constraints).toEqual(['unsupported-operation']);
 expect(a.envelope).toEqual(spoofed);
});
async function cleanupMigrationDirectory(directory:URL){
 const target=resolve(fileURLToPath(directory)),root=resolve(fileURLToPath(new URL('../../../../.local/',import.meta.url)));
 if(!target.startsWith(root+sep)||!target.split(sep).at(-1)?.startsWith('p20-upgrade-'))throw new Error('Unsafe fixture cleanup target');await rm(target,{recursive:true,force:true});
}
test('C: additive migration preserves an actual P19 started round and enables takeover',async()=>{
 const old=await createTestDatabase(),directory=new URL(`../../../../.local/p20-upgrade-${randomUUID()}/`,import.meta.url),source=new URL('../../../../db/migrations/',import.meta.url);
 try{
  await mkdir(directory,{recursive:true});for(const name of (await readdir(source)).filter(n=>n.endsWith('.sql')&&n<'0017'))await copyFile(new URL(name,source),new URL(name,directory));
  await prepareAccessFixture(old.pool,undefined,directory);const f=await startedFixture(old.pool,1),before=(await old.pool.query('SELECT to_jsonb(r) r FROM tawsel.rounds r')).rows;
  expect(await migrate(old.pool)).toEqual(['0017_device_takeover.sql','0018_account_evidence_notifications.sql','0019_source_returns.sql','0020_branch_activity.sql','0021_dispatch_cycles.sql','0022_driver_corrections.sql','0023_monitoring_snapshots.sql']);expect((await old.pool.query('SELECT to_jsonb(r) r FROM tawsel.rounds r')).rows).toEqual(before);
  const c=take(f);expect((await new Devices(old.pool).takeover(principals.personal,c)).receipt.businessStatus).toBe('accepted');
  expect((await new Rounds(old.pool).current(principals.personal)).round).toMatchObject({roundId:f.round.roundId,owner:{generation:2},firstForecastId:f.round.firstForecastId});
 }finally{
  await old.close();await cleanupMigrationDirectory(directory);
 }
});
