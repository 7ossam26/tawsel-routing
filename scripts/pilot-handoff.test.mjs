import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {buildHandoffArtifacts,parseHandoffArguments,requirePushedSource,sanitizeInventory,validateImageReport,writeHandoff} from './pilot-handoff.mjs';
import {OSRM_IMAGE,MLD_REQUIRED_PARTS} from './engine-assets.mjs';

const commit='a'.repeat(40),branch='codex/remove-bicycle';
const hash='b'.repeat(64),profileHash='c'.repeat(64);
const repositories={runtime:'tawsel-runtime',web:'tawsel-web',issuer:'tawsel-issuer',gateway:'tawsel-issuer-gateway',vroom:'tawsel-vroom',database:'tawsel-postgres',nominatim:'tawsel-nominatim'};
function fixture({complete=false,images=false}={}){
  const provenance={schemaVersion:1,modes:['car','motorcycle'],source:{file:'egypt-261002.osm.pbf',url:'https://download.geofabrik.de/africa/egypt-261002.osm.pbf',sizeBytes:7,sha256:hash},osrmImage:OSRM_IMAGE,osrmVersion:'v5.27.1',capturedAtUtc:'2026-10-03T16:07:59Z',profiles:{car:{dataset:'egypt-261002.osrm',status:complete?'complete':'pending'},motorcycle:{dataset:'egypt-motorcycle.osrm',status:complete?'complete':'pending',profileSha256:profileHash}}};
  const assets=[{path:'pbf/egypt-261002.osm.pbf',sizeBytes:7,sha256:hash},{path:'.local/maps/manifest.json',sizeBytes:1,sha256:hash}];
  if(complete)for(const mode of ['car','motorcycle'])for(const suffix of MLD_REQUIRED_PARTS)assets.push({path:`data/${provenance.profiles[mode].dataset}.${suffix}`,sizeBytes:1,sha256:hash});
  const inventory={schemaVersion:1,capturedAtUtc:'2026-10-03T16:07:59Z',sourceCommit:commit,docker:{engine:{clientVersion:'28.5.1',serverVersion:'28.5.1',composeVersion:'v2.40.0',architecture:'amd64',cpus:2,memoryBytes:8326639616},containers:[],images:[]},target:{server:'187.77.170.182',checkedAtUtc:'2026-10-03T16:07:59Z',architecture:'x86_64',cpuCount:2,memoryTotalBytes:8326639616,memoryUsedBytes:2071961600,diskTotalBytes:102888095744,diskUsedBytes:11246809088,swapBytes:0,engineNetwork:{name:'tawsel-engine-swarm',driver:'overlay',scope:'swarm',internal:true,attachable:true},applications:{engineAutoDeploy:false,apiAutoDeploy:false,planningAutoDeploy:false,status:'idle'},applicationDataVerifiedEmpty:false,nominatimImportStatus:'pending'}};
  const imageReport=images?{commit,appOrigin:'https://app.switch2tech.cloud',images:Object.fromEntries(Object.entries(repositories).map(([role,repo])=>[role,`ghcr.io/7ossam26/${repo}@sha256:${hash}`]))}:null;
  return {inventory,assets,provenance,imageReport,commit,branch,generatedAtUtc:'2026-10-03T17:00:00Z'};
}

test('explicit inputs are required, with no positional or duplicate fallback',()=>{
  const args=parseHandoffArguments(['--inventory','inventory.json','--assets','assets.json','--provenance','provenance.json']);
  assert.equal(args.images,undefined);
  assert.equal(basename(args.inventory),'inventory.json');
  assert.throws(()=>parseHandoffArguments(['images.json']),/Usage/);
  assert.throws(()=>parseHandoffArguments(['--inventory','inventory.json','--assets','assets.json']),/Usage/);
  assert.throws(()=>parseHandoffArguments(['--inventory','one.json','--inventory','two.json','--assets','assets.json','--provenance','provenance.json']),/Usage/);
});

test('fresh minimal inventory preserves target observations and drops inspect secrets',()=>{
  const input=fixture();
  input.inventory.env={TOKEN:'inventory-secret'};
  input.inventory.target.credentials={password:'target-secret'};
  input.inventory.docker.containers=[{name:'api',state:'running',Config:{Env:['PASSWORD=container-secret']},labels:{token:'label-secret'},mounts:[{type:'bind',source:'private-source-path',destination:'/run/secrets/app',readWrite:false}]}];
  const out=sanitizeInventory(input.inventory,{sourceCommit:commit});
  assert.equal(out.target.engineNetwork.internal,true);
  assert.equal(out.target.engineNetwork.attachable,true);
  assert.equal(out.target.applications.apiAutoDeploy,false);
  assert.equal(out.target.memoryTotalBytes,8326639616);
  assert.equal(out.target.applicationDataVerifiedEmpty,false);
  assert.equal(out.target.nominatimImportStatus,'pending');
  for(const secret of ['inventory-secret','target-secret','container-secret','label-secret','private-source-path'])assert.equal(JSON.stringify(out).includes(secret),false);
  assert.throws(()=>sanitizeInventory({...input.inventory,sourceCommit:'d'.repeat(40)},{sourceCommit:commit}),/sourceCommit/);
});

