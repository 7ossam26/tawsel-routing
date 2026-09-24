import {createHmac} from 'node:crypto';
import type {Claim} from './queue.js';
/** Producer implementation of the published v1 protocol. The portable consumer
 * verifier is independent and checks these exact bytes over the real HTTP wire. */
export function signDelivery(claim:Claim,secret:string):Record<string,string>{
 if(!/^[a-f0-9]{64}$/.test(secret)||!claim.keyId)throw new Error('Invalid scoped signing material');
 const prefix=`tawsel-webhook-v1\n${claim.tenantId}\n${claim.integrationId}\n${claim.keyId}\n${claim.timestamp}\n`;
 const digest=createHmac('sha256',Buffer.from(secret,'hex')).update(prefix,'utf8').update(claim.body).digest('hex');
 return {'x-tawsel-tenant-id':claim.tenantId,'x-tawsel-integration-id':claim.integrationId,'x-tawsel-key-id':claim.keyId,
  'x-tawsel-delivery-timestamp':claim.timestamp,'x-tawsel-signature':`v1=${digest}`};
}
