import {readFile,readdir,writeFile,mkdir,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,verifyRelease} from './verify-erp-release.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const target=resolve(root,'dist/erp-handoff'),manifestPath='docs/erp/release-manifest.json';
const npmVersion=execFileSync(process.execPath,[resolve(process.env.npm_execpath??'.local/runtime/node_modules/npm/bin/npm-cli.js'),'--version'],{encoding:'utf8'}).trim();
const read=path=>readFile(resolve(root,path));
const json=async path=>JSON.parse(await read(path));
async function walk(path){const result=[];for(const entry of (await readdir(resolve(root,path),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(entry.isSymbolicLink())throw new Error(`Unexpected source symlink: ${path}/${entry.name}`);if(entry.isDirectory())result.push(...await walk(`${path}/${entry.name}`));else result.push(`${path}/${entry.name}`);}return result;}
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const sourcePaths=()=>[...new Set(git('ls-files','--cached','--others','--exclude-standard').split('\n'))].filter(p=>/^(apps\/|packages\/|db\/|scripts\/|identity\/|deploy\/|contracts\/|tests\/|package(?:-lock)?\.json$|.*config\.(?:ts|js|json)$)/.test(p)&&!/(?:\/dist\/|\/ui-dist\/|\.md$|\.zip$|\.png$)/.test(p)).sort();
async function identity(){const files=[];for(const path of sourcePaths())files.push({path,sha256:sha256(await read(path))});return {baseCommit:git('rev-parse','HEAD'),sourceSha256:sha256(JSON.stringify(files)),files};}
if(process.argv[2]==='check'){
 const result=await verifyRelease(target),recorded=await json(manifestPath),current=await identity();
 if(current.sourceSha256!==recorded.release.sourceSha256||current.baseCommit!==recorded.release.baseCommit)throw new Error('Source changed since package; rebuild and repeat affected evidence');
 // The tracked canonical manifest and all packaged source inputs must still agree.
 if((await read(manifestPath)).toString()!==await readFile(resolve(target,manifestPath),'utf8'))throw new Error('Tracked manifest differs from bundle');
 for(const entry of recorded.artifacts)if(entry.source){const bytes=await read(entry.source);if(sha256(bytes)!==entry.sha256)throw new Error(`Source artifact drift: ${entry.source}`);}
 const proof=await json('docs/verification/integration-local-2026-09-26.json');
 if(proof.status!=='passed'||proof.sourceSha256!==result.sourceSha256||proof.consumerRuntimeSha256!==result.consumerRuntimeSha256)throw new Error('Clean public consumer proof missing/stale for final code/runtime');
 console.log(JSON.stringify({...result,cleanConsumerProof:'passed'},null,2));
}else if(process.argv[2]==='build'){
 // Only the fixed generated handoff directory is replaced.
 if(target!==resolve(root,'dist','erp-handoff'))throw new Error('Invalid generated target');
 await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
 const paths=new Set();
 for(const directory of ['contracts','packages/api-client/src','packages/api-client/dist','packages/api-client/examples','apps/mock-erp/src','apps/mock-erp/dist','apps/mock-erp/ui','apps/mock-erp/ui-dist','apps/mock-erp/migrations','tests/erp-conformance','db/migrations','deploy'])for(const path of await walk(directory))paths.add(path);
 for(const path of await walk('docs'))if(/\.(md|json|txt)$/.test(path)&&path!==manifestPath&&!path.startsWith('docs/erp/planning-pack/'))paths.add(path);
 paths.add('docs/erp/planning-pack/README.md');
 for(const path of await walk('dist/erp-reference'))if(!path.includes('/node_modules/'))paths.add(path);
 for(const path of ['master-plan.md','TAWSEL-DISCOVERY-LOG.md','DESIGN.md','STACK-CONTEXT.md','TAWSEL-ENGINE-CONTEXT.md','.env.example','packages/api-client/package.json','packages/api-client/README.md','apps/mock-erp/package.json','apps/mock-erp/README.md','apps/mock-erp/config.example.json','scripts/verify-erp-release.mjs','scripts/erp-release.mjs','scripts/build-receiver-bundle.mjs','scripts/handoff-audit.mjs'])paths.add(path);
 // Include only checked-in public images/results, never Playwright traces or private logs.
 for(const path of git('ls-files','output/playwright').split('\n'))if(/\.(png|json)$/.test(path))paths.add(path);
 const artifacts=[];
 for(const path of [...paths].sort()){
  if(/(?:^|\/)(?:node_modules|\.local|\.git)(?:\/|$)/.test(path)||/\.(?:env|log|zip|sql\.gz)$/.test(path))throw new Error(`Private/unexpected package input: ${path}`);
  const bytes=await read(path),output=resolve(target,path);await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);artifacts.push({path,bytes:bytes.length,sha256:sha256(bytes),source:path});
 }
 const source=await identity();
 const generated={
  'metadata/source-identity.json':JSON.stringify(source,null,2)+'\n',
  'metadata/workspace-package.json':(await read('package.json')).toString(),
  'README.md':'# Tawsel Phase 42 local handoff\n\nStart with [the as-built handoff](docs/ERP-INTEGRATION-HANDOFF.md), then [the ERP reading order](docs/erp/README.md). Verify before use: `node scripts/verify-erp-release.mjs .`. Install the reference in `dist/erp-reference/` with `npm ci --ignore-scripts`; follow the [quickstart](docs/erp/consumer-quickstart.md).\n\nThis package contains public contracts/client/reference artifacts and recorded local evidence. It contains no live credentials, deployed-release claim or real ERP implementation. Historical internal-source/private-log links describe provenance and are not external setup prerequisites.\n'
 };
 for(const [path,content] of Object.entries(generated)){const bytes=Buffer.from(content);await mkdir(dirname(resolve(target,path)),{recursive:true});await writeFile(resolve(target,path),bytes);artifacts.push({path,bytes:bytes.length,sha256:sha256(bytes)});}
 artifacts.sort((a,b)=>a.path.localeCompare(b.path));
 const api=(await read('contracts/openapi.yaml')).toString(),action=await json('contracts/action-envelope.v1.schema.json'),event=await json('contracts/events/envelope.v1.schema.json');
 const manifest={manifestVersion:1,generatedAt:new Date().toISOString(),release:{name:'tawsel-0.1.0-phase42-local',status:'local-handoff-candidate',published:false,baseCommit:source.baseCommit,sourceSha256:source.sourceSha256,workingTree:'Uncommitted Phase 42 candidate; source identity lists actual source/config/test bytes, independent of documentation.'},supportedVersions:{api:api.match(/^ {2}version: (.+)$/m)[1],openapi:api.match(/^openapi: (.+)$/m)[1],client:(await json('packages/api-client/package.json')).version,referenceConsumer:(await json('apps/mock-erp/package.json')).version,action:action.properties.schemaVersion.const,payload:action.properties.payloadVersion.const,event:event.properties.schemaVersion.const,eventPayload:event.properties.payloadVersion.const,report:(await json('contracts/reporting.schema.json')).$defs.Workday.properties.definitionVersion.const,jsonSchema:(await json('contracts/common.schema.json')).$schema},observedBuildRuntime:{node:process.version,npm:npmVersion,platform:process.platform,arch:process.arch},configuredImages:await json('deploy/base-images.json'),engine:{runtimeVersion:null,datasetIdentity:null,verification:'unavailable; configured Engine inputs and maps are separate from application release'},migrations:{application:artifacts.filter(e=>e.path.startsWith('db/migrations/')&&e.path.endsWith('.sql')).map(e=>e.path.slice('db/migrations/'.length)),reference:artifacts.filter(e=>e.path.startsWith('apps/mock-erp/migrations/')&&e.path.endsWith('.sql')).map(e=>e.path.slice('apps/mock-erp/migrations/'.length))},consumerRuntimeSha256:sha256(JSON.stringify(artifacts.filter(entry=>/^dist\/erp-reference\/(api-client\/|mock-erp\/|conformance\/|package(?:-lock)?\.json$)/.test(entry.path)))),artifacts};
 const content=JSON.stringify(manifest,null,2)+'\n';await writeFile(manifestPath,content);await writeFile(resolve(target,manifestPath),content);
 console.log(JSON.stringify(await verifyRelease(target),null,2));
}else throw new Error('Use build or check');
