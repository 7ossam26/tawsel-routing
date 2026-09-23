import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';
export type Money=components['schemas']['OutcomeMoney'];
export type Calculation=components['schemas']['OutcomeCalculation'];
export type OutcomeRecord=components['schemas']['OutcomeRecord'];
export type OutcomePayload=components['schemas']['OutcomeFull'] & Partial<Pick<components['schemas']['OutcomePartial'],'pieces'> & Pick<components['schemas']['OutcomeRefusal'],'shippingPayment'>>;
export const operations={'outcome.recordFull':'Full','outcome.recordPartial':'Partial','outcome.recordRefusal':'Refusal','outcome.recordNoAnswer':'NoAnswer'} as const;
export type Operation=keyof typeof operations;
export class OutcomeError extends Error {
 constructor(readonly code:components['schemas']['Problem']['code'],readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true,allErrors:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','b2c-intake.schema.json','b2b-intake.schema.json','routing.schema.json','current-activity.schema.json','outcomes.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const outcomeConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/outcomes.schema.json#/$defs/${name}`,value);
export function requireOutcome(name:string,value:unknown){if(!outcomeConforms(name,value))throw new OutcomeError('validation_failed',400,'راجع الكمية والمبلغ وبيانات المحاولة.');}
