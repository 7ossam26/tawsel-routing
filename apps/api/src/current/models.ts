import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from '@tawsel/api-client';
export type Activity=components['schemas']['CurrentActivity'];
export type ActionTime=components['schemas']['CurrentActionTime'];
export type PhysicalOrigin=components['schemas']['CurrentPhysicalOrigin'];
export type Selection=components['schemas']['CurrentSelectHeading'];
export type Target=components['schemas']['CurrentTarget'];
export class CurrentError extends Error {
 constructor(readonly code:components['schemas']['Problem']['code'],readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','routing.schema.json','current-activity.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const currentConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/current-activity.schema.json#/$defs/${name}`,value);
export function requireCurrent(name:string,value:unknown){if(!currentConforms(name,value))throw new CurrentError('validation_failed',400,'راجع بيانات المحطة والإجراء.');}
