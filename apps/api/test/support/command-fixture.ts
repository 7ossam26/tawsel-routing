import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { migrate } from '../../src/db/migrate.js';
import { lockInvariants } from '../../src/commands/locks.js';
import type { ActionEnvelope, CommandHooks, CommandScope, Decision } from '../../src/commands/kernel.js';

// Test-only counter/progress, explicitly not a shipment, quantity ledger or API.
export const tenantA = '10000000-0000-4000-8000-000000000001';
export const tenantB = '10000000-0000-4000-8000-000000000002';
export const sourceA = '20000000-0000-4000-8000-000000000001';
export const sourceB = '20000000-0000-4000-8000-000000000002';
export const recipient = '20000000-0000-4000-8000-000000000003';
export const scopeA: CommandScope = { tenantId: tenantA, sourceId: sourceA };

export async function prepareFixture(pool: Pool) {
  await migrate(pool);
  await pool.query('INSERT INTO tawsel.tenant_keys VALUES ($1),($2)', [tenantA, tenantB]);
  for (const tenant of [tenantA, tenantB]) {
    for (const source of [sourceA, sourceB, recipient]) {
      await pool.query("INSERT INTO tawsel.command_sources VALUES ($1,$2,'integration')", [tenant, source]);
    }
  }
  await pool.query(`CREATE TABLE public.kernel_test_state (
      tenant_id uuid NOT NULL REFERENCES tawsel.tenant_keys, fixture_id uuid NOT NULL,
      value integer NOT NULL, PRIMARY KEY (tenant_id,fixture_id));
    CREATE TABLE public.kernel_test_progress (
      tenant_id uuid NOT NULL, fixture_id uuid NOT NULL, value integer NOT NULL,
      PRIMARY KEY (tenant_id,fixture_id), FOREIGN KEY (tenant_id,fixture_id) REFERENCES public.kernel_test_state)`);
}

export function makeCommand(scope: CommandScope = scopeA): ActionEnvelope {
  return {
    schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId: 'test.increment',
    context: { kind: 'integration', tenantId: scope.tenantId, integrationId: scope.sourceId },
    resources: {}, baseVersions: {}, dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } },
    payload: { fixtureId: randomUUID(), amount: 1 }
  };
}

export function fixtureHooks(command: ActionEnvelope, scope?: CommandScope, options: { reject?: boolean; review?: boolean; noIntent?: boolean; hold?: boolean } = {}): CommandHooks {
  return {
    async writeDomain(tx, command, scope) {
      const fixtureId = command.payload.fixtureId as string;
      await lockInvariants(tx, scope.tenantId, [{ kind: 'task', id: fixtureId }]);
      const updated = await tx.query(`INSERT INTO public.kernel_test_state VALUES ($1,$2,$3)
        ON CONFLICT (tenant_id,fixture_id) DO UPDATE SET value=kernel_test_state.value+excluded.value RETURNING value`,
      [scope.tenantId, fixtureId, command.payload.amount]);
      const value = updated.rows[0].value as number;
      const base = { response: { status: 200, body: { fixtureId, value } }, summary: { fixtureId, value }, audit: { fixtureId, value } };
      if (options.reject || options.review) {
        return { ...base, status: options.review ? 'review-required' : 'rejected', response: { status: 409, body: { code: 'stale_revision' } },
          problem: { type: 'https://schemas.tawsel.invalid/problems/stale-revision', title: 'Fixture rejection', status: 409,
            code: 'stale_revision', correlationId: randomUUID(), actionId: command.actionId, retryable: false } };
      }
      const decision: Decision = { ...base, status: 'accepted', resourceVersions: { resourceRevision: value }, retentionHold: options.hold ?? false,
        intents: options.noIntent ? [] : [{ eventId: randomUUID(), recipientId: recipient, eventType: 'test.changed', payloadVersion: '1.0.0', payload: { fixtureId, value } }] };
      return decision;
    },
    async writeProgress(tx, decision, command, scope) {
      await tx.query(`INSERT INTO public.kernel_test_progress VALUES ($1,$2,$3)
        ON CONFLICT (tenant_id,fixture_id) DO UPDATE SET value=excluded.value`, [scope.tenantId, command.payload.fixtureId, decision.summary.value]);
    }
  };
}

export async function facts(pool: Pool, command: ActionEnvelope, scope: CommandScope = scopeA) {
  const counts: Record<string, number> = {};
  for (const table of ['command_identities','command_audit','command_evidence','outbox_intents']) {
    counts[table] = Number((await pool.query(`SELECT count(*) FROM tawsel.${table} WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3`,
      [scope.tenantId, scope.sourceId, command.actionId])).rows[0].count);
  }
  for (const table of ['kernel_test_state','kernel_test_progress']) {
    counts[table] = Number((await pool.query(`SELECT COALESCE(sum(value),0) AS value FROM public.${table} WHERE tenant_id=$1 AND fixture_id=$2`,
      [scope.tenantId, command.payload.fixtureId])).rows[0].value);
  }
  return counts;
}
