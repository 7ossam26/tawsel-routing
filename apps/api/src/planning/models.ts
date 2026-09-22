import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';

export type Settings = components['schemas']['PlanningSettings'];
export type Input = components['schemas']['PlanningInput'];
export type Member = Input['members'][number];
export type Job = components['schemas']['PlanningJob'];
export type Plan = components['schemas']['PlanningPlan'];
export interface StateRow {
 tenant_id:string; driver_id:string; settings_revision:string; settings:Settings|null;
 input_revision:string; execution_revision:string; manual_revision:string; current_target:Input['currentTarget'];
 next_plan_revision:string; latest_job_id:string|null; current_plan_id:string|null;
}
export interface JobRow {
 tenant_id:string; driver_id:string; job_id:string; source_id:string; action_id:string;
 fingerprint:string; input:Input; status:Job['status']; blocked_reason:Job['blockedReason'];
 attempts:number; lease_id:string|null; lease_until:Date|null; next_attempt_at:Date;
 last_error:Job['error']; plan_id:string|null; created_at:Date; finished_at:Date|null;
}
export class PlanningError extends Error {
 constructor(readonly code:string,readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','routing.schema.json','planning.schema.json'])
 ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export function planningConforms(name:string,value:unknown){return ajv.validate(`https://schemas.tawsel.invalid/v1/planning.schema.json#/$defs/${name}`,value);}
export function requirePlanning(name:string,value:unknown){if(!planningConforms(name,value))throw new PlanningError('validation_failed',400,'راجع بيانات التخطيط والنسخة المطلوبة.');}
export function jobView(r:JobRow,latest:string|null):Job {
 return {jobId:r.job_id,driverId:r.driver_id,status:r.status,fingerprint:r.fingerprint,settingsRevision:r.input.settingsRevision,
  blockedReason:r.blocked_reason,attempts:r.attempts,leaseExpiresAt:r.lease_until?.toISOString()??null,nextAttemptAt:r.next_attempt_at.toISOString(),
  error:r.last_error,planId:r.plan_id,supersededByJobId:r.status==='superseded'&&latest!==r.job_id?latest:null,
  createdAt:r.created_at.toISOString(),finishedAt:r.finished_at?.toISOString()??null};
}
