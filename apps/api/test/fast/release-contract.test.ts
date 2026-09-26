import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import {parse} from 'yaml';
import {expect,test} from 'vitest';
import {buildApp} from '../../src/app.js';
import type {AuthConfig} from '../../src/auth/config.js';
import {receiverApp} from '../../../mock-erp/src/app.js';

// Surface registration only. No database/transaction or authenticated behavior
// claim: those are exercised by the real PostgreSQL integration project.
test('every released HTTP method/path is registered by its owning server and no private application API escapes the catalog',async()=>{
 const pool=new Pool({connectionString:'postgresql://unused@127.0.0.1:1/unused'});
 const issuer={issuer:'http://localhost:8085/realms/company',clientId:'surface-check',clientSecret:'not-a-credential'};
 const auth:AuthConfig={origin:'http://localhost:5173',encryptionKey:Buffer.alloc(32),sessionSeconds:60,issuers:{company:issuer,personal:{...issuer,issuer:'http://localhost:8085/realms/personal'}}};
 const app=buildApp(pool,auth,{issuer:issuer.issuer,operatorToken:'surface-check-only-token-'.repeat(3)},undefined,{token:'surface-check-only-token-'.repeat(3)});
 const registered=new Set<string>();
 const normalize=(path:string)=>path.replace(/:[^/]+/g,'{}').replace(/\{[^}]+\}/g,'{}');
 app.addHook('onRoute',route=>{for(const method of [route.method].flat())if(method!=='HEAD')registered.add(`${method} ${normalize(route.url)}`);});
 const consumer=receiverApp(pool,{tenantId:'11111111-1111-4111-8111-111111111111',integrationId:'22222222-2222-4222-8222-222222222222',host:'127.0.0.1',port:3012,testLoopback:true,statusToken:'surface-check-only-token-'.repeat(3),keys:[]});
 try{
  await app.ready();await consumer.ready();
  const api=parse(readFileSync('contracts/openapi.yaml','utf8')) as {paths:Record<string,Record<string,{operationId?:string}>>};
  const expected=new Set<string>();
  for(const [path,methods] of Object.entries(api.paths))for(const [method,operation] of Object.entries(methods))if(operation.operationId){
   const owner=path.startsWith('/api/v1/consumer/')||path.startsWith('/api/v1/source/')?consumer:app;
   expect(owner.hasRoute({method:method.toUpperCase() as 'GET',url:path.replace(/\{([^}]+)\}/g,':$1')}),`${operation.operationId}: ${method} ${path}`).toBe(true);
   if(owner===app)expected.add(`${method.toUpperCase()} ${normalize(path)}`);
  }
  expect([...registered].filter(route=>route.includes(' /api/')||route.includes(' /internal/')).sort()).toEqual([...expected].sort());
 }finally{await consumer.close();await app.close();}
});
