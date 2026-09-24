// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverReviewFixture } from '../../src/fixtures/driver-review-fixture';
import { ProductionShell } from '../../src/production-shell';

beforeEach(() => window.history.replaceState({}, '', '/__fixtures/driver-review'));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('representative driver fixture', () => {
  it('makes start dominant for ready daily work and keeps readiness visible', () => {
    render(<DriverReviewFixture />);
    expect(screen.getByRole('heading', { name: 'مهامك جاهزة' })).toBeTruthy();
    expect(screen.getByText(/الموقع والبداية والخطة مؤكدة/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ابدأ الجولة' })).toBeTruthy();
    expect(screen.getAllByRole('button').filter((button) => button.classList.contains('action-button--primary'))).toHaveLength(1);
  });

  it('keeps heading, arrival, and outcome as separate explicit transitions', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.click(screen.getByRole('button', { name: 'ابدأ الجولة' }));
    expect(screen.getByRole('button', { name: 'اتجه للعميل' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'اتجه للعميل' }));
    expect(screen.getByRole('button', { name: 'وصلت' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'سجّل النتيجة' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'وصلت' }));
    expect(screen.getByRole('button', { name: 'سجّل النتيجة' })).toBeTruthy();
  });

  it('cancels without committing and restores the outcome draft and focus', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.click(screen.getByRole('button', { name: 'ابدأ الجولة' }));
    await user.click(screen.getByRole('button', { name: 'اتجه للعميل' }));
    await user.click(screen.getByRole('button', { name: 'وصلت' }));
    const trigger = screen.getByRole('button', { name: 'سجّل النتيجة' });
    await user.click(trigger);
    await user.click(screen.getByRole('radio', { name: 'رفض الاستلام' }));
    await user.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.queryByText(/تم تأكيد النتيجة/)).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    expect((screen.getByRole('radio', { name: 'رفض الاستلام' }) as HTMLInputElement).checked).toBe(true);
  });

  it('shows missing pin recovery and blocks a misleading start', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), 'missing-pin');
    expect(screen.getByRole('button', { name: 'حدّد الموقع' })).toBeTruthy();
    expect(screen.getByText(/المهمة الأخرى الصالحة/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ابدأ الجولة' })).toBeNull();
  });

  it('shows existing ownership without a second-start control', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), 'another-device');
    expect(screen.getByText('الجولة تعمل على هاتف آخر')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ابدأ الجولة' })).toBeNull();
  });

  it.each([
    ['pending', 'محفوظ على الهاتف', /ليست نتيجة مؤكدة/],
    ['rejected', 'لم تُقبل النتيجة', /المسودة محفوظة/]
  ])('keeps %s distinct from accepted success', async (scenario, title, explanation) => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), scenario);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(explanation)).toBeTruthy();
    expect(screen.queryByText(/تم تأكيد النتيجة/)).toBeNull();
  });

  it('offers all developer states without network toggles', () => {
    render(<DriverReviewFixture />);
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(expect.arrayContaining(['تحميل', 'فارغ', 'دبوس ناقص', 'هاتف آخر', 'اختيار جزئي', 'قيد المزامنة', 'مرفوض']));
    expect(screen.queryByText(/نجاح الشبكة|فشل الشبكة/)).toBeNull();
  });

  it('shows exact whole-piece partial selection without committing an outcome', async () => {
    const user = userEvent.setup();
    render(<DriverReviewFixture />);
    await user.selectOptions(screen.getByLabelText('الحالة'), 'partial');
    expect(screen.getByText('قطعتان من ٣ · المطلوب ٢٥٠ ج.م')).toBeTruthy();
    expect(screen.getByText(/قطعة واحدة ما زالت معك/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حفظ النتيجة' })).toBeNull();
  });

  it('keeps production shell free of fixture navigation and data', () => {
    cleanup();
    render(<ProductionShell />);
    expect(screen.queryByText('عرض مطوّر ببيانات ثابتة')).toBeNull();
    expect(screen.queryByText('ابدأ الجولة')).toBeNull();
    expect(document.querySelector('a[href*="__fixtures"]')).toBeNull();
  });
});

