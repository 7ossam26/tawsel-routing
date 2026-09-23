import type { components } from './schema.js';
export type PlanningCommand=components['schemas']['PlanningSaveDraftCommand']|components['schemas']['PlanningRequestPreviewCommand']|components['schemas']['PlanningRequestReplanCommand']|components['schemas']['PlanningManualOrderCommand'];
/** Browser-session consumer; never selects a human identity via a service token.
 * Retain the exact command/action ID on uncertain delivery and poll its job ID. */
export class PlanningClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=fetch){}
 private async request(path:string,method='GET',body?:PlanningCommand){
  const headers:Record<string,string>={};
  if(method!=='GET'){
   const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});
   if(!bootstrap.ok)throw new Error(`Session bootstrap: ${bootstrap.status}`);
   headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';
  }
  const response=await this.fetcher(`${path}${path.includes('?')?'&':'?'}kind=${this.kind}`,{method,credentials:'same-origin',cache:'no-store',headers,...(body?{body:JSON.stringify(body)}:{})});
  const value=await response.json();
  if(!response.ok)throw Object.assign(new Error(value.error?.message??'Planning request failed'),{status:response.status,code:value.error?.code});
  return value;
 }
 command(command:PlanningCommand):Promise<components['schemas']['ActionResult']>{return this.request(`/api/v1/planning/commands/${encodeURIComponent(command.operationId)}`,'POST',command);}
 job(jobId:string):Promise<components['schemas']['PlanningJob']>{return this.request(`/api/v1/planning/jobs/${encodeURIComponent(jobId)}`);}
 plans(driverId:string,limit=20,beforeRevision?:number):Promise<components['schemas']['PlanningPlans']>{
  const query=new URLSearchParams({limit:String(limit),...(beforeRevision?{beforeRevision:String(beforeRevision)}:{})});
  return this.request(`/api/v1/planning/drivers/${encodeURIComponent(driverId)}/plans?${query}`);
 }
}
