import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, MapPin, RefreshCw, Route, Truck } from 'lucide-react';
import type { components } from '@tawsel/api-client';
import { DevicesClient } from '@tawsel/api-client/src/devices';
import { MonitoringClient } from '@tawsel/api-client/src/monitoring';
import { PlanningClient } from '@tawsel/api-client/src/planning';
import { RoundsClient } from '@tawsel/api-client/src/rounds';
import { ActionButton, Field, StatusNotice } from './components/ui';
import { api, deviceId, nextSequence } from './independent-tasks';
import { pendingExecutionLinks } from './execution-command';
import { useLocalPending } from './local-status';
import { synchronizedStart } from './start-barrier';
import { localWork } from './local-work';
import { reconcileExecutionPointers } from './execution-pointers';

type Session = components['schemas']['SessionContext'];
type Daily = components['schemas']['MonitoringSnapshot'];
type Plans = components['schemas']['PlanningPlans'];
type Plan = components['schemas']['PlanningPlan'];
type Job = components['schemas']['PlanningJob'];
type RoundCurrent = components['schemas']['RoundCurrent'];
type StartCommand = components['schemas']['RoundStartCommand'];
type PlanningCommand = components['schemas']['PlanningSaveDraftCommand'] | components['schemas']['PlanningManualOrderCommand'];
type TakeoverCommand = components['schemas']['DeviceTakeoverCommand'];
type Mode = components['schemas']['Mode'];

