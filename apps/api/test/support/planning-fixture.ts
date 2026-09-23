import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { ids, principals } from './access-fixture.js';
import { IndependentIntakeService } from '../../src/b2c-intake/service.js';
import { PlanningService } from '../../src/planning/service.js';
import type { ActionEnvelope } from '../../src/commands/kernel.js';
import type { Settings } from '../../src/planning/models.js';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { RoutingEngine } from '../../src/engine/index.js';
import { loadEngineConfig } from '../../src/engine/config.js';

export const settings:Settings={mode:'bicycle',origin:{kind:'manual-pin',coordinates:{latitude:30.0444,longitude:31.2357}},endpoint:{kind:'last-customer'},plannedStartAt:'2026-09-23T10:00:00.000Z'};
export function command(operationId:string,payload:Record<string,unknown>):ActionEnvelope {
 return {schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId,
  context:{kind:'device',tenantId:ids.personalTenant,accountId:ids.personalAccount,deviceId:randomUUID(),deviceGeneration:1,deviceSequence:1},
  resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload};
}
export async function intake(pool:Pool,index=0,recipientName='عميل'){
 const c=command('task.createIndependent',{recipientName,recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.05+index*0.01,longitude:31.24+index*0.01}}});
 const result=await new IndependentIntakeService(pool).create(principals.personal,c);
 return {command:c,result,taskId:(result.response!.body.task as {taskId:string}).taskId};
}
export async function draft(pool:Pool,revision=0,patch:Partial<Settings>={}){
 const c=command('planning.saveDraft',{driverId:ids.personalDriver,expectedSettingsRevision:revision,settings:{...settings,...patch}});
 const result=await new PlanningService(pool).command(principals.personal,c);
 return {command:c,result,jobId:(result.response!.body.job as {jobId:string}).jobId};
}
/** Controlled HTTP provider, not live Engine route evidence. Builds an explicit
 * 10-second/100-metre leg per customer, reverse input order and 600s service. */
export async function providerFixture(options:{beforeResponse?:()=>Promise<void>;partial?:boolean;status?:number;roadStatus?:number;waitingSeconds?:number}={}){
 const server=createServer(async(req,res)=>{
  if(req.method==='GET'){
   if(options.roadStatus){res.statusCode=options.roadStatus;res.end('controlled road failure');return;}
   // Labelled OSRM HTTP endpoint fixture: one 25-second/250-metre leg.
   const points=new URL(req.url!,'http://fixture').pathname.split('/').at(-1)!.split(';').map(p=>p.split(',').map(Number));
   res.setHeader('content-type','application/json');res.end(JSON.stringify({code:'Ok',waypoints:points.map(location=>({location})),routes:[{duration:25,distance:250,legs:[{duration:25,distance:250}],geometry:{type:'LineString',coordinates:points}}]}));return;
  }
  const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
  const body=JSON.parse(Buffer.concat(chunks).toString()) as {jobs:{id:number;location:number[];service:number}[];vehicles:{start:number[];end?:number[]}[]};
  await options.beforeResponse?.();
  if(options.status){res.statusCode=options.status;res.end('controlled failure');return;}
  const jobs=[...body.jobs].reverse(),unassigned=options.partial?jobs.splice(-1).map(j=>({id:j.id,type:'job'})):[];
  let arrival=0,duration=0,distance=0,service=0,waiting=0;
  const step=(type:string,location:number[],extra={})=>({type,location,arrival,duration,distance,service:0,setup:0,waiting_time:0,violations:[],...extra});
  const steps=[step('start',body.vehicles[0]!.start)];
  for(const j of jobs){const wait=options.waitingSeconds??0;arrival+=10;duration+=10;distance+=100;steps.push(step('job',j.location,{id:j.id,service:j.service,waiting_time:wait}));arrival+=j.service+wait;service+=j.service;waiting+=wait;}
  const end=body.vehicles[0]!.end??jobs.at(-1)?.location??body.vehicles[0]!.start;
  steps.push(step('end',end));
  const totals={setup:0,service,duration,waiting_time:waiting,distance,violations:[]};
  res.setHeader('content-type','application/json');res.end(JSON.stringify({code:0,summary:{routes:jobs.length?1:0,unassigned:unassigned.length,...totals},unassigned,routes:jobs.length?[{vehicle:1,...totals,steps}]:[]}));
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const address=server.address();if(!address||typeof address==='string')throw new Error('Missing fixture address');
 const url=`http://127.0.0.1:${address.port}`;
 return {url,engine:new RoutingEngine(loadEngineConfig({TAWSEL_VROOM_URL:url,TAWSEL_OSRM_BICYCLE_URL:url,TAWSEL_ENGINE_TIMEOUT_MS:'10000'})),async close(){server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}};
}
