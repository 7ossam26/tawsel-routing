import { randomUUID } from 'node:crypto';
import type { components } from '@tawsel/api-client';
import { payloadHash } from '../commands/json.js';
import type { Transaction } from '../db/transaction.js';
import type { ActionEnvelope, Decision } from '../commands/kernel.js';
import type { ServiceBinding } from './credentials.js';
import { record, saveRecord, sourceKey, accepted, rejection } from './service.js';

type Schemas = components['schemas'];
type Payload = (Schemas['Branch'] | Schemas['Role'] | Schemas['User'] | Schemas['Driver']) & Record<string, unknown>;
class MissingReference extends Error {}
async function reference(tx: Transaction, b: ServiceBinding, entity: string, externalId: string) {
  const found = await record(tx, b, entity, externalId);
  if (!found) throw new MissingReference();
  return found;
}
async function branches(tx: Transaction, b: ServiceBinding, accountId: string, refs: string[]) {
  const ids: string[] = [];
  for (const ref of refs) ids.push((await reference(tx, b, 'branch', ref)).resource_id);
  await tx.query('DELETE FROM tawsel.membership_branches WHERE tenant_id=$1 AND account_id=$2', [b.tenantId, accountId]);
  for (const id of ids) await tx.query('INSERT INTO tawsel.membership_branches VALUES ($1,$2,$3)', [b.tenantId, accountId, id]);
}
async function reconcile(tx: Transaction, b: ServiceBinding, accountId: string, subject: string, enabled: boolean) {
  const grant = await tx.query(`SELECT issuer FROM tawsel.provisioning_subject_grants
    WHERE tenant_id=$1 AND integration_id=$2 AND subject=$3`, [...sourceKey(b), subject]);
  if (!grant.rows[0]) return false;
  const issuer = grant.rows[0].issuer as string;
  const used = await tx.query('SELECT account_id FROM tawsel.identity_subjects WHERE issuer=$1 AND subject=$2', [issuer, subject]);
  if (used.rows[0] && used.rows[0].account_id !== accountId) return false;
  // Disable locally at intent commit; only reconciled enabled subjects can login.
  await tx.query(`INSERT INTO tawsel.identity_subjects (issuer,subject,tenant_id,account_id,enabled)
    VALUES ($1,$2,$3,$4,false) ON CONFLICT (issuer,subject) DO UPDATE SET enabled=false`, [issuer, subject, b.tenantId, accountId]);
  await tx.query(`INSERT INTO tawsel.issuer_reconciliation
    (tenant_id,integration_id,account_id,issuer,subject,desired_enabled,status)
    VALUES ($1,$2,$3,$4,$5,$6,'pending') ON CONFLICT (tenant_id,account_id) DO UPDATE SET
    desired_enabled=$6,generation=tawsel.issuer_reconciliation.generation+1,status='pending',
    attempts=0,next_attempt_at=now(),last_error=null`, [...sourceKey(b), accountId, issuer, subject, enabled]);
  // Preserve an outstanding lease across newer intents. Its completion is fenced
  // by generation, and the worker must reconcile the newer intent afterward.
  return true;
}
export async function writeProjection(tx: Transaction, b: ServiceBinding, command: ActionEnvelope): Promise<Decision> {
  const entity = command.operationId.startsWith('role.') ? 'role' : command.operationId.split('.')[0]!;
  const p = command.payload as Payload;
  const old = await record(tx, b, entity, p.externalId);
  const digest = payloadHash({ operationId: command.operationId, payload: p });
  if (old && p.sourceRevision <= Number(old.source_revision)) {
    if (p.sourceRevision < Number(old.source_revision)) return rejection('stale_revision', command.actionId);
    return old.payload_hash === digest
      ? accepted(b, command, entity, p.externalId, old.resource_id, p.sourceRevision, old.state.acceptanceIssuerStatus as string ?? 'not-required', false)
      : rejection('idempotency_conflict', command.actionId);
  }
  const id = old?.resource_id ?? randomUUID();
  let state = { ...old?.state };
  try {
    switch (command.operationId) {
      case 'branch.provision': {
        const v = p as Schemas['Branch']; state = { name: v.name, location: v.location, enabled: v.enabled };
        await tx.query(`INSERT INTO tawsel.branches (tenant_id,branch_id,enabled) VALUES ($1,$2,$3)
          ON CONFLICT (tenant_id,branch_id) DO UPDATE SET enabled=$3`, [b.tenantId, id, v.enabled]);
        await tx.query('INSERT INTO tawsel.integration_branches VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [...sourceKey(b), id]);
        break;
      }
      case 'branch.disable':
        if (!old) throw new MissingReference();
        state.enabled = false;
        await tx.query('UPDATE tawsel.branches SET enabled=false WHERE tenant_id=$1 AND branch_id=$2', [b.tenantId, id]);
        break;
      case 'role.defineCapabilities': {
        const v = p as Schemas['Role']; state = { name: v.name, capabilities: v.capabilities };
        await tx.query(`INSERT INTO tawsel.roles (tenant_id,role_id,name) VALUES ($1,$2,$3)
          ON CONFLICT (tenant_id,role_id) DO UPDATE SET name=$3`, [b.tenantId, id, v.name]);
        await tx.query('DELETE FROM tawsel.role_capabilities WHERE tenant_id=$1 AND role_id=$2', [b.tenantId, id]);
        for (const cap of v.capabilities) await tx.query('INSERT INTO tawsel.role_capabilities VALUES ($1,$2,$3,true)', [b.tenantId, id, cap]);
        break;
      }
      case 'user.provision': {
        const v = p as Schemas['User'];
        if (old && old.state.subject !== v.subject) return rejection('forbidden_resource', command.actionId);
        const role = await reference(tx, b, 'role', v.roleExternalId);
        if (!old) {
          await tx.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'account')", [b.tenantId, id]);
          await tx.query("INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,'company')", [b.tenantId, id]);
        }
        await tx.query(`INSERT INTO tawsel.memberships (tenant_id,account_id,tenant_kind,role_id,enabled)
          VALUES ($1,$2,'company',$3,$4) ON CONFLICT (tenant_id,account_id) DO UPDATE SET role_id=$3,enabled=$4`, [b.tenantId, id, role.resource_id, v.enabled]);
        await branches(tx, b, id, v.branchExternalIds);
        if (!await reconcile(tx, b, id, v.subject, v.enabled)) return rejection('forbidden_resource', command.actionId);
        state = { ...state, subject: v.subject, enabled: v.enabled, roleExternalId: v.roleExternalId, branchExternalIds: v.branchExternalIds };
        break;
      }
      case 'user.setRole': {
        if (!old) throw new MissingReference();
        const v = p as unknown as Schemas['UserRole'], role = await reference(tx, b, 'role', v.roleExternalId);
        state.roleExternalId = v.roleExternalId;
        await tx.query('UPDATE tawsel.memberships SET role_id=$3 WHERE tenant_id=$1 AND account_id=$2', [b.tenantId, id, role.resource_id]);
        break;
      }
      case 'user.setCapabilityExceptions': {
        if (!old) throw new MissingReference();
        const v = p as unknown as Schemas['UserExceptions'];
        if (new Set(v.exceptions.map(e => e.capability)).size !== v.exceptions.length) return rejection('idempotency_conflict', command.actionId);
        state.exceptions = v.exceptions;
        await tx.query('DELETE FROM tawsel.user_capability_exceptions WHERE tenant_id=$1 AND account_id=$2', [b.tenantId, id]);
        for (const e of v.exceptions) await tx.query('INSERT INTO tawsel.user_capability_exceptions VALUES ($1,$2,$3,$4)', [b.tenantId, id, e.capability, e.effect]);
        break;
      }
      case 'user.setBranchMemberships': {
        if (!old) throw new MissingReference();
        const v = p as unknown as Schemas['UserBranches']; state.branchExternalIds = v.branchExternalIds;
        await branches(tx, b, id, v.branchExternalIds); break;
      }
      case 'user.disable':
        if (!old) throw new MissingReference();
        state.enabled = false;
        await tx.query('UPDATE tawsel.memberships SET enabled=false WHERE tenant_id=$1 AND account_id=$2', [b.tenantId, id]);
        if (!await reconcile(tx, b, id, state.subject as string, false)) return rejection('forbidden_resource', command.actionId);
        break;
      case 'driver.provisionReference': {
        const v = p as Schemas['Driver'], user = await reference(tx, b, 'user', v.userExternalId);
        if (old && old.state.userExternalId !== v.userExternalId) return rejection('forbidden_resource', command.actionId);
        const other = await tx.query('SELECT driver_id FROM tawsel.drivers WHERE tenant_id=$1 AND account_id=$2', [b.tenantId, user.resource_id]);
        if (other.rows[0] && other.rows[0].driver_id !== id) return rejection('idempotency_conflict', command.actionId);
        await tx.query(`INSERT INTO tawsel.drivers (tenant_id,driver_id,account_id,enabled) VALUES ($1,$2,$3,$4)
          ON CONFLICT (tenant_id,driver_id) DO UPDATE SET enabled=$4`, [b.tenantId, id, user.resource_id, v.enabled]);
        state = { userExternalId: v.userExternalId, enabled: v.enabled, profile: v.profile, vehicleReference: v.vehicleReference }; break;
      }
      default: throw new Error('Unknown projection operation');
    }
  } catch (error) { if (error instanceof MissingReference) return rejection('dependency_missing', command.actionId); throw error; }
  const issuerStatus = entity === 'user' ? (await tx.query('SELECT status FROM tawsel.issuer_reconciliation WHERE tenant_id=$1 AND account_id=$2', [b.tenantId, id])).rows[0]?.status as string ?? 'pending' : 'not-required';
  state.acceptanceIssuerStatus = issuerStatus;
  await saveRecord(tx, b, entity, p, id, state, command.actionId, digest);
  return accepted(b, command, entity, p.externalId, id, p.sourceRevision, issuerStatus, true);
}