const connectedIds = {
  tenant: '29000000-0000-4000-8000-000000000001', account: '29000000-0000-4000-8000-000000000002', driver: '29000000-0000-4000-8000-000000000003', device: '29000000-0000-4000-8000-000000000004',
  round: '29000000-0000-4000-8000-000000000005', workday: '29000000-0000-4000-8000-000000000006', task: '29000000-0000-4000-8000-000000000007', attempt: '29000000-0000-4000-8000-000000000008', plan: '29000000-0000-4000-8000-000000000009', action: '29000000-0000-4000-8000-000000000010'
};
const connectedContext = { kind: 'company', access: { tenantId: connectedIds.tenant, tenantKind: 'company', principalKind: 'account', sourceId: connectedIds.account, branchIds: [], driverId: connectedIds.driver, effectiveCapabilities: ['execution.own'] }, expiresAt: '2026-09-25T12:00:00Z', recoveryEmailVerified: true, phoneOwnershipVerified: true, loginIdentifier: 'driver' };
const delivery = { kind: 'company', allowedActions: ['full', 'partial', 'refusal', 'no-answer'], fullCollection: { amountMinor: 35000, currency: 'EGP', exponent: 2 }, goodsDue: { amountMinor: 30000, currency: 'EGP', exponent: 2 }, shippingDue: { amountMinor: 5000, currency: 'EGP', exponent: 2 } };
const connectedTarget = { taskId: connectedIds.task, attemptId: connectedIds.attempt, sourceRevision: 1, assignmentRevision: 1, pinRevision: 1, coordinates: { latitude: 30.05, longitude: 31.24 }, recipientName: 'عميل الشركة', recipientPhone: '+201012345678', address: '١٢ شارع التحرير', delivery };
const actionTime = { actionId: connectedIds.action, recordedAt: '2026-09-25T08:00:00Z', observation: { observedAt: '2026-09-25T08:00:00Z', clock: { quality: 'uncertain' } } };
function connectedSnapshot(stage: 'heading' | 'arrived' = 'arrived', ownerDevice = connectedIds.device) {
  return { roundId: connectedIds.round, driverId: connectedIds.driver, owner: { accountId: connectedIds.account, deviceId: ownerDevice, generation: 1 }, revision: stage === 'arrived' ? 2 : 1, currentActivity: { taskId: connectedIds.task, attemptId: connectedIds.attempt, revision: stage === 'arrived' ? 2 : 1, stage, heading: actionTime, arrival: stage === 'arrived' ? actionTime : null }, physicalOrigin: stage === 'arrived' ? { kind: 'last-confirmed-stop', coordinates: connectedTarget.coordinates, revision: 1, roundId: connectedIds.round, taskId: connectedIds.task, attemptId: connectedIds.attempt, time: actionTime } : null, planningOrigin: { kind: 'manual-pin', coordinates: { latitude: 30.04, longitude: 31.23 } }, nextSuggestion: null, planning: { planId: connectedIds.plan, updating: false }, targets: [connectedTarget], branchActivity: null };
}
const outcomeSnapshot = { roundId: connectedIds.round, items: [], history: [], custody: [], progress: { processed: 0, full: 0, partial: 0, refused: 0, noAnswer: 0, deliveredPieces: 0, heldReturnRequiredPieces: 0, collection: [] } };
function json(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
function installConnectedFetch(options: { stage?: 'heading' | 'arrived'; ownerDevice?: string; loseFirstOutcome?: boolean; rejectTakeover?: boolean } = {}) {
  const posts: Array<{ url: string; body: unknown }> = []; let outcomeAttempts = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes('/api/session/context')) return json(connectedContext);
    if (url.includes('/api/session/bootstrap')) return json({ csrfToken: 'csrf' });
    if (url.includes('/api/v1/rounds/current')) return json({ workday: { workdayId: connectedIds.workday }, round: { roundId: connectedIds.round } });
    if (url.includes('/api/v1/current/rounds/')) return json(connectedSnapshot(options.stage, options.ownerDevice));
    if (url.includes('/api/v1/outcomes/rounds/')) return json(outcomeSnapshot);
    if (url.includes('/api/v1/devices/rounds/') && !url.includes('/snapshot')) return json({ roundId: connectedIds.round, workdayId: connectedIds.workday, driverId: connectedIds.driver, owner: { accountId: connectedIds.account, deviceId: options.ownerDevice ?? connectedIds.device, generation: 1 }, viewerDeviceId: connectedIds.device, mode: options.ownerDevice && options.ownerDevice !== connectedIds.device ? 'view-only' : 'owner', roundState: 'active', workdayState: 'open', mayTakeover: Boolean(options.ownerDevice && options.ownerDevice !== connectedIds.device), snapshotRequired: false });
    if (url.includes('/api/v1/outcomes/full') || url.includes('/api/v1/outcomes/no-answer')) { posts.push({ url, body: JSON.parse(String(init?.body)) }); outcomeAttempts += 1; if (options.loseFirstOutcome && outcomeAttempts === 1) return Promise.reject(new TypeError('Failed to fetch')); return json({ receipt: { actionId: connectedIds.action, businessStatus: 'accepted' }, response: { body: {} } }); }
    if (url.includes('/api/v1/devices/takeover')) { posts.push({ url, body: JSON.parse(String(init?.body)) }); return json({ receipt: { actionId: connectedIds.action, businessStatus: options.rejectTakeover ? 'rejected' : 'accepted', ...(options.rejectTakeover ? { problem: { detail: 'انتقلت الملكية لهاتف آخر' } } : {}) } }, options.rejectTakeover ? 409 : 200); }
    if (url.includes('/api/v1/devices/rounds/') && url.includes('/snapshot')) return json({ context: { mode: 'owner', roundState: 'active' } });
    if (url.includes('/api/v1/outcomes/actions/')) return json({ actionId: connectedIds.action, status: 'pending' }, 202);
    throw new Error(`Unexpected request: ${url}`);
  });
  return posts;
}

