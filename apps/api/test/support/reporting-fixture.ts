import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {intake,draft,providerFixture,command} from './planning-fixture.js';
import {principals,ids} from './access-fixture.js';
import {PlanningService} from '../../src/planning/service.js';
import {runPlanningOnce} from '../../src/planning/worker.js';
import {Rounds} from '../../src/rounds/service.js';
/** Actual intake -> controlled HTTP routing provider -> worker forecast commit
 * -> online start baseline. Never inserts a historical forecast fixture. */
export async function reportingFixture(pool:Pool,count=2,principal=principals.personal){
 const provider=await providerFixture();
 try{
  const tasks:Awaited<ReturnType<typeof intake>>[]=[];for(let n=0;n<count;n++)tasks.push(await intake(pool,n,'عميل '+(n+1),principal));
  await draft(pool,0,{plannedStartAt:new Date().toISOString()},principal);
  await runPlanningOnce(pool,provider.engine);
  const planning=new PlanningService(pool),plan=(await planning.plans(principal,ids.personalDriver)).items[0]!;
  if(plan.state!=='ready')throw new Error('Real worker did not produce ready forecast');
  const start=command('round.start',{driverId:ids.personalDriver,planId:plan.planId,expectedPlanRevision:plan.revision});
  start.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};
  if(start.context.kind!=='device')throw new Error('device');
  const rounds=new Rounds(pool),ready=await rounds.readiness(principal,{driverId:ids.personalDriver,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});start.payload.readinessId=ready.readinessId;
  const response=await rounds.start(principal,start),round=(response.response!.body as components['schemas']['RoundStartResult']).round;
  const make=(index:number,operation:string,revision=0,current:string|null=null)=>{
   const m=plan.input.members.find(m=>m.taskId===tasks[index]!.taskId)!;
   const c=command(operation,{roundId:round.roundId,taskId:m.taskId,attemptId:m.attemptId,expectedActivityRevision:revision,expectedCurrentAttemptId:current,expectedSourceRevision:m.sourceRevision,expectedAssignmentRevision:m.assignmentRevision,expectedPinRevision:m.pinRevision});c.context={...start.context};return c;
  };
  return {tasks,plan,start,round,planning,make,provider,async close(){await provider.close();}};
 }catch(e){await provider.close();throw e;}
}
