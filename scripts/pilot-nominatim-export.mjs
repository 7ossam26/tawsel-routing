import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const container='nominatim-egypt';
const volume='nominatim-data';
const destination=process.argv[2]&&resolve(process.argv[2]);
if(!destination)throw new Error('Usage: node scripts/pilot-nominatim-export.mjs OUTPUT_DIRECTORY');
await mkdir(destination,{recursive:true});
const archive=join(destination,'nominatim-data.tar');
const report=join(destination,'nominatim-data.export.json');
try{await stat(archive);throw new Error(`Refusing to overwrite ${archive}`);}catch(error){if(error.code!=='ENOENT')throw error;}
const run=(command,args)=>new Promise((resolveRun,reject)=>{
  const child=spawn(command,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let out='',err='';
  child.stdout.on('data',chunk=>out+=chunk);
  child.stderr.on('data',chunk=>err+=chunk);
  child.on('error',reject);
  child.on('close',code=>code===0?resolveRun(out.trim()):reject(new Error(`${command} exited ${code}: ${err.trim()}`)));
});
const details=JSON.parse(await run('docker',['inspect',container]));
const source=details[0];
if(!source?.State?.Running)throw new Error(`${container} must be running before the cold export`);
if(!source.Mounts.some(mount=>mount.Type==='volume'&&mount.Name===volume&&mount.Destination==='/var/lib/postgresql/16/main'))throw new Error('Unexpected Nominatim volume mount');
console.log(`Stopping ${container} for a consistent export...`);
await run('docker',['stop','--time','120',container]);
let exportError;
let restartError;
try{
  await run('docker',['run','--rm','--mount',`type=volume,source=${volume},target=/source,readonly`,'--mount',`type=bind,source=${destination},target=/output`,'--entrypoint','tar',source.Image,'--numeric-owner','-C','/source','-cf','/output/nominatim-data.tar','.']);
}catch(error){exportError=error;}
finally{
  try{await run('docker',['start',container]);console.log(`Restarted ${container}`);}catch(error){restartError=error;}
}
if(restartError)throw new AggregateError([...(exportError?[exportError]:[]),restartError],'Nominatim could not be restarted after the cold export');
if(exportError)throw exportError;
const info=await stat(archive);
const hash=createHash('sha256');
for await(const chunk of createReadStream(archive))hash.update(chunk);
const evidence={schemaVersion:1,container,volume,sourceImageId:source.Image,archiveFile:'nominatim-data.tar',sizeBytes:info.size,sha256:hash.digest('hex'),exportedAtUtc:new Date().toISOString(),method:'Container stopped; GNU tar volume export; container restarted'};
await writeFile(report,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(evidence,null,2));
