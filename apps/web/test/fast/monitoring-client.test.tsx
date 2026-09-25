// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonitoringClient, MonitoringPage as MonitoringRequest, MonitoringRead } from '@tawsel/api-client/src/monitoring';
import { MonitoringRefreshController, type RefreshState, type Snapshot } from '../../src/monitoring-refresh';
import { ProductionShell } from '../../src/production-shell';

const ids = { driver: '10000000-0000-4000-8000-000000000001', task: '10000000-0000-4000-8000-000000000002', attempt: '10000000-0000-4000-8000-000000000003', round: '10000000-0000-4000-8000-000000000004', day: '10000000-0000-4000-8000-000000000005', branch: '10000000-0000-4000-8000-000000000006', source: '10000000-0000-4000-8000-000000000007', action: '10000000-0000-4000-8000-000000000008', task2: '10000000-0000-4000-8000-000000000009', source2: '10000000-0000-4000-8000-000000000010', attempt2: '10000000-0000-4000-8000-000000000011' };
const progress = { shipments: 1, attempts: 1, processedAttempts: 0, processedShipments: 0, fullDeliveredShipments: 0, partialShipments: 0, failedShipments: 0, remainingShipments: 1 };
function snapshot(revision: number, recipientName = 'عميل ظاهر'): Snapshot {
  return { scopeKey: 'scope', snapshotRevision: revision, lastCommittedChange: null, freshness: { refreshedAt: `2026-09-25T00:00:0${Math.min(revision, 9)}.000Z`, receivedEvidenceOnly: true, deviceContactAt: null, lastReceivedActionAt: null, integrationDelivery: 'unavailable' }, nextCursor: null, driverId: ids.driver,
    workday: { workdayId: ids.day, openedAt: '2026-09-24T20:00:00.000Z', endedAt: null }, round: { roundId: ids.round, workdayId: ids.day, startedAt: '2026-09-24T20:10:00.000Z', endedAt: null }, current: null, nextSuggestion: null,
    plan: { planId: null, revision: null, orderedTaskIds: [ids.task] }, owner: null, progress, groups: { preparedShipments: 0, heldShipments: 1, deferredShipments: 0, returnRequiredShipments: 0, heldPieces: 0, returnRequiredPieces: 0 },
    items: [{ taskId: ids.task, dispatchCycleId: ids.round, attemptId: ids.attempt, branchId: ids.branch, integrationId: ids.source, sourceRevision: 1, assignmentRevision: 1, recipientName, recipientPhone: '01000000000', coordinates: { latitude: 30.04, longitude: 31.23 }, state: 'held', earliestAt: null, deferred: false, outcome: null, outcomeRevision: 0, heldPieces: 1, returnRequiredPieces: 0, eligible: true }] };
}
const read = (revision: number, name?: string): MonitoringRead<Snapshot> => ({ status: 200, data: snapshot(revision, name), etag: `"scope.${revision}"`, scopeKey: 'scope', revision, refreshedAt: `2026-09-25T00:00:0${Math.min(revision, 9)}.000Z` });
function deferred<T>() { let resolve!: (value: T) => void, reject!: (reason?: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
class TestEnvironment {
  visibilityState: DocumentVisibilityState = 'visible';
  onlineTarget = new EventTarget();
  private target = new EventTarget();
  addEventListener = this.target.addEventListener.bind(this.target);
  removeEventListener = this.target.removeEventListener.bind(this.target);
  visibility() { this.target.dispatchEvent(new Event('visibilitychange')); }
}
const client = (driver: (id: string, page?: MonitoringRequest) => Promise<MonitoringRead<Snapshot>>) => ({ driver }) as Pick<MonitoringClient, 'driver'>;

describe('monitoring refresh controller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); cleanup(); vi.restoreAllMocks(); });
  it('ignores a deliberately delayed old response and keeps one confirmed revision', async () => {
    const first = deferred<MonitoringRead<Snapshot>>(), second = deferred<MonitoringRead<Snapshot>>(), calls: MonitoringRequest[] = [];
    const api = client((_id, page = {}) => { calls.push(page); return calls.length === 1 ? first.promise : second.promise; });
    const env = new TestEnvironment(), states: RefreshState[] = [], controller = new MonitoringRefreshController(api, ids.driver, undefined, 1_000, 10_000, () => 0, env);
    controller.subscribe(value => states.push(value)); controller.start(); expect(calls).toHaveLength(1);
    const full = controller.refresh(true); expect(calls).toHaveLength(2); second.resolve(read(2, 'الحالي')); await full;
    first.resolve(read(1, 'القديم')); await Promise.resolve();
    expect(states.at(-1)?.revision).toBe(2); expect(states.at(-1)?.data?.items[0]?.recipientName).toBe('الحالي'); controller.stop();
  });
  it('uses conditional polls, stays fresh on 304 with no driver activity, and bounds concurrent work', async () => {
    let now = 0, calls = 0; const pages: MonitoringRequest[] = [], pending = deferred<MonitoringRead<Snapshot>>();
    const api = client(async (_id, page = {}) => { pages.push(page); calls++; if (calls === 1) return read(1); if (calls === 2) return { status: 304, data: null, etag: '"scope.1"', scopeKey: 'scope', revision: 1, refreshedAt: '2026-09-25T00:00:09.000Z' }; return pending.promise; });
    const env = new TestEnvironment(), states: RefreshState[] = [], controller = new MonitoringRefreshController(api, ids.driver, undefined, 1_000, 10_000, () => now, env);
    controller.subscribe(value => states.push(value)); controller.start(); await vi.advanceTimersByTimeAsync(0); now = 9_000; await vi.advanceTimersByTimeAsync(1_000);
    expect(pages[1]?.etag).toBe('"scope.1"'); expect(states.at(-1)?.phase).toBe('fresh');
    now = 18_000; await vi.advanceTimersByTimeAsync(1_000); expect(calls).toBe(3); void controller.refresh(); void controller.refresh(); expect(calls).toBe(3);
    pending.resolve({ status: 304, data: null, etag: '"scope.1"', scopeKey: 'scope', revision: 1, refreshedAt: '2026-09-25T00:00:18.000Z' }); await Promise.resolve(); controller.stop();
  });
  it('keeps the last confirmed snapshot and marks it stale after ten seconds without a successful response', async () => {
    let now = 100; const pending = deferred<MonitoringRead<Snapshot>>();
    const api = client(async () => {
      if (now === 100) return read(1);
      return pending.promise;
    });
    const env = new TestEnvironment(), states: RefreshState[] = [], controller = new MonitoringRefreshController(api, ids.driver, undefined, 1_000, 10_000, () => now, env);
    controller.subscribe(value => states.push(value)); controller.start(); await vi.advanceTimersByTimeAsync(0);
    now = 10_101; await vi.advanceTimersByTimeAsync(2_000);
    expect(states.at(-1)?.phase).toBe('stale');
    expect(states.at(-1)?.inFlight).toBe(true);
    expect(states.at(-1)?.data?.snapshotRevision).toBe(1);
    controller.stop();
  });
  it('cancels a conditional request and omits ETag for foreground/reconnect full refresh', async () => {
    const first = deferred<MonitoringRead<Snapshot>>(), reconnect = deferred<MonitoringRead<Snapshot>>(), pages: MonitoringRequest[] = [];
    const api = client((_id, page = {}) => { pages.push(page); return pages.length === 1 ? Promise.resolve(read(1)) : pages.length === 2 ? first.promise : reconnect.promise; });
    const env = new TestEnvironment(), controller = new MonitoringRefreshController(api, ids.driver, undefined, 1_000, 10_000, () => 1, env); controller.start(); await vi.advanceTimersByTimeAsync(0); await vi.advanceTimersByTimeAsync(1_000);
    env.visibility(); expect(pages).toHaveLength(3); expect(pages[1]?.etag).toBe('"scope.1"'); expect(pages[1]?.signal?.aborted).toBe(true); expect(pages[2]?.etag).toBeUndefined();
    reconnect.resolve(read(2)); await Promise.resolve(); first.resolve(read(1)); await Promise.resolve(); controller.stop();
  });
});

it('renders only the scoped task, read-only departed detail, and server-received action filters', async () => {
  vi.useRealTimers(); window.history.replaceState({}, '', `/monitoring?driverId=${ids.driver}`);
  const hidden = 'SECRET RECIPIENT';
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    if (url.includes('/session/context?kind=personal')) return Response.json({ error: { code: 'session_expired', message: 'No personal session in this staff fixture' } }, { status: 401 });
    if (url.includes('/session/context')) return Response.json({ kind: 'company', access: { tenantId: ids.driver, sourceId: ids.source, principalKind: 'account', tenantKind: 'company', driverId: null, branchIds: [ids.branch], effectiveCapabilities: ['monitor.read'] }, expiresAt: '2026-09-26T00:00:00Z', recoveryEmailVerified: true, loginIdentifier: 'staff', phoneOwnershipVerified: false });
    if (url.includes(`/tasks/${ids.task2}/history`)) return new Response(JSON.stringify({ scopeKey: 'history-2', snapshotRevision: 1, lastCommittedChange: null, freshness: { refreshedAt: '2026-09-25T00:00:02Z', receivedEvidenceOnly: true, deviceContactAt: null, lastReceivedActionAt: null, integrationDelivery: 'unavailable' }, nextCursor: null, resourceId: ids.task2, progress, items: [] }), { headers: { 'Content-Type': 'application/json', ETag: '"history-2.1"', 'X-Snapshot-Scope': 'history-2', 'X-Snapshot-Revision': '1', 'X-Refreshed-At': '2026-09-25T00:00:02Z' } });
    if (url.includes(`/tasks/${ids.task}/history`)) return new Response(JSON.stringify({ scopeKey: 'history', snapshotRevision: 1, lastCommittedChange: null, freshness: { refreshedAt: '2026-09-25T00:00:02Z', receivedEvidenceOnly: true, deviceContactAt: null, lastReceivedActionAt: '2026-09-25T00:00:01Z', integrationDelivery: 'unavailable' }, nextCursor: null, resourceId: ids.task, progress, items: [{ kind: 'action', action: { sourceId: ids.source, actionId: ids.action, operationId: 'outcome.recordFull', receivedAt: '2026-09-25T00:00:01Z', acceptedAt: '2026-09-25T00:00:01Z', businessStatus: 'accepted' } }] }), { headers: { 'Content-Type': 'application/json', ETag: '"history.1"', 'X-Snapshot-Scope': 'history', 'X-Snapshot-Revision': '1', 'X-Refreshed-At': '2026-09-25T00:00:02Z' } });
    if (url.includes(`/drivers/${ids.driver}`)) {
      const view = snapshot(1); view.items.push({ ...view.items[0]!, taskId: ids.task2, attemptId: ids.attempt2, integrationId: ids.source2, recipientName: 'عميل مصدر ثان' });
      view.progress = { ...view.progress, shipments: 2, attempts: 2, remainingShipments: 2 };
      return new Response(JSON.stringify(view), { headers: { 'Content-Type': 'application/json', ETag: '"scope.1"', 'X-Snapshot-Scope': 'scope', 'X-Snapshot-Revision': '1', 'X-Refreshed-At': '2026-09-25T00:00:02Z' } });
    }
    throw new Error(url);
  });
  render(<ProductionShell />); await screen.findByText('عميل ظاهر'); await screen.findByText('outcome.recordFull');
  expect(screen.getByText('الجولة غادرت — التنفيذ للقراءة فقط')).toBeTruthy(); expect(document.body.textContent).not.toContain(hidden); expect(screen.queryByRole('button', { name: /تسليم|وصلت|رفض/ })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'مرفوض' })); await waitFor(() => expect(screen.getByText('لا توجد إجراءات مستلمة بهذه الحالة.')).toBeTruthy());
  await userEvent.selectOptions(screen.getByLabelText('المصدر'), ids.source2); expect((await screen.findAllByText('عميل مصدر ثان')).length).toBeGreaterThan(0); expect(screen.queryByText('عميل ظاهر')).toBeNull();
});
