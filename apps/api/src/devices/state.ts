import {randomUUID} from 'node:crypto';
import {AccessDenied,type AccessSession} from '../access/service.js';
import type {ActionEnvelope,Decision} from '../commands/kernel.js';
import type {Transaction} from '../db/transaction.js';
import {own,ownDriver} from '../current/state.js';
import {authorizeDriver} from '../planning/service.js';
import type {RoundRow} from '../rounds/models.js';
import {DeviceError,requireDevice} from './models.js';

export async function ownRound(tx:Transaction,a:AccessSession,roundId:string){
 const driver=ownDriver(a);await authorizeDriver(tx,a,driver);
 const r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND round_id=$3',[a.context.tenantId,driver,roundId])).rows[0];
 if(!r||r.owner_account_id!==a.context.sourceId)throw new AccessDenied(true);
 // Include retained admissions: a later move must not expose historical branch data.
 const rows=(await tx.query(`SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2
 UNION SELECT r.tenant_id,r.driver_id,t.branch_id,t.integration_id FROM tawsel.round_admissions r JOIN tawsel.b2b_tasks t USING(tenant_id,task_id) WHERE r.tenant_id=$1 AND r.round_id=$3`,[r.tenant_id,driver,roundId])).rows;
 for(const row of rows)a.requireResource(own,row);
 return r;
}
export function deviceRejection(c:ActionEnvelope,r:RoundRow,error:DeviceError):Decision{
 const problem={type:`https://schemas.tawsel.invalid/problems/${error.code.replaceAll('_','-')}`,title:'Device execution unavailable',code:error.code,status:error.statusCode,detail:error.message,actionId:c.actionId,correlationId:randomUUID(),retryable:false};
 const status=error.code==='stale_device'?'review-required':'rejected';
 const payload={actionId:c.actionId,roundId:r.round_id,driverId:r.driver_id,businessStatus:status,code:error.code};requireDevice('EvidenceEvent',payload);
 return {status,retentionHold:true,problem,response:{status:error.statusCode,body:problem},summary:{driverId:r.driver_id,roundId:r.round_id,workdayId:r.workday_id,taskId:c.payload.taskId??null,code:error.code},audit:{roundId:r.round_id,code:error.code},
  evidenceIntents:[{eventId:randomUUID(),recipientId:c.context.kind==='device'?c.context.accountId:r.owner_account_id,recipientKind:'account',eventType:'evidence.received',payloadVersion:'1.0.0',payload}]};
}
