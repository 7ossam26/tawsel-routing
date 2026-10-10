import type {components} from './schema.js';
import {publicValidator} from './validation.js';
type S=components['schemas'];
export type ConnectionPackage=S['PrivateConnectionPackage'];
export type ConnectionApproval=Pick<S['ConnectionMetadata'],'apiUrl'|'issuer'|'callbackUrl'|'tenantId'|'integrationId'|'erpCompanyId'|'sourceCommit'|'contractSha256'>;
/** Backend import verification. Approval comes from protected ERP deployment
 * configuration/operator review, never the uploaded package itself. Do not log
 * the package or return its credential/key material to the browser. */
export async function verifyConnectionPackage(value:unknown,approved:ConnectionApproval,request:typeof fetch=fetch){
 const conforms=publicValidator();
 if(!conforms('connection-package.schema.json#/$defs/Private',value))throw new Error('Invalid private connection package');
 const p=value as ConnectionPackage;
 for(const key of ['apiUrl','issuer','callbackUrl','tenantId','integrationId','erpCompanyId','sourceCommit','contractSha256'] as const)if(typeof approved[key]!=='string'||p.metadata[key]!==approved[key])throw new Error('Connection identity is not approved');
 for(const raw of [approved.apiUrl,approved.callbackUrl,approved.issuer]){
  const u=new URL(raw);if(u.href!==raw||u.protocol!=='https:'||u.port||u.username||u.password||u.hash||u.search)throw new Error('Exact HTTPS443 configuration required');
 }
 if(Date.parse(p.credential.expiresAt)<=Date.now())throw new Error('Connection credential expired');
 const response=await request(new URL('/api/v1/provisioning/configuration',approved.apiUrl),{headers:{authorization:`Bearer ${p.credential.bearer}`},redirect:'error',signal:AbortSignal.timeout(15000)});
 const actual=await response.json() as S['SourceConfiguration'];
 if(!response.ok||!conforms('provisioning.schema.json#/$defs/SourceConfiguration',actual)||actual.identity.tenantId!==approved.tenantId||actual.identity.integrationId!==approved.integrationId||actual.issuer!==approved.issuer||actual.erpCompanyId!==approved.erpCompanyId||actual.interopVersion!==p.metadata.interopVersion||actual.humanDelegation!==false||!p.metadata.capabilities.every(c=>actual.serviceCapabilities?.includes(c)))throw new Error('Source verification failed');
 // A JSON bundle cannot prove authenticity/installation of its HMAC material.
 // Activation requires a verified, scoped signed callback durably received by
 // the native Shahn receiver; that separate witness stays visible to its admin.
 return {metadata:p.metadata,sourceVerified:true as const,signing:'pending-signed-callback' as const,contractIdentity:'operator-approved' as const,enrollment:p.metadata.enrollmentMode};
}
