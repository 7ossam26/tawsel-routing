import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {OutboxConfig} from '../../src/outbox/config.js';
import type {ReceiverConfig} from '../../../mock-erp/src/config.js';
export async function senderProcess(database:string,config:OutboxConfig,port=0){
 const child=spawn(process.execPath,['--import','tsx','apps/api/test/support/receiver-sender-process.ts'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,TAWSEL_RECEIVER_TEST_DATABASE:database,TAWSEL_RECEIVER_TEST_CONFIG:JSON.stringify({...config,encryptionKey:config.encryptionKey.toString('hex')}),TAWSEL_RECEIVER_TEST_PORT:String(port)}});
 let out='',err='';child.stderr.on('data',x=>err+=String(x));const exited=once(child,'exit');
 const url=await new Promise<string>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Sender startup ${err}`)),15000);child.once('exit',()=>{clearTimeout(timer);reject(new Error(`Sender exited ${err}`));});child.stdout.on('data',x=>{out+=String(x);for(const line of out.split('\n'))try{const v=JSON.parse(line) as {address:{port:number}};if(v.address){clearTimeout(timer);resolve(`http://127.0.0.1:${v.address.port}`);}}catch{/* incomplete */}});});
 return {url,child,async close(){if(child.exitCode===null&&!child.killed)child.kill();await exited;}};
}
export async function receiverWorker(database:string,config:ReceiverConfig,options:{once?:boolean;entry?:string;cwd?:string;mode?:'worker'|'source-worker'}={}){
 const dir=await mkdtemp(join(tmpdir(),'tawsel-receiver-worker-')),path=join(dir,'config.json');await writeFile(path,JSON.stringify(config));
 const env:NodeJS.ProcessEnv={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE'])if(process.env[k])env[k]=process.env[k];env.MOCK_ERP_CONFIG=path;env.MOCK_ERP_DATABASE_URL=database;
 const child=spawn(process.execPath,[...(options.entry?[]:['--import','tsx']),options.entry??'apps/mock-erp/src/main.ts',options.mode??'worker',...(options.once?['--once']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe'],env,...(options.cwd?{cwd:options.cwd}:{})});
 let err='';child.stderr.on('data',x=>err+=String(x));const exited=once(child,'exit');
 return {child,exited,async complete(){const [code]=await exited;if(code!==0)throw new Error(`Receiver worker ${code}: ${err}`);},async close(){if(child.exitCode===null&&!child.killed)child.kill();await exited;await rm(dir,{recursive:true,force:true});}};
}
