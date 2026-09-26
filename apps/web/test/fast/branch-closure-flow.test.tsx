// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BranchPage } from '../../src/branch-page';
import { ClosurePage } from '../../src/closure-page';
import { pendingExecutionLinks } from '../../src/execution-command';
import type { components } from '@tawsel/api-client';
import { localWork } from '../../src/local-work';
import { headingFixture } from './local-work-fixture';
import { connectedIds as ids, connectedContext, receiptFixture } from './execution-fixture';

beforeEach(() => { window.history.replaceState({}, '', '/execution/branch?kind=company'); localStorage.clear(); sessionStorage.clear(); localStorage.setItem('tawsel:device-id', ids.device); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function fixture(options: { arrived?: boolean; visit?: 'heading' | 'arrived'; confirmed?: boolean; lose?: boolean; otherPhone?: boolean; full?: boolean; disposed?: boolean } = {}) {
  const posts: { url: string; body: Record<string, unknown> }[] = []; // HTTP boundary fixtures, not transaction proof.
  const item = { itemId: 'item', taskId: ids.task, attemptId: ids.attempt, dispatchCycleId: 'cycle', outcomeId: 'outcome', sourceLineId: 'pieces', externalId: 'شحنة ١', requested: 3, received: options.confirmed ? 2 : 0, unresolved: options.confirmed ? 1 : 3, lost: options.disposed ? 1 : 0, damaged: 0, eligibility: 'pending', revision: 1, custody: { held: options.confirmed ? 1 : 3 } };
  const request = { requestId: 'request', sourceBranchId: 'source-branch', items: [item] };
  let offered = Boolean(options.visit), visit = options.visit;
  const branch = () => visit ? { segmentId: 'segment', requestId: 'request', sourceBranchId: 'source-branch', revision: 3, stage: visit, claims: [{ itemId: 'item', quantity: 2 }], retainedSequence: Array.from({ length: options.full ? 50 : 1 }, (_, i) => ({ taskId: i === 0 ? ids.task : `task-${i}`, attemptId: i === 0 ? ids.attempt : `attempt-${i}` })), pausedActivity: { attemptId: ids.attempt, stage: 'heading' } } : null;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input); let value: unknown;
    if (url.includes('/bootstrap')) value = { csrfToken: 'csrf' };
    else if (url.includes('/session/context')) value = { ...connectedContext, kind: new URLSearchParams(location.search).get('kind') ?? 'company' };
    else if (url.includes('/rounds/current')) value = { round: { roundId: ids.round } };
    else if (url.includes('/current/rounds/')) value = { roundId: ids.round, revision: 7, branchActivity: branch(), currentActivity: visit ? null : { taskId: ids.task, attemptId: ids.attempt, stage: options.arrived ? 'arrived' : 'heading' }, targets: [{ taskId: ids.task, recipientName: 'العميل المتوقف' }] };
    else if (url.includes('/devices/rounds/')) value = { mode: options.otherPhone ? 'view-only' : 'owner', owner: { generation: 2 }, snapshotRequired: false };
    else if (url.includes('/returns/groups')) value = { groups: [{ sourceBranchId: 'source-branch', items: [{ ...item, availableToRequest: offered ? 0 : 3 }] }], pendingRequests: offered ? [request] : [] };
    else if (url.includes('/confirmation')) { if (options.lose) throw new Error('offline'); value = { state: options.confirmed ? 'confirmed' : 'waiting', message: options.confirmed ? 'أكد الفرع استلام القطع المحددة. الباقي ظاهر بحالته.' : 'بانتظار تأكيد الفرع للقطع التي سلّمتها.' }; }
    else if (url.includes('/returns/requests/')) value = request;
    else if (url.includes('/actions/')) value = { status: 'pending' };
    else if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body)); posts.push({ url, body }); if (options.lose) throw new Error('offline');
      if (body.operationId === 'return.requestHandover') offered = true;
      if (body.operationId === 'branch.interruptRound') visit = 'heading';
      if (body.operationId === 'branch.recordArrival') visit = 'arrived';
      if (body.operationId === 'branch.resumeRound') visit = undefined;
      value = receiptFixture(body, false, body.operationId === 'return.requestHandover' ? { request } : {});
    } else throw new Error(url);
    return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  });
  return posts;
}
it('A: sends chosen source items, then pauses heading and arrives through distinct real client routes', async () => {
  const posts = fixture(), user = userEvent.setup(); render(<BranchPage />);
  await user.clear(await screen.findByLabelText('الكمية المعروضة — شحنة ١/pieces')); await user.type(screen.getByLabelText('الكمية المعروضة — شحنة ١/pieces'), '3'); await user.click(screen.getByRole('button', { name: 'أرسل طلب الإرجاع' }));
  await waitFor(() => expect((screen.getByLabelText('القطع المطلوب تأكيدها — شحنة ١/pieces') as HTMLInputElement).disabled).toBe(false));
  await user.clear(screen.getByLabelText('القطع المطلوب تأكيدها — شحنة ١/pieces')); await user.type(screen.getByLabelText('القطع المطلوب تأكيدها — شحنة ١/pieces'), '2'); await user.click(screen.getByRole('button', { name: 'اتجه للفرع واحفظ ترتيب العملاء' }));
  await screen.findByText('العميل المتوقف — أوقفنا الاتجاه إليه'); await user.click(screen.getByRole('button', { name: 'وصلت للفرع' })); await screen.findByText('وصلت للفرع — الاستلام منفصل');
  expect(posts.map(p => p.body.operationId)).toEqual(['return.requestHandover', 'branch.interruptRound', 'branch.recordArrival']);
  expect(posts[0]!.body.payload).toMatchObject({ sourceBranchId: 'source-branch', items: [{ quantity: 3, sourceLineId: 'pieces' }] });
  expect(posts[1]!.body).toMatchObject({ context: { deviceGeneration: 2 }, payload: { expectedActivityRevision: 7, expectedCurrentAttemptId: ids.attempt, claims: [{ itemId: 'item', quantity: 2 }], serviceEstimateSeconds: 300 } });
  expect(posts[2]!.body.payload).toMatchObject({ segmentId: 'segment', expectedBranchRevision: 3, expectedCurrentAttemptId: null });
});
it('A: arrived blocker links to customer and makes no branch command', async () => {
  const posts = fixture({ arrived: true }), user = userEvent.setup(); render(<BranchPage />); await screen.findByText('سجّل نتيجة العميل أولًا');
  expect(screen.getByRole('link', { name: 'العودة للعميل الحالي' }).getAttribute('href')).toBe('/rounds/current?kind=company');
  await user.clear(screen.getByLabelText('الكمية المعروضة — شحنة ١/pieces')); await user.type(screen.getByLabelText('الكمية المعروضة — شحنة ١/pieces'), '4'); await user.click(screen.getByRole('button', { name: 'أرسل طلب الإرجاع' })); expect(posts).toEqual([]);
});
it('A: retains all fifty paused customers with no second-round action', async () => { fixture({ visit: 'heading', full: true }); render(<BranchPage />); await screen.findByText('ترتيب العملاء المحفوظ (50)'); expect(screen.getAllByRole('listitem')).toHaveLength(50); expect(screen.queryByText('ابدأ الجولة')).toBeNull(); });
it('A: B2C does not fetch or display custody/branch controls', async () => { window.history.replaceState({}, '', '/execution/branch?kind=personal'); const fetcher = vi.spyOn(globalThis, 'fetch'); render(<BranchPage />); expect(fetcher).not.toHaveBeenCalled(); expect(screen.queryByText('الإرجاع وزيارة الفرع')).toBeNull(); });
it('B: actual claimed subset enables resume while an offered remainder remains unresolved', async () => {
  const posts = fixture({ visit: 'arrived', confirmed: true }), user = userEvent.setup(); render(<BranchPage />); await screen.findByText('أكد الفرع القطع المحددة');
  expect(screen.getByText('المتبقي معك: 1 قطعة')).toBeTruthy(); await user.click(screen.getByRole('button', { name: 'استأنف الجولة' }));
  await waitFor(() => expect(posts).toHaveLength(1)); expect(posts[0]!.body.operationId).toBe('branch.resumeRound'); expect(posts[0]!.body.payload).toMatchObject({ segmentId: 'segment', expectedBranchRevision: 3, expectedActivityRevision: 7 });
});
it('B: waiting or disposed goods never manufacture actual receipt', async () => {
  const posts = fixture({ visit: 'arrived', disposed: true }), user = userEvent.setup(); render(<BranchPage />); await screen.findByText('بانتظار تأكيد الفرع'); await user.click(screen.getByRole('button', { name: 'استأنف الجولة' })); expect(posts).toEqual([]);
  expect(screen.getByText('فقد')).toBeTruthy(); expect(screen.getByText('تلف')).toBeTruthy(); expect(screen.queryByRole('button', { name: /تأكيد.*استلام/ })).toBeNull();
});
it('B: uncertain request survives reload and retries the identical action and payload', async () => {
  const posts = fixture({ lose: true }), user = userEvent.setup(); const mounted = render(<BranchPage />);
  await user.clear(await screen.findByLabelText('الكمية المعروضة — شحنة ١/pieces')); await user.type(screen.getByLabelText('الكمية المعروضة — شحنة ١/pieces'), '3'); await user.click(screen.getByRole('button', { name: 'أرسل طلب الإرجاع' })); await screen.findByText('الطلب ينتظر التأكيد'); mounted.unmount(); render(<BranchPage />);
  await user.click(await screen.findByRole('button', { name: 'تحقّق من الطلب نفسه' })); await waitFor(() => expect(posts).toHaveLength(2)); expect(posts[1]!.body).toEqual(posts[0]!.body); expect(screen.getByText('الطلب ينتظر التأكيد')).toBeTruthy();
});
it('B: unavailable confirmation never enables resume or loses pending state', async () => {
  const posts = fixture({ visit: 'arrived', confirmed: true, lose: true }); render(<BranchPage />); await screen.findByRole('alert'); expect(screen.queryByText('أكد الفرع القطع المحددة')).toBeNull(); expect(posts).toEqual([]);
});
it('B: another phone sees the request and fifty paused customers without writing', async () => { const posts = fixture({ visit: 'heading', otherPhone: true, full: true }), user = userEvent.setup(); render(<BranchPage />); await screen.findByText('الجولة تعمل على هاتف آخر'); await user.click(screen.getByRole('button', { name: 'وصلت للفرع' })); expect(posts).toEqual([]); expect(screen.getAllByRole('listitem')).toHaveLength(50); });

