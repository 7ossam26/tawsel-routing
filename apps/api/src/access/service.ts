import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { withTransaction, type Transaction } from '../db/transaction.js';
import type { CommandScope } from '../commands/kernel.js';

export type Capability = components['schemas']['Capability'];
/** Input from a VERIFIED server adapter only. P06 has no HTTP/header adapter.
 * Jobs retain this identity from trusted persisted metadata, never payload scope.
 * P08 authenticates explicit provisioning service operations; human actor
 * assertions remain unavailable and must never be inferred from body IDs. */
export type AuthenticatedPrincipal =
  | { readonly kind: 'account'; readonly issuer: string; readonly subject: string }
  | { readonly kind: 'integration'; readonly integrationId: string };

export interface ResourceScope {
  tenant_id: string;
  branch_id: string | null;
  driver_id: string | null;
  integration_id: string | null;
}
/** Server-selected alternatives. Never accept policies/capabilities from a request.
 * Every alternative still requires tenant + branch + integration predicates. */
export type ResourcePolicy = readonly {
  capability: Capability;
  ownership: 'assigned-branches' | 'own-driver';
}[];
export interface ScopeAssertion {
  tenantId?: string;
  accountId?: string;
  branchId?: string;
  driverId?: string;
  integrationId?: string;
  assertedActorId?: string;
}

export class AccessDenied extends Error {
  readonly code = 'forbidden_resource';
  readonly statusCode: 403 | 404;
  constructor(hidden = false) {
    super(hidden ? 'Resource unavailable' : 'Access unavailable for this operation or scope');
    this.statusCode = hidden ? 404 : 403;
  }
}
export class LifecycleDenied extends Error {
  readonly code = 'lifecycle_forbidden';
  readonly statusCode = 409;
  constructor() { super('Operation unavailable in the current state'); }
}

const personalCapabilities: readonly Capability[] = ['execution.own', 'correction.own', 'reports.read', 'reports.export'];
const owns = (capability: Capability) => capability === 'execution.own' || capability === 'correction.own';

interface Binding {
  tenantId: string; kind: 'company' | 'personal'; sourceId: string; actorId?: string;
  integrationId: string | null; driverId: string | null;
  branches: string[]; capabilities: Capability[];
}

/** Transaction-lifetime object. Cannot be constructed by callers or reused after
 * commit. No permission cache, branch-specific grants or role-label shortcuts. */
