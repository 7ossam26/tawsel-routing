import Fastify from 'fastify';
import type {Pool} from 'pg';
import {prepareAccessFixture} from './access-fixture.js';
import {provisioningRoutes} from '../../src/provisioning/routes.js';
import {writeProjection} from '../../src/provisioning/domain.js';
import {bindSource,operatorToken,send} from './provisioning-fixture.js';

export async function senderFixture(pool:Pool){
 await prepareAccessFixture(pool);
 const app=Fastify(),config={issuer:'https://issuer.fixture.invalid',operatorToken};
 await app.register(s=>provisioningRoutes(s,pool,config,writeProjection));
 await app.ready();
 async function source(tenantId?:Parameters<typeof bindSource>[2]){
  const source=await bindSource(app,[],tenantId);
  return {...source,authorization:`Bearer ${source.token}`,
   async change(externalId='branch'){
    const c=source.command('branch.provision',{externalId,sourceRevision:1,name:'فرع',enabled:true,location:null});
    const r=await send(app,source.token,c);
    if(r.statusCode!==200)throw new Error(r.body);
    return c;
   }};
 }
 return {app,config,source,close:()=>app.close()};
}
