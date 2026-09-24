import {readFileSync,readdirSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {ProvisioningError} from '../provisioning/schema.js';
const ajv=new Ajv2020({strict:true,allErrors:true,coerceTypes:false});
(addFormats as unknown as (a:Ajv2020)=>void)(ajv);
function load(dir:URL){for(const entry of readdirSync(dir,{withFileTypes:true})){const url=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())load(url);else if(entry.name.endsWith('.schema.json'))ajv.addSchema(JSON.parse(readFileSync(url,'utf8')));}}
load(new URL('../../../../contracts/',import.meta.url));
export const outboxConforms=(name:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/outbox.schema.json#/$defs/${name}`,value);
export function requireOutbox(name:string,value:unknown){if(!outboxConforms(name,value))throw new ProvisioningError('validation_failed',400,'Invalid delivery request');}
export function senderEventConforms(value:unknown):boolean{return ajv.validate('https://schemas.tawsel.invalid/v1/events/sender-event.v1.schema.json',value);}
