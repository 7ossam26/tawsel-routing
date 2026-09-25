import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, History, RefreshCw, ShieldCheck } from 'lucide-react';
import type { components } from '@tawsel/api-client';
import { MonitoringClient } from '@tawsel/api-client/src/monitoring';
import { ActiveRouteMap } from './components/active-route-map';
import { ActionButton, StatusNotice } from './components/ui';
import { MonitoringRefreshController, type RefreshState } from './monitoring-refresh';

type Kind = 'company' | 'personal';
type Task = components['schemas']['MonitoringTask'];
type HistoryView = components['schemas']['MonitoringHistory'];
type Action = components['schemas']['MonitoringAction'];
type Session = components['schemas']['SessionContext'];
const initial: RefreshState = { phase: 'loading', data: null, error: '', refreshedAt: null, revision: 0, scopeKey: null, inFlight: false };
const time = (value: string | null) => value ? new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)) : 'لا يوجد';
const outcome: Record<string, string> = { full: 'تسليم كامل', partial: 'تسليم جزئي', refused: 'رفض الاستلام', 'no-answer': 'لم يرد' };
const actionStatus: Record<Action['businessStatus'], string> = { accepted: 'مقبول في توصيل', rejected: 'مرفوض', 'review-required': 'يحتاج مراجعة' };

