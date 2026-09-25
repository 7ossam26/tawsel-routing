import { useCallback, useEffect, useMemo, useState } from 'react';
import type { components } from '@tawsel/api-client';
import { ClosureClient, formatWorkdayInstant } from '@tawsel/api-client/src/closure';
import { CurrentClient } from '@tawsel/api-client/src/current';
import { RoundsClient } from '@tawsel/api-client/src/rounds';
import { LocationClient } from '@tawsel/api-client/src/locations';
import { ActionButton, StatusNotice } from './components/ui';
import { api, deviceId } from './independent-tasks';
import { confirmedExecutionOwner, executionEnvelope, pendingExecutionLinks, useExecutionCommand } from './execution-command';

type S = components['schemas'];
type Command = S['ClosureEndRoundCommand'] | S['ClosureEndDayCommand'];
const blockers: Record<string, string> = { 'result-required': 'راجع النتيجة قبل إعادة المحاولة', deferred: 'مؤجلة باختيارك', 'earliest-time': 'لم يحن وقت الإتاحة', 'location-required': 'تحتاج نقطة توصيل', 'receipt-or-disposition': 'تحتاج تأكيد الاستلام أو تسجيل التصرف', 'capacity-admission': 'بانتظار مكان في الجولة' };
function money(minor: string) { const amount = BigInt(minor); return `${(amount / 100n).toLocaleString('ar-EG')}٫${(amount % 100n).toLocaleString('ar-EG', { minimumIntegerDigits: 2, useGrouping: false })} ج.م`; }

