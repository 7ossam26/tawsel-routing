import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {ReceiverConfig} from '../../src/config.js';
export async function receiverProcess(databaseUrl:string,config:ReceiverConfig,fault?:string,options:{entry?:string;cwd?:string;startupTimeoutMs?:number}={}){
 const dir=await mkdtemp(join(tmpdir(),'tawsel-p26-process-')),path=join(dir,'config.json');await writeFile(path,JSON.stringify(config));
 // Allowlisted OS runtime variables only: no Tawsel URL, DB, issuer or operator secrets.
 const env:NodeJS.ProcessEnv={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE'])if(process.env[k])env[k]=process.env[k];
 env.MOCK_ERP_CONFIG=path;env.MOCK_ERP_DATABASE_URL=databaseUrl;
 if(fault)env.MOCK_ERP_TEST_FAULT=fault;
 const child=spawn(process.execPath,[...(options.entry?[]:['--import','tsx']),options.entry??(fault?'apps/mock-erp/test/support/crash-receiver.ts':'apps/mock-erp/src/main.ts')],{windowsHide:true,stdio:['ignore','pipe','pipe'],env,...(options.cwd?{cwd:options.cwd}:{})});
 let output='',errors='';child.stderr.on('data',x=>errors+=String(x));
 const exited=once(child,'exit');
 const url=await new Promise<string>((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error(`Receiver startup timeout ${errors}`)),options.startupTimeoutMs??15000);
  child.on('exit',()=>{clearTimeout(timeout);reject(new Error(`Receiver exited ${errors}`));});
  child.stdout.on('data',x=>{output+=String(x);for(const line of output.split('\n')){try{const v=JSON.parse(line) as {address?:{port:number}};if(v.address){clearTimeout(timeout);resolve(`http://127.0.0.1:${v.address.port}`);}}catch{/* incomplete output */}}});
 }).catch(async error=>{if(child.exitCode===null&&!child.killed)child.kill();await exited;await rm(dir,{recursive:true,force:true});throw error;});
 return {child,url,exited,async close(){if(child.exitCode===null&&!child.killed)child.kill();await exited;await rm(dir,{recursive:true,force:true});}};
}
