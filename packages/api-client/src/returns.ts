import type {components} from './schema.js';
type S=components['schemas'];
/** Persist each exact command before sending. Timeouts and 503 mean unknown;
 * recover/retry that action ID. No automatic new action or assumed receipt. */
export function returnReceiverClient(baseUrl:string,credential:string,fetcher:typeof fetch=globalThis.fetch){
 const base=new URL(baseUrl);
 if(base.username||base.password||base.search||base.hash||(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname))))throw new Error('HTTPS required outside loopback');
 async function request<T>(path:string,body?:unknown):Promise<{status:number;body:T|S['Problem']}>{
  const response=await fetcher(new URL(path,base),{method:body===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:`Bearer ${credential}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,body:await response.json() as T|S['Problem']};
 }
 return {
  command:(c:S['ReturnReceiveCommand']|S['ReturnDisposeCommand'])=>request<S['ReturnActionResult']>(`/api/v1/erp/returns/commands/${c.operationId}`,c),
  read:(id:string)=>request<S['ReturnRequestView']>(`/api/v1/erp/returns/requests/${encodeURIComponent(id)}`),
  pending:(driverId:string,sourceBranchId:string,cursor?:string)=>request<S['ReturnRequestList']>(`/api/v1/erp/returns/pending?${new URLSearchParams({driverId,sourceBranchId,...(cursor?{cursor}:{})})}`),
  result:(id:string)=>request<S['ReturnActionStatus']>(`/api/v1/erp/returns/actions/${encodeURIComponent(id)}`)
 };
}
export class ReturnsClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,body?:unknown){
  const headers:Record<string,string>={};
  if(body!==undefined){const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});if(!bootstrap.ok)throw new Error('تعذر التحقق من الجلسة.');headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';}
  const response=await this.fetcher(`${path}?kind=${this.kind}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok&&!value.receipt)throw Object.assign(new Error(value.detail??'لم يتأكد الاستلام؛ انتظر تأكيد الفرع.'),{status:response.status,code:value.code});return value;
 }
 groups():Promise<S['ReturnGroups']>{return this.request('/api/v1/returns/groups');}
 offer(c:S['ReturnRequestCommand']):Promise<S['ReturnActionResult']>{return this.request('/api/v1/returns/request',c);}
 read(id:string):Promise<S['ReturnRequestView']>{return this.request(`/api/v1/returns/requests/${encodeURIComponent(id)}`);}
 result(id:string):Promise<S['ReturnActionStatus']>{return this.request(`/api/v1/returns/actions/${encodeURIComponent(id)}`);}
 confirmation(id:string,claims:S['ReturnClaim'][]):Promise<S['ReturnConfirmation']>{return this.request(`/api/v1/returns/requests/${encodeURIComponent(id)}/confirmation`,{claims});}
}
