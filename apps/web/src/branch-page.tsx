import { useCallback, useEffect, useMemo, useState } from 'react';
import type { components } from '@tawsel/api-client';
import { BranchesClient } from '@tawsel/api-client/src/branches';
import { ReturnsClient } from '@tawsel/api-client/src/returns';
import { RoundsClient } from '@tawsel/api-client/src/rounds';
import { CurrentClient } from '@tawsel/api-client/src/current';
import { DevicesClient } from '@tawsel/api-client/src/devices';
import { ActionButton, Field, StatusNotice } from './components/ui';
import { api, deviceId } from './independent-tasks';
import { confirmedExecutionOwner, executionEnvelope, pendingExecutionLinks, useExecutionCommand } from './execution-command';

type S = components['schemas'];
type Command = S['ReturnRequestCommand'] | S['BranchInterruptCommand'] | S['BranchArrivalCommand'] | S['BranchResumeCommand'];
const lineKey = (item: S['ReturnGroup']['items'][number]) => `${item.dispatchCycleId}:${item.sourceLineId}`;
const validQuantity = (value: string | undefined, maximum: number) => value !== undefined && /^\d+$/.test(value) && Number(value) <= maximum;

export function BranchPage() {
  const company = new URLSearchParams(window.location.search).get('kind') === 'company';
  return company ? <CompanyBranchPage /> : <main className="tasks-shell" dir="rtl"><h1>عملك اليوم</h1><a href="/day?kind=personal">العودة لعمل اليوم</a></main>;
}

