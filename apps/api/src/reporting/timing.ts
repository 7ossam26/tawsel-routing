import type {components} from '@tawsel/api-client';
import type {AccessSession} from '../access/service.js';
import type {Transaction} from '../db/transaction.js';
import {policy,type Attempt,type Query,type Report} from './models.js';
import type {Admission} from './queries.js';
type Time=components['schemas']['ReportTime'];
type ActionTime=components['schemas']['CurrentActionTime'];
type Measurement=components['schemas']['ReportMeasurement'];
type ForecastStop=components['schemas']['ReportForecastStop'];
type Forecast=components['schemas']['ReportForecast'];
type Input=components['schemas']['PlanningInput'];
type Branch=components['schemas']['CurrentBranchActivity'];
interface Round {round_id:string;driver_id:string;workday_id:string;started_at:Date;ended_at:Date|null;first_forecast_id:string;owner_account_id:string;action_id:string;first_plan_id:string}
interface Plan {plan_id:string;forecast_id:string;workload_id:string;revision:string;created_at:Date;time_origin:Date;expected_finish_at:Date|null;state:Forecast['kind'];input:Input}
interface Member {forecast_id:string;attempt_id:string;task_id:string;dispatch_cycle_id:string|null;source_revision:string;assignment_revision:string;pin_revision:string;membership:ForecastStop['membership'];expected_arrival_at:Date|null;expected_completion_at:Date|null}
interface Context {action_id:string;envelope:{context:{kind:string;deviceId?:string;deviceGeneration?:number};observation:ActionTime['observation']|null;payload?:{expectedSourceRevision?:number;expectedAssignmentRevision?:number;expectedPinRevision?:number}}}
export const missing=(reason:NonNullable<Measurement['reason']>):Measurement=>({seconds:null,reason});
/** No server receipt substitution and no undocumented offset arithmetic. A
 * nonzero estimated offset stays approximate until a correction rule exists. */
