import { useEffect, useMemo, useState } from 'react';
import type { components } from '@tawsel/api-client';
import { SyncClient } from '@tawsel/api-client/src/sync';
import { DevicesClient } from '@tawsel/api-client/src/devices';
import { CorrectionsClient } from '@tawsel/api-client/src/corrections';
import { ActionButton, StatusNotice } from './components/ui';
import { deviceId } from './independent-tasks';
import { localWork } from './local-work';
import { executionEnvelope, useExecutionCommand } from './execution-command';
import { replaySelected, replayErrorMessage } from './replay-runtime';

type S = components['schemas'];
export function ConflictsPage() {
  const kind = new URLSearchParams(location.search).get('kind') === 'company' ? 'company' : 'personal';
  const sync = useMemo(() => new SyncClient(kind), [kind]), devices = useMemo(() => new DevicesClient(kind), [kind]), corrections = useMemo(() => new CorrectionsClient(kind), [kind]);
  const [session, setSession] = useState<S['SessionContext'] | null>(null), [items, setItems] = useState<S['DeviceEvidence'][]>([]), [selected, setSelected] = useState<S['DeviceEvidence'] | null>(null), [next, setNext] = useState<string | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const key = session ? `tawsel:correction:${session.access.tenantId}:${session.access.sourceId}:evidence:${deviceId()}` : '';
  const command = useExecutionCommand<S['DeviceAdoptionCommand'], S['CorrectionActionResult']>(key, c => corrections.adopt(c), id => corrections.result(id));
  async function load(cursor?: string) {
    setBusy(true); setError('');
    try {
      const context = await sync.session(); await localWork.select(context, deviceId()); setSession(context);
      const page = await sync.conflicts(deviceId(), cursor); setItems(previous => cursor ? [...previous, ...page.items] : page.items); setNext(page.nextActionId);
      if (selected) setSelected(await devices.evidence(selected.actionId, deviceId()));
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحميل السجل.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  async function adopt() {
    if (!session || !selected?.envelope) return;
    setBusy(true); setError('');
    try {
      const evidence = await devices.evidence(selected.actionId, deviceId()); setSelected(evidence);
      if (evidence.recovery.state !== 'requires-validation' || !evidence.envelope) throw new Error('تغيّرت إمكانية الاعتماد؛ راجع السبب الظاهر.');
      const roundId = String(evidence.envelope.payload.roundId), snapshot = await devices.snapshot(roundId, deviceId());
      if (snapshot.context.mode !== 'owner' || !snapshot.current || snapshot.context.workdayState !== 'open') throw new Error('افتح الجولة على الهاتف المالك؛ اليوم يجب أن يكون مفتوحًا.');
      if (snapshot.snapshotToken) sessionStorage.setItem(`tawsel:owner-snapshot:${roundId}:${deviceId()}`, snapshot.snapshotToken);
      const p = evidence.envelope.payload;
      const c: S['DeviceAdoptionCommand'] = { ...executionEnvelope(session, roundId, snapshot.context.owner.generation), operationId: 'evidence.adoptCompatible', payload: { roundId, evidenceActionId: evidence.actionId, evidenceReceiptId: evidence.result.receipt.receiptId, expectedGeneration: snapshot.context.owner.generation, expectedActivityRevision: snapshot.current.revision, expectedOutcomeRevision: evidence.recovery.effectiveOutcomeRevision, expectedSourceRevision: Number(p.expectedSourceRevision), expectedAssignmentRevision: Number(p.expectedAssignmentRevision), expectedPinRevision: Number(p.expectedPinRevision) } };
      await command.execute(c); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر اعتماد الدليل.'); }
    finally { setBusy(false); }
  }
  const labels: Record<string, string> = { 'closed-workday': 'اليوم مغلق.', 'dependent-receipt': 'يوجد استلام فعلي مرتبط.', 'not-current-owner': 'التنفيذ على هاتف آخر.', 'unsupported-operation': 'هذا السجل محفوظ كدليل فقط.', 'already-adopted': 'اعتُمدت النتيجة بالفعل.', 'unresolved-dependency': 'يجب مراجعة دليل سابق أولًا.', 'changed-assignment': 'تغيّر الإسناد.', 'changed-source': 'تغيّرت بيانات المهمة.', 'changed-attempt': 'تغيّرت المحاولة.', 'changed-pin': 'تغيّرت نقطة التوصيل.', 'ended-round': 'الجولة انتهت.', 'claimed-handover': 'توجد عملية تسليم للفرع مرتبطة.', 'correction-not-authorized': 'الاعتماد غير مسموح لهذا الحساب.', 'unknown-generation': 'جيل الهاتف غير معروف.', 'dependent-redispatch': 'أُعيد إرسال البضاعة.' };
  return <main className="tasks-shell" dir="rtl"><a href={'/rounds/current?kind=' + kind}>العودة للجولة</a><h1>المزامنة والمراجعة</h1><p>وصول الدليل لا يعني قبول النتيجة. راجع نتيجة واحدة قبل اعتمادها.</p>
    {error ? <StatusNotice tone="error" title="تحتاج المزامنة مراجعة">{error}</StatusNotice> : null}
    {command.message ? <StatusNotice title="حالة الاعتماد">{command.message}</StatusNotice> : null}
    {command.pending ? <ActionButton busy={command.busy} onClick={() => void command.execute().then(() => load())}>تحقّق من الاعتماد المحفوظ</ActionButton> : null}
    {selected ? <section className="current-stage-card"><h2>{selected.envelope?.operationId.startsWith('outcome.record') ? 'نتيجة محفوظة من الهاتف السابق' : 'دليل إجراء محفوظ'}</h2><p><strong>{selected.taskLabel}</strong></p><p>{selected.result.receipt.problem?.detail}</p>
      <p>{selected.recovery.constraints.map(c => labels[c]).join(' ')}</p>
      {selected.envelope?.operationId.startsWith('outcome.record') ? <><p>النتيجة: {({ 'outcome.recordFull': 'تسليم كامل', 'outcome.recordPartial': 'تسليم بعض القطع', 'outcome.recordRefusal': 'رفض الاستلام', 'outcome.recordNoAnswer': 'لم يرد العميل' } as Record<string, string>)[selected.envelope.operationId]}</p><p>التحصيل المبلّغ: {selected.envelope.payload.reportedCollection ? Number((selected.envelope.payload.reportedCollection as { amountMinor: number }).amountMinor) / 100 + ' جنيه' : 'بدون تحصيل'}</p>{Array.isArray(selected.envelope.payload.pieces) ? <p>القطع المسلّمة: {(selected.envelope.payload.pieces as Array<{ delivered: number }>).reduce((n, p) => n + p.delivered, 0)}</p> : null}</> : null}
      {selected.recovery.state === 'requires-validation' ? <ActionButton busy={busy || command.busy} disabled={Boolean(command.pending)} onClick={() => void adopt()}>اعتماد هذه النتيجة بعد المراجعة</ActionButton> : null}
      <ActionButton variant="quiet" onClick={() => setSelected(null)}>العودة للأدلة</ActionButton></section> : items.map(item => <article className="piece-row" key={item.actionId}><p>{item.recovery.adoptedOutcomeId ? 'نتيجة اعتُمدت؛ أصل الدليل محفوظ' : item.envelope?.operationId.startsWith('outcome.record') ? 'نتيجة تحتاج مراجعة' : 'دليل إجراء لم يُطبّق'}</p><p><strong>{item.taskLabel}</strong></p><p>{new Date(item.result.receipt.receivedAt).toLocaleString('ar-EG')}</p><ActionButton variant="secondary" onClick={() => setSelected(item)}>مراجعة الدليل</ActionButton></article>)}
    {!items.length && !busy ? <p>لا توجد أدلة مستلمة تحتاج مراجعة.</p> : null}
    {next && !selected ? <ActionButton variant="secondary" busy={busy} onClick={() => void load(next)}>عرض المزيد</ActionButton> : null}
    <ActionButton variant="secondary" busy={busy} onClick={() => { setBusy(true); void replaySelected(kind).then(() => load()).catch(e => { setError(replayErrorMessage(e)); setBusy(false); }); }}>إعادة المزامنة</ActionButton>
    <a className="edit-link" href={'/local-work?kind=' + kind}>الإجراءات المحفوظة على الهاتف</a>
  </main>;
}
