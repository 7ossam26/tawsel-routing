import {readFile} from 'node:fs/promises';
import {buildApp} from '../../src/app.js';
import {createDatabasePool} from '../../src/db/pool.js';
import {parseDatabaseConfig} from '../../src/db/config.js';
import type {AuthConfig} from '../../src/auth/config.js';
import type {OutboxConfig} from '../../src/outbox/config.js';
import {runOutboxOnce} from '../../src/outbox/worker.js';
import {reconcileOne} from '../../src/provisioning/worker.js';
import {keycloakAdministration} from '../../src/provisioning/issuer.js';
const value=JSON.parse(await readFile(process.env.TAWSEL_SOURCE_TEST_CONFIG!,'utf8')) as {databaseUrl:string;auth:Omit<AuthConfig,'encryptionKey'>&{encryptionKey:string};outbox:Omit<OutboxConfig,'encryptionKey'>&{encryptionKey:string};issuer:string;workerSecret:string;port:number};
const pool=createDatabasePool(parseDatabaseConfig(value.databaseUrl,'test')),auth={...value.auth,encryptionKey:Buffer.from(value.auth.encryptionKey,'hex')},outbox={...value.outbox,encryptionKey:Buffer.from(value.outbox.encryptionKey,'hex')};
const app=buildApp(pool,auth,{issuer:value.issuer},outbox);await app.listen({host:'127.0.0.1',port:value.port});console.log(JSON.stringify({address:app.server.address()}));
const admin=keycloakAdministration({issuer:value.issuer,clientId:'local-test-control',clientSecret:value.workerSecret});let stopped=false;process.once('SIGTERM',()=>{stopped=true;});process.once('SIGINT',()=>{stopped=true;});
try{while(!stopped){await reconcileOne(pool,value.issuer,admin);for(let i=0;i<10&&await runOutboxOnce(pool,outbox);i++){/* real sender */}await new Promise(r=>setTimeout(r,200));}}finally{await app.close();}
