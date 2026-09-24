import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import type {components} from '@tawsel/api-client';
import {intakeClient} from '@tawsel/api-client/intake';
import {provisioningClient} from '@tawsel/api-client/provisioning';
import {returnReceiverClient} from '@tawsel/api-client/returns';
import {sourceStatusClient} from '@tawsel/api-client/source';
import {publicValidator} from '@tawsel/api-client/validation';
import {driveSourceTasks} from './source-driver.js';
type S=components['schemas'];
export interface SourceConformanceConfig {apiUrl:string;receiverUrl:string;tenantId:string;integrationId:string;credential:string;statusToken:string;driverSubject:string;entry:string;consumerConfig:string;driverCookie?:string;driverOrigin?:string}
/** Runs from the copied public bundle. Only the consumer's own database variable
 * is used by its CLI. No Tawsel DB URL/operator credential/internal import. */
export async function sourceConformance(c:SourceConformanceConfig,stage:string){
 if(!process.env.MOCK_ERP_DATABASE_URL)throw new Error('Own consumer database required');
 const validate=publicValidator(),intake=intakeClient(c.apiUrl,c.credential),provision=provisioningClient(c.apiUrl,c.credential),returns=returnReceiverClient(c.apiUrl,c.credential),status=sourceStatusClient(c.receiverUrl,c.statusToken);
 const dir=await mkdtemp(join(tmpdir(),'source-command-'));
 const env:NodeJS.ProcessEnv={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE'])if(process.env[k])env[k]=process.env[k];env.MOCK_ERP_DATABASE_URL=process.env.MOCK_ERP_DATABASE_URL;env.MOCK_ERP_CONFIG=c.consumerConfig;
 const cli=async(...args:string[])=>JSON.parse((await promisify(execFile)(process.execPath,[c.entry,...args],{env,windowsHide:true,maxBuffer:8*1024*1024})).stdout) as unknown;
 const state=async()=>{const s=await status.status();if(!validate('source.schema.json#/$defs/Status',s)||s.truncated)throw new Error('Invalid or truncated source proof');return s;};
 async function send(op:string,payload:Record<string,unknown>,kind:string,ids:string[],run=true){
  const before=await state(),command={schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId:op,context:{kind:'integration',tenantId:c.tenantId,integrationId:c.integrationId},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload};
  const input={command,records:ids.map(id=>({kind,externalId:id,expectedRevision:before.records.find(r=>r.kind===kind&&r.externalId===id)?.localRevision??0,desired:payload}))};
  const file=join(dir,'submission.json');await writeFile(file,JSON.stringify(input));const saved=await cli('source-submit',file) as {status:string};if(saved.status!=='pending')throw new Error('Source was not saved pending');
  if(run){await promisify(execFile)(process.execPath,[c.entry,'source-worker','--once'],{env,windowsHide:true});const after=await state(),row=after.commands.find(x=>x.actionId===command.actionId)!;if(row.status!=='accepted')throw new Error(`Source rejected ${op}: ${JSON.stringify(row)}`);}
  return command.actionId;
 }
 const snapshot=(id:string)=>({externalId:id,sourceDispatchCycleId:'cycle-1',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'cairo',recipientName:'عميل مرجعي',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.04,longitude:31.23}},splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'pieces',description:'قطع',quantity:3,unitDue:{amountMinor:10000,currency:'EGP',exponent:2}}],shippingDue:{amountMinor:5000,currency:'EGP',exponent:2},totalDue:{amountMinor:35000,currency:'EGP',exponent:2},priority:'ordinary'});
 const tasks=async()=>Promise.all(['external-one','external-two'].map(async id=>{const r=await intake.get(id);if(r.status!==200)throw new Error('Source task unavailable');return r.body as S['B2bTask'];}));
 const reference=(t:S['B2bTask'])=>({externalId:t.externalId,sourceDispatchCycleId:t.sourceDispatchCycleId,expectedSourceRevision:t.sourceRevision,expectedAssignmentRevision:t.assignmentRevision,assignmentRevision:t.assignmentRevision+1});
 try{
  if(stage==='prepare'){
   await send('branch.provision',{externalId:'cairo',sourceRevision:1,name:'القاهرة',enabled:true,location:null},'branch',['cairo']);
   await send('role.defineCapabilities',{externalId:'driver-role',sourceRevision:1,name:'مندوب',capabilities:['execution.own']},'role',['driver-role']);
   await send('user.provision',{externalId:'driver',sourceRevision:1,subject:c.driverSubject,roleExternalId:'driver-role',branchExternalIds:['cairo'],enabled:true},'user',['driver']);
   await send('driver.provisionReference',{externalId:'driver',sourceRevision:1,userExternalId:'driver',enabled:true,profile:'car',vehicleReference:null},'driver',['driver']);
   for(const id of ['external-one','external-two'])await send('intake.submitSnapshot',snapshot(id),'shipment',[id]);
   await send('intake.prepare',{driverExternalId:'driver',items:(await tasks()).map(reference)},'shipment',['external-one','external-two']);
   if((await tasks()).some(t=>t.state!=='prepared'||t.receivedAt!==null||t.planningEligible))throw new Error('Preparation falsely implies custody');
   await send('assignment.receiveBatch',{driverExternalId:'driver',receiptAsserted:true,items:(await tasks()).map(reference)},'shipment',['external-one','external-two']);
   const deadline=Date.now()+20000;while(Date.now()<deadline){const r=await provision.status('user','driver');if('issuerStatus'in r.body&&r.body.issuerStatus==='ready')return {stage,tasks:await tasks(),source:await state()};await new Promise(r=>setTimeout(r,200));}throw new Error('Actual issuer reconciliation unavailable');
  }
  if(stage==='offline-save'){
   // API intentionally unavailable: cached accepted task identity is supplied by
   // the last durable result, never read from the execution database.
   const current=await state();const assignment=current.commands.find(x=>x.operationId==='assignment.receiveBatch'&&x.status==='accepted')!;
   const second=(assignment.result!.response!.body.tasks as S['B2bTask'][]).find(t=>t.externalId==='external-two')!;
   const actionId=await send('assignment.withdraw',reference(second),'shipment',['external-two'],false);
   await promisify(execFile)(process.execPath,[c.entry,'source-worker','--once'],{env,windowsHide:true});
   const pending=(await state()).commands.find(x=>x.actionId===actionId)!;if(pending.status!=='pending'||pending.attempts!==1)throw new Error('HTTP outage was falsely accepted');return {stage,actionId,pending};
  }
  if(stage==='resume'){
   const pending=(await state()).commands.find(x=>x.status==='pending');if(!pending)throw new Error('Missing offline committed command');
   const deadline=Date.now()+20000;while(Date.now()<deadline){await promisify(execFile)(process.execPath,[c.entry,'source-worker','--once'],{env,windowsHide:true});const row=(await state()).commands.find(x=>x.actionId===pending.actionId)!;if(row.status==='accepted')break;await new Promise(r=>setTimeout(r,250));}
   if((await state()).commands.find(x=>x.actionId===pending.actionId)!.status!=='accepted')throw new Error('Stable-ID recovery failed');
   const second=(await tasks())[1]!;if(second.state!=='withdrawn')throw new Error('Normal removal not applied');
   await send('assignment.receiveBatch',{driverExternalId:'driver',receiptAsserted:true,items:[reference(second)]},'shipment',['external-two']);return {stage,recoveredActionId:pending.actionId};
  }
  if(stage==='execute'){
   if(!c.driverCookie||!c.driverOrigin)throw new Error('Separate real Tawsel driver cookie/origin required');let cookie=c.driverCookie;
   const fetcher:typeof fetch=async(input,init)=>{const r=await fetch(new URL(String(input),c.apiUrl),{...init,redirect:'error',headers:{...Object.fromEntries(new Headers(init?.headers)),cookie,origin:c.driverOrigin!}});const added=r.headers.getSetCookie().map(x=>x.split(';')[0]!);if(added.length){const values=new Map(cookie.split('; ').map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));for(const a of added){const i=a.indexOf('=');values.set(a.slice(0,i),a.slice(i+1));}cookie=[...values].map(([k,v])=>`${k}=${v}`).join('; ');}return r;};
   const old=await tasks(),journey=await driveSourceTasks(fetcher,old.map(t=>t.taskId));
   // A departed edit is actually submitted; the durable source shows denial.
   const id=await send('assignment.withdraw',reference(old[0]!),'shipment',['external-one'],false);await promisify(execFile)(process.execPath,[c.entry,'source-worker','--once'],{env,windowsHide:true});
   const denied=(await state()).commands.find(x=>x.actionId===id)!;if(denied.status!=='rejected'||denied.lastError!=='departed_edit_forbidden')throw new Error('Departed staff edit not rejected');
   const item=journey.request.items.find(i=>i.externalId==='external-one')!;
   await send('return.confirmSubsetReceipt',{requestId:journey.request.requestId,receivingBranchId:journey.request.sourceBranchId,items:[{itemId:item.itemId,quantity:1,expectedRevision:item.revision}]},'return',[journey.request.requestId]);
   const received=(await returns.read(journey.request.requestId)).body as S['ReturnRequestView'],remaining=received.items.find(i=>i.itemId===item.itemId)!;
   if(remaining.received!==1||remaining.unresolved!==1||received.items.find(i=>i.externalId==='external-two')!.unresolved!==3)throw new Error('Subset cleared untouched pieces');
   await send('return.recordDisposition',{requestId:received.requestId,receivingBranchId:received.sourceBranchId,items:[{itemId:remaining.itemId,quantity:1,expectedRevision:remaining.revision}],disposition:'lost'},'return',[received.requestId]);
   const fresh={...snapshot('external-one'),sourceDispatchCycleId:'cycle-2',sourceRevision:2,expectedSourceRevision:1,lines:[{...snapshot('external-one').lines[0]!,quantity:1}],shippingDue:{amountMinor:0,currency:'EGP',exponent:2},totalDue:{amountMinor:10000,currency:'EGP',exponent:2}};
   await send('dispatch.createFromReceipt',{externalId:'external-one',previousDispatchCycleId:old[0]!.dispatchCycleId,snapshot:fresh},'shipment',['external-one']);
   const next=(await tasks())[0]!;if(next.dispatchCycleId===old[0]!.dispatchCycleId||next.state!=='unassigned')throw new Error('Old cycle reopened');
   await send('intake.prepare',{driverExternalId:'driver',items:[reference(next)]},'shipment',['external-one']);
   const prepared=(await tasks())[0]!;await send('assignment.receiveBatch',{driverExternalId:'driver',receiptAsserted:true,items:[reference(prepared)]},'shipment',['external-one']);
   return {stage,journey,deniedActionId:id,returnState:(await returns.read(received.requestId)).body,newCycle:(await tasks())[0],source:await state()};
  }
  if(stage==='status')return {stage,source:await state(),tasks:await tasks()};
  throw new Error('Use prepare, offline-save, resume, execute or status');
 }finally{await rm(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const path=process.argv[2],stage=process.argv[3];if(!path||!stage)throw new Error('Usage: source.mjs <consumer-conformance.json> <stage>');console.log(JSON.stringify(await sourceConformance(JSON.parse(await readFile(path,'utf8')) as SourceConformanceConfig,stage)));}