export class AccessSession {
  #active = true;
  #binding: Binding;
  private constructor(binding: Binding) { this.#binding = binding; }
  private alive() { if (!this.#active) throw new Error('Access session has ended'); }
  get commandScope(): Readonly<CommandScope> {
    this.alive();
    return Object.freeze({ tenantId: this.#binding.tenantId, sourceId: this.#binding.sourceId,
      ...(this.#binding.actorId ? { actorId: this.#binding.actorId } : {}) });
  }
  get effectiveCapabilities(): readonly Capability[] { this.alive(); return Object.freeze([...this.#binding.capabilities]); }
  get branchIds(): readonly string[] { this.alive(); return Object.freeze([...this.#binding.branches]); }
  get context(): components['schemas']['AccessContext'] {
    this.alive();
    const b = this.#binding;
    // Detached display snapshot, never accepted back as authorization.
    return { tenantId: b.tenantId, tenantKind: b.kind, principalKind: b.integrationId === null ? 'account' : 'integration',
      sourceId: b.sourceId, branchIds: [...b.branches], driverId: b.driverId, effectiveCapabilities: [...b.capabilities] };
  }

  assertScope(requested: ScopeAssertion): void {
    this.alive();
    const b = this.#binding;
    // These are assertions, not selectors that can alter the binding. Human
    // delegation is unavailable; P08 provisioning uses explicit service authority.
    if ((requested.tenantId !== undefined && requested.tenantId !== b.tenantId)
      || (requested.accountId !== undefined && requested.accountId !== b.actorId)
      || (requested.branchId !== undefined && !b.branches.includes(requested.branchId))
      || (requested.driverId !== undefined && requested.driverId !== b.driverId)
      || (requested.integrationId !== undefined && requested.integrationId !== b.integrationId)
      || (requested.assertedActorId !== undefined && requested.assertedActorId !== b.actorId)) throw new AccessDenied();
  }

  private alternatives(policy: ResourcePolicy) {
    this.alive();
    return policy.filter(p => this.#binding.capabilities.includes(p.capability));
  }
  requireCapability(policy: ResourcePolicy): void {
    if (!this.alternatives(policy).length) throw new AccessDenied();
  }
  private ownOnly(alternative: ResourcePolicy[number]): boolean {
    return this.#binding.kind === 'personal' || owns(alternative.capability) || alternative.ownership === 'own-driver';
  }
  canRead(policy: ResourcePolicy, row: ResourceScope): boolean {
    const alternatives = this.alternatives(policy);
    const b = this.#binding;
    return row.tenant_id === b.tenantId
      && (b.kind === 'personal' ? row.branch_id === null && row.integration_id === null : row.branch_id !== null && b.branches.includes(row.branch_id))
      && (b.integrationId === null || row.integration_id === b.integrationId)
      && alternatives.some(p => !this.ownOnly(p) || (b.driverId !== null && row.driver_id === b.driverId));
  }
  requireResource<T extends ResourceScope>(policy: ResourcePolicy, row: T | null | undefined): T {
    this.requireCapability(policy);
    if (!row || !this.canRead(policy, row)) throw new AccessDenied(true);
    return row;
  }
  requireOperation<T extends ResourceScope>(policy: ResourcePolicy, row: T | null | undefined, eligible: (visible: T) => boolean): T {
    const visible = this.requireResource(policy, row);
    // Do not evaluate/describe hidden state. Capability never bypasses lifecycle.
    if (eligible(visible) !== true) throw new LifecycleDenied();
    return visible;
  }

  /** Parameterized SQL for a relation exposing ResourceScope columns. Apply in
   * WHERE before JOIN projections, counts, current/next, pagination or export.
   * offset is the first available placeholder; alias is server code only. */
  sqlPredicate(policy: ResourcePolicy, alias: string, offset = 1): { text: string; values: unknown[] } {
    this.requireCapability(policy);
    if (!/^[a-z][a-z0-9_]*$/.test(alias) || !Number.isSafeInteger(offset) || offset < 1) throw new Error('Invalid scope SQL configuration');
    const values: unknown[] = [];
    const param = (value: unknown) => { values.push(value); return `$${offset + values.length - 1}`; };
    const b = this.#binding;
    const parts = [`${alias}.tenant_id = ${param(b.tenantId)}::uuid`];
    parts.push(b.kind === 'personal' ? `${alias}.branch_id IS NULL AND ${alias}.integration_id IS NULL`
      : `${alias}.branch_id = ANY(${param(b.branches)}::uuid[])`);
    if (b.integrationId !== null) parts.push(`${alias}.integration_id = ${param(b.integrationId)}::uuid`);
    if (this.alternatives(policy).every(p => this.ownOnly(p))) {
      parts.push(b.driverId === null ? 'FALSE' : `${alias}.driver_id = ${param(b.driverId)}::uuid`);
    }
    return { text: `(${parts.join(' AND ')})`, values };
  }

  static async run<T>(pool: Pool, principal: AuthenticatedPrincipal, work: (access: AccessSession, tx: Transaction) => Promise<T>): Promise<T> {
    // Snapshot authenticated identity before awaiting. Never spread payload fields.
    const identity = Object.freeze({ ...principal });
    return withTransaction(pool, async tx => {
      const binding = await resolveBinding(tx, identity);
      const session = new AccessSession(binding);
      try { return await work(session, tx); }
      finally { session.#active = false; }
    });
  }
}

export const withAccess = AccessSession.run;

async function resolveBinding(tx: Transaction, principal: AuthenticatedPrincipal): Promise<Binding> {
  // Initial lookup only locates the tenant lock. Re-read binding after the lock:
  // a concurrent disable may have completed between these statements.
  const located = principal.kind === 'account'
    ? await tx.query('SELECT tenant_id FROM tawsel.identity_subjects WHERE issuer=$1 AND subject=$2', [principal.issuer, principal.subject])
    : await tx.query('SELECT tenant_id FROM tawsel.integrations WHERE integration_id=$1', [principal.integrationId]);
  const tenantId = located.rows[0]?.tenant_id as string | undefined;
  if (!tenantId) throw new AccessDenied();
  const tenant = await tx.query<{ kind: Binding['kind']; enabled: boolean }>('SELECT kind,enabled FROM tawsel.tenants WHERE tenant_id=$1 FOR SHARE', [tenantId]);
  if (!tenant.rows[0]?.enabled) throw new AccessDenied();
  const kind = tenant.rows[0].kind;
  if (principal.kind === 'integration') {
    const integration = await tx.query('SELECT integration_id FROM tawsel.integrations WHERE tenant_id=$1 AND integration_id=$2 AND enabled', [tenantId, principal.integrationId]);
    if (!integration.rowCount || kind !== 'company') throw new AccessDenied();
    const caps = await tx.query<{ capability: Capability }>('SELECT capability FROM tawsel.integration_capabilities WHERE tenant_id=$1 AND integration_id=$2 ORDER BY capability', [tenantId, principal.integrationId]);
    const branches = await tx.query<{ branch_id: string }>(`SELECT b.branch_id FROM tawsel.integration_branches m
      JOIN tawsel.branches b USING (tenant_id,branch_id) WHERE m.tenant_id=$1 AND integration_id=$2 AND b.enabled ORDER BY b.branch_id`, [tenantId, principal.integrationId]);
    return { tenantId, kind, sourceId: principal.integrationId, integrationId: principal.integrationId,
      driverId: null, branches: branches.rows.map(r => r.branch_id), capabilities: caps.rows.map(r => r.capability) };
  }
  const found = await tx.query<{ account_id: string; role_id: string | null }>(`SELECT a.account_id, m.role_id
    FROM tawsel.identity_subjects s JOIN tawsel.accounts a USING (tenant_id,account_id)
    JOIN tawsel.memberships m USING (tenant_id,account_id)
    WHERE s.tenant_id=$1 AND s.issuer=$2 AND s.subject=$3 AND s.enabled AND a.enabled AND m.enabled`, [tenantId, principal.issuer, principal.subject]);
  const member = found.rows[0];
  if (!member) throw new AccessDenied();
  const caps = kind === 'personal' ? [...personalCapabilities] : (await tx.query<{ capability: Capability }>(`SELECT c.capability FROM tawsel.capabilities c
    LEFT JOIN tawsel.role_capabilities r ON r.capability=c.capability AND r.tenant_id=$1 AND r.role_id=$3
    LEFT JOIN tawsel.user_capability_exceptions u ON u.capability=c.capability AND u.tenant_id=$1 AND u.account_id=$2
    WHERE CASE u.effect WHEN 'allow' THEN true WHEN 'deny' THEN false ELSE COALESCE(r.allowed,false) END
    ORDER BY c.capability`, [tenantId, member.account_id, member.role_id])).rows.map(r => r.capability);
  const branches = await tx.query<{ branch_id: string }>(`SELECT b.branch_id FROM tawsel.membership_branches m
    JOIN tawsel.branches b USING (tenant_id,branch_id) WHERE m.tenant_id=$1 AND account_id=$2 AND b.enabled ORDER BY b.branch_id`, [tenantId, member.account_id]);
  const driver = await tx.query<{ driver_id: string }>('SELECT driver_id FROM tawsel.drivers WHERE tenant_id=$1 AND account_id=$2 AND enabled', [tenantId, member.account_id]);
  return { tenantId, kind, sourceId: member.account_id, actorId: member.account_id,
    integrationId: null, driverId: driver.rows[0]?.driver_id ?? null, branches: branches.rows.map(r => r.branch_id), capabilities: caps };
}
