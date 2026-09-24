import type {components} from './schema.js';
/** Read the separately authenticated ERP consumer; this is not a Tawsel route. */
export function sourceStatusClient(baseUrl:string,statusToken:string){
 const base=new URL(baseUrl);if(base.username||base.password||base.search||base.hash||(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname))))throw new Error('HTTPS required outside loopback');
 return {async status():Promise<components['schemas']['SourceStatus']>{const r=await fetch(new URL('/api/v1/source/status',base),{headers:{authorization:`Bearer ${statusToken}`},redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`Source status unavailable: ${r.status}`);return await r.json() as components['schemas']['SourceStatus'];}};
}
