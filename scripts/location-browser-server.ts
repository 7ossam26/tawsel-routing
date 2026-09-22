// Isolated P11 browser/demo harness. Labelled account and Nominatim fixtures;
// real HTTP handlers, PostgreSQL transactions, map files and browser rendering.
import {randomUUID} from 'node:crypto';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture,principals,ids} from '../apps/api/test/support/access-fixture.js';
import {buildApp} from '../apps/api/src/app.js';
import {b2cIntakeRoutes} from '../apps/api/src/b2c-intake/routes.js';
import {locationRoutes} from '../apps/api/src/locations/routes.js';
import {Locations} from '../apps/api/src/locations/service.js';
import {Nominatim} from '../apps/api/src/locations/geocoder.js';
import {IndependentIntakeService} from '../apps/api/src/b2c-intake/service.js';
import type {AuthConfig} from '../apps/api/src/auth/config.js';
const db=await createTestDatabase();await prepareAccessFixture(db.pool);
const app=buildApp();
const config:AuthConfig={origin:'http://localhost:5177',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{personal:{issuer:'https://issuer.fixture.invalid',clientId:'p11',clientSecret:'fixture'},company:{issuer:'https://issuer.fixture.invalid',clientId:'p11',clientSecret:'fixture'}}};
const geocoder=new Nominatim({fetcher:async url=>{const query=new URL(String(url)).searchParams.get('q')??'';if(query.includes('فشل'))return new Response('',{status:503});return Response.json(query.includes('فارغ')?[]:[{lat:'30.0444',lon:'31.2357',display_name:'ميدان التحرير، القاهرة، مصر',addresstype:'square'},{lat:'30.045',lon:'31.239',display_name:'شارع محمد محمود، القاهرة، مصر',addresstype:'road'}]);}});
await app.register(async scope=>b2cIntakeRoutes(scope,db.pool,config,(_r,work)=>work(principals.personal)));
await app.register(async scope=>locationRoutes(scope,db.pool,config,new Locations(db.pool,geocoder),(_r,_kind,work)=>work(principals.personal)));
// Playwright kills process trees on Windows; explicit teardown closes only this
// harness-created disposable database before the server process is terminated.
app.post('/__fixture/cleanup',async()=>{await db.close();return {closed:true};});
app.get('/api/session/context',async()=>({kind:'personal',access:{tenantId:ids.personalTenant,sourceId:ids.personalAccount,tenantKind:'personal',principalKind:'account',branchIds:[],driverId:ids.personalDriver,effectiveCapabilities:['execution.own','correction.own']},expiresAt:new Date(Date.now()+3600000).toISOString(),recoveryEmailVerified:true,phoneOwnershipVerified:false,loginIdentifier:'fixture'}));
app.get('/api/session/bootstrap',async(_r,reply)=>reply.header('Set-Cookie','__Host-tawsel-browser=p11-browser; Path=/; Secure; HttpOnly; SameSite=Strict').send({csrfToken:'p11-browser'}));
for(const name of ['منى — مراجعة الموقع','عميل آخر — عمل مستقل'])await new IndependentIntakeService(db.pool).create(principals.personal,{schemaVersion:'1.0.0',payloadVersion:'1.0.0',actionId:randomUUID(),operationId:'task.createIndependent',context:{kind:'device',tenantId:ids.personalTenant,accountId:ids.personalAccount,deviceId:randomUUID(),deviceGeneration:1,deviceSequence:1},resources:{},baseVersions:{},dependsOnActionIds:[],observation:{observedAt:null,clock:{quality:'unknown'}},payload:{recipientName:name,recipientPhone:'01012345678',destination:{kind:'address',addressText:'ميدان التحرير، القاهرة'}}});
await app.listen({host:'127.0.0.1',port:3011});
let closing=false;const close=async()=>{if(closing)return;closing=true;await app.close();await db.close();process.exit(0);};process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
console.log('P11 isolated demo ready: account/geocoder fixtures, real PostgreSQL + self-hosted maps.');
