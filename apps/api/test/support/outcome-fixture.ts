import { randomUUID } from 'node:crypto';
import type { components } from '@tawsel/api-client';
import { companyPlanningFixture } from './planning-company-fixture.js';
import type { createTestDatabase } from './database.js';
import { Rounds } from '../../src/rounds/service.js';
import { money } from '../../src/outcomes/arithmetic.js';
import type { ActionEnvelope,CommandResult } from '../../src/commands/kernel.js';

type StartTransport=(args:{principal:Awaited<ReturnType<typeof companyPlanningFixture>>['principal'];readiness:components['schemas']['RoundReadinessRequest'];start:ActionEnvelope})=>Promise<CommandResult>;

export async function outcomeCompanyFixture(db:Awaited<ReturnType<typeof createTestDatabase>>,overrides:Partial<components['schemas']['B2bSourceSnapshot']>[]= [{},{}],startTransport?:StartTransport,options:{issuer?:string}={}){
 const f=await companyPlanningFixture(db,options);
 try{
  const tasks:string[]=[];
  for(let i=0;i<overrides.length;i++){
   const externalId=`shipment-${i}`,snapshot:components['schemas']['B2bSourceSnapshot']={externalId,sourceDispatchCycleId:'cycle',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'branch',recipientName:'عميل بنفس العنوان',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24}},splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'pieces',description:'قطع',quantity:3,unitDue:money(10000)}],shippingDue:money(5000),totalDue:money(35000),priority:'ordinary',...overrides[i]};
   const result=await f.post('intake.submitSnapshot',snapshot);tasks.push((result.json() as {response:{body:{tasks:{taskId:string}[]}}}).response.body.tasks[0]!.taskId);
   await f.post('assignment.receiveBatch',{driverExternalId:'policy-driver',receiptAsserted:true,items:[{externalId,sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}]});
  }
  await f.save();const state=await f.service.plans(f.principal,f.driverId);
  await f.service.command(f.principal,f.planCommand('planning.setManualOrder',{expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds:tasks}}));
  const plan=(await f.service.plans(f.principal,f.driverId)).items[0]!,start=f.planCommand('round.start',{planId:plan.planId,expectedPlanRevision:plan.revision});
  if(start.context.kind!=='device')throw new Error('device');
  const rounds=new Rounds(db.pool),readiness={driverId:f.driverId,deviceId:start.context.deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]};
  const response=await (async()=>{if(startTransport)return startTransport({principal:f.principal,readiness,start});const ready=await rounds.readiness(f.principal,readiness);start.payload.readinessId=ready.readinessId;return rounds.start(f.principal,start);})();
  const round=(response.response!.body as components['schemas']['RoundStartResult']).round;
  const make=(index=0,operation='outcome.recordFull',extra:Record<string,unknown>={},revision=0,current:string|null=null):ActionEnvelope=>{
   const taskId=tasks[index]!,m=plan.input.members.find(m=>m.taskId===taskId)!;
   const c=f.planCommand(operation,{roundId:round.roundId,taskId,attemptId:m.attemptId,expectedActivityRevision:revision,expectedCurrentAttemptId:current,expectedSourceRevision:m.sourceRevision,expectedAssignmentRevision:m.assignmentRevision,expectedPinRevision:m.pinRevision,...extra});delete c.payload.driverId;c.context={...start.context};c.actionId=randomUUID();return c;
  };
  return {...f,tasks,plan,start,round,make};
 }catch(error){await f.close();throw error;}
}
