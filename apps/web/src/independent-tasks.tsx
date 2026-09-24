import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, MapPin, Pencil, Plus, Truck } from 'lucide-react';
import type { components } from '@tawsel/api-client';
import { ActionButton, Field, StatusNotice } from './components/ui';

type Context = components['schemas']['SessionContext'];
type Task = components['schemas']['IndependentTask'];
type Draft = { recipientName: string; recipientPhone: string; addressText: string; collectionAmount: string; instructions: string; actionId?: string; deviceSequence?: number };
const emptyDraft: Draft = { recipientName: '', recipientPhone: '', addressText: '', collectionAmount: '', instructions: '' };

class RequestError extends Error {
  constructor(message: string, readonly code?: string, readonly fields?: Record<string, string>) { super(message); }
}
export async function api(path: string, init?: RequestInit) {
  const options = { credentials: 'same-origin' as const, cache: 'no-store' as const, ...init };
  if (init?.method && init.method !== 'GET') {
    const bootstrap = await fetch('/api/session/bootstrap', { credentials: 'same-origin', cache: 'no-store' });
    const token = await bootstrap.json();
    if (!bootstrap.ok) throw new RequestError(token.error?.message ?? 'تعذر بدء الحفظ.', token.error?.code);
    options.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': token.csrfToken, ...init.headers };
  }
  let response: Response;
  try { response = await fetch(path, options); }
  catch { throw new RequestError('تعذر الاتصال. المدخلات ما زالت محفوظة أمامك.', 'network'); }
  const data = await response.json();
  if (!response.ok || data.receipt?.businessStatus === 'rejected') {
    const error = data.error ?? data.receipt?.problem ?? {};
    throw new RequestError(error.message ?? error.title ?? 'تعذر حفظ المهمة.', error.code, error.fields);
  }
  return data;
}

function parseRoute() {
  const match = window.location.pathname.match(/^\/tasks\/([0-9a-f-]+)\/edit$/i);
  if (match) return { kind: 'edit' as const, taskId: match[1]! };
  if (window.location.pathname === '/tasks/new') return { kind: 'new' as const };
  return { kind: 'list' as const };
}
function navigate(path: string) { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }
export function deviceId() {
  const key = 'tawsel:device-id';
  let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  return value;
}
export function nextSequence() {
  const key = 'tawsel:device-sequence';
  const next = Math.max(1, Number(localStorage.getItem(key) ?? '0') + 1);
  localStorage.setItem(key, String(next));
  return next;
}
function draftKey(taskId?: string) { return `tawsel:intake-draft:${taskId ?? 'new'}`; }
function toDraft(task: Task): Draft {
  return { recipientName: task.recipientName, recipientPhone: task.recipientPhone,
    addressText: task.destination.addressText ?? '',
    collectionAmount: task.collectionAmount ? (task.collectionAmount.amountMinor / 100).toFixed(2) : '',
    instructions: task.instructions ?? '' };
}
function amountMinor(value: string): number | undefined {
  if (!value) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return Number.NaN;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : Number.NaN;
}

