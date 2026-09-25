import {beforeEach,afterEach,test,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {deferred,observeDatabaseBlock} from '../support/barriers.js';
import {claimPlanningJob,persistPlanningResult} from '../../src/planning/worker.js';
import type {components} from '@tawsel/api-client';
import {createTestDatabase} from '../support/database.js';
import {prepareAccessFixture} from '../support/access-fixture.js';
import {outcomeCompanyFixture} from '../support/outcome-fixture.js';
import {operatorToken,send} from '../support/provisioning-fixture.js';
import {Outcomes} from '../../src/outcomes/service.js';
import {CurrentActivity} from '../../src/current/service.js';
import {Returns} from '../../src/returns/service.js';
import {ReturnReceiver} from '../../src/returns/receiver.js';
import {Branches} from '../../src/branch/service.js';
import type {ActionEnvelope,CommandResult} from '../../src/commands/kernel.js';
let db:Awaited<ReturnType<typeof createTestDatabase>>;
const closers:(()=>Promise<unknown>)[]=[];
beforeEach(async()=>{db=await createTestDatabase();await prepareAccessFixture(db.pool);});
afterEach(async()=>{for(const f of closers.splice(0).reverse())await f();await db?.close();});
const accepted=(r:CommandResult)=>{expect(r.receipt.businessStatus,JSON.stringify(r)).toBe('accepted');return r.response!.body as components['schemas']['BranchResult'];};
async function fixture(){
 const f=await outcomeCompanyFixture(db);closers.push(()=>f.close());
 const bootstrap=structuredClone(f.source.bootstrapCommand);bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=3;bootstrap.payload.returnCapabilities=['return.receive','return.dispose'];expect((await send(f.app,operatorToken,bootstrap)).statusCode).toBe(200);
 expect((await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch',sourceRevision:2,name:'فرع المصدر',enabled:true,location:{latitude:30.1,longitude:31.3}}))).statusCode).toBe(200);
 expect((await new Outcomes(db.pool).command(f.principal,f.make(0,'outcome.recordNoAnswer'))).receipt.businessStatus).toBe('accepted');
 const returns=new Returns(db.pool),group=(await returns.groups(f.principal)).groups[0]!,q=group.items[0]!;
 const make=(op:string,payload:object):ActionEnvelope=>{const c=f.planCommand(op,{roundId:f.round.roundId,...payload});delete c.payload.driverId;return c;};
 const offer=await returns.request(f.principal,make('return.requestHandover',{sourceBranchId:group.sourceBranchId,items:[{taskId:q.taskId,dispatchCycleId:q.dispatchCycleId,outcomeId:q.outcomeId,sourceLineId:q.sourceLineId,quantity:3}]}));
 const request=(offer.response!.body as components['schemas']['ReturnCommandResult']).request;
 const branches=new Branches(db.pool),current=new CurrentActivity(db.pool);
 const interrupt=async()=>{const s=await current.read(f.principal,f.round.roundId);return make('branch.interruptRound',{expectedActivityRevision:s.revision,expectedCurrentAttemptId:s.currentActivity?.attemptId??null,requestId:request.requestId,claims:[{itemId:request.items[0]!.itemId,quantity:2}],serviceEstimateSeconds:300});};
 const transition=(op:string,b:components['schemas']['BranchResult'])=>make(op,{expectedActivityRevision:b.activityRevision,expectedCurrentAttemptId:null,segmentId:b.branchActivity.segmentId,expectedBranchRevision:b.branchActivity.revision});
 const receipt=()=>f.source.command('return.confirmSubsetReceipt',{requestId:request.requestId,receivingBranchId:request.sourceBranchId,items:[{itemId:request.items[0]!.itemId,expectedRevision:0,quantity:2}]});
 return {...f,makeBranch:make,returns,request,branches,current,interrupt,transition,receipt,authorization:`Bearer ${f.source.token}`};
}
test('A: heading pauses visibly, branch arrival changes origin, claimed subset resumes same round preserving order/history',async()=>{
 const f=await fixture();expect((await f.current.command(f.principal,f.make(1,'current.selectHeading',{},1))).receipt.businessStatus).toBe('accepted');
 const c=await f.interrupt(),b=accepted(await f.branches.command(f.principal,c));
 expect((await f.returns.groups(f.principal)).pendingRequests).toEqual([f.request]);
 expect(b.branchActivity).toMatchObject({stage:'heading',pausedActivity:{taskId:f.tasks[1],stage:'heading'},retainedSequence:[{taskId:f.tasks[1]}]});
 expect((await f.current.read(f.principal,f.round.roundId))).toMatchObject({currentActivity:null,nextSuggestion:null,branchActivity:{stage:'heading'}});
 expect((await f.branches.command(f.principal,c)).response!.body).toEqual(b);
 expect((await f.current.command(f.principal,f.make(1,'current.selectHeading',{},b.activityRevision))).receipt.businessStatus).toBe('rejected');
 expect((await f.branches.command(f.principal,f.transition('branch.resumeRound',b))).receipt.businessStatus).toBe('rejected');
 const arrived=accepted(await f.branches.command(f.principal,f.transition('branch.recordArrival',b)));
 expect((await f.current.read(f.principal,f.round.roundId)).physicalOrigin).toMatchObject({kind:'branch-pin',coordinates:{latitude:30.1,longitude:31.3},taskId:null});
 expect((await f.branches.command(f.principal,f.transition('branch.resumeRound',arrived))).receipt.businessStatus).toBe('rejected');
 expect((await new ReturnReceiver(db.pool).command(f.authorization,'return.confirmSubsetReceipt',f.receipt())).receipt.businessStatus).toBe('accepted');
 const resumed=accepted(await f.branches.command(f.principal,f.transition('branch.resumeRound',arrived)));
 expect(resumed.branchActivity.stage).toBe('resumed');expect((await f.returns.read(f.principal,f.request.requestId)).items[0]).toMatchObject({received:2,unresolved:1,custody:{held:1}});
 expect((await f.returns.groups(f.principal)).pendingRequests?.[0]?.items[0]).toMatchObject({requested:3,received:2,unresolved:1});
 const read=await f.current.read(f.principal,f.round.roundId);expect(read).toMatchObject({branchActivity:null,currentActivity:null,nextSuggestion:{taskId:f.tasks[1]}});
 const plans=await f.service.plans(f.principal,f.driverId);expect(plans.items[0]).toMatchObject({state:'manual',routePolicy:{orderedTaskIds:[f.tasks[1]]},input:{settings:{origin:{kind:'branch-pin'}}}});
 expect(plans.items.find(p=>p.planId===b.planId)!.forecast.members.find(m=>m.taskId===f.tasks[1])).toMatchObject({membership:'paused',position:1,expectedArrivalAt:null});
 expect((await db.pool.query('SELECT round_id,first_plan_id FROM tawsel.rounds WHERE tenant_id=$1',[f.tenantId])).rows).toEqual([{round_id:f.round.roundId,first_plan_id:f.plan.planId}]);
 expect((await db.pool.query('SELECT * FROM tawsel.branch_activity_history')).rowCount).toBe(3);
});
test('A: arrived customer cannot vanish into branch service, and unknown branch coordinates do not invent a destination',async()=>{
 const f=await fixture();expect((await f.current.command(f.principal,f.make(1,'current.selectHeading',{},1))).receipt.businessStatus).toBe('accepted');
 const attempt=f.plan.input.members.find(m=>m.taskId===f.tasks[1])!.attemptId;
 expect((await f.current.command(f.principal,f.make(1,'current.recordArrival',{},2,attempt))).receipt.businessStatus).toBe('accepted');
 const result=await f.branches.command(f.principal,await f.interrupt());expect(result.receipt.businessStatus).toBe('rejected');
 expect((await f.current.read(f.principal,f.round.roundId)).currentActivity).toMatchObject({stage:'arrived',attemptId:attempt});
 expect((await db.pool.query('SELECT * FROM tawsel.branch_activities')).rowCount).toBe(0);
 expect((await new Outcomes(db.pool).command(f.principal,f.make(1,'outcome.recordNoAnswer',{},3,attempt))).receipt.businessStatus).toBe('accepted');
 expect((await send(f.app,f.source.token,f.source.command('branch.provision',{externalId:'branch',sourceRevision:3,name:'فرع المصدر',enabled:true,location:null}))).statusCode).toBe(200);
 expect((await f.branches.command(f.principal,await f.interrupt())).receipt.problem?.code).toBe('dependency_missing');
});
test('B: full capacity retains fifty customers and forecasts, rejects atomic incoming overflow, and fences stale planner completion',async()=>{
 const f=await fixture();
 for(let i=0;i<49;i++)await f.task(`extra-${i}`,'ordinary');
 const before=await f.service.plans(f.principal,f.driverId),eligible=before.items[0]!.input.members;
 expect(eligible.length).toBeGreaterThan(0);
 const claim=await claimPlanningJob(db.pool);expect(claim).toBeDefined();
 const b=accepted(await f.branches.command(f.principal,await f.interrupt()));
 expect(b.branchActivity.retainedSequence).toHaveLength(50);
 const plans=await f.service.plans(f.principal,f.driverId),segment=plans.items[0]!;
 expect(segment).toMatchObject({state:'branch',routePolicy:{method:'branch-service',orderedTaskIds:[],branchStop:{segmentId:b.branchActivity.segmentId}}});
 expect(segment.forecast.members.filter(m=>m.membership==='paused')).toHaveLength(50);
 expect(new Set(segment.forecast.members.map(m=>m.taskId)).size).toBe(51); // 50 customers plus historical return outcome
 expect((await db.pool.query("SELECT count(*) n FROM tawsel.driver_planned_stops WHERE tenant_id=$1 AND state='remaining'",[f.tenantId])).rows[0].n).toBe('50');
 expect(await persistPlanningResult(db.pool,claim!,{error:{code:'unavailable',provider:'boundary'}})).toBe(false);
 expect((await f.service.plans(f.principal,f.driverId)).items[0]!.planId).toBe(b.planId);
 for(const externalId of ['overflow-a','overflow-b'])await f.post('intake.submitSnapshot',{...f.plan.input.members.length&&{...((await f.app.inject({url:'/api/v1/intake/task?externalId=shipment-0',headers:{authorization:f.authorization}})).json().snapshot)},externalId,sourceDispatchCycleId:'cycle',sourceRevision:1,expectedSourceRevision:0});
 const addition=f.source.command('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:['overflow-a','overflow-b'].map(externalId=>({externalId,sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}))});
 const rejected=await f.app.inject({method:'POST',url:'/api/v1/intake/commands/assignment.receiveBatch',headers:{authorization:f.authorization},payload:addition});expect(rejected.statusCode,rejected.body).toBe(409);
 for(const externalId of ['overflow-a','overflow-b'])expect((await f.app.inject({url:`/api/v1/intake/task?externalId=${externalId}`,headers:{authorization:f.authorization}})).json().state).toBe('unassigned');
 const arrived=accepted(await f.branches.command(f.principal,f.transition('branch.recordArrival',b)));
 expect((await new ReturnReceiver(db.pool).command(f.authorization,'return.confirmSubsetReceipt',f.receipt())).receipt.businessStatus).toBe('accepted');
 const resumed=accepted(await f.branches.command(f.principal,f.transition('branch.resumeRound',arrived)));
 const final=(await f.service.plans(f.principal,f.driverId)).items[0]!;
 expect(final.planId).toBe(resumed.planId);expect(final.routePolicy!.orderedTaskIds).toEqual(b.branchActivity.retainedSequence.map(s=>s.taskId));
 expect(final.forecast.members.filter(m=>m.membership==='manual')).toHaveLength(50);
 expect((await db.pool.query('SELECT * FROM tawsel.rounds WHERE tenant_id=$1',[f.tenantId])).rowCount).toBe(1);
},30_000);
test.each([true,false])('B: independent receipt/resume commit boundary, receipt first=%s',async(receiptFirst)=>{
 const f=await fixture(),b=accepted(await f.branches.command(f.principal,await f.interrupt())),arrived=accepted(await f.branches.command(f.principal,f.transition('branch.recordArrival',b)));
 const one=new Pool({connectionString:db.url,max:1}),two=new Pool({connectionString:db.url,max:1});closers.push(()=>one.end(),()=>two.end());
 const holder=Number((await one.query('SELECT pg_backend_pid() pid')).rows[0].pid),waiter=Number((await two.query('SELECT pg_backend_pid() pid')).rows[0].pid),entered=deferred(),release=deferred();expect(holder).not.toBe(waiter);
 const hooks={async afterWrite(stage:string){if(stage==='domain'){entered.resolve();await release.promise;}}},resume=f.transition('branch.resumeRound',arrived),receipt=f.receipt();
 const first=receiptFirst?new ReturnReceiver(one,hooks).command(f.authorization,'return.confirmSubsetReceipt',receipt):new Branches(one,hooks).command(f.principal,resume);
 await entered.promise;const second=receiptFirst?new Branches(two).command(f.principal,resume):new ReturnReceiver(two).command(f.authorization,'return.confirmSubsetReceipt',receipt);
 try{await observeDatabaseBlock(db.pool,waiter,holder);}finally{release.resolve();}
 const [x,y]=await Promise.all([first,second]);expect(x.receipt.businessStatus).toBe(receiptFirst?'accepted':'rejected');expect(y.receipt.businessStatus).toBe('accepted');
 if(!receiptFirst){expect((await f.current.read(f.principal,f.round.roundId)).branchActivity?.stage).toBe('arrived');expect((await f.branches.command(f.principal,resume)).receipt.businessStatus).toBe('rejected');accepted(await f.branches.command(f.principal,{...resume,actionId:randomUUID()}));}
 expect((await f.current.read(f.principal,f.round.roundId)).branchActivity).toBeNull();
 expect((await f.returns.read(f.principal,f.request.requestId)).items[0]!.custody).toMatchObject({sourceQuantity:3,held:1,received:2});
});
test('B: failed receipt and branch write faults retain activity, claims, sequence and immutable baseline',async()=>{
 const f=await fixture(),c=await f.interrupt();
 for(const stage of ['domain','progress','audit','outbox','result']){
  await expect(new Branches(db.pool,{async afterWrite(at){if(at===stage)throw new Error('injected');}}).command(f.principal,c)).rejects.toThrow('injected');
  expect((await db.pool.query('SELECT * FROM tawsel.branch_activities')).rowCount).toBe(0);
  expect((await db.pool.query('SELECT * FROM tawsel.command_identities WHERE action_id=$1',[c.actionId])).rowCount).toBe(0);
 }
 const b=accepted(await f.branches.command(f.principal,c)),arrived=accepted(await f.branches.command(f.principal,f.transition('branch.recordArrival',b)));
 await expect(new ReturnReceiver(db.pool,{async afterWrite(at){if(at==='result')throw new Error('receiver unavailable');}}).command(f.authorization,'return.confirmSubsetReceipt',f.receipt())).rejects.toThrow('receiver unavailable');
 expect((await f.branches.command(f.principal,f.transition('branch.resumeRound',arrived))).receipt.problem?.code).toBe('dependency_missing');
 expect((await f.current.read(f.principal,f.round.roundId)).branchActivity).toEqual(arrived.branchActivity);
 expect((await f.returns.read(f.principal,f.request.requestId)).items[0]).toMatchObject({received:0,unresolved:3});
});
test('B: accepted addition during branch service is visibly retained in a new paused forecast and resumed once',async()=>{
 const f=await fixture(),b=accepted(await f.branches.command(f.principal,await f.interrupt()));
 const added=await f.task('during-branch','ordinary'),current=await f.current.read(f.principal,f.round.roundId);
 expect(current.branchActivity!.revision).toBe(b.branchActivity.revision+1);expect(current.branchActivity!.retainedSequence.map(s=>s.taskId)).toEqual([f.tasks[1],added]);
 const plan=(await f.service.plans(f.principal,f.driverId)).items[0]!;expect(plan.state).toBe('branch');expect(plan.forecast.members.filter(m=>m.membership==='paused').map(m=>m.taskId)).toEqual([f.tasks[1],added]);
 const updated={...b,branchActivity:current.branchActivity!},arrived=accepted(await f.branches.command(f.principal,f.transition('branch.recordArrival',updated)));
 expect((await new ReturnReceiver(db.pool).command(f.authorization,'return.confirmSubsetReceipt',f.receipt())).receipt.businessStatus).toBe('accepted');
 accepted(await f.branches.command(f.principal,f.transition('branch.resumeRound',arrived)));
 expect((await f.service.plans(f.principal,f.driverId)).items[0]!.routePolicy!.orderedTaskIds).toEqual([f.tasks[1],added]);
});
