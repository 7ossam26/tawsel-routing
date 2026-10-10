import {readFile,rename,open,realpath,lstat} from 'node:fs/promises';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=v=>createHash('sha256').update(v).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const caps=['identity.provision','integration.manage','intake.prepare','assignment.manage','monitor.read','return.receive','return.dispose'];
const requiredOps=['intake.submitSnapshot','assignment.receiveBatch','return.confirmSubsetReceipt','return.recordDisposition'];
const root=fileURLToPath(new URL('../',import.meta.url));
async function json(path){return JSON.parse(await readFile(path,'utf8'));}
async function durable(path,value){const temp=path+'.tmp';const f=await open(temp,'w',0o600);try{await f.writeFile(JSON.stringify(value,null,2)+'\n');await f.sync();}finally{await f.close();}await rename(temp,path);}
function https443(raw){const u=new URL(raw);if(u.href!==raw||u.protocol!=='https:'||u.port||u.username||u.password||u.hash||u.search)throw Error('Exact canonical HTTPS443 URL required');return u;}
async function protectedDirectory(path){
 const dir=await realpath(path),rel=relative(root,dir);
 if(!rel||!rel.startsWith('..')&&!isAbsolute(rel))throw Error('Operator path must be outside Git/build context');
 for(let ancestor=dir;;ancestor=dirname(ancestor)){
  try{await lstat(resolve(ancestor,'.git'));throw Error('Operator path must be outside every Git checkout');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(dirname(ancestor)===ancestor)break;
 }
 if(process.platform==='win32'){
  // Verify protection even when invoked directly instead of through the wrapper.
  const ps="$ErrorActionPreference='Stop'; $p=$env:TAWSEL_INSTALL_PRIVATE_DIRECTORY; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $allowed=@($sid,'S-1-5-18','S-1-5-32-544'); $entries=@(Get-Item -LiteralPath $p)+(Get-ChildItem -LiteralPath $p -Recurse -Force); foreach($e in $entries){if($e.Attributes -band [IO.FileAttributes]::ReparsePoint){exit 2}; foreach($r in (Get-Acl -LiteralPath $e.FullName).Access){if($r.AccessControlType -eq 'Allow' -and $allowed -notcontains $r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value){exit 3}}}";
  execFileSync('pwsh',['-NoProfile','-NonInteractive','-Command',ps],{stdio:'ignore',windowsHide:true,env:{...process.env,TAWSEL_INSTALL_PRIVATE_DIRECTORY:dir}});
 }else{const {stat}=await import('node:fs/promises');const s=await stat(dir);if(s.mode&0o077||s.uid!==process.getuid())throw Error('Operator directory must be owned by the operator with mode0700');}
 return dir;
}
/** Operator tool only. Every network mutation uses an existing durable public
 * command. No issuer writes, database access, implicit grants or live deployment. */
export async function install(mode,path,transport=fetch){
 if(!['prepare','apply'].includes(mode))throw Error('Use prepare or apply');
 const dir=await protectedDirectory(path),config=await json(resolve(dir,'installation.json'));
 for(const k of ['tenantId','integrationId','erpCompanyId'])if(!uuid.test(config[k]))throw Error('Explicit company/source UUIDs required');
 https443(config.apiUrl);https443(config.callbackUrl);https443(config.issuer);
 if(!/^[0-9a-f]{40}$/.test(config.sourceCommit)||!/^[0-9a-f]{64}$/.test(config.contractSha256))throw Error('Approved source/contract identities required');
 if(!Number.isSafeInteger(config.sourceRevision)||config.sourceRevision<1||!Array.isArray(config.subjectIds)||config.subjectIds.length>100||new Set(config.subjectIds).size!==config.subjectIds.length)throw Error('Explicit bind revision and exact subject list required');
 if(!config.subjectIds.every(s=>typeof s==='string'&&s.length>0&&s.length<=512))throw Error('Invalid exact subject');
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(config.keyId)||!Number.isInteger(config.endpointRevision)||config.endpointRevision<0)throw Error('Explicit scoped key ID and endpoint revision required');
 const expires=new Date(config.expiresAt).getTime();if(expires<=Date.now()||expires>Date.now()+366*86400000)throw Error('Explicit service expiry must be within one year');
 // Directory lock prevents competing local setup writers. A stale lock is never
 // automatically stolen: operator verifies the previous process is gone first.
 const lock=await open(resolve(dir,'installation.lock'),'wx',0o600);
 try{
  const journalPath=resolve(dir,'setup-journal.json');let journal;
  try{journal=await json(journalPath);}catch(e){if(e.code!=='ENOENT')throw e;}
  const identity=sha(JSON.stringify({...config,operatorOutboxInstalled:undefined}));
  if(journal&&journal.configurationHash!==identity)throw Error('Installation configuration differs from immutable setup; complete/reconcile original first');
  if(!journal){
   if(config.existingCredential&&(!uuid.test(config.existingCredential.credentialId)||!/^[a-f0-9]{64}$/.test(config.existingCredential.secret)))throw Error('Explicit existing scoped credential ID/material required for reconciliation');
   const credentialId=config.existingCredential?.credentialId??randomUUID(),secret=config.existingCredential?.secret??randomBytes(32).toString('hex'),signingSecret=randomBytes(32).toString('hex');
   const command=(operationId,payload)=>({schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId,context:{kind:'integration',tenantId:config.tenantId,integrationId:config.integrationId},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload});
   journal={configurationHash:identity,createdAt:new Date().toISOString(),configuration:config,credentialId,serviceBearer:`twp_${credentialId}.${secret}`,signingSecret,commands:[
    command('integration.bindSource',{externalId:config.sourceExternalId,sourceRevision:config.sourceRevision,companyCode:config.companyCode,displayName:config.displayName,subjectIds:config.subjectIds,credentialId,secretHash:sha(secret),expiresAt:config.expiresAt,erpCompanyId:config.erpCompanyId,interopVersion:'1.0.0',intakeCapabilities:['intake.prepare','assignment.manage'],monitoringCapabilities:['monitor.read'],returnCapabilities:['return.receive','return.dispose']}),
    command('integration.configureWebhook',{url:config.callbackUrl,enabled:true,expectedRevision:config.endpointRevision}),
    command('integration.rotateSigningKey',{keyId:config.keyId,overlapSeconds:config.signingOverlapSeconds??86400})],results:[],state:'operator-config-pending'};
   await durable(journalPath,journal);
  }
  // Fragment is private operator installation input. It does not overwrite an
  // existing allowlist or encryption key and cannot weaken destination guards.
  await durable(resolve(dir,'outbox-scoped-fragment.json'),{destinations:[{tenantId:config.tenantId,integrationId:config.integrationId,url:config.callbackUrl}],keys:[{tenantId:config.tenantId,integrationId:config.integrationId,keyId:config.keyId,secret:journal.signingSecret}]});
  const metadata={packageVersion:'1.0.0',tenantId:config.tenantId,integrationId:config.integrationId,erpCompanyId:config.erpCompanyId,sourceExternalId:config.sourceExternalId,issuer:config.issuer,apiUrl:config.apiUrl,callbackUrl:config.callbackUrl,companyCode:config.companyCode,sourceCommit:config.sourceCommit,contractSha256:config.contractSha256,interopVersion:'1.0.0',capabilities:caps,enrollmentMode:'operator-assisted-exact-subjects',bootstrapActionId:journal.commands[0].actionId};
  await durable(resolve(dir,'connection-metadata.json'),metadata);
  if(mode==='prepare')return {state:journal.state};
  if(config.operatorOutboxInstalled!==true)throw Error('Install scoped fragment in protected API/worker operator configuration first');
  const operatorToken=(await readFile(resolve(dir,'operator-token'),'utf8')).trim();if(!/^[a-f0-9]{64}$/.test(operatorToken))throw Error('Protected operator credential required');
  for(let i=0;i<journal.commands.length;i++){
   if(journal.results[i]?.receipt?.businessStatus==='accepted')continue;
   if(journal.results[i])throw Error('Setup retained a rejection; review before a new source revision/action');
   const c=journal.commands[i],prefix=i===0?'provisioning':'integration';
   const response=await transport(new URL(`/api/v1/${prefix}/commands/${c.operationId}`,config.apiUrl),{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:`Bearer ${i===0?operatorToken:journal.serviceBearer}`,'content-type':'application/json'},body:JSON.stringify(c)});
   const result=await response.json();
   if(result.receipt?.actionId!==c.actionId||result.operationId!==c.operationId||!['accepted','rejected','review-required'].includes(result.receipt?.businessStatus))throw Error('Acceptance unknown; retry exact journal action');
   const {publicValidator}=await import('../packages/api-client/dist/validation.js');
   if(!publicValidator()('action-result.v1.schema.json',result))throw Error('Acceptance unknown: response schema invalid');
   journal.results[i]=result;journal.state=result.receipt.businessStatus==='accepted'?'commands-pending':'review-required';await durable(journalPath,journal);
   if(result.receipt.businessStatus!=='accepted')throw Error('Installation command rejected; protected result retained');
  }
  const checked=await transport(new URL('/api/v1/provisioning/configuration',config.apiUrl),{redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:`Bearer ${journal.serviceBearer}`}}),actual=await checked.json();
  if(!checked.ok||actual.identity?.tenantId!==config.tenantId||actual.identity?.integrationId!==config.integrationId||actual.issuer!==config.issuer||actual.erpCompanyId!==config.erpCompanyId||!requiredOps.every(o=>actual.allowedOperations?.includes(o)))throw Error('Source/issuer/company/grant verification failed');
  journal.state='prepared-for-erp-import';await durable(journalPath,journal);
  await durable(resolve(dir,'connection-private.json'),{metadata,credential:{bearer:journal.serviceBearer,expiresAt:config.expiresAt},signingKeys:[{keyId:config.keyId,secret:journal.signingSecret}],setup:{state:'prepared-for-erp-import',actions:journal.commands.map(c=>c.actionId)}});
  return {state:journal.state};
 }finally{await lock.close();const {unlink}=await import('node:fs/promises');await unlink(resolve(dir,'installation.lock'));}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 install(process.argv[2],process.argv[3]).then(r=>console.log(`Installation ${r.state}; protected files retained. ERP import and signed callback verification remain separate.`)).catch(()=>{console.error('Installation pending or rejected. Inspect protected configuration/journal; retry original actions.');process.exitCode=1;});
}
