import { randomUUID } from 'node:crypto';
import type { Pool, QueryResultRow } from 'pg';
import type { components } from '@tawsel/api-client';
import { withTransaction, type Transaction } from '../db/transaction.js';
import { canonicalJson, freezeJson, payloadHash } from './json.js';
import { validateProtocol } from './validation.js';

export type ActionEnvelope = components['schemas']['ActionEnvelope'];
export type EvidenceReceipt = components['schemas']['ActionResult']['receipt'];
type JsonObject = Record<string, unknown>;

/** Server-owned binding after authentication/authorization. Never bind from the body. */
export interface CommandScope { tenantId: string; sourceId: string; actorId?: string }
export interface StoredResponse { status: number; body: JsonObject }
export type CommandResult = components['schemas']['ActionResult'];
export interface OutboundIntent {
  eventId: string;
  recipientId: string;
  recipientKind?: 'integration' | 'account';
  eventType: string;
  payloadVersion: string;
  payload: JsonObject;
}
interface DecisionBase { response: StoredResponse; summary: JsonObject; audit: JsonObject; retentionHold?: boolean }
export type Decision =
  | DecisionBase & { status: 'accepted'; resourceVersions: EvidenceReceipt['resourceVersions']; intents: OutboundIntent[] }
  | DecisionBase & { status: 'rejected' | 'review-required'; problem: NonNullable<EvidenceReceipt['problem']>; evidenceIntents?: (OutboundIntent & {eventType:'evidence.received'})[] };

export type WriteStage = 'identity' | 'domain' | 'progress' | 'evidence' | 'audit' | 'outbox' | 'result';
export interface CommandHooks {
  // Reauthorize resource visibility under the same transaction, even on replay.
  // Runs after command acquisition and before feature mutation/result disclosure.
  authorize?(tx: Transaction, command: ActionEnvelope, scope: Readonly<CommandScope>): Promise<void>;
  // Lock and write feature tables through this connection only, no HTTP/network.
  writeDomain(tx: Transaction, command: ActionEnvelope, scope: Readonly<CommandScope>): Promise<Decision>;
  writeProgress(tx: Transaction, decision: Extract<Decision, { status: 'accepted' }>, command: ActionEnvelope, scope: Readonly<CommandScope>): Promise<void>;
  // Fault/observability seam. Never used to establish uniqueness or acceptance.
  afterWrite?(stage: WriteStage, tx: Transaction): Promise<void>;
}

export class IdempotencyConflict extends Error {
  readonly code = 'idempotency_conflict';
  readonly statusCode = 409;
  constructor() { super('Action ID already belongs to a different command payload'); }
}

interface IdentityRow extends QueryResultRow {
  action_id: string; operation_id: string; payload_hash: string; receipt_id: string;
  received_at: Date; accepted_at: Date | null; business_status: EvidenceReceipt['businessStatus'];
  response_status: number | null; response_body: JsonObject | null;
  result_summary: { receipt: EvidenceReceipt; summary: JsonObject } | null;
}
const key = (scope: CommandScope, actionId: string) => [scope.tenantId, scope.sourceId, actionId];

function resultFrom(row: IdentityRow): CommandResult {
  if (!row.result_summary) throw new Error('Unfinalized command identity');
  return {
    receipt: row.result_summary.receipt, operationId: row.operation_id,
    retention: row.response_body === null ? 'compacted' : 'full', summary: row.result_summary.summary,
    ...(row.response_body === null ? {} : { response: { status: row.response_status!, body: row.response_body } })
  };
}

export async function getCommandResult(pool: Pool | Transaction, scope: CommandScope, actionId: string): Promise<CommandResult | null> {
  const found = await pool.query<IdentityRow>(`SELECT * FROM tawsel.command_identities
    WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3`, key(scope, actionId));
  return found.rows[0] ? resultFrom(found.rows[0]) : null;
}

export async function executeCommand(pool: Pool, scope: CommandScope, envelope: ActionEnvelope, hooks: CommandHooks): Promise<CommandResult> {
  const command = freezeJson(JSON.parse(canonicalJson(envelope)) as ActionEnvelope);
  const binding = Object.freeze({ ...scope });
  return withTransaction(pool, tx => executeCommandInTransaction(tx, binding, command, hooks));
}

/** Internal composition point for P06: authorization and command writes share
 * one connection/commit. The caller owns the transaction, never hooks. */
