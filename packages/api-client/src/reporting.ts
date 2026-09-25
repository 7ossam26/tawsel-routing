import type {components} from './schema.js';
export type ReportFilters={roundId?:string;driverId?:string;branchId?:string;outcome?:NonNullable<components['schemas']['ReportFilters']['outcome']>;snapshotId?:string};
export class ReportingClient {
 constructor(private readonly kind:'personal'|'company',private readonly fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
 private async read<T>(path:string,filters:Record<string,string|undefined>,signal?:AbortSignal):Promise<T>{
  const query=new URLSearchParams({kind:this.kind});for(const [key,value] of Object.entries(filters))if(value)query.set(key,value);
  const response=await this.fetcher(`${path}?${query}`,{credentials:'same-origin',cache:'no-store',...(signal?{signal}:{})});const body=await response.json();
  if(!response.ok)throw Object.assign(new Error(body.detail??'تعذر تحميل التقرير.'),{status:response.status,code:body.code});return body;
 }
 list(filters:{branchId?:string;driverId?:string;before?:string}={},signal?:AbortSignal):Promise<components['schemas']['ReportDayList']>{return this.read('/api/v1/reports/workdays',filters,signal);}
 workday(id:string,filters:ReportFilters={},signal?:AbortSignal):Promise<components['schemas']['ReportWorkday']>{return this.read(`/api/v1/reports/workdays/${encodeURIComponent(id)}`,filters,signal);}
 timing(id:string,roundId:string,filters:ReportFilters={},signal?:AbortSignal):Promise<components['schemas']['ReportTimingSnapshot']>{return this.read(`/api/v1/reports/workdays/${encodeURIComponent(id)}/rounds/${encodeURIComponent(roundId)}/timing`,filters,signal);}
}
