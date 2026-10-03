import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateAssetEntries} from './engine-assets.mjs';

export function parseAssetVerifyArguments(args) {
  const positional=[];
  const flags={};
  for(let index=0;index<args.length;index++){
    const arg=args[index];
    if(arg.startsWith('--')){
      if(!['--pbf-directory','--provenance','--allow-incomplete'].includes(arg)||flags[arg])throw new Error(`Unknown or duplicate option: ${arg}`);
      if(arg==='--allow-incomplete'){flags[arg]=true;continue;}
      const value=args[++index];
      if(!value||value.startsWith('--'))throw new Error(`Missing value for ${arg}`);
      flags[arg]=value;
    }else positional.push(arg);
  }
  if(positional.length!==3||positional.some(value=>!value))throw new Error('Expected ASSETS.json DATA_DIRECTORY MAPS_DIRECTORY');
  if(Boolean(flags['--provenance'])!==Boolean(flags['--pbf-directory']))throw new Error('--provenance and --pbf-directory must be supplied together');
  if(flags['--allow-incomplete']&&!flags['--provenance'])throw new Error('--allow-incomplete requires --provenance');
  return {manifestFile:positional[0],dataDirectory:positional[1],mapsDirectory:positional[2],pbfDirectory:flags['--pbf-directory'],provenanceFile:flags['--provenance'],allowIncomplete:Boolean(flags['--allow-incomplete'])};
}

const outsideRoot=(root,file)=>{const part=relative(root,file);return part==='..'||part.startsWith('..'+sep)||resolve(root,part)!==file;};

export async function verifyAssets({manifestFile,dataDirectory,mapsDirectory,pbfDirectory,provenanceFile,allowIncomplete=false},log=()=>{}) {
  if(Boolean(provenanceFile)!==Boolean(pbfDirectory))throw new Error('--provenance and --pbf-directory must be supplied together');
  const entries=JSON.parse(await readFile(resolve(manifestFile),'utf8'));
  const provenance=provenanceFile?JSON.parse(await readFile(resolve(provenanceFile),'utf8')):undefined;
  if(allowIncomplete&&!provenanceFile)throw new Error('--allow-incomplete requires --provenance');
  const report=validateAssetEntries(entries,provenance,{allowIncomplete});
  const roots={'data/':resolve(dataDirectory),'.local/maps/':resolve(mapsDirectory)};
  if(pbfDirectory)roots['pbf/']=resolve(pbfDirectory);
  const realRoots={};
  for(const entry of report.entries){
    const prefix=Object.keys(roots).find(key=>entry.path.startsWith(key));
    if(!prefix)throw new Error(`Unexpected asset path: ${entry.path}`);
    const root=roots[prefix];
    const file=resolve(root,...entry.path.slice(prefix.length).split('/'));
    if(outsideRoot(root,file))throw new Error(`Asset outside root: ${entry.path}`);
    const realRoot=realRoots[prefix]??=await realpath(root);
    const realFile=await realpath(file);
    if(outsideRoot(realRoot,realFile))throw new Error(`Asset resolves outside root: ${entry.path}`);
    const info=await stat(file);
    if(!info.isFile()||info.size!==entry.sizeBytes)throw new Error(`Size/type mismatch: ${entry.path}`);
    const hash=createHash('sha256');
    for await(const chunk of createReadStream(file))hash.update(chunk);
    if(hash.digest('hex')!==entry.sha256)throw new Error(`SHA-256 mismatch: ${entry.path}`);
    log(`OK ${entry.path}`);
  }
  return provenance
    ?{result:'verified',files:report.files,totalBytes:report.totalBytes,ready:report.ready,readiness:report.readiness}
    :{result:'verified',files:report.files,totalBytes:report.totalBytes};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  let options;
  try{options=parseAssetVerifyArguments(process.argv.slice(2));}
  catch(error){
    console.error(`${error.message}\nUsage: node scripts/pilot-asset-verify.mjs ASSETS.json DATA_DIRECTORY MAPS_DIRECTORY [--pbf-directory PBF_DIRECTORY --provenance PROVENANCE.json [--allow-incomplete]]`);
    process.exitCode=2;
  }
  if(options)console.log(JSON.stringify(await verifyAssets(options,console.log)));
}
