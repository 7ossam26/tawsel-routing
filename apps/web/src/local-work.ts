import Dexie, { type Table } from 'dexie';
import type { components } from '@tawsel/api-client';

type S = components['schemas'];
export type LocalScope = { kind: 'company' | 'personal'; tenantId: string; accountId: string; deviceId: string };
export type LocalEnvelope = S['ActionEnvelope'];
export type Download = {
  scope: string; roundId: string; format: 1; downloadedAt: string;
  session: S['SessionContext']; ownership: S['DeviceContext']; snapshotToken: string | null;
  current: S['CurrentSnapshot']; outcomes: S['OutcomeSnapshot']; plan: S['PlanningPlan'] | null;
  road: S['RoutingRouteResult'] | null;
};
type Partition = { scope: string; identity: LocalScope; session: S['SessionContext']; blocked: boolean };
export type LocalAction = { scope: string; actionId: string; sequence: number; roundId: string; envelope: LocalEnvelope; bytes: string; capturedAt: string; href: string };
export type PendingEffect = { scope: string; actionId: string; sequence: number; roundId: string; operationId: string; taskId: string | null; href: string };
export type Acknowledgement = { scope: string; actionId: string; result: S['ActionResult']; savedAt: string };

/** This key is an identity tuple, never a credential or an authorization grant. */
export const scopeKey = (scope: LocalScope) => JSON.stringify([scope.kind, scope.tenantId, scope.accountId, scope.deviceId]);
export const sessionScope = (session: S['SessionContext'], deviceId: string): LocalScope => ({ kind: session.kind, tenantId: session.access.tenantId, accountId: session.access.sourceId, deviceId });
export class LocalWork extends Dexie {
  partitions!: Table<Partition, string>;
  selection!: Table<{ id: 'active'; scope: string }, string>;
  downloads!: Table<Download, [string, string]>;
  actions!: Table<LocalAction, [string, string]>;
  pending!: Table<PendingEffect, [string, string]>;
  acknowledgements!: Table<Acknowledgement, [string, string]>;
  counters!: Table<{ scope: string; sequence: number }, string>;
  health!: Table<{ id: string; value: string }, string>;
  constructor(name = 'tawsel-local-work') {
    super(name, { chromeTransactionDurability: 'strict' });
    this.version(1).stores({
      partitions: '&scope', selection: '&id', downloads: '&[scope+roundId],scope',
      actions: '&[scope+actionId],&[scope+sequence],scope,[scope+roundId]',
      pending: '&[scope+actionId],scope,[scope+roundId]',
      acknowledgements: '&[scope+actionId],scope', counters: '&scope', health: '&id'
    });
    // A future reader must not delete/recreate an incompatible database.
  }
  async select(session: S['SessionContext'], deviceId: string) {
    const identity = sessionScope(session, deviceId), scope = scopeKey(identity);
    await this.transaction('rw', [this.selection, this.partitions, this.pending], async () => {
      const previous = await this.selection.get('active');
      if (previous && previous.scope !== scope && await this.pending.where('scope').equals(previous.scope).count()) throw new Error('يوجد عمل محفوظ لحساب آخر ينتظر المزامنة. عُد للحساب نفسه.');
      await this.partitions.put({ scope, identity, session, blocked: false });
      await this.selection.put({ id: 'active', scope });
    });
    return scope;
  }
  async active(kind: LocalScope['kind'], deviceId: string) {
    const selected = await this.selection.get('active');
    const partition = selected && await this.partitions.get(selected.scope);
    return partition && !partition.blocked && partition.identity.kind === kind && partition.identity.deviceId === deviceId ? partition : null;
  }
  async assertSelected(scope: string) {
    const selected = await this.selection.get('active'), partition = await this.partitions.get(scope);
    if (selected?.scope !== scope || !partition || partition.blocked) throw new Error('الحساب المحلي غير متاح. افتح الحساب نفسه عبر الاتصال.');
    return partition;
  }
  async blockSelected() {
    await this.transaction('rw', [this.selection, this.partitions], async () => {
      const selected = await this.selection.get('active');
      if (selected) await this.partitions.update(selected.scope, { blocked: true });
    });
  }
  async exit() {
    await this.transaction('rw', [this.selection, this.pending], async () => {
      const selected = await this.selection.get('active');
      if (selected && await this.pending.where('scope').equals(selected.scope).count()) throw new Error('يوجد عمل محفوظ على الهاتف ينتظر المزامنة. راجعه قبل الخروج أو تغيير الحساب.');
      await this.selection.delete('active');
    });
  }
  async saveDownload(value: Download) {
    await this.transaction('rw', [this.selection, this.partitions, this.downloads, this.pending, this.acknowledgements], async () => {
      const partition = await this.assertSelected(value.scope), { current, ownership, session } = value;
      if (value.format !== 1 || scopeKey(sessionScope(session, partition.identity.deviceId)) !== value.scope ||
          current.roundId !== value.roundId || ownership.roundId !== value.roundId || value.outcomes.roundId !== value.roundId ||
          ownership.roundState !== 'active' || ownership.workdayState !== 'open' || ownership.mode !== 'owner' ||
          current.driverId !== session.access.driverId || ownership.driverId !== current.driverId ||
          (value.plan && (value.plan.driverId !== current.driverId || value.plan.planId !== current.planning.planId)) ||
          (value.road && JSON.stringify(value.road) !== JSON.stringify(value.plan?.routePolicy?.roadRoute)) ||
          current.owner.accountId !== partition.identity.accountId || current.owner.deviceId !== partition.identity.deviceId || ownership.viewerDeviceId !== partition.identity.deviceId ||
          JSON.stringify(current.owner) !== JSON.stringify(ownership.owner) ||
          !session.access.effectiveCapabilities.includes('execution.own') || (ownership.snapshotRequired && !value.snapshotToken)) {
        throw new Error('لا يمكن تنزيل خطة غير مبدوءة أو عمل لا يملكه هذا الحساب والهاتف.');
      }
      const previous = await this.downloads.get([value.scope, value.roundId]);
      if (previous && (previous.current.owner.generation > current.owner.generation || previous.current.owner.generation === current.owner.generation && previous.current.revision > current.revision)) throw new Error('وصلت نسخة أقدم من الجولة؛ حدّث التنزيل.');
      await this.downloads.put(value);
      for (const effect of await this.pending.where('[scope+roundId]').equals([value.scope, value.roundId]).toArray()) {
        const ack = await this.acknowledgements.get([value.scope, effect.actionId]);
        const revision = ack?.result.receipt.resourceVersions?.resourceRevision;
        if (ack?.result.receipt.businessStatus === 'accepted' && revision !== undefined && current.revision >= revision) await this.pending.delete([value.scope, effect.actionId]);
      }
    });
  }
  async downloaded(kind: LocalScope['kind'], deviceId: string) {
    const partition = await this.active(kind, deviceId);
    if (!partition) return null;
    const all = await this.downloads.where('scope').equals(partition.scope).toArray();
    const value = all.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt))[0];
    if (!value) return null;
    if (value.format !== 1) throw new Error('نسخة بيانات الهاتف غير مدعومة؛ لم تُحذف الإجراءات.');
    return value;
  }
  async pendingFor(scope: string) {
    await this.assertSelected(scope);
    return (await this.pending.where('scope').equals(scope).toArray()).sort((a, b) => a.sequence - b.sequence);
  }
  async preview(download: Download) {
    await this.assertSelected(download.scope);
    const effects = await this.pendingFor(download.scope);
    const commands = await Promise.all(effects.filter(effect => effect.roundId === download.roundId).map(effect => this.actions.get([download.scope, effect.actionId])));
    return projectCurrent(download.current, commands.flatMap(value => value ? [value.envelope] : []));
  }
  /** The counter, immutable bytes and pending effect either ALL commit or NONE
   * do. An ID never acquires new bytes, even after an uncertain HTTP result. */
  async capture(scope: string, input: LocalEnvelope, href: string, continuation = true, preserveBytes = false): Promise<LocalAction> {
    const original = structuredClone(input);
    return this.transaction('rw', [this.selection, this.partitions, this.downloads, this.actions, this.pending, this.counters, this.acknowledgements], async () => {
      const partition = await this.assertSelected(scope), context = original.context;
      if (context.kind !== 'device' || context.tenantId !== partition.identity.tenantId || context.accountId !== partition.identity.accountId || context.deviceId !== partition.identity.deviceId) throw new Error('لا يمكن حفظ إجراء لحساب أو هاتف آخر.');
      if (original.schemaVersion !== '1.0.0' || original.payloadVersion !== '1.0.0') throw new Error('نسخة الإجراء غير مدعومة؛ لم يتغير السجل.');
      const duplicate = await this.actions.get([scope, original.actionId]);
      if (duplicate) {
        if (duplicate.bytes !== JSON.stringify(original)) throw new Error('معرّف الإجراء موجود بمحتوى مختلف.');
        return duplicate;
      }
      const effects = await this.pendingFor(scope), prior = effects.at(-1);
      if (continuation) {
        const download = await this.downloads.get([scope, String(original.resources.tripId)]);
        if (!download || download.format !== 1 || download.current.owner.generation !== context.deviceGeneration) throw new Error('نزّل الجولة المبدوءة لهذا الهاتف قبل تسجيل العمل.');
        if (effects.some(effect => !offlineOperations.has(effect.operationId) || effect.roundId !== download.roundId)) throw new Error('يوجد إجراء آخر يحتاج مراجعة قبل متابعة الجولة.');
        const projected = await this.preview(download);
        assertContinuation(projected, original);
      } else if (effects.length) throw new Error('راجع العمل المحفوظ على الهاتف قبل إجراء تغيير متصل آخر.');
      const sequence = (await this.counters.get(scope))?.sequence ?? 0;
      const next = preserveBytes ? context.deviceSequence : Math.max(sequence + 1, context.deviceSequence);
      if (!Number.isSafeInteger(next)) throw new Error('تعذر حفظ تسلسل الإجراء.');
      const envelope: LocalEnvelope = preserveBytes ? original : { ...original, context: { ...context, deviceSequence: next }, dependsOnActionIds: [...new Set([...original.dependsOnActionIds, ...(prior ? [prior.actionId] : [])])] };
      const revision = Number(original.payload.expectedActivityRevision);
      if (!preserveBytes) envelope.baseVersions = { ...envelope.baseVersions, deviceGeneration: context.deviceGeneration,
        ...(revision > 0 ? { resourceRevision: revision } : {}),
        ...(Number(original.payload.expectedSourceRevision) > 0 ? { sourceRevision: Number(original.payload.expectedSourceRevision) } : {}),
        ...(Number(original.payload.expectedAssignmentRevision) > 0 ? { assignmentGeneration: Number(original.payload.expectedAssignmentRevision) } : {}),
        ...(Number(original.payload.expectedPinRevision) > 0 ? { locationRevision: Number(original.payload.expectedPinRevision) } : {}) };
      const action: LocalAction = { scope, actionId: envelope.actionId, sequence: next, roundId: String(envelope.resources.tripId ?? ''), envelope, bytes: JSON.stringify(envelope), capturedAt: new Date().toISOString(), href };
      await this.actions.add(action);
      await this.pending.add({ scope, actionId: action.actionId, sequence: next, roundId: action.roundId, operationId: envelope.operationId, taskId: envelope.resources.taskId ?? null, href });
      await this.counters.put({ scope, sequence: Math.max(next, sequence) });
      return action;
    });
  }
  async acknowledge(scope: string, result: S['ActionResult']) {
    await this.transaction('rw', [this.selection, this.partitions, this.actions, this.pending, this.acknowledgements], async () => {
      await this.assertSelected(scope);
      const action = await this.actions.get([scope, result.receipt.actionId]);
      if (!action || action.envelope.operationId !== result.operationId || !result.receipt.receiptId || result.receipt.evidenceStatus !== 'received') throw new Error('لم تصل إفادة خادم مطابقة؛ يبقى الإجراء محفوظًا.');
      await this.acknowledgements.put({ scope, actionId: action.actionId, result, savedAt: new Date().toISOString() });
      // Accepted ordinary actions keep their overlay until an authoritative
      // download covers its revision. Other/rejected receipts remain inspectable.
      if (result.receipt.businessStatus !== 'accepted' || !offlineOperations.has(action.envelope.operationId)) await this.pending.delete([scope, action.actionId]);
    });
  }
}
export const localWork = new LocalWork();

