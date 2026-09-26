/** Standalone verifier: Node built-ins only, safe to copy with the handoff. */
import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function releasePath(root,path){
 if(typeof path!=='string'||!path||path.includes('\\')||path.includes(':')||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error(`Unsafe manifest path: ${String(path)}`);
 const absolute=resolve(root,path);if(!absolute.startsWith(resolve(root)+sep))throw new Error('Manifest path escapes bundle');
 return absolute;
}
export async function verifyArtifacts(root,entries){
 const base=await realpath(root),seen=new Set();
 for(const entry of entries){
  if(seen.has(entry.path)||entry.path==='docs/erp/release-manifest.json')throw new Error('Duplicate path or manifest self-digest');seen.add(entry.path);
  const path=releasePath(base,entry.path),physical=await realpath(path);
  if(!physical.startsWith(base+sep))throw new Error('Artifact symlink escapes bundle');
  const bytes=await readFile(path);
  if(!/^[a-f0-9]{64}$/.test(entry.sha256)||sha256(bytes)!==entry.sha256||bytes.length!==entry.bytes)throw new Error(`Artifact digest/size mismatch: ${entry.path}`);
 }
 return seen;
}
export async function verifyRelease(root){
 const json=async path=>JSON.parse(await readFile(releasePath(root,path),'utf8'));
 const manifest=await json('docs/erp/release-manifest.json');
 if(manifest.manifestVersion!==1||manifest.release.status!=='local-handoff-candidate'||manifest.release.published!==false)throw new Error('Unsupported release declaration');
 const seen=await verifyArtifacts(root,manifest.artifacts);
 for(const path of ['contracts/openapi.yaml','contracts/examples/valid.json','contracts/examples/invalid.json','packages/api-client/dist/schema.d.ts','apps/mock-erp/src/source.ts','docs/ERP-INTEGRATION-HANDOFF.md','docs/erp/consumer-quickstart.md','docs/verification/contract-audit.json','dist/erp-reference/package-lock.json','dist/erp-reference/conformance/source.mjs','dist/erp-reference/conformance/source-report.js','dist/erp-reference/conformance/receiver.mjs'])if(!seen.has(path))throw new Error(`Missing required artifact: ${path}`);
 const api=await readFile(releasePath(root,'contracts/openapi.yaml'),'utf8');
 const actual={api:api.match(/^ {2}version: (.+)$/m)?.[1],openapi:api.match(/^openapi: (.+)$/m)?.[1],client:(await json('packages/api-client/package.json')).version,referenceConsumer:(await json('apps/mock-erp/package.json')).version,action:(await json('contracts/action-envelope.v1.schema.json')).properties.schemaVersion.const,payload:(await json('contracts/action-envelope.v1.schema.json')).properties.payloadVersion.const,event:(await json('contracts/events/envelope.v1.schema.json')).properties.schemaVersion.const,eventPayload:(await json('contracts/events/envelope.v1.schema.json')).properties.payloadVersion.const,report:(await json('contracts/reporting.schema.json')).$defs.Workday.properties.definitionVersion.const,jsonSchema:(await json('contracts/common.schema.json')).$schema};
 if(JSON.stringify(actual)!==JSON.stringify(manifest.supportedVersions))throw new Error('Declared versions differ from canonical artifacts');
 const identity=await json('metadata/source-identity.json');
 if(identity.baseCommit!==manifest.release.baseCommit||sha256(JSON.stringify(identity.files))!==identity.sourceSha256||identity.sourceSha256!==manifest.release.sourceSha256)throw new Error('Source identity mismatch');
 const runtime=manifest.artifacts.filter(entry=>/^dist\/erp-reference\/(api-client\/|mock-erp\/|conformance\/|package(?:-lock)?\.json$)/.test(entry.path));
 if(sha256(JSON.stringify(runtime))!==manifest.consumerRuntimeSha256)throw new Error('Consumer runtime identity mismatch');
 for(const entry of manifest.artifacts.filter(e=>e.path.startsWith('contracts/'))){
  const suffix=entry.path.slice('contracts/'.length);
  for(const prefix of ['packages/api-client/dist/contracts/','dist/erp-reference/api-client/dist/contracts/']){
   if(!seen.has(prefix+suffix)||sha256(await readFile(releasePath(root,prefix+suffix)))!==entry.sha256)throw new Error(`Generated schema copy drift: ${prefix+suffix}`);
  }
 }
 for(const [kind,prefix] of [['application','db/migrations/'],['reference','apps/mock-erp/migrations/']]){
  const names=manifest.artifacts.filter(e=>e.path.startsWith(prefix)&&e.path.endsWith('.sql')).map(e=>e.path.slice(prefix.length));
  if(JSON.stringify(names)!==JSON.stringify(manifest.migrations[kind]))throw new Error(`Migration declaration mismatch: ${kind}`);
 }
 return {artifacts:manifest.artifacts.length,sourceSha256:identity.sourceSha256,consumerRuntimeSha256:manifest.consumerRuntimeSha256,versions:actual,status:manifest.release.status};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(await verifyRelease(resolve(process.argv[2]??'.')),null,2));
