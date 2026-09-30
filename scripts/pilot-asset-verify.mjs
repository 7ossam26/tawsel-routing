import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';

const [manifestFile,dataDirectory,mapsDirectory]=process.argv.slice(2);
if(!manifestFile||!dataDirectory||!mapsDirectory){
  console.error('Usage: node scripts/pilot-asset-verify.mjs ASSETS.json DATA_DIRECTORY MAPS_DIRECTORY');
  process.exit(2);
}
const entries=JSON.parse(await readFile(resolve(manifestFile),'utf8'));
if(!Array.isArray(entries)||entries.length===0)throw new Error('Asset manifest must be a nonempty array');
const roots={'data/':resolve(dataDirectory),'.local/maps/':resolve(mapsDirectory)};
let checked=0;
let totalBytes=0;
for(const entry of entries){
  if(typeof entry.path!=='string'||!Number.isSafeInteger(entry.sizeBytes)||entry.sizeBytes<0||! /^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('Invalid asset entry');
  const prefix=Object.keys(roots).find(key=>entry.path.startsWith(key));
  if(!prefix)throw new Error(`Unexpected asset path: ${entry.path}`);
  const part=entry.path.slice(prefix.length);
  if(!part||part.includes('\\')||part.split('/').some(segment=>segment===''||segment==='.'||segment==='..'))throw new Error(`Unsafe asset path: ${entry.path}`);
  const root=roots[prefix];
  const file=resolve(root,...part.split('/'));
  if(relative(root,file).startsWith('..'+sep)||relative(root,file)==='..')throw new Error(`Asset outside root: ${entry.path}`);
  const info=await stat(file);
  if(!info.isFile()||info.size!==entry.sizeBytes)throw new Error(`Size/type mismatch: ${entry.path}`);
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(file))hash.update(chunk);
  if(hash.digest('hex')!==entry.sha256)throw new Error(`SHA-256 mismatch: ${entry.path}`);
  checked++;
  totalBytes+=info.size;
  console.log(`OK ${entry.path}`);
}
console.log(JSON.stringify({result:'verified',files:checked,totalBytes}));
