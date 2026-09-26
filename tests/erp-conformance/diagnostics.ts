/** Public-only negative authorization check. No database or operator credential. */
import {pathToFileURL} from 'node:url';
export async function checkDiagnosticsIsolation(baseUrl:string,authorization:string){
 const results=[];
 for(const path of ['/internal/diagnostics/health','/internal/diagnostics/metrics']){
  const response=await fetch(baseUrl+path,{headers:{authorization},signal:AbortSignal.timeout(10000)});
  if(![401,404].includes(response.status))throw new Error(`ERP credential unexpectedly reached deployment diagnostics (${response.status})`);
  results.push({path,status:response.status});
 }
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const baseUrl=process.env.TAWSEL_CONFORMANCE_URL,authorization=process.env.TAWSEL_CONFORMANCE_AUTHORIZATION;
 if(!baseUrl||!authorization)throw new Error('Set TAWSEL_CONFORMANCE_URL and the ordinary ERP service Authorization value.');
 await checkDiagnosticsIsolation(baseUrl,authorization);
 console.log('PASS: ordinary ERP credential cannot read deployment-wide diagnostics.');
}
