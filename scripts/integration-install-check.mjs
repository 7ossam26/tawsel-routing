import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {install} from './integration-install.mjs';
import {verifyConnectionPackage} from '../packages/api-client/dist/connection-package.js';
const dir=await mkdtemp(join(tmpdir(),'tawsel-install-fixture-'));
if(process.platform==='win32')execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',"$p=$env:TAWSEL_INSTALL_FIXTURE; $a=New-Object Security.AccessControl.DirectorySecurity; $a.SetAccessRuleProtection($true,$false); foreach($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User.Value,'S-1-5-18','S-1-5-32-544')){$a.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}; Set-Acl -LiteralPath $p -AclObject $a"],{env:{...process.env,TAWSEL_INSTALL_FIXTURE:dir},stdio:'pipe',windowsHide:true});
else{const {chmod}=await import('node:fs/promises');await chmod(dir,0o700);}
const config={tenantId:randomUUID(),integrationId:randomUUID(),erpCompanyId:randomUUID(),apiUrl:'https://tawsel.example.test/',callbackUrl:'https://shahn.example.test/api/v1/consumer/events',issuer:'https://issuer.example.test/realms/company',sourceCommit:'1'.repeat(40),contractSha256:'2'.repeat(64),sourceExternalId:'erp',companyCode:'FIXTURE',displayName:'Disposable helper test',subjectIds:['exact-approved-subject'],sourceRevision:1,keyId:'test',endpointRevision:0,expiresAt:new Date(Date.now()+86400000).toISOString(),operatorOutboxInstalled:false};
if(!dir.startsWith(join(tmpdir(),'tawsel-install-fixture-')))throw Error('Unsafe test cleanup');
const json=async name=>JSON.parse(await readFile(join(dir,name),'utf8'));
try{
 await writeFile(join(dir,'installation.json'),JSON.stringify(config));await writeFile(join(dir,'operator-token'),'a'.repeat(64));
 await install('prepare',dir);const initial=await json('setup-journal.json'),ids=initial.commands.map(c=>c.actionId);assert.equal(initial.commands[0].payload.interopVersion,'1.0.0');
 await install('prepare',dir);assert.deepEqual((await json('setup-journal.json')).commands.map(c=>c.actionId),ids);
 await assert.rejects(install('apply',dir),/protected API/);config.operatorOutboxInstalled=true;await writeFile(join(dir,'installation.json'),JSON.stringify(config));
 const accepted=new Map(),calls=[];let lose=true;
 const actual={identity:{tenantId:config.tenantId,integrationId:config.integrationId,tenantKind:'company'},issuer:config.issuer,erpCompanyId:config.erpCompanyId,interopVersion:'1.0.0',serviceCapabilities:['identity.provision','integration.manage','intake.prepare','assignment.manage','monitor.read','return.receive','return.dispose'],supportedVersions:['1.0.0'],allowedOperations:['intake.submitSnapshot','assignment.receiveBatch','return.confirmSubsetReceipt','return.recordDisposition'],humanDelegation:false};
 const fetcher=async(url,init)=>{
  if(!init?.body)return Response.json(actual);
  const c=JSON.parse(init.body);calls.push(c.actionId);
  if(!accepted.has(c.actionId))accepted.set(c.actionId,{operationId:c.operationId,retention:'full',summary:{},response:{status:200,body:{}},receipt:{schemaVersion:'1.0.0',receiptId:randomUUID(),actionId:c.actionId,evidenceStatus:'received',businessStatus:'accepted',resourceVersions:{},receivedAt:new Date().toISOString(),committedAt:new Date().toISOString()}});
  if(lose){lose=false;throw Error('simulated committed response loss');}return Response.json(accepted.get(c.actionId));
 };
 await assert.rejects(install('apply',dir,fetcher),/response loss/);assert.equal((await json('setup-journal.json')).results.length,0);
 await install('apply',dir,fetcher);assert.deepEqual(calls,[ids[0],...ids]);assert.equal(accepted.size,3);await install('apply',dir,fetcher);assert.equal(calls.length,4);
 const p=await json('connection-private.json');const approved=Object.fromEntries(['apiUrl','issuer','callbackUrl','tenantId','integrationId','erpCompanyId','sourceCommit','contractSha256'].map(k=>[k,p.metadata[k]]));
 actual.identity={tenantId:config.tenantId,integrationId:config.integrationId,mode:'service-operation',actorId:null}; // VerifiedService discriminant.
 const verified=await verifyConnectionPackage(p,approved,fetcher);assert.equal(verified.signing,'pending-signed-callback');assert.equal(verified.sourceVerified,true);
 await assert.rejects(verifyConnectionPackage({...p,metadata:{...p.metadata,erpCompanyId:randomUUID()}},approved,fetcher),/approved/);
 const incomplete={...approved};delete incomplete.sourceCommit;await assert.rejects(verifyConnectionPackage(p,incomplete,fetcher),/approved/);
 await assert.rejects(verifyConnectionPackage({...p,credential:{...p.credential,expiresAt:'2000-01-01T00:00:00Z'}},approved,fetcher),/expired/);
 const evidence={status:'passed',classification:'Protected disposable operator directory; simulated public HTTP responses for retry/lost-response tests; backend import verification with simulated source configuration. No live installation or native Shahn activation.',setupActions:ids,requests:calls,acceptedActions:accepted.size,originalIdsPreserved:true,globalOperatorTokenExported:JSON.stringify(p).includes('a'.repeat(64)),signing:verified.signing};assert.equal(evidence.globalOperatorTokenExported,false);
 await writeFile('docs/verification/installation-helper-2026-10-10.json',JSON.stringify(evidence,null,2)+'\n');console.log('PASS protected helper retries, lost-response identity, scoped export and pending-signing import verification.');
}finally{await rm(dir,{recursive:true,force:true});}
