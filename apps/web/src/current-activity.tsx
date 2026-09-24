import { ExceptionEditor } from './exception-editor';
import type { Replacement } from './execution-result';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MapPin, RefreshCw } from 'lucide-react';
import type { components } from '@tawsel/api-client';
import { CurrentClient } from '@tawsel/api-client/src/current';
import { DevicesClient } from '@tawsel/api-client/src/devices';
import { OutcomesClient } from '@tawsel/api-client/src/outcomes';
import { RoundsClient } from '@tawsel/api-client/src/rounds';
import { ActiveRouteMap } from './components/active-route-map';
import { ActionButton, ContactActions, ProgressSummary, StatusNotice, StopIdentity } from './components/ui';
import { api, deviceId, nextSequence } from './independent-tasks';

type Snapshot = components['schemas']['CurrentSnapshot'];
type Target = Snapshot['targets'][number];
type CurrentCommand = components['schemas']['CurrentSelectHeadingCommand'] | components['schemas']['CurrentArrivalCommand'];
type OutcomeCommand = components['schemas']['OutcomeFullCommand'] | components['schemas']['OutcomeNoAnswerCommand'] | components['schemas']['OutcomePartialCommand'] | components['schemas']['OutcomeRefusalCommand'];
type TakeoverCommand = components['schemas']['DeviceTakeoverCommand'];
type Pending = { kind: 'current'; command: CurrentCommand } | { kind: 'outcome'; command: OutcomeCommand } | { kind: 'takeover'; command: TakeoverCommand };
type Context = components['schemas']['SessionContext'];
type OutcomeSnapshot = components['schemas']['OutcomeSnapshot'];

const egp = new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 });
const amountLabel = (amount: { amountMinor: number } | null) => amount ? egp.format(amount.amountMinor / 100) : '';

function envelope(context: Context, state: Snapshot, target: Target, operationId: CurrentCommand['operationId'] | OutcomeCommand['operationId'], snapshotToken: string | null) {
  return {
    schemaVersion: '1.0.0' as const, payloadVersion: '1.0.0' as const, actionId: crypto.randomUUID(), operationId,
    context: { kind: 'device' as const, tenantId: context.access.tenantId, accountId: context.access.sourceId, deviceId: deviceId(), deviceGeneration: state.owner.generation, deviceSequence: nextSequence(), ...(snapshotToken ? { snapshotToken } : {}) },
    resources: { tripId: state.roundId, taskId: target.taskId, attemptId: target.attemptId }, baseVersions: {}, dependsOnActionIds: [],
    observation: { observedAt: new Date().toISOString(), clock: { quality: 'uncertain' as const } },
    payload: { roundId: state.roundId, taskId: target.taskId, attemptId: target.attemptId, expectedActivityRevision: state.revision, expectedCurrentAttemptId: state.currentActivity?.attemptId ?? null, expectedSourceRevision: target.sourceRevision, expectedAssignmentRevision: target.assignmentRevision, expectedPinRevision: target.pinRevision }
  };
}

