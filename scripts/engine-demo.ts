import { createServer } from 'node:http';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { RoutingEngine, EngineError } from '../apps/api/src/engine/index.js';
import { loadEngineConfig, profiles } from '../apps/api/src/engine/config.js';
import type { Mode } from '../apps/api/src/engine/models.js';
import { engineInput, optimizationFixture, routeFixture, tableFixture } from '../apps/api/test/support/engine-fixtures.js';

const live=process.argv.includes('--live');
const results:unknown[]=[];
async function exercise(engine:RoutingEngine,mode:Mode) {
  const road={mode,coordinates:[engineInput.origin.coordinates,engineInput.tasks[0]!.coordinates]};
  for(const operation of ['route','table','optimize'] as const) {
    try {
      const result=operation==='route'?await engine.route(road):operation==='table'?await engine.table(road):await engine.optimize({...engineInput,mode});
      results.push({mode,operation,result});
    } catch(error) {
      if(!(error instanceof EngineError))throw error;
      results.push({mode,operation,error:error.toJSON()});
    }
  }
}
const config=loadEngineConfig();
let inventory:unknown={kind:'controlled-fixture',runtimeVersions:'not applicable',datasets:'none; loopback test server'};
if(live) {
  let docker:unknown;
  try {
    const run=promisify(execFile);
    const listing=await run('docker',['ps','--format','{{.Names}}|{{.Image}}|{{.Ports}}'],{timeout:5000,maxBuffer:65536,windowsHide:true});
    const versions=[];
    // Inspect only currently running named routing containers; never start/import/pull.
    for(const line of listing.stdout.trim().split('\n').filter(Boolean)) {
      const [name]=line.split('|');if(!name || !/(osrm|vroom)/i.test(name))continue;
      const binary=name.includes('vroom')?'vroom':'osrm-routed';
      try {
        const version=await run('docker',['exec',name,binary,'--version'],{timeout:5000,maxBuffer:65536,windowsHide:true});
        const inspect=await run('docker',['inspect','--format','{{.Image}}|{{json .Mounts}}|{{json .Config.Cmd}}',name],{timeout:5000,maxBuffer:65536,windowsHide:true});
        versions.push({name,version:version.stdout.trim(),imageMountsCommand:inspect.stdout.trim()});
      } catch {versions.push({name,version:'unavailable'});}
    }
    docker={listing:listing.stdout.trim(),versions};
  } catch {docker={status:'unavailable',detail:'Docker inventory could not be read; no running version or mount compatibility is claimed.'};}
  inventory={kind:'live-attempt',docker,localDataFiles:await readdir(new URL('../data/',import.meta.url)),mapping:profiles,compatibility:'Requires actual runtime/build manifests; successful HTTP alone does not prove dataset provenance.'};
  for(const mode of Object.keys(profiles) as Mode[])await exercise(new RoutingEngine(config),mode);
} else {
  for(const mode of Object.keys(profiles) as Mode[]) {
    const server=createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.method==='POST'?optimizationFixture:req.url?.startsWith('/route')?routeFixture:tableFixture));});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const address=server.address();if(!address||typeof address==='string')throw new Error('listen');
    const origin=`http://127.0.0.1:${address.port}`;
    try {await exercise(new RoutingEngine({...config,osrm:{...config.osrm,[mode]:origin},vroom:origin}),mode);}
    finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  }
}
const report={checkedAt:new Date().toISOString(),evidence:live?'live-attempt':'controlled HTTP fixtures, not live Engine',inventory,results};
await mkdir('.local',{recursive:true});
const path=live?'.local/engine-live-report.json':'.local/engine-demo-report.json';
await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));console.log(`Report: ${path}`);
if(results.some(r=>r && typeof r==='object' && 'error' in r))process.exitCode=1;
