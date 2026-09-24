import type {components} from './schema.js';
export type MonitoringPage={branchId?:string;limit?:number;cursor?:string;etag?:string};
export type MonitoringRead<T>={status:200;data:T;etag:string;scopeKey:string;revision:number;refreshedAt:string}|{status:304;data:null;etag:string;scopeKey:string;revision:number;refreshedAt:string};
/** No polling or automatic application. Consumers compare revision only within
 * scopeKey, retain their body on 304, and omit ETag for a reconnect full read. */
export class MonitoringClient {
 constructor(private readonly options:{kind?:'personal'|'company';baseUrl?:string;authorization?:string;fetcher?:typeof fetch}){}
 private async read<T>(path:string,page:MonitoringPage={},sourceId?:string):Promise<MonitoringRead<T>>{
  const query=new URLSearchParams();if(this.options.kind)query.set('kind',this.options.kind);
  if(page.branchId)query.set('branchId',page.branchId);if(page.limit!==undefined)query.set('limit',String(page.limit));if(page.cursor)query.set('cursor',page.cursor);if(sourceId)query.set('sourceId',sourceId);
  const headers:Record<string,string>={};if(this.options.authorization)headers.Authorization=this.options.authorization;if(page.etag)headers['If-None-Match']=page.etag;
  const response=await (this.options.fetcher??globalThis.fetch)(`${this.options.baseUrl??''}/api/v1/${this.options.kind?'':'erp/'}monitoring/${path}?${query}`,{credentials:'same-origin',cache:'no-cache',headers});
  if(response.status!==200&&response.status!==304){const problem=await response.json();throw Object.assign(new Error(problem.detail??'Refresh failed.'),{status:response.status,code:problem.code});}
  const etag=response.headers.get('etag'),scopeKey=response.headers.get('x-snapshot-scope'),refreshedAt=response.headers.get('x-refreshed-at'),revision=Number(response.headers.get('x-snapshot-revision'));
  if(!etag||!scopeKey||!refreshedAt||!Number.isSafeInteger(revision)||revision<1)throw new Error('Missing monitoring revision metadata.');
  return response.status===304?{status:304,data:null,etag,scopeKey,revision,refreshedAt}:{status:200,data:await response.json() as T,etag,scopeKey,revision,refreshedAt};
 }
 driver(id:string,page?:MonitoringPage){return this.read<components['schemas']['MonitoringSnapshot']>(`drivers/${encodeURIComponent(id)}`,page);}
 trip(id:string,page?:MonitoringPage){return this.read<components['schemas']['MonitoringSnapshot']>(`trips/${encodeURIComponent(id)}`,page);}
 taskHistory(id:string,page?:MonitoringPage){return this.read<components['schemas']['MonitoringHistory']>(`tasks/${encodeURIComponent(id)}/history`,page);}
 workdayHistory(id:string,page?:MonitoringPage){return this.read<components['schemas']['MonitoringHistory']>(`workdays/${encodeURIComponent(id)}/history`,page);}
 action(id:string,sourceId:string,page?:MonitoringPage){return this.read<components['schemas']['MonitoringActionSnapshot']>(`actions/${encodeURIComponent(id)}`,page,sourceId);}
}
