/** Actual local Keycloak + isolated PostgreSQL + public application handlers.
 * Identity/provider/accepted test work are labelled fixtures, never production. */
import {existsSync} from 'node:fs';
import {readFile,unlink} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {reportingFixture} from '../apps/api/test/support/reporting-fixture.js';
import {mixedMonitoringFixture} from '../apps/api/test/support/monitoring-fixture.js';
import {command,intake} from '../apps/api/test/support/planning-fixture.js';
import {operatorToken,send} from '../apps/api/test/support/provisioning-fixture.js';
import {buildApp} from '../apps/api/src/app.js';
import {createDatabasePool} from '../apps/api/src/db/pool.js';
import {CurrentActivity} from '../apps/api/src/current/service.js';
import {Outcomes} from '../apps/api/src/outcomes/service.js';
import {Corrections} from '../apps/api/src/corrections/service.js';
import {Closures} from '../apps/api/src/closure/service.js';
import {runPlanningOnce} from '../apps/api/src/planning/worker.js';
import {money} from '../apps/api/src/outcomes/arithmetic.js';
import {Reporting} from '../apps/api/src/reporting/service.js';

const secrets=JSON.parse(await readFile('.local/identity/secrets.json','utf8')) as {control:string;company:string;personal:string;password:string};
const companyIssuer='http://localhost:8085/realms/tawsel-company',personalIssuer='http://localhost:8085/realms/tawsel-personal';
async function admin(issuer:string,path='',init:RequestInit={}){
 const token=await fetch(`${issuer}/protocol/openid-connect/token`,{method:'POST',body:new URLSearchParams({grant_type:'client_credentials',client_id:'local-test-control',client_secret:secrets.control})});if(!token.ok)throw new Error('Actual local Keycloak required.');
 const {access_token}=await token.json() as {access_token:string};const response=await fetch(`${issuer.replace('/realms/','/admin/realms/')}/users${path}`,{...init,headers:{authorization:`Bearer ${access_token}`,'content-type':'application/json'}});if(!response.ok)throw new Error(`Issuer fixture setup failed: ${response.status}`);return response;
}
const clean:(()=>Promise<unknown>)[]=[];
async function user(issuer:string){const username=issuer===personalIssuer?`+201${String(randomBytes(4).readUInt32BE()%1_000_000_000).padStart(9,'0')}`:`p36-staff-${randomUUID().slice(0,8)}`;
 const response=await admin(issuer,'',{method:'POST',body:JSON.stringify({username,email:`${username}@example.test`,enabled:true,emailVerified:true,firstName:'Phase36',lastName:'Reports',credentials:[{type:'password',value:secrets.password,temporary:false}]})});const subject=response.headers.get('location')!.split('/').at(-1)!;clean.push(()=>admin(issuer,`/${subject}`,{method:'DELETE'}));return {username,subject};}
