import { useEffect, useMemo, useState } from 'react';
import type { components } from '@tawsel/api-client';
import { CorrectionsClient } from '@tawsel/api-client/src/corrections';
import { ActionButton, StatusNotice } from './components/ui';
import { api, deviceId } from './independent-tasks';
import { confirmedExecutionOwner, executionEnvelope, useExecutionCommand } from './execution-command';
import { amountLabel, proposedResult, ResultFields, resultNames, type ResultDraft } from './execution-result';

type S = components['schemas'];
function RecordedResult({ title, value }: { title: string; value: S['OutcomeRecord'] | null }) {
  return <article className="piece-row"><h2>{title}</h2>{value ? <><strong>{resultNames[value.outcome]}</strong><p>المراجعة {value.revision} · {amountLabel(value.collection.reported)}</p>{value.kind === 'company' ? <p>المسلّم {value.lines.reduce((n, line) => n + line.delivered, 0)} · للإرجاع وقت التسجيل {value.lines.reduce((n, line) => n + line.heldReturnRequired, 0)}{value.collection.unpaidShipping.amountMinor ? ` · شحن غير مدفوع ${amountLabel(value.collection.unpaidShipping)}` : ''}</p> : null}<p>{new Date(value.time.recordedAt).toLocaleString('ar-EG')}</p></> : <p>لا تتوفر هذه النتيجة في القراءة الحالية.</p>}</article>;
}

