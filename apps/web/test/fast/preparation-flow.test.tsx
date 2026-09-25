// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionShell } from '../../src/production-shell';
import { localWork } from '../../src/local-work';

const ids = {
  tenant: '90000000-0000-4000-8000-000000000001', account: '90000000-0000-4000-8000-000000000002', driver: '90000000-0000-4000-8000-000000000003',
  device: '90000000-0000-4000-8000-000000000004', ready: '90000000-0000-4000-8000-000000000010', unresolved: '90000000-0000-4000-8000-000000000011',
  prepared: '90000000-0000-4000-8000-000000000012', future: '90000000-0000-4000-8000-000000000013', plan: '90000000-0000-4000-8000-000000000020',
  job: '90000000-0000-4000-8000-000000000021', readiness: '90000000-0000-4000-8000-000000000022', round: '90000000-0000-4000-8000-000000000023', workday: '90000000-0000-4000-8000-000000000024'
};

it('P33 refuses a new server start when the real Dexie write probe fails (simulated IndexedDB quota)', async () => {
  window.history.replaceState({}, '', '/prepare?kind=personal');
  const capture = installFetch(), user = userEvent.setup(); render(<ProductionShell />);
  await screen.findByText('خطة جاهزة');
  function quota() { throw new DOMException('لا توجد مساحة لحفظ الجولة', 'QuotaExceededError'); }
  localWork.health.hook('creating', quota);
  try {
    await user.click(screen.getByRole('button', { name: 'ابدأ الجولة' }));
    await screen.findByText(/لا توجد مساحة لحفظ الجولة/); expect(capture.startBodies).toHaveLength(0);
  } finally { localWork.health.hook('creating').unsubscribe(quota); }
});
const context = { kind: 'personal', access: { tenantId: ids.tenant, tenantKind: 'personal', principalKind: 'account', sourceId: ids.account, branchIds: [], driverId: ids.driver, effectiveCapabilities: ['execution.own'] }, expiresAt: '2026-09-25T00:00:00Z', recoveryEmailVerified: true, loginIdentifier: '+201012345678', phoneOwnershipVerified: false };
const task = (taskId: string, recipientName: string, state: string, coordinates: { latitude: number; longitude: number } | null, eligible: boolean, deferred = false) => ({ taskId, dispatchCycleId: null, attemptId: taskId, branchId: null, integrationId: null, sourceRevision: 1, assignmentRevision: 1, recipientName, recipientPhone: '01012345678', coordinates, state, earliestAt: null, deferred, outcome: null, outcomeRevision: 0, heldPieces: null, returnRequiredPieces: 0, eligible });
const daily = {
  scopeKey: 'driver-scope', snapshotRevision: 1, lastCommittedChange: null, freshness: { refreshedAt: '2026-09-24T08:00:00Z', receivedEvidenceOnly: true, deviceContactAt: null, lastReceivedActionAt: null, integrationDelivery: 'unavailable' }, nextCursor: null,
  driverId: ids.driver, workday: null, round: null, current: null, nextSuggestion: null, plan: { planId: ids.plan, revision: 1, orderedTaskIds: [ids.ready] }, owner: null,
  progress: { processedShipments: 0, admittedShipments: 1, deliveredShipments: 0, partialShipments: 0, failedShipments: 0, deliveredPieces: 0, heldReturnRequiredPieces: 0, reportedCollection: { amountMinor: 0, currency: 'EGP', exponent: 2 } },
  groups: { preparedShipments: 1, heldShipments: 1, deferredShipments: 1, returnRequiredShipments: 0, heldPieces: 0, returnRequiredPieces: 0 },
  items: [task(ids.ready, 'سارة الجاهزة', 'personal', { latitude: 30.05, longitude: 31.24 }, true), task(ids.unresolved, 'منى بلا موقع', 'personal', null, false), task(ids.prepared, 'طلب الشركة القادم', 'prepared', { latitude: 30.06, longitude: 31.25 }, false), task(ids.future, 'طلب مؤجل', 'held', { latitude: 30.07, longitude: 31.26 }, false, true)]
};
const baseInput = { version: 1, tenantId: ids.tenant, driverId: ids.driver, accountKind: 'personal', settingsRevision: 1, inputRevision: 3, executionRevision: 1, manualRevision: 0, currentTarget: null, settings: { mode: 'car', origin: { kind: 'manual-pin', coordinates: { latitude: 30.04, longitude: 31.23 } }, endpoint: { kind: 'last-customer' }, plannedStartAt: '2026-09-24T09:00:00Z' }, members: [] };
const readyPlan = { planId: ids.plan, jobId: ids.job, driverId: ids.driver, revision: 1, fingerprint: 'a'.repeat(64), state: 'ready', current: true, inputCurrent: true, policyValidated: true, candidate: { status: 'complete', visits: [], unassignedTaskIds: [] }, input: baseInput, forecast: { forecastId: ids.plan, workloadId: ids.job, kind: 'planning-estimate', timeOrigin: '2026-09-24T09:00:00Z', expectedFinishAt: '2026-09-24T11:00:00Z', members: [] }, createdAt: '2026-09-24T08:00:00Z', routePolicy: { version: 1, method: 'grouped-heuristic', orderedTaskIds: [ids.ready], exceptions: [] } };
const plans = (overrides: Record<string, unknown> = {}) => ({ items: [readyPlan], nextCursor: null, latestJob: null, settingsRevision: 1, inputRevision: 3, manualRevision: 0, continuation: null, ...overrides });

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } }));
}
function installFetch(options: { current?: unknown; plans?: unknown; planningFailure?: boolean; startFailure?: boolean } = {}) {
  const planningBodies: unknown[] = [], startBodies: unknown[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes('/api/session/context')) return json(context);
    if (url.includes('/api/session/bootstrap')) return json({ csrfToken: 'csrf' });
    if (url.includes('/api/v1/rounds/current')) return json(options.current ?? { workday: null, round: null });
    if (url.includes('/api/v1/monitoring/drivers/')) return json(daily, 200, { ETag: '"driver.1"', 'X-Snapshot-Scope': 'driver-scope', 'X-Snapshot-Revision': '1', 'X-Refreshed-At': '2026-09-24T08:00:00Z' });
    if (url.includes(`/api/v1/planning/drivers/${ids.driver}/plans`)) return json(options.plans ?? plans());
    if (url.includes('/api/v1/planning/commands/')) { planningBodies.push(JSON.parse(String(init?.body))); return options.planningFailure ? Promise.reject(new Error('lost planning response')) : json({ receipt: { actionId: 'x', businessStatus: 'accepted' }, response: { body: {} } }); }
    if (url.includes('/api/v1/rounds/readiness')) return json({ readinessId: ids.readiness, driverId: ids.driver, deviceId: ids.device, planId: ids.plan, planRevision: 1, inputFingerprint: 'a'.repeat(64), verifiedActionIds: [], issuedAt: '2026-09-24T08:00:00Z', expiresAt: '2026-09-24T08:01:00Z' });
    if (url.includes('/api/v1/rounds/start')) { startBodies.push(JSON.parse(String(init?.body))); return options.startFailure ? Promise.reject(new Error('lost start response')) : json({ receipt: { actionId: 'x', businessStatus: 'rejected', problem: { detail: 'مرفوض للاختبار' } } }); }
    if (url.includes('/api/v1/rounds/actions/')) return json({ actionId: ids.readiness, status: 'pending' }, 202);
    throw new Error(`Unexpected request: ${url}`);
  });
  return { planningBodies, startBodies };
}

