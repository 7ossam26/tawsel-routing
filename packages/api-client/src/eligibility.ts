import type { components } from './schema.js';
/** Exact command is retained by the caller until result recovery. No automatic
 * retry with a new action ID; accepted collection is driver reported only. */
export class EligibilityClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown){
  const headers:Record<string,string>={};
  if(body!==undefined){const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';}
  const response=await this.fetcher(`${path}?kind=${this.kind}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.error?.message??'تعذر حفظ النتيجة.'),{status:response.status,code:value.error?.code});return value;
 }
 read(roundId:string):Promise<components['schemas']['EligibilitySnapshot']>{return this.request(`/api/v1/eligibility/rounds/${encodeURIComponent(roundId)}`);}
 result(actionId:string):Promise<components['schemas']['EligibilityActionStatus']>{return this.request(`/api/v1/eligibility/actions/${encodeURIComponent(actionId)}`);}
 defer(command:components['schemas']['EligibilityDeferCommand']):Promise<components['schemas']['EligibilityActionResult']>{return this.request('/api/v1/eligibility/defer',command);}
 retry(command:components['schemas']['EligibilityRetryCommand']):Promise<components['schemas']['EligibilityActionResult']>{return this.request('/api/v1/eligibility/retry',command);}
 activate(command:components['schemas']['EligibilityActivateCommand']):Promise<components['schemas']['EligibilityActionResult']>{return this.request('/api/v1/eligibility/activate',command);}
 urgency(command:components['schemas']['EligibilityUrgencyCommand']):Promise<components['schemas']['EligibilityActionResult']>{return this.request('/api/v1/eligibility/urgency',command);}
}
