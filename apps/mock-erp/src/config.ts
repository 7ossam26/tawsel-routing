import {readFileSync} from 'node:fs';
import {isIP} from 'node:net';
import type {WebhookKey} from '@tawsel/api-client/webhook-signature';
export interface ReceiverConfig {
 tenantId:string; integrationId:string; statusToken:string; keys:WebhookKey[];
 host:string; port:number; tawselBaseUrl?:string; tawselAuthorization?:string; testLoopback?:boolean;
 native?:NativeConfig;
}
export interface NativeConfig {
 mode?:'loopback'|'public-test';privateTestOnly?:true;origin:string;issuer:string;clientId:string;clientSecret:string;sessionKey:string;adminSubjects:string[];
 trustedProxyCidrs?:string[];
}
export function validateNative(c:ReceiverConfig){
 if(!c.native)return;
 const n=c.native;
 const mode=n.mode??(n.privateTestOnly?'loopback':undefined);
 if(mode==='loopback'){
  if(n.privateTestOnly!==true||process.env.NODE_ENV==='production'||!['127.0.0.1','::1','localhost'].includes(c.host))throw new Error('Native mock ERP is private/test-only and loopback-bound');
 }else if(mode==='public-test'){
  if(n.privateTestOnly||process.env.NODE_ENV!=='production'||c.host!=='0.0.0.0'||c.port<1||c.testLoopback||!Array.isArray(n.trustedProxyCidrs)||!n.trustedProxyCidrs.length||n.trustedProxyCidrs.some(s=>{if(typeof s!=='string')return true;const [ip,prefix,...rest]=s.split('/');return !!rest.length||isIP(ip??'')!==4||!/^(?:[0-9]|[12][0-9]|3[0-2])$/.test(prefix??'')||s==='0.0.0.0/0';}))throw new Error('Public mock requires production mode, fixed container listener and explicit trusted proxies');
 }else throw new Error('Native mock mode required');
 for(const value of [n.origin,n.issuer]){const u=new URL(value);if(u.username||u.password||u.search||u.hash||(u.protocol!=='https:'&&!(c.testLoopback&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))))throw new Error('Invalid native OIDC origin/issuer');}
 if(mode==='public-test'&&[n.origin,n.issuer,c.tawselBaseUrl].some(value=>!value||new URL(value).protocol!=='https:'||['localhost','127.0.0.1'].includes(new URL(value).hostname)))throw new Error('Public mock requires exact remote HTTPS origins');
 if(new URL(n.origin).origin!==n.origin||!n.clientId||!n.clientSecret||!(/^[a-f0-9]{64}$/).test(n.sessionKey)||!Array.isArray(n.adminSubjects)||!n.adminSubjects.length||n.adminSubjects.some(s=>typeof s!=='string'||!s))throw new Error('Native session configuration missing');
 if(!c.tawselBaseUrl||!c.tawselAuthorization)throw new Error('Native mock requires scoped public Tawsel configuration');
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
 validateNative(c);return c;
}
