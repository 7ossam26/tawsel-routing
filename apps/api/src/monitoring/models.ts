import {readFileSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from '@tawsel/api-client';
export type Snapshot=components['schemas']['MonitoringSnapshot'];
export type Task=components['schemas']['MonitoringTask'];
export type Progress=components['schemas']['MonitoringProgress'];
export type History=components['schemas']['MonitoringHistory'];
export type Action=components['schemas']['MonitoringAction'];
export type ActionSnapshot=components['schemas']['MonitoringActionSnapshot'];
export type View=Snapshot|History|ActionSnapshot;
export type Query={branchId?:string;limit?:number;cursor?:string};
export type Selection={kind:'driver'|'trip'|'task'|'workday'|'action';id:string;sourceId?:string};
export class MonitoringError extends Error {
 constructor(readonly code:string,readonly statusCode:number,message:string){super(message);}
}
export function uuid(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new MonitoringError('validation_failed',400,'Invalid resource ID.');}
const ajv=new Ajv2020({strict:true,allErrors:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
for(const file of ['common.schema.json','action-envelope.v1.schema.json','evidence-receipt.v1.schema.json','action-result.v1.schema.json','b2c-intake.schema.json','b2b-intake.schema.json','routing.schema.json','current-activity.schema.json','outcomes.schema.json','corrections.schema.json','monitoring.schema.json'])ajv.addSchema(JSON.parse(readFileSync(new URL(`../../../../contracts/${file}`,import.meta.url),'utf8')));
export function requireMonitoring(name:string,value:unknown){if(!ajv.validate(`https://schemas.tawsel.invalid/v1/monitoring.schema.json#/$defs/${name}`,value))throw new Error(`Invalid monitoring projection: ${ajv.errorsText()}`);}
