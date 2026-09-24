import type {components} from './schema.js';
/** Installation IDs are stable local identifiers, never account credentials.
 * Keep uncertain commands immutable and retry/query the same action ID. */
export class DevicesClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown,deviceId?:string){
  const headers:Record<string,string>={};
  if(body!==undefined){const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';}
  const response=await this.fetcher(`${path}?kind=${this.kind}${deviceId?`&deviceId=${encodeURIComponent(deviceId)}`:''}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.error?.message??'تعذر الاتصال بالجولة.'),{status:response.status,code:value.error?.code});return value;
 }
 context(roundId:string,deviceId:string):Promise<components['schemas']['DeviceContext']>{return this.request(`/api/v1/devices/rounds/${encodeURIComponent(roundId)}`,undefined,deviceId);}
 snapshot(roundId:string,deviceId:string):Promise<components['schemas']['DeviceSnapshot']>{return this.request(`/api/v1/devices/rounds/${encodeURIComponent(roundId)}/snapshot`,undefined,deviceId);}
 takeover(command:components['schemas']['DeviceTakeoverCommand']):Promise<components['schemas']['ActionResult']>{return this.request('/api/v1/devices/takeover',command);}
 result(actionId:string):Promise<components['schemas']['DeviceActionStatus']>{return this.request(`/api/v1/actions/${encodeURIComponent(actionId)}`);}
 receive(command:components['schemas']['DeviceFormerSubmission']):Promise<components['schemas']['DeviceEvidenceSubmissionResult']>{return this.request('/api/v1/evidence/former-device',command);}
 evidence(actionId:string,deviceId:string):Promise<components['schemas']['DeviceEvidence']>{return this.request(`/api/v1/evidence/${encodeURIComponent(actionId)}`,undefined,deviceId);}
 /** UI must await this whole sequence and persist the snapshot before enabling
  * commands. A failed download leaves execution disabled. P33 owns local storage. */
 async continueOnThisPhone(command:components['schemas']['DeviceTakeoverCommand']){
  const result=await this.takeover(command);
  if(result.receipt.businessStatus!=='accepted')return {result,snapshot:null};
  if(command.context.kind!=='device')throw new Error('Device context required');
  const snapshot=await this.snapshot(command.payload.roundId,command.context.deviceId);
  // A retry can return an earlier accepted takeover after a newer one won.
  if(snapshot.context.mode!=='owner'||snapshot.context.owner.generation!==result.receipt.resourceVersions?.deviceGeneration||snapshot.context.roundState!=='active')return {result,snapshot:null};
  return {result,snapshot};
 }
}