try{
 const personalUser=await user(personalIssuer),staff=await user(companyIssuer),db=await createTestDatabase();clean.push(()=>db.close());
 await prepareAccessFixture(db.pool,companyIssuer,undefined,{personal:{issuer:personalIssuer,subject:personalUser.subject}});
 const principal={kind:'account' as const,issuer:personalIssuer,subject:personalUser.subject},personal=await reportingFixture(db.pool,3,principal);clean.push(()=>personal.close());
 const current=new CurrentActivity(db.pool),outcomes=new Outcomes(db.pool);
 for(const [op,revision] of [['current.selectHeading',0],['current.recordArrival',1],['outcome.recordFull',2]] as const){const c=personal.make(0,op,revision,revision?personal.plan.input.members.find(m=>m.taskId===personal.tasks[0]!.taskId)!.attemptId:null);c.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};const r=await(op.startsWith('current')?current.command(principal,c):outcomes.command(principal,c));if(r.receipt.businessStatus!=='accepted')throw new Error('Personal setup action rejected');}
 const noAnswer=personal.make(1,'outcome.recordNoAnswer',3);noAnswer.observation={observedAt:new Date().toISOString(),clock:{quality:'uncertain'}};await outcomes.command(principal,noAnswer);
 await intake(db.pool,8,'عمل أضيف بعد البداية',principal);await runPlanningOnce(db.pool,personal.provider.engine);
 const company=await mixedMonitoringFixture(db,companyIssuer);clean.push(()=>company.close());
 const grant=structuredClone(company.source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=4;grant.payload.subjectIds=[...new Set([...(grant.payload.subjectIds as string[]),staff.subject])];grant.payload.monitoringCapabilities=['monitor.read'];const bound=await send(company.app,operatorToken,grant);if(bound.statusCode!==200)throw new Error(bound.body);
 for(const [operation,payload] of [['role.defineCapabilities',{externalId:'report-role',sourceRevision:1,name:'Reports',capabilities:['reports.read','monitor.read']}],['user.provision',{externalId:'report-staff',sourceRevision:1,subject:staff.subject,roleExternalId:'report-role',branchExternalIds:['branch'],enabled:true}]] as const){const r=await send(company.app,company.source.token,company.source.command(operation,payload));if(r.statusCode!==200)throw new Error(r.body);}
 await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE issuer=$1 AND subject=$2',[companyIssuer,staff.subject]);
 await outcomes.command(company.principal,company.make(0,'outcome.recordPartial',{pieces:[{sourceLineId:'pieces',delivered:2}],reportedCollection:money(25000)}));
 await outcomes.command(company.principal,company.make(1,'outcome.recordNoAnswer',{},1));
 const auth={origin:'http://localhost:5173',encryptionKey:randomBytes(32),sessionSeconds:28800,issuers:{company:{issuer:companyIssuer,clientId:'tawsel-web',clientSecret:secrets.company},personal:{issuer:personalIssuer,clientId:'tawsel-web',clientSecret:secrets.personal}}};
 const app=buildApp(createDatabasePool(db.config),auth);clean.push(()=>app.close());let changed=false;
 app.get('/__fixture/info',async()=>({personalUser:personalUser.username,staffUser:staff.username,password:secrets.password,companyCode:company.source.code,personalDay:personal.round.workdayId,companyDay:company.round.workdayId,hiddenTask:company.hiddenId,hiddenBranch:company.hiddenBranchId,baselineForecast:personal.plan.forecast.forecastId}));
 app.post('/__fixture/correct-close',async()=>{if(!changed){const before=await new Reporting(db.pool).workday(principal,personal.round.workdayId),original=before.attempts.find(i=>i.taskId===personal.tasks[1]!.taskId)!.outcome!;
  const c=command('outcome.correct',{roundId:personal.round.roundId,taskId:original.taskId,attemptId:original.attemptId,expectedOutcomeRevision:original.revision,replacement:{outcome:'full'}});c.context={...personal.start.context};const corrected=await new Corrections(db.pool).command(principal,c);if(corrected.receipt.businessStatus!=='accepted')throw new Error('Correction rejected');
  const end=command('workday.end',{workdayId:personal.round.workdayId,roundId:personal.round.roundId,expectedActiveRoundId:personal.round.roundId,expectedActivityRevision:4,expectedCurrentAttemptId:null,currentAction:'require-none'});end.context={...personal.start.context};end.observation={observedAt:new Date().toISOString(),clock:{quality:'known'}};const closed=await new Closures(db.pool).command(principal,end);if(closed.receipt.businessStatus!=='accepted')throw new Error('Closure rejected');changed=true;
 }return {changed};});
 app.post('/__fixture/revoke-reports',async()=>{const r=await send(company.app,company.source.token,company.source.command('role.defineCapabilities',{externalId:'report-role',sourceRevision:2,name:'Reports',capabilities:['monitor.read']}));if(r.statusCode!==200)throw new Error(r.body);return {revoked:true};});
 const stop='.local/phase-36-browser.stop';if(existsSync(stop))await unlink(stop);await app.listen({host:'127.0.0.1',port:3036});let stopped=false;process.once('SIGINT',()=>{stopped=true;});process.once('SIGTERM',()=>{stopped=true;});console.log('P36 real-API report harness ready on 3036.');
 while(!stopped&&!existsSync(stop))await new Promise(resolve=>setTimeout(resolve,200));if(existsSync(stop))await unlink(stop);
}finally{for(const close of clean.reverse())await close();}
