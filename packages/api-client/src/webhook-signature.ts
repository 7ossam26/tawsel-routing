import {createHmac,timingSafeEqual} from 'node:crypto';

export type WebhookScope={tenantId:string;integrationId:string};
export type WebhookKey={keyId:string;secret:string;activatedAt?:number;verifyUntil?:number};
export type SignatureHeaders=Record<string,string|undefined>;
export const signatureWindowMs=300_000;
/** Prefix is UTF-8, with LF separators and a final LF immediately before the
 * unmodified body. Timestamp is decimal Unix milliseconds, never event time. */
export function signWebhook(body:Uint8Array,scope:WebhookScope,key:WebhookKey,timestamp:string):Record<string,string>{
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(key.keyId)||!/^[a-f0-9]{64}$/.test(key.secret)||!/^\d{13}$/.test(timestamp))throw new Error('Invalid signing material');
 const prefix=`tawsel-webhook-v1\n${scope.tenantId}\n${scope.integrationId}\n${key.keyId}\n${timestamp}\n`;
 const signature=createHmac('sha256',Buffer.from(key.secret,'hex')).update(prefix,'utf8').update(body).digest('hex');
 return {'x-tawsel-tenant-id':scope.tenantId,'x-tawsel-integration-id':scope.integrationId,'x-tawsel-key-id':key.keyId,
  'x-tawsel-delivery-timestamp':timestamp,'x-tawsel-signature':`v1=${signature}`};
}
/** Authentication only: callers must validate the canonical envelope/payload,
 * recipient and version, then durably deduplicate before acknowledging receipt. */
export function verifyWebhook(body:Uint8Array,headers:SignatureHeaders,scope:WebhookScope,keys:WebhookKey[],now=Date.now()):boolean{
 const timestamp=headers['x-tawsel-delivery-timestamp'],signature=headers['x-tawsel-signature'];
 if(headers['x-tawsel-tenant-id']!==scope.tenantId||headers['x-tawsel-integration-id']!==scope.integrationId
  ||!timestamp||!/^\d{13}$/.test(timestamp)||Math.abs(now-Number(timestamp))>signatureWindowMs
  ||!signature||!/^v1=[a-f0-9]{64}$/.test(signature))return false;
 const key=keys.find(k=>k.keyId===headers['x-tawsel-key-id']);
 if(!key||(key.activatedAt!==undefined&&Number(timestamp)<key.activatedAt)||(key.verifyUntil!==undefined&&now>key.verifyUntil))return false;
 try{return timingSafeEqual(Buffer.from(signature),Buffer.from(signWebhook(body,scope,key,timestamp)['x-tawsel-signature']!));}catch{return false;}
}
