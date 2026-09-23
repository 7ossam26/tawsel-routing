import type { components } from './schema.js';
/** Exact command is retained by the caller until result recovery. No automatic
 * retry with a new action ID; accepted collection is driver reported only. */
export class OutcomesClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown){
  const headers:Record<string,string>={};
  if(body!==undefined){const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';}
  const response=await this.fetcher(`${path}?kind=${this.kind}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.error?.message??'تعذر حفظ النتيجة.'),{status:response.status,code:value.error?.code});return value;
 }
 read(roundId:string):Promise<components['schemas']['OutcomeSnapshot']>{return this.request(`/api/v1/outcomes/rounds/${encodeURIComponent(roundId)}`);}
 result(actionId:string):Promise<components['schemas']['OutcomeActionStatus']>{return this.request(`/api/v1/outcomes/actions/${encodeURIComponent(actionId)}`);}
 full(command:components['schemas']['OutcomeFullCommand']):Promise<components['schemas']['OutcomeActionResult']>{return this.request('/api/v1/outcomes/full',command);}
 partial(command:components['schemas']['OutcomePartialCommand']):Promise<components['schemas']['OutcomeActionResult']>{return this.request('/api/v1/outcomes/partial',command);}
 refusal(command:components['schemas']['OutcomeRefusalCommand']):Promise<components['schemas']['OutcomeActionResult']>{return this.request('/api/v1/outcomes/refusal',command);}
 noAnswer(command:components['schemas']['OutcomeNoAnswerCommand']):Promise<components['schemas']['OutcomeActionResult']>{return this.request('/api/v1/outcomes/no-answer',command);}
}
