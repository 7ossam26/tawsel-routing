import type {components} from './schema.js';
type Pending=Extract<components['schemas']['ClosureActionStatus'],{status:'pending'}>;
/** Retain the exact closure command until accepted or a durable rejection is
 * reconciled. A queued/offline close and HTTP 202 never authorize a new start. */
export class ClosureClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown){
  const headers:Record<string,string>={};
  if(body!==undefined){const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';}
  const response=await this.fetcher(`${path}?kind=${this.kind}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.error?.message??'تعذر تأكيد الإنهاء.'),{status:response.status,code:value.error?.code});return value;
 }
 endRound(command:components['schemas']['ClosureEndRoundCommand']):Promise<components['schemas']['ClosureActionResult']|Pending>{return this.request('/api/v1/closure/round',command);}
 endDay(command:components['schemas']['ClosureEndDayCommand']):Promise<components['schemas']['ClosureActionResult']|Pending>{return this.request('/api/v1/closure/day',command);}
 result(actionId:string):Promise<components['schemas']['ClosureActionStatus']>{return this.request(`/api/v1/closure/actions/${encodeURIComponent(actionId)}`);}
 summary(workdayId:string):Promise<components['schemas']['ClosureSummary']>{return this.request(`/api/v1/workdays/${encodeURIComponent(workdayId)}/summary`);}
 carryForward(workdayId:string):Promise<components['schemas']['ClosureCarryForward']>{return this.request(`/api/v1/workdays/${encodeURIComponent(workdayId)}/carry-forward`);}
}
/** IANA timezone rules handle winter/summer and offset transitions. The UTC
 * input stays intact; this helper never derives or changes a workday identity. */
export function formatWorkdayInstant(utc:string,locale='ar-EG'){
 return new Intl.DateTimeFormat(locale,{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).format(new Date(utc));
}
