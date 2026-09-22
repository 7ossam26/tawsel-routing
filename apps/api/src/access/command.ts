import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Transaction } from '../db/transaction.js';
import { canonicalJson, freezeJson } from '../commands/json.js';
import { executeCommandInTransaction, type ActionEnvelope, type CommandHooks } from '../commands/kernel.js';
import { validateProtocol } from '../commands/validation.js';
import { AccessDenied, withAccess, type AccessSession, type AuthenticatedPrincipal, type ResourcePolicy, type ResourceScope } from './service.js';

export interface AuthorizedCommand<R extends ResourceScope> {
  operationId: string;
  policy: ResourcePolicy;
  validatePayload(command: ActionEnvelope): void;
  // Feature adapter MUST acquire invariant/resource locks in the P05 order,
  // read authoritative scope/state (never payload ownership) and retain locks.
  loadAndLockResource(tx: Transaction, access: AccessSession, command: ActionEnvelope): Promise<R | null>;
  eligible(resource: R, command: ActionEnvelope): boolean;
  hooks: Omit<CommandHooks, 'authorize'>;
}

/** Internal handler/worker composition. No HTTP route or production identity
 * fixture. Authentication must already be verified; authorization is always fresh. */
export async function executeAuthorizedCommand<R extends ResourceScope>(pool: Pool, principal: AuthenticatedPrincipal,
  envelope: ActionEnvelope, operation: AuthorizedCommand<R>) {
  const command = freezeJson(JSON.parse(canonicalJson(envelope)) as ActionEnvelope);
  validateProtocol('action-envelope', command);
  if (command.operationId !== operation.operationId) throw new AccessDenied();
  operation.validatePayload(command);
  return withAccess(pool, principal, async (access, tx) => {
    const context = command.context;
    access.assertScope(context.kind === 'integration'
      ? { tenantId: context.tenantId, integrationId: context.integrationId, ...(context.assertedActorId ? { assertedActorId: context.assertedActorId } : {}) }
      : { tenantId: context.tenantId, accountId: context.accountId });
    access.requireCapability(operation.policy);
    let visible: R;
    return executeCommandInTransaction(tx, access.commandScope, command, {
      ...operation.hooks,
      async authorize(tx, snapshot) {
        visible = access.requireResource(operation.policy, await operation.loadAndLockResource(tx, access, snapshot));
      },
      async writeDomain(tx, snapshot, scope) {
        // Existing results are reauthorized but do not repeat a lifecycle change.
        // New lifecycle rejection is durable evidence, without a business write.
        if (operation.eligible(visible, snapshot) !== true) {
          const problem = { type: 'https://schemas.tawsel.invalid/problems/lifecycle-forbidden',
            title: 'Operation unavailable in the current state', code: 'lifecycle_forbidden' as const,
            status: 409, correlationId: randomUUID(), actionId: snapshot.actionId, retryable: false };
          return { status: 'rejected', problem, response: { status: 409, body: { ...problem } },
            summary: { code: problem.code }, audit: { code: problem.code } };
        }
        return operation.hooks.writeDomain(tx, snapshot, scope);
      }
    });
  });
}