export const offlineOperations = new Set(['current.selectHeading', 'current.recordArrival', 'outcome.recordFull', 'outcome.recordPartial', 'outcome.recordRefusal', 'outcome.recordNoAnswer']);
function assertContinuation(state: S['CurrentSnapshot'], command: LocalEnvelope) {
  const p = command.payload, target = state.targets.find(value => value.taskId === p.taskId && value.attemptId === p.attemptId);
  if (!offlineOperations.has(command.operationId) || state.branchActivity || !target || p.expectedActivityRevision !== state.revision || p.expectedCurrentAttemptId !== (state.currentActivity?.attemptId ?? null) ||
      p.expectedSourceRevision !== target.sourceRevision || p.expectedAssignmentRevision !== target.assignmentRevision || p.expectedPinRevision !== target.pinRevision) throw new Error('تغيّرت الحالة المحفوظة؛ أعد فتح الجولة قبل التأكيد.');
  const stage = state.currentActivity?.attemptId === target.attemptId ? state.currentActivity.stage : null;
  if (command.operationId === 'current.selectHeading') { if (state.currentActivity) throw new Error('أكمل المحطة الحالية أولًا.'); return; }
  if (command.operationId === 'current.recordArrival') { if (stage !== 'heading') throw new Error('سجّل الاتجاه أولًا.'); return; }
  const allowed = { 'outcome.recordFull': 'full', 'outcome.recordPartial': 'partial', 'outcome.recordRefusal': 'refusal', 'outcome.recordNoAnswer': 'no-answer' } as const;
  const outcome = allowed[command.operationId as keyof typeof allowed];
  if (!target.delivery.allowedActions.includes(outcome) || (outcome === 'no-answer' ? stage !== 'heading' : stage !== 'arrived')) throw new Error('النتيجة غير متاحة في حالة المحطة الحالية.');
}
/** Pure pending projection. Never write this over the last confirmed snapshot,
 * and never use synthetic receipt/commit timestamps for captured work. */
