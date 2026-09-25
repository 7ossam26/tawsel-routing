import 'fake-indexeddb/auto';
import { beforeEach, vi } from 'vitest';
import { localWork } from '../../src/local-work';
beforeEach(async () => { await localWork.open(); await localWork.transaction('rw', localWork.tables, async () => { for (const table of localWork.tables) await table.clear(); }); });
export const connectedIds = {
  tenant: '29000000-0000-4000-8000-000000000001', account: '29000000-0000-4000-8000-000000000002', driver: '29000000-0000-4000-8000-000000000003', device: '29000000-0000-4000-8000-000000000004',
  round: '29000000-0000-4000-8000-000000000005', workday: '29000000-0000-4000-8000-000000000006', task: '29000000-0000-4000-8000-000000000007', attempt: '29000000-0000-4000-8000-000000000008', plan: '29000000-0000-4000-8000-000000000009', action: '29000000-0000-4000-8000-000000000010'
};
export const connectedContext = { kind: 'company', access: { tenantId: connectedIds.tenant, tenantKind: 'company', principalKind: 'account', sourceId: connectedIds.account, branchIds: [], driverId: connectedIds.driver, effectiveCapabilities: ['execution.own'] }, expiresAt: '2026-09-25T12:00:00Z', recoveryEmailVerified: true, phoneOwnershipVerified: true, loginIdentifier: 'driver' };
const delivery = { kind: 'company', allowedActions: ['full', 'partial', 'refusal', 'no-answer'], fullCollection: { amountMinor: 35000, currency: 'EGP', exponent: 2 }, goodsDue: { amountMinor: 30000, currency: 'EGP', exponent: 2 }, shippingDue: { amountMinor: 5000, currency: 'EGP', exponent: 2 }, lines: [{ sourceLineId: 'line', description: 'قميص', quantity: 3, unitDue: { amountMinor: 10000, currency: 'EGP', exponent: 2 } }] };
const connectedTarget = { taskId: connectedIds.task, attemptId: connectedIds.attempt, sourceRevision: 1, assignmentRevision: 1, pinRevision: 1, coordinates: { latitude: 30.05, longitude: 31.24 }, recipientName: 'عميل الشركة', recipientPhone: '+201012345678', address: '١٢ شارع التحرير', delivery };
const actionTime = { actionId: connectedIds.action, recordedAt: '2026-09-25T08:00:00Z', observation: { observedAt: '2026-09-25T08:00:00Z', clock: { quality: 'uncertain' } } };
export function connectedSnapshot(stage: 'heading' | 'arrived' = 'arrived', ownerDevice = connectedIds.device) {
  return { roundId: connectedIds.round, driverId: connectedIds.driver, owner: { accountId: connectedIds.account, deviceId: ownerDevice, generation: 1 }, revision: stage === 'arrived' ? 2 : 1, currentActivity: { taskId: connectedIds.task, attemptId: connectedIds.attempt, revision: stage === 'arrived' ? 2 : 1, stage, heading: actionTime, arrival: stage === 'arrived' ? actionTime : null }, physicalOrigin: stage === 'arrived' ? { kind: 'last-confirmed-stop', coordinates: connectedTarget.coordinates, revision: 1, roundId: connectedIds.round, taskId: connectedIds.task, attemptId: connectedIds.attempt, time: actionTime } : null, planningOrigin: { kind: 'manual-pin', coordinates: { latitude: 30.04, longitude: 31.23 } }, nextSuggestion: null, planning: { planId: connectedIds.plan, updating: false }, targets: [structuredClone(connectedTarget)], branchActivity: null };
}
export const outcomeSnapshot = { roundId: connectedIds.round, items: [], history: [], custody: [], progress: { processed: 0, full: 0, partial: 0, refused: 0, noAnswer: 0, deliveredPieces: 0, heldReturnRequiredPieces: 0, collection: [] } };
function json(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
export function receiptFixture(body: { actionId: string; operationId: string; payload?: { expectedActivityRevision?: number } }, rejected = false, responseBody = {}, detail = 'المصدر لا يسمح بتقسيم هذه الشحنة.') {
  return { operationId: body.operationId, retention: 'full', summary: {}, receipt: { schemaVersion: '1.0.0', actionId: body.actionId, receiptId: connectedIds.action, evidenceStatus: 'received', businessStatus: rejected ? 'rejected' : 'accepted', receivedAt: '2026-09-25T09:00:00Z', ...(rejected ? { problem: { detail } } : { committedAt: '2026-09-25T09:00:00Z', resourceVersions: { resourceRevision: (body.payload?.expectedActivityRevision ?? 0) + 1, deviceGeneration: 1 } }) }, response: { status: rejected ? 409 : 200, body: responseBody } };
}
export function installConnectedFetch(options: { stage?: 'heading' | 'arrived'; ownerDevice?: string; loseFirstOutcome?: boolean; rejectTakeover?: boolean; rejectOutcome?: boolean; personal?: boolean; noSplit?: boolean } = {}) {
  const posts: Array<{ url: string; body: unknown }> = []; let outcomeAttempts = 0, completed = false;
  const snapshot = () => { const value = connectedSnapshot(options.stage, options.ownerDevice); if (options.personal) Object.assign(value.targets[0]!.delivery, { kind: 'personal', allowedActions: ['full', 'refusal', 'no-answer'], lines: [], goodsDue: null, shippingDue: null }); if (options.noSplit) value.targets[0]!.delivery = { ...value.targets[0]!.delivery, allowedActions: ['full', 'refusal', 'no-answer'] }; if (completed) { value.revision++; value.targets = []; value.currentActivity = null as never; } return value; };
  const owner = () => ({ roundId: connectedIds.round, workdayId: connectedIds.workday, driverId: connectedIds.driver, owner: { accountId: connectedIds.account, deviceId: options.ownerDevice ?? connectedIds.device, generation: 1 }, viewerDeviceId: connectedIds.device, mode: options.ownerDevice && options.ownerDevice !== connectedIds.device ? 'view-only' : 'owner', roundState: 'active', workdayState: 'open', mayTakeover: Boolean(options.ownerDevice && options.ownerDevice !== connectedIds.device), snapshotRequired: false });
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes('/api/session/context')) return json({ ...connectedContext, kind: options.personal ? 'personal' : 'company' });
    if (url.includes('/api/session/bootstrap')) return json({ csrfToken: 'csrf' });
    if (url.includes('/api/v1/rounds/current')) return json({ workday: { workdayId: connectedIds.workday }, round: { roundId: connectedIds.round } });
    if (url.includes('/api/v1/current/rounds/')) return json(snapshot());
    if (url.includes('/api/v1/outcomes/rounds/')) return json({ ...outcomeSnapshot, progress: { ...outcomeSnapshot.progress, processed: completed ? 1 : 0 } });
    if (url.includes('/api/v1/planning/')) return json({ items: [], nextCursor: null, latestJob: null, settingsRevision: 0 });
    if (url.includes('/api/v1/devices/rounds/') && !url.includes('/snapshot')) return json(owner());
    if (/outcomes\/(full|no-answer|partial|refusal)/.test(url)) { const body = JSON.parse(String(init?.body)); posts.push({ url, body }); outcomeAttempts++; if (options.loseFirstOutcome && outcomeAttempts === 1) return Promise.reject(new TypeError('Failed to fetch')); completed = !options.rejectOutcome; return json(receiptFixture(body, options.rejectOutcome)); }
    if (url.includes('/api/v1/devices/takeover')) { const body = JSON.parse(String(init?.body)); posts.push({ url, body }); return json(receiptFixture(body, options.rejectTakeover, {}, 'انتقلت الملكية لهاتف آخر'), options.rejectTakeover ? 409 : 200); }
    if (url.includes('/api/v1/devices/rounds/') && url.includes('/snapshot')) return json({ context: owner(), current: snapshot(), confirmedAt: '2026-09-25T08:30:00Z', snapshotToken: null });
    if (url.includes('/api/v1/outcomes/actions/')) return json({ actionId: connectedIds.action, status: 'pending' }, 202);
    throw new Error('Unexpected request: ' + url);
  });
  return posts;
}
