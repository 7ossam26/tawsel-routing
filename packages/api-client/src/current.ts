import type { components } from './schema.js';
/** Preserve the complete command on uncertain delivery; reads never imply movement. */
export class CurrentClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown){
  const headers:Record<string,string>={};
  if(body!==undefined){const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';}
  const response=await this.fetcher(`${path}?kind=${this.kind}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.error?.message??'تعذر الاتصال بالجولة.'),{status:response.status,code:value.error?.code});return value;
 }
 read(roundId:string):Promise<components['schemas']['CurrentSnapshot']>{return this.request(`/api/v1/current/rounds/${encodeURIComponent(roundId)}`);}
 result(actionId:string):Promise<components['schemas']['CurrentActionStatus']>{return this.request(`/api/v1/current/actions/${encodeURIComponent(actionId)}`);}
 heading(command:components['schemas']['CurrentSelectHeadingCommand']):Promise<components['schemas']['CurrentActionResult']>{return this.request('/api/v1/current/heading',command);}
 arrival(command:components['schemas']['CurrentArrivalCommand']):Promise<components['schemas']['CurrentActionResult']>{return this.request('/api/v1/current/arrival',command);}
 correctOrigin(command:components['schemas']['CurrentCorrectOriginCommand']):Promise<components['schemas']['CurrentActionResult']>{return this.request('/api/v1/current/origin',command);}
}
