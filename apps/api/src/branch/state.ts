import type {Transaction} from '../db/transaction.js';
import type {BranchActivity} from './models.js';
export async function branchActivity(tx:Transaction,tenant:string,driver:string):Promise<BranchActivity|null>{
 // Retained pre-P22 migration fixtures and rolling-upgrade reads have no branch
 // activity table. New branch commands still require the migrated schema.
 if(!(await tx.query("SELECT to_regclass('tawsel.branch_activities') AS relation")).rows[0].relation)return null;
 return (await tx.query<{record:BranchActivity}>('SELECT record FROM tawsel.branch_activities WHERE tenant_id=$1 AND driver_id=$2 AND active',[tenant,driver])).rows[0]?.record??null;
}
