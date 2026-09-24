// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProductionShell } from '../../src/production-shell';
import { connectedIds, installConnectedFetch } from './execution-fixture';
import { ExecutionOptionsPage } from '../../src/execution-options';
import { CorrectionPage } from '../../src/correction-page';

beforeEach(() => { window.history.replaceState({}, '', '/rounds/current?kind=company'); sessionStorage.clear(); localStorage.clear(); localStorage.setItem('tawsel:device-id', connectedIds.device); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('previews two of three frozen pieces at 250 and submits the actual partial endpoint', async () => {
  const posts = installConnectedFetch(); const user = userEvent.setup(); render(<ProductionShell />);
  await user.click(await screen.findByText('خيارات المهمة')); await user.click(screen.getByRole('button', { name: 'تسليم بعض القطع' }));
  const input = screen.getByLabelText('القطع المسلّمة — قميص'); await user.clear(input); await user.type(input, '2');
  expect(screen.getByText(/٢٥٠٫٠٠/)).toBeTruthy(); expect(screen.getByText(/المتبقي معك للإرجاع: 1 قطعة/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }));
  await waitFor(() => expect(posts).toHaveLength(1)); expect(posts[0]!.url).toContain('/outcomes/partial'); expect(posts[0]!.body).toMatchObject({ operationId: 'outcome.recordPartial', payload: { pieces: [{ sourceLineId: 'line', delivered: 2 }], reportedCollection: { amountMinor: 25000 } } });
});

it('retains quantities on invalid input, cancel and server permission denial without false success', async () => {
  const posts = installConnectedFetch({ rejectOutcome: true }); const user = userEvent.setup(); render(<ProductionShell />);
  await user.click(await screen.findByText('خيارات المهمة')); await user.click(screen.getByRole('button', { name: 'تسليم بعض القطع' }));
  let input = screen.getByLabelText('القطع المسلّمة — قميص'); await user.clear(input); await user.type(input, '4');
  expect((screen.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }) as HTMLButtonElement).disabled).toBe(true); expect(posts).toEqual([]);
  await user.click(screen.getByRole('button', { name: 'إلغاء' })); await user.click(screen.getByText('خيارات المهمة')); await user.click(screen.getByRole('button', { name: 'تسليم بعض القطع' }));
  input = screen.getByLabelText('القطع المسلّمة — قميص'); expect((input as HTMLInputElement).value).toBe('4'); await user.clear(input); await user.type(input, '2'); await user.click(screen.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }));
  expect(await screen.findByText('المصدر لا يسمح بتقسيم هذه الشحنة.')).toBeTruthy(); expect((input as HTMLInputElement).value).toBe('2'); expect(screen.queryByText(/تم تأكيد النتيجة/)).toBeNull();
});

