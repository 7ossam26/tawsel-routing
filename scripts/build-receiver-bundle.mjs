import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import ts from 'typescript';
const target=resolve('dist/erp-reference');await mkdir(target,{recursive:true});
for(const [source,name] of [['packages/api-client','api-client'],['apps/mock-erp','mock-erp']]){
 const packageJson=JSON.parse(await readFile(`${source}/package.json`,'utf8'));
 delete packageJson.devDependencies;delete packageJson.scripts;
 packageJson.types='dist/schema.d.ts';if(name==='mock-erp')delete packageJson.types;
 await mkdir(`${target}/${name}`,{recursive:true});await writeFile(`${target}/${name}/package.json`,JSON.stringify(packageJson,null,2)+'\n');
 await cp(`${source}/dist`,`${target}/${name}/dist`,{recursive:true});
 if(name==='mock-erp'){await cp(`${source}/migrations`,`${target}/${name}/migrations`,{recursive:true});await cp(`${source}/ui-dist`,`${target}/${name}/ui-dist`,{recursive:true});await cp(`${source}/config.example.json`,`${target}/${name}/config.example.json`);}
}
await mkdir(`${target}/conformance`,{recursive:true});
const checker=await readFile('tests/erp-conformance/receiver.ts','utf8');
await writeFile(`${target}/conformance/receiver.mjs`,ts.transpileModule(checker,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText);
for(const [source,name] of [['source.ts','source.mjs'],['source-driver.ts','source-driver.js']])await writeFile(`${target}/conformance/${name}`,ts.transpileModule(await readFile(`tests/erp-conformance/${source}`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText);
await writeFile(`${target}/package.json`,JSON.stringify({name:'tawsel-external-receiver-bundle',version:'0.1.0',private:true,type:'module',engines:{node:'>=24.11.0 <25'},dependencies:{'@tawsel/api-client':'file:./api-client','@tawsel/mock-erp':'file:./mock-erp'}},null,2)+'\n');
// Keep the receiving guide useful after copying the artifact outside this repo.
// Older feature-specific examples belong to the repository handoff, not this bundle.
const guide=(await readFile('docs/erp/consumer-quickstart.md','utf8')).split('## Earlier public integration examples')[0]
 .replaceAll('../verification/integration.md','integration-evidence.md').replaceAll('../../contracts/','api-client/dist/contracts/')
 .replaceAll('../provisioning.md','provisioning.md').replaceAll('../outbox-delivery.md','outbox-delivery.md');
await writeFile(`${target}/README.md`,guide.replaceAll('../phase-27-evidence.md','phase-27-evidence.md'));
for(const [source,name] of [['docs/erp/source-protocol.md','source-protocol.md'],['docs/erp/ERP-PLANNING-INPUT.md','ERP-PLANNING-INPUT.md'],['docs/erp/field-and-status-mapping.md','field-and-status-mapping.md'],['docs/phase-27-evidence.md','phase-27-evidence.md'],['docs/erp/receiver-protocol.md','receiver-protocol.md'],['docs/verification/integration.md','integration-evidence.md'],['docs/phase-26-evidence.md','phase-26-evidence.md'],['docs/provisioning.md','provisioning.md'],['docs/outbox-delivery.md','outbox-delivery.md']]){
 const doc=(await readFile(source,'utf8')).replaceAll('../phase-26-evidence.md','phase-26-evidence.md')
  .replaceAll('../erp/receiver-protocol.md','receiver-protocol.md').replaceAll('erp/receiver-protocol.md','receiver-protocol.md')
  .replaceAll('../erp/consumer-quickstart.md','README.md').replaceAll('consumer-quickstart.md','README.md')
  .replaceAll('../phase-27-evidence.md','phase-27-evidence.md').replaceAll('../erp/source-protocol.md','source-protocol.md').replaceAll('erp/source-protocol.md','source-protocol.md')
  .replaceAll('../verification/integration.md','integration-evidence.md').replaceAll('../../contracts/','api-client/dist/contracts/').replaceAll('../contracts/','api-client/dist/contracts/');
 await writeFile(`${target}/${name}`,doc);
}
console.log('Built dist/erp-reference: compiled public client/contracts, isolated consumer/migrations, portable conformance checker.');
