import type {components} from './schema.js';
export type LocationSnapshot=components['schemas']['LocationExecutionSnapshot'];
export type LocationConfirmation=components['schemas']['LocationConfirmCommand'];
/** Browser-session boundary. ERP service credentials cannot impersonate reviewers.
 * The caller persists each exact command until the authoritative result is known. */
export class LocationClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async request(path:string,method='GET',body?:unknown){
  const headers:Record<string,string>={};
  if(method!=='GET'){
   const bootstrap=await this.fetcher('/api/session/bootstrap',{credentials:'same-origin',cache:'no-store'});
   if(!bootstrap.ok)throw new Error(`Session bootstrap: ${bootstrap.status}`);
   headers['X-CSRF-Token']=(await bootstrap.json() as {csrfToken:string}).csrfToken;headers['Content-Type']='application/json';
  }
  const response=await this.fetcher(`${path}?kind=${this.kind}`,{method,credentials:'same-origin',cache:'no-store',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok)throw Object.assign(new Error(value.error?.message??'Location request failed'),{status:response.status,code:value.error?.code});return value;
 }
 get(taskId:string):Promise<LocationSnapshot>{return this.request(`/api/v1/locations/${encodeURIComponent(taskId)}`);}
 list():Promise<components['schemas']['LocationList']>{return this.request('/api/v1/locations');}
 search(taskId:string,query:string):Promise<components['schemas']['LocationCandidates']>{return this.request(`/api/v1/locations/${encodeURIComponent(taskId)}/candidates`,'POST',{query});}
 confirm(command:LocationConfirmation):Promise<components['schemas']['ActionResult']>{return this.request(`/api/v1/locations/${encodeURIComponent(command.payload.taskId as string)}`,'PUT',command);}
}
