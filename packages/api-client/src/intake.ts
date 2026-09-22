import type { components } from './schema.js';
type S=components['schemas'];
export type IntakeCommand=S['B2bSourceSnapshotCommand']|S['B2bPrepareCommand']|S['B2bReceiveBatchCommand']|S['B2bWithdrawCommand']|S['B2bReassignCommand']|S['B2bUrgencyCommand'];
export type IntakeTask=S['B2bTask'];
/** Public-only HTTP consumer. A network exception leaves acceptance unknown;
 * callers persist and retry the same immutable envelope, never mint a new ID. */
export function intakeClient(baseUrl:string,credential:string) {
  const base=new URL(baseUrl);
  if(base.username||base.password||base.search||base.hash||(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname))))throw new Error('HTTPS required outside loopback');
  async function request<T>(path:string,body?:unknown):Promise<{status:number;body:T|S['Problem']}> {
    const response=await fetch(new URL(path,base),{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(15000),
      headers:{authorization:`Bearer ${credential}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json() as T|S['Problem']};
  }
  return {
    command:(command:IntakeCommand)=>request<S['ActionResult']>(`/api/v1/intake/commands/${command.operationId}`,command),
    get:(externalId:string)=>request<IntakeTask>(`/api/v1/intake/task?${new URLSearchParams({externalId})}`),
    list:(query:{state?:IntakeTask['state'];driverExternalId?:string;limit?:string;cursor?:string}={})=>request<S['B2bTaskList']>(`/api/v1/intake/tasks?${new URLSearchParams(query)}`),
    result:(actionId:string)=>request<S['B2bBatchResult']>(`/api/v1/intake/results/${encodeURIComponent(actionId)}`)
  };
}
