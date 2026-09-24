import {readFileSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from '@tawsel/api-client';
import {OutcomeError} from '../outcomes/models.js';
export type Availability=components['schemas']['CorrectionAvailability'];
export type Correction=components['schemas']['CorrectionRecord'];
export type Correct=components['schemas']['CorrectionCorrect'];
export type Adoption=components['schemas']['DeviceAdoption'];
const ajv=new Ajv2020({strict:true,allErrors:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','b2c-intake.schema.json','b2b-intake.schema.json','routing.schema.json','current-activity.schema.json','outcomes.schema.json','corrections.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export const correctionConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/corrections.schema.json#/$defs/${name}`,value);
export function requireCorrection(name:string,value:unknown){if(!correctionConforms(name,value))throw new OutcomeError('validation_failed',400,'راجع النتيجة والقطع والمبلغ ونسخة السجل.');}
