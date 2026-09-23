import type { components } from './schema.js';
/** Online-only start. Preserve the exact action envelope on uncertain delivery.
 * The P34 journal must provide a complete, quiescent relevantActionIds barrier. */
export class RoundsClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown){
  const headers:Record<string,string>={};
  if(body!==undefined){
   const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});
   if(!bootstrap.ok)throw new Error(`Session bootstrap: ${bootstrap.status}`);
   headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';
  }
  const response=await this.fetcher(`${path}?kind=${this.kind}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();
  // Retained rejection is a command result, not an uncertain network failure.
  if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.error?.message??'Round request failed'),{status:response.status,code:value.error?.code});
  return value;
 }
 readiness(body:components['schemas']['RoundReadinessRequest']):Promise<components['schemas']['RoundReadiness']>{return this.request('/api/v1/rounds/readiness',body);}
 start(body:components['schemas']['RoundStartCommand']):Promise<components['schemas']['RoundStartActionResult']>{return this.request('/api/v1/rounds/start',body);}
 current():Promise<components['schemas']['RoundCurrent']>{return this.request('/api/v1/rounds/current');}
 result(actionId:string):Promise<components['schemas']['RoundActionStatus']>{return this.request(`/api/v1/rounds/actions/${encodeURIComponent(actionId)}`);}
}
