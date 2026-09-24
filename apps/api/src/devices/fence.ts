import type {ActionEnvelope,Decision} from '../commands/kernel.js';
import type {Transaction} from '../db/transaction.js';
import type {RoundRow} from '../rounds/models.js';
import {DeviceError} from './models.js';
import {deviceRejection} from './state.js';

/** Caller holds the driver invariant lock and has reloaded/authorized the round.
 * No client timestamp, route order or session refresh can restore an old owner. */
export async function executionFence(tx:Transaction,c:ActionEnvelope,r:RoundRow):Promise<Decision|null>{
 const d=c.context;
 if(d.kind!=='device'||r.owner_account_id!==d.accountId||r.owner_device_id!==d.deviceId||Number(r.device_generation)!==d.deviceGeneration)
  return deviceRejection(c,r,new DeviceError('stale_device',409,'التنفيذ على هاتف آخر. حُفظ الإجراء للمراجعة ولم يُطبّق.'));
 const transfer=(await tx.query<{snapshot_token:string}>('SELECT snapshot_token FROM tawsel.device_takeovers WHERE tenant_id=$1 AND round_id=$2 AND generation=$3',[r.tenant_id,r.round_id,r.device_generation])).rows[0];
 if(transfer&&d.snapshotToken!==transfer.snapshot_token)return deviceRejection(c,r,new DeviceError('sync_required',409,'حمّل آخر حالة مؤكدة على هذا الهاتف قبل التنفيذ.'));
 return null;
}
/** Planning/pin commands without a round payload must also obey the active
 * owner's fence. Before start their existing preparation authority still applies. */
export async function activeExecutionFence(tx:Transaction,c:ActionEnvelope,driverId:string):Promise<Decision|null>{
 const r=(await tx.query<RoundRow>('SELECT * FROM tawsel.rounds WHERE tenant_id=$1 AND driver_id=$2 AND ended_at IS NULL',[c.context.tenantId,driverId])).rows[0];
 return r?executionFence(tx,c,r):null;
}
