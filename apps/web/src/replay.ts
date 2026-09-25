import type { components } from '@tawsel/api-client';
import { LocalWork, scopeKey, sessionScope, type LocalEnvelope } from './local-work.js';
import { withJournalLock } from './journal-lock.js';
import { bindSession } from './account-lifecycle.js';
import { readLocalAction } from './action-reader.js';

type S = components['schemas'];
export interface ReplayTransport {
  session(): Promise<S['SessionContext']>;
  submit(actions: LocalEnvelope[]): Promise<S['SyncBatchResult']>;
  result(id: string): Promise<S['DeviceActionStatus']>;
  refresh(scope: string): Promise<void>;
}
export type ReplayReport = { received: number; remaining: number; review: number; message: string };
export type JournalLock = <T>(scope: string, work: () => Promise<T>) => Promise<T>;

export class ReplayCoordinator {
  constructor(readonly store: LocalWork, readonly transport: ReplayTransport, readonly lock: JournalLock = withJournalLock) {}
  run(scope: string): Promise<ReplayReport> { return this.lock(scope, () => this.runLocked(scope)); }
  beforeStart<T>(scope: string, work: (acceptedActionIds: string[]) => Promise<T>): Promise<T> {
    return this.lock(scope, async () => {
      const report = await this.runLocked(scope);
      if (report.remaining || (await this.store.pendingFor(scope)).length) throw new Error('يوجد عمل محفوظ ينتظر المزامنة؛ لم يُطلب بدء جولة جديدة.');
      const actions = await this.store.actions.where('scope').equals(scope).sortBy('sequence'), lastRound = actions.at(-1)?.roundId;
      const ids: string[] = [];
      for (const action of actions.filter(a => a.roundId === lastRound)) {
        const ack = await this.store.acknowledgements.get([scope, action.actionId]);
        if (ack?.result.receipt.businessStatus === 'accepted') ids.push(action.actionId);
      }
      return work(ids);
    });
  }
  /** Caller already owns the same journal lock (used by synchronized new start). */
  async runLocked(scope: string): Promise<ReplayReport> {
    const partition = await this.store.partitions.get(scope);
    if (!partition || (await this.store.selection.get('active'))?.scope !== scope) throw new Error('افتح الحساب الذي حفظ هذه الإجراءات.');
    const session = await this.transport.session();
    if (scopeKey(sessionScope(session, partition.identity.deviceId)) !== scope) throw new Error('سجّل الدخول للحساب نفسه؛ لم تُرسل إجراءات الحساب المحفوظ.');
    await bindSession(this.store, session, partition.identity.deviceId);
    const report: ReplayReport = { received: 0, remaining: 0, review: 0, message: '' };
    const attempted = new Set<string>();
    while (true) {
      await this.store.assertSelected(scope);
      const unsent = (await this.store.actions.where('scope').equals(scope).sortBy('sequence')).filter(action => !attempted.has(action.actionId));
      const ready: LocalEnvelope[] = [];
      for (const action of unsent) {
        if (await this.store.acknowledgements.get([scope, action.actionId])) continue;
        readLocalAction(action);
        let missing = false;
        for (const id of action.envelope.dependsOnActionIds) {
          if (await this.store.acknowledgements.get([scope, id])) continue;
          if (!await this.store.actions.get([scope, id])) {
            // An external/legacy predecessor must be confirmed by its own scoped
            // status. Never infer acceptance from a sequence or a client clock.
            const known = await this.transport.result(id);
            if (known.status !== 'pending') continue;
          }
          missing = true; break;
        }
        if (!missing) { ready.push(action.envelope); if (ready.length === 50) break; }
      }
      if (!ready.length) break;
      const response = await this.transport.submit(ready);
      const expected = new Map(ready.map(c => [c.actionId, c]));
      const seen = new Set<string>();
      // A partial response is never blanket success. Save each matching receipt
      // independently; entries missing from the response remain in the journal.
      for (const entry of response.results) {
        const original = expected.get(entry.actionId);
        if (!original || seen.has(entry.actionId)) throw new Error('إفادة المزامنة لا تطابق الدفعة؛ بقي الدليل المحلي محفوظًا.');
        seen.add(entry.actionId);
        if (entry.status === 'received') {
          if (entry.result.receipt.actionId !== entry.actionId || entry.result.operationId !== original.operationId) throw new Error('إفادة الخادم لا تطابق الإجراء.');
          await this.store.acknowledge(scope, entry.result);
          report.received++; if (entry.result.receipt.businessStatus !== 'accepted') report.review++;
        } else report.message = entry.status === 'waiting' ? 'يوجد إجراء سابق ينتظر الوصول؛ أعد المزامنة.' : entry.message;
      }
      ready.forEach(c => attempted.add(c.actionId));
    }
    const all = await this.store.actions.where('scope').equals(scope).toArray();
    for (const action of all) if (!await this.store.acknowledgements.get([scope, action.actionId])) report.remaining++;
    // Do not overwrite the confirmed base beneath partially unsent projections.
    if (!report.remaining) await this.transport.refresh(scope);
    return report;
  }
}