async function session(kind: Kind): Promise<Session> {
  const response = await fetch(`/api/session/context?kind=${kind}`, { credentials: 'same-origin', cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'تعذر تحميل صلاحيات المتابعة.');
  return body;
}

function Freshness({ state, onRefresh }: { state: RefreshState; onRefresh: () => void }) {
  const stale = state.phase === 'stale', failed = state.phase === 'error';
  return <div className={`monitor-freshness monitor-freshness--${stale ? 'stale' : failed ? 'error' : 'fresh'}`} role="status" aria-live="polite">
    <span>{stale || failed ? <AlertTriangle aria-hidden="true" /> : state.inFlight ? <RefreshCw aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</span>
    <div><strong>{state.phase === 'loading' ? 'جارٍ تحميل المتابعة' : state.phase === 'refreshing' ? 'جارٍ تحديث الحالة الكاملة' : stale ? 'المعروض آخر حالة مؤكدة' : failed ? 'تعذر التحديث الآن' : 'المتابعة محدثة'}</strong>
      <small>آخر تحديث ناجح: {time(state.refreshedAt)} · نسخة {state.revision || '—'}</small>{state.error ? <small>{state.error}</small> : null}</div>
    <ActionButton variant="quiet" disabled={state.inFlight} onClick={onRefresh}>تحديث</ActionButton>
  </div>;
}

function HistoryPanel({ kind, task, branchId, revision }: { kind: Kind; task: Task | null; branchId?: string; revision: number }) {
  const [view, setView] = useState<HistoryView | null>(null), [message, setMessage] = useState(''), [filter, setFilter] = useState<'all' | Action['businessStatus']>('all');
  useEffect(() => {
    if (!task) { setView(null); return; }
    const controller = new AbortController(); setMessage('جارٍ تحميل السجل…');
    new MonitoringClient({ kind }).taskHistory(task.taskId, { ...(branchId ? { branchId } : {}), limit: 100, signal: controller.signal }).then(result => {
      if (result.status === 200) setView(result.data); setMessage('');
    }).catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage(error instanceof Error ? error.message : 'تعذر تحميل السجل.'); });
    return () => controller.abort();
  }, [branchId, kind, revision, task]);
  const actions = (view?.items.filter((item): item is { kind: 'action'; action: Action } => item.kind === 'action').map(item => item.action) ?? []).filter(action => filter === 'all' || action.businessStatus === filter);
  return <section className="monitor-history" aria-labelledby="monitor-history-title"><div className="monitor-section-heading"><div><p className="eyebrow">السجل المستلم من الخادم</p><h2 id="monitor-history-title"><History aria-hidden="true" /> الأدلة والإجراءات</h2></div></div>
    <div className="monitor-filters" aria-label="تصفية حالة الإجراء">{([['all', 'الكل'], ['accepted', 'مقبول'], ['rejected', 'مرفوض'], ['review-required', 'مراجعة']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {message ? <p className="monitor-empty" role="status">{message}</p> : !task ? <p className="monitor-empty">اختر مهمة لعرض سجلها.</p> : actions.length ? <ol className="monitor-action-list">{actions.map(action => <li key={`${action.sourceId}:${action.actionId}`}><span className={`monitor-badge monitor-badge--${action.businessStatus}`}>{actionStatus[action.businessStatus]}</span><strong><bdi>{action.operationId}</bdi></strong><small>وصل إلى توصيل: {time(action.receivedAt)}</small><small>{action.acceptedAt ? `حُسم: ${time(action.acceptedAt)}` : 'لم يُقبل كقرار عمل'}</small></li>)}</ol> : <p className="monitor-empty">لا توجد إجراءات مستلمة بهذه الحالة.</p>}
    <p className="monitor-boundary"><ShieldCheck aria-hidden="true" /> يعرض هذا السجل ما استلمه خادم توصيل فقط. الإجراءات غير المرسلة من هاتف المندوب غير معروفة هنا، ووصول الحدث لنظام الشركة لا يعني تطبيقه.</p>
  </section>;
}

export function MonitoringPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []), kind: Kind = query.get('kind') === 'personal' ? 'personal' : 'company';
  const [context, setContext] = useState<Session | null>(null), [contextError, setContextError] = useState('');
  const [driverInput, setDriverInput] = useState(query.get('driverId') ?? ''), [driverId, setDriverId] = useState(query.get('driverId') ?? '');
  const [branchId, setBranchId] = useState(query.get('branchId') ?? ''), [sourceId, setSourceId] = useState('all'), [state, setState] = useState<RefreshState>(initial), [selectedId, setSelectedId] = useState('');
  const [controller, setController] = useState<MonitoringRefreshController | null>(null);
  useEffect(() => { let live = true; session(kind).then(value => { if (live) { setContext(value); if (!query.get('driverId') && value.access.driverId) { setDriverInput(value.access.driverId); setDriverId(value.access.driverId); } } }).catch(error => { if (live) setContextError(error.message); }); return () => { live = false; }; }, [kind, query]);
  useEffect(() => {
    if (!driverId) { setState(initial); return; }
    const next = new MonitoringRefreshController(new MonitoringClient({ kind }), driverId, branchId || undefined), unsubscribe = next.subscribe(setState);
    setController(next); next.start();
    return () => { unsubscribe(); next.stop(); setController(current => current === next ? null : current); };
  }, [branchId, driverId, kind]);
  const data = state.data, sources = useMemo(() => [...new Set(data?.items.flatMap(item => item.integrationId ? [item.integrationId] : []) ?? [])], [data]);
  useEffect(() => { if (sourceId !== 'all' && !sources.includes(sourceId)) setSourceId('all'); }, [sourceId, sources]);
  const items = useMemo(() => data?.items.filter(item => sourceId === 'all' || item.integrationId === sourceId) ?? [], [data, sourceId]);
  const summary = useMemo(() => data ? sourceId === 'all' ? {
    processed: data.progress.processedShipments, remaining: data.progress.remainingShipments, held: data.groups.heldShipments, prepared: data.groups.preparedShipments
  } : {
    processed: items.filter(item => item.outcome !== null).length,
    remaining: items.filter(item => item.outcome === null).length,
    held: items.filter(item => item.state === 'held' || item.returnRequiredPieces > 0).length,
    prepared: items.filter(item => item.state === 'prepared').length
  } : null, [data, items, sourceId]);
  useEffect(() => { if (!items.some(item => item.taskId === selectedId)) setSelectedId(data?.current?.taskId && items.some(item => item.taskId === data.current?.taskId) ? data.current.taskId : items[0]?.taskId ?? ''); }, [data, items, selectedId]);
  const selected = items.find(item => item.taskId === selectedId) ?? null;
  const visibleCurrent = data?.current && items.some(item => item.taskId === data.current?.taskId) ? data.current : null;
  const targets = useMemo(() => items.filter((item): item is Task & { coordinates: { latitude: number; longitude: number } } => !!item.coordinates).map(item => ({ taskId: item.taskId, attemptId: item.attemptId ?? item.taskId, recipientName: item.recipientName, coordinates: item.coordinates })), [items]);
  const applyDriver = useCallback(() => { const next = new URL(window.location.href); next.searchParams.set('kind', kind); if (driverInput) next.searchParams.set('driverId', driverInput); else next.searchParams.delete('driverId'); window.history.replaceState({}, '', next); setDriverId(driverInput.trim()); }, [driverInput, kind]);
  return <main className="monitor-shell"><header className="monitor-header"><div><p className="eyebrow">مساحة المتابعة المشتركة</p><h1>حالة المندوب والعمل</h1><p>حالة مؤكدة من الخادم، بلا تتبع موقع أو افتراض أن الهاتف متصل.</p></div><a href={`/account?kind=${kind}`}>الحساب</a></header>
    <section className="monitor-controls" aria-label="نطاق المتابعة"><label>معرّف المندوب<input dir="ltr" value={driverInput} onChange={event => setDriverInput(event.target.value)} placeholder="UUID" /></label><ActionButton onClick={applyDriver}>عرض المندوب</ActionButton>
      <label>الفرع<select dir="ltr" value={branchId} onChange={event => setBranchId(event.target.value)}><option value="">كل الفروع المصرح بها</option>{context?.access.branchIds.map(id => <option key={id} value={id}>{id}</option>)}</select></label>
      <label>المصدر<select dir="ltr" value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="all">كل المصادر الظاهرة</option>{sources.map(id => <option key={id} value={id}>{id}</option>)}</select></label></section>
    {contextError ? <StatusNotice tone="error" title="الوصول غير متاح">{contextError}</StatusNotice> : null}
    {!driverId ? <StatusNotice title="اختر مندوبًا">أدخل معرّف المندوب الذي لديك صلاحية متابعته. لا توسّع الفلاتر نطاق الوصول.</StatusNotice> : <>
      <Freshness state={state} onRefresh={() => void controller?.refresh(true)} />
      {data && summary ? <><section className="monitor-summary" aria-label="ملخص التقدم"><article><strong>{summary.processed}</strong><span>شحنات منتهية</span></article><article><strong>{summary.remaining}</strong><span>شحنات متبقية</span></article><article><strong>{summary.held}</strong><span>معلّقة أو مرتجعة</span></article><article><strong>{summary.prepared}</strong><span>مجهزة قبل الاستلام</span></article></section>
        <section className="monitor-current" aria-label="الحالة الحالية"><Clock3 aria-hidden="true" /><div><strong>{data.round?.endedAt ? 'الجولة منتهية — العرض للقراءة فقط' : data.round ? 'الجولة غادرت — التنفيذ للقراءة فقط' : 'لم تبدأ جولة'}</strong><p>{visibleCurrent?.kind === 'customer' ? 'هناك عميل حالي ظاهر ضمن نطاقك.' : visibleCurrent?.kind === 'branch' ? 'زيارة فرع جارية ضمن نطاقك.' : 'لا توجد محطة حالية ظاهرة ضمن هذا النطاق.'}</p></div><span>آخر إجراء مستلم: {time(data.freshness.lastReceivedActionAt)}</span></section>
        <div className="monitor-grid"><ActiveRouteMap targets={targets} selectedTaskId={selectedId} currentAttemptId={visibleCurrent?.attemptId ?? undefined} onSelect={setSelectedId} disabled={false} />
          <section className="monitor-detail" aria-label="تفاصيل المهمة">{selected ? <><p className="eyebrow">مهمة محددة</p><h2><bdi>{selected.recipientName}</bdi></h2><dl><div><dt>الحالة</dt><dd>{selected.outcome ? outcome[selected.outcome] : selected.deferred ? 'مؤجلة' : selected.state === 'prepared' ? 'مجهزة — ليست في العهدة' : 'قيد العمل'}</dd></div><div><dt>الهاتف</dt><dd><bdi dir="ltr">{selected.recipientPhone ?? 'غير متاح'}</bdi></dd></div><div><dt>الإحداثيات</dt><dd>{selected.coordinates ? <bdi dir="ltr">{selected.coordinates.latitude.toFixed(4)}, {selected.coordinates.longitude.toFixed(4)}</bdi> : 'غير متاحة'}</dd></div></dl><StatusNotice title="عرض فقط">لا توجد من هنا أزرار نتيجة أو تعديل بعد المغادرة. الاستلام والتصرف الفعليان في نظام الشركة.</StatusNotice></> : <p className="monitor-empty">لا توجد مهمة ظاهرة في هذا النطاق.</p>}</section></div>
        <HistoryPanel kind={kind} task={selected} {...(branchId ? { branchId } : {})} revision={state.revision} /></> : state.phase !== 'loading' ? <StatusNotice tone="error" title="تعذر تحميل المتابعة">راجع الصلاحية أو الاتصال ثم أعد المحاولة.</StatusNotice> : null}
    </>}
  </main>;
}
