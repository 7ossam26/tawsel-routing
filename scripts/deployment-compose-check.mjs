import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';

const files=['deploy/engine.compose.yaml','deploy/database.compose.yaml','deploy/compose.yaml','deploy/mock-public.compose.yaml'];
const digest='fixture.invalid/image@sha256:'+'a'.repeat(64);
const fixturePath=join(await mkdtemp(join(tmpdir(),'tawsel-compose-')),'fixture.env');
await writeFile(fixturePath,'FIXTURE=only\n');
try{
for(const file of files){
 const source=await readFile(file,'utf8');
 const names=[...new Set([...source.matchAll(/\$\{([A-Z][A-Z0-9_]*):\?[^}]+\}/g)].map(match=>match[1]))];
 const env={...process.env};
 for(const name of names){
  env[name]=name.endsWith('_IMAGE')?digest:
   name.endsWith('_CPUS')?'1':
   name.endsWith('_MEMORY')||name.endsWith('_SHM_SIZE')?'512m':
   name.endsWith('_FILE')?fixturePath:
   name.endsWith('_PROJECT')?'tawsel-fixture':
   name.endsWith('_NETWORK')?'tawsel-fixture-network':
   name.endsWith('_VOLUME')?'tawsel-fixture-volume':
   name.endsWith('_THREADS')?'2':
   name.includes('BUFFERS')||name.includes('WORK_MEM')||name.includes('CACHE_SIZE')?'128MB':
   'fixture-only';
 }
 const result=spawnSync('docker',['compose','-f',file,'config','--quiet'],{env,encoding:'utf8'});
 if(result.status!==0)throw new Error(`${file}: ${result.stderr.trim()||result.stdout.trim()||'Docker Compose validation failed'}`);
 if(/^[ \t]*ports\s*:/m.test(source)||/^[ \t]*network_mode\s*:/m.test(source)||/^[ \t]*privileged\s*:/m.test(source))throw new Error(`${file}: public port or bypassed isolation`);
 console.log(`${file}: Compose syntax and exposure checks passed`);
}
}finally{await rm(dirname(fixturePath),{recursive:true,force:true});}
