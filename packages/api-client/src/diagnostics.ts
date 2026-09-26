import type {components} from './schema.js';
/** Deployment operator only. Never initialize this client with an ERP or browser credential. */
export class DiagnosticsClient {
 constructor(private readonly options:{baseUrl:string;operatorToken:string;fetcher?:typeof fetch}){}
 private async get<T>(path:string):Promise<T>{
  const response=await(this.options.fetcher??fetch)(`${this.options.baseUrl}${path}`,{headers:{authorization:`Bearer ${this.options.operatorToken}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`Diagnostics unavailable (${response.status})`);
  return response.json() as Promise<T>;
 }
 health(){return this.get<components['schemas']['DiagnosticsHealth']>('/internal/diagnostics/health');}
 metrics(){return this.get<components['schemas']['DiagnosticsMetrics']>('/internal/diagnostics/metrics');}
 trace(tenantId:string,sourceId:string,actionId:string){return this.get<components['schemas']['DiagnosticsTrace']>(`/internal/diagnostics/actions/${encodeURIComponent(actionId)}?${new URLSearchParams({tenantId,sourceId})}`);}
}
