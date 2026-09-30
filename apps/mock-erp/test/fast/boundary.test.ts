import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,relative,isAbsolute} from 'node:path';
import ts from 'typescript';
import {expect,test} from 'vitest';
import {validateNative,type ReceiverConfig} from '../../src/config.js';
import {receiverPool} from '../../src/database.js';
const directory=fileURLToPath(new URL('../../src/',import.meta.url));
function check(source:string,file:string){
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 function module(value:ts.Expression){
  if(!ts.isStringLiteral(value))throw new Error('Computed imports are not a public dependency boundary');
  const name=value.text;
  if(name.startsWith('./')||name.startsWith('../')){
   const path=relative(directory,resolve(file,'..',name));if(path.startsWith('..')||isAbsolute(path))throw new Error('Consumer internal module escape');
  }else if(!name.startsWith('node:')&&!['pg','fastify','@fastify/cookie','openid-client','@tawsel/api-client'].includes(name)&&!name.startsWith('@tawsel/api-client/'))throw new Error('Consumer internal module dependency');
 }
 function visit(node:ts.Node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier)module(node.moduleSpecifier);
  if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==='require')){if(!node.arguments[0])throw new Error('Missing import');module(node.arguments[0]);}
  ts.forEachChild(node,visit);
 }
 visit(ast);
}
test('external consumer runtime and dependency manifest cannot import Tawsel internals; detector rejects escape and dynamic bypass fixtures',()=>{
 for(const name of readdirSync(directory,{recursive:true,encoding:'utf8'}).filter(n=>n.endsWith('.ts')))check(readFileSync(resolve(directory,name),'utf8'),resolve(directory,name));
 const pkg=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')) as {dependencies:Record<string,string>};
 expect(Object.keys(pkg.dependencies).sort()).toEqual(['@fastify/cookie','@tawsel/api-client','fastify','openid-client','pg']);
 for(const source of ['import x from "@tawsel/api"','import "../../api/src/outbox/worker.js"','const x=import(target)'])expect(()=>check(source,resolve(directory,'escape.ts'))).toThrow();
});
test('native mock refuses production mode and a public listener',()=>{
 const config={host:'0.0.0.0',native:{privateTestOnly:true}} as ReceiverConfig;
 expect(()=>validateNative(config)).toThrow('private/test-only');
 const previous=process.env.NODE_ENV;try{process.env.NODE_ENV='production';config.host='127.0.0.1';expect(()=>validateNative(config)).toThrow('private/test-only');}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
test('public test mode requires production, HTTPS and trusted proxy CIDRs',()=>{
 const previous=process.env.NODE_ENV;
 const c:ReceiverConfig={tenantId:'11111111-1111-4111-8111-111111111111',integrationId:'22222222-2222-4222-8222-222222222222',statusToken:'s'.repeat(32),keys:[{keyId:'test',secret:'a'.repeat(64)}],host:'0.0.0.0',port:3010,testLoopback:false,tawselBaseUrl:'https://app.example.test/',tawselAuthorization:'Bearer scoped',native:{mode:'public-test',origin:'https://mock.example.test',issuer:'https://auth.example.test/realms/tawsel-company',clientId:'tawsel-mock-erp',clientSecret:'secret',sessionKey:'b'.repeat(64),adminSubjects:['seeded-subject'],trustedProxyCidrs:['172.30.0.0/24']}};
 try{
  process.env.NODE_ENV='production';expect(()=>validateNative(c)).not.toThrow();
  expect(()=>validateNative({...c,testLoopback:true})).toThrow();
  expect(()=>validateNative({...c,tawselBaseUrl:'http://app.example.test/'})).toThrow();
  expect(()=>validateNative({...c,native:{...c.native!,trustedProxyCidrs:['0.0.0.0/0']}})).toThrow();
  process.env.NODE_ENV='development';expect(()=>validateNative(c)).toThrow();
 }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
test('remote mock database refuses plaintext and missing trust root',()=>{
 expect(()=>receiverPool('postgresql://mock:secret@database:5432/mock_erp_pilot?sslmode=disable')).toThrow('verified TLS');
 expect(()=>receiverPool('postgresql://mock:secret@database:5432/mock_erp_pilot?sslmode=verify-full')).toThrow('CA file');
});