it.each([false, true])('maps refusal shipping choice unpaid=%s to exact amounts; cancel sends nothing', async unpaid => {
  const posts = installConnectedFetch(); const user = userEvent.setup(); render(<ProductionShell />);
  await user.click(await screen.findByText('خيارات المهمة')); await user.click(screen.getByRole('button', { name: 'رفض الاستلام' }));
  if (unpaid) await user.click(screen.getByRole('radio', { name: 'رفض العميل دفع الشحن صراحةً' }));
  await user.click(screen.getByRole('button', { name: 'إلغاء' })); expect(posts).toEqual([]); expect(document.activeElement?.id).toBe('task-options');
  await user.click(screen.getByRole('button', { name: 'رفض الاستلام' })); expect((screen.getByRole('radio', { name: 'رفض العميل دفع الشحن صراحةً' }) as HTMLInputElement).checked).toBe(unpaid);
  await user.click(screen.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' })); await waitFor(() => expect(posts).toHaveLength(1));
  expect(posts[0]!.url).toContain('/outcomes/refusal'); expect(posts[0]!.body).toMatchObject({ payload: { shippingPayment: unpaid ? 'refused' : 'collected', reportedCollection: { amountMinor: unpaid ? 0 : 5000 } } });
});

it.each([{ personal: true }, { noSplit: true }])('hides forbidden splitting for %j', async options => {
  const posts = installConnectedFetch(options); const user = userEvent.setup(); render(<ProductionShell />); await user.click(await screen.findByText('خيارات المهمة'));
  expect(screen.queryByRole('button', { name: 'تسليم بعض القطع' })).toBeNull();
  if (options.personal) { await user.click(screen.getByRole('button', { name: 'رفض الاستلام' })); expect(screen.queryByText('دفع الشحن')).toBeNull(); expect(screen.queryByText(/المتبقي معك للإرجاع/)).toBeNull(); await user.click(screen.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' })); await waitFor(() => expect(posts).toHaveLength(1)); expect(JSON.stringify(posts[0])).not.toMatch(/shippingPayment|reportedCollection|pieces/); }
});

function schedulingFetch(blocker: 'capacity' | 'earliest-time' | null = null, transferred = false) {
  const posts: Array<{ url: string; body: Record<string, unknown> }> = [];
  const item = { taskId: connectedIds.task, attemptId: connectedIds.attempt, revision: 4, sourceRevision: 2, assignmentRevision: 3, pinRevision: 1, earliestAt: '2030-01-02T10:00:00Z', urgency: 'ordinary', deferred: true, latestOutcomeId: null, actions: Object.fromEntries(['defer', 'retry', 'activate', 'urgency'].map(action => [action, { allowed: !blocker || action === 'urgency', blocker, message: blocker === 'capacity' ? 'الجولة بها ٥٠ محطة متبقية؛ أكمل محطة قبل الإضافة.' : 'لم يحن وقت الإتاحة بعد.' }])) };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input); let value: unknown;
    if (url.includes('/session/context')) value = { access: { tenantId: connectedIds.tenant, sourceId: connectedIds.account } };
    else if (url.includes('/bootstrap')) value = { csrfToken: 'csrf' };
    else if (init?.method === 'POST') { posts.push({ url, body: JSON.parse(String(init.body)) }); value = { receipt: { businessStatus: 'accepted' } }; }
    else if (url.includes('/eligibility/rounds/')) value = { roundId: connectedIds.round, mode: 'active-round', activityRevision: 7, currentAttemptId: connectedIds.attempt, items: [item], history: [] };
    else if (url.includes('/devices/') && url.includes('/snapshot')) value = { snapshotToken: 'confirmed-generation-two' };
    else if (url.includes('/devices/')) value = { mode: 'owner', owner: { generation: 2 }, roundState: 'active', snapshotRequired: transferred };
    else if (url.includes('/locations')) value = { items: [{ taskId: connectedIds.task, recipientName: 'مهمة مؤجلة', editable: true }] };
    else if (url.includes('/outcomes/rounds/')) value = { history: [] };
    else throw new Error(url);
    return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  });
  window.history.replaceState({}, '', `/execution/options?kind=company&roundId=${connectedIds.round}`);
  return posts;
}

it.each(['capacity', 'earliest-time'] as const)('explains %s without a retry POST or lost work', async blocker => {
  const posts = schedulingFetch(blocker), user = userEvent.setup(); render(<ExecutionOptionsPage />);
  await user.selectOptions(await screen.findByLabelText('اختر الإجراء'), blocker === 'capacity' ? 'retry' : 'activate');
  expect(screen.getByText(blocker === 'capacity' ? /الجولة بها ٥٠ محطة/ : /لم يحن وقت الإتاحة بعد/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: blocker === 'capacity' ? 'إعادة المحاولة كاملة' : 'إتاحة المهمة المؤجلة' })); expect(posts).toEqual([]); expect(screen.getByRole('option', { name: /مهمة مؤجلة/ })).toBeTruthy();
});

