import { EngineError, type OptimizationInput, type OptimizationResult, type RouteInput, type RouteResult } from '../engine/index.js';
import { validateModel } from '../engine/models.js';
import { payloadHash } from '../commands/json.js';
import type { Input } from './models.js';

export interface Planner {
 optimize(input:OptimizationInput,signal?:AbortSignal):Promise<OptimizationResult>;
 route?(input:RouteInput,signal?:AbortSignal):Promise<RouteResult>;
}
const invalid=():never=>{throw new EngineError('invalid_response');};
const close=(a:number,b:number)=>{if(Math.abs(a-b)>0.001)invalid();};
export function instant(anchor:string,seconds:number) {
 const time=Date.parse(anchor)+seconds*1000;
 if(!Number.isFinite(time)||time>Date.parse('9999-12-31T23:59:59.999Z')||time<Date.parse('0000-01-01T00:00:00Z'))invalid();
 return new Date(time).toISOString();
}
/** A common, explicit eligibility horizon; urgency never admits future work.
 * Execution/outcome writers must exclude resolved/return-required remnants in
 * the authoritative snapshot before calling this policy. */
export function eligibleMembers(input:Input) {
 if(!input.settings)throw new EngineError('invalid_input');
 const members=input.members.filter(m=>m.eligible);
 if(!members.length||members.length+(input.settings.endpoint.kind==='branch'?1:0)>50)invalid();
 if(new Set(input.members.map(m=>m.taskId)).size!==input.members.length||new Set(input.members.map(m=>m.attemptId)).size!==input.members.length)invalid();
 for(const m of members)if(!m.coordinates||m.exclusionReason||
  (m.earliestAt&&Date.parse(m.earliestAt)>Date.parse(input.settings.plannedStartAt))||
  (input.accountKind==='company'&&(!m.dispatchCycleId||m.reservationState!=='remaining')))invalid();
 if(input.currentTarget&&!members.some(m=>m.taskId===input.currentTarget!.taskId&&m.attemptId===input.currentTarget!.attemptId))invalid();
 if((input.accountKind==='personal'&&input.settings.endpoint.kind==='branch')||(input.accountKind==='company'&&input.settings.endpoint.kind==='fixed'))invalid();
 return members;
}
export function validateOrder(input:Input,ids:string[],unassigned:string[]=[]) {
 const members=eligibleMembers(input),all=[...ids,...unassigned];
 if(new Set(all).size!==all.length||all.length!==members.length||all.some(id=>!members.some(m=>m.taskId===id)))invalid();
 // An unreachable current stop blocks the entire following sequence.
 if(input.currentTarget&&ids.length&&ids[0]!==input.currentTarget.taskId)invalid();
 let ordinary=false;
 for(const id of ids){
  if(id===input.currentTarget?.taskId)continue;
  const member=members.find(m=>m.taskId===id)!;
  if(member.priority==='ordinary')ordinary=true;
  else if(ordinary)invalid();
 }
}
/** Validate the assembled route, including all offsets across group boundaries.
 * Provider geometry is not inferred from a visit sequence. */
export function validateCompleteRoute(input:Input,candidate:OptimizationResult) {
 validateModel('OptimizationResult',candidate,true);
 validateOrder(input,candidate.visits.map(v=>v.taskId),candidate.unassignedTaskIds);
 const settings=input.settings!;
 if(candidate.mode!==settings.mode||payloadHash(candidate.endpoint)!==payloadHash(settings.endpoint)||candidate.status!==(candidate.unassignedTaskIds.length?'partial':'complete'))invalid();
 let departure=0,travel=0,distance=0,service=0,waiting=0;
 for(const v of candidate.visits){
  const member=input.members.find(m=>m.taskId===v.taskId)!;
  if(payloadHash(v.coordinates)!==payloadHash(member.coordinates)||v.serviceEstimateSeconds!==member.serviceEstimateSeconds||v.travelDurationSeconds<travel||v.distanceMetres<distance)invalid();
  close(v.arrivalOffsetSeconds,departure+v.travelDurationSeconds-travel);
  if(member.earliestAt&&Date.parse(instant(settings.plannedStartAt,v.arrivalOffsetSeconds+v.waitingSeconds))<Date.parse(member.earliestAt))invalid();
  departure=v.arrivalOffsetSeconds+v.waitingSeconds+v.serviceEstimateSeconds;
  instant(settings.plannedStartAt,departure);
  travel=v.travelDurationSeconds;distance=v.distanceMetres;service+=v.serviceEstimateSeconds;waiting+=v.waitingSeconds;
 }
 const branch=candidate.visits.length&&settings.endpoint.kind==='branch'?settings.endpoint.serviceEstimateSeconds:0;
 if(candidate.travelDurationSeconds<travel||candidate.distanceMetres<distance)invalid();
 if(settings.endpoint.kind==='last-customer'||!candidate.visits.length){close(candidate.travelDurationSeconds,travel);close(candidate.distanceMetres,distance);}
 close(candidate.customerServiceEstimateSeconds,service);close(candidate.waitingSeconds,waiting);close(candidate.branchServiceEstimateSeconds,branch);
 close(candidate.finishOffsetSeconds,candidate.travelDurationSeconds+service+waiting+branch);
 instant(settings.plannedStartAt,candidate.finishOffsetSeconds);
}
/** Sequential group optimization is a heuristic, not global optimality.
 * Every segment starts at the preceding customer's location and departure.
 * Local provider offsets are translated to ONE stored forecast time origin. */
