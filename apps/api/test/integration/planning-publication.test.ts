import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture, ids, principals } from '../support/access-fixture.js';
import { intake, draft, providerFixture, command } from '../support/planning-fixture.js';
import { runPlanningOnce } from '../../src/planning/worker.js';
import { PlanningService } from '../../src/planning/service.js';
import { planningConforms } from '../../src/planning/models.js';
import { deferred } from '../support/barriers.js';
import { Locations } from '../../src/locations/service.js';
import { IndependentIntakeService } from '../../src/b2c-intake/service.js';
import { withTransaction } from '../../src/db/transaction.js';
import { lockInvariants } from '../../src/commands/locks.js';
import { buildApp } from '../../src/app.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { bindSource, operatorToken, send } from '../support/provisioning-fixture.js';
import { randomUUID } from 'node:crypto';
import { claimPlanningJob, engineInput, persistPlanningResult } from '../../src/planning/worker.js';
import { assertPlanningPlan } from '../../../../tests/erp-conformance/planning.js';

describe('P13 publication — immutable PostgreSQL forecasts, controlled HTTP candidates',()=>{
 let db:Awaited<ReturnType<typeof createTestDatabase>>;
 beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
 afterEach(async()=>{await db?.close();});
 test('partial candidate identifies unassigned members, preserves all revision estimates and never starts a round',async()=>{
  await intake(db.pool);await intake(db.pool,1);await draft(db.pool);
  const partial=await providerFixture({partial:true}),complete=await providerFixture();
  try {
   await runPlanningOnce(db.pool,partial.engine);
   const service=new PlanningService(db.pool),first=(await service.plans(principals.personal,ids.personalDriver)).items[0]!;
   expect(planningConforms('Plan',first),JSON.stringify(first??(await db.pool.query('SELECT status,last_error FROM tawsel.planning_jobs')).rows)).toBe(true);expect(first.state).toBe('draft');expect(first.policyValidated).toBe(false);
   expect(first.candidate.status).toBe('partial');expect(first.candidate.unassignedTaskIds).toHaveLength(1);
   expect(first.forecast.expectedFinishAt).toBeNull();
   expect(first.forecast.members.map(m=>m.membership).sort()).toEqual(['assigned','unassigned']);
   expect(first.forecast.members.find(m=>m.membership==='unassigned')!.expectedArrivalAt).toBeNull();
   expect(first.forecast.members[0]!.expectedArrivalAt).toBe('2026-09-23T10:00:10.000Z');
   expect(first.forecast.members[0]!.expectedCompletionAt).toBe('2026-09-23T10:10:10.000Z');
   await draft(db.pool,1,{plannedStartAt:'2026-09-23T11:00:00.000Z'});await runPlanningOnce(db.pool,complete.engine);
   const plans=await service.plans(principals.personal,ids.personalDriver);
   for(const plan of plans.items)assertPlanningPlan(plan);
   expect(plans.items).toHaveLength(2);const second=plans.items[0]!,retained=plans.items[1]!;
   expect(retained.forecast).toEqual(first.forecast);expect(second.forecast.forecastId).not.toBe(first.forecast.forecastId);
   expect(second.forecast.workloadId).not.toBe(first.forecast.workloadId);
   expect(second.forecast.members.map(m=>m.attemptId).sort()).toEqual(first.forecast.members.map(m=>m.attemptId).sort());
   expect(second.forecast.expectedFinishAt).toBe('2026-09-23T11:20:20.000Z');
   expect(second.current).toBe(true);expect(retained.current).toBe(false);expect(retained.inputCurrent).toBe(false);
   await expect(db.pool.query('UPDATE tawsel.forecast_members SET expected_arrival_at=now()')).rejects.toThrow('append-only');
   expect((await db.pool.query('SELECT departure_at FROM tawsel.b2c_tasks')).rows.every(r=>r.departure_at===null)).toBe(true);
   expect(await runPlanningOnce(db.pool,complete.engine)).toBe(false);
  }finally{await partial.close();await complete.close();}
 });
 test.each(['pin','source','manual-origin','current-target','manual-choice','outcome-revision'] as const)('delayed result cannot replace newer %s; latest work is durably queued',async change=>{
  const task=await intake(db.pool),d=await draft(db.pool),entered=deferred(),release=deferred();
  const provider=await providerFixture({async beforeResponse(){entered.resolve();await release.promise;}});
  const running=runPlanningOnce(db.pool,provider.engine),service=new PlanningService(db.pool);
  try {
   await entered.promise;
   if(change==='pin'){
    const c=command('location.confirmPin',{taskId:task.taskId,expectedSourceRevision:1,expectedLocationRevision:0,confirmed:true,selection:{kind:'manual',coordinates:{latitude:30.07,longitude:31.28}}});c.resources={taskId:task.taskId};
    await new Locations(db.pool).confirm(principals.personal,c);
   }else if(change==='source'){
    const c=command('task.reviseIndependent',{...task.command.payload,taskId:task.taskId,expectedRevision:1,recipientName:'نسخة أحدث'});c.resources={taskId:task.taskId};c.baseVersions={resourceRevision:1};
    await new IndependentIntakeService(db.pool).revise(principals.personal,c);
   }else if(change==='manual-origin')await draft(db.pool,1,{origin:{kind:'manual-pin',coordinates:{latitude:30.08,longitude:31.3}}});
   else await withTransaction(db.pool,async tx=>{
    // Future execution-writer fixture, NOT implemented P14/P16/P17 behavior.
    // Changes use real driver lock and COMMIT to test the stored revision fence.
    await lockInvariants(tx,ids.personalTenant,[{kind:'driver',id:ids.personalDriver}]);
    const attempt=(await tx.query('SELECT attempt_id FROM tawsel.planning_attempts WHERE task_id=$1',[task.taskId])).rows[0].attempt_id;
    await tx.query(`UPDATE tawsel.planning_states SET execution_revision=execution_revision+1,manual_revision=manual_revision+$3,
     current_target=CASE WHEN $4::jsonb IS NULL THEN current_target ELSE $4::jsonb END WHERE tenant_id=$1 AND driver_id=$2`,
    [ids.personalTenant,ids.personalDriver,change==='manual-choice'?1:0,change==='current-target'?{taskId:task.taskId,attemptId:attempt,revision:1}:null]);
   });
   const expected=(await db.pool.query('SELECT settings,execution_revision,manual_revision,current_target FROM tawsel.planning_states')).rows[0];
   release.resolve();await running;
   const obsolete=await service.job(principals.personal,d.jobId);
   expect(obsolete.status).toBe('superseded');expect(obsolete.planId).toBeNull();expect(obsolete.supersededByJobId).toBeTruthy();
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(0);
   expect((await db.pool.query('SELECT settings,execution_revision,manual_revision,current_target FROM tawsel.planning_states')).rows[0]).toEqual(expected);
   expect((await db.pool.query("SELECT * FROM tawsel.planning_jobs WHERE status='pending'")).rowCount).toBe(1);
   await runPlanningOnce(db.pool,provider.engine);
   const plan=(await service.plans(principals.personal,ids.personalDriver)).items[0]!;
   expect(plan.inputCurrent).toBe(true);expect(plan.jobId).toBe(obsolete.supersededByJobId);expect(plan.state).toBe('draft');
  }finally{release.resolve();await running;await provider.close();}
 });
 test('new intent while stale provider fails stays pending; old error never clobbers it',async()=>{
  await intake(db.pool);const d=await draft(db.pool),entered=deferred(),release=deferred();
  const provider=await providerFixture({status:503,async beforeResponse(){entered.resolve();await release.promise;}});
  const running=runPlanningOnce(db.pool,provider.engine);
  try{
   await entered.promise;const next=await draft(db.pool,1);release.resolve();await running;
   const service=new PlanningService(db.pool);
   expect(await service.job(principals.personal,d.jobId)).toMatchObject({status:'superseded',supersededByJobId:next.jobId,error:{code:'http_error'}});
   expect(await service.job(principals.personal,next.jobId)).toMatchObject({status:'pending',attempts:0,error:null});
  }finally{release.resolve();await running;await provider.close();}
 });
 test('ERP source/assignment changes supersede Engine work; source-scoped draft notice commits with forecasts',async()=>{
  const app=buildApp(createDatabasePool(db.config),undefined,{issuer:'https://issuer.fixture.invalid',operatorToken});await app.ready();
  const source=await bindSource(app,['planner-driver','other-driver']);
  const bootstrap=structuredClone(source.bootstrapCommand);bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=2;bootstrap.payload.intakeCapabilities=['intake.prepare','assignment.manage'];
  expect((await send(app,operatorToken,bootstrap)).statusCode).toBe(200);
  for(const [op,payload] of [
   ['branch.provision',{externalId:'branch',sourceRevision:1,name:'فرع',enabled:true,location:null}],
   ['role.defineCapabilities',{externalId:'role',sourceRevision:1,name:'Driver',capabilities:['execution.own']}]
  ] as const)expect((await send(app,source.token,source.command(op,payload))).statusCode).toBe(200);
  let driverId='',accountId='';
  for(const externalId of ['planner-driver','other-driver']){
   const user=await send(app,source.token,source.command('user.provision',{externalId,sourceRevision:1,subject:externalId,roleExternalId:'role',branchExternalIds:['branch'],enabled:true}));expect(user.statusCode).toBe(200);
   const driver=await send(app,source.token,source.command('driver.provisionReference',{externalId,sourceRevision:1,userExternalId:externalId,enabled:true,profile:'car',vehicleReference:null}));expect(driver.statusCode).toBe(200);
   if(externalId==='planner-driver'){accountId=user.json().response.body.resourceId;driverId=driver.json().response.body.resourceId;}
  }
  // Labelled authenticated principal: issuer reconciliation itself is P08 proof.
  await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1',[source.tenantId]);
  const principal={kind:'account' as const,issuer:'https://issuer.fixture.invalid',subject:'planner-driver'},service=new PlanningService(db.pool);
  const post=(op:string,payload:object)=>app.inject({method:'POST',url:`/api/v1/intake/commands/${op}`,headers:{authorization:`Bearer ${source.token}`},payload:source.command(op,payload)});
  const p={externalId:'shipment',sourceDispatchCycleId:'cycle',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'branch',recipientName:'عميل',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24}},splittingAllowed:false,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'line',description:'طرد',quantity:1,unitDue:{amountMinor:100,currency:'EGP',exponent:2}}],shippingDue:{amountMinor:0,currency:'EGP',exponent:2},totalDue:{amountMinor:100,currency:'EGP',exponent:2},priority:'ordinary'};
  expect((await post('intake.submitSnapshot',p)).statusCode).toBe(200);
  const item={externalId:'shipment',sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1};
  expect((await post('assignment.receiveBatch',{driverExternalId:'planner-driver',items:[item],receiptAsserted:true})).statusCode).toBe(200);
  const save=command('planning.saveDraft',{driverId,expectedSettingsRevision:0,settings:{mode:'car',origin:{kind:'manual-pin',coordinates:{latitude:30.04,longitude:31.23}},endpoint:{kind:'last-customer'},plannedStartAt:'2026-09-23T10:00:00.000Z'}});
  save.context={kind:'device',tenantId:source.tenantId,accountId,deviceId:randomUUID(),deviceGeneration:1,deviceSequence:1};
  const first=await service.command(principal,save),jobId=(first.response!.body.job as {jobId:string}).jobId;
  const entered=deferred(),release=deferred(),provider=await providerFixture({async beforeResponse(){entered.resolve();await release.promise;}});
  const running=runPlanningOnce(db.pool,provider.engine);
  try {
   await entered.promise;
   expect((await post('intake.setUrgencyBeforeDeparture',{externalId:'shipment',sourceDispatchCycleId:'cycle',sourceRevision:2,expectedSourceRevision:1,priority:'urgent'})).statusCode).toBe(200);
   release.resolve();await running;
   expect((await service.job(principal,jobId)).status).toBe('superseded');
   // Fail the last atomic write, after draft/forecast and pointer were written.
   const claim=(await claimPlanningJob(db.pool))!,candidate=await provider.engine.optimize(engineInput(claim));
   await db.pool.query("CREATE FUNCTION public.fail_plan_intent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type='plan.revisionPublished' THEN RAISE EXCEPTION 'plan intent fault'; END IF; RETURN NEW; END $$");
   await db.pool.query('CREATE TRIGGER fail_plan_intent AFTER INSERT ON tawsel.outbox_intents FOR EACH ROW EXECUTE FUNCTION public.fail_plan_intent()');
   await expect(persistPlanningResult(db.pool,claim,{candidate})).rejects.toThrow('plan intent fault');
   for(const table of ['plan_revisions','forecast_revisions','forecast_members'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
   await db.pool.query('DROP TRIGGER fail_plan_intent ON tawsel.outbox_intents');
   expect(await persistPlanningResult(db.pool,claim,{candidate})).toBe(true);
   const plan=(await service.plans(principal,driverId)).items[0]!;
   expect(plan.input.members[0]).toMatchObject({sourceRevision:2,assignmentRevision:1,priority:'urgent',eligible:true});
   const events=(await db.pool.query("SELECT recipient_id,payload,state FROM tawsel.outbox_intents WHERE event_type='plan.revisionPublished'")).rows;
   expect(events).toHaveLength(1);expect(events[0].recipient_id).toBe(source.integrationId);expect(events[0].state).toBe('pending');
   expect(planningConforms('PublishedEvent',events[0].payload)).toBe(true);expect(events[0].payload).not.toHaveProperty('members');
   expect((await app.inject({url:'/api/v1/intake/task?externalId=shipment',headers:{authorization:`Bearer ${source.token}`}})).json().planningStatus).toBe('complete');
   const request={...save,actionId:randomUUID(),operationId:'planning.requestReplan',payload:{driverId,expectedSettingsRevision:1}};
   const replan=await service.command(principal,request),replanId=(replan.response!.body.job as {jobId:string}).jobId;
   const stale=(await claimPlanningJob(db.pool))!,oldCandidate=await provider.engine.optimize(engineInput(stale));
   expect((await post('assignment.reassignBeforeDeparture',{...item,expectedSourceRevision:2,expectedAssignmentRevision:1,assignmentRevision:2,driverExternalId:'other-driver',receiptAsserted:true})).statusCode).toBe(200);
   expect(await persistPlanningResult(db.pool,stale,{candidate:oldCandidate})).toBe(false);
   expect((await service.job(principal,replanId)).status).toBe('superseded');
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(1);
   expect((await db.pool.query("SELECT input FROM tawsel.planning_jobs WHERE status='pending' AND driver_id<>$1",[driverId])).rows[0].input.members[0].assignmentRevision).toBe(2);
  }finally{release.resolve();await running;await provider.close();await app.close();}
 });
});