export function CurrentActivityPage() {
  const kind = new URLSearchParams(window.location.search).get('kind') === 'company' ? 'company' : 'personal';
  const currentClient = useMemo(() => new CurrentClient(kind), [kind]);
  const outcomeClient = useMemo(() => new OutcomesClient(kind), [kind]);
  const devicesClient = useMemo(() => new DevicesClient(kind), [kind]);
  const [context, setContext] = useState<Context | null>(null), [state, setState] = useState<Snapshot | null>(null), [outcomes, setOutcomes] = useState<OutcomeSnapshot | null>(null);
  const [selected, setSelected] = useState(''), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [externalFeedback, setExternalFeedback] = useState(''), [pending, setPending] = useState<Pending | null>(null);
  const [snapshotToken, setSnapshotToken] = useState<string | null>(null), [snapshotRequired, setSnapshotRequired] = useState(false);
  const [exception, setException] = useState<'partial' | 'refused' | null>(null);
  const pendingKey = useRef(''), inFlight = useRef(false), headingRef = useRef<HTMLHeadingElement>(null);
  const discardPending = useCallback((key = pendingKey.current) => { if (key) sessionStorage.removeItem(key); setPending(null); }, []);

  const recover = useCallback(async (saved: Pending, key: string, roundId: string) => {
    setPending(saved);
    if (saved.kind === 'current') {
      const status = await currentClient.result(saved.command.actionId); if (status.status === 'pending') return; discardPending(key);
      if (status.status === 'accepted') setSuccess('أكّد الخادم الإجراء السابق.'); else setError(status.result.receipt.problem?.detail ?? 'لم يُقبل الإجراء السابق.');
    } else if (saved.kind === 'outcome') {
      const status = await outcomeClient.result(saved.command.actionId); if (status.status === 'pending') return; discardPending(key);
      if (status.status === 'accepted') setSuccess('تم تأكيد نتيجة العميل من الخادم. المحطة التالية لم يبدأ الاتجاه إليها.'); else setError(status.result.receipt.problem?.detail ?? 'لم تُقبل النتيجة.');
    } else {
      const status = await devicesClient.result(saved.command.actionId); if (status.status === 'pending') return;
      if (status.status !== 'accepted') { discardPending(key); setError(status.result.receipt.problem?.detail ?? 'لم يُقبل نقل التنفيذ.'); return; }
      const snapshot = await devicesClient.snapshot(roundId, deviceId());
      if (snapshot.context.mode === 'owner' && snapshot.context.roundState === 'active' && snapshot.snapshotToken) { sessionStorage.setItem(`tawsel:owner-snapshot:${roundId}:${deviceId()}`, snapshot.snapshotToken); setSnapshotToken(snapshot.snapshotToken); discardPending(key); setSuccess('اكتمل نقل التنفيذ وتحميل الحالة المؤكدة لهذا الهاتف.'); }
      else setError('قُبل طلب سابق، لكن هذا الهاتف لم يعد المالك. حدّث الحالة قبل أي كتابة.');
    }
  }, [currentClient, devicesClient, discardPending, outcomeClient]);

  const refresh = useCallback(async () => {
    const session = await api(`/api/session/context?kind=${kind}`) as Context; setContext(session);
    const round = (await new RoundsClient(kind).current()).round;
    if (!round) { setState(null); setOutcomes(null); setLoaded(true); return; }
    const key = `tawsel:delivery-pending:${session.access.tenantId}:${session.access.sourceId}:${round.roundId}:${deviceId()}`; pendingKey.current = key;
    const savedValue = sessionStorage.getItem(key);
    if (savedValue) { try { await recover(JSON.parse(savedValue) as Pending, key, round.roundId); } catch { setError('تعذر التحقق من الإجراء المحفوظ. سيبقى بنفس المعرّف حتى عودة الاتصال.'); } }
    const ownership = await devicesClient.context(round.roundId, deviceId()); setSnapshotRequired(ownership.snapshotRequired);
    let confirmedToken = sessionStorage.getItem(`tawsel:owner-snapshot:${round.roundId}:${deviceId()}`);
    if (ownership.mode === 'owner' && ownership.snapshotRequired) {
      const confirmed = await devicesClient.snapshot(round.roundId, deviceId()); confirmedToken = confirmed.snapshotToken;
      if (!confirmedToken) throw new Error('تعذر تحميل رمز الحالة المؤكدة لهذا الهاتف.'); sessionStorage.setItem(`tawsel:owner-snapshot:${round.roundId}:${deviceId()}`, confirmedToken);
    }
    setSnapshotToken(confirmedToken);
    const [next, result] = await Promise.all([currentClient.read(round.roundId), outcomeClient.read(round.roundId)]); setState(next); setOutcomes(result);
    setSelected(previous => next.targets.some(target => target.taskId === previous) ? previous : next.currentActivity?.taskId ?? next.nextSuggestion?.taskId ?? next.targets[0]?.taskId ?? ''); setLoaded(true);
  }, [currentClient, devicesClient, kind, outcomeClient, recover]);
  useEffect(() => { void refresh().catch(failure => { setError(failure instanceof Error ? failure.message : 'تعذر تحميل الجولة.'); setLoaded(true); }); }, [refresh]);

  const execute = useCallback(async (item: Pending) => {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError(''); setSuccess(''); let completed = false;
    try {
      sessionStorage.setItem(pendingKey.current, JSON.stringify(item)); setPending(item);
      if (item.kind === 'current') {
        const result = item.command.operationId === 'current.selectHeading' ? await currentClient.heading(item.command) : await currentClient.arrival(item.command);
        if (result.receipt.businessStatus !== 'accepted') throw Object.assign(new Error(result.receipt.problem?.detail ?? 'لم يُقبل الإجراء.'), { terminal: true });
      } else if (item.kind === 'outcome') {
        const result = item.command.operationId === 'outcome.recordFull' ? await outcomeClient.full(item.command) : item.command.operationId === 'outcome.recordPartial' ? await outcomeClient.partial(item.command) : item.command.operationId === 'outcome.recordRefusal' ? await outcomeClient.refusal(item.command) : await outcomeClient.noAnswer(item.command);
        if (result.receipt.businessStatus !== 'accepted') throw Object.assign(new Error(result.receipt.problem?.detail ?? 'لم تُقبل النتيجة.'), { terminal: true });
        setSuccess(item.command.operationId === 'outcome.recordFull' ? 'تم تأكيد التسليم والتحصيل من الخادم. المحطة التالية اقتراح فقط.' : item.command.operationId !== 'outcome.recordNoAnswer' ? 'تم تأكيد النتيجة والتحصيل من الخادم؛ السجل محفوظ.' : 'تم تسجيل عدم الرد من الخادم دون وصول أو رسوم أو عدّاد مكالمات.');
      } else {
        const result = await devicesClient.continueOnThisPhone(item.command);
        if (result.result.receipt.businessStatus !== 'accepted' || result.snapshot?.context.mode !== 'owner') throw Object.assign(new Error(result.result.receipt.problem?.detail ?? 'لم يكتمل نقل التنفيذ وتحميل الحالة.'), { terminal: result.result.receipt.businessStatus !== 'accepted' });
        if (!result.snapshot.snapshotToken) throw new Error('لم يصل رمز الحالة المؤكدة؛ التنفيذ ما زال معطّلًا.');
        sessionStorage.setItem(`tawsel:owner-snapshot:${item.command.payload.roundId}:${deviceId()}`, result.snapshot.snapshotToken); setSnapshotToken(result.snapshot.snapshotToken);
        setSuccess('اكتمل نقل التنفيذ وتحميل الحالة المؤكدة لهذا الهاتف.');
      }
      completed = true; setException(null); discardPending(); await refresh(); headingRef.current?.focus();
    } catch (failure) {
      if (completed) setError('قُبل الإجراء، لكن تعذر تحديث العرض. حدّث الجولة لعرض الحالة المؤكدة.');
      else if (failure instanceof Error && 'terminal' in failure && failure.terminal) { discardPending(); setError(failure.message); }
      else setError('لم يتأكد حفظ الإجراء. تحقّق أو أعد إرسال الطلب نفسه؛ لم ننشئ إجراءً جديدًا.');
    } finally { inFlight.current = false; setBusy(false); }
  }, [currentClient, devicesClient, discardPending, outcomeClient, refresh]);

  const target = state?.targets.find(item => item.taskId === selected), current = state?.currentActivity;
  const same = current?.taskId === target?.taskId, owner = Boolean(state && state.owner.accountId === context?.access.sourceId && state.owner.deviceId === deviceId());
  const canWrite = owner && (!snapshotRequired || Boolean(snapshotToken));
  const selectTarget = useCallback((taskId: string) => { if (!busy && !pending && owner) setSelected(taskId); }, [busy, owner, pending]);
  const move = () => { if (!state || !context || !target || pending) return; const arrival = same && current?.stage === 'heading'; void execute({ kind: 'current', command: envelope(context, state, target, arrival ? 'current.recordArrival' : 'current.selectHeading', snapshotToken) as CurrentCommand }); };
  const recordOutcome = (operationId: OutcomeCommand['operationId']) => {
    if (!state || !context || !target || pending) return; const base = envelope(context, state, target, operationId, snapshotToken);
    const command = operationId === 'outcome.recordFull' ? { ...base, payload: { ...base.payload, ...(target.delivery.fullCollection ? { reportedCollection: target.delivery.fullCollection } : {}) } } : base;
    void execute({ kind: 'outcome', command: command as OutcomeCommand });
  };
  const saveException = (replacement: Replacement) => {
    if (!state || !context || !target || pending || !canWrite) return;
    const operationId = replacement.outcome === 'partial' ? 'outcome.recordPartial' : 'outcome.recordRefusal';
    const base = envelope(context, state, target, operationId, snapshotToken);
    const { outcome: _, ...fields } = replacement; void _;
    void execute({ kind: 'outcome', command: { ...base, payload: { ...base.payload, ...fields } } as OutcomeCommand });
  };
  const takeOver = () => {
    if (!state || !context || pending) return;
    const command: TakeoverCommand = { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: crypto.randomUUID(), operationId: 'device.takeOver', context: { kind: 'device', tenantId: context.access.tenantId, accountId: context.access.sourceId, deviceId: deviceId(), deviceGeneration: state.owner.generation, deviceSequence: nextSequence() }, resources: { tripId: state.roundId }, baseVersions: { deviceGeneration: state.owner.generation }, dependsOnActionIds: [], observation: { observedAt: new Date().toISOString(), clock: { quality: 'uncertain' } }, payload: { roundId: state.roundId, expectedGeneration: state.owner.generation } };
    void execute({ kind: 'takeover', command });
  };
  const total = (outcomes?.progress.processed ?? 0) + (state?.targets.length ?? 0);

  const editor = exception && target && context ? <ExceptionEditor key={`${target.attemptId}:${exception}`} mode={exception} delivery={target.delivery} draftKey={`tawsel:exception:${context.access.tenantId}:${context.access.sourceId}:${target.attemptId}:${target.sourceRevision}:${exception}`} disabled={!canWrite || Boolean(pending)} busy={busy} error={error} pending={Boolean(pending)} onClose={() => { setException(null); requestAnimationFrame(() => document.getElementById('task-options')?.focus()); }} onSave={saveException} /> : null;
  if (exception === 'partial') return editor;
  return <main className="tasks-shell current-shell" dir="rtl"><header className="tasks-header"><div><p className="eyebrow">توصيل · جولتك</p><h1 ref={headingRef} tabIndex={-1}>المحطة الحالية</h1><p>{current?.stage === 'arrived' ? 'الوصول مسجّل؛ أكّد التسليم والتحصيل مرة واحدة.' : current ? 'أكّد الوصول عند العميل، أو سجّل عدم الرد دون اختلاق وصول.' : 'اختر المحطة ثم ابدأ الاتجاه إليها صراحةً.'}</p></div><MapPin aria-hidden="true" /></header>
    {error ? <StatusNotice tone="error" title="تحتاج الجولة مراجعة" live>{error}</StatusNotice> : null}{success ? <StatusNotice tone="success" title="تأكيد من الخادم" live>{success}</StatusNotice> : null}
    {externalFeedback ? <StatusNotice title="تم فتح تطبيق خارجي" live>{externalFeedback} لم نسجّل اتجاهًا أو وصولًا أو نجاح تواصل.</StatusNotice> : null}
    {pending ? <StatusNotice tone="waiting" title="إجراء ينتظر التأكيد" live>المعرّف والطلب محفوظان لهذه الجلسة فقط. <ActionButton busy={busy} onClick={() => void execute(pending)}>تحقّق وأعد إرسال الطلب نفسه</ActionButton></StatusNotice> : null}
    {!loaded ? <StatusNotice title="جارٍ تحميل الجولة" /> : !state ? (!error ? <StatusNotice title="لا توجد جولة نشطة">ابدأ جولة متزامنة أولًا من تجهيز العمل.</StatusNotice> : null) : <>
      {outcomes ? <ProgressSummary processed={outcomes.progress.processed} total={total} delivered={outcomes.progress.full} held={outcomes.progress.heldReturnRequiredPieces} /> : null}
      {!owner ? <StatusNotice tone="waiting" title="الجولة تعمل على هاتف آخر">العرض للمتابعة فقط. انقل التنفيذ وحمّل الحالة المؤكدة قبل أي كتابة.<ActionButton variant="secondary" busy={busy} disabled={Boolean(pending)} onClick={takeOver}>انقل التنفيذ لهذا الهاتف</ActionButton></StatusNotice> : null}
      <ActiveRouteMap targets={state.targets} selectedTaskId={selected} currentAttemptId={current?.attemptId} onSelect={selectTarget} disabled={busy || Boolean(pending) || !owner} />
      {target ? <section className="current-stage-card" aria-label="تفاصيل المحطة"><StopIdentity recipientName={target.recipientName} phone={target.recipientPhone} address={target.address ?? 'نقطة التوصيل مؤكّدة على الخريطة'} stageLabel={same ? current?.stage === 'arrived' ? 'وصلت للعميل' : 'متجه للعميل' : 'محطة محددة — لم يبدأ الاتجاه'} /><ContactActions phone={target.recipientPhone} coordinates={target.coordinates} onExternalOpen={label => setExternalFeedback(`فتحت ${label}.`)} />
        {target.delivery.fullCollection ? <div className="collection-due"><span>المطلوب عند التسليم الكامل</span><strong><bdi>{amountLabel(target.delivery.fullCollection)}</bdi></strong>{target.delivery.kind === 'company' ? <small>البضاعة {amountLabel(target.delivery.goodsDue)} · الشحن {amountLabel(target.delivery.shippingDue)}</small> : <small>مبلغ اختياري حُفظ مع مهمة الحساب المستقل.</small>}</div> : <div className="collection-due collection-due--none"><span>التسليم الكامل</span><strong>بدون تحصيل</strong></div>}
        {!same || current?.stage !== 'arrived' ? <ActionButton onClick={move} busy={busy} disabled={!canWrite || Boolean(pending)}>{same ? 'وصلت' : 'اتجه للعميل'}</ActionButton> : <ActionButton onClick={() => recordOutcome('outcome.recordFull')} busy={busy} disabled={!canWrite || Boolean(pending)}><CheckCircle2 aria-hidden="true" />{target.delivery.fullCollection ? `تأكيد التسليم وتحصيل ${amountLabel(target.delivery.fullCollection)}` : 'تأكيد التسليم الكامل'}</ActionButton>}
        <details className="current-secondary"><summary id="task-options">خيارات المهمة</summary><div className="context-actions"><a className="edit-link" href={`/execution/options?kind=${kind}&roundId=${state.roundId}&taskId=${target.taskId}`}>التأجيل والأولوية والسجل</a>{target.delivery.allowedActions.includes('partial') ? <ActionButton variant="secondary" disabled={!canWrite || busy || Boolean(pending)} onClick={() => { setError(''); setException('partial'); }}>تسليم بعض القطع</ActionButton> : null}{target.delivery.allowedActions.includes('refusal') ? <ActionButton variant="secondary" disabled={!canWrite || busy || Boolean(pending)} onClick={() => { setError(''); setException('refused'); }}>رفض الاستلام</ActionButton> : null}</div></details>
        {same && current?.stage === 'heading' && target.delivery.allowedActions.includes('no-answer') ? <button className="outcome-secondary" type="button" disabled={!canWrite || busy || Boolean(pending)} onClick={() => recordOutcome('outcome.recordNoAnswer')}>لم يرد العميل</button> : null}
      </section> : <StatusNotice title="لا توجد محطة متاحة الآن">حدّث الجولة للتحقق من العمل المتاح.</StatusNotice>}
      {!current && state.nextSuggestion ? <StatusNotice title="التالي مقترح فقط">{state.nextSuggestion.recipientName} ظاهر للمراجعة. اضغط «اتجه للعميل» لبدء الحركة صراحةً.</StatusNotice> : null}
      <a className="edit-link" href={`/execution/options?kind=${kind}&roundId=${state.roundId}`}>العمل المؤجل والنتائج السابقة</a>
      <aside className="current-next" aria-label="الاقتراح التالي"><span className="eyebrow">التالي المقترح</span><p>{state.nextSuggestion?.recipientName ?? 'لا يوجد اقتراح آخر حاليًا'}</p><small>{state.planning.updating ? 'الترتيب قيد التحديث؛ المحطة الحالية محفوظة.' : 'اقتراح للترتيب؛ لم يبدأ الاتجاه إليه.'}</small></aside>
      <details className="current-secondary"><summary>نقطة الانطلاق المستخدمة</summary><p>{state.physicalOrigin?.kind === 'last-confirmed-stop' ? 'آخر وصول سجّلته' : state.physicalOrigin ? 'نقطة حدّدتها يدويًا' : 'نقطة تجهيز الجولة'}</p><bdi dir="ltr">{state.planningOrigin.coordinates.latitude}, {state.planningOrigin.coordinates.longitude}</bdi></details>
    </>}
    {editor}
    <ActionButton variant="quiet" disabled={busy} onClick={() => { setError(''); void refresh().catch(() => setError('تعذر تحديث الجولة؛ الحالة المعروضة هي آخر ما تم تحميله.')); }}><RefreshCw aria-hidden="true" />تحديث الجولة</ActionButton>
  </main>;
}
