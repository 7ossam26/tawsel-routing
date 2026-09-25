import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app.js';
import { createDatabasePool } from '../../src/db/pool.js';
import { bindSource, operatorToken, send } from './provisioning-fixture.js';
import { command, settings } from './planning-fixture.js';
import { PlanningService } from '../../src/planning/service.js';
import type { createTestDatabase } from './database.js';

/** Real public ERP projection/intake boundary; issuer reconciliation is a labelled
 * enabled-subject fixture. No direct shipment or planning-row seeding. */
export async function companyPlanningFixture(db:Awaited<ReturnType<typeof createTestDatabase>>,options:{issuer?:string;driverSubject?:string}={}) {
 const issuer=options.issuer??'https://issuer.fixture.invalid',driverSubject=options.driverSubject??'policy-driver';
 const app=buildApp(createDatabasePool(db.config),undefined,{issuer,operatorToken});await app.ready();
 try{
  const source=await bindSource(app,[driverSubject,'policy-staff','policy-second']),bootstrap=structuredClone(source.bootstrapCommand);
  const checked=async(p:Promise<{statusCode:number;body:string;json():unknown}>)=>{const r=await p;if(r.statusCode!==200)throw new Error(r.body);return r;};
  bootstrap.actionId=randomUUID();bootstrap.payload.sourceRevision=2;bootstrap.payload.intakeCapabilities=['intake.prepare','assignment.manage'];await checked(send(app,operatorToken,bootstrap));
  await checked(send(app,source.token,source.command('branch.provision',{externalId:'branch',sourceRevision:1,name:'فرع',enabled:true,location:null})));
  await checked(send(app,source.token,source.command('role.defineCapabilities',{externalId:'role',sourceRevision:1,name:'Driver',capabilities:['execution.own']})));
  const user=await send(app,source.token,source.command('user.provision',{externalId:'policy-driver',sourceRevision:1,subject:driverSubject,roleExternalId:'role',branchExternalIds:['branch'],enabled:true}));await checked(Promise.resolve(user));
  const driver=await send(app,source.token,source.command('driver.provisionReference',{externalId:'policy-driver',sourceRevision:1,userExternalId:'policy-driver',enabled:true,profile:'bicycle',vehicleReference:null}));await checked(Promise.resolve(driver));
  const driverId=driver.json().response.body.resourceId as string,accountId=user.json().response.body.resourceId as string;
  await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1',[source.tenantId]);
  const principal={kind:'account' as const,issuer,subject:driverSubject},service=new PlanningService(db.pool);
  const post=(op:string,payload:object)=>checked(app.inject({method:'POST',url:`/api/v1/intake/commands/${op}`,headers:{authorization:`Bearer ${source.token}`},payload:source.command(op,payload)}));
  const deviceId=randomUUID();
  const planCommand=(op:string,payload:object)=>{const c=command(op,{driverId,...payload});c.context={kind:'device',tenantId:source.tenantId,accountId,deviceId,deviceGeneration:1,deviceSequence:1};return c;};
  return {tenantId:source.tenantId,driverId,accountId,source,app,post,service,principal,planCommand,async close(){await app.close();},async save(){return service.command(principal,planCommand('planning.saveDraft',{expectedSettingsRevision:0,settings}));},
   async task(name:string,priority:'urgent'|'ordinary',state:'held'|'prepared'='held',earliestAt?:string,quantity=1){
    const item={externalId:name,sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1};
    const response=await post('intake.submitSnapshot',{externalId:name,sourceDispatchCycleId:'cycle',sourceRevision:1,expectedSourceRevision:0,sourceBranchExternalId:'branch',recipientName:'عميل',recipientPhone:'01012345678',destination:{kind:'confirmed-pin',coordinates:{latitude:30.05,longitude:31.24}},splittingAllowed:quantity>1,allocation:'exact-outstanding-per-unit',lines:[{sourceLineId:'line',description:'طرد',quantity,unitDue:{amountMinor:100,currency:'EGP',exponent:2}}],shippingDue:{amountMinor:0,currency:'EGP',exponent:2},totalDue:{amountMinor:100*quantity,currency:'EGP',exponent:2},priority,...(earliestAt?{earliestAt}:{})});
    await post(state==='held'?'assignment.receiveBatch':'intake.prepare',{driverExternalId:'policy-driver',items:[item],...(state==='held'?{receiptAsserted:true}:{})});
    return (response.json() as {response:{body:{tasks:{taskId:string}[]}}}).response.body.tasks[0]!.taskId;
   }
  };
 }catch(error){await app.close();throw error;}
}