export function CorrectionPage() {
  const params = new URLSearchParams(location.search), kind = params.get('kind') === 'company' ? 'company' : 'personal', attemptId = params.get('attemptId') ?? '';
  const client = useMemo(() => new CorrectionsClient(kind), [kind]);
  const [session, setSession] = useState<S['SessionContext'] | null>(null), [availability, setAvailability] = useState<S['CorrectionAvailability'] | null>(null), [owner, setOwner] = useState<S['DeviceContext'] | null>(null), [error, setError] = useState('');
  const [draft, setDraft] = useState<ResultDraft | null>(null), [baseRevision, setBaseRevision] = useState(0), [draftKey, setDraftKey] = useState('');
  const key = draftKey ? `${draftKey}:command:${deviceId()}` : '';
  const command = useExecutionCommand<S['CorrectionCorrectCommand'], S['CorrectionActionResult']>(key, value => client.correct(value), id => client.result(id));
  async function load(initial = false) {
    try {
      const context = await api(`/api/session/context?kind=${kind}`) as S['SessionContext']; setSession(context);
      const next = await client.availability(attemptId, deviceId()); setAvailability(next);
      const ownership = await confirmedExecutionOwner(kind, next.executionRoundId ?? next.roundId); setOwner(ownership);
      const storageKey = `tawsel:correction:${context.access.tenantId}:${context.access.sourceId}:${attemptId}`; setDraftKey(storageKey);
      if (initial) {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
        setDraft(saved?.draft ?? { outcome: next.effectiveOutcome?.outcome ?? 'full', quantities: Object.fromEntries(next.effectiveOutcome?.lines.map(line => [line.sourceLineId, String(line.delivered)]) ?? []), unpaid: next.effectiveOutcome?.collection.shippingStatus === 'explicitly-unpaid' });
        setBaseRevision(saved?.baseRevision ?? next.effectiveOutcomeRevision);
      }
      setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر تحميل التصحيح.'); }
  }
  useEffect(() => { void load(true); }, []);
  useEffect(() => { if (draftKey && draft) sessionStorage.setItem(draftKey, JSON.stringify({ draft, baseRevision })); }, [draftKey, draft, baseRevision]);
  const stale = Boolean(availability && baseRevision !== availability.effectiveOutcomeRevision);
  const executionRoundId = availability?.executionRoundId ?? availability?.roundId ?? '';
  const mayEdit = availability?.allowed && owner?.mode === 'owner' && (!owner.snapshotRequired || Boolean(sessionStorage.getItem(`tawsel:owner-snapshot:${executionRoundId}:${deviceId()}`)));
  const preview = draft && availability?.delivery ? proposedResult(availability.delivery, draft) : null;
  async function submit() {
    if (!session || !availability || !owner || !mayEdit || stale || command.pending || !preview?.replacement) return;
    const value: S['CorrectionCorrectCommand'] = { ...executionEnvelope(session, executionRoundId, owner.owner.generation), operationId: 'outcome.correct', resources: { tripId: availability.roundId, taskId: availability.taskId, attemptId }, payload: { roundId: availability.roundId, taskId: availability.taskId, attemptId, expectedOutcomeRevision: baseRevision, replacement: preview.replacement } };
    const accepted = await command.execute(value);
    if (accepted) { sessionStorage.removeItem(draftKey); await load(true); } else await load();
  }
  return <main className="tasks-shell exception-page" dir="rtl"><a href={availability ? `/execution/options?kind=${kind}&roundId=${availability.roundId}&taskId=${availability.taskId}` : `/rounds/current?kind=${kind}`}>العودة للسجل</a><h1>تصحيح خطأ التسجيل</h1><p>راجع الأصل والنتيجة الحالية. التصحيح يحفظ السجل ولا يغيّر أسعار المصدر.</p>
    {error ? <StatusNotice tone="error" title="تعذر تحديث التصحيح">{error}</StatusNotice> : null}
    {command.review ? <StatusNotice tone="error" title="لم يُقبل التصحيح؛ الدليل محفوظ للمراجعة">{command.review.result.receipt.problem?.detail ?? 'راجع النتيجة الحالية.'}</StatusNotice> : command.message ? <StatusNotice title="حالة التصحيح">{command.message}</StatusNotice> : null}
    {command.review ? <details className="current-secondary"><summary>دليل الطلب المحفوظ</summary><bdi dir="ltr">{command.review.command.actionId}</bdi><p>يمكن الرجوع لهذا الطلب دون تغيير النتيجة الأصلية.</p></details> : null}
    {command.pending ? <StatusNotice tone="waiting" title="التصحيح ينتظر التأكيد">الطلب محفوظ بنفس المعرّف. <ActionButton busy={command.busy} onClick={() => void command.execute().then(ok => { if (ok && draftKey) sessionStorage.removeItem(draftKey); void load(ok); })}>تحقّق من التصحيح المحفوظ</ActionButton></StatusNotice> : null}
    {availability ? <><RecordedResult title="النتيجة الأصلية" value={availability.originalOutcome ?? null} /><RecordedResult title="النتيجة الفعالة الآن" value={availability.effectiveOutcome} />
      {!mayEdit && !command.review ? <StatusNotice tone="waiting" title="التصحيح غير متاح الآن">{availability.message}{owner?.mode !== 'owner' || (owner.snapshotRequired && !sessionStorage.getItem(`tawsel:owner-snapshot:${executionRoundId}:${deviceId()}`)) ? ' افتح الجولة على الهاتف المالك وحمّل الحالة المؤكدة.' : ''}</StatusNotice> : null}
      {stale ? <StatusNotice tone="waiting" title="تغيّرت النتيجة أثناء التحرير">مسودتك محفوظة؛ قارنها بالنتيجة الفعالة قبل المتابعة.<ActionButton variant="secondary" disabled={!mayEdit || Boolean(command.pending)} onClick={() => setBaseRevision(availability.effectiveOutcomeRevision)}>راجعت النتيجة الحالية؛ احتفظ بمسودتي</ActionButton></StatusNotice> : null}
      {availability.delivery && draft ? <section aria-label="التصحيح المقترح"><h2>التصحيح المقترح</h2><fieldset disabled={!mayEdit || command.busy || Boolean(command.pending)} className="correction-fields"><ResultFields delivery={availability.delivery} draft={draft} onChange={setDraft} choose /></fieldset><ActionButton busy={command.busy} disabled={!mayEdit || stale || !preview?.replacement || Boolean(command.pending)} onClick={() => void submit()}>حفظ التصحيح</ActionButton></section> : <StatusNotice title="بيانات التصحيح غير مكتملة">حدّث البيانات قبل إرسال تصحيح.</StatusNotice>}
    </> : <p role="status">جارٍ تحميل الأصل والنتيجة الحالية…</p>}
    <ActionButton variant="quiet" disabled={command.busy} onClick={() => void load()}>تحديث النتيجة والسجل</ActionButton>
    <a className="edit-link" href={availability ? `/execution/options?kind=${kind}&roundId=${availability.roundId}&taskId=${availability.taskId}` : `/rounds/current?kind=${kind}`}>إلغاء والعودة دون حفظ</a>
  </main>;
}
