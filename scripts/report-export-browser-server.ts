/** Real Fastify/PostgreSQL/export handlers with a labelled authenticated-principal fixture. */
import {existsSync} from 'node:fs';
import {unlink} from 'node:fs/promises';
import Fastify from 'fastify';
import {createTestDatabase} from '../apps/api/test/support/database.js';
import {prepareAccessFixture} from '../apps/api/test/support/access-fixture.js';
import {outcomeCompanyFixture} from '../apps/api/test/support/outcome-fixture.js';
import {send} from '../apps/api/test/support/provisioning-fixture.js';
import {money} from '../apps/api/src/outcomes/arithmetic.js';
import {Outcomes} from '../apps/api/src/outcomes/service.js';
import {reportingRoutes} from '../apps/api/src/reporting/routes.js';
import type {AuthConfig} from '../apps/api/src/auth/config.js';

const clean:(()=>Promise<unknown>)[]=[];
try{
 const db=await createTestDatabase();clean.push(()=>db.close());await prepareAccessFixture(db.pool);const fixture=await outcomeCompanyFixture(db,[{recipientName:'=1+1'},{recipientName:'عميل ثانٍ'}]);clean.push(()=>fixture.close());
 const role=async(sourceRevision:number,includeExport:boolean)=>{const result=await send(fixture.app,fixture.source.token,fixture.source.command('role.defineCapabilities',{externalId:'role',sourceRevision,name:'Driver',capabilities:['execution.own','correction.own','reports.read',...(includeExport?['reports.export']:[])]}));if(result.statusCode!==200)throw new Error(result.body);};await role(2,true);
 const accepted=await new Outcomes(db.pool).command(fixture.principal,fixture.make(0,'outcome.recordFull',{reportedCollection:money(35000)}));if(accepted.receipt.businessStatus!=='accepted')throw new Error('Outcome fixture failed');
 const app=Fastify({ajv:{customOptions:{removeAdditional:false}}});clean.push(()=>app.close());const config={origin:'http://localhost:5174',encryptionKey:Buffer.alloc(32,1),sessionSeconds:3600,issuers:{}} as AuthConfig;
 await app.register(scope=>reportingRoutes(scope,db.pool,config,(_request,_kind,work)=>work(fixture.principal)));
 app.get('/__fixture/info',async()=>({workdayId:fixture.round.workdayId,formulaName:'=1+1'}));app.post('/__fixture/revoke-export',async()=>{await role(3,false);return {revoked:true};});
 const stop='.local/phase-37-browser.stop';if(existsSync(stop))await unlink(stop);await app.listen({host:'127.0.0.1',port:3037});let stopped=false;process.once('SIGINT',()=>{stopped=true;});process.once('SIGTERM',()=>{stopped=true;});console.log('P37 real-API export harness ready on 3037.');while(!stopped&&!existsSync(stop))await new Promise(resolve=>setTimeout(resolve,200));if(existsSync(stop))await unlink(stop);
}finally{for(const close of clean.reverse())await close();}
process.exit(0);