function closureFixture(options: { stage?: 'heading' | 'arrived'; endedRound?: boolean; personal?: boolean; pending?: boolean; lose?: boolean; otherPhone?: boolean; branch?: boolean } = {}) {
  window.history.replaceState({}, '', `/execution/closure?kind=${options.personal ? 'personal' : 'company'}`);
  const posts: Record<string, unknown>[] = []; let roundEnded = Boolean(options.endedRound), dayEnded = false, lost = false;
  const accepted = () => receiptFixture(posts.at(-1)! as { actionId: string; operationId: string });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input); let value: unknown;
    if (url.includes('/bootstrap')) value = { csrfToken: 'csrf' };
    else if (url.includes('/session/context')) value = { ...connectedContext, kind: new URLSearchParams(location.search).get('kind') ?? 'company' };
    else if (url.includes('/rounds/current')) value = { workday: dayEnded ? null : { workdayId: ids.workday }, round: roundEnded ? null : { roundId: ids.round, workdayId: ids.workday } };
    else if (url.includes('/summary')) value = { workdayId: ids.workday, openedAt: '2026-09-24T20:00:00Z', endedAt: dayEnded ? '2026-09-25T03:00:00Z' : null, rounds: [{ roundId: ids.round, activityRevision: 9 }], scope: { fullShipments: 1, partialShipments: 0, refusedShipments: 1, noAnswerShipments: 0, unfinishedShipments: 1 }, collection: [{ reportedMinor: '25000', unreportedAttempts: 0 }], carryForward: { items: [{ taskId: ids.task, heldPieces: options.personal ? null : 3, disposition: 'unfinished', blocker: null, unpaidShippingMinor: '0' }] } };
    else if (url.includes('/current/rounds/')) value = { roundId: ids.round, revision: 8, currentActivity: options.stage ? { stage: options.stage, attemptId: ids.attempt } : null, branchActivity: options.branch ? {} : null };
    else if (url.includes('/devices/') && url.includes('/snapshot')) value = { snapshotToken: 'confirmed-owner-generation' };
    else if (url.includes('/devices/')) value = { mode: options.otherPhone ? 'view-only' : 'owner', owner: { generation: 2 }, snapshotRequired: true };
    else if (url.includes('/locations')) value = { items: [{ taskId: ids.task, recipientName: 'عميل العمل المتبقي' }] };
    else if (url.includes('/closure/actions/')) value = { status: options.pending ? 'pending' : 'accepted', ...(!options.pending ? { result: accepted() } : {}) };
    else if (init?.method === 'POST') { const body = JSON.parse(String(init.body)); posts.push(body); if (options.pending) value = { status: 'pending', actionId: body.actionId }; else { roundEnded = true; dayEnded = body.operationId === 'workday.end'; if (options.lose && !lost) { lost = true; throw new Error('lost response'); } value = accepted(); } }
    else throw new Error(url);
    return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  });
  return posts;
}
it('C: round then day closure uses actual revisions, owner token and preserves held work', async () => {
  const posts = closureFixture({ stage: 'heading' }), user = userEvent.setup(); render(<ClosurePage />); await screen.findByText('عميل العمل المتبقي');
  await user.click(screen.getByRole('button', { name: 'إنهاء الجولة فقط' })); expect(posts).toEqual([]);
  await user.click(screen.getByLabelText('أوقف الاتجاه للعميل الحالي وأحتفظ بمهمته')); await user.click(screen.getByRole('button', { name: 'إنهاء الجولة فقط' })); await screen.findByText('انتهت الجولة — اليوم مفتوح');
  expect(posts[0]).toMatchObject({ operationId: 'round.end', context: { deviceGeneration: 2, snapshotToken: 'confirmed-owner-generation' }, payload: { currentAction: 'pause-heading', expectedActivityRevision: 8, expectedCurrentAttemptId: ids.attempt, expectedActiveRoundId: ids.round } });
  await user.click(screen.getByRole('button', { name: 'إنهاء يوم العمل' })); await screen.findByText('انتهى يوم العمل');
  expect(posts[1]).toMatchObject({ operationId: 'workday.end', payload: { expectedActivityRevision: 9, expectedActiveRoundId: null, currentAction: 'require-none' } }); expect(screen.getByText('عميل العمل المتبقي')).toBeTruthy(); expect(screen.getByText(/دون إعادة إرسال/)).toBeTruthy();
});
it.each([{ stage: 'arrived' as const }, { branch: true }, { otherPhone: true }])('C: actionable blocker prevents close for %j', async options => { const posts = closureFixture(options), user = userEvent.setup(); render(<ClosurePage />); await screen.findByText('عميل العمل المتبقي'); await user.click(screen.getByRole('button', { name: 'إنهاء الجولة فقط' })); expect(posts).toEqual([]); });
it('C: HTTP pending survives reload and never claims day closure', async () => { const posts = closureFixture({ pending: true }), user = userEvent.setup(); const mounted = render(<ClosurePage />); await user.selectOptions(await screen.findByLabelText('نطاق الإنهاء'), 'day'); await user.click(screen.getByRole('button', { name: 'إنهاء يوم العمل' })); await screen.findByText('الإنهاء لم يتأكد بعد'); mounted.unmount(); render(<ClosurePage />); await user.click(await screen.findByRole('button', { name: 'تحقّق من الإنهاء نفسه' })); await waitFor(() => expect(posts).toHaveLength(2)); expect(posts[1]).toEqual(posts[0]); expect(screen.queryByText('انتهى يوم العمل')).toBeNull(); });
it('C: accepted lost closure response recovers by action ID after reload without a second POST', async () => { const posts = closureFixture({ lose: true }), user = userEvent.setup(); const mounted = render(<ClosurePage />); await user.selectOptions(await screen.findByLabelText('نطاق الإنهاء'), 'day'); await user.click(screen.getByRole('button', { name: 'إنهاء يوم العمل' })); await screen.findByText('الإنهاء لم يتأكد بعد'); mounted.unmount(); render(<ClosurePage />); await user.click(await screen.findByRole('button', { name: 'تحقّق من الإنهاء نفسه' })); await waitFor(() => expect(screen.queryByText('الإنهاء لم يتأكد بعد')).toBeNull()); expect(posts).toHaveLength(1); expect(screen.getByText('انتهى يوم العمل')).toBeTruthy(); });
it('C: B2C closure has no pieces, source branch or receiver procedure', async () => { closureFixture({ personal: true }); render(<ClosurePage />); await screen.findByText('عميل العمل المتبقي'); expect(document.body.textContent).not.toMatch(/قطعة|للفرع|نظام الشركة|استلام الفرع|الشحن/); expect(screen.getByText(/٢٥٠٫٠٠/)).toBeTruthy(); });
it('C: unresolved result on another page blocks closure and links to its recovery', async () => {
  const posts = closureFixture(), user = userEvent.setup();
  sessionStorage.setItem(`tawsel:delivery-pending:${ids.tenant}:${ids.account}:${ids.round}:${ids.device}`, JSON.stringify({ kind: 'outcome', command: { actionId: ids.action, context: { tenantId: ids.tenant, accountId: ids.account, deviceId: ids.device }, payload: { roundId: ids.round } } }));
  render(<ClosurePage />); await screen.findByText('تحقّق من الإجراءات السابقة أولًا'); await user.click(screen.getByRole('button', { name: 'إنهاء الجولة فقط' })); expect(posts).toEqual([]); expect(screen.getByRole('link', { name: 'فتح الإجراء المعلّق' }).getAttribute('href')).toContain('/rounds/current?');
});
it('C: shared recovery links ignore other account commands and terminal review, preserving own closure', () => {
  const session = { kind: 'company', access: { tenantId: ids.tenant, sourceId: ids.account } } as components['schemas']['SessionContext'];
  const command = { actionId: ids.action, context: { tenantId: ids.tenant, accountId: ids.account, deviceId: ids.device }, payload: { workdayId: ids.workday } };
  sessionStorage.setItem(`tawsel:closure:${ids.tenant}:${ids.account}:${ids.workday}:${ids.device}`, JSON.stringify({ pending: command }));
  sessionStorage.setItem(`tawsel:options:${ids.tenant}:${ids.account}:${ids.round}:${ids.device}`, JSON.stringify({ review: { command } }));
  sessionStorage.setItem(`tawsel:branch:${ids.tenant}:another:${ids.device}`, JSON.stringify({ pending: command }));
  const links = pendingExecutionLinks(session, ''); expect(links).toHaveLength(1); expect(links[0]!.href).toContain(`/execution/closure?kind=company&workdayId=${ids.workday}`);
  sessionStorage.setItem(`tawsel:options:${ids.tenant}:${ids.account}:${ids.round}:${ids.device}`, JSON.stringify({ pending: { ...command, payload: { roundId: ids.round, taskId: ids.task } } }));
  const optionLink = pendingExecutionLinks(session, '').find(link => link.href.startsWith('/execution/options'))!;
  expect(new URL(optionLink.href, window.location.origin).searchParams.get('taskId')).toBe(ids.task);
  expect(new URL(optionLink.href, window.location.origin).searchParams.get('roundId')).toBe(ids.round);
});
it('shows one recovery link when the journal and legacy pointer describe the same action, and still blocks closure', async () => {
  const posts = closureFixture({ stage: 'heading' }), user = userEvent.setup();
  const session = connectedContext as components['schemas']['SessionContext'];
  const scope = await localWork.select(session, ids.device);
  const command = headingFixture();
  command.context = { kind: 'device', tenantId: ids.tenant, accountId: ids.account, deviceId: ids.device, deviceGeneration: 1, deviceSequence: 1 };
  command.resources = { tripId: ids.round, taskId: ids.task, attemptId: ids.attempt };
  command.payload.roundId = ids.round;
  await localWork.capture(scope, command, '/rounds/current?kind=company', false);
  render(<ClosurePage />);
  await screen.findByRole('link', { name: 'فتح الإجراء المعلّق' });
  sessionStorage.setItem(`tawsel:delivery-pending:${ids.tenant}:${ids.account}:${ids.round}:${ids.device}`, JSON.stringify({ command }));
  await user.click(screen.getByLabelText('أوقف الاتجاه للعميل الحالي وأحتفظ بمهمته'));
  expect(screen.getAllByRole('link', { name: 'فتح الإجراء المعلّق' })).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'إنهاء الجولة فقط' })); expect(posts).toHaveLength(0);
});