describe('connected ordinary delivery flow', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/rounds/current?kind=company'); sessionStorage.clear(); localStorage.clear(); localStorage.setItem('tawsel:device-id', connectedIds.device); Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: vi.fn(() => connectedIds.action) }); });

  it('uses the server amount in one full delivery-plus-collection command', async () => {
    const posts = installConnectedFetch(); const user = userEvent.setup(); render(<ProductionShell />);
    expect((await screen.findAllByText(/٣٥٠٫٠٠/)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.body).toMatchObject({ operationId: 'outcome.recordFull', actionId: connectedIds.action, payload: { taskId: connectedIds.task, attemptId: connectedIds.attempt, reportedCollection: { amountMinor: 35000 } } });
    expect(await screen.findByText(/تم تأكيد التسليم والتحصيل من الخادم/)).toBeTruthy();
  });

  it('records no-answer before arrival without an arrival, fee-refusal or call-count field', async () => {
    const posts = installConnectedFetch({ stage: 'heading' }); const user = userEvent.setup(); render(<ProductionShell />);
    await user.click(await screen.findByRole('button', { name: 'لم يرد العميل' }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.url).toContain('/outcomes/no-answer');
    expect(posts[0]!.body).toMatchObject({ operationId: 'outcome.recordNoAnswer', payload: { expectedCurrentAttemptId: connectedIds.attempt } });
    expect(JSON.stringify(posts[0]!.body)).not.toMatch(/arrival|shippingPayment|callCount|reportedCollection/);
  });

  it('retains the exact action and payload after a lost accepted response', async () => {
    const posts = installConnectedFetch({ loseFirstOutcome: true }); const user = userEvent.setup(); render(<ProductionShell />);
    await user.click(await screen.findByRole('button', { name: /تأكيد التسليم وتحصيل/ }));
    expect(await screen.findByText('إجراء ينتظر التأكيد')).toBeTruthy();
    expect(sessionStorage.getItem(`tawsel:delivery-pending:${connectedIds.tenant}:${connectedIds.account}:${connectedIds.round}:${connectedIds.device}`)).toContain(connectedIds.action);
    await user.click(screen.getByRole('button', { name: 'تحقّق وأعد إرسال الطلب نفسه' }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual(posts[0]);
  });

  it('keeps external handlers as links with feedback and zero business POSTs', async () => {
    const posts = installConnectedFetch(); const user = userEvent.setup(); render(<ProductionShell />);
    const call = await screen.findByRole('link', { name: /اتصال بـ/ }); call.addEventListener('click', event => event.preventDefault());
    await user.click(call);
    expect(await screen.findByText(/لم نسجّل اتجاهًا أو وصولًا أو نجاح تواصل/)).toBeTruthy(); expect(posts).toEqual([]);
  });

  it('shows ownership denial as failure and never as successful continuation', async () => {
    const other = '29000000-0000-4000-8000-000000000099'; installConnectedFetch({ ownerDevice: other, rejectTakeover: true }); const user = userEvent.setup(); render(<ProductionShell />);
    await user.click(await screen.findByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' }));
    expect(await screen.findByText('انتقلت الملكية لهاتف آخر')).toBeTruthy();
    expect(screen.queryByText(/اكتمل نقل التنفيذ/)).toBeNull();
    expect((screen.getByRole('button', { name: /تأكيد التسليم وتحصيل/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
