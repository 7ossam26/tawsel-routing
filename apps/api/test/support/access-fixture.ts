import type { Pool } from 'pg';
import { migrate } from '../../src/db/migrate.js';
import { randomUUID } from 'node:crypto';
import { withAccess, type AuthenticatedPrincipal, type ResourcePolicy, type ResourceScope, type ScopeAssertion } from '../../src/access/service.js';
import { executeAuthorizedCommand, type AuthorizedCommand } from '../../src/access/command.js';
import { lockInvariants } from '../../src/commands/locks.js';
import type { ActionEnvelope } from '../../src/commands/kernel.js';

const id = (n: number) => `60000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const ids = {
  tenant: id(1), otherTenant: id(2), personalTenant: id(3),
  branch: id(10), secondBranch: id(11), forbiddenBranch: id(12), otherBranch: id(13),
  staff: id(20), driverAccount: id(21), secondDriverAccount: id(22), otherAccount: id(23), personalAccount: id(24),
  role: id(30), driverRole: id(31), otherRole: id(32), emptyAdminRole: id(33),
  driver: id(40), secondDriver: id(41), otherDriver: id(42), personalDriver: id(43),
  integration: id(50), secondIntegration: id(51), otherIntegration: id(52),
  record: id(60), secondRecord: id(61), forbiddenRecord: id(62), otherRecord: id(63), personalRecord: id(64), secondBranchRecord: id(65),
  otherDriverRecord: id(66), trip: id(70)
};

// Labelled authenticated-principal fixtures. No header, token validator or real
// issuer is supplied by P06. Production adapters must establish this trust in P07/P08.
export const principals = {
  staff: { kind: 'account' as const, issuer: 'https://issuer.fixture.invalid', subject: 'staff' },
  driver: { kind: 'account' as const, issuer: 'https://issuer.fixture.invalid', subject: 'driver' },
  other: { kind: 'account' as const, issuer: 'https://issuer.fixture.invalid', subject: 'other' },
  personal: { kind: 'account' as const, issuer: 'https://issuer.fixture.invalid', subject: 'personal' },
  integration: { kind: 'integration' as const, integrationId: ids.integration }
};

export async function prepareAccessFixture(pool: Pool) {
  await migrate(pool);
  for (const [tenant, kind] of [[ids.tenant, 'company'], [ids.otherTenant, 'company'], [ids.personalTenant, 'personal']]) {
    await pool.query('INSERT INTO tawsel.tenant_keys VALUES ($1)', [tenant]);
    await pool.query('INSERT INTO tawsel.tenants (tenant_id,kind) VALUES ($1,$2)', [tenant, kind]);
  }
  for (const [tenant, branch] of [[ids.tenant, ids.branch], [ids.tenant, ids.secondBranch], [ids.tenant, ids.forbiddenBranch], [ids.otherTenant, ids.otherBranch]]) {
    await pool.query('INSERT INTO tawsel.branches (tenant_id,branch_id) VALUES ($1,$2)', [tenant, branch]);
  }
  for (const [tenant, role, name] of [[ids.tenant, ids.role, 'Dispatcher'], [ids.tenant, ids.driverRole, 'Driver'],
    [ids.tenant, ids.emptyAdminRole, 'Admin'], [ids.otherTenant, ids.otherRole, 'Dispatcher']]) {
    await pool.query('INSERT INTO tawsel.roles (tenant_id,role_id,name) VALUES ($1,$2,$3)', [tenant, role, name]);
  }
  for (const capability of ['monitor.read', 'planning.manage', 'reports.read', 'reports.export', 'assignment.manage']) {
    await pool.query('INSERT INTO tawsel.role_capabilities VALUES ($1,$2,$3,true)', [ids.tenant, ids.role, capability]);
  }
  await pool.query("INSERT INTO tawsel.role_capabilities VALUES ($1,$2,'execution.own',true),($1,$2,'correction.own',true)", [ids.tenant, ids.driverRole]);
  for (const [tenant, account, kind, role, subject] of [
    [ids.tenant, ids.staff, 'company', ids.role, 'staff'],
    [ids.tenant, ids.driverAccount, 'company', ids.driverRole, 'driver'],
    [ids.tenant, ids.secondDriverAccount, 'company', ids.driverRole, 'driver-2'],
    [ids.otherTenant, ids.otherAccount, 'company', ids.otherRole, 'other'],
    [ids.personalTenant, ids.personalAccount, 'personal', null, 'personal']
  ]) {
    await pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'account')", [tenant, account]);
    await pool.query('INSERT INTO tawsel.accounts (tenant_id,account_id,tenant_kind) VALUES ($1,$2,$3)', [tenant, account, kind]);
    await pool.query('INSERT INTO tawsel.memberships (tenant_id,account_id,tenant_kind,role_id) VALUES ($1,$2,$3,$4)', [tenant, account, kind, role]);
    await pool.query('INSERT INTO tawsel.identity_subjects (issuer,subject,tenant_id,account_id) VALUES ($1,$2,$3,$4)', [principals.staff.issuer, subject, tenant, account]);
  }
  for (const account of [ids.staff, ids.driverAccount, ids.secondDriverAccount]) {
    for (const branch of [ids.branch, ids.secondBranch]) {
      await pool.query('INSERT INTO tawsel.membership_branches VALUES ($1,$2,$3)', [ids.tenant, account, branch]);
    }
  }
  for (const [tenant, driver, account] of [[ids.tenant, ids.driver, ids.driverAccount], [ids.tenant, ids.secondDriver, ids.secondDriverAccount],
    [ids.otherTenant, ids.otherDriver, ids.otherAccount], [ids.personalTenant, ids.personalDriver, ids.personalAccount]]) {
    await pool.query('INSERT INTO tawsel.drivers (tenant_id,driver_id,account_id) VALUES ($1,$2,$3)', [tenant, driver, account]);
  }
  for (const [tenant, integration, branch] of [[ids.tenant, ids.integration, ids.branch], [ids.tenant, ids.secondIntegration, ids.branch], [ids.otherTenant, ids.otherIntegration, ids.otherBranch]]) {
    await pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'integration')", [tenant, integration]);
    await pool.query('INSERT INTO tawsel.integrations (tenant_id,integration_id) VALUES ($1,$2)', [tenant, integration]);
    await pool.query('INSERT INTO tawsel.integration_branches VALUES ($1,$2,$3)', [tenant, integration, branch]);
    for (const capability of ['monitor.read', 'assignment.manage', 'reports.export']) {
      await pool.query('INSERT INTO tawsel.integration_capabilities VALUES ($1,$2,$3)', [tenant, integration, capability]);
    }
  }
  // Synthetic resource adapter only: no shipment command/model implementation.
  await pool.query(`CREATE TABLE public.authorization_test_records (
    tenant_id uuid NOT NULL REFERENCES tawsel.tenants, resource_id uuid NOT NULL,
    branch_id uuid, driver_id uuid NOT NULL, integration_id uuid, trip_id uuid,
    contact text NOT NULL, departed boolean NOT NULL DEFAULT false, value integer NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id,resource_id),
    FOREIGN KEY (tenant_id,branch_id) REFERENCES tawsel.branches,
    FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.drivers,
    FOREIGN KEY (tenant_id,integration_id) REFERENCES tawsel.integrations)`);
  for (const [tenant, resource, branch, driver, integration, contact] of [
    [ids.tenant, ids.record, ids.branch, ids.driver, ids.integration, 'visible-source-A'],
    [ids.tenant, ids.secondRecord, ids.branch, ids.driver, ids.secondIntegration, 'hidden-source-B'],
    [ids.tenant, ids.forbiddenRecord, ids.forbiddenBranch, ids.driver, ids.integration, 'hidden-branch'],
    [ids.otherTenant, ids.otherRecord, ids.otherBranch, ids.otherDriver, ids.otherIntegration, 'hidden-tenant'],
    [ids.personalTenant, ids.personalRecord, null, ids.personalDriver, null, 'personal-only'],
    [ids.tenant, ids.secondBranchRecord, ids.secondBranch, ids.driver, ids.integration, 'visible-second-branch'],
    [ids.tenant, ids.otherDriverRecord, ids.branch, ids.secondDriver, ids.integration, 'other-driver']
  ]) {
    await pool.query(`INSERT INTO public.authorization_test_records
      (tenant_id,resource_id,branch_id,driver_id,integration_id,trip_id,contact) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenant, resource, branch, driver, integration, ids.trip, contact]);
  }
}

