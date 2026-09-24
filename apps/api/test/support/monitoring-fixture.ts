import {randomUUID} from 'node:crypto';
import type {components} from '@tawsel/api-client';
import type {createTestDatabase} from './database.js';
import {outcomeCompanyFixture} from './outcome-fixture.js';
import {bindSource,send,operatorToken} from './provisioning-fixture.js';
/** Identity/shared-reference setup is a labelled fixture. Every shipment,
 * receipt, active-round admission and outcome uses the actual public boundary.
 * P08 has no operator API for linking two source references to one driver. */
export async function mixedMonitoringFixture(db:Awaited<ReturnType<typeof createTestDatabase>>){
 const f=await outcomeCompanyFixture(db,[{},{}]);
 try{
  const grant=structuredClone(f.source.bootstrapCommand);grant.actionId=randomUUID();grant.payload.sourceRevision=3;grant.payload.monitoringCapabilities=['monitor.read'];
  const granted=await send(f.app,operatorToken,grant);if(granted.statusCode!==200)throw new Error(granted.body);
  const second=await bindSource(f.app,[],f.tenantId),boot=structuredClone(second.bootstrapCommand);boot.actionId=randomUUID();boot.payload.sourceRevision=2;boot.payload.intakeCapabilities=['intake.prepare','assignment.manage'];boot.payload.monitoringCapabilities=['monitor.read'];
  const bound=await send(f.app,operatorToken,boot);if(bound.statusCode!==200)throw new Error(bound.body);
  const branch=await send(f.app,second.token,second.command('branch.provision',{externalId:'private-branch',sourceRevision:1,name:'Private source branch',enabled:true,location:null}));if(branch.statusCode!==200)throw new Error(branch.body);
  const branchId=branch.json().response.body.resourceId as string;
  await db.pool.query('INSERT INTO tawsel.membership_branches VALUES ($1,$2,$3)',[f.tenantId,f.accountId,branchId]);
  await db.pool.query(`INSERT INTO tawsel.provisioning_records(tenant_id,integration_id,entity,external_id,resource_id,source_revision,payload_hash,last_action_id,state)
   SELECT tenant_id,$2,entity,'shared-driver',resource_id,1,payload_hash,$3,state FROM tawsel.provisioning_records WHERE tenant_id=$1 AND integration_id=$4 AND entity='driver' AND external_id='policy-driver'`,[f.tenantId,second.integrationId,boot.actionId,f.source.integrationId]);
  const source=(await f.app.inject({url:'/api/v1/intake/task?externalId=shipment-0',headers:{authorization:`Bearer ${f.source.token}`}})).json().snapshot;
  const snapshot={...source,externalId:'private-shipment',sourceBranchExternalId:'private-branch',recipientName:'SECRET RECIPIENT B',recipientPhone:'01099999999',destination:{kind:'confirmed-pin',coordinates:{latitude:30.987,longitude:31.987}}};
  const post=async(op:string,payload:object)=>{const r=await f.app.inject({method:'POST',url:`/api/v1/intake/commands/${op}`,headers:{authorization:`Bearer ${second.token}`},payload:second.command(op,payload)});if(r.statusCode!==200)throw new Error(r.body);return r;};
  const created=await post('intake.submitSnapshot',snapshot),hiddenId=created.json().response.body.tasks[0].taskId as string;
  await post('assignment.receiveBatch',{driverExternalId:'shared-driver',receiptAsserted:true,items:[{externalId:'private-shipment',sourceDispatchCycleId:'cycle',expectedSourceRevision:1,expectedAssignmentRevision:0,assignmentRevision:1}]});
  const plans=await f.service.plans(f.principal,f.driverId);
  await f.service.command(f.principal,f.planCommand('planning.setManualOrder',{expectedSettingsRevision:plans.settingsRevision,expectedInputRevision:plans.inputRevision,expectedManualRevision:plans.manualRevision,selection:{kind:'order',taskIds:[hiddenId,...f.tasks]}}));
  const plan=(await f.service.plans(f.principal,f.driverId)).items[0]!;
  const make=(operation:string,extra:Record<string,unknown>={},activityRevision=0,current:string|null=null)=>{
   const m=plan.input.members.find(m=>m.taskId===hiddenId)!;
   const c=f.planCommand(operation,{roundId:f.round.roundId,taskId:hiddenId,attemptId:m.attemptId,expectedActivityRevision:activityRevision,expectedCurrentAttemptId:current,expectedSourceRevision:m.sourceRevision,expectedAssignmentRevision:m.assignmentRevision,expectedPinRevision:m.pinRevision,...extra});delete c.payload.driverId;c.context={...f.start.context};return c;
  };
  const get=async(source=f.source,path=`drivers/${f.driverId}`,query='')=>f.app.inject({url:`/api/v1/erp/monitoring/${path}${query}`,headers:{authorization:`Bearer ${source.token}`}});
  const snapshotA=async()=>{const r=await get();if(r.statusCode!==200)throw new Error(r.body);return r.json() as components['schemas']['MonitoringSnapshot'];};
  return {...f,second,hiddenId,hiddenBranchId:branchId,hiddenMake:make,monitorGet:get,snapshotA,monitorGrant:grant};
 }catch(e){await f.close();throw e;}
}