it('uses actual urgency and future deferral mappings with protected-current and eligibility revisions', async () => {
  const posts = schedulingFetch(), user = userEvent.setup(); render(<ExecutionOptionsPage />);
  await user.click(await screen.findByRole('button', { name: 'أولوية المهمة' })); await waitFor(() => expect(posts).toHaveLength(1));
  expect(posts[0]).toMatchObject({ url: '/api/v1/eligibility/urgency?kind=company', body: { operationId: 'task.setDriverUrgency', payload: { urgency: 'urgent', expectedCurrentAttemptId: connectedIds.attempt, expectedActivityRevision: 7, expectedEligibilityRevision: 4 } } });
  await user.selectOptions(screen.getByLabelText('اختر الإجراء'), 'defer');
  const field = screen.getByLabelText('الإتاحة بدءًا من');
  // Native datetime-local editing is simulated; server date validation is covered by PostgreSQL/browser tests.
  const { fireEvent } = await import('@testing-library/react'); fireEvent.change(field, { target: { value: '2030-02-03T12:00' } });
  await user.click(screen.getByRole('button', { name: 'تأجيل المهمة كاملة' })); await waitFor(() => expect(posts).toHaveLength(2)); expect(posts[1]).toMatchObject({ url: '/api/v1/eligibility/defer?kind=company', body: { operationId: 'task.deferWhole', payload: { earliestAt: new Date('2030-02-03T12:00').toISOString() } } });
  expect(screen.getByRole('link', { name: 'تصحيح نقطة التوصيل' }).getAttribute('href')).toContain('returnTo=execution');
});

function correctionFetch(denied: 'receipt' | 'day' | null, lost = false, executionRound = connectedIds.round) {
  const posts: unknown[] = []; let attempted = false, accepted = false;
  const money = (amountMinor: number) => ({ amountMinor, currency: 'EGP', exponent: 2 });
  const original = { outcomeId: connectedIds.action, revision: 1, kind: 'company', outcome: 'partial', collection: { reported: money(25000), unpaidShipping: money(0) }, lines: [{ sourceLineId: 'line', delivered: 2, heldReturnRequired: 1 }], time: { recordedAt: '2026-09-25T08:00:00Z' } };
  const reason = denied === 'receipt' ? 'أكد الفرع استلامًا مرتبطًا؛ السجل محفوظ.' : 'انتهى يوم العمل؛ السجل محفوظ للمراجعة.';
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input); let value: unknown;
    if (url.includes('/session/context')) value = { access: { tenantId: connectedIds.tenant, sourceId: connectedIds.account } };
    else if (url.includes('/bootstrap')) value = { csrfToken: 'csrf' };
    else if (url.includes('/corrections/outcomes')) { posts.push(JSON.parse(String(init?.body))); attempted = true; accepted = !denied; if (lost) throw new TypeError('Failed to fetch'); value = { receipt: { businessStatus: denied ? 'review-required' : 'accepted', ...(denied ? { problem: { detail: reason } } : {}) } }; }
    else if (url.includes('/corrections/actions/')) value = { status: 'accepted', result: { receipt: { businessStatus: 'accepted' } } };
    else if (url.includes('/corrections/attempts/')) value = { executionRoundId: executionRound, roundId: connectedIds.round, taskId: connectedIds.task, attemptId: connectedIds.attempt, allowed: !denied || !attempted, message: denied && attempted ? reason : 'يمكن التصحيح', constraints: [], originalOutcome: original, effectiveOutcome: accepted ? { ...original, outcome: 'full', revision: 2, collection: { reported: money(35000), unpaidShipping: money(0) } } : original, effectiveOutcomeRevision: accepted ? 2 : 1, delivery: { kind: 'company', allowedActions: ['full', 'partial', 'refusal', 'no-answer'], fullCollection: money(35000), shippingDue: money(5000), goodsDue: money(30000), lines: [{ sourceLineId: 'line', description: 'قميص', quantity: 3, unitDue: money(10000) }] } };
    else if (url.includes('/devices/') && url.includes('/snapshot')) value = { snapshotToken: 'latest-round-snapshot' };
    else if (url.includes('/devices/')) value = { roundId: executionRound, mode: 'owner', owner: { generation: 3 }, roundState: 'ended', snapshotRequired: executionRound !== connectedIds.round };
    else throw new Error(url);
    return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  });
  window.history.replaceState({}, '', `/execution/correction?kind=company&attemptId=${connectedIds.attempt}`);
  return posts;
}

