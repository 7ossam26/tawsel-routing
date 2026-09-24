import {readFileSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from '@tawsel/api-client';
import {ReturnError} from '../returns/models.js';
export type BranchActivity=components['schemas']['CurrentBranchActivity'];
const ajv=new Ajv2020({strict:true,allErrors:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const f of ['common.schema.json','action-envelope.v1.schema.json','current-activity.schema.json','branch-activity.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${f}`,import.meta.url),'utf8')));
export function requireBranch(name:string,value:unknown){if(!ajv.validate(`https://schemas.tawsel.invalid/v1/branch-activity.schema.json#/$defs/${name}`,value))throw new ReturnError('validation_failed',400,'راجع بيانات زيارة الفرع والنسخة المطلوبة.');}
