import {readFileSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from '@tawsel/api-client';
export type RequestView=components['schemas']['ReturnRequestView'];
export type Item=RequestView['items'][number];
export type Transition=components['schemas']['ReturnTransition'];
export type Offer=components['schemas']['ReturnOffer'];
export type Receive=components['schemas']['ReturnReceive'];
export type Dispose=components['schemas']['ReturnDispose'];
export type Request=components['schemas']['ReturnRequest'];
export class ReturnError extends Error {
 constructor(readonly code:components['schemas']['ErrorCode'],readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true,allErrors:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common','action-envelope.v1','evidence-receipt.v1','action-result.v1','provisioning','b2c-intake','b2b-intake','routing','current-activity','returns'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}.schema.json`,import.meta.url),'utf8')));
export const conforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/returns.schema.json#/$defs/${name}`,value);
export function requireReturn(name:string,value:unknown){if(!conforms(name,value))throw new ReturnError('validation_failed',400,'راجع القطع وبيانات طلب المرتجع.');}
export function uuid(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new ReturnError('validation_failed',400,'معرّف غير صالح.');}
export function unique(values:string[]){if(new Set(values).size!==values.length)throw new ReturnError('validation_failed',400,'لا تكرر نفس البند في الطلب.');}