export interface FixtureRecord extends ResourceScope {
  resource_id: string; contact: string; departed: boolean; value: number;
}
export const monitorPolicy: ResourcePolicy = [{ capability: 'monitor.read', ownership: 'assigned-branches' }, { capability: 'execution.own', ownership: 'own-driver' }];
export const assignmentPolicy: ResourcePolicy = [{ capability: 'assignment.manage', ownership: 'assigned-branches' }];
export const ownPolicy: ResourcePolicy = [{ capability: 'execution.own', ownership: 'assigned-branches' }]; // own is intrinsic
export const exportPolicy: ResourcePolicy = [{ capability: 'reports.export', ownership: 'assigned-branches' }];

export async function readFixture(pool: Pool, principal: AuthenticatedPrincipal, policy = monitorPolicy, requested: ScopeAssertion = {}) {
  return withAccess(pool, principal, async (access, tx) => {
    access.assertScope(requested);
    const predicate = access.sqlPredicate(policy, 'r');
    return (await tx.query<FixtureRecord>(`SELECT r.* FROM public.authorization_test_records r WHERE ${predicate.text} ORDER BY resource_id`, predicate.values)).rows;
  });
}
export function accessCommand(resourceId = ids.record): ActionEnvelope {
  return {
    schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId: 'test.authorizedIncrement',
    context: { kind: 'integration', tenantId: ids.tenant, integrationId: ids.integration },
    resources: {}, baseVersions: {}, dependsOnActionIds: [], observation: { observedAt: null, clock: { quality: 'unknown' } },
    payload: { resourceId }
  };
}
export function fixtureOperation(policy: ResourcePolicy = assignmentPolicy): AuthorizedCommand<FixtureRecord> {
  return {
    operationId: 'test.authorizedIncrement', policy,
    validatePayload(command) {
      if (Object.keys(command.payload).join() !== 'resourceId' || typeof command.payload.resourceId !== 'string') throw new Error('Invalid fixture payload');
    },
    async loadAndLockResource(tx, access, command) {
      await lockInvariants(tx, access.commandScope.tenantId, [{ kind: 'task', id: command.payload.resourceId as string }]);
      const predicate = access.sqlPredicate(policy, 'r', 2);
      return (await tx.query<FixtureRecord>(`SELECT r.* FROM public.authorization_test_records r WHERE resource_id=$1 AND ${predicate.text} FOR UPDATE`, [command.payload.resourceId, ...predicate.values])).rows[0] ?? null;
    },
    eligible: row => !row.departed,
    hooks: {
      async writeDomain(tx, command, scope) {
        const result = await tx.query<FixtureRecord>('UPDATE public.authorization_test_records SET value=value+1 WHERE tenant_id=$1 AND resource_id=$2 RETURNING *', [scope.tenantId, command.payload.resourceId]);
        const row = result.rows[0]!;
        return { status: 'accepted', response: { status: 200, body: { value: row.value, contact: row.contact } },
          summary: { value: row.value }, audit: { resourceId: row.resource_id }, resourceVersions: {}, intents: [] };
      },
      async writeProgress() { /* No feature progress model in this synthetic fixture. */ }
    }
  };
}
export const runFixtureCommand = (pool: Pool, principal: AuthenticatedPrincipal, command = accessCommand(), policy = assignmentPolicy) =>
  executeAuthorizedCommand(pool, principal, command, fixtureOperation(policy));
