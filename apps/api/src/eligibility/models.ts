import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';
export type State=components['schemas']['EligibilityState'];
export type Record=components['schemas']['EligibilityRecord'];
export type Payload=components['schemas']['EligibilityRetry'] & Partial<Pick<components['schemas']['EligibilityDefer'],'earliestAt'> & Pick<components['schemas']['EligibilityUrgency'],'urgency'>>;
export const operations={'task.deferWhole':'Defer','task.retryWhole':'Retry','task.activateDeferred':'Activate','task.setDriverUrgency':'Urgency'} as const;
export type Operation=keyof typeof operations;
export class EligibilityError extends Error {
 constructor(readonly code:components['schemas']['Problem']['code'],readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true,allErrors:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','routing.schema.json','current-activity.schema.json','eligibility.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const eligibilityConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/eligibility.schema.json#/$defs/${name}`,value);
export function requireEligibility(name:string,value:unknown){if(!eligibilityConforms(name,value))throw new EligibilityError('validation_failed',400,'راجع وقت الإتاحة وبيانات المهمة.');}
