import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture, ids, principals } from '../support/access-fixture.js';
import { intake, draft, providerFixture, command, settings } from '../support/planning-fixture.js';
import { PlanningService } from '../../src/planning/service.js';
import { IndependentIntakeService } from '../../src/b2c-intake/service.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { planningConforms,type Input } from '../../src/planning/models.js';
import { claimPlanningJob, engineInput, materializeLegacyIntent, persistPlanningResult, runPlanningOnce } from '../../src/planning/worker.js';
import { deferred } from '../support/barriers.js';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { mkdtemp, copyFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readMigrations, migrate } from '../../src/db/migrate.js';
import { withTransaction } from '../../src/db/transaction.js';
import { executeCommandInTransaction, getCommandResult } from '../../src/commands/kernel.js';
import { fingerprint, planningState } from '../../src/planning/queue.js';

test('P14/P15 upgrade retains committed P13-shaped data without promoting historical policy evidence',async()=>{
 const db=await createTestDatabase(),directory=await mkdtemp(join(tmpdir(),'tawsel-p13-upgrade-')),url=pathToFileURL(directory+'/');
 const files=(await readMigrations()).slice(0,9).map(m=>m.name),provider=await providerFixture();
 try{
  for(const name of files)await copyFile(new URL(`../../../../db/migrations/${name}`,import.meta.url),new URL(name,url));
  await prepareAccessFixture(db.pool,undefined,url);
  // A historical schema fixture must not invoke today's API handlers against
  // a pre-P15 database. Seed the actual retained P13 shape under the real kernel.
  const taskId=randomUUID(),legacyCommand=command('task.createIndependent',{});
  await withTransaction(db.pool,tx=>executeCommandInTransaction(tx,{tenantId:ids.personalTenant,sourceId:ids.personalAccount,actorId:ids.personalAccount},legacyCommand,{
   async writeDomain(){
    await tx.query("INSERT INTO tawsel.b2c_tasks (tenant_id,task_id,driver_id,recipient_name,recipient_phone,recipient_phone_normalized) VALUES ($1,$2,$3,'P13 retained','01012345678','+201012345678')",[ids.personalTenant,taskId,ids.personalDriver]);
    await tx.query("INSERT INTO tawsel.task_source_addresses (tenant_id,task_id,kind,latitude,longitude) VALUES ($1,$2,'confirmed-pin',30.05,31.24)",[ids.personalTenant,taskId]);
    await planningState(tx,ids.personalTenant,ids.personalDriver);
    await tx.query('UPDATE tawsel.planning_states SET settings=$3,settings_revision=1,input_revision=1 WHERE tenant_id=$1 AND driver_id=$2',[ids.personalTenant,ids.personalDriver,settings]);
    // Retained P13 fixture is intentionally independent of today's outcome join.
    const attemptId=randomUUID(),jobId=randomUUID();
    await tx.query('INSERT INTO tawsel.planning_attempts (tenant_id,attempt_id,task_id,b2c_task_id) VALUES ($1,$2,$3,$3)',[ids.personalTenant,attemptId,taskId]);
    const input:Input={version:1,tenantId:ids.personalTenant,driverId:ids.personalDriver,accountKind:'personal',inputRevision:1,settingsRevision:1,executionRevision:0,manualRevision:0,currentTarget:null,locationInputRevision:0,settings,
     members:[{taskId,attemptId,dispatchCycleId:null,branchId:null,integrationId:null,sourceRevision:1,assignmentRevision:0,pinRevision:0,coordinates:{latitude:30.05,longitude:31.24},priority:'ordinary',earliestAt:null,departureAt:null,reservationState:null,eligible:true,exclusionReason:null,serviceEstimateSeconds:600}]};
    await tx.query("INSERT INTO tawsel.planning_jobs (tenant_id,driver_id,job_id,source_id,action_id,fingerprint,input,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')",[ids.personalTenant,ids.personalDriver,jobId,ids.personalAccount,legacyCommand.actionId,fingerprint(input),input]);
    await tx.query('UPDATE tawsel.planning_states SET latest_job_id=$3 WHERE tenant_id=$1 AND driver_id=$2',[ids.personalTenant,ids.personalDriver,jobId]);
    return {status:'accepted',response:{status:200,body:{taskId}},summary:{taskId},audit:{historicalSchemaFixture:true},resourceVersions:{},intents:[]};
   },async writeProgress(){}
  }));
  const claim=(await claimPlanningJob(db.pool))!,candidate=await provider.engine.optimize(engineInput(claim));
  const planId=randomUUID(),forecastId=randomUUID(),workloadId=randomUUID(),member=claim.input.members[0]!;
  // Exact P13 storage shape, committed before either P14 migration exists.
  await withTransaction(db.pool,async tx=>{
   await tx.query('INSERT INTO tawsel.plan_revisions (tenant_id,driver_id,plan_id,job_id,revision,fingerprint,candidate) VALUES ($1,$2,$3,$4,1,$5,$6)',[claim.tenant_id,claim.driver_id,planId,claim.job_id,claim.fingerprint,candidate]);
   await tx.query("INSERT INTO tawsel.forecast_revisions (tenant_id,forecast_id,plan_id,workload_id,time_origin,expected_finish_at) VALUES ($1,$2,$3,$4,'2026-09-23T10:00:00Z','2026-09-23T10:10:10Z')",[claim.tenant_id,forecastId,planId,workloadId]);
   await tx.query("INSERT INTO tawsel.forecast_members (tenant_id,forecast_id,attempt_id,task_id,source_revision,assignment_revision,pin_revision,membership,position,expected_arrival_at,expected_completion_at) VALUES ($1,$2,$3,$4,1,0,0,'assigned',1,'2026-09-23T10:00:10Z','2026-09-23T10:10:10Z')",[claim.tenant_id,forecastId,member.attemptId,member.taskId]);
   await tx.query("UPDATE tawsel.planning_jobs SET status='complete',lease_id=null,lease_until=null,finished_at=clock_timestamp(),plan_id=$2,candidate=$3 WHERE job_id=$1",[claim.job_id,planId,candidate]);
   await tx.query('UPDATE tawsel.planning_states SET current_plan_id=$1,next_plan_revision=2',[planId]);
  });
  const forecast=(await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rows,members=(await db.pool.query('SELECT * FROM tawsel.forecast_members')).rows;
  expect(await migrate(db.pool)).toEqual(['0010_route_policy.sql','0011_manual_plans.sql','0012_round_start.sql','0013_current_activity.sql','0014_delivery_outcomes.sql','0015_retry_deferral_urgency.sql','0016_workday_closure.sql','0017_device_takeover.sql','0018_account_evidence_notifications.sql','0019_source_returns.sql','0020_branch_activity.sql','0021_dispatch_cycles.sql','0022_driver_corrections.sql','0023_monitoring_snapshots.sql','0024_outbox_delivery.sql','0025_consumer_checkpoints.sql','0026_replay_dependencies.sql']);
  expect((await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rows).toEqual(forecast);expect((await db.pool.query('SELECT * FROM tawsel.forecast_members')).rows).toEqual(members);
  const plan=(await new PlanningService(db.pool).plans(principals.personal,ids.personalDriver)).items[0]!;
  expect(plan).toMatchObject({planId,state:'draft',policyValidated:false,candidate,inputCurrent:true});expect(plan.routePolicy).toBeUndefined();expect(planningConforms('Plan',plan)).toBe(true);
 }finally{await provider.close();await db.close();for(const name of files)await unlink(new URL(name,url));await rmdir(directory);}
});

describe('P13 durable jobs — isolated PostgreSQL, no transaction mocks',()=>{
 let db:Awaited<ReturnType<typeof createTestDatabase>>;
 beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
 afterEach(async()=>{await db?.close();});
 test('committed intake and immutable input survive absent planner and fresh connection; duplicate intent stays unique',async()=>{
  const a=await intake(db.pool),other=createDatabasePool(db.config);
  try {
   const rows=(await other.query('SELECT * FROM tawsel.planning_jobs')).rows;
   expect(rows).toHaveLength(1);const j=rows[0];
   expect(j.status).toBe('pending');expect(j.blocked_reason).toBe('settings-required');
   expect(j.input.members[0]).toMatchObject({taskId:a.taskId,sourceRevision:1,assignmentRevision:0,pinRevision:0,serviceEstimateSeconds:600,eligible:true});
   expect(planningConforms('Input',j.input)).toBe(true);
   expect((await other.query('SELECT status,job_id FROM tawsel.intake_replan_intents')).rows).toEqual([{status:'linked',job_id:j.job_id}]);
   expect(await new IndependentIntakeService(other).create(principals.personal,a.command)).toEqual(a.result);
   expect((await other.query('SELECT * FROM tawsel.planning_jobs')).rowCount).toBe(1);
   const status=await new PlanningService(other).job(principals.personal,j.job_id);
   expect(planningConforms('Job',status)).toBe(true);expect(status.status).toBe('pending');
   await expect(other.query("UPDATE tawsel.planning_jobs SET input='{}' WHERE job_id=$1",[j.job_id])).rejects.toThrow('immutable');
  }finally{await other.end();}
 });
 test('coalesces pending work, keeps history and settings CAS rejects older manual origin',async()=>{
  await intake(db.pool);await intake(db.pool,1);
  const d=await draft(db.pool);
  expect(d.result.receipt.resourceVersions?.planningInputRevision).toBe(3);
  expect((await db.pool.query("SELECT * FROM tawsel.planning_jobs WHERE status='pending'")).rowCount).toBe(1);
  expect((await db.pool.query("SELECT * FROM tawsel.planning_jobs WHERE status='superseded'")).rowCount).toBe(2);
  expect(await new PlanningService(db.pool).command(principals.personal,d.command)).toEqual(d.result);
  await expect(draft(db.pool)).rejects.toMatchObject({code:'stale_revision'});
  const j=(await db.pool.query('SELECT input FROM tawsel.planning_jobs WHERE job_id=$1',[d.jobId])).rows[0];
  expect(j.input.settingsRevision).toBe(1);expect(j.input.members).toHaveLength(2);
  expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(0);
 });
 test('job and plan reads enforce own driver, tenant and live membership',async()=>{
  await intake(db.pool);const d=await draft(db.pool),service=new PlanningService(db.pool);
  await expect(service.job(principals.driver,d.jobId)).rejects.toMatchObject({statusCode:404});
  await expect(service.plans(principals.personal,ids.driver)).rejects.toMatchObject({statusCode:404});
  await db.pool.query('UPDATE tawsel.memberships SET enabled=false WHERE account_id=$1',[ids.personalAccount]);
  await expect(service.job(principals.personal,d.jobId)).rejects.toMatchObject({statusCode:403});
 });
 test('independent workers cannot take a live lease; expired token cannot publish twice',async()=>{
  await intake(db.pool);const d=await draft(db.pool),other=createDatabasePool(db.config),provider=await providerFixture();
  try {
   const claims=await Promise.all([claimPlanningJob(db.pool,500),claimPlanningJob(other,500)]);
   expect(claims.filter(Boolean)).toHaveLength(1);const old=claims.find(Boolean)!;
   expect(await claimPlanningJob(other)).toBeUndefined();
   const candidate=await provider.engine.optimize(engineInput(old));
   await db.pool.query('SELECT pg_sleep(GREATEST(0,EXTRACT(epoch FROM ($1::timestamptz-clock_timestamp())))+0.02)',[old.lease_until]);
   const current=(await claimPlanningJob(other))!;
   expect(current.lease_id).not.toBe(old.lease_id);expect(current.attempts).toBe(2);
   expect(await persistPlanningResult(db.pool,old,{candidate})).toBe(false);
   expect(await persistPlanningResult(other,current,{candidate})).toBe(true);
   expect(await persistPlanningResult(other,current,{candidate})).toBe(false);
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(1);
   expect((await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rowCount).toBe(1);
   expect((await new PlanningService(other).job(principals.personal,d.jobId)).status).toBe('complete');
  }finally{await provider.close();await other.end();}
 });
 test('actual process killed during HTTP recovers after natural lease expiry from a fresh worker pool',async()=>{
  await intake(db.pool);const d=await draft(db.pool),entered=deferred(),release=deferred();
  let first=true;const provider=await providerFixture({async beforeResponse(){if(first){first=false;entered.resolve();await release.promise;}}});
  const child=fork(fileURLToPath(new URL('../support/crash-planning-worker.ts',import.meta.url)),[],{execArgv:['--import','tsx'],env:{...process.env,TAWSEL_CRASH_TEST_URL:db.url,TAWSEL_FIXTURE_VROOM_URL:provider.url},stdio:'ignore',windowsHide:true});
  const exited=once(child,'exit');
  try {
   await Promise.race([entered.promise,exited.then(()=>{throw new Error('Worker exited before Engine request');})]);
   const before=await new PlanningService(db.pool).job(principals.personal,d.jobId);
   expect(before.status).toBe('running');expect(before.attempts).toBe(1);
   // No connection is idle in a transaction during the blocked Engine call.
   expect((await db.pool.query("SELECT * FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction'")).rowCount).toBe(0);
   child.kill('SIGKILL');await exited;
   expect(await claimPlanningJob(db.pool)).toBeUndefined();
   await db.pool.query('SELECT pg_sleep(GREATEST(0,EXTRACT(epoch FROM ($1::timestamptz-clock_timestamp())))+0.02)',[before.leaseExpiresAt]);
   const restarted=createDatabasePool(db.config);
   try{expect(await runPlanningOnce(restarted,provider.engine)).toBe(true);
    expect(await new PlanningService(restarted).job(principals.personal,d.jobId)).toMatchObject({status:'complete',attempts:2});
   }finally{await restarted.end();}
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(1);
   expect((await db.pool.query('SELECT * FROM tawsel.planning_job_attempts')).rowCount).toBe(2);
  }finally{release.resolve();if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await exited;await provider.close();}
 });
 test('failure while storing forecast rolls back draft, forecast and effective pointer; claim remains recoverable',async()=>{
  await intake(db.pool);const d=await draft(db.pool),provider=await providerFixture();
  try {
   const claim=(await claimPlanningJob(db.pool))!,candidate=await provider.engine.optimize(engineInput(claim));
   await db.pool.query("CREATE FUNCTION public.fail_forecast() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forecast fault'; END $$");
   await db.pool.query('CREATE TRIGGER fail_forecast AFTER INSERT ON tawsel.forecast_members FOR EACH ROW EXECUTE FUNCTION public.fail_forecast()');
   await expect(persistPlanningResult(db.pool,claim,{candidate})).rejects.toThrow('forecast fault');
   for(const table of ['plan_revisions','forecast_revisions','forecast_members'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
   expect((await db.pool.query('SELECT current_plan_id FROM tawsel.planning_states')).rows[0].current_plan_id).toBeNull();
   expect((await new PlanningService(db.pool).job(principals.personal,d.jobId)).status).toBe('running');
   await db.pool.query('DROP TRIGGER fail_forecast ON tawsel.forecast_members');
   expect(await persistPlanningResult(db.pool,claim,{candidate})).toBe(true);
  }finally{await provider.close();}
 });
 test('unavailable provider retains accepted intake, persists retry error and a bounded terminal failure; explicit retry is idempotent',async()=>{
  const task=await intake(db.pool),d=await draft(db.pool),provider=await providerFixture({status:503}),service=new PlanningService(db.pool);
  try{
   await runPlanningOnce(db.pool,provider.engine,{maxAttempts:2});
   expect(await service.job(principals.personal,d.jobId)).toMatchObject({status:'pending',attempts:1,error:{code:'http_error',provider:'vroom'}});
   expect(await runPlanningOnce(db.pool,provider.engine,{maxAttempts:2})).toBe(false);
   await db.pool.query('SELECT pg_sleep(GREATEST(0,EXTRACT(epoch FROM (next_attempt_at-clock_timestamp())))+0.02) FROM tawsel.planning_jobs WHERE job_id=$1',[d.jobId]);
   await runPlanningOnce(db.pool,provider.engine,{maxAttempts:2});
   expect(await service.job(principals.personal,d.jobId)).toMatchObject({status:'failed',attempts:2,planId:null});
   expect((await new IndependentIntakeService(db.pool).get(principals.personal,task.taskId)).revision).toBe(1);
   const c=command('planning.requestReplan',{driverId:ids.personalDriver,expectedSettingsRevision:1}),result=await service.command(principals.personal,c);
   expect(await service.command(principals.personal,c)).toEqual(result);
   expect((await db.pool.query("SELECT * FROM tawsel.planning_jobs WHERE status='pending'")).rowCount).toBe(1);
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(0);
  }finally{await provider.close();}
 });
 test('unrepresentable forecast timestamps fail durably instead of cycling an expired claim forever',async()=>{
  await intake(db.pool);const d=await draft(db.pool),provider=await providerFixture();
  try{
   const claim=(await claimPlanningJob(db.pool))!,candidate=await provider.engine.optimize(engineInput(claim));
   candidate.finishOffsetSeconds=Number.MAX_SAFE_INTEGER;
   expect(await persistPlanningResult(db.pool,claim,{candidate})).toBe(true);
   expect(await new PlanningService(db.pool).job(principals.personal,d.jobId)).toMatchObject({status:'failed',error:{code:'invalid_response'},planId:null,leaseExpiresAt:null});
   expect((await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rowCount).toBe(0);
  }finally{await provider.close();}
 });
});

test('P12 retained intake upgrades without losing command or task; legacy intent is recoverably materialized',async()=>{
 const db=await createTestDatabase(),directory=await mkdtemp(join(tmpdir(),'tawsel-p13-migrations-'));
 const files=(await readMigrations()).slice(0,8).map(m=>m.name),url=pathToFileURL(directory+'/');
 try {
  for(const name of files)await copyFile(new URL(`../../../../db/migrations/${name}`,import.meta.url),new URL(name,url));
  await prepareAccessFixture(db.pool,undefined,url);
  const taskId=randomUUID(),c=command('task.createIndependent',{recipientName:'عميل سابق',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24}}});
  const scope={tenantId:ids.personalTenant,sourceId:ids.personalAccount,actorId:ids.personalAccount};
  const accepted=await withTransaction(db.pool,tx=>executeCommandInTransaction(tx,scope,c,{
   async authorize(){},async writeDomain(tx){
    await tx.query(`INSERT INTO tawsel.b2c_tasks (tenant_id,task_id,driver_id,recipient_name,recipient_phone,recipient_phone_normalized) VALUES ($1,$2,$3,'عميل سابق','01012345678','+201012345678')`,[ids.personalTenant,taskId,ids.personalDriver]);
    await tx.query(`INSERT INTO tawsel.task_source_addresses (tenant_id,task_id,kind,latitude,longitude) VALUES ($1,$2,'confirmed-pin',30.05,31.24)`,[ids.personalTenant,taskId]);
    await tx.query(`INSERT INTO tawsel.task_intake_events (tenant_id,task_id,event_id,event_type,revision,source_id,action_id) VALUES ($1,$2,$3,'task.independentCreated',1,$4,$5)`,[ids.personalTenant,taskId,randomUUID(),ids.personalAccount,c.actionId]);
    return {status:'accepted',response:{status:201,body:{taskId}},summary:{taskId},audit:{taskId},resourceVersions:{resourceRevision:1},intents:[]};
   },async writeProgress(){}
  }));
  const original=(await db.pool.query('SELECT * FROM tawsel.b2c_tasks')).rows;
  expect(await migrate(db.pool)).toEqual(['0009_planning.sql','0010_route_policy.sql','0011_manual_plans.sql','0012_round_start.sql','0013_current_activity.sql','0014_delivery_outcomes.sql','0015_retry_deferral_urgency.sql','0016_workday_closure.sql','0017_device_takeover.sql','0018_account_evidence_notifications.sql','0019_source_returns.sql','0020_branch_activity.sql','0021_dispatch_cycles.sql','0022_driver_corrections.sql','0023_monitoring_snapshots.sql','0024_outbox_delivery.sql','0025_consumer_checkpoints.sql','0026_replay_dependencies.sql']);
  expect((await db.pool.query('SELECT status,job_id FROM tawsel.intake_replan_intents')).rows).toEqual([{status:'pending',job_id:null}]);
  expect(await materializeLegacyIntent(db.pool)).toBe(true);expect(await materializeLegacyIntent(db.pool)).toBe(false);
  expect((await db.pool.query('SELECT * FROM tawsel.b2c_tasks')).rows).toEqual(original);
  expect(await withTransaction(db.pool,tx=>getCommandResult(tx,scope,c.actionId))).toEqual(accepted);
  const jobs=(await db.pool.query('SELECT status,blocked_reason,input FROM tawsel.planning_jobs')).rows;
  expect(jobs).toHaveLength(1);expect(jobs[0]).toMatchObject({status:'pending',blocked_reason:'settings-required'});expect(jobs[0].input.members[0].taskId).toBe(taskId);
 }finally{await db.close();for(const name of files)await unlink(new URL(name,url));await rmdir(directory);}
});
