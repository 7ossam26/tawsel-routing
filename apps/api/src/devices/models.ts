import {readFileSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from '@tawsel/api-client';
export class DeviceError extends Error {
 constructor(readonly code:components['schemas']['Problem']['code'],readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true,allErrors:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','b2b-intake.schema.json','routing.schema.json','current-activity.schema.json','round-start.schema.json','outcomes.schema.json','eligibility.schema.json','workday-closure.schema.json','device-ownership.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const deviceConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/device-ownership.schema.json#/$defs/${name}`,value);
export function requireDevice(name:string,value:unknown){if(!deviceConforms(name,value))throw new DeviceError('validation_failed',400,'راجع بيانات الجهاز والجولة.');}
export function uuid(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new DeviceError('validation_failed',400,'معرّف غير صالح.');}
