import {readFileSync} from 'node:fs';
import type {WebhookKey} from '@tawsel/api-client/webhook-signature';
export interface ReceiverConfig {
 tenantId:string; integrationId:string; statusToken:string; keys:WebhookKey[];
 host:string; port:number; tawselBaseUrl?:string; tawselAuthorization?:string; testLoopback?:boolean;
}
export function readConfig():ReceiverConfig{
 if(!process.env.MOCK_ERP_CONFIG)throw new Error('MOCK_ERP_CONFIG must name the receiver configuration file');
 const c=JSON.parse(readFileSync(process.env.MOCK_ERP_CONFIG,'utf8')) as ReceiverConfig;
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
 if(!uuid.test(c.tenantId)||!uuid.test(c.integrationId)||typeof c.statusToken!=='string'||c.statusToken.length<32||!Array.isArray(c.keys)||!c.keys.length||!c.keys.every(k=>k&&typeof k.secret==='string'&&typeof k.keyId==='string'&&/^[a-f0-9]{64}$/.test(k.secret)&&/^[\w-]{1,64}$/.test(k.keyId))||new Set(c.keys.map(k=>k.keyId)).size!==c.keys.length)throw new Error('Invalid receiver scope, status token or signing keys');
 if(c.keys.some(k=>[k.activatedAt,k.verifyUntil].some(t=>t!==undefined&&(!Number.isSafeInteger(t)||t<0))))throw new Error('Invalid signing-key lifetime');
 if(!Number.isInteger(c.port)||c.port<0||c.port>65535||typeof c.host!=='string'||!c.host)throw new Error('Invalid listener');
 if(c.tawselAuthorization!==undefined&&(typeof c.tawselAuthorization!=='string'||!c.tawselAuthorization.startsWith('Bearer ')))throw new Error('Invalid scoped service credential');
 if(c.tawselBaseUrl){const u=new URL(c.tawselBaseUrl);if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||(u.protocol!=='https:'&&!(c.testLoopback&&u.protocol==='http:'&&u.hostname==='127.0.0.1')))throw new Error('Tawsel API requires HTTPS (explicit loopback test exception)');}
 return c;
}
