import {readFileSync,readdirSync} from 'node:fs';
import {Ajv2020} from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type {components} from './schema.js';
export type Event=components['schemas']['EventEnvelope'];
export type Scope={tenantId:string;integrationId:string};
export function publicValidator(directory=new URL('./contracts/',import.meta.url)){
 const ajv=new Ajv2020({strict:true,allErrors:true,coerceTypes:false});
 (addFormats as unknown as (a:Ajv2020)=>void)(ajv);
 function load(dir:URL){for(const e of readdirSync(dir,{withFileTypes:true})){const url=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory())load(url);else if(e.name.endsWith('.schema.json'))ajv.addSchema(JSON.parse(readFileSync(url,'utf8')));}}
 load(directory);
 return (ref:string,value:unknown)=>ajv.validate(`https://schemas.tawsel.invalid/v1/${ref}`,value);
}
/** Recipient and aggregate identities are semantic rules in addition to JSON Schema. */
export function eventIdentity(e:Event,scope:Scope):boolean{
 const scoped=(v:unknown):boolean=>!v||typeof v!=='object'||Object.entries(v).every(([k,x])=>k==='tenantId'?x===scope.tenantId:k==='integrationId'||k==='recipientIntegrationId'?x===scope.integrationId:scoped(x));
 if(!scoped(e)||e.tenantId!==scope.tenantId||e.recipientIntegrationId!==scope.integrationId)return false;
 const p=e.payload as Record<string,unknown>,correction=p.correction as Record<string,unknown>|undefined;
 const task=p.task as Record<string,unknown>|undefined,outcome=(p.outcome??correction?.outcome) as Record<string,unknown>|undefined;
 const request=p.request as Record<string,unknown>|undefined,transition=p.transition as Record<string,unknown>|undefined;
 const location=p.location as Record<string,unknown>|undefined,change=p.change as Record<string,unknown>|undefined;
 const taskId=task?.taskId??outcome?.taskId??location?.taskId??change?.taskId??p.taskId;
 const type=e.eventType.startsWith('return.')?'return-request':e.eventType==='workday.ended'?'workday':taskId?'task':p.roundId||p.endedRoundId?'trip':'integration';
 const id=type==='return-request'?request?.requestId??transition?.requestId??p.requestId:type==='workday'?p.workdayId:taskId??p.roundId??p.endedRoundId??scope.integrationId;
 if(e.aggregate.type!==type||e.aggregate.id!==id)return false;
 if(p.actionId!==undefined&&p.actionId!==e.correlation.actionId)return false;
 const fact=(task??outcome??location??change??transition??request??p) as Record<string,unknown>;
 for(const [k,v] of Object.entries(e.resources)){if(k==='tripId'?fact.roundId!==v:fact[k]!==v)return false;}
 if(e.versions.outcomeRevision!==undefined&&e.versions.outcomeRevision!==outcome?.revision)return false;
 for(const name of ['sourceRevision','locationRevision'] as const)if(e.versions[name]!==undefined&&e.versions[name]!==fact[name])return false;
 if(e.correlation.sourceReference!==undefined&&canonicalJson(e.correlation.sourceReference)!==canonicalJson(fact.sourceReference))return false;
 return true;
}
export function canonicalJson(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return `[${value.map(canonicalJson).join(',')}]`;
 return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson((value as Record<string,unknown>)[k])}`).join(',')}}`;
}
