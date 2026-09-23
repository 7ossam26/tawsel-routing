import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { prepareAccessFixture,ids,principals } from '../apps/api/test/support/access-fixture.js';
import { command,draft,intake,providerFixture } from '../apps/api/test/support/planning-fixture.js';
import { PlanningService } from '../apps/api/src/planning/service.js';
import { runPlanningOnce } from '../apps/api/src/planning/worker.js';
import { deferred } from '../apps/api/test/support/barriers.js';
import { assertPlanningPlan } from '../tests/erp-conformance/planning.js';
import { planningConforms } from '../apps/api/src/planning/models.js';

const db=await createTestDatabase(),offline=await providerFixture({status:503}),online=await providerFixture();
const entered=deferred(),release=deferred(),delayed=await providerFixture({async beforeResponse(){entered.resolve();await release.promise;}});
try{
 await prepareAccessFixture(db.pool);const a=await intake(db.pool),b=await intake(db.pool,1);await draft(db.pool);
 const service=new PlanningService(db.pool);
 await runPlanningOnce(db.pool,offline.engine,{maxAttempts:1});
 assert.equal((await service.plans(principals.personal,ids.personalDriver)).latestJob!.resultKind,'dependency-failed');
 async function manual(first:string){const s=await service.plans(principals.personal,ids.personalDriver);return service.command(principals.personal,command('planning.setManualOrder',{driverId:ids.personalDriver,expectedSettingsRevision:s.settingsRevision,expectedInputRevision:s.inputRevision,expectedManualRevision:s.manualRevision,selection:{kind:'select-first',taskId:first}}));}
 await manual(a.taskId);
 const replan=()=>service.command(principals.personal,command('planning.requestReplan',{driverId:ids.personalDriver,expectedSettingsRevision:1}));
 await replan();await runPlanningOnce(db.pool,online.engine);const ready=(await service.plans(principals.personal,ids.personalDriver)).items[0]!;assert.equal(ready.state,'ready');
 await replan();const running=runPlanningOnce(db.pool,delayed.engine);
 try{await entered.promise;await manual(b.taskId);}finally{release.resolve();await running;}
 const plans=await service.plans(principals.personal,ids.personalDriver);
 assert.equal(plans.items[0]!.state,'manual');assert.equal(plans.items[0]!.routePolicy!.orderedTaskIds[0],b.taskId);assert.equal(plans.latestJob!.status,'superseded');
 for(const p of plans.items){assertPlanningPlan(p);assert(planningConforms('Plan',p));}
 assert.deepEqual(plans.items.find(p=>p.planId===ready.planId)!.forecast,ready.forecast);
 const rows={jobs:(await db.pool.query('SELECT job_id,status,last_error,plan_id FROM tawsel.planning_jobs ORDER BY created_at')).rows,
  plans:(await db.pool.query('SELECT plan_id,revision,state,route_policy FROM tawsel.plan_revisions ORDER BY revision')).rows,
  forecasts:(await db.pool.query('SELECT forecast_id,plan_id,workload_id,expected_finish_at FROM tawsel.forecast_revisions')).rows,
  members:(await db.pool.query('SELECT task_id,attempt_id,membership,position,expected_arrival_at,expected_completion_at FROM tawsel.forecast_members')).rows};
 await mkdir('.local',{recursive:true});await writeFile('.local/phase-14-demo.json',JSON.stringify({recordedAt:new Date().toISOString(),evidence:'real isolated PostgreSQL; controlled HTTP Engine and principal fixtures; no live routing or active round',plans,rows},null,2)+'\n');
 console.log('PASS: Engine failure → manual first route → validated ready revision → delayed optimization superseded by newer manual choice. Three immutable forecasts retained.');
 console.log('Committed evidence: .local/phase-14-demo.json; disposable database removed. Urgency/current/endpoint examples: npm run test:planning.');
}finally{release.resolve();await offline.close();await online.close();await delayed.close();await db.close();}
