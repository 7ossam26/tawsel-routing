import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { PlanningService } from '../../src/planning/service.js';
import { Rounds } from '../../src/rounds/service.js';
import { ids, principals } from './access-fixture.js';
import { command, intake, draft } from './planning-fixture.js';
/** Real intake/manual/start, fixture principal only. No execution rows seeded. */
export async function startedFixture(pool:Pool,count=3){
 const tasks:Awaited<ReturnType<typeof intake>>[]=[];for(let i=0;i<count;i++)tasks.push(await intake(pool,i,['منى عبد الرحمن','حسام الدين محمد عبد الله وشركاؤه لاستلام الطلبات','سارة فؤاد'][i]??'عميل'));await draft(pool);
 const planning=new PlanningService(pool),state=await planning.plans(principals.personal,ids.personalDriver);
 await planning.command(principals.personal,command('planning.setManualOrder',{driverId:ids.personalDriver,expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:tasks.map(t=>t.taskId)}}));
 const plan=(await planning.plans(principals.personal,ids.personalDriver)).items[0]!,start=command('round.start',{driverId:ids.personalDriver,planId:plan.planId,expectedPlanRevision:plan.revision});
 if(start.context.kind!=='device')throw new Error('device');
 const rounds=new Rounds(pool),ready=await rounds.readiness(principals.personal,{driverId:ids.personalDriver,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});
 start.payload.readinessId=ready.readinessId;
 const result=await rounds.start(principals.personal,start),round=(result.response!.body as components['schemas']['RoundStartResult']).round;
 const make=(index=0,revision=0,previous:string|null=null,operation='current.selectHeading')=>{
  const taskId=tasks[index]!.taskId,m=plan.input.members.find(m=>m.taskId===taskId)!;
  const c=command(operation,{roundId:round.roundId,taskId,attemptId:m.attemptId,expectedActivityRevision:revision,expectedCurrentAttemptId:previous,expectedSourceRevision:m.sourceRevision,expectedAssignmentRevision:m.assignmentRevision,expectedPinRevision:m.pinRevision});c.context={...start.context};return c;
 };
 return {tasks,plan,round,start,make,planning};
}
