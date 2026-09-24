import {readFileSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from '@tawsel/api-client';
export type Close=components['schemas']['ClosureClose'];
export type ClosureRecord=components['schemas']['ClosureRecord'];
export type Summary=components['schemas']['ClosureSummary'];
export type CarryForward=components['schemas']['ClosureCarryForward'];
export class ClosureError extends Error {
 constructor(readonly code:components['schemas']['Problem']['code'],readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','routing.schema.json','current-activity.schema.json','b2b-intake.schema.json','outcomes.schema.json','workday-closure.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const closureConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/workday-closure.schema.json#/$defs/${name}`,value);
export function requireClosure(name:string,value:unknown){if(!closureConforms(name,value))throw new ClosureError('validation_failed',400,'راجع بيانات إنهاء الجولة أو اليوم.');}
export function uuid(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new ClosureError('validation_failed',400,'معرّف غير صالح.');}
