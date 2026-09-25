import {readFileSync,readdirSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from '@tawsel/api-client';
import type {ResourcePolicy} from '../access/service.js';
export type Report=components['schemas']['ReportWorkday'];
export type Attempt=components['schemas']['ReportAttempt'];
export type Counts=components['schemas']['ReportCounts'];
export type Outcome=components['schemas']['OutcomeRecord'];
export type Query={roundId?:string;driverId?:string;branchId?:string;outcome?:NonNullable<Report['filters']['outcome']>;snapshotId?:string};
export const policy:ResourcePolicy=[{capability:'reports.read',ownership:'assigned-branches'}];
export class ReportingError extends Error {
 constructor(readonly code:'validation_failed'|'snapshot_changed',readonly statusCode:number,message:string){super(message);}
}
const ajv=new Ajv2020({strict:true});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
const directory=new URL('../../../../contracts/',import.meta.url);
for(const file of readdirSync(directory).filter(f=>f.endsWith('.schema.json')))ajv.addSchema(JSON.parse(readFileSync(new URL(file,directory),'utf8')));
export function requireReport(name:string,value:unknown){
 if(!ajv.validate(`https://schemas.tawsel.invalid/v1/reporting.schema.json#/$defs/${name}`,value))throw new Error(`Invalid report ${name}: ${ajv.errorsText(ajv.errors)}`);
}
export function uuid(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new ReportingError('validation_failed',400,'Invalid report identity.');}