export async function executeCommandInTransaction(tx: Transaction, scope: CommandScope, envelope: ActionEnvelope, hooks: CommandHooks): Promise<CommandResult> {
  // Snapshot before the first await: later caller mutation cannot change the write/hash contract.
  const command = freezeJson(JSON.parse(canonicalJson(envelope)) as ActionEnvelope);
  validateProtocol('action-envelope', command);
  const binding = Object.freeze({ ...scope });
  const context = command.context;
  if (context.tenantId !== binding.tenantId
    || (context.kind === 'integration' ? context.integrationId : context.accountId) !== binding.sourceId
    || (context.kind === 'integration' && context.assertedActorId !== undefined && context.assertedActorId !== binding.actorId)) {
    throw new Error('Command context does not match trusted scope');
  }
  const hash = payloadHash({ envelope: command, actorId: binding.actorId ?? null });
  return (async () => {
    const source = await tx.query('SELECT kind FROM tawsel.command_sources WHERE tenant_id=$1 AND source_id=$2', [binding.tenantId, binding.sourceId]);
    if (source.rows[0]?.kind !== (context.kind === 'integration' ? 'integration' : 'account')) throw new Error('Unknown or incompatible command source');
    const inserted = await tx.query(`INSERT INTO tawsel.command_identities
      (tenant_id, source_id, action_id, operation_id, payload_hash, actor_id, receipt_id, business_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') ON CONFLICT DO NOTHING RETURNING action_id`,
    [...key(binding, command.actionId), command.operationId, hash, binding.actorId ?? null, randomUUID()]);
    // ON CONFLICT waits on an independent writer. A new READ COMMITTED statement
    // then observes its committed result; FOR UPDATE also serializes compaction.
    const found = await tx.query<IdentityRow>(`SELECT * FROM tawsel.command_identities
      WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3 FOR UPDATE`, key(binding, command.actionId));
    const row = found.rows[0];
    if (!row) throw new Error('Command acquisition failed');
    await hooks.authorize?.(tx, command, binding);
    if (row.payload_hash !== hash) throw new IdempotencyConflict();
    if (!inserted.rowCount) return resultFrom(row);
    await hooks.afterWrite?.('identity', tx);
    await tx.query('SAVEPOINT domain_work');
    const decision = await hooks.writeDomain(tx, command, binding);
    await hooks.afterWrite?.('domain', tx);
    const rejected = decision.status !== 'accepted';
    if (rejected) {
      // A handler may discover rejection after tentative writes. None are accepted.
      await tx.query('ROLLBACK TO SAVEPOINT domain_work');
      await tx.query(`INSERT INTO tawsel.command_evidence (tenant_id,source_id,action_id,envelope)
        VALUES ($1,$2,$3,$4::jsonb)`, [...key(binding, command.actionId), canonicalJson(command)]);
      await hooks.afterWrite?.('evidence', tx);
    } else {
      await hooks.writeProgress(tx, decision, command, binding);
      await hooks.afterWrite?.('progress', tx);
    }
    if (!Number.isInteger(decision.response.status)
      || (rejected ? decision.response.status < 400 || decision.response.status > 599 : decision.response.status < 200 || decision.response.status > 299)) {
      throw new Error('Response status does not match command decision');
    }
    await tx.query(`INSERT INTO tawsel.command_audit (tenant_id,source_id,action_id,audit_id,kind,details)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [...key(binding, command.actionId), randomUUID(),
      decision.status === 'accepted' ? 'accepted-change' : decision.status === 'rejected' ? 'rejected-evidence' : 'review-evidence', canonicalJson(decision.audit)]);
    await hooks.afterWrite?.('audit', tx);
    {
      // Rejected execution may notify durable evidence receipt, never emit a
      // business-change event. This write follows the domain savepoint rollback.
      const intents=decision.status==='accepted'?decision.intents:decision.evidenceIntents??[];
      if(decision.status!=='accepted'&&intents.some(i=>i.eventType!=='evidence.received'))throw new Error('Rejected execution cannot emit business intent');
      // Later sender owns delivery. These immutable rows only mean durable intent.
      for (const intent of [...intents].sort((a, b) => a.recipientId.localeCompare(b.recipientId) || a.eventId.localeCompare(b.eventId))) {
        await tx.query(`INSERT INTO tawsel.outbox_intents
          (tenant_id,event_id,source_id,action_id,recipient_id,event_type,payload_version,payload,recipient_kind)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`, [binding.tenantId, intent.eventId, binding.sourceId,
          command.actionId, intent.recipientId, intent.eventType, intent.payloadVersion, canonicalJson(intent.payload),intent.recipientKind??'integration']);
        await hooks.afterWrite?.('outbox', tx);
      }
    }
    const instant = (await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
    const receipt: EvidenceReceipt = {
      schemaVersion: '1.0.0', receiptId: row.receipt_id, actionId: command.actionId,
      evidenceStatus: 'received', businessStatus: decision.status, receivedAt: row.received_at.toISOString(),
      ...(decision.status === 'accepted'
        ? { committedAt: instant.toISOString(), resourceVersions: decision.resourceVersions ?? {} }
        : { problem: decision.problem })
    };
    const updated = await tx.query<IdentityRow>(`UPDATE tawsel.command_identities SET
      business_status=$4, accepted_at=$5, finalized_at=$6, response_status=$7,
      response_body=$8::jsonb, result_summary=$9::jsonb, retention_hold=$10
      WHERE tenant_id=$1 AND source_id=$2 AND action_id=$3 RETURNING *`, [
      ...key(binding, command.actionId), decision.status, decision.status === 'accepted' ? instant : null,
      instant, decision.response.status, canonicalJson(decision.response.body), canonicalJson({ receipt, summary: decision.summary }),
      decision.status === 'review-required' || decision.retentionHold === true
    ]);
    await hooks.afterWrite?.('result', tx);
    const result = resultFrom(updated.rows[0]!);
    validateProtocol('action-result', result);
    return result;
  })();
}
