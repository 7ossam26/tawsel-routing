import { useEffect, useMemo, useState } from 'react';
import type { components } from '@tawsel/api-client';
import { EligibilityClient } from '@tawsel/api-client/src/eligibility';
import { LocationClient } from '@tawsel/api-client/src/locations';
import { OutcomesClient } from '@tawsel/api-client/src/outcomes';
import { ActionButton, Field, StatusNotice } from './components/ui';
import { api, deviceId } from './independent-tasks';
import { confirmedExecutionOwner, executionEnvelope, useExecutionCommand } from './execution-command';
import { amountLabel, resultNames } from './execution-result';

type S = components['schemas'];
type Choice = 'defer' | 'retry' | 'activate' | 'urgency';
type Command = S['EligibilityDeferCommand'] | S['EligibilityRetryCommand'] | S['EligibilityActivateCommand'] | S['EligibilityUrgencyCommand'];
const labels = { defer: 'تأجيل المهمة كاملة', retry: 'إعادة المحاولة كاملة', activate: 'إتاحة المهمة المؤجلة', urgency: 'أولوية المهمة' };
const operations = { defer: 'task.deferWhole', retry: 'task.retryWhole', activate: 'task.activateDeferred', urgency: 'task.setDriverUrgency' } as const;

export function ExecutionOptionsPage() {
  const params = new URLSearchParams(location.search), kind = params.get('kind') === 'company' ? 'company' : 'personal', roundId = params.get('roundId') ?? '';
  const client = useMemo(() => new EligibilityClient(kind), [kind]);
  const [session, setSession] = useState<S['SessionContext'] | null>(null), [state, setState] = useState<S['EligibilitySnapshot'] | null>(null), [ownership, setOwnership] = useState<S['DeviceContext'] | null>(null);
  const [locations, setLocations] = useState<S['LocationExecutionSnapshot'][]>([]), [outcomes, setOutcomes] = useState<S['OutcomeSnapshot'] | null>(null), [selected, setSelected] = useState(params.get('taskId') ?? ''), [choice, setChoice] = useState<Choice>('urgency'), [earliest, setEarliest] = useState(''), [urgency, setUrgency] = useState<'urgent' | 'ordinary'>('urgent'), [error, setError] = useState('');
  const key = session ? `tawsel:options:${session.access.tenantId}:${session.access.sourceId}:${roundId}:${deviceId()}` : '';
  const command = useExecutionCommand<Command, S['EligibilityActionResult']>(key, value => value.operationId === 'task.deferWhole' ? client.defer(value) : value.operationId === 'task.retryWhole' ? client.retry(value) : value.operationId === 'task.activateDeferred' ? client.activate(value) : client.urgency(value), id => client.result(id));
  async function load() { try { const context = await api(`/api/session/context?kind=${kind}`) as S['SessionContext']; setSession(context); const [next, owner, pins, history] = await Promise.all([client.read(roundId), confirmedExecutionOwner(kind, roundId), new LocationClient(kind).list(), new OutcomesClient(kind).read(roundId)]); setState(next); setOwnership(owner); setLocations(pins.items); setOutcomes(history); setSelected(previous => next.items.some(item => item.taskId === previous) ? previous : next.items[0]?.taskId ?? ''); setError(''); } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر تحميل خيارات العمل.'); } }
  useEffect(() => { void load(); }, []);
  const item = state?.items.find(value => value.taskId === selected), pin = locations.find(value => value.taskId === selected);
  const draftKey = key && item ? `${key}:draft:${item.taskId}` : '';
  useEffect(() => { if (!draftKey) return; const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null'); setEarliest(saved?.earliest ?? ''); setUrgency(saved?.urgency ?? 'urgent'); setChoice(saved?.choice ?? 'urgency'); }, [draftKey]);
  function saveDraft(next: { earliest?: string; urgency?: 'urgent' | 'ordinary'; choice?: Choice }) { const value = { earliest, urgency, choice, ...next }; if (draftKey) sessionStorage.setItem(draftKey, JSON.stringify(value)); setEarliest(value.earliest); setUrgency(value.urgency); setChoice(value.choice); }
  const canWrite = ownership?.mode === 'owner' && (!ownership.snapshotRequired || Boolean(sessionStorage.getItem(`tawsel:owner-snapshot:${roundId}:${deviceId()}`))) && state?.mode !== 'historical';
  const allowed = item?.actions[choice];
  async function submit() {
    if (!session || !item || !state || !ownership || !canWrite || !allowed?.allowed || command.pending) return;
    const time = new Date(earliest); if (choice === 'defer' && !Number.isFinite(time.getTime())) { setError('اختر تاريخًا ووقتًا صالحين للتأجيل.'); return; }
    const value = { ...executionEnvelope(session, roundId, ownership.owner.generation), operationId: operations[choice], payload: { roundId, taskId: item.taskId, attemptId: item.attemptId, expectedActivityRevision: state.activityRevision, expectedCurrentAttemptId: state.currentAttemptId, expectedSourceRevision: item.sourceRevision, expectedAssignmentRevision: item.assignmentRevision, expectedPinRevision: item.pinRevision, expectedEligibilityRevision: item.revision, ...(choice === 'defer' ? { earliestAt: time.toISOString() } : choice === 'urgency' ? { urgency } : {}) } } as Command;
    await command.execute(value); await load();
  }
  const requestMessage = command.message || command.review?.result.receipt.problem?.detail || '';
  const history = outcomes?.history?.filter(value => value.taskId === selected) ?? [];
  return <main className="tasks-shell exception-page" dir="rtl"><a href={`/rounds/current?kind=${kind}`}>العودة للجولة</a><h1>خيارات العمل والسجل</h1><p>التأجيل والأولوية والمحاولات السابقة محفوظة مع المهمة.</p>{error ? <StatusNotice tone="error" title="تعذر تحديث الخيارات">{error}</StatusNotice> : null}
    {requestMessage ? <StatusNotice tone={command.review ? 'error' : command.pending ? 'waiting' : 'info'} title={command.review ? 'لم يُقبل التغيير؛ السجل محفوظ' : 'حالة الطلب'}>{command.review ? requestMessage.replace(/^[a-z-]+:\s*/, '') : requestMessage}</StatusNotice> : null}
    {command.pending ? <ActionButton busy={command.busy} onClick={() => void command.execute().then(ok => { if (ok) void load(); })}>تحقّق من الطلب المحفوظ</ActionButton> : null}
    {state ? <><label className="field">المهمة<select aria-label="المهمة" value={selected} disabled={command.busy || Boolean(command.pending)} onChange={event => { const taskId = event.target.value; setSelected(taskId); const url = new URL(location.href); url.searchParams.set('taskId', taskId); window.history.replaceState(null, '', url); }}>{state.items.map(value => <option key={value.taskId} value={value.taskId}>{locations.find(pin => pin.taskId === value.taskId)?.recipientName ?? 'مهمة'} · {value.deferred ? 'مؤجلة' : value.latestOutcomeId ? 'لها نتيجة' : 'متاحة'} · {value.taskId.slice(-6)}</option>)}</select></label>
      {item ? <><p>الأولوية الحالية: {item.urgency === 'urgent' ? 'عاجلة' : 'عادية'}{item.earliestAt ? ` · الإتاحة بدءًا من ${new Date(item.earliestAt).toLocaleString('ar-EG')}` : ''}</p>
        {!canWrite ? <StatusNotice tone="waiting" title="الخيارات للعرض فقط">افتح الجولة على الهاتف المالك وحمّل الحالة المؤكدة قبل التغيير.</StatusNotice> : null}
        <label className="field">اختر الإجراء<select aria-label="اختر الإجراء" value={choice} disabled={command.busy || Boolean(command.pending)} onChange={event => saveDraft({ choice: event.target.value as Choice })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {choice === 'defer' ? <Field id="earliest" label="الإتاحة بدءًا من" type="datetime-local" value={earliest} onChange={event => saveDraft({ earliest: event.target.value })} hint="وقت الجهاز للعرض والإدخال فقط؛ الخادم يتحقق من الموعد. لا تتاح المهمة تلقائيًا عند حلوله." /> : choice === 'urgency' ? <label className="field">الأولوية المطلوبة<select aria-label="الأولوية المطلوبة" value={urgency} onChange={event => saveDraft({ urgency: event.target.value as 'urgent' | 'ordinary' })}><option value="urgent">عاجلة</option><option value="ordinary">عادية</option></select><small>العميل الحالي محفوظ؛ العاجل لا يلغي موعد الإتاحة.</small></label> : <p>تُراجع الأهلية والسعة عند الحفظ. المحاولات والتحصيل السابق محفوظان.</p>}
        {!allowed?.allowed ? <StatusNotice tone="waiting" title="الإجراء غير متاح الآن">{allowed?.message}</StatusNotice> : null}
        <ActionButton busy={command.busy} aria-disabled={!canWrite || !allowed?.allowed || Boolean(command.pending)} onClick={() => void submit()}>{labels[choice]}</ActionButton>
        {pin?.editable && canWrite ? <a className="edit-link" href={`/locations/${item.taskId}?kind=${kind}&returnTo=execution&roundId=${roundId}`}>تصحيح نقطة التوصيل</a> : <p>تعديل نقطة التوصيل غير متاح في الحالة الحالية.</p>}
        {item.latestOutcomeId ? <a className="edit-link" href={`/execution/correction?kind=${kind}&attemptId=${item.attemptId}`}>مراجعة النتيجة وتصحيح التسجيل</a> : null}
        <details className="current-secondary"><summary>سجل المهمة والنتائج</summary>{history.length ? history.map(value => <article className="piece-row" key={value.outcomeId}><strong>{resultNames[value.outcome]} · مراجعة {value.revision}</strong><p>{amountLabel(value.collection.reported)} · {new Date(value.time.recordedAt).toLocaleString('ar-EG')}</p><p>{value.attemptId === item.attemptId ? 'المحاولة الحالية' : 'محاولة سابقة محفوظة'}</p></article>) : <p>لا توجد نتيجة مسجّلة.</p>}{state.history.filter(value => value.taskId === selected).map(value => <p key={value.revision}>{value.operationId === 'task.deferWhole' ? 'تأجيل' : value.operationId === 'task.setDriverUrgency' ? 'تغيير الأولوية' : 'إتاحة محاولة'} · {new Date(value.time.recordedAt).toLocaleString('ar-EG')}</p>)}</details>
      </> : <p>لا توجد مهام متاحة.</p>}</> : <p role="status">جارٍ تحميل الخيارات…</p>}
    <ActionButton variant="quiet" disabled={command.busy} onClick={() => void load()}>تحديث الخيارات</ActionButton>
  </main>;
}