function CompanyBranchPage() {
  const returns = useMemo(() => new ReturnsClient('company'), []), branches = useMemo(() => new BranchesClient(), []);
  const [context, setContext] = useState<S['SessionContext'] | null>(null), [current, setCurrent] = useState<S['CurrentSnapshot'] | null>(null);
  const [owner, setOwner] = useState<S['DeviceContext'] | null>(null), [groups, setGroups] = useState<S['ReturnGroups']>({ groups: [] });
  const [request, setRequest] = useState<S['ReturnRequestView'] | null>(null), [requestId, setRequestId] = useState(new URLSearchParams(window.location.search).get('requestId') ?? '');
  const [groupIndex, setGroupIndex] = useState(0), [quantities, setQuantities] = useState<Record<string, string>>({}), [claims, setClaims] = useState<Record<string, string>>({});
  const [minutes, setMinutes] = useState('5'), [error, setError] = useState(''), [loaded, setLoaded] = useState(false), [fresh, setFresh] = useState(false);
  const [confirmation, setConfirmation] = useState<S['ReturnConfirmation'] | null>(null);
  const key = context ? `tawsel:branch:${context.access.tenantId}:${context.access.sourceId}:${deviceId()}` : '';
  function rememberOffer(value: S['ActionResult']) { if (value.receipt.businessStatus === 'accepted' && value.response?.body && 'request' in value.response.body) { const offered = (value.response.body as S['ReturnCommandResult']).request; setRequestId(offered.requestId); const url = new URL(window.location.href); url.searchParams.set('requestId', offered.requestId); window.history.replaceState({}, '', url); } return value; }
  const action = useExecutionCommand<Command, S['ActionResult']>(key, async command => command.operationId === 'return.requestHandover' ? rememberOffer(await returns.offer(command)) : branches.command(command), async (id, command) => { const status = command.operationId === 'return.requestHandover' ? await returns.result(id) : await new DevicesClient('company').result(id); if (command.operationId === 'return.requestHandover' && 'result' in status && status.result) rememberOffer(status.result); return status; });
  const refresh = useCallback(async () => {
    setFresh(false); setConfirmation(null);
    const session = await api('/api/session/context?kind=company') as S['SessionContext']; setContext(session);
    const round = (await new RoundsClient('company').current()).round;
    const state = round ? await new CurrentClient('company').read(round.roundId) : null;
    const ownership = round ? await confirmedExecutionOwner('company', round.roundId) : null;
    const offered = await returns.groups();
    const id = state?.branchActivity?.requestId ?? (requestId || offered.pendingRequests?.[0]?.requestId);
    const selected = id ? await returns.read(id) : null;
    let checked: S['ReturnConfirmation'] | null = null;
    setCurrent(state); setOwner(ownership); setGroups(offered); setRequest(selected);
    if (state?.branchActivity) checked = await returns.confirmation(state.branchActivity.requestId, state.branchActivity.claims);
    setCurrent(state); setOwner(ownership); setGroups(offered); setRequest(selected); setConfirmation(checked); setFresh(true); setLoaded(true);
  }, [requestId, returns]);
  useEffect(() => { void refresh().catch(e => { setError(e instanceof Error ? e.message : 'تعذر تحميل الحالة.'); setLoaded(true); }); }, [refresh]);
  const branch = current?.branchActivity, group = groups.groups[groupIndex];
  const unresolved = context ? pendingExecutionLinks(context, key) : [];
  const canWrite = fresh && owner?.mode === 'owner' && !action.pending && !action.busy && unresolved.length === 0;
  const arrived = current?.currentActivity?.stage === 'arrived';
  async function run(command?: Command) { await action.execute(command); setError(''); try { await refresh(); } catch { setFresh(false); setConfirmation(null); setError('تعذر تحديث الحالة. لا يوجد تأكيد جديد؛ حدّث قبل المتابعة.'); } }
  function base() { return executionEnvelope(context!, current!.roundId, owner!.owner.generation); }
  const offerItems = group?.items.filter(item => Number(quantities[lineKey(item)] ?? 0) > 0) ?? [];
  const offerValid = offerItems.length > 0 && group!.items.every(item => validQuantity(quantities[lineKey(item)] ?? '0', item.availableToRequest));
  const selectedClaims = request?.items.filter(item => Number(claims[item.itemId] ?? 0) > 0).map(item => ({ itemId: item.itemId, quantity: Number(claims[item.itemId]) })) ?? [];
  const claimValid = selectedClaims.length > 0 && selectedClaims.every(claim => { const item = request!.items.find(i => i.itemId === claim.itemId)!; return item.eligibility !== 'superseded' && validQuantity(claims[item.itemId], item.requested); });
  function offer() { if (!canWrite || !current || !group || !offerValid) return; void run({ ...base(), operationId: 'return.requestHandover', payload: { roundId: current.roundId, sourceBranchId: group.sourceBranchId, items: offerItems.map(item => ({ taskId: item.taskId, dispatchCycleId: item.dispatchCycleId, outcomeId: item.outcomeId, sourceLineId: item.sourceLineId, quantity: Number(quantities[lineKey(item)]) })) } }); }
  function interrupt() { if (!canWrite || !current || !request || arrived || !claimValid) return; void run({ ...base(), operationId: 'branch.interruptRound', payload: { roundId: current.roundId, expectedActivityRevision: current.revision, expectedCurrentAttemptId: current.currentActivity?.attemptId ?? null, requestId: request.requestId, claims: selectedClaims, serviceEstimateSeconds: Number(minutes) * 60 } }); }
  function transition() { if (!canWrite || !current || !branch || (branch.stage === 'arrived' && confirmation?.state !== 'confirmed')) return; void run({ ...base(), operationId: branch.stage === 'heading' ? 'branch.recordArrival' : 'branch.resumeRound', payload: { roundId: current.roundId, expectedActivityRevision: current.revision, expectedCurrentAttemptId: current.currentActivity?.attemptId ?? null, segmentId: branch.segmentId, expectedBranchRevision: branch.revision } }); }
  return <main className="tasks-shell branch-shell" dir="rtl"><header className="tasks-header"><div><p className="eyebrow">توصيل · فرع المصدر</p><h1>الإرجاع وزيارة الفرع</h1><p>طلب الإرجاع والوصول منفصلان عن استلام الفرع الفعلي.</p></div></header>
    {error ? <StatusNotice tone="error" title="تعذر تحديث الحالة" live>{error}</StatusNotice> : null}
    {action.message ? <StatusNotice tone={action.pending ? 'waiting' : action.review ? 'error' : 'info'} title="حالة الإجراء" live>{action.message}</StatusNotice> : null}
    {action.pending ? <StatusNotice tone="waiting" title="الطلب ينتظر التأكيد">لم يتأكد الحفظ. <ActionButton busy={action.busy} onClick={() => void run()}>تحقّق من الطلب نفسه</ActionButton></StatusNotice> : null}
    {unresolved.length ? <section className="current-stage-card"><h2>تحقّق من الإجراءات السابقة أولًا</h2>{unresolved.map(item => <a className="edit-link" key={item.id} href={item.href}>فتح الإجراء المعلّق</a>)}</section> : null}
    {!loaded ? <StatusNotice title="جارٍ تحميل زيارة الفرع" /> : !current ? <StatusNotice title="لا توجد جولة نشطة">افتح عمل اليوم لمراجعة العمل المحتفظ به.</StatusNotice> : <>
      {owner?.mode !== 'owner' ? <StatusNotice tone="waiting" title="الجولة تعمل على هاتف آخر">يمكنك مشاهدة الزيارة. <a href="/rounds/current?kind=company">عرض الجولة ونقل التنفيذ</a></StatusNotice> : null}
      {arrived ? <StatusNotice tone="waiting" title="سجّل نتيجة العميل أولًا">وصلت للعميل؛ أكمل نتيجته قبل زيارة الفرع. <a href="/rounds/current?kind=company">العودة للعميل الحالي</a></StatusNotice> : null}
      {branch ? <section className="current-stage-card"><h2>{branch.stage === 'heading' ? 'متجه لفرع المصدر' : 'وصلت للفرع — الاستلام منفصل'}</h2><p>{request?.sourceBranchName ?? 'فرع المصدر'}</p>
        {branch.stage === 'arrived' ? <StatusNotice tone={confirmation?.state === 'confirmed' ? 'info' : 'waiting'} title={confirmation?.state === 'confirmed' ? 'أكد الفرع القطع المحددة' : 'بانتظار تأكيد الفرع'}>{confirmation?.message ?? 'تعذر التحقق من الاستلام. حدّث الحالة عند عودة الاتصال.'} التأكيد يسجّله موظف الفرع في نظام الشركة.</StatusNotice> : null}
        <ActionButton disabled={!canWrite || (branch.stage === 'arrived' && confirmation?.state !== 'confirmed')} onClick={transition}>{branch.stage === 'heading' ? 'وصلت للفرع' : 'استأنف الجولة'}</ActionButton>
        <h3>ترتيب العملاء المحفوظ ({branch.retainedSequence.length})</h3><p>الزيارة في الجولة نفسها. العملاء متوقفون مؤقتًا؛ لم يتم تسليمهم.</p><ol className="retained-sequence">{branch.retainedSequence.map(item => <li key={item.attemptId}>{current.targets.find(t => t.taskId === item.taskId)?.recipientName ?? item.taskId}{branch.pausedActivity?.attemptId === item.attemptId ? ' — أوقفنا الاتجاه إليه' : ''}</li>)}</ol>
      </section> : null}
      {!branch && groups.pendingRequests?.length ? <div className="field"><label htmlFor="return-request">طلب الإرجاع</label><select id="return-request" value={request?.requestId ?? ''} onChange={e => { setRequestId(e.target.value); setClaims({}); const url = new URL(window.location.href); url.searchParams.set('requestId', e.target.value); window.history.replaceState({}, '', url); }}>{groups.pendingRequests.map(item => <option value={item.requestId} key={item.requestId}>طلب {item.items.map(i => i.externalId).join('، ')} · {item.sourceBranchName ?? 'فرع المصدر'}</option>)}</select></div> : null}
      {request ? <section className="current-stage-card"><h2>الكميات المعروضة وحالتها</h2>{request.items.map(item => <article className="return-item" key={item.itemId}><h3>{item.externalId} · {item.sourceLineId}</h3><dl className="return-counts"><div><dt>المطلوب</dt><dd>{item.requested}</dd></div><div><dt>استلام مؤكد</dt><dd>{item.received}</dd></div><div><dt>غير محسوم</dt><dd>{item.unresolved}</dd></div><div><dt>فقد</dt><dd>{item.lost}</dd></div><div><dt>تلف</dt><dd>{item.damaged}</dd></div></dl><p>المتبقي معك: {item.custody.held} قطعة</p>{!branch ? <Field id={`claim-${item.itemId}`} label={`القطع المطلوب تأكيدها — ${item.externalId}/${item.sourceLineId}`} hint="إجمالي المطالبة لهذه الزيارة، شامل ما أكده الفرع سابقًا. اترك صفرًا لما لن تسلّمه الآن." type="number" min="0" max={item.requested} step="1" value={claims[item.itemId] ?? '0'} disabled={!canWrite || item.eligibility === 'superseded'} onChange={e => setClaims({ ...claims, [item.itemId]: e.target.value })} /> : <p>مطالبة الزيارة: {branch.claims.find(c => c.itemId === item.itemId)?.quantity ?? 0} قطعة</p>}</article>)}
        {!branch ? <><Field id="branch-minutes" label="وقت خدمة الفرع المتوقع بالدقائق" type="number" min="1" max="1440" step="1" value={minutes} onChange={e => setMinutes(e.target.value)} /><p>سيُحفظ ترتيب العملاء. المطالبة تخص القطع المختارة فقط؛ الباقي يظل ظاهرًا.</p><ActionButton disabled={!canWrite || arrived || !claimValid || !/^\d+$/.test(minutes) || Number(minutes) < 1 || Number(minutes) > 1440} onClick={interrupt}>اتجه للفرع واحفظ ترتيب العملاء</ActionButton></> : null}
      </section> : null}
      {!branch ? <details className="current-secondary" open={!request}><summary>طلب إرجاع جديد</summary>{groups.groups.length ? <><div className="field"><label htmlFor="source-group">فرع المصدر</label><select id="source-group" value={groupIndex} onChange={e => { setGroupIndex(Number(e.target.value)); setQuantities({}); }}>{groups.groups.map((item, i) => <option key={`${item.integrationId}:${item.sourceBranchId}`} value={i}>{item.sourceBranchName ?? `فرع المصدر ${i + 1}`} · {item.items.map(line => line.externalId).join('، ')}</option>)}</select></div>{group?.items.map(item => <Field key={lineKey(item)} id={`offer-${lineKey(item)}`} label={`الكمية المعروضة — ${item.externalId}/${item.sourceLineId}`} hint={`متاح للطلب: ${item.availableToRequest} قطعة`} type="number" min="0" max={item.availableToRequest} step="1" value={quantities[lineKey(item)] ?? '0'} disabled={!canWrite} onChange={e => setQuantities({ ...quantities, [lineKey(item)]: e.target.value })} />)}<ActionButton variant={request ? 'secondary' : 'primary'} disabled={!canWrite || !offerValid} onClick={offer}>أرسل طلب الإرجاع</ActionButton></> : <p>لا توجد قطع متاحة لطلب جديد.</p>}</details> : null}
    </>}
    <ActionButton variant="quiet" disabled={action.busy} onClick={() => { setError(''); void refresh().catch(() => { setFresh(false); setError('لا يوجد تأكيد جديد؛ حاول عند عودة الاتصال.'); }); }}>تحديث حالة الفرع</ActionButton>
    <nav className="context-actions"><a href="/rounds/current?kind=company">العودة للجولة</a><a href="/day?kind=company">عمل اليوم</a></nav>
  </main>;
}