export function IndependentTasksPage() {
  const [route, setRoute] = useState(parseRoute);
  const [context, setContext] = useState<Context | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const session = await api('/api/session/context?kind=personal') as Context;
      setContext(session);
      const list = await api('/api/v1/independent/tasks?limit=50') as { items: Task[] };
      setTasks(list.items);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر تحميل المهام.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const change = () => setRoute(parseRoute());
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, []);
  const editing = route.kind === 'edit' ? tasks.find(task => task.taskId === route.taskId) : undefined;
  if (route.kind !== 'list') return <TaskForm context={context} task={editing} taskId={route.kind === 'edit' ? route.taskId : undefined}
    loading={loading} loadError={error} onSaved={async () => { await load(); navigate('/tasks'); }} />;
  return <main className="tasks-shell"><header className="tasks-header"><div><p className="eyebrow">حسابك المستقل</p><h1>مهام التوصيل</h1><p>أضف كل شحنة كمهمة مستقلة، حتى لو كان العنوان نفسه.</p></div><span className="tasks-logo" aria-hidden="true"><Truck /></span></header>
    <section className="tasks-stage" aria-labelledby="tasks-title"><div className="tasks-stage__heading"><div><h2 id="tasks-title">مهام قبل التحرك</h2><p>راجع البيانات والموقع المطلوب قبل تجهيز الجولة.</p></div><ActionButton onClick={() => navigate('/tasks/new')}><Plus aria-hidden="true" />إضافة مهمة</ActionButton></div>
      {error ? <StatusNotice tone="error" title="تعذر تحميل المهام">{error}<button className="inline-retry" onClick={() => void load()}>إعادة المحاولة</button></StatusNotice> : null}
      {loading ? <StatusNotice title="جارٍ تحميل مهامك" /> : tasks.length === 0 ? <div className="tasks-empty"><MapPin aria-hidden="true" /><h3>لا توجد مهام بعد</h3><p>ابدأ باسم المستلم ورقم الهاتف والعنوان.</p></div> : <div className="task-list">{tasks.map(task => <article className="task-card" key={task.taskId}><div className="task-card__top"><div><h3><bdi>{task.recipientName}</bdi></h3><a href={`tel:${task.recipientPhone}`} dir="ltr"><bdi>{task.recipientPhone}</bdi></a></div><span className={task.executionReady ? 'readiness readiness--ready' : 'readiness readiness--missing'}>{task.executionReady ? 'الموقع مؤكّد' : 'الموقع يحتاج تحديد'}</span></div>
        <p className="task-address"><MapPin aria-hidden="true" />{task.destination.kind === 'address' ? task.destination.addressText : task.destination.addressText ?? `${task.destination.coordinates.latitude}, ${task.destination.coordinates.longitude}`}</p>
        {task.collectionAmount ? <p className="task-amount">تحصيل: <bdi>{(task.collectionAmount.amountMinor / 100).toFixed(2)} ج.م</bdi></p> : <p className="task-amount task-amount--none">بدون مبلغ تحصيل</p>}
        {!task.executionReady ? <p className="task-blocker">العنوان محفوظ، لكنه لن يصبح وقفة قابلة للتنفيذ قبل تأكيد نقطة التوصيل.</p> : null}
        <button className="edit-link" onClick={() => navigate(`/tasks/${task.taskId}/edit`)} disabled={!task.editable}><Pencil aria-hidden="true" />{task.editable ? 'تصحيح البيانات' : 'للعرض فقط'}</button>
        <a className="edit-link" href={`/locations/${task.taskId}?kind=personal`}>مراجعة الموقع</a>
      </article>)}</div>}
    </section><nav className="tasks-foot"><a href="/account?kind=personal">الحساب</a><span aria-current="page">المهام</span><a href="/day?kind=personal">عمل اليوم</a></nav></main>;
}

