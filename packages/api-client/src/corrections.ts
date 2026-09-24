import type {components} from './schema.js';
/** Retain the exact action until its result is known. A correction changes a
 * reported fact; this client never creates a refund or silently retries. */
export class CorrectionsClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown,deviceId?:string){
  const headers:Record<string,string>={};
  if(body!==undefined){const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';}
  const response=await this.fetcher(`${path}?kind=${this.kind}${deviceId?`&deviceId=${encodeURIComponent(deviceId)}`:''}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.error?.message??'تعذر حفظ التصحيح.'),{status:response.status,code:value.error?.code});return value;
 }
 availability(attemptId:string,deviceId:string):Promise<components['schemas']['CorrectionAvailability']>{return this.request(`/api/v1/corrections/attempts/${encodeURIComponent(attemptId)}`,undefined,deviceId);}
 correct(command:components['schemas']['CorrectionCorrectCommand']):Promise<components['schemas']['CorrectionActionResult']>{return this.request('/api/v1/corrections/outcomes',command);}
 adopt(command:components['schemas']['DeviceAdoptionCommand']):Promise<components['schemas']['CorrectionActionResult']>{return this.request('/api/v1/corrections/adopt',command);}
 result(actionId:string):Promise<components['schemas']['CorrectionActionStatus']>{return this.request(`/api/v1/corrections/actions/${encodeURIComponent(actionId)}`);}
}
