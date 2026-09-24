import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,relative,isAbsolute} from 'node:path';
import ts from 'typescript';
import {expect,test} from 'vitest';
import {validateNative,type ReceiverConfig} from '../../src/config.js';
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
