/** Public-only driver side of the two-task reference. The supplied fetcher must
 * carry a genuine separate Tawsel browser session, never an ERP service token. */
import {randomUUID} from 'node:crypto';
import type {components} from '@tawsel/api-client';
import {PlanningClient,type PlanningCommand} from '@tawsel/api-client/planning';
import {RoundsClient} from '@tawsel/api-client/rounds';
import {OutcomesClient} from '@tawsel/api-client/outcomes';
import {ReturnsClient} from '@tawsel/api-client/returns';
import {CurrentClient} from '@tawsel/api-client/current';
import {publicValidator} from '@tawsel/api-client/validation';
type S=components['schemas'];
export async function driveSourceTasks(fetcher:typeof fetch,taskIds:string[]){
 if(taskIds.length!==2)throw new Error('Exactly two task IDs required');
 const validate=publicValidator(),session=await fetcher('/api/session/context?kind=company'),identity=await session.json() as S['SessionContext'];
 if(!session.ok||!identity.access.driverId)throw new Error('A provisioned real driver session is required');
 const driverId=identity.access.driverId,deviceId=randomUUID();let sequence=0;
 const command=(operationId:string,payload:object)=>({schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId,context:{kind:'device',tenantId:identity.access.tenantId,accountId:identity.access.sourceId,deviceId,deviceGeneration:1,deviceSequence:++sequence},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload});
 const captures:unknown[]=[];
 function accepted(result:S['ActionResult']){if(!validate('action-result.v1.schema.json',result)||result.receipt.businessStatus!=='accepted')throw new Error(`Driver command rejected: ${JSON.stringify(result)}`);captures.push(result);return result;}
 const planning=new PlanningClient('company',fetcher),rounds=new RoundsClient('company',fetcher),outcomes=new OutcomesClient('company',fetcher),returns=new ReturnsClient('company',fetcher),current=new CurrentClient('company',fetcher);
 accepted(await planning.command(command('planning.saveDraft',{driverId,expectedSettingsRevision:0,settings:{mode:'car',origin:{kind:'manual-pin',coordinates:{latitude:30.04,longitude:31.23}},endpoint:{kind:'last-customer'},plannedStartAt:new Date().toISOString()}}) as PlanningCommand));
 const state=await planning.plans(driverId);
 accepted(await planning.command(command('planning.setManualOrder',{driverId,expectedSettingsRevision:state.settingsRevision,expectedInputRevision:state.inputRevision,expectedManualRevision:state.manualRevision,selection:{kind:'order',taskIds}}) as PlanningCommand));
 const plan=(await planning.plans(driverId)).items[0]!;
 const ready=await rounds.readiness({driverId,deviceId,planId:plan.planId,expectedPlanRevision:plan.revision,relevantActionIds:[]});
 const start=await rounds.start(command('round.start',{driverId,planId:plan.planId,expectedPlanRevision:plan.revision,readinessId:ready.readinessId}) as S['RoundStartCommand']);accepted(start);
 const round=(start.response!.body as S['RoundStartResult']).round;
 for(const [i,taskId] of taskIds.entries()){
  const member=plan.input.members.find(m=>m.taskId===taskId)!,activity=await current.read(round.roundId);
  const payload={roundId:round.roundId,taskId,attemptId:member.attemptId,expectedActivityRevision:activity.revision,expectedCurrentAttemptId:null,expectedSourceRevision:member.sourceRevision,expectedAssignmentRevision:member.assignmentRevision,expectedPinRevision:member.pinRevision};
  accepted(i===0?await outcomes.partial(command('outcome.recordPartial',{...payload,pieces:[{sourceLineId:'pieces',delivered:1}],reportedCollection:{amountMinor:15000,currency:'EGP',exponent:2}}) as S['OutcomePartialCommand']):await outcomes.noAnswer(command('outcome.recordNoAnswer',payload) as S['OutcomeNoAnswerCommand']));
 }
 const groups=await returns.groups(),group=groups.groups[0]!;
 if(!group||group.items.length!==2)throw new Error('Both real return remainders must remain visible');
 const offered=await returns.offer(command('return.requestHandover',{roundId:round.roundId,sourceBranchId:group.sourceBranchId,items:group.items.map(i=>({taskId:i.taskId,dispatchCycleId:i.dispatchCycleId,outcomeId:i.outcomeId,sourceLineId:i.sourceLineId,quantity:i.availableToRequest}))}) as S['ReturnRequestCommand']);accepted(offered);
 return {driverId,roundId:round.roundId,request:(offered.response!.body as S['ReturnCommandResult']).request,captures};
}
