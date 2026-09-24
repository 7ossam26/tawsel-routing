/** Private local acceptance harness. Only operator scope/issuer setup is here;
 * native consumer and browser use public boundaries and their own credentials. */
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {migrate} from '../apps/api/src/db/migrate.js';
import {createDatabasePool} from '../apps/api/src/db/pool.js';
import {buildApp} from '../apps/api/src/app.js';
import {bindSource,send,operatorToken} from '../apps/api/test/support/provisioning-fixture.js';
import {createReceiverDatabase} from './mock-erp-database.js';
import {receiverProcess} from '../apps/mock-erp/test/support/process.js';
import {receiverWorker} from '../apps/api/test/support/receiver-harness.js';
import {reconcileOne} from '../apps/api/src/provisioning/worker.js';
import {keycloakAdministration} from '../apps/api/src/provisioning/issuer.js';
import {runOutboxOnce} from '../apps/api/src/outbox/worker.js';
import {OutboxClient} from '@tawsel/api-client/outbox';
import type {ReceiverConfig} from '../apps/mock-erp/src/config.js';
const secrets=JSON.parse(await readFile('.local/identity/secrets.json','utf8')) as {control:string;erp:string;company:string;personal:string;session:string;password:string};
const issuer='http://localhost:8085/realms/tawsel-company';
async function admin(path:string,init:RequestInit={}){
 const t=await fetch(`${issuer}/protocol/openid-connect/token`,{method:'POST',body:new URLSearchParams({grant_type:'client_credentials',client_id:'local-test-control',client_secret:secrets.control})});if(!t.ok)throw new Error('Actual local Keycloak required');
 const token=await t.json() as {access_token:string};const r=await fetch(`${issuer.replace('/realms/','/admin/realms/')}/users${path}`,{...init,headers:{authorization:`Bearer ${token.access_token}`,'content-type':'application/json'}});if(!r.ok)throw new Error(`Issuer test setup ${r.status}`);return r;
}
const suffix=randomUUID().slice(0,8),users:{username:string;subject:string}[]=[];
for(const name of ['staff','driver']){const username=`p27-${name}-${suffix}`;const r=await admin('',{method:'POST',body:JSON.stringify({username,email:`${username}@example.test`,enabled:true,emailVerified:true,firstName:'Phase27',lastName:name,credentials:[{type:'password',value:secrets.password,temporary:false}]})});users.push({username,subject:r.headers.get('location')!.split('/').at(-1)!});}
const db=await createTestDatabase(),erp=await createReceiverDatabase();await migrate(db.pool);
const scope={tenantId:randomUUID(),integrationId:randomUUID()},key={keyId:'p27-reference',secret:randomBytes(32).toString('hex')};
const senderConfig={encryptionKey:randomBytes(32),keys:[{...scope,...key}],destinations:[{...scope,url:'http://127.0.0.1:5191/api/v1/consumer/events'}],testLoopback:true};
const auth={origin:'http://localhost:5173',encryptionKey:randomBytes(32),sessionSeconds:28800,issuers:{company:{issuer,clientId:'tawsel-web',clientSecret:secrets.company},personal:{issuer:'http://localhost:8085/realms/tawsel-personal',clientId:'tawsel-web',clientSecret:secrets.personal}}};
const app=buildApp(createDatabasePool(db.config),auth,{issuer,operatorToken},senderConfig);await app.ready();
const source=await bindSource(app,users.map(u=>u.subject),scope.tenantId);scope.integrationId=source.integrationId;senderConfig.keys[0]!.integrationId=source.integrationId;senderConfig.destinations[0]!.integrationId=source.integrationId;
const grant=structuredClone(source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=2;grant.payload.intakeCapabilities=['intake.prepare','assignment.manage'];grant.payload.returnCapabilities=['return.receive','return.dispose'];
const granted=await send(app,operatorToken,grant);if(granted.statusCode!==200)throw new Error(granted.body);
await app.listen({host:'127.0.0.1',port:3001});
const config:ReceiverConfig={...scope,host:'127.0.0.1',port:5191,testLoopback:true,statusToken:randomBytes(32).toString('hex'),keys:[key],tawselBaseUrl:'http://127.0.0.1:3001',tawselAuthorization:`Bearer ${source.token}`,native:{privateTestOnly:true,origin:'http://localhost:5191',issuer,clientId:'erp-reference',clientSecret:secrets.erp,sessionKey:randomBytes(32).toString('hex'),adminSubjects:[users[0]!.subject]}};
const receiver=await receiverProcess(erp.url,config),sourceWorker=await receiverWorker(erp.url,config,{mode:'source-worker'}),projectionWorker=await receiverWorker(erp.url,config);
receiver.child.stderr.on('data',b=>process.stderr.write(b));
const publicOutbox=new OutboxClient({baseUrl:config.tawselBaseUrl!,authorization:config.tawselAuthorization!});
await publicOutbox.command(source.command('integration.configureWebhook',{url:senderConfig.destinations[0]!.url,enabled:true,expectedRevision:0}) as Parameters<OutboxClient['command']>[0]);
await publicOutbox.command(source.command('integration.rotateSigningKey',{keyId:key.keyId,overlapSeconds:300}) as Parameters<OutboxClient['command']>[0]);
const issuerAdmin=keycloakAdministration({issuer,clientId:'local-test-control',clientSecret:secrets.control});
await mkdir('.local',{recursive:true});await writeFile('.local/phase-27-browser.json',JSON.stringify({users,password:secrets.password,companyCode:source.code,tenantId:scope.tenantId,integrationId:scope.integrationId,serviceToken:source.token,statusToken:config.statusToken}));
const stopFile='.local/phase-27-browser.stop';if(existsSync(stopFile))await unlink(stopFile);
console.log('Phase 27 isolated native browser harness ready');let stopped=false;const stop=()=>{stopped=true;};process.once('SIGTERM',stop);process.once('SIGINT',stop);
try{while(!stopped&&!existsSync(stopFile)){await reconcileOne(db.pool,issuer,issuerAdmin);for(let i=0;i<10&&await runOutboxOnce(db.pool,senderConfig);i++){/* real signed sender */}await new Promise(r=>setTimeout(r,200));}}
finally{await sourceWorker.close();await projectionWorker.close();await receiver.close();await app.close();await erp.close();await db.close();for(const u of users)await admin(`/${u.subject}`,{method:'DELETE'});await unlink('.local/phase-27-browser.json');}