export function actionTime(time:ActionTime|null|undefined):Time{
 if(!time)return {status:'missing',observedAt:null,recordedAt:null,actionId:null,clock:null};
 const {observation:o}=time;
 return {status:o.observedAt===null?'missing':o.clock.quality==='known'&&(!o.clock.estimatedOffsetMilliseconds)?'available':'uncertain',observedAt:o.observedAt,recordedAt:time.recordedAt,actionId:time.actionId,clock:o.clock};
}
function interval(start:Time,end:Time,contexts:Map<string,Context>,interrupted=false):Measurement{
 if(!start.observedAt||!end.observedAt)return missing('missing-boundary');
 if(start.status!=='available'||end.status!=='available')return missing('uncertain-clock');
 if(interrupted)return missing('interrupted');
 const a=contexts.get(start.actionId!),b=contexts.get(end.actionId!);
 if(!a||!b||a.envelope.context.kind!=='device'||b.envelope.context.kind!=='device'||a.envelope.context.deviceId!==b.envelope.context.deviceId||a.envelope.context.deviceGeneration!==b.envelope.context.deviceGeneration)return missing('different-device');
 const seconds=(Date.parse(end.observedAt)-Date.parse(start.observedAt))/1000;
 return seconds<0?missing('clock-order'):{seconds,reason:null};
}
function difference(expected:string|null|undefined,actual:Time,identity=true,identityAvailable=true):Measurement{
 if(!expected)return missing('forecast-unavailable');if(!actual.observedAt)return missing('missing-boundary');if(actual.status!=='available')return missing('uncertain-clock');
 if(!identityAvailable)return missing('identity-unavailable');if(!identity)return missing('identity-changed');
 return {seconds:(Date.parse(actual.observedAt)-Date.parse(expected))/1000,reason:null};
}
function forecast(p:Plan,members:Member[]):Forecast{
 return {planId:p.plan_id,forecastId:p.forecast_id,workloadId:p.workload_id,planRevision:Number(p.revision),capturedAt:p.created_at.toISOString(),timeOrigin:p.time_origin.toISOString(),expectedFinishAt:p.expected_finish_at?.toISOString()??null,
  customerAttempts:members.filter(m=>m.forecast_id===p.forecast_id&&['assigned','manual','unassigned','paused'].includes(m.membership)).length,branchStops:p.state==='branch'||p.input.settings?.endpoint.kind==='branch'?1:0,endpoint:p.input.settings?.endpoint.kind??'last-customer',kind:p.state};
}
export async function roundTimings(tx:Transaction,a:AccessSession,workdayId:string,rows:Admission[],items:Attempt[],q:Query):Promise<Report['timing']>{
 const tenant=a.context.tenantId,roundIds=[...new Set(rows.map(r=>r.round_id))];
 const rounds=(await tx.query<Round>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND workday_id=$2 AND round_id=ANY($3::uuid[]) ORDER BY started_at,round_id',[tenant,workdayId,roundIds])).rows;
 const result:Report['timing']=[];
 for(const r of rounds){
  const admitted=rows.filter(d=>d.round_id===r.round_id),ids=new Set(admitted.map(d=>d.attempt_id));
  const executions=(await tx.query<{attempt_id:string;heading:ActionTime|null;arrival:ActionTime|null;resolution:{time:ActionTime}|null}>('SELECT attempt_id,heading,arrival,resolution FROM tawsel.execution_attempts WHERE tenant_id=$1 AND round_id=$2 AND attempt_id=ANY($3::uuid[])',[tenant,r.round_id,[...ids]])).rows;
  const closure=(await tx.query<{record:components['schemas']['ClosureRecord']}>('SELECT record FROM tawsel.closure_records WHERE tenant_id=$1 AND ended_round_id=$2',[tenant,r.round_id])).rows[0]?.record;
  const branchFilter=a.sqlPredicate(policy,'v',3);
  const branches=(await tx.query<{record:Branch}>(`SELECT b.record FROM tawsel.branch_activities b JOIN tawsel.return_requests v USING(tenant_id,request_id)
   WHERE b.tenant_id=$1 AND b.round_id=$2 AND ${branchFilter.text} ${q.branchId?`AND v.branch_id=$${3+branchFilter.values.length}`:''} ORDER BY b.segment_id`,[tenant,r.round_id,...branchFilter.values,...(q.branchId?[q.branchId]:[])])).rows.map(b=>b.record);
  const originalFor=(attempt:string)=>items.find(i=>i.attemptId===attempt)?.history.find(o=>o.roundId===r.round_id)?.time;
  const actionIds=[r.action_id,...executions.flatMap(x=>[x.heading?.actionId,x.arrival?.actionId,x.resolution?.time.actionId,originalFor(x.attempt_id)?.actionId].filter((v):v is string=>!!v)),...(closure?[closure.time.actionId]:[]),...branches.flatMap(b=>[b.heading.actionId,b.arrival?.actionId,b.resumed?.actionId].filter((v):v is string=>!!v))];
  // Adoption with no original accepted outcome keeps the former phone's original
  // clock/context, while the correction's accepted result remains current.
  const adopted=new Map(items.flatMap(i=>{const first=i.history.find(o=>o.roundId===r.round_id),link=i.corrections.find(c=>c.previousOutcomeId===null&&c.outcome.outcomeId===first?.outcomeId&&c.evidenceActionId);return link?.evidenceActionId?[[i.attemptId,link.evidenceActionId] as const]:[];}));
  actionIds.push(...adopted.values());
  const contexts=new Map((await tx.query<Context>(`SELECT action_id,jsonb_build_object('context',jsonb_build_object('kind','device','deviceId',device_id,'deviceGeneration',generation),'observation',observation,'payload',expected_versions) envelope
   FROM tawsel.command_replay_metadata WHERE tenant_id=$1 AND source_id=$2 AND action_id=ANY($3::uuid[])
   UNION ALL SELECT action_id,envelope FROM tawsel.command_evidence WHERE tenant_id=$1 AND source_id=$2 AND action_id=ANY($3::uuid[])`,[tenant,r.owner_account_id,actionIds])).rows.map(c=>[c.action_id,c]));
  const startEvidence=contexts.get(r.action_id),start=actionTime(startEvidence?.envelope.observation?{actionId:r.action_id,recordedAt:r.started_at.toISOString(),observation:startEvidence.envelope.observation}:null),end=actionTime(closure?.time);
  const plans=(await tx.query<Plan>(`SELECT p.*,COALESCE(p.input,j.input) input,f.forecast_id,f.workload_id,f.time_origin,f.expected_finish_at
   FROM tawsel.plan_revisions p JOIN tawsel.forecast_revisions f USING(tenant_id,plan_id) LEFT JOIN tawsel.planning_jobs j USING(tenant_id,job_id)
   WHERE p.tenant_id=$1 AND p.driver_id=$2 AND (p.plan_id=$3 OR (p.created_at>=$4 AND ($5::timestamptz IS NULL OR p.created_at<=$5)))
   AND p.state IN ('ready','manual','partial','branch') ORDER BY p.revision`,[tenant,r.driver_id,r.first_plan_id,r.started_at,r.ended_at])).rows;
  const members=(await tx.query<Member>('SELECT * FROM tawsel.forecast_members WHERE tenant_id=$1 AND forecast_id=ANY($2::uuid[]) ORDER BY forecast_id,attempt_id',[tenant,plans.map(p=>p.forecast_id)])).rows;
  const allAdmissions=(await tx.query<{n:number}>('SELECT count(*)::int n FROM tawsel.round_admissions WHERE tenant_id=$1 AND round_id=$2',[tenant,r.round_id])).rows[0]!.n;
  const full=admitted.length===allAdmissions&&plans.every(p=>p.input.members.every(m=>a.canRead(policy,{tenant_id:tenant,branch_id:m.branchId,driver_id:r.driver_id,integration_id:m.integrationId})&&(!q.branchId||m.branchId===q.branchId)));
  const baselinePlan=plans.find(p=>p.forecast_id===r.first_forecast_id),baseline=full&&baselinePlan?forecast(baselinePlan,members):null;
  const baselineMembers=members.filter(m=>m.forecast_id===r.first_forecast_id&&['assigned','manual'].includes(m.membership));
  let scopeChanged=admitted.some(d=>!baselineMembers.some(m=>m.attempt_id===d.attempt_id&&m.task_id===d.task_id&&m.dispatch_cycle_id===d.dispatch_cycle_id&&m.source_revision===d.source_revision&&m.assignment_revision===d.assignment_revision&&m.pin_revision===d.pin_revision))
   ||items.some(i=>ids.has(i.attemptId)&&i.deferred)
   ||plans.some(p=>p.input.members.some(m=>ids.has(m.attemptId)&&baselineMembers.some(b=>b.attempt_id===m.attemptId&&(Number(b.source_revision)!==m.sourceRevision||Number(b.assignment_revision)!==m.assignmentRevision||Number(b.pin_revision)!==m.pinRevision))));
  const interrupted=branches.length>0||!!closure?.pausedActivity;
  // No result from a later carried round can turn this early closure into a
  // completed original forecast. Corrections keep the same physical resolution.
  const unfinished=admitted.filter(d=>!executions.find(x=>x.attempt_id===d.attempt_id)?.resolution).length;
  const roundCutoff=end.status==='available'?Date.parse(end.observedAt!):r.ended_at?.getTime()??Infinity;
  const relevantPlans=plans.filter(p=>p.created_at.getTime()<=roundCutoff),latest=full&&relevantPlans.length?forecast(relevantPlans.at(-1)!,members):null;
  let unavailableIdentity=false;
  const stops:components['schemas']['ReportStopTiming'][]=admitted.map(d=>{
   const x=executions.find(x=>x.attempt_id===d.attempt_id),original=originalFor(d.attempt_id)??x?.resolution?.time;
   const evidenceId=adopted.get(d.attempt_id),adoption=evidenceId?contexts.get(evidenceId):undefined;
   const completion=actionTime(adoption?.envelope.observation&&original?{...original,actionId:evidenceId!,observation:adoption.envelope.observation}:original),heading=actionTime(x?.heading),arrival=actionTime(x?.arrival);
   // Latest comparison is the last estimate captured before arrival (or the
   // phone resolution). Unknown clocks use acceptance solely as a cutoff, never
   // as a physical actual. Future forecasts are omitted from that comparison.
   const boundary=arrival.observedAt?arrival:completion,cutoff=boundary.status==='available'?Date.parse(boundary.observedAt!):Date.parse(boundary.recordedAt??'')||Infinity;
   const actualId=arrival.actionId??completion.actionId??heading.actionId,actualVersions=contexts.get(actualId??'')?.envelope.payload;
   // Legacy accepted envelopes did not retain version assertions. Admission
   // revisions cannot prove which pin/source revision a later action used.
   const identityAvailable=!actualId||!!actualVersions&&[actualVersions.expectedSourceRevision,actualVersions.expectedAssignmentRevision,actualVersions.expectedPinRevision].every(v=>typeof v==='number');
   if(!identityAvailable)unavailableIdentity=true;
   const revisions=plans.filter(p=>p.created_at.getTime()<=cutoff).flatMap(p=>{
    const m=members.find(m=>m.forecast_id===p.forecast_id&&m.attempt_id===d.attempt_id&&m.task_id===d.task_id&&m.dispatch_cycle_id===d.dispatch_cycle_id);if(!m)return [];
    return [{forecastId:p.forecast_id,workloadId:p.workload_id,planRevision:Number(p.revision),capturedAt:p.created_at.toISOString(),membership:m.membership,sourceRevision:Number(m.source_revision),assignmentRevision:Number(m.assignment_revision),pinRevision:Number(m.pin_revision),expectedArrivalAt:m.expected_arrival_at?.toISOString()??null,expectedCompletionAt:m.expected_completion_at?.toISOString()??null,
     identityMatches:identityAvailable&&Number(m.source_revision)===(actualVersions?.expectedSourceRevision??Number(d.source_revision))&&Number(m.assignment_revision)===(actualVersions?.expectedAssignmentRevision??Number(d.assignment_revision))&&Number(m.pin_revision)===(actualVersions?.expectedPinRevision??Number(d.pin_revision))}];
   });
   const baseline=revisions.find(f=>f.forecastId===r.first_forecast_id)??null,latest=revisions.filter(f=>['assigned','manual','unassigned','paused'].includes(f.membership)).at(-1)??null;
   const paused=branches.some(b=>b.pausedActivity?.attemptId===d.attempt_id&&Date.parse(b.heading.recordedAt)>=Date.parse(heading.recordedAt??'')&&Date.parse(b.heading.recordedAt)<=Date.parse(arrival.recordedAt??completion.recordedAt??''));
   return {taskId:d.task_id,attemptId:d.attempt_id,baseline,latest,revisions,heading,arrival,completion,travel:interval(heading,arrival,contexts,paused),service:interval(arrival,completion,contexts),
    baselineArrivalDifference:difference(baseline?.expectedArrivalAt,arrival,baseline?.identityMatches,identityAvailable),baselineCompletionDifference:difference(baseline?.expectedCompletionAt,completion,baseline?.identityMatches,identityAvailable),latestArrivalDifference:difference(latest?.expectedArrivalAt,arrival,latest?.identityMatches,identityAvailable),latestCompletionDifference:difference(latest?.expectedCompletionAt,completion,latest?.identityMatches,identityAvailable)};
  });
  if(!unavailableIdentity&&stops.some(s=>s.baseline?.identityMatches===false))scopeChanged=true;
  const finish=(f:Forecast|null)=>!full?missing('scoped-view'):unfinished?missing('unfinished'):scopeChanged?missing('changed-workload'):interrupted?missing('interrupted'):!f?missing('forecast-unavailable'):unavailableIdentity?missing('identity-unavailable'):f.endpoint!=='last-customer'?missing('endpoint-unobserved'):difference(f.expectedFinishAt,end);
  result.push({roundId:r.round_id,workdayId,visibility:full?'whole-round':'authorized-subset',acceptedStartAt:r.started_at.toISOString(),acceptedEndAt:r.ended_at?.toISOString()??null,start:full?start:actionTime(null),end:full?end:actionTime(null),baseline,latest,revisions:full?relevantPlans.map(p=>forecast(p,members)):[],scopeChanged,interrupted,unfinishedAttempts:unfinished,closure:!full?'scoped-view':!r.ended_at?'open':unfinished?'ended-unfinished':'ended-resolved',baselineFinishDifference:finish(baseline),latestFinishDifference:finish(latest),elapsed:full?interval(start,end,contexts):missing('scoped-view'),stops,
   branchVisits:branches.map(b=>{const heading=actionTime(b.heading),arrival=actionTime(b.arrival),completion=actionTime(b.resumed);return {segmentId:b.segmentId,branchId:b.sourceBranchId,stage:b.stage,serviceEstimateSeconds:b.serviceEstimateSeconds,heading,arrival,completion,travel:interval(heading,arrival,contexts),service:interval(arrival,completion,contexts)};})});
 }
 return result;
}