it.each(['receipt', 'day'] as const)('retains proposed correction and durable evidence when %s closes the bound while editing', async denied => {
  const posts = correctionFetch(denied), user = userEvent.setup(); render(<CorrectionPage />);
  await user.click(await screen.findByRole('radio', { name: 'تسليم كامل' })); await user.click(screen.getByRole('button', { name: 'حفظ التصحيح' }));
  expect(await screen.findByText('لم يُقبل التصحيح؛ الدليل محفوظ للمراجعة')).toBeTruthy(); expect(screen.getByRole('heading', { name: 'النتيجة الأصلية' })).toBeTruthy(); expect((screen.getByRole('radio', { name: 'تسليم كامل' }) as HTMLInputElement).checked).toBe(true);
  expect(posts).toHaveLength(1); expect(posts[0]).toMatchObject({ operationId: 'outcome.correct', payload: { expectedOutcomeRevision: 1, replacement: { outcome: 'full', reportedCollection: { amountMinor: 35000 } } } });
  await waitFor(() => expect((screen.getByRole('button', { name: 'حفظ التصحيح' }) as HTMLButtonElement).disabled).toBe(true)); expect(screen.queryByText('تم تأكيد التغيير من الخادم.')).toBeNull();
  cleanup(); render(<CorrectionPage />); expect(await screen.findByText('لم يُقبل التصحيح؛ الدليل محفوظ للمراجعة')).toBeTruthy(); expect((await screen.findByRole('radio', { name: 'تسليم كامل' }) as HTMLInputElement).checked).toBe(true);
});

it('recovers an accepted correction after a lost response without a second outcome POST', async () => {
  const posts = correctionFetch(null, true), user = userEvent.setup(); render(<CorrectionPage />);
  await user.click(await screen.findByRole('radio', { name: 'تسليم كامل' })); await user.click(screen.getByRole('button', { name: 'حفظ التصحيح' }));
  await user.click(await screen.findByRole('button', { name: 'تحقّق من التصحيح المحفوظ' })); expect(await screen.findByText('تم تأكيد التغيير من الخادم.')).toBeTruthy(); expect(posts).toHaveLength(1); expect(screen.getByRole('heading', { name: 'النتيجة الأصلية' })).toBeTruthy();
});

it('loads the takeover snapshot before an assigned-driver scheduling command', async () => {
  const posts = schedulingFetch(null, true), user = userEvent.setup(); render(<ExecutionOptionsPage />);
  await user.click(await screen.findByRole('button', { name: 'أولوية المهمة' }));
  await waitFor(() => expect(posts).toHaveLength(1)); expect(posts[0]).toMatchObject({ body: { context: { deviceGeneration: 2, snapshotToken: 'confirmed-generation-two' } } });
});

it('corrects an earlier round using latest owner generation and snapshot even after that round ends', async () => {
  const latestRound = '88888888-8888-4888-8888-888888888888';
  const posts = correctionFetch(null, false, latestRound), user = userEvent.setup(); render(<CorrectionPage />);
  await user.click(await screen.findByRole('radio', { name: 'تسليم كامل' })); await user.click(screen.getByRole('button', { name: 'حفظ التصحيح' }));
  expect(await screen.findByText('تم تأكيد التغيير من الخادم.')).toBeTruthy();
  expect(posts[0]).toMatchObject({ context: { deviceGeneration: 3, snapshotToken: 'latest-round-snapshot' }, resources: { tripId: connectedIds.round }, payload: { roundId: connectedIds.round } });
  const deviceReads = vi.mocked(fetch).mock.calls.map(([url]) => String(url)).filter(url => url.includes('/devices/'));
  expect(deviceReads.length).toBeGreaterThan(0); expect(deviceReads.every(url => url.includes(latestRound))).toBe(true);
});
