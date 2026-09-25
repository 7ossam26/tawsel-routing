import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {components} from '@tawsel/api-client';
import {AccessDenied,withAccess,type AccessSession,type AuthenticatedPrincipal} from '../access/service.js';
import {executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks,type Decision} from '../commands/kernel.js';
import {canonicalJson} from '../commands/json.js';
import type {Transaction} from '../db/transaction.js';
import {own,ownDriver} from '../current/state.js';
import {executionFence} from '../devices/fence.js';
import type {RoundRow} from '../rounds/models.js';
import {requireReturn,ReturnError,unique,uuid,type Request} from './models.js';
import {confirmation,lockDriver,requestRow,requestView} from './state.js';

export function rejection(c:ActionEnvelope,error:ReturnError,summary:Record<string,unknown>={}):Decision{
 const problem={type:`https://schemas.tawsel.invalid/problems/${error.code.replaceAll('_','-')}`,title:'Return command rejected',code:error.code,status:error.statusCode,detail:error.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
 return {status:'rejected',problem,response:{status:error.statusCode,body:problem},summary:{...summary,code:error.code},audit:{...summary,code:error.code}};
}
async function driverAccess(a:AccessSession){if(a.context.tenantKind!=='company')throw new ReturnError('lifecycle_forbidden',409,'المرتجعات للمهام المسندة من الشركة فقط.');return ownDriver(a);}
export class Returns {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async request(principal:AuthenticatedPrincipal,value:unknown){
  requireReturn('RequestCommand',value);const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as Request;
  unique(p.items.map(i=>JSON.stringify([i.dispatchCycleId,i.sourceLineId])));
  return withAccess(this.pool,principal,async(a,tx)=>{
   const driver=await driverAccess(a);if(c.context.kind!=='device')throw new AccessDenied();a.assertScope({tenantId:c.context.tenantId,accountId:c.context.accountId});
   let r:RoundRow;
   const authorize=async()=>{r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND round_id=$2 AND driver_id=$3',[a.context.tenantId,p.roundId,driver])).rows[0]!;if(!r)throw new AccessDenied(true);
    for(const item of p.items)a.requireResource(own,(await tx.query('SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.delivery_outcomes WHERE tenant_id=$1 AND outcome_id=$2 AND task_id=$3 AND dispatch_cycle_id=$4',[a.context.tenantId,item.outcomeId,item.taskId,item.dispatchCycleId])).rows[0]);};
   return executeCommandInTransaction(tx,a.commandScope,c,{authorize,async writeDomain(){try{
    await lockDriver(tx,a.context.tenantId,driver,p.roundId);await authorize();
    const fence=await executionFence(tx,c,r);if(fence)return fence;
    // The latest ended round is an identity anchor for returning carry-forward
    // goods; it never reopens a round or changes an outcome/day history.
    const latest=(await tx.query('SELECT round_id FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 ORDER BY device_generation DESC LIMIT 1',[r.tenant_id,driver])).rows[0];
    if(latest?.round_id!==r.round_id)throw new ReturnError('stale_revision',409,'افتح الجولة الحالية قبل طلب المرتجع.');
    const lines=[];
    for(const item of p.items){
     const row=(await tx.query(`SELECT q.*,c.state,c.driver_id AS holder FROM tawsel.cycle_custody q JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,dispatch_cycle_id) WHERE q.tenant_id=$1 AND q.task_id=$2 AND q.dispatch_cycle_id=$3 AND q.outcome_id=$4 AND q.source_line_id=$5`,[r.tenant_id,item.taskId,item.dispatchCycleId,item.outcomeId,item.sourceLineId])).rows[0];
     if(!row||row.state!=='held'||row.holder!==driver)throw new ReturnError('stale_revision',409,'تغيّرت المحاولة أو حيازة القطع.');
     if(row.branch_id!==p.sourceBranchId)throw new ReturnError('wrong_source_branch',409,'المرتجع إلى فرع الإرسال الأصلي فقط.');
     const pending=Number((await tx.query('SELECT COALESCE(sum(requested-received-lost-damaged),0) AS n FROM tawsel.return_items WHERE tenant_id=$1 AND outcome_id=$2 AND source_line_id=$3',[r.tenant_id,item.outcomeId,item.sourceLineId])).rows[0].n);
     if(item.quantity>row.held-pending)throw new ReturnError('quantity_exceeded',409,'الكمية المعروضة تتجاوز القطع المحتفظ بها وغير المعروضة.');
     if(lines.length&&lines[0]!.integration_id!==row.integration_id)throw new ReturnError('forbidden_resource',403,'لكل مصدر طلب مستقل.');
     lines.push(row);
    }
    const requestId=randomUUID();
    await tx.query('INSERT INTO tawsel.return_requests (tenant_id,request_id,driver_id,branch_id,integration_id,round_id,source_id,action_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[r.tenant_id,requestId,driver,p.sourceBranchId,lines[0]!.integration_id,r.round_id,a.context.sourceId,c.actionId]);
    for(const item of p.items)await tx.query('INSERT INTO tawsel.return_items (tenant_id,item_id,request_id,task_id,dispatch_cycle_id,outcome_id,branch_id,integration_id,driver_id,source_line_id,requested) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[r.tenant_id,randomUUID(),requestId,item.taskId,item.dispatchCycleId,item.outcomeId,p.sourceBranchId,lines[0]!.integration_id,driver,item.sourceLineId,item.quantity]);
    const request=await requestView(tx,await requestRow(tx,a,requestId));requireReturn('RequestedEvent',{request});
    return {status:'accepted',response:{status:200,body:{request,transitions:[]}},summary:{requestId,driverId:driver,roundId:r.round_id},audit:{request},resourceVersions:{},intents:[{eventId:randomUUID(),recipientId:request.integrationId,eventType:'return.requested',payloadVersion:'1.0.0',payload:{request}}]};
   }catch(error){if(error instanceof ReturnError)return rejection(c,error,{driverId:driver,roundId:p.roundId});throw error;}},async writeProgress(){/* Offer changes no custody, plan, collection or current activity. */},...this.observe});
  });
 }
 async groups(principal:AuthenticatedPrincipal):Promise<components['schemas']['ReturnGroups']>{
  return withAccess(this.pool,principal,async(a,tx)=>{const driver=await driverAccess(a);await lockDriver(tx,a.context.tenantId,driver);const scope=a.sqlPredicate(own,'q');
   const rows=(await tx.query(`SELECT q.*,t.external_id,c.source_dispatch_cycle_id,(SELECT p.state->>'name' FROM tawsel.provisioning_records p WHERE p.tenant_id=q.tenant_id AND p.integration_id=q.integration_id AND p.entity='branch' AND p.resource_id=q.branch_id) AS source_branch_name,
    (SELECT COALESCE(sum(i.requested-i.received-i.lost-i.damaged),0) FROM tawsel.return_items i WHERE i.tenant_id=q.tenant_id AND i.outcome_id=q.outcome_id AND i.source_line_id=q.source_line_id) AS offered
    FROM tawsel.cycle_custody q JOIN tawsel.b2b_tasks t USING(tenant_id,task_id) JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,dispatch_cycle_id)
    WHERE ${scope.text} AND c.state='held' AND c.driver_id=q.driver_id AND q.held>0 ORDER BY q.branch_id,q.integration_id,q.task_id,q.source_line_id`,scope.values)).rows;
   const groups:components['schemas']['ReturnGroup'][]=[];
   for(const q of rows){let g=groups.find(g=>g.sourceBranchId===q.branch_id&&g.integrationId===q.integration_id);if(!g){g={sourceBranchName:q.source_branch_name??null,sourceBranchId:q.branch_id,integrationId:q.integration_id,items:[]};groups.push(g);}g.items.push({taskId:q.task_id,dispatchCycleId:q.dispatch_cycle_id,outcomeId:q.outcome_id,sourceLineId:q.source_line_id,externalId:q.external_id,sourceDispatchCycleId:q.source_dispatch_cycle_id,availableToRequest:q.held-Number(q.offered),custody:{sourceQuantity:q.source_quantity,delivered:q.delivered,held:q.held,received:q.received,lost:q.lost,damaged:q.damaged}});}
   // Recover offers on another installation without relying on browser storage.
   // Reuse requestRow's own-driver/source/branch authorization for every row.
   const pendingRequests:components['schemas']['ReturnRequestView'][]=[];
   const offered=(await tx.query<{request_id:string}>(`SELECT r.request_id FROM tawsel.return_requests r WHERE r.tenant_id=$1 AND r.driver_id=$2 AND EXISTS (SELECT 1 FROM tawsel.return_items i WHERE i.tenant_id=r.tenant_id AND i.request_id=r.request_id AND i.requested>i.received+i.lost+i.damaged) ORDER BY r.requested_at,r.request_id`,[a.context.tenantId,driver])).rows;
   for(const row of offered){const request=await requestView(tx,await requestRow(tx,a,row.request_id));if(request.items.some(i=>i.eligibility==='pending'))pendingRequests.push(request);}
   requireReturn('Groups',{groups,pendingRequests});return {groups,pendingRequests};
  });
 }
 async read(principal:AuthenticatedPrincipal,id:string){uuid(id);return withAccess(this.pool,principal,async(a,tx)=>{await driverAccess(a);const r=await requestRow(tx,a,id);await lockDriver(tx,r.tenant_id,r.driver_id);return requestView(tx,r);});}
 async confirm(principal:AuthenticatedPrincipal,id:string,value:unknown){uuid(id);requireReturn('ConfirmationQuery',value);const {claims}=value as components['schemas']['ReturnConfirmationQuery'];unique(claims.map(i=>i.itemId));return withAccess(this.pool,principal,async(a,tx)=>{await driverAccess(a);const r=await requestRow(tx,a,id);await lockDriver(tx,r.tenant_id,r.driver_id);return confirmation(await requestView(tx,r),claims);});}
 async result(principal:AuthenticatedPrincipal,id:string){uuid(id);return withAccess(this.pool,principal,async(a,tx)=>{const driver=await driverAccess(a);const result=await getCommandResult(tx,a.commandScope,id);if(!result)return {actionId:id,status:'pending' as const};if(result.operationId!=='return.requestHandover'||result.summary.driverId!==driver)throw new AccessDenied(true);await authorizeResult(tx,a,result.summary);return {actionId:id,status:result.receipt.businessStatus,result};});}
}
export async function authorizeResult(tx:Transaction,a:AccessSession,summary:Record<string,unknown>){if(typeof summary.requestId==='string')await requestRow(tx,a,summary.requestId);}
