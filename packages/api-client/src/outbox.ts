import type {components} from './schema.js';
type Command=components['schemas']['OutboxConfigureWebhookCommand']|components['schemas']['OutboxRotateSigningKeyCommand']|components['schemas']['OutboxRetryDeliveryCommand'];
/** No implicit retries or new identities. Retain the caller's command and replay
 * the same action after response loss. Public consumer needs no Tawsel internals. */
export class OutboxClient{
 constructor(readonly options:{baseUrl:string;authorization:string;fetcher?:typeof fetch}){}
 private async request<T>(path:string,command?:Command):Promise<T>{
  const response=await (this.options.fetcher??fetch)(`${this.options.baseUrl}/api/v1/integration/${path}`,{method:command?'POST':'GET',headers:{authorization:this.options.authorization,...(command?{'content-type':'application/json'}:{})},...(command?{body:JSON.stringify(command)}:{}),redirect:'error',signal:AbortSignal.timeout(10_000)});
  const value=await response.json() as Record<string,unknown>;
  if(!response.ok)throw Object.assign(new Error('Delivery operation failed'),{status:response.status,code:value.code});return value as T;
 }
 command(value:Command){return this.request<components['schemas']['ActionResult']>(`commands/${value.operationId}`,value);}
 queue(page:{limit?:number;cursor?:string}={}){const q=new URLSearchParams();if(page.limit!==undefined)q.set('limit',String(page.limit));if(page.cursor)q.set('cursor',page.cursor);return this.request<components['schemas']['OutboxQueue']>(`deliveries?${q}`);}
 detail(eventId:string,page:{limit?:number;beforeAttempt?:number}={}){const q=new URLSearchParams();if(page.limit!==undefined)q.set('limit',String(page.limit));if(page.beforeAttempt!==undefined)q.set('beforeAttempt',String(page.beforeAttempt));return this.request<components['schemas']['OutboxDetail']>(`deliveries/${encodeURIComponent(eventId)}?${q}`);}
 replay(aggregateType:components['schemas']['EventEnvelope']['aggregate']['type'],aggregateId:string,afterSequence=0,limit=50){return this.request<components['schemas']['OutboxReplay']>(`replay?${new URLSearchParams({aggregateType,aggregateId,afterSequence:String(afterSequence),limit:String(limit)})}`);}
}