export function projectCurrent(confirmed: S['CurrentSnapshot'], commands: LocalEnvelope[]): S['CurrentSnapshot'] {
  const state = structuredClone(confirmed);
  for (const command of commands) {
    if (command.schemaVersion !== '1.0.0' || command.payloadVersion !== '1.0.0') throw new Error('نسخة الإجراء المحفوظ غير مدعومة؛ لم تُحذف الأدلة.');
    if (!offlineOperations.has(command.operationId)) continue;
    assertContinuation(state, command);
    const p = command.payload, time = { actionId: command.actionId, observation: command.observation, recordedAt: command.observation.observedAt! };
    state.revision++;
    if (command.operationId === 'current.selectHeading') state.currentActivity = { taskId: String(p.taskId), attemptId: String(p.attemptId), revision: state.revision, stage: 'heading', heading: time, arrival: null };
    else if (command.operationId === 'current.recordArrival') state.currentActivity = { ...state.currentActivity!, revision: state.revision, stage: 'arrived', arrival: time };
    else { state.targets = state.targets.filter(target => target.attemptId !== p.attemptId); state.currentActivity = null; state.nextSuggestion = null; }
  }
  return state;
}

export async function storageReadiness() {
  let persisted = false;
  try { persisted = await navigator.storage?.persist?.() ?? false; } catch { /* denied is an honest best-effort state */ }
  // A committed write probe; it cannot promise room for future work or prevent eviction.
  await localWork.transaction('rw', localWork.health, async () => {
    await localWork.health.put({ id: 'storage-probe', value: 'tawsel-local-v1' });
    await localWork.health.delete('storage-probe');
  });
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  return { persisted, usage: estimate?.usage, quota: estimate?.quota };
}
