import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture, ids, principals } from '../apps/api/test/support/access-fixture.js';
import { draft, intake, providerFixture } from '../apps/api/test/support/planning-fixture.js';
import { PlanningService } from '../apps/api/src/planning/service.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';
import { assertPlanningPlan } from '../tests/erp-conformance/planning.js';
import { planningConforms } from '../apps/api/src/planning/models.js';

// Intentionally disposable, labelled domain/principal + HTTP Engine fixtures.
// Never modifies the application DB, datasets, maps or active rounds.
const db=await createTestDatabase(),provider=await providerFixture(),partial=await providerFixture({partial:true});
try{
 await prepareAccessFixture(db.pool);await intake(db.pool);await intake(db.pool,1);
 const service=new PlanningService(db.pool),first=await draft(db.pool);
 const pending=await service.job(principals.personal,first.jobId);assert.equal(pending.status,'pending');
 await runPlanningOnce(db.pool,partial.engine);
 const old=(await service.plans(principals.personal,ids.personalDriver)).items[0]!;
 assertPlanningPlan(old);assert(planningConforms('Plan',old));
 const next=await draft(db.pool,1,{plannedStartAt:'2026-09-23T11:00:00.000Z'});await runPlanningOnce(db.pool,provider.engine);
 const plans=await service.plans(principals.personal,ids.personalDriver);
 for(const plan of plans.items){assertPlanningPlan(plan);assert(planningConforms('Plan',plan));}
 assert.equal(plans.items.length,2);assert.deepEqual(plans.items[1]!.forecast,old.forecast);
 const rows={jobs:(await db.pool.query('SELECT job_id,status,attempts,fingerprint FROM tawsel.planning_jobs ORDER BY created_at')).rows,
  plans:(await db.pool.query('SELECT plan_id,revision,state FROM tawsel.plan_revisions ORDER BY revision')).rows,
  forecasts:(await db.pool.query('SELECT forecast_id,plan_id,workload_id,time_origin,expected_finish_at,kind FROM tawsel.forecast_revisions ORDER BY time_origin')).rows,
  intents:(await db.pool.query('SELECT driver_id,status,job_id FROM tawsel.intake_replan_intents ORDER BY created_at')).rows};
 const report={recordedAt:new Date().toISOString(),evidence:'isolated real PostgreSQL; controlled HTTP Engine and authenticated-principal fixtures; no live routing, round or baseline',pending,latest:await service.job(principals.personal,next.jobId),plans,rows};
 await mkdir('.local',{recursive:true});await writeFile('.local/phase-13-demo.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS: intake → durable pending → partial draft → revised complete candidate; two immutable forecasts retained.');
 console.log('Inspected committed jobs/plans/forecasts/replan intents: .local/phase-13-demo.json. Disposable database is removed.');
 console.log('For actual worker-kill, delayed pin/source/assignment and HTTP restart proof: npm run test:planning.');
}finally{await provider.close();await partial.close();await db.close();}
