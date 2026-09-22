// Operator-owned test harness. The copied consumer receives only public artifacts
// and source credentials; the application database is real and disposable.
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createTestDatabase } from '../apps/api/test/support/database.js';
import { migrate } from '../apps/api/src/db/migrate.js';
import { createDatabasePool } from '../apps/api/src/db/pool.js';
import { buildApp } from '../apps/api/src/app.js';
import { bindSource, operatorToken, send } from '../apps/api/test/support/provisioning-fixture.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const db=await createTestDatabase();
const app=buildApp(createDatabasePool(db.config),undefined,{issuer:'https://p10-provider-fixture.invalid',operatorToken});
try {
  await migrate(db.pool);await app.ready();
  const source=await bindSource(app,['p10-demo-driver']);
  const grant=structuredClone(source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=2;grant.payload.intakeCapabilities=['intake.prepare','assignment.manage'];
  const check=(response:{statusCode:number;body:string})=>{if(response.statusCode!==200)throw new Error(response.body);};
  check(await send(app,operatorToken,grant));
  for(const [operation,payload] of [
    ['branch.provision',{externalId:'cairo',sourceRevision:1,name:'P10 conformance Cairo',enabled:true,location:null}],
    ['role.defineCapabilities',{externalId:'driver-role',sourceRevision:1,name:'Driver',capabilities:['execution.own']}],
    ['user.provision',{externalId:'driver',sourceRevision:1,subject:'p10-demo-driver',roleExternalId:'driver-role',branchExternalIds:['cairo'],enabled:true}],
    ['driver.provisionReference',{externalId:'driver',sourceRevision:1,userExternalId:'driver',enabled:true,profile:'car',vehicleReference:null}]
  ] as const)check(await send(app,source.token,source.command(operation,payload)));
  const apiUrl=await app.listen({host:'127.0.0.1',port:0});
  const directory=await mkdtemp(join(tmpdir(),'tawsel-p10-public-consumer-'));
  for(const file of ['packages/api-client/src/schema.d.ts','packages/api-client/src/intake.ts','tests/erp-conformance/intake.ts']) {
    const target=join(directory,file);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,file),target);
  }
  await writeFile(join(directory,'package.json'),JSON.stringify({private:true,type:'module'}));
  const configPath=join(directory,'consumer.json');
  await writeFile(configPath,JSON.stringify({apiUrl,tenantId:source.tenantId,integrationId:source.integrationId,token:source.token,branchExternalId:'cairo',driverExternalId:'driver',dedicatedTestDriver:true}));
  // Explicit allowlist: no Tawsel DB, operator, issuer-admin or provisioning config.
  const child=spawn(process.execPath,['--import',pathToFileURL(join(root,'node_modules/tsx/dist/loader.mjs')).href,'tests/erp-conformance/intake.ts'],{
    cwd:directory,stdio:['ignore','pipe','pipe'],windowsHide:true,
    env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TAWSEL_INTAKE_CONFIG:configPath}
  });
  child.stdout.on('data',chunk=>process.stdout.write(chunk));child.stderr.on('data',chunk=>process.stderr.write(chunk));
  const exit=await new Promise<number|null>((done,reject)=>{child.once('error',reject);child.once('exit',done);});
  if(exit!==0)throw new Error(`Public consumer failed with exit ${exit}`);
  console.log(`Independent public-only consumer directory: ${directory}`);
  console.log('Real PostgreSQL and HTTP; provisioning subjects are labelled fixtures, no issuer login or Engine is claimed. Test database is removed; retained source credentials cannot access any other database.');
} finally {await app.close();await db.close();}
