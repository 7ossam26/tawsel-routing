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
import { planRoute, validateCompleteRoute } from '../../src/planning/policy.js';
import type { OptimizationInput } from '../../src/engine/index.js';
import { companyPlanningFixture } from '../support/planning-company-fixture.js';

describe('P13 publication — immutable PostgreSQL forecasts, controlled HTTP candidates',()=>{
 let db:Awaited<ReturnType<typeof createTestDatabase>>;
 beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
 afterEach(async()=>{await db?.close();});
 test('P14: unavailable fixed-endpoint road leg cannot be omitted from a ready result',async()=>{
  await intake(db.pool);const d=await draft(db.pool,0,{endpoint:{kind:'fixed',coordinates:{latitude:30.1,longitude:31.3}}}),provider=await providerFixture({roadStatus:503});
  try{
   await runPlanningOnce(db.pool,provider.engine,{maxAttempts:1});
   expect(await new PlanningService(db.pool).job(principals.personal,d.jobId)).toMatchObject({status:'failed',resultKind:'dependency-failed',planId:null,error:{provider:'osrm'}});
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(0);
  }finally{await provider.close();}
 });
 test('P14: unassigned urgent is stored as an exception; explicit branch finish includes the final road leg and branch service',async()=>{
  const company=await companyPlanningFixture(db),provider=await providerFixture(),partial=await providerFixture({partial:true});
  try{
   const urgent=await company.task('urgent','urgent');await company.task('ordinary','ordinary');await company.save();
   await runPlanningOnce(db.pool,{optimize:(i,s)=>(i.tasks[0]!.taskId===urgent?partial:provider).engine.optimize(i,s)});
   const first=(await company.service.plans(company.principal,company.driverId)).items[0]!;
   expect(first.state).toBe('partial');expect(first.routePolicy!.exceptions).toEqual([{taskId:urgent,reason:'unassigned-urgent'}]);expect(first.forecast.expectedFinishAt).toBeNull();
   const endpoint={kind:'branch',branchId:first.input.members[0]!.branchId,coordinates:{latitude:30.08,longitude:31.28},serviceEstimateSeconds:90};
   await company.service.command(company.principal,company.planCommand('planning.saveDraft',{expectedSettingsRevision:1,settings:{...first.input.settings,endpoint}}));
   await runPlanningOnce(db.pool,provider.engine);const ready=(await company.service.plans(company.principal,company.driverId)).items[0]!;
   expect(ready.state).toBe('ready');expect(ready.candidate).toMatchObject({travelDurationSeconds:45,branchServiceEstimateSeconds:90,customerServiceEstimateSeconds:1200,finishOffsetSeconds:1335,endpoint});
   expect(ready.forecast.expectedFinishAt).toBe('2026-09-23T10:22:15.000Z');assertPlanningPlan(ready);
  }finally{await company.close();await provider.close();await partial.close();}
 });
 test('P14: public ERP urgent/prepared/future inputs, persisted current prefix and manual authority use the same policy',async()=>{
  const company=await companyPlanningFixture(db),provider=await providerFixture();
  try{
   const current=await company.task('current','ordinary'),urgent=await company.task('urgent','urgent'),ordinary=await company.task('ordinary','ordinary');
   const future=await company.task('future','urgent','held','2099-01-01T00:00:00Z'),prepared=await company.task('prepared','urgent','prepared');
   await withTransaction(db.pool,async tx=>{
    await lockInvariants(tx,company.tenantId,[{kind:'driver',id:company.driverId}]);
    const attempt=(await tx.query('SELECT attempt_id FROM tawsel.planning_attempts WHERE task_id=$1',[current])).rows[0].attempt_id;
    // Future P16 writer fixture; all other inputs use real public ERP commands.
    await tx.query('UPDATE tawsel.planning_states SET current_target=$3,execution_revision=execution_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[company.tenantId,company.driverId,{taskId:current,attemptId:attempt,revision:1}]);
   });
   await company.save();await runPlanningOnce(db.pool,provider.engine);
   const state=await company.service.plans(company.principal,company.driverId),plan=state.items[0]!;
   expect(plan.routePolicy!.orderedTaskIds).toEqual([current,urgent,ordinary]);expect(plan.state).toBe('ready');
   expect(plan.forecast.members.find(m=>m.taskId===future)).toMatchObject({membership:'excluded',exclusionReason:'future'});
   expect(plan.forecast.members.find(m=>m.taskId===prepared)).toMatchObject({membership:'excluded',exclusionReason:'not-held'});
   const manual=(taskIds:string[])=>company.planCommand('planning.setManualOrder',{expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds}});
   for(const bad of [[current,ordinary,urgent],[urgent,current,ordinary],[current,urgent,ordinary,future],[current,urgent,ordinary,prepared]])await expect(company.service.command(company.principal,manual(bad))).rejects.toMatchObject({code:'invalid_manual_order'});
   await company.service.command(company.principal,manual([current,urgent,ordinary]));
   const events=(await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE tenant_id=$1 AND event_type='plan.revisionPublished' ORDER BY created_at",[company.tenantId])).rows;
   expect(events).toHaveLength(2);expect(events[1]!.payload).toMatchObject({state:'manual',jobId:null,policyValidated:true});expect(planningConforms('PublishedEvent',events[1]!.payload)).toBe(true);
  }finally{await company.close();await provider.close();}
 });
 test('P14: first manual route remains available after a committed provider failure',async()=>{
  const task=await intake(db.pool);await draft(db.pool);const provider=await providerFixture({status:503});
  try{
   await runPlanningOnce(db.pool,provider.engine,{maxAttempts:1});
   const {service,c}=await manual({kind:'select-first',taskId:task.taskId});expect((await service.plans(principals.personal,ids.personalDriver)).items).toHaveLength(0);
   await service.command(principals.personal,c);const manualState=await service.plans(principals.personal,ids.personalDriver),plan=manualState.items[0]!;
   expect(manualState.continuation).toBeNull();
   expect(plan).toMatchObject({state:'manual',candidate:null,inputCurrent:true});assertPlanningPlan(plan);
  }finally{await provider.close();}
 });
 async function manual(selection:{kind:'order';taskIds:string[]}|{kind:'select-first';taskId:string}){
  const service=new PlanningService(db.pool),state=await service.plans(principals.personal,ids.personalDriver);
  const c=command('planning.setManualOrder',{driverId:ids.personalDriver,expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection});
  return {service,c};
 }
 test('P14 C: offline first manual route persists unknown times, replays once and fences delayed optimization',async()=>{
  const a=await intake(db.pool),b=await intake(db.pool,1),d=await draft(db.pool),entered=deferred(),release=deferred();
  const provider=await providerFixture({async beforeResponse(){entered.resolve();await release.promise;}}),running=runPlanningOnce(db.pool,provider.engine);
  try{
   await entered.promise;const {service,c}=await manual({kind:'select-first',taskId:a.taskId});
   const accepted=await service.command(principals.personal,c);
   expect(accepted.response!.status).toBe(200);expect(await service.command(principals.personal,c)).toEqual(accepted);
   release.resolve();await running;
   expect((await service.job(principals.personal,d.jobId)).status).toBe('superseded');
   const plans=await service.plans(principals.personal,ids.personalDriver),plan=plans.items[0]!;
   expect(plans.items).toHaveLength(1);expect(plan).toMatchObject({state:'manual',candidate:null,jobId:null,current:true,inputCurrent:true,policyValidated:true});
   expect(plan.routePolicy!.orderedTaskIds).toEqual([a.taskId,b.taskId]);expect(planningConforms('Plan',plan)).toBe(true);assertPlanningPlan(plan);
   expect(plan.forecast.members.every(m=>m.expectedArrivalAt===null&&m.expectedCompletionAt===null)).toBe(true);
   expect((await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rowCount).toBe(1);
   expect((await db.pool.query('SELECT departure_at FROM tawsel.b2c_tasks')).rows.every(r=>r.departure_at===null)).toBe(true);
   expect(await runPlanningOnce(db.pool,provider.engine)).toBe(false);
   await expect(db.pool.query("UPDATE tawsel.plan_revisions SET route_policy='{}'")).rejects.toThrow('append-only');
  }finally{release.resolve();await running;await provider.close();}
 });
 test('P14 C: Engine failure retains a valid remaining order without transplanting old road estimates',async()=>{
  await intake(db.pool);await intake(db.pool,1);await draft(db.pool);
  const working=await providerFixture(),offline=await providerFixture({status:503});
  try{
   await runPlanningOnce(db.pool,working.engine);const service=new PlanningService(db.pool),old=(await service.plans(principals.personal,ids.personalDriver)).items[0]!;
   await service.command(principals.personal,command('planning.requestReplan',{driverId:ids.personalDriver,expectedSettingsRevision:1}));
   await runPlanningOnce(db.pool,offline.engine,{maxAttempts:1});
   const state=await service.plans(principals.personal,ids.personalDriver);
   expect(state.latestJob).toMatchObject({status:'failed',resultKind:'dependency-failed'});
   expect(state.continuation).toEqual({sourcePlanId:old.planId,orderedTaskIds:old.candidate!.visits.map(v=>v.taskId),mode:'reoptimization-pending',requiresManualConfirmation:true,roadMetricsAvailable:false});
   expect(state.items[0]!.forecast).toEqual(old.forecast);expect(state.items[0]!.inputCurrent).toBe(false);
   const {c}=await manual({kind:'order',taskIds:state.continuation!.orderedTaskIds});await service.command(principals.personal,c);
   const plans=await service.plans(principals.personal,ids.personalDriver);expect(plans.items).toHaveLength(2);expect(plans.items[0]!.state).toBe('manual');expect(plans.items[1]!.forecast).toEqual(old.forecast);
  }finally{await working.close();await offline.close();}
 });
 test('P14 C: manual order rejects omissions and protected-current replacement, CAS serializes independent writers',async()=>{
  const a=await intake(db.pool),b=await intake(db.pool,1);await draft(db.pool);
  const service=new PlanningService(db.pool),omitted=await manual({kind:'order',taskIds:[a.taskId]});
  await expect(service.command(principals.personal,omitted.c)).rejects.toMatchObject({code:'invalid_manual_order'});
  await withTransaction(db.pool,async tx=>{
   // P16 current-selection fixture; same authoritative driver lock.
   await lockInvariants(tx,ids.personalTenant,[{kind:'driver',id:ids.personalDriver}]);
   const attempt=(await tx.query('SELECT attempt_id FROM tawsel.planning_attempts WHERE task_id=$1',[a.taskId])).rows[0].attempt_id;
   await tx.query('UPDATE tawsel.planning_states SET current_target=$1,execution_revision=execution_revision+1',[{taskId:a.taskId,attemptId:attempt,revision:1}]);
  });
  const wrong=await manual({kind:'select-first',taskId:b.taskId});await expect(service.command(principals.personal,wrong.c)).rejects.toMatchObject({code:'invalid_manual_order'});
  const first=await manual({kind:'order',taskIds:[a.taskId,b.taskId]}),second=structuredClone(first.c);second.actionId=randomUUID();
  const independent=createDatabasePool(db.config);
  try{
   const results=await Promise.allSettled([service.command(principals.personal,first.c),new PlanningService(independent).command(principals.personal,second)]);
   expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'stale_revision'}});
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(1);
  }finally{await independent.end();}
 });
 test('P14 C: failed manual forecast transaction rolls back revisions, pointer, supersession and receipt',async()=>{
  const a=await intake(db.pool);const d=await draft(db.pool),{service,c}=await manual({kind:'select-first',taskId:a.taskId});
  const before=(await db.pool.query('SELECT * FROM tawsel.planning_states')).rows;
  await db.pool.query("CREATE FUNCTION public.fail_manual_forecast() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'manual forecast fault'; END $$");
  await db.pool.query('CREATE TRIGGER fail_manual_forecast BEFORE INSERT ON tawsel.forecast_members FOR EACH ROW EXECUTE FUNCTION public.fail_manual_forecast()');
  await expect(service.command(principals.personal,c)).rejects.toThrow('manual forecast fault');
  expect((await db.pool.query('SELECT * FROM tawsel.planning_states')).rows).toEqual(before);expect((await service.job(principals.personal,d.jobId)).status).toBe('pending');
  for(const table of ['plan_revisions','forecast_revisions','forecast_members'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
  await db.pool.query('DROP TRIGGER fail_manual_forecast ON tawsel.forecast_members');await service.command(principals.personal,c);
  expect((await service.plans(principals.personal,ids.personalDriver)).items[0]!.state).toBe('manual');
 });
 test.each(['omitted','duplicate','unknown','wrong-profile','wrong-pin','wrong-endpoint','broken-time','negative-unit','wrong-service','wrong-wait','wrong-total','unassigned-overlap'] as const)('P14 B: %s provider candidate cannot publish a ready plan',async fault=>{
  await intake(db.pool);await intake(db.pool,1);const d=await draft(db.pool),provider=await providerFixture();
  try {
   const claim=(await claimPlanningJob(db.pool))!,candidate=await provider.engine.optimize(engineInput(claim));
   const v=candidate.visits[0]!;
   if(fault==='omitted')candidate.visits.pop();
   if(fault==='duplicate')candidate.visits[1]=structuredClone(v);
   if(fault==='unknown')v.taskId=randomUUID();
   if(fault==='wrong-profile')candidate.mode='car';
   if(fault==='wrong-pin')v.coordinates={latitude:v.coordinates.longitude,longitude:v.coordinates.latitude};
   if(fault==='wrong-endpoint')candidate.endpoint={kind:'fixed',coordinates:v.coordinates};
   if(fault==='broken-time')candidate.visits[1]!.arrivalOffsetSeconds=11;
   if(fault==='negative-unit')v.distanceMetres=-1;
   if(fault==='wrong-service')v.serviceEstimateSeconds=60;
   if(fault==='wrong-wait')v.waitingSeconds=10;
   if(fault==='wrong-total')candidate.distanceMetres+=10;
   if(fault==='unassigned-overlap'){candidate.unassignedTaskIds=[v.taskId];candidate.status='partial';}
   await persistPlanningResult(db.pool,claim,{candidate});
   expect(await new PlanningService(db.pool).job(principals.personal,d.jobId)).toMatchObject({status:'failed',resultKind:'invalid',planId:null,error:{code:'invalid_response'}});
   expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(0);
   expect((await db.pool.query('SELECT * FROM tawsel.forecast_revisions')).rowCount).toBe(0);
  }finally{await provider.close();}
 });
 test('P14 B: complete route rejects future admission, reversed urgency/current and branch capacity overflow',async()=>{
  await intake(db.pool);await intake(db.pool,1);await draft(db.pool);const claim=(await claimPlanningJob(db.pool))!,provider=await providerFixture();
  try{
   const candidate=await provider.engine.optimize(engineInput(claim)),input=structuredClone(claim.input);
   const last=input.members.find(m=>m.taskId===candidate.visits[1]!.taskId)!;
   last.earliestAt='2026-09-24T10:00:00Z';expect(()=>validateCompleteRoute(input,candidate)).toThrow();last.earliestAt=null;
   last.priority='urgent';expect(()=>validateCompleteRoute(input,candidate)).toThrow();last.priority='ordinary';
   input.currentTarget={taskId:last.taskId,attemptId:last.attemptId,revision:1};expect(()=>validateCompleteRoute(input,candidate)).toThrow();input.currentTarget=null;
   input.accountKind='company';input.settings!.endpoint={kind:'branch',branchId:ids.branch,coordinates:last.coordinates!,serviceEstimateSeconds:300};
   input.members=Array.from({length:50},()=>({...last,taskId:randomUUID(),attemptId:randomUUID(),dispatchCycleId:randomUUID(),reservationState:'remaining'}));
   expect(()=>validateCompleteRoute(input,candidate)).toThrow();
  }finally{await provider.close();}
 });
 test('P14 B: fixed endpoint adds real adapter leg timing; co-located shipments remain separate',async()=>{
  await intake(db.pool);await intake(db.pool);await draft(db.pool,0,{endpoint:{kind:'fixed',coordinates:{latitude:30.1,longitude:31.3}}});
  const provider=await providerFixture();
  try{
   await runPlanningOnce(db.pool,provider.engine);
   const plan=(await new PlanningService(db.pool).plans(principals.personal,ids.personalDriver)).items[0]!;
   expect(plan.state).toBe('ready');expect(plan.candidate!.visits).toHaveLength(2);
   expect(new Set(plan.candidate!.visits.map(v=>v.taskId)).size).toBe(2);
   expect(plan.candidate!.visits[0]!.coordinates).toEqual(plan.candidate!.visits[1]!.coordinates);
   expect(plan.candidate!.travelDurationSeconds).toBe(45);expect(plan.candidate!.distanceMetres).toBe(450);
   expect(plan.forecast.expectedFinishAt).toBe('2026-09-23T10:20:45.000Z');expect(planningConforms('Plan',plan)).toBe(true);
  }finally{await provider.close();}
 });
 test('P14 A: protected current, urgent groups, future exclusion and common offsets with waiting',async()=>{
  for(let i=0;i<5;i++)await intake(db.pool,i);
  await draft(db.pool);const claim=(await claimPlanningJob(db.pool))!,input=structuredClone(claim.input);
  // Explicit policy fixture over a real persisted snapshot. Heading/deferral
  // writers belong to P16/P18; this is not evidence that they exist today.
  const [current,urgent1,urgent2,ordinary,future]=input.members;
  input.currentTarget={taskId:current!.taskId,attemptId:current!.attemptId,revision:1};
  urgent1!.priority='urgent';urgent2!.priority='urgent';future!.priority='urgent';future!.earliestAt='2026-09-24T10:00:00Z';future!.eligible=false;future!.exclusionReason='future';
  const provider=await providerFixture({waitingSeconds:7}),calls:OptimizationInput[]=[];
  try {
   const candidate=await planRoute(input,{async optimize(i,s){calls.push(i);return provider.engine.optimize(i,s);}});
   expect(candidate.visits.map(v=>v.taskId)).toEqual([current!.taskId,urgent2!.taskId,urgent1!.taskId,ordinary!.taskId]);
   expect(calls.map(c=>c.origin.coordinates)).toEqual([input.settings!.origin.coordinates,current!.coordinates,urgent1!.coordinates]);
   expect(candidate.visits.map(v=>v.arrivalOffsetSeconds)).toEqual([10,627,1244,1861]);
   expect(candidate.waitingSeconds).toBe(28);expect(candidate.customerServiceEstimateSeconds).toBe(2400);expect(candidate.finishOffsetSeconds).toBe(2468);
   expect(calls.flatMap(c=>c.tasks.map(t=>t.taskId))).not.toContain(future!.taskId);
  }finally{await provider.close();}
 });
 test('P14 A: unreachable urgent is explicit partial; unreachable current prevents following visits',async()=>{
  await intake(db.pool);await intake(db.pool,1);await draft(db.pool);
  const input=structuredClone((await claimPlanningJob(db.pool))!.input);input.members[0]!.priority='urgent';
  const partial=await providerFixture({partial:true}),complete=await providerFixture();
  try {
   const planner={optimize:(i:OptimizationInput,s?:AbortSignal)=>(i.tasks[0]!.taskId===input.members[0]!.taskId?partial:complete).engine.optimize(i,s)};
   const route=await planRoute(input,planner);
   expect(route.status).toBe('partial');expect(route.unassignedTaskIds).toEqual([input.members[0]!.taskId]);expect(route.visits.map(v=>v.taskId)).toEqual([input.members[1]!.taskId]);
   input.currentTarget={taskId:input.members[0]!.taskId,attemptId:input.members[0]!.attemptId,revision:1};
   const blocked=await planRoute(input,planner);expect(blocked.visits).toEqual([]);expect(blocked.unassignedTaskIds).toEqual(input.members.map(m=>m.taskId));
  }finally{await partial.close();await complete.close();}
 });
 test('partial candidate identifies unassigned members, preserves all revision estimates and never starts a round',async()=>{
  await intake(db.pool);await intake(db.pool,1);await draft(db.pool);
  const partial=await providerFixture({partial:true}),complete=await providerFixture();
  try {
   await runPlanningOnce(db.pool,partial.engine);
   const service=new PlanningService(db.pool),first=(await service.plans(principals.personal,ids.personalDriver)).items[0]!;
   expect(planningConforms('Plan',first),JSON.stringify(first??(await db.pool.query('SELECT status,last_error FROM tawsel.planning_jobs')).rows)).toBe(true);expect(first.state).toBe('partial');expect(first.policyValidated).toBe(true);
   expect(first.candidate!.status).toBe('partial');expect(first.candidate!.unassignedTaskIds).toHaveLength(1);
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
   expect(plan.inputCurrent).toBe(true);expect(plan.jobId).toBe(obsolete.supersededByJobId);expect(plan.state).toBe('ready');
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
