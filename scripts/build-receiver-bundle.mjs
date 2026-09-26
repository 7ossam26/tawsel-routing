import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import ts from 'typescript';
const target=resolve('dist/erp-reference');
// Delete only this named generated distribution, never caller-supplied paths.
if(target!==resolve(process.cwd(),'dist','erp-reference'))throw new Error('Invalid generated target');
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
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
for(const [source,name] of [['source.ts','source.mjs'],['source-driver.ts','source-driver.js'],['source-report.ts','source-report.js']])await writeFile(`${target}/conformance/${name}`,ts.transpileModule(await readFile(`tests/erp-conformance/${source}`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText);
await writeFile(`${target}/package.json`,JSON.stringify({name:'tawsel-external-receiver-bundle',version:'0.1.0',private:true,type:'module',engines:{node:'>=24.11.0 <25'},dependencies:{'@tawsel/api-client':'file:./api-client','@tawsel/mock-erp':'file:./mock-erp',exceljs:'4.4.0'}},null,2)+'\n');
await cp('docs/erp/reference-package-lock.json',`${target}/package-lock.json`);
await writeFile(target+'/README.md','# Tawsel standalone reference consumer\n\nNode 24, npm 11, own restricted PostgreSQL database. Install with npm ci --ignore-scripts. Configure MOCK_ERP_CONFIG and MOCK_ERP_DATABASE_URL; migrate with node mock-erp/dist/main.js migrate, serve with node mock-erp/dist/main.js, apply with node mock-erp/dist/main.js worker, send with node mock-erp/dist/main.js source-worker.\n\nThe complete versioned handoff retains the [external quickstart](../../docs/erp/consumer-quickstart.md), [mapping](../../docs/erp/field-and-status-mapping.md) and [evidence](../../docs/verification/integration.md) at those paths. Copy the complete dist/erp-handoff directory for a standalone document set; this runtime subdirectory alone does not include those guides. No Tawsel DB/operator credentials or internal imports are required.\n');
console.log('Built dist/erp-reference: public client/contracts, isolated consumer/migrations/UI and source/report/receiver conformance.');