export async function planRoute(input:Input,planner:Planner,signal?:AbortSignal):Promise<OptimizationResult> {
 const members=eligibleMembers(input),settings=input.settings!,current=members.filter(m=>m.taskId===input.currentTarget?.taskId);
 const remaining=members.filter(m=>m.taskId!==input.currentTarget?.taskId);
 const groups=[current,remaining.filter(m=>m.priority==='urgent'),remaining.filter(m=>m.priority==='ordinary')].filter(g=>g.length);
 const result:OptimizationResult={mode:settings.mode,status:'complete',policyValidated:false,visits:[],unassignedTaskIds:[],travelDurationSeconds:0,distanceMetres:0,customerServiceEstimateSeconds:0,branchServiceEstimateSeconds:0,waitingSeconds:0,finishOffsetSeconds:0,endpoint:settings.endpoint};
 let origin=settings.origin.coordinates,blockedCurrent=false;
 for(const group of groups){
  if(blockedCurrent){result.unassignedTaskIds.push(...group.map(m=>m.taskId));continue;}
  const segmentInput:Input={...input,currentTarget:null,members:group,settings:{...settings,origin:{kind:'manual-pin',coordinates:origin},endpoint:{kind:'last-customer'}}};
  const candidate=await planner.optimize({mode:settings.mode,accountKind:input.accountKind,origin:segmentInput.settings!.origin,endpoint:{kind:'last-customer'},tasks:group.map(m=>({taskId:m.taskId,coordinates:m.coordinates!,serviceEstimateSeconds:m.serviceEstimateSeconds}))},signal);
  validateCompleteRoute(segmentInput,candidate);
  for(const v of candidate.visits)result.visits.push({...v,arrivalOffsetSeconds:v.arrivalOffsetSeconds+result.finishOffsetSeconds,travelDurationSeconds:v.travelDurationSeconds+result.travelDurationSeconds,distanceMetres:v.distanceMetres+result.distanceMetres});
  result.unassignedTaskIds.push(...candidate.unassignedTaskIds);
  result.travelDurationSeconds+=candidate.travelDurationSeconds;result.distanceMetres+=candidate.distanceMetres;
  result.customerServiceEstimateSeconds+=candidate.customerServiceEstimateSeconds;result.waitingSeconds+=candidate.waitingSeconds;result.finishOffsetSeconds+=candidate.finishOffsetSeconds;
  origin=candidate.visits.at(-1)?.coordinates??origin;
  blockedCurrent=!!input.currentTarget&&candidate.unassignedTaskIds.includes(input.currentTarget.taskId);
 }
 if(result.visits.length&&settings.endpoint.kind!=='last-customer'){
  if(!planner.route)throw new EngineError('unavailable');
  const leg=await planner.route({mode:settings.mode,coordinates:[origin,settings.endpoint.coordinates]},signal);
  validateModel('RouteResult',leg,true);
  if(leg.mode!==settings.mode||leg.legs.length!==1)invalid();
  result.travelDurationSeconds+=leg.durationSeconds;result.distanceMetres+=leg.distanceMetres;result.finishOffsetSeconds+=leg.durationSeconds;
  if(settings.endpoint.kind==='branch'){result.branchServiceEstimateSeconds=settings.endpoint.serviceEstimateSeconds;result.finishOffsetSeconds+=settings.endpoint.serviceEstimateSeconds;}
 }
 result.status=result.unassignedTaskIds.length?'partial':'complete';
 validateCompleteRoute(input,result);return result;
}
