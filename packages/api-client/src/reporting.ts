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
 async requestExcel(id:string,snapshotId:string,filters:ReportFilters={},signal?:AbortSignal):Promise<components['schemas']['ReportExportStatus']>{
  const query=new URLSearchParams({kind:this.kind}),response=await this.fetcher(`/api/v1/reports/workdays/${encodeURIComponent(id)}/exports?${query}`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({snapshotId,filters:{...(filters.roundId?{roundId:filters.roundId}:{}),...(filters.driverId?{driverId:filters.driverId}:{}),...(filters.branchId?{branchId:filters.branchId}:{}),...(filters.outcome?{outcome:filters.outcome}:{})}}),...(signal?{signal}:{})}),body=await response.json();
  if(!response.ok)throw Object.assign(new Error(body.detail??'تعذر إنشاء ملف Excel.'),{status:response.status,code:body.code});return body;
 }
 async exportStatus(exportId:string,signal?:AbortSignal):Promise<components['schemas']['ReportExportStatus']>{return this.read(`/api/v1/report-exports/${encodeURIComponent(exportId)}`,{},signal);}
 async downloadExcel(exportId:string,signal?:AbortSignal):Promise<{blob:Blob;fileName:string}>{
  const query=new URLSearchParams({kind:this.kind}),response=await this.fetcher(`/api/v1/report-exports/${encodeURIComponent(exportId)}/download?${query}`,{credentials:'same-origin',cache:'no-store',...(signal?{signal}:{})});
  if(!response.ok){const body=await response.json();throw Object.assign(new Error(body.detail??'تعذر تنزيل ملف Excel.'),{status:response.status,code:body.code});}
  const disposition=response.headers.get('content-disposition')??'',fileName=disposition.match(/filename="([^"]+)"/)?.[1]??'tawsel-report.xlsx';return {blob:await response.blob(),fileName};
 }
}
