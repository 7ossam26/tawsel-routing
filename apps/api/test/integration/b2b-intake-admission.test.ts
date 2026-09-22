import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestDatabase } from '../support/database.js';
import { migrate } from '../../src/db/migrate.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { buildApp } from '../../src/app.js';
import { bindSource, operatorToken, send } from '../support/provisioning-fixture.js';
import { conforms, type Snapshot } from '../../src/b2b-intake/schema.js';
import type { ActionEnvelope, WriteStage } from '../../src/commands/kernel.js';
import { B2bIntakeService } from '../../src/b2b-intake/service.js';
import { deferred, observeDatabaseBlock } from '../support/barriers.js';
import { RoutingEngine } from '../../src/engine/index.js';
import { loadEngineConfig } from '../../src/engine/config.js';
import { engineInput } from '../support/engine-fixtures.js';
import { createServer } from 'node:http';
import { once } from 'node:events';

describe('P10 ERP intake and atomic admission on PostgreSQL',()=>{
  let db:Awaited<ReturnType<typeof createTestDatabase>>,app:ReturnType<typeof buildApp>;
  let source:Awaited<ReturnType<typeof bindSource>>;
  const post=(command:ActionEnvelope,token=source.token)=>app.inject({method:'POST',url:`/api/v1/intake/commands/${command.operationId}`,headers:{authorization:`Bearer ${token}`},payload:command});
  const snapshot=(externalId:string=randomUUID(),patch:Partial<Snapshot>={}):Snapshot=>({externalId,sourceDispatchCycleId:'cycle-1',sourceRevision:1,expectedSourceRevision:0,
    sourceBranchExternalId:'cairo',recipientName:'عميل',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.04,longitude:31.23}},
    splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'line-1',description:'قطعة',quantity:3,unitDue:{amountMinor:10000,currency:'EGP',exponent:2}}],
    shippingDue:{amountMinor:5000,currency:'EGP',exponent:2},totalDue:{amountMinor:35000,currency:'EGP',exponent:2},priority:'ordinary',...patch});
  beforeEach(async()=>{
    db=await createTestDatabase(); await migrate(db.pool);
    app=buildApp(createDatabasePool(db.config),undefined,{issuer:'https://issuer.fixture.invalid',operatorToken}); await app.ready();
    source=await bindSource(app,['driver-1','driver-2']);
    const bootstrap=structuredClone(source.bootstrapCommand); bootstrap.actionId=randomUUID(); bootstrap.payload.sourceRevision=2; bootstrap.payload.intakeCapabilities=['intake.prepare','assignment.manage'];
    expect((await send(app,operatorToken,bootstrap)).statusCode).toBe(200);
    expect((await send(app,source.token,source.command('branch.provision',{externalId:'cairo',sourceRevision:1,name:'القاهرة',enabled:true,location:null}))).statusCode).toBe(200);
  });
  afterEach(async()=>{
    try {
      if(db) {
        const events=await db.pool.query("SELECT payload FROM tawsel.outbox_intents WHERE event_type=ANY($1::text[])",[['task.snapshotAccepted','assignment.prepared','assignment.received','assignment.withdrawn','assignment.reassigned','task.urgencyChanged']]);
        for(const event of events.rows)expect(conforms('ChangedEvent',event.payload)).toBe(true);
      }
    } finally {await app?.close();await db?.close();}
  });
  async function drivers() {
    expect((await send(app,source.token,source.command('role.defineCapabilities',{externalId:'role',sourceRevision:1,name:'Driver',capabilities:['execution.own']}))).statusCode).toBe(200);
    const ids:string[]=[];
    for(const externalId of ['driver-1','driver-2']) {
      expect((await send(app,source.token,source.command('user.provision',{externalId,sourceRevision:1,subject:externalId,roleExternalId:'role',branchExternalIds:['cairo'],enabled:true}))).statusCode).toBe(200);
      const response=await send(app,source.token,source.command('driver.provisionReference',{externalId,sourceRevision:1,userExternalId:externalId,enabled:true,profile:'car',vehicleReference:null}));
      expect(response.statusCode,response.body).toBe(200);ids.push(response.json().response.body.resourceId);
    }
    return ids;
  }
  async function tasks(count:number,patch:Partial<Snapshot>={}) {
    const items=[];
    for(let i=0;i<count;i++) {
      const p=snapshot(undefined,patch),r=await post(source.command('intake.submitSnapshot',p));
      expect(r.statusCode,r.body).toBe(200);
      items.push({externalId:p.externalId,sourceDispatchCycleId:p.sourceDispatchCycleId,expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1});
    }
    return items;
  }
  const receive=(items:Awaited<ReturnType<typeof tasks>>,driverExternalId='driver-1')=>source.command('assignment.receiveBatch',{driverExternalId,items,receiptAsserted:true});
  test('source snapshots persist exact units, immutable history and duplicate identities without cloning same-address shipments',async()=>{
    const p=snapshot(),c=source.command('intake.submitSnapshot',p),first=await post(c);
    expect(first.statusCode,first.body).toBe(200);
    const task=first.json().response.body.tasks[0]; expect(conforms('Task',task)).toBe(true); expect(task.state).toBe('unassigned'); expect(task.planningEligible).toBe(false);
    expect((await post(c)).json()).toEqual(first.json());
    expect((await post({...c,actionId:randomUUID()})).statusCode).toBe(200);
    expect((await post(source.command('intake.submitSnapshot',snapshot()))).statusCode).toBe(200);
    expect((await db.pool.query('SELECT * FROM tawsel.b2b_tasks')).rowCount).toBe(2);
    expect((await db.pool.query('SELECT * FROM tawsel.outbox_intents WHERE event_type=$1',['task.snapshotAccepted'])).rowCount).toBe(2);
    const changed=snapshot(p.externalId,{sourceRevision:2,expectedSourceRevision:1,recipientName:'تعديل'});
    expect((await post(source.command('intake.submitSnapshot',changed))).statusCode).toBe(200);
    expect((await db.pool.query('SELECT payload FROM tawsel.b2b_source_snapshots WHERE task_id=$1 ORDER BY source_revision',[task.taskId])).rows.map(r=>r.payload.recipientName)).toEqual(['عميل','تعديل']);
    await expect(db.pool.query('UPDATE tawsel.b2b_source_lines SET quantity=2 WHERE task_id=$1',[task.taskId])).rejects.toThrow('append-only');
    expect((await post(source.command('intake.submitSnapshot',p))).json().receipt.problem.code).toBe('stale_revision');
    expect((await post(source.command('intake.submitSnapshot',{...changed,recipientName:'collision'}))).json().receipt.problem.code).toBe('idempotency_conflict');
  });
  test('rejects fractional pieces, missing allocations, mixed currencies, overflow and aggregate deposits before persistence',async()=>{
    const p=snapshot(); const invalid:Record<string,unknown>[]=[
      {...p,lines:[{...p.lines[0],quantity:1.5}]}, {...p,shippingDue:undefined}, {...p,depositMinor:1000}, {...p,allocation:'unknown'},
      {...p,lines:[{...p.lines[0],unitDue:{amountMinor:10000,currency:'USD',exponent:2}}]}, {...p,totalDue:{...p.totalDue,amountMinor:1}},
      {...p,lines:[{...p.lines[0],unitDue:{...p.lines[0]!.unitDue,amountMinor:Number.MAX_SAFE_INTEGER}}]},
      {...p,lines:[p.lines[0],p.lines[0]]}
    ];
    for(const data of invalid){ const response=await post(source.command('intake.submitSnapshot',data)); expect([400,422],response.body).toContain(response.statusCode); }
    for(const table of ['b2b_tasks','b2b_source_snapshots','b2b_source_lines','b2b_dispatch_cycles']) expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
    const prepaid=snapshot(undefined,{lines:[{...p.lines[0]!,unitDue:{...p.lines[0]!.unitDue,amountMinor:0}}],shippingDue:{...p.shippingDue,amountMinor:0},totalDue:{...p.totalDue,amountMinor:0}});
    expect((await post(source.command('intake.submitSnapshot',prepaid))).statusCode).toBe(200);
  });
  test('credentials, tenant/source and branch scope cannot be selected or impersonated by payload',async()=>{
    const p=snapshot(),c=source.command('intake.submitSnapshot',p);
    expect((await post(c,'invalid')).statusCode).toBe(401);
    expect((await post({...c,context:{...c.context,tenantId:randomUUID()}})).statusCode).toBe(403);
    expect((await post({...c,context:{kind:'integration',tenantId:source.tenantId,integrationId:source.integrationId,assertedActorId:randomUUID()}})).statusCode).toBe(400);
    expect((await post(source.command('intake.submitSnapshot',{...p,sourceBranchExternalId:'unknown'}))).statusCode).toBe(404);
    const other=await bindSource(app,[],source.tenantId);
    expect((await post(other.command('intake.submitSnapshot',p),other.token)).statusCode).toBe(403);
    expect((await post(c)).statusCode).toBe(200);
    const response=await app.inject({method:'GET',url:`/api/v1/intake/task?externalId=${p.externalId}`,headers:{authorization:`Bearer ${source.token}`}});
    expect(response.statusCode).toBe(200);expect(conforms('Task',response.json())).toBe(true);
  });
  test('49 remaining plus two rejects the entire batch, including assignment/history/replan/outbox writes',async()=>{
    await drivers();const initial=await tasks(49);expect((await post(receive(initial))).statusCode).toBe(200);
    const added=await tasks(2),command=receive(added),result=await post(command);
    expect(result.statusCode,result.body).toBe(409);expect(result.json().receipt.problem.code).toBe('capacity_exceeded');
    expect((await post(command)).json()).toEqual(result.json());
    expect((await db.pool.query("SELECT * FROM tawsel.b2b_dispatch_cycles WHERE state='held'")).rowCount).toBe(49);
    for(const table of ['b2b_assignment_history','intake_replan_intents','outbox_intents']) expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[command.actionId])).rowCount).toBe(0);
    expect((await db.pool.query('SELECT business_status FROM tawsel.command_identities WHERE action_id=$1',[command.actionId])).rows[0]?.business_status).toBe('rejected');
    expect((await db.pool.query('SELECT kind FROM tawsel.command_audit WHERE action_id=$1',[command.actionId])).rows[0]?.kind).toBe('rejected-evidence');
    expect((await db.pool.query('SELECT * FROM tawsel.command_evidence WHERE action_id=$1',[command.actionId])).rowCount).toBe(1);
  });
  test('prepared is upcoming; receipt is durable and eligible only after confirmation, independent of an Engine worker',async()=>{
    await drivers();const items=await tasks(2);
    const prepare=source.command('intake.prepare',{driverExternalId:'driver-1',items});
    const p=await post(prepare); expect(p.statusCode,p.body).toBe(200);
    expect(p.json().response.body.tasks.every((t:{state:string;receivedAt:null;planningEligible:boolean})=>t.state==='prepared'&&t.receivedAt===null&&!t.planningEligible)).toBe(true);
    expect((await db.pool.query('SELECT * FROM tawsel.driver_planned_stops')).rowCount).toBe(0);
    expect((await db.pool.query('SELECT * FROM tawsel.intake_replan_intents')).rowCount).toBe(0);
    const command=receive(items.map(i=>({...i,assignmentRevision:2,expectedAssignmentRevision:1})));
    const result=await post(command); expect(result.statusCode,result.body).toBe(200);
    expect(result.json().response.body.tasks.every((t:{state:string;receivedAt:string;planningEligible:boolean;planningStatus:string})=>t.state==='held'&&!!t.receivedAt&&t.planningEligible&&t.planningStatus==='pending')).toBe(true);
    // P12: real controlled HTTP failure AFTER the actual receipt commit. This is
    // not a mock transaction and the adapter has no authority to undo receipt.
    const provider=createServer((_req,res)=>{res.statusCode=503;res.end('Engine down');});
    provider.listen(0,'127.0.0.1');await once(provider,'listening');
    const address=provider.address();if(!address||typeof address==='string')throw new Error('listen');
    try {
      const engine=new RoutingEngine({...loadEngineConfig({}),vroom:`http://127.0.0.1:${address.port}`});
      await expect(engine.optimize(engineInput)).rejects.toMatchObject({code:'http_error',provider:'vroom'});
    } finally {provider.closeAllConnections();await new Promise<void>(resolve=>provider.close(()=>resolve()));}
    // Fresh independent pool after acceptance and dependency failure.
    const fresh=createDatabasePool(db.config);
    try {
      expect((await new B2bIntakeService(fresh).get(`Bearer ${source.token}`,items[0]!.externalId)).state).toBe('held');
      expect((await fresh.query(`SELECT i.status,j.status AS job_status FROM tawsel.intake_replan_intents i
        JOIN tawsel.planning_jobs j USING(tenant_id,job_id)`)).rows).toEqual([{status:'linked',job_status:'pending'}]);
      expect((await fresh.query('SELECT business_status FROM tawsel.command_identities WHERE action_id=$1',[command.actionId])).rows[0].business_status).toBe('accepted');
      expect((await fresh.query('SELECT count(*)::int n FROM tawsel.outbox_intents WHERE action_id=$1',[command.actionId])).rows[0].n).toBeGreaterThan(0);
    } finally {await fresh.end();}
    expect((await post(command)).json()).toEqual(result.json());
    expect((await post({...command,actionId:randomUUID()})).statusCode).toBe(200);
    expect((await db.pool.query('SELECT * FROM tawsel.b2b_assignment_history')).rowCount).toBe(4);
  });
  test('independent concurrent batches observe the driver lock and only one whole batch fits',async()=>{
    await drivers(); expect((await post(receive(await tasks(48)))).statusCode).toBe(200);
    const a=receive(await tasks(2)),b=receive(await tasks(2));
    const held=deferred<number>(),waiter=deferred<number>(),release=deferred();
    const poolA=createDatabasePool(db.config),poolB=createDatabasePool(db.config);
    const first=new B2bIntakeService(poolA,{async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);await release.promise;}}});
    const second=new B2bIntakeService(poolB,{async afterWrite(stage,tx){if(stage==='identity')waiter.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);}});
    const accepting=first.command(`Bearer ${source.token}`,'assignment.receiveBatch',a);
    let competing:ReturnType<B2bIntakeService['command']>|undefined;
    try {
      const holderPid=await held.promise;
      const pending=await app.inject({url:`/api/v1/intake/results/${a.actionId}`,headers:{authorization:`Bearer ${source.token}`}});
      expect(pending.statusCode).toBe(202);expect(pending.json().result).toBeUndefined();
      competing=second.command(`Bearer ${source.token}`,'assignment.receiveBatch',b);
      const waiterPid=await waiter.promise;expect(waiterPid).not.toBe(holderPid);
      await observeDatabaseBlock(db.pool,waiterPid,holderPid);release.resolve();
      const results=await Promise.all([accepting,competing]);expect(results.map(r=>r.receipt.businessStatus)).toEqual(['accepted','rejected']);
      expect(results[1]!.receipt.problem?.code).toBe('capacity_exceeded');
      expect((await db.pool.query("SELECT * FROM tawsel.driver_planned_stops WHERE state='remaining'")).rowCount).toBe(50);
      expect((await db.pool.query('SELECT * FROM tawsel.b2b_assignment_history WHERE action_id=$1',[b.actionId])).rowCount).toBe(0);
    } finally {release.resolve();await Promise.allSettled([accepting,...(competing?[competing]:[])]);await poolA.end();await poolB.end();}
  });
  test('capacity includes branch visits, excludes completed/prepared/unresolved/future work, and is not a day total',async()=>{
    const [driverId]=await drivers();
    const branchId=(await db.pool.query('SELECT branch_id FROM tawsel.branches WHERE tenant_id=$1',[source.tenantId])).rows[0].branch_id;
    // Explicit future-phase ledger fixture, not a claim that branch planning exists.
    await db.pool.query(`INSERT INTO tawsel.driver_planned_stops(tenant_id,driver_id,stop_id,kind,branch_id,state)
      SELECT $1,$2,gen_random_uuid(),'branch',$3,'completed' FROM generate_series(1,55)`,[source.tenantId,driverId,branchId]);
    await db.pool.query(`INSERT INTO tawsel.driver_planned_stops(tenant_id,driver_id,stop_id,kind,branch_id,state) VALUES ($1,$2,$3,'branch',$4,'remaining')`,[source.tenantId,driverId,randomUUID(),branchId]);
    expect((await post(receive(await tasks(48)))).statusCode).toBe(200);
    expect((await post(receive(await tasks(2)))).json().receipt.problem.code).toBe('capacity_exceeded');
    const unresolved=await tasks(2,{destination:{kind:'address',addressText:'عنوان غير محسوم'}});
    const future=await tasks(2,{earliestAt:'2099-01-01T00:00:00Z'});
    expect((await post(receive([...unresolved,...future]))).statusCode).toBe(200);
    expect((await post(source.command('intake.prepare',{driverExternalId:'driver-1',items:await tasks(2)}))).statusCode).toBe(200);
    expect((await db.pool.query("SELECT * FROM tawsel.driver_planned_stops WHERE state='remaining'")).rowCount).toBe(49);
    expect((await db.pool.query("SELECT * FROM tawsel.b2b_dispatch_cycles WHERE state='held'")).rowCount).toBe(52);
  });
  test('every accepted-command fault rolls back tasks, assignment, audit, identity, reservations and intents',async()=>{
    await drivers();const items=await tasks(2);
    for(const stage of ['identity','domain','progress','audit','outbox','result'] as WriteStage[]) {
      const command=receive(items);
      const service=new B2bIntakeService(db.pool,{async afterWrite(at){if(at===stage)throw new Error(`fault-${stage}`);}});
      await expect(service.command(`Bearer ${source.token}`,'assignment.receiveBatch',command)).rejects.toThrow(`fault-${stage}`);
      for(const table of ['command_identities','command_audit','outbox_intents','intake_replan_intents','b2b_assignment_history']) expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[command.actionId])).rowCount).toBe(0);
      expect((await db.pool.query('SELECT * FROM tawsel.driver_planned_stops')).rowCount).toBe(0);
      expect((await db.pool.query("SELECT * FROM tawsel.b2b_dispatch_cycles WHERE state<>'unassigned'")).rowCount).toBe(0);
    }
  });
  test('driver source, enabled membership and originating-branch compatibility are mandatory',async()=>{
    await drivers();const items=await tasks(1);
    expect((await post(receive(items,'unknown'))).json().receipt.problem.code).toBe('dependency_missing');
    await send(app,source.token,source.command('user.setBranchMemberships',{externalId:'driver-1',sourceRevision:2,branchExternalIds:[]}));
    expect((await post(receive(items))).json().receipt.problem.code).toBe('forbidden_resource');
    expect((await post(receive(items,'driver-2'))).statusCode).toBe(200);
    await send(app,source.token,source.command('user.disable',{externalId:'driver-2',sourceRevision:2}));
    expect((await post(receive(await tasks(1),'driver-2'))).json().receipt.problem.code).toBe('forbidden_resource');
  });
  test('ordinary predeparture revision, reassignment and withdrawal preserve source/cycle/history without reasons',async()=>{
    const [a,b]=await drivers(),items=await tasks(2),received=await post(receive(items));expect(received.statusCode).toBe(200);
    const initial=received.json().response.body.tasks;
    const p=initial[0].snapshot as Snapshot;
    expect((await post(source.command('intake.submitSnapshot',{...p,expectedSourceRevision:1,sourceRevision:2,recipientName:'مصَحّح'}))).statusCode).toBe(200);
    const item={...items[0]!,expectedSourceRevision:2,expectedAssignmentRevision:1,assignmentRevision:2};
    const reassignment=source.command('assignment.reassignBeforeDeparture',{...item,driverExternalId:'driver-2',receiptAsserted:true});
    const reassigned=await post(reassignment);expect(reassigned.statusCode,reassigned.body).toBe(200);
    const changed=reassigned.json().response.body.tasks[0];expect(changed.driverId).toBe(b);expect(changed.taskId).toBe(initial[0].taskId);expect(changed.dispatchCycleId).toBe(initial[0].dispatchCycleId);
    expect((await post(reassignment)).json()).toEqual(reassigned.json());
    expect((await post(source.command('assignment.reassignBeforeDeparture',{...item,driverExternalId:'driver-1',receiptAsserted:true}))).json().receipt.problem.code).toBe('idempotency_conflict');
    const withdraw=source.command('assignment.withdraw',{...item,expectedAssignmentRevision:2,assignmentRevision:3});
    const withdrawn=await post(withdraw);expect(withdrawn.statusCode,withdrawn.body).toBe(200);expect(withdrawn.json().response.body.tasks[0].state).toBe('withdrawn');
    expect((await db.pool.query('SELECT state FROM tawsel.b2b_assignment_history WHERE dispatch_cycle_id=$1 ORDER BY assignment_revision',[initial[0].dispatchCycleId])).rows.map(r=>[r.state.state,r.state.driverId])).toEqual([['held',a],['held',b],['withdrawn',null]]);
    expect((await db.pool.query("SELECT driver_id FROM tawsel.driver_planned_stops WHERE state='remaining'")).rows).toEqual([{driver_id:a}]);
    expect((await db.pool.query('SELECT * FROM tawsel.b2b_tasks')).rowCount).toBe(2);
    expect((await post(receive(items))).json().receipt.businessStatus).toBe('rejected');
    const oldResult=await post({...receive(items),actionId:received.json().receipt.actionId});
    expect(oldResult.json()).toEqual(received.json()); // historical receipt does not restore withdrawn work
  });
  test('reassignment into full destination rolls back holder, revisions, history and both replan intents',async()=>{
    const [a,b]=await drivers();const incoming=await tasks(1);expect((await post(receive(incoming))).statusCode).toBe(200);
    expect((await post(receive(await tasks(50),'driver-2'))).statusCode).toBe(200);
    const command=source.command('assignment.reassignBeforeDeparture',{...incoming[0]!,expectedAssignmentRevision:1,assignmentRevision:2,driverExternalId:'driver-2',receiptAsserted:true});
    const response=await post(command);expect(response.json().receipt.problem.code).toBe('capacity_exceeded');
    const task=await new B2bIntakeService(db.pool).get(`Bearer ${source.token}`,incoming[0]!.externalId);
    expect(task.driverId).toBe(a);expect(task.assignmentRevision).toBe(1);
    expect((await db.pool.query("SELECT * FROM tawsel.driver_planned_stops WHERE driver_id=$1 AND state='remaining'",[b])).rowCount).toBe(50);
    for(const table of ['b2b_assignment_history','intake_replan_intents','outbox_intents'])expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[command.actionId])).rowCount).toBe(0);
  });
  test('source changes that newly require route capacity are atomic; price/content cannot change after the departure hook',async()=>{
    await drivers();expect((await post(receive(await tasks(50)))).statusCode).toBe(200);
    const missing=await tasks(1,{destination:{kind:'address',addressText:'عنوان'}});expect((await post(receive(missing))).statusCode).toBe(200);
    const service=new B2bIntakeService(db.pool),old=await service.get(`Bearer ${source.token}`,missing[0]!.externalId);
    const revise=source.command('intake.submitSnapshot',{...old.snapshot,sourceRevision:2,expectedSourceRevision:1,destination:snapshot().destination});
    expect((await post(revise)).json().receipt.problem.code).toBe('capacity_exceeded');
    expect((await service.get(`Bearer ${source.token}`,old.externalId)).sourceRevision).toBe(1);
    expect((await db.pool.query('SELECT * FROM tawsel.b2b_source_snapshots WHERE action_id=$1',[revise.actionId])).rowCount).toBe(0);
    // Explicit future-start fixture only; P15 must implement the actual start race.
    await db.pool.query('UPDATE tawsel.b2b_dispatch_cycles SET departure_at=clock_timestamp() WHERE dispatch_cycle_id=$1',[old.dispatchCycleId]);
    for(const command of [source.command('intake.submitSnapshot',{...old.snapshot,sourceRevision:2,expectedSourceRevision:1,recipientName:'تغيير'}),
      source.command('intake.setUrgencyBeforeDeparture',{externalId:old.externalId,sourceDispatchCycleId:'cycle-1',sourceRevision:2,expectedSourceRevision:1,priority:'urgent'}),
      source.command('assignment.withdraw',{...missing[0]!,expectedAssignmentRevision:1,assignmentRevision:2}),
      source.command('assignment.reassignBeforeDeparture',{...missing[0]!,expectedAssignmentRevision:1,assignmentRevision:2,driverExternalId:'driver-2',receiptAsserted:true})]) {
      expect((await post(command)).json().receipt.problem.code).toBe('departed_edit_forbidden');
    }
    expect((await service.get(`Bearer ${source.token}`,old.externalId)).snapshot).toEqual(old.snapshot);
  });
  test('urgency shares the source revision stream; prepared reassignment does not assert receipt',async()=>{
    await drivers();const items=await tasks(1);expect((await post(source.command('intake.prepare',{driverExternalId:'driver-1',items}))).statusCode).toBe(200);
    const command=source.command('intake.setUrgencyBeforeDeparture',{externalId:items[0]!.externalId,sourceDispatchCycleId:'cycle-1',expectedSourceRevision:1,sourceRevision:2,priority:'urgent'});
    expect((await post(command)).statusCode).toBe(200);expect((await post({...command,actionId:randomUUID()})).statusCode).toBe(200);
    const moved=await post(source.command('assignment.reassignBeforeDeparture',{...items[0]!,expectedSourceRevision:2,expectedAssignmentRevision:1,assignmentRevision:2,driverExternalId:'driver-2',receiptAsserted:false}));
    expect(moved.statusCode,moved.body).toBe(200);expect(moved.json().response.body.tasks[0]).toMatchObject({state:'prepared',receivedAt:null,planningEligible:false,snapshot:{priority:'urgent'}});
    expect((await db.pool.query('SELECT * FROM tawsel.intake_replan_intents')).rowCount).toBe(0);
    expect((await post(receive(items,'driver-2'))).json().receipt.problem.code).toBe('stale_revision');
  });
  test('scoped pagination and batch recovery distinguish source pending, accepted and rejected without leaking other sources',async()=>{
    await drivers();const items=await tasks(3);const command=receive(items.slice(0,2));const response=await post(command);expect(response.statusCode).toBe(200);
    expect((await post(source.command('intake.prepare',{driverExternalId:'driver-1',items:items.slice(2)}))).statusCode).toBe(200);
    const get=(url:string,token=source.token)=>app.inject({url,headers:{authorization:`Bearer ${token}`}});
    const first=await get('/api/v1/intake/tasks?state=held&limit=1');expect(first.json().items).toHaveLength(1);expect(conforms('TaskList',first.json())).toBe(true);
    const next=await get(`/api/v1/intake/tasks?state=held&limit=1&cursor=${first.json().nextCursor}`);expect(next.json().items).toHaveLength(1);expect(next.json().items[0].taskId).not.toBe(first.json().items[0].taskId);expect(next.json().nextCursor).toBeUndefined();
    expect((await get('/api/v1/intake/tasks?state=prepared')).json().items).toHaveLength(1);
    const known=await get(`/api/v1/intake/results/${command.actionId}`);expect(known.json()).toEqual({actionId:command.actionId,status:'accepted',result:response.json()});expect(conforms('BatchResult',known.json())).toBe(true);
    const unknown=await get(`/api/v1/intake/results/${randomUUID()}`);expect(unknown.statusCode).toBe(202);expect(unknown.json().status).toBe('pending');expect(unknown.json().result).toBeUndefined();
    const other=await bindSource(app,[],source.tenantId);const grant=structuredClone(other.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=2;grant.payload.intakeCapabilities=['intake.prepare','assignment.manage'];expect((await send(app,operatorToken,grant)).statusCode).toBe(200);
    expect((await get('/api/v1/intake/tasks',other.token)).json().items).toEqual([]);
    expect((await get(`/api/v1/intake/task?externalId=${items[0]!.externalId}`,other.token)).statusCode).toBe(404);
    expect((await get(`/api/v1/intake/results/${command.actionId}`,other.token)).statusCode).toBe(202);
    const cross=other.command('assignment.withdraw',{...items[0]!,expectedAssignmentRevision:1,assignmentRevision:2});expect((await post(cross,other.token)).statusCode).toBe(404);
    expect((await send(app,source.token,source.command('branch.disable',{externalId:'cairo',sourceRevision:2}))).statusCode).toBe(200);
    expect((await get('/api/v1/intake/tasks')).json().items).toEqual([]);
    expect((await post(command)).statusCode).toBe(404);expect((await get(`/api/v1/intake/results/${command.actionId}`)).statusCode).toBe(404);
  });
  test('new snapshot faults leave no task/cycle/line/command/audit/outbox residue',async()=>{
    for(const stage of ['domain','outbox','result'] as WriteStage[]) {
      const p=snapshot(),command=source.command('intake.submitSnapshot',p);
      const service=new B2bIntakeService(db.pool,{async afterWrite(at){if(at===stage)throw new Error('snapshot-fault');}});
      await expect(service.command(`Bearer ${source.token}`,'intake.submitSnapshot',command)).rejects.toThrow('snapshot-fault');
      expect((await db.pool.query('SELECT * FROM tawsel.b2b_tasks WHERE external_id=$1',[p.externalId])).rowCount).toBe(0);
      for(const table of ['b2b_dispatch_cycles','b2b_source_lines','b2b_source_snapshots'])expect((await db.pool.query(`SELECT * FROM tawsel.${table}`)).rowCount).toBe(0);
      for(const table of ['command_identities','command_audit','outbox_intents'])expect((await db.pool.query(`SELECT * FROM tawsel.${table} WHERE action_id=$1`,[command.actionId])).rowCount).toBe(0);
    }
  });
  test('concurrent duplicate source submissions and receipt revisions preserve one identity and one receipt transition',async()=>{
    await drivers();const p=snapshot();
    const creates=await Promise.all([post(source.command('intake.submitSnapshot',p)),post(source.command('intake.submitSnapshot',p))]);
    expect(creates.map(r=>r.statusCode)).toEqual([200,200]);
    const reference={externalId:p.externalId,sourceDispatchCycleId:p.sourceDispatchCycleId,expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1};
    const receipts=await Promise.all([post(receive([reference])),post(receive([reference]))]);
    expect(receipts.map(r=>r.statusCode)).toEqual([200,200]);
    expect((await db.pool.query('SELECT * FROM tawsel.b2b_tasks')).rowCount).toBe(1);
    expect((await db.pool.query('SELECT * FROM tawsel.b2b_assignment_history')).rowCount).toBe(1);
    expect((await db.pool.query("SELECT * FROM tawsel.outbox_intents WHERE event_type='assignment.received'")).rowCount).toBe(1);
    expect((await db.pool.query('SELECT * FROM tawsel.intake_replan_intents')).rowCount).toBe(1);
  });
  test('receipt waiting on a source revision cannot accept a superseded snapshot',async()=>{
    await drivers();const items=await tasks(1),task=await new B2bIntakeService(db.pool).get(`Bearer ${source.token}`,items[0]!.externalId);
    const changed=source.command('intake.submitSnapshot',{...task.snapshot,sourceRevision:2,expectedSourceRevision:1,recipientName:'revision two'});
    const held=deferred<number>(),waiting=deferred<number>(),release=deferred();
    const poolA=createDatabasePool(db.config),poolB=createDatabasePool(db.config);
    const writer=new B2bIntakeService(poolA,{async afterWrite(stage,tx){if(stage==='domain'){held.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);await release.promise;}}});
    const receiver=new B2bIntakeService(poolB,{async afterWrite(stage,tx){if(stage==='identity')waiting.resolve((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);}});
    const updating=writer.command(`Bearer ${source.token}`,'intake.submitSnapshot',changed);
    let admitting:ReturnType<B2bIntakeService['command']>|undefined;
    try {
      const pid=await held.promise;admitting=receiver.command(`Bearer ${source.token}`,'assignment.receiveBatch',receive(items));
      await observeDatabaseBlock(db.pool,await waiting.promise,pid);release.resolve();
      expect((await updating).receipt.businessStatus).toBe('accepted');expect((await admitting).receipt.problem?.code).toBe('stale_revision');
      const current=await new B2bIntakeService(db.pool).get(`Bearer ${source.token}`,task.externalId);expect(current.sourceRevision).toBe(2);expect(current.state).toBe('unassigned');
    } finally {release.resolve();await Promise.allSettled([updating,...(admitting?[admitting]:[])]);await poolA.end();await poolB.end();}
  });
  test('identical external shipment IDs across sources and tenants stay separate, including DB history ownership',async()=>{
    const p=snapshot('same-external');const first=await post(source.command('intake.submitSnapshot',p));expect(first.statusCode).toBe(200);
    const firstTask=first.json().response.body.tasks[0];
    for(const tenantId of [source.tenantId,randomUUID()]) {
      const other=await bindSource(app,[],tenantId);const grant=structuredClone(other.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=2;grant.payload.intakeCapabilities=['intake.prepare','assignment.manage'];expect((await send(app,operatorToken,grant)).statusCode).toBe(200);
      expect((await send(app,other.token,other.command('branch.provision',{externalId:'cairo',sourceRevision:1,name:'Other Cairo',enabled:true,location:null}))).statusCode).toBe(200);
      const accepted=await post(other.command('intake.submitSnapshot',p),other.token);expect(accepted.statusCode,accepted.body).toBe(200);expect(accepted.json().response.body.tasks[0].taskId).not.toBe(firstTask.taskId);
      const list=await app.inject({url:'/api/v1/intake/tasks',headers:{authorization:`Bearer ${other.token}`}});expect(list.json().items).toHaveLength(1);expect(list.json().items[0].taskId).not.toBe(firstTask.taskId);
      if(tenantId===source.tenantId) await expect(db.pool.query(`INSERT INTO tawsel.b2b_assignment_history(tenant_id,dispatch_cycle_id,assignment_revision,state,source_id,action_id)
        VALUES($1,$2,1,'{}',$3,$4)`,[tenantId,firstTask.dispatchCycleId,other.integrationId,accepted.json().receipt.actionId])).rejects.toThrow(/foreign key/);
    }
  });
});
