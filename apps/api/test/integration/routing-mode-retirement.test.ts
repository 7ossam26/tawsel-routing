import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { ids, principals, prepareAccessFixture } from '../support/access-fixture.js';
import { command, draft, intake, providerFixture, settings } from '../support/planning-fixture.js';
import { companyPlanningFixture } from '../support/planning-company-fixture.js';
import { send } from '../support/provisioning-fixture.js';
import { PlanningService } from '../../src/planning/service.js';
import { enqueuePlanning } from '../../src/planning/queue.js';
import { runPlanningOnce } from '../../src/planning/worker.js';
import { withTransaction } from '../../src/db/transaction.js';
import { Rounds } from '../../src/rounds/service.js';

describe('two supported vehicle modes — isolated PostgreSQL guards',()=>{
  let db:Awaited<ReturnType<typeof createTestDatabase>>;
  beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
  afterEach(async()=>{await db?.close();});

  async function domainSnapshot(){
    return (await db.pool.query(`SELECT jsonb_build_object(
      'states',(SELECT jsonb_agg(to_jsonb(s) ORDER BY driver_id) FROM tawsel.planning_states s),
      'jobs',(SELECT jsonb_agg(to_jsonb(j) ORDER BY job_id) FROM tawsel.planning_jobs j),
      'plans',(SELECT jsonb_agg(to_jsonb(p) ORDER BY plan_id) FROM tawsel.plan_revisions p),
      'identities',(SELECT count(*) FROM tawsel.command_identities),
      'tasks',(SELECT jsonb_agg(to_jsonb(t) ORDER BY task_id) FROM tawsel.b2c_tasks t)) AS data`)).rows[0].data;
  }
  async function injectStoredMode(mode:string){
    // Only this marked, invocation-owned test DB gets a malformed stored setting.
    // Immutable jobs/plans are never rewritten to manufacture the failure.
    await db.pool.query(`UPDATE tawsel.planning_states SET settings=jsonb_set(settings,'{mode}',to_jsonb($1::text)) WHERE tenant_id=$2 AND driver_id=$3`,[mode,ids.personalTenant,ids.personalDriver]);
  }

  for(const mode of ['bicycle','unknown']){
    test(`new ${mode} draft and ERP profile are rejected without domain writes`,async()=>{
      await intake(db.pool);
      const before=await domainSnapshot();
      const input=JSON.parse(JSON.stringify(command('planning.saveDraft',{driverId:ids.personalDriver,expectedSettingsRevision:0,settings:{...settings,mode}})));
      await expect(new PlanningService(db.pool).command(principals.personal,input)).rejects.toMatchObject({code:'validation_failed',statusCode:400});
      expect(await domainSnapshot()).toEqual(before);
      const company=await companyPlanningFixture(db);
      try{
        const records=(await db.pool.query('SELECT * FROM tawsel.provisioning_records ORDER BY entity,external_id')).rows;
        const identities=(await db.pool.query('SELECT count(*)::int AS n FROM tawsel.command_identities')).rows[0].n;
        const response=await send(company.app,company.source.token,company.source.command('driver.provisionReference',{externalId:'policy-driver',sourceRevision:2,userExternalId:'policy-driver',enabled:true,profile:mode,vehicleReference:null}));
        expect(response.statusCode).toBe(400);expect(response.json().code).toBe('validation_failed');
        expect((await db.pool.query('SELECT * FROM tawsel.provisioning_records ORDER BY entity,external_id')).rows).toEqual(records);
        expect((await db.pool.query('SELECT count(*)::int AS n FROM tawsel.command_identities')).rows[0].n).toBe(identities);
      }finally{await company.close();}
    });

    test(`stored ${mode} blocks preview, replan and manual publication; explicit supported replacement succeeds`,async()=>{
      const task=await intake(db.pool);await draft(db.pool);await injectStoredMode(mode);
      const planning=new PlanningService(db.pool),before=await domainSnapshot();
      for(const operationId of ['planning.requestPreview','planning.requestReplan','planning.setManualOrder']){
        const payload={driverId:ids.personalDriver,expectedSettingsRevision:1,...(operationId==='planning.setManualOrder'?{expectedInputRevision:2,expectedManualRevision:0,selection:{kind:'order',taskIds:[task.taskId]}}:{})};
        await expect(planning.command(principals.personal,command(operationId,payload))).rejects.toMatchObject({code:'validation_failed',statusCode:400});
        expect(await domainSnapshot()).toEqual(before);
      }
      const replacement=await draft(db.pool,1,{mode:'motorcycle'});
      expect(replacement.result.receipt.businessStatus).toBe('accepted');
      expect((await db.pool.query('SELECT input FROM tawsel.planning_jobs WHERE job_id=$1',[replacement.jobId])).rows[0].input.settings.mode).toBe('motorcycle');
      expect((await db.pool.query('SELECT settings_revision,settings FROM tawsel.planning_states')).rows[0]).toMatchObject({settings_revision:'2',settings:{mode:'motorcycle'}});
    });

    test(`stored ${mode} job fails once before provider calls and preserves immutable input and fingerprint`,async()=>{
      await intake(db.pool);const saved=await draft(db.pool);await injectStoredMode(mode);
      const job=await withTransaction(db.pool,tx=>enqueuePlanning(tx,ids.personalTenant,ids.personalDriver,ids.personalAccount,saved.command.actionId));
      const before=(await db.pool.query('SELECT input,fingerprint FROM tawsel.planning_jobs WHERE job_id=$1',[job.job_id])).rows[0];
      const planner={optimize:vi.fn(async()=>{throw new Error('unsupported mode reached provider');}),route:vi.fn(async()=>{throw new Error('unsupported mode reached road provider');})};
      expect(await runPlanningOnce(db.pool,planner)).toBe(true);
      expect(planner.optimize).not.toHaveBeenCalled();expect(planner.route).not.toHaveBeenCalled();
      expect((await db.pool.query('SELECT input,fingerprint FROM tawsel.planning_jobs WHERE job_id=$1',[job.job_id])).rows[0]).toEqual(before);
      expect(await new PlanningService(db.pool).job(principals.personal,job.job_id)).toMatchObject({status:'failed',attempts:1,error:{code:'invalid_input',provider:'boundary'},planId:null,leaseExpiresAt:null});
      expect(await runPlanningOnce(db.pool,planner)).toBe(false);
      expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rowCount).toBe(0);
    });

    for(const planKind of ['ready','manual'])test(`stored ${mode} prevents ${planKind} readiness and start without a round or altered plan`,async()=>{
      const task=await intake(db.pool);await draft(db.pool);const planning=new PlanningService(db.pool);
      if(planKind==='ready'){
        const provider=await providerFixture();try{await runPlanningOnce(db.pool,provider.engine);}finally{await provider.close();}
      }else{
        await planning.command(principals.personal,command('planning.setManualOrder',{driverId:ids.personalDriver,expectedSettingsRevision:1,expectedInputRevision:2,expectedManualRevision:0,selection:{kind:'order',taskIds:[task.taskId]}}));
      }
      const plan=(await planning.plans(principals.personal,ids.personalDriver)).items[0]!,rounds=new Rounds(db.pool);
      const start=command('round.start',{driverId:ids.personalDriver,planId:plan.planId,expectedPlanRevision:plan.revision});
      if(start.context.kind!=='device')throw new Error('device fixture required');
      const request={driverId:ids.personalDriver,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]};
      const readiness=await rounds.readiness(principals.personal,request);start.payload.readinessId=readiness.readinessId;
      await injectStoredMode(mode);
      const plans=(await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rows;
      await expect(rounds.readiness(principals.personal,{...request,deviceId:randomUUID()})).rejects.toMatchObject({code:'plan_not_startable',statusCode:409});
      const result=await rounds.start(principals.personal,start);
      expect(result.receipt).toMatchObject({businessStatus:'rejected',problem:{code:'plan_not_startable'}});
      for(const table of ['rounds','workdays','round_publications','round_admissions'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
      expect((await db.pool.query('SELECT * FROM tawsel.plan_revisions')).rows).toEqual(plans);
      expect((await db.pool.query('SELECT departure_at FROM tawsel.b2c_tasks')).rows[0].departure_at).toBeNull();
    });
  }
});
