import type {Pool} from 'pg';
import {unseal} from '../auth/crypto.js';
import {signDelivery} from './signature.js';
import {claimDelivery,completeDelivery,type Claim} from './queue.js';
import {deliverHttp} from './transport.js';
import {DeliveryFailure} from './destination.js';
import {senderEventConforms} from './validation.js';
import type {OutboxConfig} from './config.js';

export type DeliveryLog={tenantId:string;integrationId:string;eventId:string;attemptId:string;attempt:number;result:string;errorCode:string|null};
export async function runOutboxOnce(pool:Pool,config:OutboxConfig,options:{signal?:AbortSignal;timeoutMs?:number;leaseMs?:number;log?:(entry:DeliveryLog)=>void;afterSend?:(claim:Claim)=>Promise<void>}={}):Promise<boolean>{
 const timeoutMs=options.timeoutMs??5000,leaseMs=options.leaseMs??30_000;
 if(!Number.isInteger(timeoutMs)||timeoutMs<50||timeoutMs>10_000||leaseMs<timeoutMs+1000)throw new Error('Delivery deadline must leave completion time inside the lease');
 if(options.signal?.aborted)return false;
 const claim=await claimDelivery(pool,leaseMs);if(!claim)return false;
 let received=false,error:string|undefined,httpStatus:number|undefined;
 try{
  if(!claim.keyId||!claim.encryptedSecret)throw new DeliveryFailure('signing_key_missing');
  const material=JSON.parse(unseal(claim.encryptedSecret,config.encryptionKey)) as {tenantId:string;integrationId:string;keyId:string;secret:string};
  if(material.tenantId!==claim.tenantId||material.integrationId!==claim.integrationId||material.keyId!==claim.keyId)throw new DeliveryFailure('signing_key_scope');
  const event=JSON.parse(claim.body.toString('utf8')) as Record<string,unknown>;
  if(!senderEventConforms(event))throw new DeliveryFailure('unsupported_event');
  // Scope fields inside nested source references must never cross the recipient.
  const scoped=(v:unknown):boolean=>!v||typeof v!=='object'||Object.entries(v).every(([k,x])=>k==='tenantId'?x===claim.tenantId:k==='integrationId'||k==='recipientIntegrationId'?x===claim.integrationId:scoped(x));
  if(!scoped(event))throw new DeliveryFailure('payload_scope');
  const headers=signDelivery(claim,material.secret);
  const signal=AbortSignal.any([AbortSignal.timeout(timeoutMs),...(options.signal?[options.signal]:[])]);
  httpStatus=await deliverHttp(claim,headers,config,signal);received=true;
 }catch(e){error=e instanceof DeliveryFailure?e.code:e instanceof Error&&['AbortError','TimeoutError'].includes(e.name)?'delivery_timeout':'delivery_unavailable';if(e instanceof DeliveryFailure)httpStatus=e.httpStatus;}
 // Fault seam intentionally outside catch: abrupt exit / unknown acknowledgement
 // remains sending until lease expiry, without pretending completion succeeded.
 if(received)await options.afterSend?.(claim);
 const completed=await completeDelivery(pool,claim,{received,...(error?{error}:{}),...(httpStatus?{httpStatus}:{})});
 options.log?.({tenantId:claim.tenantId,integrationId:claim.integrationId,eventId:claim.eventId,attemptId:claim.attemptId,attempt:claim.attempt,result:completed?(received?'received':'failed'):'lease-lost',errorCode:error??null});
 return true;
}
export async function runOutboxBatch(pool:Pool,config:OutboxConfig,options:Parameters<typeof runOutboxOnce>[2]={},concurrency=4):Promise<number>{
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>16)throw new Error('Outbox concurrency must be 1–16');
 return (await Promise.all(Array.from({length:concurrency},()=>runOutboxOnce(pool,config,options)))).filter(Boolean).length;
}