test('credential-bearing URLs and control text cannot enter allowed inventory fields',()=>{
  const input=fixture().inventory;
  input.target.server='https://user:private-password@host.invalid';
  assert.throws(()=>sanitizeInventory(input),/Credential-bearing/);
  input.target.server='https://host.invalid/?token=private-token';
  assert.throws(()=>sanitizeInventory(input),/Credential-bearing/);
  input.target.server='host\nPASSWORD=private-password';
  assert.throws(()=>sanitizeInventory(input),/Invalid inventory text/);
});

test('pending PBF/maps bootstrap stays not ready, retaining validated provenance',()=>{
  const input=fixture();
  input.provenance.credentials={token:'provenance-secret'};
  const {manifest,artifacts}=buildHandoffArtifacts(input);
  assert.equal(manifest.readiness.ready,false);
  assert.equal(manifest.readiness.inputManifestReady,false);
  assert.equal(manifest.readiness.engineAssetsComplete,false);
  assert.equal(manifest.readiness.targetRuntimeVerified,false);
  assert.deepEqual(manifest.readiness.pendingModes,['car','motorcycle']);
  assert.equal(manifest.imageReport.status,'pending-github-actions-workflow');
  const exported=JSON.parse(artifacts.get('ENGINE-PROVENANCE.json'));
  assert.equal(exported.osrmVersion,'v5.27.1');
  assert.equal(exported.capturedAtUtc,'2026-10-03T16:07:59Z');
  assert.equal(JSON.stringify(exported).includes('provenance-secret'),false);
  assert.match(artifacts.get('05-DEPLOYMENT-PREREQUISITES-AR.md'),/--pbf-directory .* --provenance ENGINE-PROVENANCE\.json --allow-incomplete/);
  assert.throws(()=>buildHandoffArtifacts({...input,assets:[...input.assets,{path:'data/egypt-261002.osrm.geometry',sizeBytes:1,sha256:hash}]}),/Partial car/);
  assert.throws(()=>buildHandoffArtifacts({...input,assets:[...input.assets,{path:'data/egypt-bicycle.osrm.geometry',sizeBytes:1,sha256:hash}]}),/Extraneous/);
});

test('complete inputs never certify target runtime or Nominatim readiness',()=>{
  const {manifest,artifacts}=buildHandoffArtifacts(fixture({complete:true,images:true}));
  assert.equal(manifest.readiness.inputManifestReady,true);
  assert.equal(manifest.readiness.engineAssetsComplete,true);
  assert.equal(manifest.readiness.ready,false);
  assert.equal(manifest.readiness.targetRuntimeVerified,false);
  assert.equal(manifest.imageReport.images.vroom,`ghcr.io/7ossam26/tawsel-vroom@sha256:${hash}`);
  assert.doesNotMatch(artifacts.get('05-DEPLOYMENT-PREREQUISITES-AR.md'),/--allow-incomplete\n/);
});

test('seven image references must match their role and final source identity',()=>{
  const input=fixture({images:true});
  assert.equal(Object.keys(validateImageReport(input.imageReport,commit).images).length,7);
  assert.throws(()=>validateImageReport({...input.imageReport,commit:'d'.repeat(40)},commit),/commit/);
  assert.throws(()=>validateImageReport({...input.imageReport,appOrigin:'https://wrong.invalid'},commit),/origin/);
  const swapped=structuredClone(input.imageReport);
  swapped.images.runtime=swapped.images.web;
  assert.throws(()=>validateImageReport(swapped,commit),/runtime/);
  const mutable=structuredClone(input.imageReport);
  mutable.images.vroom='ghcr.io/7ossam26/tawsel-vroom:latest';
  assert.throws(()=>validateImageReport(mutable,commit),/vroom/);
  const missing=structuredClone(input.imageReport);
  delete missing.images.nominatim;
  assert.throws(()=>validateImageReport(missing,commit),/nominatim/);
});

test('source gate rejects dirty, detached and unpushed source without bypass',()=>{
  const git=(...args)=>args[0]==='status'?'':args[0]==='rev-parse'?commit:args[0]==='branch'?branch:`${commit}\trefs/heads/${branch}`;
  assert.deepEqual(requirePushedSource(git),{commit,branch});
  assert.throws(()=>requirePushedSource((...args)=>args[0]==='status'?' M scripts/pilot-handoff.mjs':git(...args)),/Commit tracked changes/);
  assert.throws(()=>requirePushedSource((...args)=>args[0]==='branch'?'':git(...args)),/branch/);
  assert.throws(()=>requirePushedSource((...args)=>args[0]==='ls-remote'?`${'d'.repeat(40)}\trefs/heads/${branch}`:git(...args)),/Push/);
});

test('every published artifact hash matches its actual UTF-8 file bytes',async()=>{
  const parent=resolve('.local');
  await mkdir(parent,{recursive:true});
  const directory=await mkdtemp(join(parent,'handoff-test-'));
  try{
    const {manifest,artifacts}=buildHandoffArtifacts(fixture());
    await writeHandoff(directory,artifacts);
    for(const [name,expected] of Object.entries(manifest.filesSha256)){
      const bytes=await readFile(join(directory,name));
      assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,name);
    }
    assert.equal(JSON.parse(await readFile(join(directory,'MANIFEST.json'),'utf8')).sourceCommit,commit);
    await assert.rejects(writeHandoff(directory,artifacts),/EEXIST/);
  }finally{
    assert.equal(dirname(resolve(directory)),parent);
    assert.equal(basename(directory).startsWith('handoff-test-'),true);
    await rm(directory,{recursive:true,force:true});
  }
});
