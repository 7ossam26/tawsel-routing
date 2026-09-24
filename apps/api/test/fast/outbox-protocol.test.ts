import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {signWebhook,verifyWebhook} from '../../../../packages/api-client/src/webhook-signature.js';
import {senderEventConforms} from '../../src/outbox/validation.js';

test('published exact-byte signature vector validates with the public verifier and rejects normalization or changed bytes',()=>{
 const vector=JSON.parse(readFileSync(new URL('../../../../contracts/examples/webhook-signature.v1.json',import.meta.url),'utf8'));
 const body=Buffer.from(vector.bodyBase64 as string,'base64'),key={keyId:vector.keyId as string,secret:vector.secret as string};
 expect(senderEventConforms(JSON.parse(body.toString('utf8')))).toBe(true);
 const headers=signWebhook(body,vector.scope,key,vector.timestamp);
 expect(headers['x-tawsel-signature']).toBe(vector.signature);
 expect(verifyWebhook(body,headers,vector.scope,[key],Number(vector.timestamp))).toBe(true);
 expect(verifyWebhook(Buffer.from(JSON.stringify(JSON.parse(body.toString('utf8')),null,2)),headers,vector.scope,[key],Number(vector.timestamp))).toBe(false);
 expect(verifyWebhook(body,{...headers,'x-tawsel-delivery-timestamp':String(Number(vector.timestamp)+1)},vector.scope,[key],Number(vector.timestamp))).toBe(false);
 expect(verifyWebhook(body,{...headers,'x-tawsel-key-id':'other'},vector.scope,[key],Number(vector.timestamp))).toBe(false);
});
