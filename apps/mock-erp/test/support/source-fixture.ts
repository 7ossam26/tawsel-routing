import {randomBytes,randomUUID} from 'node:crypto';
import {createTestDatabase} from '../../../api/test/support/database.js';
import {migrate} from '../../../api/src/db/migrate.js';
import {buildApp} from '../../../api/src/app.js';
import {createDatabasePool} from '../../../api/src/db/pool.js';
import {bindSource,send,operatorToken} from '../../../api/test/support/provisioning-fixture.js';
import {createReceiverDatabase} from '../../../../scripts/mock-erp-database.js';
import {migrateReceiver} from '../../src/database.js';
import {saveSource,sourceEnvelope,runSourceOnce,type SourceSubmission} from '../../src/source.js';
import type {ReceiverConfig} from '../../src/config.js';
export async function sourceFixture(){
 const db=await createTestDatabase();await migrate(db.pool);
 const app=buildApp(createDatabasePool(db.config),undefined,{issuer:'https://issuer.fixture.invalid',operatorToken});await app.ready();
 const source=await bindSource(app,['source-driver','source-staff']);
 const grant=structuredClone(source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=2;grant.payload.intakeCapabilities=['intake.prepare','assignment.manage'];grant.payload.returnCapabilities=['return.receive','return.dispose'];
 const granted=await send(app,operatorToken,grant);if(granted.statusCode!==200)throw new Error(granted.body);
 const url=await app.listen({host:'127.0.0.1',port:0}),erp=await createReceiverDatabase();
 const c:ReceiverConfig={tenantId:source.tenantId,integrationId:source.integrationId,host:'127.0.0.1',port:0,statusToken:randomBytes(32).toString('hex'),keys:[{keyId:'source-test',secret:randomBytes(32).toString('hex')}],tawselBaseUrl:url,tawselAuthorization:`Bearer ${source.token}`,testLoopback:true};
 await migrateReceiver(erp.pool,c);
 const submission=(operation:string,payload:Record<string,unknown>,kind:string,externalId:string,revision=0):SourceSubmission=>({command:sourceEnvelope(c,operation,payload),records:[{kind,externalId,expectedRevision:revision,desired:payload}]});
 const submit=async(input:SourceSubmission)=>{await saveSource(erp.pool,c,'verified-test-staff',input);await runSourceOnce(erp.pool,c);const row=(await erp.pool.query('SELECT * FROM mock_erp.source_commands WHERE action_id=$1',[input.command.actionId])).rows[0];if(row.status!=='accepted')throw new Error(JSON.stringify(row.result??row.last_error));return row;};
 const setup=async()=>{
  await submit(submission('branch.provision',{externalId:'cairo',sourceRevision:1,name:'القاهرة',enabled:true,location:null},'branch','cairo'));
  await submit(submission('role.defineCapabilities',{externalId:'driver',sourceRevision:1,name:'مندوب',capabilities:['execution.own']},'role','driver'));
  const user=await submit(submission('user.provision',{externalId:'driver',sourceRevision:1,subject:'source-driver',roleExternalId:'driver',branchExternalIds:['cairo'],enabled:true},'user','driver'));
  const driver=await submit(submission('driver.provisionReference',{externalId:'driver',sourceRevision:1,userExternalId:'driver',enabled:true,profile:'car',vehicleReference:null},'driver','driver'));
  return {accountId:user.result.response.body.resourceId as string,driverId:driver.result.response.body.resourceId as string};
 };
 return {db,app,erp,c,source,url,submission,submit,setup,async close(){await app.close();await erp.close();await db.close();}};
}
export const sourceSnapshot=(externalId:string)=>({externalId,sourceDispatchCycleId:'cycle-1',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'cairo',recipientName:'عميل الاختبار',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.04,longitude:31.23}},splittingAllowed:true,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'pieces',description:'قطع',quantity:3,unitDue:{amountMinor:10000,currency:'EGP',exponent:2}}],shippingDue:{amountMinor:5000,currency:'EGP',exponent:2},totalDue:{amountMinor:35000,currency:'EGP',exponent:2},priority:'ordinary'});
