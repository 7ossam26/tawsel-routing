import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';
export type Round=components['schemas']['RoundRound'];
export type Workday=components['schemas']['RoundWorkday'];
export type Readiness=components['schemas']['RoundReadiness'];
export type ReadinessRequest=components['schemas']['RoundReadinessRequest'];
export type Start=components['schemas']['RoundStart'];
export class RoundError extends Error {
 constructor(readonly code:components['schemas']['Problem']['code'],readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','routing.schema.json','current-activity.schema.json','round-start.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const roundConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/round-start.schema.json#/$defs/${name}`,value);
export function requireRound(name:string,value:unknown){if(!roundConforms(name,value))throw new RoundError('validation_failed',400,'راجع بيانات بدء الجولة.');}
export interface RoundRow {
 tenant_id:string;driver_id:string;round_id:string;workday_id:string;owner_account_id:string;owner_device_id:string;device_generation:string;
 first_plan_id:string;first_forecast_id:string;first_workload_id:string;started_at:Date;ended_at:Date|null;
}
export function roundView(r:RoundRow):Round{return {roundId:r.round_id,workdayId:r.workday_id,driverId:r.driver_id,state:'active',startedAt:r.started_at.toISOString(),owner:{accountId:r.owner_account_id,deviceId:r.owner_device_id,generation:Number(r.device_generation)},firstPlanId:r.first_plan_id,firstForecastId:r.first_forecast_id,firstWorkloadId:r.first_workload_id,currentActivity:null};}