function TaskForm({ context, task, taskId, loading, loadError, onSaved }: { context: Context | null; task: Task | undefined; taskId: string | undefined; loading: boolean; loadError: string; onSaved: () => Promise<void> }) {
  const storageKey = draftKey(taskId);
  const initial = useMemo(() => {
    try { const saved = sessionStorage.getItem(storageKey); return saved ? JSON.parse(saved) as Draft : task ? toDraft(task) : emptyDraft; }
    catch { return task ? toDraft(task) : emptyDraft; }
  }, [storageKey, task]);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!taskId || task) sessionStorage.setItem(storageKey, JSON.stringify(draft)); }, [draft, storageKey, task, taskId]);
  useEffect(() => { if (task && !sessionStorage.getItem(storageKey)) setDraft(toDraft(task)); }, [task, storageKey]);
  useEffect(() => { if (notice) errorRef.current?.focus(); }, [notice]);
  function change(field: keyof Pick<Draft, 'recipientName' | 'recipientPhone' | 'addressText' | 'collectionAmount' | 'instructions'>, value: string) {
    setDraft(current => { const editable = { ...current }; delete editable.actionId; delete editable.deviceSequence; return { ...editable, [field]: value }; });
    setErrors(current => ({ ...current, [field]: '' }));
  }
  function validate() {
    const next: Record<string, string> = {};
    if (!draft.recipientName.trim()) next.recipientName = 'اسم المستلم مطلوب.';
    const phone = draft.recipientPhone.replace(/[\s()-]/g, '');
    if (!phone) next.recipientPhone = 'رقم الهاتف مطلوب.';
    else if (!/^(?:\+[1-9]\d{7,14}|01[0125]\d{8})$/.test(phone)) next.recipientPhone = 'اكتب رقمًا مصريًا صحيحًا أو رقمًا دوليًا مع كود الدولة.';
    if (!draft.addressText.trim()) next.addressText = 'العنوان مطلوب حتى يمكن حفظ المهمة.';
    const minor = amountMinor(draft.collectionAmount.trim());
    if (Number.isNaN(minor)) next.collectionAmount = 'اكتب المبلغ بالجنيه وبحد أقصى رقمين للقروش.';
    setErrors(next); return { ok: Object.keys(next).length === 0, phone, minor };
  }
  async function save() {
    const checked = validate();
    if (!checked.ok || !context) { if (!context) setNotice('انتظر اكتمال تحميل الحساب ثم حاول مرة أخرى.'); return; }
    const actionId = draft.actionId ?? crypto.randomUUID();
    const deviceSequence = draft.deviceSequence ?? nextSequence();
    setDraft(current => ({ ...current, actionId, deviceSequence })); setBusy(true); setNotice('');
    const payload = { recipientName: draft.recipientName.trim(), recipientPhone: checked.phone,
      destination: { kind: 'address', addressText: draft.addressText.trim() },
      ...(checked.minor === undefined ? {} : { collectionAmount: { amountMinor: checked.minor, currency: 'EGP', exponent: 2 } }),
      ...(draft.instructions.trim() ? { instructions: draft.instructions.trim() } : {}),
      ...(task ? { taskId: task.taskId, expectedRevision: task.revision } : {}) };
    const operationId = task ? 'task.reviseIndependent' : 'task.createIndependent';
    const envelope = { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId, operationId,
      context: { kind: 'device', tenantId: context.access.tenantId, accountId: context.access.sourceId, deviceId: deviceId(), deviceGeneration: 1, deviceSequence },
      resources: task ? { taskId: task.taskId } : {}, baseVersions: task ? { resourceRevision: task.revision } : {},
      dependsOnActionIds: [], observation: { observedAt: null, clock: { quality: 'unknown' } }, payload };
    try {
      await api(task ? `/api/v1/independent/tasks/${task.taskId}` : '/api/v1/independent/tasks', { method: task ? 'PUT' : 'POST', body: JSON.stringify(envelope) });
      sessionStorage.removeItem(storageKey); await onSaved();
    } catch (failure) {
      const problem = failure as RequestError;
      setErrors(problem.fields ?? {}); setNotice(problem.message || 'تعذر الحفظ؛ المدخلات ما زالت محفوظة.');
    } finally { setBusy(false); }
  }
  if (loading && !context) return <main className="tasks-shell"><StatusNotice title="جارٍ تحميل المهمة" /></main>;
  if (taskId && !task) return <main className="tasks-shell"><StatusNotice tone="error" title="تعذر فتح المهمة">{loadError || 'المهمة غير متاحة لهذا الحساب.'}<button className="inline-retry" onClick={() => navigate('/tasks')}>العودة للمهام</button></StatusNotice></main>;
  return <main className="tasks-shell"><header className="form-header"><button className="back-button" onClick={() => navigate('/tasks')}><ArrowRight aria-hidden="true" />العودة للمهام</button><p className="eyebrow">{task ? 'تصحيح قبل التحرك' : 'مهمة جديدة'}</p><h1>{task ? 'صحّح بيانات المهمة' : 'أضف بيانات التوصيل'}</h1><p>الاسم والهاتف والعنوان أولًا. لا توجد بيانات مخزن أو أصناف مطلوبة.</p></header>
    <form className="task-form" onSubmit={event => { event.preventDefault(); void save(); }} noValidate>
      {notice ? <div ref={errorRef} tabIndex={-1}><StatusNotice tone="error" title="تعذر الحفظ">{notice}</StatusNotice></div> : null}
      <Field id="recipient-name" label="اسم المستلم (مطلوب)" value={draft.recipientName} onChange={event => change('recipientName', event.target.value)} {...(errors.recipientName ? { error: errors.recipientName } : {})} autoComplete="name" maxLength={200} />
      <Field id="recipient-phone" label="رقم الهاتف (مطلوب)" value={draft.recipientPhone} onChange={event => change('recipientPhone', event.target.value)} {...(errors.recipientPhone ? { error: errors.recipientPhone } : {})} type="tel" inputMode="tel" dir="ltr" autoComplete="tel" />
      <div className="field"><label htmlFor="address-text">العنوان المكتوب (مطلوب)</label><textarea id="address-text" value={draft.addressText} onChange={event => change('addressText', event.target.value)} aria-invalid={Boolean(errors.addressText)} aria-describedby="address-help" rows={3} maxLength={500} /><p id="address-help" className={errors.addressText ? 'field-error' : 'field-hint'}>{errors.addressText ?? 'احفظ العنوان ثم افتح «مراجعة الموقع» لاختيار نقطة التوصيل وتأكيدها.'}</p></div>
      <Field id="collection-amount" label="مبلغ التحصيل (اختياري)" value={draft.collectionAmount} onChange={event => change('collectionAmount', event.target.value)} {...(errors.collectionAmount ? { error: errors.collectionAmount } : {})} inputMode="decimal" dir="ltr" placeholder="مثال: 125.50" hint="بالجنيه المصري؛ اتركه فارغًا إذا لا يوجد تحصيل." />
      <div className="field"><label htmlFor="instructions">تعليمات قصيرة (اختياري)</label><textarea id="instructions" value={draft.instructions} onChange={event => change('instructions', event.target.value)} aria-invalid={Boolean(errors.instructions)} rows={3} maxLength={1000} /></div>
      <ActionButton type="submit" busy={busy}>{busy ? 'جارٍ الحفظ…' : task ? 'حفظ التصحيح' : 'حفظ المهمة'}</ActionButton>
      <button type="button" className="cancel-button" onClick={() => navigate('/tasks')}>الرجوع بدون حذف المدخلات</button>
    </form></main>;
}