type Draft = {
  mode: Mode;
  originLatitude: string;
  originLongitude: string;
  endpointKind: 'last-customer' | 'fixed' | 'branch';
  endpointLatitude: string;
  endpointLongitude: string;
  branchId: string;
  plannedStartAt: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const terminalJobs = new Set(['complete', 'partial', 'failed', 'superseded']);

function localDateTime(value = new Date(Date.now() + 5 * 60_000)) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyDraft(kind: 'personal' | 'company', branchId = ''): Draft {
  return { mode: 'car', originLatitude: '', originLongitude: '', endpointKind: kind === 'company' && branchId ? 'branch' : 'last-customer', endpointLatitude: '', endpointLongitude: '', branchId, plannedStartAt: localDateTime() };
}

function draftFromPlan(plan: Plan | undefined, kind: 'personal' | 'company', branchId = ''): Draft {
  const settings = plan?.input.settings;
  if (!settings) return emptyDraft(kind, branchId);
  const endpoint = settings.endpoint;
  return {
    mode: settings.mode,
    originLatitude: String(settings.origin.coordinates.latitude),
    originLongitude: String(settings.origin.coordinates.longitude),
    endpointKind: endpoint.kind,
    endpointLatitude: endpoint.kind === 'last-customer' ? '' : String(endpoint.coordinates.latitude),
    endpointLongitude: endpoint.kind === 'last-customer' ? '' : String(endpoint.coordinates.longitude),
    branchId: endpoint.kind === 'branch' ? endpoint.branchId : branchId,
    plannedStartAt: localDateTime(new Date(settings.plannedStartAt))
  };
}

function commandEnvelope(session: Session, operationId: string, payload: Record<string, unknown>, resources: Record<string, string> = {}, generation = 1, actionId = crypto.randomUUID()) {
  return {
    schemaVersion: '1.0.0' as const,
    payloadVersion: '1.0.0' as const,
    actionId,
    operationId,
    context: { kind: 'device' as const, tenantId: session.access.tenantId, accountId: session.access.sourceId, deviceId: deviceId(), deviceGeneration: generation, deviceSequence: nextSequence() },
    resources,
    baseVersions: {},
    dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' as const } },
    payload
  };
}

function problem(result: { receipt?: { problem?: { detail?: string } } }, fallback: string) {
  return result.receipt?.problem?.detail ?? fallback;
}

function taskName(daily: Daily | null, taskId: string) {
  return daily?.items.find(item => item.taskId === taskId)?.recipientName ?? `مهمة ${taskId.slice(0, 8)}`;
}

export function PreparationFlow() {
  const localPending = useLocalPending();
  const kind = new URLSearchParams(window.location.search).get('kind') === 'company' ? 'company' : 'personal';
  const preparation = window.location.pathname.startsWith('/prepare');
  const planning = useMemo(() => new PlanningClient(kind), [kind]);
  const rounds = useMemo(() => new RoundsClient(kind), [kind]);
  const devices = useMemo(() => new DevicesClient(kind), [kind]);
  const [session, setSession] = useState<Session | null>(null);
  const [daily, setDaily] = useState<Daily | null>(null);
  const [plans, setPlans] = useState<Plans | null>(null);
  const [current, setCurrent] = useState<RoundCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(kind));
  const [serverDraft, setServerDraft] = useState<Draft>(() => emptyDraft(kind));
  const [choicesTouched, setChoicesTouched] = useState(false);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [pendingPlanning, setPendingPlanning] = useState<PlanningCommand | null>(null);
  const [pendingStart, setPendingStart] = useState<StartCommand | null>(null);
  const [pendingTakeover, setPendingTakeover] = useState<TakeoverCommand | null>(null);
  const initialized = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const context = await api(`/api/session/context?kind=${kind}`) as Session;
      if (!context.access.driverId) throw new Error('هذا الحساب غير مرتبط بمندوب نشط.');
      const partition = await localWork.active(kind, deviceId());
      if (partition?.identity.tenantId === context.access.tenantId && partition.identity.accountId === context.access.sourceId) await reconcileExecutionPointers(localWork, partition.scope);
      const driverId = context.access.driverId;
      const [roundState, monitoring, planningState] = await Promise.all([
        rounds.current(),
        new MonitoringClient({ kind }).driver(driverId, { limit: 100 }),
        planning.plans(driverId, 20)
      ]);
      if (monitoring.status !== 200 || !monitoring.data) throw new Error('تعذر تحميل العمل اليومي كاملًا.');
      setSession(context); setCurrent(roundState); setDaily(monitoring.data); setPlans(planningState); setJob(planningState.latestJob);
      const latest = planningState.items.find(item => item.current) ?? planningState.items[0];
      const authoritativeDraft = draftFromPlan(latest, kind, context.access.branchIds[0] ?? '');
      if (!initialized.current) {
        const draftKey = `tawsel:prepare-draft:${context.access.tenantId}:${driverId}`;
        const touchedKey = `${draftKey}:touched`;
        const saved = sessionStorage.getItem(draftKey);
        const touched = sessionStorage.getItem(touchedKey) === '1';
        setServerDraft(authoritativeDraft);
        setChoicesTouched(touched);
        setDraft(touched && saved ? JSON.parse(saved) as Draft : authoritativeDraft);
        const eligibleIds = monitoring.data.items.filter(item => item.eligible && item.coordinates).map(item => item.taskId);
        const retained = planningState.continuation?.orderedTaskIds ?? latest?.routePolicy?.orderedTaskIds ?? [];
        const order = [...retained.filter(id => eligibleIds.includes(id)), ...eligibleIds.filter(id => !retained.includes(id))];
        setManualOrder(order); initialized.current = true;
      } else setServerDraft(() => {
        setChoicesTouched(touched => { if (!touched) setDraft(authoritativeDraft); return touched; });
        return authoritativeDraft;
      });
      const planKey = `tawsel:planning-pending:${context.access.tenantId}:${driverId}`;
      const startKey = `tawsel:start-pending:${context.access.tenantId}:${driverId}:${deviceId()}`;
      const takeoverKey = `tawsel:takeover-pending:${context.access.tenantId}:${driverId}:${deviceId()}`;
      setPendingPlanning(sessionStorage.getItem(planKey) ? JSON.parse(sessionStorage.getItem(planKey)!) as PlanningCommand : null);
      const storedStart = sessionStorage.getItem(startKey);
      if (storedStart && !roundState.round) {
        const command = JSON.parse(storedStart) as StartCommand; setPendingStart(command);
        try {
          const status = await rounds.result(command.actionId);
          if (status.status !== 'pending') {
            if (status.result.receipt.businessStatus === 'accepted') { sessionStorage.removeItem(startKey); setPendingStart(null); setCurrent(await rounds.current()); }
            else { sessionStorage.removeItem(startKey); setPendingStart(null); setError(problem(status.result, 'لم يُقبل بدء الجولة.')); }
          }
        } catch { setNotice('تعذر التحقق من طلب البدء السابق. احتفظنا بالطلب نفسه.'); }
      } else if (roundState.round) { sessionStorage.removeItem(startKey); setPendingStart(null); }
      const storedTakeover = sessionStorage.getItem(takeoverKey);
      setPendingTakeover(storedTakeover ? JSON.parse(storedTakeover) as TakeoverCommand : null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر تحميل العمل اليومي.'); }
    finally { setLoading(false); }
  }, [kind, planning, rounds]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const reload = () => { void load(); }; window.addEventListener('tawsel:replay-complete', reload); return () => window.removeEventListener('tawsel:replay-complete', reload); }, [load]);
  useEffect(() => {
    if (!job || !['pending', 'running'].includes(job.status)) return;
    const handle = window.setTimeout(() => {
      void planning.job(job.jobId).then(next => {
        setJob(next);
        if (terminalJobs.has(next.status)) void load();
      }).catch(() => setNotice('تعذر تحديث حالة التخطيط. آخر حالة مؤكدة ما زالت معروضة.'));
    }, 1000);
    return () => window.clearTimeout(handle);
  }, [job, load, planning]);

  const now = Date.now();
  const unresolved = daily?.items.filter(item => !item.coordinates && !['withdrawn', 'unassigned'].includes(item.state)) ?? [];
  const prepared = daily?.items.filter(item => item.state === 'prepared') ?? [];
  const deferred = daily?.items.filter(item => item.deferred || Boolean(item.earliestAt && Date.parse(item.earliestAt) > now)) ?? [];
  const ready = daily?.items.filter(item => item.eligible && item.coordinates && !item.deferred && (!item.earliestAt || Date.parse(item.earliestAt) <= now)) ?? [];
  const held = daily?.items.filter(item => item.state === 'held' && !deferred.some(value => value.taskId === item.taskId)) ?? [];
  const startable = plans?.items.find(plan => plan.current && plan.inputCurrent && ['ready', 'manual'].includes(plan.state));
  const partial = plans?.items.find(plan => plan.current && plan.inputCurrent && plan.state === 'partial') ?? plans?.items.find(plan => plan.state === 'partial');
  const activeOtherPhone = Boolean(current?.round && current.round.owner.deviceId !== deviceId());
  const acceptedActionsKey = session ? `tawsel:prepare-actions:${session.access.tenantId}:${session.access.driverId}` : '';
  const dirty = choicesTouched && JSON.stringify(draft) !== JSON.stringify(serverDraft);

  function updateDraft(change: Partial<Draft>) {
    setDraft(value => {
      const next = { ...value, ...change };
      if (session) {
        const key = `tawsel:prepare-draft:${session.access.tenantId}:${session.access.driverId}`;
        sessionStorage.setItem(key, JSON.stringify(next)); sessionStorage.setItem(`${key}:touched`, '1');
      }
      return next;
    }); setChoicesTouched(true); setNotice('تغيّرت اختيارات التجهيز. احفظها لتحديث الخطة قبل البدء.');
    if (session) { sessionStorage.removeItem(`tawsel:planning-pending:${session.access.tenantId}:${session.access.driverId}`); setPendingPlanning(null); }
  }
  function accepted(actionId: string) {
    if (!acceptedActionsKey) return;
    const ids = JSON.parse(sessionStorage.getItem(acceptedActionsKey) ?? '[]') as string[];
    sessionStorage.setItem(acceptedActionsKey, JSON.stringify([...new Set([...ids, actionId])]));
  }
  function coordinates(latitude: string, longitude: string) {
    const point = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 || !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) throw new Error('أدخل إحداثيات صحيحة لنقطة الانطلاق والنهاية.');
    return point;
  }
  async function submitPlanning(command: PlanningCommand) {
    if (!session) return;
    const key = `tawsel:planning-pending:${session.access.tenantId}:${session.access.driverId}`;
    setBusy(true); setError(''); setNotice(''); sessionStorage.setItem(key, JSON.stringify(command)); setPendingPlanning(command);
    try {
      const result = await planning.command(command);
      if (result.receipt.businessStatus !== 'accepted') throw new Error(problem(result, 'لم يُقبل تحديث التخطيط.'));
      accepted(command.actionId); sessionStorage.removeItem(key); setPendingPlanning(null);
      const draftKey = `tawsel:prepare-draft:${session.access.tenantId}:${session.access.driverId}`;
      sessionStorage.removeItem(draftKey); sessionStorage.removeItem(`${draftKey}:touched`); setChoicesTouched(false);
      const body = result.response?.body as { job?: Job } | undefined;
      if (body?.job) setJob(body.job);
      setNotice(command.operationId === 'planning.setManualOrder' ? 'اعتمد الخادم الترتيب اليدوي. يمكنك مراجعته ثم بدء الجولة.' : 'حُفظت اختياراتك. التخطيط يعمل على النسخة الحالية.');
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'لم يتأكد حفظ التخطيط. أعد المحاولة بالطلب نفسه.'); }
    finally { setBusy(false); }
  }
  function preparePlan() {
    if (!session || !plans || !session.access.driverId) return;
    try {
      const origin = coordinates(draft.originLatitude, draft.originLongitude);
      let endpoint: components['schemas']['Endpoint'];
      if (draft.endpointKind === 'last-customer') endpoint = { kind: 'last-customer' };
      else if (draft.endpointKind === 'fixed') endpoint = { kind: 'fixed', coordinates: coordinates(draft.endpointLatitude, draft.endpointLongitude) };
      else {
        if (!uuid.test(draft.branchId)) throw new Error('اختر فرع نهاية صالحًا.');
        endpoint = { kind: 'branch', branchId: draft.branchId, coordinates: coordinates(draft.endpointLatitude, draft.endpointLongitude), serviceEstimateSeconds: 600 };
      }
      const pending = pendingPlanning?.operationId === 'planning.saveDraft' ? pendingPlanning : commandEnvelope(session, 'planning.saveDraft', { driverId: session.access.driverId, expectedSettingsRevision: plans.settingsRevision, settings: { mode: draft.mode, origin: { kind: 'manual-pin', coordinates: origin }, endpoint, plannedStartAt: new Date(draft.plannedStartAt).toISOString() } }) as unknown as PlanningCommand;
      void submitPlanning(pending);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'راجع اختيارات التجهيز.'); }
  }
  function publishManual() {
    if (!session || !plans || !session.access.driverId || manualOrder.length === 0) return;
    const pending = pendingPlanning?.operationId === 'planning.setManualOrder' ? pendingPlanning : commandEnvelope(session, 'planning.setManualOrder', { driverId: session.access.driverId, expectedSettingsRevision: plans.settingsRevision, expectedInputRevision: plans.inputRevision, expectedManualRevision: plans.manualRevision, selection: { kind: 'order', taskIds: manualOrder } }) as unknown as PlanningCommand;
    void submitPlanning(pending);
  }
  function move(taskId: string, offset: -1 | 1) {
    setManualOrder(values => { const index = values.indexOf(taskId), next = index + offset; if (index < 0 || next < 0 || next >= values.length) return values; const copy = [...values]; [copy[index], copy[next]] = [copy[next]!, copy[index]!]; return copy; });
    if (session) { sessionStorage.removeItem(`tawsel:planning-pending:${session.access.tenantId}:${session.access.driverId}`); setPendingPlanning(null); }
  }
  async function sendStart(command: StartCommand) {
    if (!session) return;
    const key = `tawsel:start-pending:${session.access.tenantId}:${session.access.driverId}:${deviceId()}`;
    setBusy(true); setError(''); setNotice(''); sessionStorage.setItem(key, JSON.stringify(command)); setPendingStart(command);
    try {
      const result = await rounds.start(command);
      if (result.receipt.businessStatus !== 'accepted') { sessionStorage.removeItem(key); setPendingStart(null); throw new Error(problem(result, 'لم يُقبل بدء الجولة.')); }
      sessionStorage.removeItem(key); setPendingStart(null); window.location.assign(`/rounds/current?kind=${kind}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'لم يصل تأكيد البدء. تحقق من الطلب نفسه قبل أي محاولة جديدة.'); }
    finally { setBusy(false); }
  }
  async function startRound() {
    if (!session || !session.access.driverId || !startable || dirty || pendingExecutionLinks(session, '').length) return;
    setBusy(true); setError('');
    try {
      await synchronizedStart(kind, async journalIds => {
        const fresh = await planning.plans(session.access.driverId!);
        const selected = fresh.items.find(p => p.planId === startable.planId && p.revision === startable.revision);
        if (!selected?.current || !selected.inputCurrent) throw new Error('تغيّرت الخطة بعد المزامنة؛ حدّث التجهيز قبل البدء.');
        const actionIds = acceptedActionsKey ? JSON.parse(sessionStorage.getItem(acceptedActionsKey) ?? '[]') as string[] : [];
        const readiness = await rounds.readiness({ driverId: session.access.driverId!, deviceId: deviceId(), planId: selected.planId, expectedPlanRevision: selected.revision, relevantActionIds: [...new Set([...journalIds, ...actionIds])] });
        const command = commandEnvelope(session, 'round.start', { driverId: session.access.driverId, readinessId: readiness.readinessId, planId: startable.planId, expectedPlanRevision: startable.revision }, { planId: startable.planId }) as unknown as StartCommand;
        setBusy(false); await sendStart(command);
      });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر التحقق من جاهزية البدء.'); setBusy(false); }
  }
  async function checkStart() {
    if (!pendingStart || !session) return;
    setBusy(true); setError('');
    const key = `tawsel:start-pending:${session.access.tenantId}:${session.access.driverId}:${deviceId()}`;
    try {
      const status = await rounds.result(pendingStart.actionId);
      if (status.status !== 'pending') {
        if (status.result.receipt.businessStatus === 'accepted') { sessionStorage.removeItem(key); setPendingStart(null); window.location.assign(`/rounds/current?kind=${kind}`); return; }
        sessionStorage.removeItem(key); setPendingStart(null); setError(problem(status.result, 'لم يُقبل بدء الجولة. حدّث الخطة ثم حاول بطلب جديد.')); return;
      }
      const round = await rounds.current();
      if (round.round) { sessionStorage.removeItem(key); setPendingStart(null); window.location.assign(`/rounds/current?kind=${kind}`); return; }
      setNotice('لا يوجد تأكيد نهائي بعد. يمكنك إعادة إرسال طلب البدء نفسه دون إنشاء جولة ثانية.');
    } catch { setNotice('تعذر الاستعلام الآن. طلب البدء نفسه محفوظ على هذا الجهاز.'); }
    finally { setBusy(false); }
  }
  async function takeover() {
    if (!session || !current?.round) return;
    const key = `tawsel:takeover-pending:${session.access.tenantId}:${session.access.driverId}:${deviceId()}`;
    const command = pendingTakeover ?? commandEnvelope(session, 'device.takeOver', { roundId: current.round.roundId, expectedGeneration: current.round.owner.generation }, { tripId: current.round.roundId }, current.round.owner.generation) as unknown as TakeoverCommand;
    setBusy(true); setError(''); sessionStorage.setItem(key, JSON.stringify(command)); setPendingTakeover(command);
    try {
      const result = await devices.continueOnThisPhone(command);
      if (result.result.receipt.businessStatus !== 'accepted' || !result.snapshot) throw new Error(problem(result.result, 'تعذر نقل التنفيذ لهذا الهاتف.'));
      sessionStorage.removeItem(key); setPendingTakeover(null); window.location.assign(`/rounds/current?kind=${kind}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'لم يتأكد نقل التنفيذ. أعد المحاولة بالطلب نفسه.'); }
    finally { setBusy(false); }
  }

  if (loading && !daily) return <main className="tasks-shell preparation-shell"><StatusNotice title="جارٍ تحميل عمل اليوم" /></main>;
  return <main className="tasks-shell preparation-shell" dir="rtl">
    <header className="tasks-header"><div><p className="eyebrow">توصيل · عمل اليوم</p><h1>{preparation ? 'جهّز جولتك' : 'عملك اليوم'}</h1><p>{preparation ? 'اختر نقطة الانطلاق والمركبة، راجع الخطة، ثم ابدأ بعد تأكيد الخادم.' : 'العمل النشط أولًا، ثم الجاهز والقادم وما يحتاج مراجعة.'}</p></div><span className="tasks-logo" aria-hidden="true">{preparation ? <Route /> : <Truck />}</span></header>
    {session && pendingExecutionLinks(session, '').length > 0 ? <section className="current-stage-card"><h2>تحقّق من الإجراءات السابقة قبل بدء جولة</h2>{pendingExecutionLinks(session, '').map(item => <a className="edit-link" key={item.id} href={item.href}>فتح الإجراء المعلّق</a>)}</section> : null}
    {localPending.items.length || localPending.error ? <StatusNotice tone="waiting" title="البدء ينتظر مراجعة العمل المحفوظ">{localPending.error}<a href={'/local-work?kind=' + kind}>مراجعة الإجراءات المحفوظة</a></StatusNotice> : null}
    {current?.workday ? <a className="edit-link" href={`/execution/closure?kind=${kind}&workdayId=${current.workday.workdayId}`}>ملخص العمل وإنهاء اليوم</a> : null}
    {error ? <StatusNotice tone="error" title="تحتاج مراجعة" live>{error}</StatusNotice> : null}
    {notice ? <StatusNotice tone="waiting" title="الحالة الحالية" live>{notice}</StatusNotice> : null}
    {current?.round ? <section className="preparation-stage preparation-stage--active"><p className="eyebrow">جولة نشطة</p><h2>{activeOtherPhone ? 'الجولة تعمل على هاتف آخر' : 'جولتك بدأت بالفعل'}</h2><p>{activeOtherPhone ? 'لن ننشئ بداية ثانية. يمكنك عرض الجولة أو نقل التنفيذ صراحةً لهذا الهاتف.' : 'افتح الجولة الحالية واستكمل من الحالة المؤكدة على الخادم.'}</p><div className="preparation-actions"><a className="action-link action-link--primary" href={`/rounds/current?kind=${kind}`}>متابعة الجولة</a>{activeOtherPhone ? <ActionButton variant="secondary" busy={busy} onClick={() => void takeover()}>انقل التنفيذ لهذا الهاتف</ActionButton> : null}</div></section> : preparation ? <>
      <section className="preparation-stage" aria-labelledby="choices-title"><div className="preparation-heading"><div><p className="eyebrow">١ · اختيارات التجهيز</p><h2 id="choices-title">الانطلاق ونهاية الجولة</h2></div><span className="revision-chip">نسخة الإدخال {plans?.inputRevision ?? '—'}</span></div>
        <div className="preparation-grid"><div className="field"><label htmlFor="vehicle-mode">وسيلة الحركة</label><select id="vehicle-mode" value={draft.mode} onChange={event => updateDraft({ mode: event.target.value as Mode })}><option value="car">سيارة</option><option value="motorcycle">دراجة نارية</option><option value="bicycle">دراجة</option></select></div><Field id="origin-latitude" label="خط عرض نقطة الانطلاق" inputMode="decimal" dir="ltr" value={draft.originLatitude} onChange={event => updateDraft({ originLatitude: event.target.value })} /><Field id="origin-longitude" label="خط طول نقطة الانطلاق" inputMode="decimal" dir="ltr" value={draft.originLongitude} onChange={event => updateDraft({ originLongitude: event.target.value })} />
          <div className="field"><label htmlFor="endpoint-kind">نهاية الجولة</label><select id="endpoint-kind" value={draft.endpointKind} onChange={event => updateDraft({ endpointKind: event.target.value as Draft['endpointKind'] })}><option value="last-customer">آخر عميل</option>{kind === 'personal' ? <option value="fixed">نقطة أحددها</option> : null}{kind === 'company' ? <option value="branch">فرع الشركة</option> : null}</select></div>
          {draft.endpointKind !== 'last-customer' ? <><Field id="endpoint-latitude" label="خط عرض نقطة النهاية" inputMode="decimal" dir="ltr" value={draft.endpointLatitude} onChange={event => updateDraft({ endpointLatitude: event.target.value })} /><Field id="endpoint-longitude" label="خط طول نقطة النهاية" inputMode="decimal" dir="ltr" value={draft.endpointLongitude} onChange={event => updateDraft({ endpointLongitude: event.target.value })} />{draft.endpointKind === 'branch' ? <div className="field"><label htmlFor="branch-id">فرع النهاية</label><select id="branch-id" value={draft.branchId} onChange={event => updateDraft({ branchId: event.target.value })}>{session?.access.branchIds.map(id => <option key={id} value={id}>{id.slice(0, 8)}</option>)}</select></div> : null}</> : null}
          <Field id="planned-start" label="وقت التخطيط المتوقع" type="datetime-local" value={draft.plannedStartAt} onChange={event => updateDraft({ plannedStartAt: event.target.value })} hint="للتوقع والأهلية فقط؛ لا يبدأ الجولة تلقائيًا." /></div>
        <ActionButton busy={busy} onClick={preparePlan}>{pendingPlanning?.operationId === 'planning.saveDraft' ? 'أعد إرسال طلب التجهيز نفسه' : 'احفظ وجهّز المعاينة'}</ActionButton>
      </section>
      <section className="preparation-stage" aria-labelledby="plan-title"><div className="preparation-heading"><div><p className="eyebrow">٢ · الخطة</p><h2 id="plan-title">راجع الترتيب قبل البدء</h2></div><button className="icon-text-button" onClick={() => void load()} disabled={busy}><RefreshCw aria-hidden="true" />تحديث</button></div>
        {job && ['pending', 'running'].includes(job.status) ? <StatusNotice tone="waiting" title="التخطيط قيد المعالجة">هذه حالة الخادم الفعلية. لن نعرض نجاحًا قبل اكتمال المهمة.</StatusNotice> : null}
        {job?.status === 'failed' ? <StatusNotice tone="error" title="تعذّر تجهيز المسار الآن">خدمة المسار لم تُنتج خطة. مدخلاتك محفوظة؛ استخدم ترتيبًا يدويًا صالحًا.</StatusNotice> : null}
        {partial ? <StatusNotice tone="waiting" title="الخطة جزئية">تعذّر إدراج {partial.forecast.members.filter(member => member.membership === 'unassigned').length} من العمل. لم نعتبر الخطة جاهزة للبدء.</StatusNotice> : null}
        {unresolved.length ? <StatusNotice tone="waiting" title="مواقع تحتاج تحديد">{unresolved.length} مهمة مستبعدة من الخطة حتى تأكيد موقعها. {ready.length ? 'العمل الصالح ما زال متاحًا.' : ''}</StatusNotice> : null}
        {startable ? <div className="plan-summary"><span className={`readiness readiness--ready`}>{startable.state === 'manual' ? 'ترتيب يدوي صالح' : 'خطة جاهزة'}</span><strong>{startable.routePolicy?.orderedTaskIds.length ?? 0} وقفات</strong>{startable.forecast.expectedFinishAt ? <span>انتهاء متوقع: <bdi>{new Date(startable.forecast.expectedFinishAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</bdi></span> : <span>لا يوجد تقدير طريق للترتيب اليدوي</span>}</div> : null}
        {(job?.status === 'failed' || partial || plans?.continuation) && manualOrder.length ? <div className="manual-order"><h3>ترتيب يدوي واضح</h3><p>غيّر الترتيب ثم اعتمده. لا توجد أزمنة طريق محسوبة في هذا الوضع.</p><ol>{manualOrder.map((taskId, index) => <li key={taskId}><span>{taskName(daily, taskId)}</span><span><button aria-label={`حرّك ${taskName(daily, taskId)} لأعلى`} disabled={index === 0 || busy} onClick={() => move(taskId, -1)}><ArrowUp aria-hidden="true" /></button><button aria-label={`حرّك ${taskName(daily, taskId)} لأسفل`} disabled={index === manualOrder.length - 1 || busy} onClick={() => move(taskId, 1)}><ArrowDown aria-hidden="true" /></button></span></li>)}</ol><ActionButton variant="secondary" busy={busy} disabled={dirty} onClick={publishManual}>{pendingPlanning?.operationId === 'planning.setManualOrder' ? 'أعد إرسال الترتيب نفسه' : 'اعتماد الترتيب اليدوي'}</ActionButton></div> : null}
      </section>
      <section className="preparation-stage preparation-start" aria-labelledby="start-title"><p className="eyebrow">٣ · بدء الجولة</p><h2 id="start-title">ابدأ بعد التحقق المتصل</h2>{dirty ? <StatusNotice tone="waiting" title="الاختيارات أحدث من الخطة">احفظ اختيارات التجهيز وانتظر خطة النسخة الحالية.</StatusNotice> : null}{pendingStart ? <StatusNotice tone="waiting" title="بدء الجولة غير محسوم">تحقق من معرّف الإجراء المحفوظ قبل إعادة إرساله أو إنشاء أي طلب جديد.</StatusNotice> : null}
        {pendingStart ? <div className="preparation-actions"><ActionButton busy={busy} onClick={() => void checkStart()}>تحقق من بدء الجولة</ActionButton><ActionButton variant="secondary" busy={busy} onClick={() => void sendStart(pendingStart)}>أعد إرسال طلب البدء نفسه</ActionButton></div> : <ActionButton busy={busy} disabled={!startable || dirty || Boolean(session && pendingExecutionLinks(session, '').length)} onClick={() => void startRound()}>ابدأ الجولة</ActionButton>}
        {!startable && !pendingStart ? <p className="field-hint">يلزم خطة كاملة أو ترتيب يدوي صالح للنسخة الحالية. لا توجد موافقة إضافية من المرسل.</p> : null}
      </section>
    </> : <DailyWork kind={kind} ready={ready} unresolved={unresolved} prepared={prepared} held={held} deferred={deferred} onRefresh={() => void load()} />}
  </main>;
}

function DailyWork({ kind, ready, unresolved, prepared, held, deferred, onRefresh }: { kind: 'personal' | 'company'; ready: Daily['items']; unresolved: Daily['items']; prepared: Daily['items']; held: Daily['items']; deferred: Daily['items']; onRefresh: () => void }) {
  const groups = [
    { id: 'ready', title: 'جاهز للتجهيز', items: ready, empty: 'لا يوجد عمل صالح للتجهيز الآن.' },
    { id: 'unresolved', title: 'يحتاج تحديد موقع', items: unresolved, empty: '' },
    { id: 'prepared', title: 'قادم من نظام الشركة', items: prepared, empty: '' },
    { id: 'held', title: 'معك ولم يُحسم', items: held.filter(item => !ready.some(value => value.taskId === item.taskId)), empty: '' },
    { id: 'deferred', title: 'مؤجل لوقت لاحق', items: deferred, empty: '' }
  ];
  return <>
    <section className="daily-summary"><div><strong>{ready.length}</strong><span>جاهز</span></div><div><strong>{unresolved.length}</strong><span>موقع ناقص</span></div><div><strong>{prepared.length}</strong><span>قادم</span></div><button onClick={onRefresh}><RefreshCw aria-hidden="true" />تحديث</button></section>
    {unresolved.length && ready.length ? <StatusNotice tone="waiting" title="بعض العمل يحتاج مراجعة">المهام ذات الموقع الناقص مستبعدة بوضوح، ويمكنك متابعة تجهيز {ready.length} مهمة صالحة.</StatusNotice> : null}
    {prepared.length ? <StatusNotice title="عمل الشركة قادم وليس على عهدتك">المهام المجهّزة في نظام الشركة لا تصبح قابلة للتنفيذ إلا بعد الاستلام المؤكد.</StatusNotice> : null}
    <div className="daily-groups">{groups.map(group => group.items.length || group.empty ? <section className="daily-group" key={group.id}><h2>{group.title}</h2>{group.items.length ? <div className="task-list">{group.items.map(item => <article className="task-card" key={`${group.id}-${item.taskId}`}><div className="task-card__top"><h3><bdi>{item.recipientName}</bdi></h3><span className={item.coordinates ? 'readiness readiness--ready' : 'readiness readiness--missing'}>{item.coordinates ? item.eligible ? 'صالح الآن' : 'ليس ضمن التنفيذ الآن' : 'الموقع غير مؤكد'}</span></div>{item.recipientPhone ? <a href={`tel:${item.recipientPhone}`} dir="ltr"><bdi>{item.recipientPhone}</bdi></a> : null}{!item.coordinates ? <><p className="task-blocker">هذه المهمة وحدها مستبعدة حتى تحديد نقطة التوصيل.</p><a className="edit-link" href={`/locations/${item.taskId}?kind=${kind}`}><MapPin aria-hidden="true" />حدّد الموقع</a></> : null}{item.state === 'prepared' ? <p className="field-hint">مجهّزة في نظام الشركة · ليست على العهدة ولا قابلة للتنفيذ بعد.</p> : null}{item.deferred || item.earliestAt ? <p className="field-hint">{item.earliestAt ? `متاحة بعد ${new Date(item.earliestAt).toLocaleString('ar-EG')}` : 'مؤجلة بقرار صريح'}</p> : null}</article>)}</div> : <p className="field-hint">{group.empty}</p>}</section> : null)}</div>
    <div className="preparation-actions">{ready.length ? <a className="action-link action-link--primary" href={`/prepare?kind=${kind}`}>جهّز الجولة</a> : null}{kind === 'personal' ? <a className="action-link" href="/tasks/new">إضافة مهمة سريعة</a> : null}</div>
  </>;
}
