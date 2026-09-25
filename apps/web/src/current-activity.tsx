import { localWork, storageReadiness, type Download, type PendingEffect, type LocalEnvelope } from './local-work';
import { downloadWork } from './download-work';
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
import { api, deviceId } from './independent-tasks';

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
    context: { kind: 'device' as const, tenantId: context.access.tenantId, accountId: context.access.sourceId, deviceId: deviceId(), deviceGeneration: state.owner.generation, deviceSequence: 1, ...(snapshotToken ? { snapshotToken } : {}) },
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
  const [download, setDownload] = useState<Download | null>(null), [effects, setEffects] = useState<PendingEffect[]>([]);
  const [readiness, setReadiness] = useState(''), [offline, setOffline] = useState(!navigator.onLine);
  const inFlight = useRef(false), headingRef = useRef<HTMLHeadingElement>(null);
  const showDownload = useCallback(async (value: Download) => {
    const next = await localWork.preview(value), local = await localWork.pendingFor(value.scope);
    setDownload(value); setContext(value.session); setState(next); setOutcomes(value.outcomes); setEffects(local);
    setSnapshotToken(value.snapshotToken); setSnapshotRequired(value.ownership.snapshotRequired); setLoaded(true);
    setSelected(previous => next.targets.some(target => target.taskId === previous) ? previous : next.currentActivity?.taskId ?? next.nextSuggestion?.taskId ?? next.targets[0]?.taskId ?? '');
  }, []);
  const refresh = useCallback(async () => {
    setPending(null);
    if (!navigator.onLine) {
      const saved = await localWork.downloaded(kind, deviceId());
      if (!saved) throw new Error('لا توجد جولة مبدوءة منزّلة لهذا الحساب والهاتف. التنزيل والبدء يحتاجان اتصالًا.');
      await showDownload(saved); return;
    }
    const session = await api('/api/session/context?kind=' + kind) as Context;
    const scope = await localWork.select(session, deviceId()); setContext(session);
    const existing = await localWork.downloaded(kind, deviceId()), local = await localWork.pendingFor(scope);
    if (existing && local.length) {
      const ownerState = await devicesClient.context(existing.roundId, deviceId());
      if (ownerState.mode !== 'owner' || ownerState.owner.generation !== existing.ownership.owner.generation || ownerState.roundState !== 'active') {
        await localWork.blockSelected(); throw new Error('تغيّرت ملكية الجولة. الدليل محفوظ على الهاتف للمراجعة؛ التنفيذ متوقف.');
      }
      // A received action may already be included in the next download. An
      // unknown response must retain its original base until explicitly checked.
      const unknown = await Promise.all(local.map(effect => localWork.acknowledgements.get([scope, effect.actionId])));
      if (unknown.some(value => !value)) { await showDownload(existing); return; }
    }
    const round = (await new RoundsClient(kind).current()).round;
    if (!round) { setState(null); setOutcomes(null); setDownload(null); setLoaded(true); await localWork.downloads.where('scope').equals(scope).delete(); return; }
    const legacyKey = 'tawsel:delivery-pending:' + session.access.tenantId + ':' + session.access.sourceId + ':' + round.roundId + ':' + deviceId();
    const legacyBytes = sessionStorage.getItem(legacyKey);
    if (legacyBytes) {
      const legacy = JSON.parse(legacyBytes) as Pending;
      // Earlier online sessions may already have sent these exact bytes. Import
      // unchanged before querying the result; never enrich/reissue under a new ID.
      await localWork.capture(scope, legacy.command, '/rounds/current?kind=' + kind, false, true);
      sessionStorage.removeItem(legacyKey);
      const status = legacy.kind === 'current' ? await currentClient.result(legacy.command.actionId) : legacy.kind === 'outcome' ? await outcomeClient.result(legacy.command.actionId) : await devicesClient.result(legacy.command.actionId);
      if (status.status !== 'pending') await localWork.acknowledge(scope, status.result);
      else if (legacy.kind === 'takeover') setPending(legacy);
    }
    const ownership = await devicesClient.context(round.roundId, deviceId());
    if (ownership.mode !== 'owner') {
      await localWork.downloads.where('scope').equals(scope).delete();
      const [next, outcome] = await Promise.all([currentClient.read(round.roundId), outcomeClient.read(round.roundId)]);
      setState(next); setOutcomes(outcome); setDownload(null); setSnapshotRequired(true); setSelected(next.targets[0]?.taskId ?? ''); setLoaded(true); return;
    }
    const value = await downloadWork(kind);
    if (value) { await showDownload(value); const ready = await storageReadiness(); setReadiness(ready.persisted ? 'الجولة منزّلة؛ التخزين المستمر مسموح.' : 'الجولة منزّلة؛ المتصفح لم يضمن الاحتفاظ بالتخزين.'); }
  }, [currentClient, devicesClient, kind, outcomeClient, showDownload]);
  const load = useCallback(async () => {
    try { await refresh(); }
    catch (failure) {
      const network = failure instanceof TypeError || (failure instanceof Error && 'code' in failure && failure.code === 'network');
      if (network || !navigator.onLine) {
        try { const saved = await localWork.downloaded(kind, deviceId()); if (saved) { await showDownload(saved); setOffline(true); return; } } catch { /* keep the original failure visible */ }
      }
      if (failure instanceof Error && 'code' in failure && ['access_disabled', 'session_expired', 'access_denied'].includes(String(failure.code))) await localWork.blockSelected();
      // A known server/account/storage failure cannot leave old write controls active.
      setDownload(null); setState(null); setContext(null); setError(failure instanceof Error ? failure.message : 'تعذر تحميل الجولة.'); setLoaded(true);
    }
  }, [kind, refresh, showDownload]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const changed = () => setOffline(!navigator.onLine); window.addEventListener('online', changed); window.addEventListener('offline', changed); return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); }; }, []);

  const execute = useCallback(async (item: Pending, retry = false) => {
    if (inFlight.current || !context) return; inFlight.current = true; setBusy(true); setError(''); setSuccess(''); let saved = false;
    try {
      const partition = await localWork.active(kind, deviceId());
      if (!partition) throw new Error('تعذر فتح تخزين هذا الحساب. المدخلات ما زالت أمامك.');
      const captured = await localWork.capture(partition.scope, item.command as LocalEnvelope, '/rounds/current?kind=' + kind, item.kind !== 'takeover', retry);
      const exact = { ...item, command: captured.envelope } as Pending;
      saved = true;
      if (download && item.kind !== 'takeover') await showDownload(download);
      setException(null);
      const dependencies = exact.command.dependsOnActionIds;
      const ready = await Promise.all(dependencies.map(id => localWork.acknowledgements.get([partition.scope, id])));
      if (offline || !navigator.onLine || ready.some(value => value?.result.receipt.businessStatus !== 'accepted')) return;
      setPending(exact);
      let result: components['schemas']['ActionResult'];
      if (exact.kind === 'current') result = exact.command.operationId === 'current.selectHeading' ? await currentClient.heading(exact.command) : await currentClient.arrival(exact.command);
      else if (exact.kind === 'outcome') result = exact.command.operationId === 'outcome.recordFull' ? await outcomeClient.full(exact.command) : exact.command.operationId === 'outcome.recordPartial' ? await outcomeClient.partial(exact.command) : exact.command.operationId === 'outcome.recordRefusal' ? await outcomeClient.refusal(exact.command) : await outcomeClient.noAnswer(exact.command);
      else result = await devicesClient.takeover(exact.command);
      await localWork.acknowledge(partition.scope, result); setPending(null);
      if (result.receipt.businessStatus !== 'accepted') { setError(result.receipt.problem?.detail ?? 'لم يُقبل الإجراء؛ الدليل محفوظ.'); await refresh(); return; }
      setSuccess(exact.kind === 'takeover' ? 'اكتمل نقل التنفيذ وتحميل الحالة المؤكدة لهذا الهاتف.' : exact.kind === 'outcome' ? exact.command.operationId === 'outcome.recordNoAnswer' ? 'تم تسجيل عدم الرد من الخادم دون وصول أو رسوم أو عدّاد مكالمات.' : 'تم تأكيد التسليم والتحصيل من الخادم. المحطة التالية اقتراح فقط.' : 'أكّد الخادم الإجراء.');
      await refresh(); headingRef.current?.focus();
    } catch (failure) {
      setError(saved ? 'الإجراء محفوظ على الهاتف؛ تعذر تأكيده أو تحديث الحالة. راجع الإجراءات المحفوظة.' : failure instanceof Error ? 'لم يُحفظ على الهاتف. ' + failure.message : 'لم يُحفظ على الهاتف؛ احتفظ بالمدخلات وحاول مجددًا.');
    } finally { inFlight.current = false; setBusy(false); }
  }, [context, currentClient, devicesClient, download, kind, offline, outcomeClient, refresh, showDownload]);
  const retryFirst = async () => {
    if (!download || !effects[0]) return;
    const unreceived = await Promise.all(effects.map(async effect => await localWork.acknowledgements.get([download.scope, effect.actionId]) ? null : effect));
    const first = unreceived.find(effect => effect !== null);
    if (!first) { await load(); return; }
    const action = await localWork.actions.get([download.scope, first.actionId]);
    if (action && (action.envelope.operationId.startsWith('current.') || action.envelope.operationId.startsWith('outcome.'))) await execute({ kind: action.envelope.operationId.startsWith('current.') ? 'current' : 'outcome', command: action.envelope } as Pending, true);
  };

  const target = state?.targets.find(item => item.taskId === selected), current = state?.currentActivity;
  const same = current?.taskId === target?.taskId, owner = Boolean(state && state.owner.accountId === context?.access.sourceId && state.owner.deviceId === deviceId());
  const canWrite = owner && Boolean(download) && (!snapshotRequired || Boolean(snapshotToken));
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
    const command: TakeoverCommand = { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: crypto.randomUUID(), operationId: 'device.takeOver', context: { kind: 'device', tenantId: context.access.tenantId, accountId: context.access.sourceId, deviceId: deviceId(), deviceGeneration: state.owner.generation, deviceSequence: 1 }, resources: { tripId: state.roundId }, baseVersions: { deviceGeneration: state.owner.generation }, dependsOnActionIds: [], observation: { observedAt: new Date().toISOString(), clock: { quality: 'uncertain' } }, payload: { roundId: state.roundId, expectedGeneration: state.owner.generation } };
    void execute({ kind: 'takeover', command });
  };
  const total = (outcomes?.progress.processed ?? 0) + (download?.current.targets.length ?? state?.targets.length ?? 0);

  const editor = exception && target && context ? <ExceptionEditor key={`${target.attemptId}:${exception}`} mode={exception} delivery={target.delivery} draftKey={`tawsel:exception:${context.access.tenantId}:${context.access.sourceId}:${target.attemptId}:${target.sourceRevision}:${exception}`} disabled={!canWrite || Boolean(pending)} busy={busy} error={error} pending={Boolean(pending)} onClose={() => { setException(null); requestAnimationFrame(() => document.getElementById('task-options')?.focus()); }} onSave={saveException} /> : null;
  if (exception === 'partial') return editor;
  return <main className="tasks-shell current-shell" dir="rtl"><header className="tasks-header"><div><p className="eyebrow">توصيل · جولتك</p><h1 ref={headingRef} tabIndex={-1}>المحطة الحالية</h1><p>{state?.branchActivity ? 'زيارة الفرع جارية؛ ترتيب العملاء محفوظ حتى الاستئناف.' : current?.stage === 'arrived' ? 'الوصول مسجّل؛ أكّد التسليم والتحصيل مرة واحدة.' : current ? 'أكّد الوصول عند العميل، أو سجّل عدم الرد دون اختلاق وصول.' : 'اختر المحطة ثم ابدأ الاتجاه إليها صراحةً.'}</p></div><MapPin aria-hidden="true" /></header>
    {error ? <StatusNotice tone="error" title="تحتاج الجولة مراجعة" live>{error}</StatusNotice> : null}{success ? <StatusNotice tone="success" title="تأكيد من الخادم" live>{success}</StatusNotice> : null}
    {externalFeedback ? <StatusNotice title="تم فتح تطبيق خارجي" live>{externalFeedback} لم نسجّل اتجاهًا أو وصولًا أو نجاح تواصل.</StatusNotice> : null}
    {pending ? <StatusNotice tone="waiting" title="إجراء ينتظر التأكيد" live>الطلب محفوظ على الهاتف؛ لم يتأكد قبوله. <ActionButton variant="secondary" busy={busy} onClick={() => void execute(pending, true)}>تحقّق وأعد إرسال الطلب نفسه</ActionButton></StatusNotice> : null}
    {effects.length ? <StatusNotice tone="waiting" title="محفوظ على الهاتف" live>{effects.length} إجراء ينتظر المزامنة؛ أثره محلي فقط، وتقدم الخادم أدناه لم يتغير.<a className="edit-link" href={'/local-work?kind=' + kind}>مراجعة الإجراءات المحفوظة</a>{!pending && !offline ? <ActionButton variant="secondary" disabled={busy} onClick={() => void retryFirst()}>تحقّق من أول إجراء محفوظ</ActionButton> : null}</StatusNotice> : null}
    {download ? <p className="field-hint">{offline ? 'العمل المنزّل متاح دون اتصال؛ البدء الجديد يحتاج الخادم.' : readiness} <a href={'/account?kind=' + kind}>حسابي</a></p> : null}
    {!loaded ? <StatusNotice title="جارٍ تحميل الجولة" /> : !state ? (!error ? <StatusNotice title="لا توجد جولة نشطة">ابدأ جولة متزامنة أولًا من تجهيز العمل.</StatusNotice> : null) : <>
      {outcomes ? <section aria-label="آخر تقدم مؤكّد من الخادم"><ProgressSummary processed={outcomes.progress.processed} total={total} delivered={outcomes.progress.full} held={outcomes.progress.heldReturnRequiredPieces} /></section> : null}
      {!owner ? <StatusNotice tone="waiting" title="الجولة تعمل على هاتف آخر">العرض للمتابعة فقط. انقل التنفيذ وحمّل الحالة المؤكدة قبل أي كتابة.<ActionButton variant="secondary" busy={busy} disabled={Boolean(pending) || offline} onClick={takeOver}>انقل التنفيذ لهذا الهاتف</ActionButton></StatusNotice> : null}
      {state.branchActivity ? <section className="current-stage-card"><h2>{state.branchActivity.stage === 'heading' ? 'متجه لفرع المصدر' : 'بانتظار تأكيد الفرع'}</h2><p>ترتيب {state.branchActivity.retainedSequence.length} عميل محفوظ في الجولة نفسها.</p><a className="action-link action-link--primary" href="/execution/branch?kind=company">متابعة زيارة الفرع</a></section> : <>
      <ActiveRouteMap targets={state.targets} selectedTaskId={selected} currentAttemptId={current?.attemptId} onSelect={selectTarget} disabled={busy || Boolean(pending) || !owner} road={download?.road?.geometry} offline={offline} />
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
      {kind === 'company' && !state.branchActivity ? <a className="edit-link" href="/execution/branch?kind=company">الإرجاع وزيارة الفرع</a> : null}
      <a className="edit-link" href={`/execution/closure?kind=${kind}`}>ملخص العمل وإنهاء الجولة أو اليوم</a>
    </>}
    {editor}
    <ActionButton variant="quiet" disabled={busy} onClick={() => { setError(''); void load(); }}><RefreshCw aria-hidden="true" />تحديث الجولة</ActionButton>
  </main>;
}
