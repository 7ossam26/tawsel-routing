import {AccessDenied,type AccessSession} from '../access/service.js';
import type {Transaction} from '../db/transaction.js';
import {own,ownDriver} from '../current/state.js';
import {authorizeDriver} from '../planning/service.js';
import type {RoundRow} from '../rounds/models.js';
export interface DayRow {tenant_id:string;driver_id:string;workday_id:string;opened_at:Date;ended_at:Date|null}
export async function day(tx:Transaction,a:AccessSession,id:string){
 const row=(await tx.query<DayRow>('SELECT * FROM tawsel.workdays WHERE tenant_id=$1 AND driver_id=$2 AND workday_id=$3',[a.context.tenantId,ownDriver(a),id])).rows[0];
 if(!row)throw new AccessDenied(true);return row;
}
export async function round(tx:Transaction,a:AccessSession,id:string,workdayId:string){
 const row=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND round_id=$3 AND workday_id=$4',[a.context.tenantId,ownDriver(a),id,workdayId])).rows[0];
 if(!row)throw new AccessDenied(true);return row;
}
export async function authorize(tx:Transaction,a:AccessSession,workdayId:string){
 const driver=ownDriver(a);await authorizeDriver(tx,a,driver);await day(tx,a,workdayId);
 // Both retained history and currently held work must remain visible on replay.
 const resources=(await tx.query(`SELECT tenant_id,driver_id,branch_id,integration_id FROM tawsel.location_tasks WHERE tenant_id=$1 AND driver_id=$2
 UNION SELECT d.tenant_id,d.driver_id,t.branch_id,t.integration_id FROM tawsel.round_admissions d JOIN tawsel.rounds r USING(tenant_id,round_id)
 JOIN tawsel.b2b_tasks t ON t.tenant_id=d.tenant_id AND t.task_id=d.task_id WHERE d.tenant_id=$1 AND d.driver_id=$2 AND r.workday_id=$3`,[a.context.tenantId,driver,workdayId])).rows;
 for(const resource of resources)a.requireResource(own,resource);
}
export async function sourceItems(tx:Transaction,tenant:string,driver:string,workdayId:string){
 return (await tx.query<{task_id:string;dispatch_cycle_id:string;integration_id:string;external_id:string;source_dispatch_cycle_id:string}>(`SELECT t.task_id,c.dispatch_cycle_id,t.integration_id,t.external_id,c.source_dispatch_cycle_id
 FROM tawsel.b2b_tasks t JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,task_id)
 WHERE t.tenant_id=$1 AND ((c.driver_id=$2 AND c.state='held') OR EXISTS
 (SELECT 1 FROM tawsel.round_admissions d JOIN tawsel.rounds r USING(tenant_id,round_id) WHERE d.tenant_id=t.tenant_id AND d.dispatch_cycle_id=c.dispatch_cycle_id AND r.workday_id=$3 AND d.driver_id=$2))
 ORDER BY t.integration_id,t.task_id,c.dispatch_cycle_id`,[tenant,driver,workdayId])).rows;
}