export function ClosurePage() {
  const kind = new URLSearchParams(window.location.search).get('kind') === 'company' ? 'company' : 'personal';
  const client = useMemo(() => new ClosureClient(kind), [kind]);
  const [session, setSession] = useState<S['SessionContext'] | null>(null), [summary, setSummary] = useState<S['ClosureSummary'] | null>(null);
  const [current, setCurrent] = useState<S['CurrentSnapshot'] | null>(null), [owner, setOwner] = useState<S['DeviceContext'] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({}), [error, setError] = useState(''), [loaded, setLoaded] = useState(false), [fresh, setFresh] = useState(false);
  const [choice, setChoice] = useState<'round' | 'day'>('round'), [pause, setPause] = useState(false);
  const key = session && summary ? `tawsel:closure:${session.access.tenantId}:${session.access.sourceId}:${summary.workdayId}:${deviceId()}` : '';
  const action = useExecutionCommand<Command, S['ClosureActionResult']>(key, async command => { const result = command.operationId === 'round.end' ? await client.endRound(command) : await client.endDay(command); if ('status' in result) throw new Error('إنهاء العمل ما زال معلقًا؛ لم يتأكد من الخادم.'); return result; }, id => client.result(id));
  const refresh = useCallback(async () => {
    setFresh(false);
    const context = await api(`/api/session/context?kind=${kind}`) as S['SessionContext']; setSession(context);
    const round = await new RoundsClient(kind).current();
    const id = new URLSearchParams(window.location.search).get('workdayId') ?? round.workday?.workdayId;
    if (!id) { setLoaded(true); setSummary(null); return; }
    const day = await client.summary(id), latest = day.rounds.at(-1);
    const state = round.round?.workdayId === id ? await new CurrentClient(kind).read(round.round.roundId) : null;
    const ownership = latest && !day.endedAt ? await confirmedExecutionOwner(kind, latest.roundId) : null;
    const locations = await new LocationClient(kind).list();
    setNames(Object.fromEntries(locations.items.map(item => [item.taskId, item.recipientName])));
    setSummary(day); setCurrent(state); setOwner(ownership); setFresh(true); setLoaded(true); if (!state) setChoice('day');
    const url = new URL(window.location.href); url.searchParams.set('workdayId', id); window.history.replaceState({}, '', url);
  }, [client, kind]);
  useEffect(() => { void refresh().catch(e => { setLoaded(true); setError(e instanceof Error ? e.message : 'تعذر تحميل اليوم.'); }); }, [refresh]);
  async function run(command?: Command) { const accepted = await action.execute(command); if (accepted) setPause(false); try { await refresh(); } catch { setFresh(false); setError('تعذر تحديث الملخص؛ تحقّق من الخادم قبل المتابعة.'); } }
  const anchor = summary?.rounds.at(-1), active = Boolean(current), arrived = current?.currentActivity?.stage === 'arrived', heading = current?.currentActivity?.stage === 'heading';
  const unresolved = session ? pendingExecutionLinks(session, key) : [];
  const branch = current?.branchActivity, blocked = !fresh || owner?.mode !== 'owner' || Boolean(action.pending) || action.busy || unresolved.length > 0 || arrived || Boolean(branch) || (heading && !pause) || (!active && anchor?.activityRevision === undefined);
  function close() {
    if (blocked || !session || !summary || !anchor || !owner || summary.endedAt) return;
    const payload = { workdayId: summary.workdayId, roundId: anchor.roundId, expectedActiveRoundId: current?.roundId ?? null, expectedActivityRevision: current?.revision ?? anchor.activityRevision!, expectedCurrentAttemptId: current?.currentActivity?.attemptId ?? null, currentAction: heading ? 'pause-heading' as const : 'require-none' as const };
    const base = executionEnvelope(session, anchor.roundId, owner.owner.generation);
    if (choice === 'round') { if (!current) return; void run({ ...base, operationId: 'round.end', payload: { ...payload, expectedActiveRoundId: current.roundId } }); }
    else void run({ ...base, operationId: 'workday.end', payload });
  }
  return <main className="tasks-shell closure-shell" dir="rtl"><header className="tasks-header"><div><p className="eyebrow">توصيل · يوم العمل</p><h1>ملخص العمل والإنهاء</h1><p>راجع النتائج والعمل المتبقي قبل إنهاء الجولة أو اليوم.</p></div></header>
    {error ? <StatusNotice tone="error" title="تعذر تحديث الملخص" live>{error}</StatusNotice> : null}
    {action.message ? <StatusNotice tone={action.pending ? 'waiting' : action.review ? 'error' : 'info'} title="حالة الإنهاء" live>{action.message}</StatusNotice> : null}
    {action.pending ? <StatusNotice tone="waiting" title="الإنهاء لم يتأكد بعد">لا تبدأ جولة أخرى قبل التحقق. <ActionButton busy={action.busy} onClick={() => void run()}>تحقّق من الإنهاء نفسه</ActionButton></StatusNotice> : null}
    {unresolved.length ? <section className="current-stage-card"><h2>تحقّق من الإجراءات السابقة أولًا</h2><p>يوجد طلب لم تتأكد نتيجته؛ الإنهاء ينتظر مراجعته.</p>{unresolved.map(item => <a className="edit-link" key={item.id} href={item.href}>فتح الإجراء المعلّق</a>)}</section> : null}
    {!loaded ? <StatusNotice title="جارٍ تحميل ملخص اليوم" /> : !summary ? <StatusNotice title="لم يبدأ يوم عمل بعد" /> : <>
      <section className="current-stage-card"><h2>{summary.endedAt ? 'انتهى يوم العمل' : active ? 'الجولة نشطة' : 'انتهت الجولة — اليوم مفتوح'}</h2><p>بداية يوم العمل: <bdi>{formatWorkdayInstant(summary.openedAt)}</bdi></p>{summary.endedAt ? <p>نهاية اليوم: <bdi>{formatWorkdayInstant(summary.endedAt)}</bdi></p> : null}
        <dl className="return-counts"><div><dt>تسليم كامل</dt><dd>{summary.scope.fullShipments}</dd></div><div><dt>تسليم جزئي</dt><dd>{summary.scope.partialShipments}</dd></div><div><dt>رفض</dt><dd>{summary.scope.refusedShipments}</dd></div><div><dt>عدم رد</dt><dd>{summary.scope.noAnswerShipments}</dd></div><div><dt>لم تنتهِ</dt><dd>{summary.scope.unfinishedShipments}</dd></div></dl>
        <h3>التحصيل المسجّل</h3>{summary.collection.length ? summary.collection.map((item, i) => <p key={i}><strong><bdi>{money(item.reportedMinor)}</bdi></strong>{item.unreportedAttempts ? ` · ${item.unreportedAttempts} محاولة دون مبلغ مسجّل` : ''}</p>) : <p>لا يوجد تحصيل مسجّل.</p>}<p>هذه مبالغ أبلغت عنها؛ ليست تسوية مالية.</p>
      </section>
      <section className="current-stage-card"><h2>العمل المحتفظ به ({summary.carryForward.items.length})</h2><p>سيظهر هذا العمل في القائمة التالية بحالته الحالية{kind === 'company' ? ' دون إعادة إرسال من نظام الشركة' : ''}. الإنهاء لا يسجّل تسليمًا{kind === 'company' ? ' أو استلامًا للفرع' : ''}.</p>
        {summary.carryForward.items.map(item => <article className="return-item" key={`${item.taskId}:${item.dispatchCycleId}`}><h3>{names[item.taskId] ?? item.sourceReference?.externalId ?? item.taskId}</h3><p>{item.disposition === 'unfinished' ? 'لم تنتهِ' : item.disposition === 'return-required' ? 'معك للإرجاع' : 'محاولة غير ناجحة'}{kind === 'company' && item.heldPieces !== null ? ` · ${item.heldPieces} قطعة` : ''}</p>{item.blocker ? <p>{blockers[item.blocker]}</p> : <p>متاح للتجهيز التالي.</p>}{item.earliestAt ? <p>الإتاحة: <bdi>{formatWorkdayInstant(item.earliestAt)}</bdi></p> : null}{kind === 'company' && item.unpaidShippingMinor !== '0' ? <p>شحن غير محصّل: <bdi>{money(item.unpaidShippingMinor)}</bdi></p> : null}</article>)}
      </section>
      {!summary.endedAt ? <section className="current-stage-card"><h2>اختر ما تريد إنهاءه</h2>{owner?.mode !== 'owner' ? <StatusNotice tone="waiting" title="التنفيذ على هاتف آخر">{active ? <a href={`/rounds/current?kind=${kind}`}>عرض الجولة ونقل التنفيذ لهذا الهاتف</a> : 'أكمل إنهاء اليوم من الهاتف الذي يملك آخر جولة.'}</StatusNotice> : null}
        {arrived ? <StatusNotice tone="waiting" title="سجّل نتيجة العميل أولًا"><a href={`/rounds/current?kind=${kind}`}>العودة للعميل الحالي</a></StatusNotice> : branch ? <StatusNotice tone="waiting" title="أكمل زيارة الفرع أولًا"><a href="/execution/branch?kind=company">متابعة زيارة الفرع</a></StatusNotice> : null}
        <div className="field"><label htmlFor="closure-kind">نطاق الإنهاء</label><select id="closure-kind" value={choice} onChange={e => setChoice(e.target.value as 'round' | 'day')} disabled={Boolean(action.pending) || action.busy}>{active ? <option value="round">الجولة فقط — اليوم يبقى مفتوحًا</option> : null}<option value="day">يوم العمل كله</option></select></div>
        <p>{choice === 'round' ? 'ينتهي تنفيذ هذه الجولة، ويمكن تجهيز جولة أخرى في يوم العمل نفسه.' : 'ينتهي يوم العمل والجولة النشطة؛ العمل المتبقي محفوظ لليوم التالي.'}</p>
        {heading ? <label className="closure-pause"><input type="checkbox" checked={pause} onChange={e => setPause(e.target.checked)} disabled={Boolean(action.pending) || action.busy} />أوقف الاتجاه للعميل الحالي وأحتفظ بمهمته</label> : null}
        <ActionButton disabled={Boolean(blocked)} onClick={close}>{choice === 'round' ? 'إنهاء الجولة فقط' : 'إنهاء يوم العمل'}</ActionButton>
      </section> : null}
    </>}
    <ActionButton variant="quiet" disabled={action.busy} onClick={() => { setError(''); void refresh().catch(() => { setFresh(false); setError('لا يوجد تأكيد جديد؛ حدّث عند عودة الاتصال.'); }); }}>تحديث ملخص العمل</ActionButton>
    <nav className="context-actions"><a href={`/day?kind=${kind}`}>العودة لعمل اليوم</a>{active ? <a href={`/rounds/current?kind=${kind}`}>العودة للجولة</a> : null}</nav>
  </main>;
}