beforeEach(() => {
  // Component-only lock fixture. Native two-tab Web Locks are exercised in P34 Playwright.
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name: string, _options: unknown, work: () => Promise<unknown>) => work() } });
  window.history.replaceState({}, '', '/day?kind=personal'); sessionStorage.clear(); localStorage.clear(); localStorage.setItem('tawsel:device-id', ids.device);
  Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: vi.fn(() => '90000000-0000-4000-8000-000000000099') });
});
afterEach(() => { cleanup(); Reflect.deleteProperty(navigator, 'locks'); vi.restoreAllMocks(); });

describe('connected preparation flow', () => {
  it('keeps valid work usable while unresolved, prepared and deferred work remain distinct', async () => {
    installFetch(); render(<ProductionShell />);
    expect(await screen.findByRole('heading', { name: 'عملك اليوم' })).toBeTruthy();
    expect(screen.getByText(/متابعة تجهيز 1 مهمة صالحة/)).toBeTruthy();
    expect(screen.getByText('هذه المهمة وحدها مستبعدة حتى تحديد نقطة التوصيل.')).toBeTruthy();
    expect(screen.getByText(/ليست على العهدة ولا قابلة للتنفيذ بعد/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'جهّز الجولة' })).toBeTruthy();
  });

  it('maps a partial provider result to unassigned review and never enables start', async () => {
    window.history.replaceState({}, '', '/prepare?kind=personal');
    const partial = { ...readyPlan, state: 'partial', current: true, candidate: { status: 'partial', visits: [], unassignedTaskIds: [ids.unresolved] }, forecast: { ...readyPlan.forecast, expectedFinishAt: null, members: [{ taskId: ids.unresolved, membership: 'unassigned' }] } };
    installFetch({ plans: plans({ items: [partial], latestJob: { jobId: ids.job, driverId: ids.driver, status: 'partial', fingerprint: 'a'.repeat(64), settingsRevision: 1, blockedReason: null, attempts: 1, leaseExpiresAt: null, nextAttemptAt: '2026-09-24T08:00:00Z', error: null, planId: ids.plan, supersededByJobId: null, createdAt: '2026-09-24T08:00:00Z', finishedAt: '2026-09-24T08:01:00Z', resultKind: 'partial' } }) });
    render(<ProductionShell />);
    expect(await screen.findByText('الخطة جزئية')).toBeTruthy();
    expect(screen.getByText(/تعذّر إدراج 1 من العمل/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'ابدأ الجولة' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows engine failure honestly and offers explicit manual order', async () => {
    window.history.replaceState({}, '', '/prepare?kind=personal');
    const failed = { jobId: ids.job, driverId: ids.driver, status: 'failed', fingerprint: 'a'.repeat(64), settingsRevision: 1, blockedReason: null, attempts: 3, leaseExpiresAt: null, nextAttemptAt: '2026-09-24T08:02:00Z', error: { code: 'dependency_unavailable', message: 'engine down', retryable: true }, planId: null, supersededByJobId: null, createdAt: '2026-09-24T08:00:00Z', finishedAt: '2026-09-24T08:01:00Z', resultKind: 'dependency-failed' };
    installFetch({ plans: plans({ items: [], latestJob: failed, continuation: { sourcePlanId: ids.plan, orderedTaskIds: [ids.ready], mode: 'reoptimization-pending', requiresManualConfirmation: true, roadMetricsAvailable: false } }) });
    render(<ProductionShell />);
    expect(await screen.findByText('تعذّر تجهيز المسار الآن')).toBeTruthy();
    expect(screen.getByText(/مدخلاتك محفوظة/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'اعتماد الترتيب اليدوي' })).toBeTruthy();
    expect(screen.queryByText(/تم تجهيز المسار بنجاح/)).toBeNull();
  });

  it('retains choices and retries a lost planning request with the same action identity', async () => {
    window.history.replaceState({}, '', '/prepare?kind=personal');
    const capture = installFetch({ planningFailure: true }); render(<ProductionShell />); const user = userEvent.setup();
    const latitude = await screen.findByLabelText('خط عرض نقطة الانطلاق');
    await user.clear(latitude); await user.type(latitude, '30.1234');
    await user.click(screen.getByRole('button', { name: 'احفظ وجهّز المعاينة' }));
    await screen.findByText(/lost planning response/);
    expect((latitude as HTMLInputElement).value).toBe('30.1234');
    await user.click(screen.getByRole('button', { name: 'أعد إرسال طلب التجهيز نفسه' }));
    await waitFor(() => expect(capture.planningBodies).toHaveLength(2));
    expect(capture.planningBodies[1]).toEqual(capture.planningBodies[0]);
  });

  it('keeps a timed-out start command and queries or retries that exact action ID', async () => {
    window.history.replaceState({}, '', '/prepare?kind=personal');
    const capture = installFetch({ startFailure: true }); render(<ProductionShell />); const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'ابدأ الجولة' }));
    expect(await screen.findByText('بدء الجولة غير محسوم')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'تحقق من بدء الجولة' }));
    expect(await screen.findByText(/لا يوجد تأكيد نهائي بعد/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'أعد إرسال طلب البدء نفسه' }));
    await waitFor(() => expect(capture.startBodies).toHaveLength(2));
    expect(capture.startBodies[1]).toEqual(capture.startBodies[0]);
  });

  it('shows an existing other-phone round without offering a second start', async () => {
    const active = { workday: { workdayId: ids.workday, driverId: ids.driver, state: 'open', openedAt: '2026-09-24T08:00:00Z' }, round: { roundId: ids.round, workdayId: ids.workday, driverId: ids.driver, state: 'active', startedAt: '2026-09-24T08:00:00Z', owner: { accountId: ids.account, deviceId: '90000000-0000-4000-8000-000000000099', generation: 2 }, firstPlanId: ids.plan, firstForecastId: ids.plan, firstWorkloadId: ids.job, currentActivity: null } };
    installFetch({ current: active }); render(<ProductionShell />);
    expect(await screen.findByText('الجولة تعمل على هاتف آخر')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ابدأ الجولة' })).toBeNull();
  });
});
