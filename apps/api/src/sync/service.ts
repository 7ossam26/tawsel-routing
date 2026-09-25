import type { Pool } from 'pg';
import type { components } from '@tawsel/api-client';
import { withAccess, type AuthenticatedPrincipal } from '../access/service.js';
import { ownDriver } from '../current/state.js';
import { authorizeDriver } from '../planning/service.js';
import { CurrentActivity } from '../current/service.js';
import { Outcomes } from '../outcomes/service.js';
import { Closures } from '../closure/service.js';
import { Devices } from '../devices/service.js';
import { Corrections } from '../corrections/service.js';
import { Eligibility } from '../eligibility/service.js';
import { Branches } from '../branch/service.js';
import { Returns } from '../returns/service.js';
import { DependencyPending } from '../commands/dependencies.js';
import { DeviceError, uuid } from '../devices/models.js';
import { validateProtocol } from '../commands/validation.js';
import type { ActionEnvelope } from '../commands/kernel.js';

type S = components['schemas'];
/** Independent existing command transactions: never a permissive bulk writer. */
export class Synchronization {
  constructor(readonly pool: Pool) {}
  async submit(principal: AuthenticatedPrincipal, input: unknown): Promise<S['SyncBatchResult']> {
    if (!input || typeof input !== 'object' || Object.keys(input).join() !== 'actions' || !Array.isArray((input as S['SyncBatch']).actions)) throw new DeviceError('validation_failed', 400, 'دفعة غير صالحة.');
    const { actions } = input as S['SyncBatch'];
    if (!actions.length || actions.length > 50) throw new DeviceError('validation_failed', 400, 'الحد الأقصى ٥٠ إجراء في الدفعة.');
    // Reject an invalid outer protocol without pretending to acknowledge evidence.
    for (const c of actions) { try { validateProtocol('action-envelope', c); } catch { throw new DeviceError('validation_failed', 400, 'صيغة الإجراء غير صالحة؛ لم تُؤكد الدفعة.'); } if (c.context.kind !== 'device') throw new DeviceError('validation_failed', 400, 'المزامنة لإجراءات الهاتف فقط.'); }
    const results: S['SyncEntry'][] = [];
    for (const c of actions) {
      try { results.push({ actionId: c.actionId, status: 'received', result: await this.dispatch(principal, c) }); }
      catch (error) {
        if (error instanceof DependencyPending) results.push({ actionId: c.actionId, status: 'waiting', dependencies: error.dependencies });
        else {
          const e = error as { statusCode?: number; code?: string; message?: string };
          results.push({ actionId: c.actionId, status: 'not-received', code: e.statusCode && e.statusCode < 500 ? e.code ?? 'validation_failed' : 'request_failed', message: e.statusCode && e.statusCode < 500 ? e.message ?? 'راجع الإجراء.' : 'تعذر تأكيد الحفظ؛ أعد المحاولة بالمعرّف نفسه.', retryable: !e.statusCode || e.statusCode >= 500 });
        }
      }
    }
    return { results };
  }
  private dispatch(principal: AuthenticatedPrincipal, c: ActionEnvelope) {
    if (['current.selectHeading', 'current.recordArrival', 'current.correctOrigin'].includes(c.operationId)) return new CurrentActivity(this.pool).command(principal, c);
    if (['outcome.recordFull', 'outcome.recordPartial', 'outcome.recordRefusal', 'outcome.recordNoAnswer'].includes(c.operationId)) return new Outcomes(this.pool).command(principal, c);
    if (['round.end', 'workday.end'].includes(c.operationId)) return new Closures(this.pool).command(principal, c);
    if (['outcome.correct', 'evidence.adoptCompatible'].includes(c.operationId)) return new Corrections(this.pool).command(principal, c);
    if (['task.deferWhole', 'task.retryWhole', 'task.activateDeferred', 'task.setDriverUrgency'].includes(c.operationId)) return new Eligibility(this.pool).command(principal, c);
    if (['branch.interruptRound', 'branch.recordArrival', 'branch.resumeRound'].includes(c.operationId)) return new Branches(this.pool).command(principal, c);
    if (c.operationId === 'return.requestHandover') return new Returns(this.pool).request(principal, c);
    if (c.operationId === 'device.takeOver') return new Devices(this.pool).takeover(principal, c);
    throw new DeviceError('validation_failed', 400, 'نوع الإجراء غير مدعوم للمزامنة.');
  }
  async conflicts(principal: AuthenticatedPrincipal, deviceId: string, afterActionId?: string): Promise<S['SyncConflicts']> {
    uuid(deviceId); if (afterActionId) uuid(afterActionId);
    const ids = await withAccess(this.pool, principal, async (a, tx) => {
      const driver = ownDriver(a); await authorizeDriver(tx, a, driver);
      return (await tx.query<{ action_id: string }>(`SELECT i.action_id FROM tawsel.command_identities i
        JOIN tawsel.command_evidence e USING(tenant_id,source_id,action_id)
        WHERE i.tenant_id=$1 AND i.source_id=$2 AND i.result_summary->'summary'->>'driverId'=$3
        AND i.result_summary->'summary'->>'roundId' IS NOT NULL
        AND ($4::uuid IS NULL OR i.action_id>$4) ORDER BY i.action_id LIMIT 51`, [a.context.tenantId, a.context.sourceId, driver, afterActionId ?? null])).rows;
    });
    const items = [];
    for (const row of ids.slice(0, 50)) items.push(await new Devices(this.pool).evidence(principal, row.action_id, deviceId));
    return { items, nextActionId: ids.length > 50 ? ids[49]!.action_id : null };
  }
}
