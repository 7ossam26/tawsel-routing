import type {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {AccessSession,AccessDenied} from '../access/service.js';
import {withTransaction,type Transaction} from '../db/transaction.js';
import {authenticateService,identityView,type ServiceBinding} from '../provisioning/credentials.js';
import {executeCommandInTransaction,getCommandResult,type ActionEnvelope,type CommandHooks} from '../commands/kernel.js';
import {canonicalJson} from '../commands/json.js';
import {enqueuePlanning} from '../planning/queue.js';
import {lockDriver,requestRow,requestView,receiver,type RequestRow} from './state.js';
import {uuid,requireReturn,unique,ReturnError,type Receive,type Dispose,type Transition} from './models.js';
import {rejection,authorizeResult} from './service.js';

export class ReturnReceiver {
 constructor(readonly pool:Pool,readonly observe?:Pick<CommandHooks,'afterWrite'>){}
 async command(authorization:string|undefined,operation:'return.confirmSubsetReceipt'|'return.recordDisposition',value:unknown){
  requireReturn(operation==='return.confirmSubsetReceipt'?'ReceiveCommand':'DisposeCommand',value);
  const c=JSON.parse(canonicalJson(value)) as ActionEnvelope,p=c.payload as Receive|Dispose;
  unique(p.items.map(i=>i.itemId));
  const capability=operation==='return.confirmSubsetReceipt'?'return.receive':'return.dispose';
  return this.access(authorization,capability,async(tx,b,a)=>{
   if(c.context.kind!=='integration')throw new AccessDenied();a.assertScope(c.context);
   let row:RequestRow;
   const authorize=async()=>{row=await requestRow(tx,a,p.requestId);a.requireResource([{capability,ownership:'assigned-branches'}],row);};
   return executeCommandInTransaction(tx,a.commandScope,c,{authorize,async writeDomain(){try{
    await lockDriver(tx,b.tenantId,row.driver_id,row.round_id);await authorize();
    if(p.receivingBranchId!==row.branch_id)throw new ReturnError('wrong_source_branch',409,'الاستلام في فرع الإرسال الأصلي فقط، حتى مع صلاحية عدة فروع.');
    const view=await requestView(tx,row),transitions:Transition[]=[];
    const kind=operation==='return.confirmSubsetReceipt'?'received':(p as Dispose).disposition;
    for(const piece of p.items){
     const item=view.items.find(i=>i.itemId===piece.itemId);if(!item)throw new ReturnError('forbidden_resource',404,'البند غير متاح في هذا الطلب.');
     if(item.revision!==piece.expectedRevision)throw new ReturnError('stale_revision',409,'تغيّرت القطع المؤكدة؛ حدّث البند قبل تأكيد قطع أخرى.');
     if(item.eligibility!=='pending')throw new ReturnError('lifecycle_forbidden',409,'تغيّرت المحاولة أو انتهى البند؛ لا يمكن تأكيد هذا العرض.');
     if(piece.quantity>item.unresolved||piece.quantity>item.custody.held)throw new ReturnError('quantity_exceeded',409,'الكمية أكبر من المعروض والمحتفظ به.');
     const now=(await tx.query<{now:Date}>('SELECT clock_timestamp() AS now')).rows[0]!.now;
     const transition:Transition={transitionId:randomUUID(),requestId:row.request_id,itemId:item.itemId,taskId:item.taskId,dispatchCycleId:item.dispatchCycleId,outcomeId:item.outcomeId,sourceLineId:item.sourceLineId,sourceReference:{tenantId:b.tenantId,integrationId:b.integrationId,externalId:item.externalId},sourceDispatchCycleId:item.sourceDispatchCycleId,sourceBranchId:row.branch_id,kind,quantity:piece.quantity,revision:item.revision+1,time:{actionId:c.actionId,recordedAt:now.toISOString(),observation:c.observation},identity:identityView(b)};
     requireReturn('Transition',transition);
     await tx.query(`INSERT INTO tawsel.return_balances (tenant_id,dispatch_cycle_id,source_line_id,outcome_id,return_required) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[b.tenantId,item.dispatchCycleId,item.sourceLineId,item.outcomeId,item.custody.sourceQuantity-item.custody.delivered]);
     const updated=await tx.query(`UPDATE tawsel.return_balances SET ${kind}=${kind}+$5 WHERE tenant_id=$1 AND dispatch_cycle_id=$2 AND source_line_id=$3 AND outcome_id=$4 RETURNING *`,[b.tenantId,item.dispatchCycleId,item.sourceLineId,item.outcomeId,piece.quantity]);
     if(updated.rowCount!==1)throw new ReturnError('stale_revision',409,'تغيّر سجل الكمية التابعة للاستلام.');
     await tx.query(`UPDATE tawsel.return_items SET ${kind}=${kind}+$3,revision=revision+1 WHERE tenant_id=$1 AND item_id=$2`,[b.tenantId,item.itemId,piece.quantity]);
     await tx.query('INSERT INTO tawsel.retry_dependencies (tenant_id,dispatch_cycle_id,dependency_id,reason) VALUES ($1,$2,$3,$4)',[b.tenantId,item.dispatchCycleId,transition.transitionId,kind==='received'?'branch-received':kind]);
     await tx.query('INSERT INTO tawsel.return_transitions (tenant_id,transition_id,item_id,dispatch_cycle_id,outcome_id,source_line_id,kind,quantity,revision,source_id,action_id,record) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[b.tenantId,transition.transitionId,item.itemId,item.dispatchCycleId,item.outcomeId,item.sourceLineId,kind,piece.quantity,transition.revision,b.integrationId,c.actionId,transition]);
     transitions.push(transition);
    }
    const request=await requestView(tx,row),body={request,transitions};requireReturn('CommandResult',body);
    const intents=transitions.map(transition=>{const payload={transition};requireReturn(kind==='received'?'ReceivedEvent':'DispositionEvent',payload);return {eventId:randomUUID(),recipientId:b.integrationId,eventType:kind==='received'?'return.subsetReceived':'return.dispositionRecorded',payloadVersion:'1.0.0',payload};});
    return {status:'accepted',response:{status:200,body},summary:{requestId:row.request_id,driverId:row.driver_id,transitionIds:transitions.map(t=>t.transitionId)},audit:{service:identityView(b),credentialId:b.credentialId,transitions},resourceVersions:{},intents};
   }catch(error){if(error instanceof ReturnError)return rejection(c,error,{requestId:p.requestId,driverId:row.driver_id,service:identityView(b)});throw error;}},async writeProgress(){
    // Keep historical delivery outcome/collection intact; current custody derives
    // from the same committed balances. Invalidate every stale planning snapshot.
    await tx.query('UPDATE tawsel.planning_states SET execution_revision=execution_revision+1 WHERE tenant_id=$1 AND driver_id=$2',[b.tenantId,row.driver_id]);
    await enqueuePlanning(tx,b.tenantId,row.driver_id,b.integrationId,c.actionId);
   },...this.observe});
  });
 }
 async result(authorization:string|undefined,id:string){uuid(id);return this.access(authorization,'read',async(tx,_b,a)=>{const result=await getCommandResult(tx,a.commandScope,id);if(!result)return {actionId:id,status:'pending' as const};if(!['return.confirmSubsetReceipt','return.recordDisposition'].includes(result.operationId))throw new AccessDenied(true);await authorizeResult(tx,a,result.summary);return {actionId:id,status:result.receipt.businessStatus,result};});}
 async access<T>(authorization:string|undefined,capability:'return.receive'|'return.dispose'|'read',work:(tx:Transaction,b:ServiceBinding,a:AccessSession)=>Promise<T>){
  return withTransaction(this.pool,async tx=>{
   let b:ServiceBinding;
   try{b=await authenticateService(tx,authorization,false,capability==='read'?'return.receive':capability);}
   catch(error){if(capability!=='read'||(error as {code?:string}).code!=='forbidden_resource')throw error;b=await authenticateService(tx,authorization,false,'return.dispose');}
   return AccessSession.inTransaction(tx,{kind:'integration',integrationId:b.integrationId},a=>work(tx,b,a));
  });
 }
 async read(authorization:string|undefined,id:string){uuid(id);return this.access(authorization,'read',async(tx,_b,a)=>{const r=await requestRow(tx,a,id);await lockDriver(tx,r.tenant_id,r.driver_id);return requestView(tx,r);});}
 async list(authorization:string|undefined,driverId:string,branchId:string,cursor?:string){
  uuid(driverId);uuid(branchId);if(cursor)uuid(cursor);
  return this.access(authorization,'read',async(tx,b,a)=>{
   a.requireResource(receiver,{tenant_id:b.tenantId,driver_id:driverId,branch_id:branchId,integration_id:b.integrationId});await lockDriver(tx,b.tenantId,driverId);
   const scope=a.sqlPredicate(receiver,'r'),n=scope.values.length;
   const rows=(await tx.query<RequestRow>(`SELECT r.* FROM tawsel.return_requests r WHERE ${scope.text} AND r.driver_id=$${n+1} AND r.branch_id=$${n+2} AND ($${n+3}::uuid IS NULL OR r.request_id>$${n+3})
    AND EXISTS(SELECT 1 FROM tawsel.return_items i JOIN tawsel.delivery_outcomes o USING(tenant_id,outcome_id) JOIN tawsel.planning_attempts p USING(tenant_id,attempt_id) WHERE i.tenant_id=r.tenant_id AND i.request_id=r.request_id AND i.requested>i.received+i.lost+i.damaged AND p.latest)
    ORDER BY r.request_id LIMIT 101`,[...scope.values,driverId,branchId,cursor??null])).rows;
   const items=[];for(const row of rows.slice(0,100))items.push(await requestView(tx,row));
   const result={items,nextCursor:rows.length>100?rows[99]!.request_id:null};requireReturn('RequestList',result);return result;
  });
 }
}
