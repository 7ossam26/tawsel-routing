import { vi } from 'vitest';
export const connectedIds = {
  tenant: '29000000-0000-4000-8000-000000000001', account: '29000000-0000-4000-8000-000000000002', driver: '29000000-0000-4000-8000-000000000003', device: '29000000-0000-4000-8000-000000000004',
  round: '29000000-0000-4000-8000-000000000005', workday: '29000000-0000-4000-8000-000000000006', task: '29000000-0000-4000-8000-000000000007', attempt: '29000000-0000-4000-8000-000000000008', plan: '29000000-0000-4000-8000-000000000009', action: '29000000-0000-4000-8000-000000000010'
};
const connectedContext = { kind: 'company', access: { tenantId: connectedIds.tenant, tenantKind: 'company', principalKind: 'account', sourceId: connectedIds.account, branchIds: [], driverId: connectedIds.driver, effectiveCapabilities: ['execution.own'] }, expiresAt: '2026-09-25T12:00:00Z', recoveryEmailVerified: true, phoneOwnershipVerified: true, loginIdentifier: 'driver' };
const delivery = { kind: 'company', allowedActions: ['full', 'partial', 'refusal', 'no-answer'], fullCollection: { amountMinor: 35000, currency: 'EGP', exponent: 2 }, goodsDue: { amountMinor: 30000, currency: 'EGP', exponent: 2 }, shippingDue: { amountMinor: 5000, currency: 'EGP', exponent: 2 }, lines: [{ sourceLineId: 'line', description: 'قميص', quantity: 3, unitDue: { amountMinor: 10000, currency: 'EGP', exponent: 2 } }] };
const connectedTarget = { taskId: connectedIds.task, attemptId: connectedIds.attempt, sourceRevision: 1, assignmentRevision: 1, pinRevision: 1, coordinates: { latitude: 30.05, longitude: 31.24 }, recipientName: 'عميل الشركة', recipientPhone: '+201012345678', address: '١٢ شارع التحرير', delivery };
const actionTime = { actionId: connectedIds.action, recordedAt: '2026-09-25T08:00:00Z', observation: { observedAt: '2026-09-25T08:00:00Z', clock: { quality: 'uncertain' } } };
function connectedSnapshot(stage: 'heading' | 'arrived' = 'arrived', ownerDevice = connectedIds.device) {
  return { roundId: connectedIds.round, driverId: connectedIds.driver, owner: { accountId: connectedIds.account, deviceId: ownerDevice, generation: 1 }, revision: stage === 'arrived' ? 2 : 1, currentActivity: { taskId: connectedIds.task, attemptId: connectedIds.attempt, revision: stage === 'arrived' ? 2 : 1, stage, heading: actionTime, arrival: stage === 'arrived' ? actionTime : null }, physicalOrigin: stage === 'arrived' ? { kind: 'last-confirmed-stop', coordinates: connectedTarget.coordinates, revision: 1, roundId: connectedIds.round, taskId: connectedIds.task, attemptId: connectedIds.attempt, time: actionTime } : null, planningOrigin: { kind: 'manual-pin', coordinates: { latitude: 30.04, longitude: 31.23 } }, nextSuggestion: null, planning: { planId: connectedIds.plan, updating: false }, targets: [structuredClone(connectedTarget)], branchActivity: null };
}
const outcomeSnapshot = { roundId: connectedIds.round, items: [], history: [], custody: [], progress: { processed: 0, full: 0, partial: 0, refused: 0, noAnswer: 0, deliveredPieces: 0, heldReturnRequiredPieces: 0, collection: [] } };
function json(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
export function installConnectedFetch(options: { stage?: 'heading' | 'arrived'; ownerDevice?: string; loseFirstOutcome?: boolean; rejectTakeover?: boolean; rejectOutcome?: boolean; personal?: boolean; noSplit?: boolean } = {}) {
  const posts: Array<{ url: string; body: unknown }> = []; let outcomeAttempts = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes('/api/session/context')) return json(connectedContext);
    if (url.includes('/api/session/bootstrap')) return json({ csrfToken: 'csrf' });
    if (url.includes('/api/v1/rounds/current')) return json({ workday: { workdayId: connectedIds.workday }, round: { roundId: connectedIds.round } });
    if (url.includes('/api/v1/current/rounds/')) { const snapshot = connectedSnapshot(options.stage, options.ownerDevice); if (options.personal) Object.assign(snapshot.targets[0]!.delivery, { kind: 'personal', allowedActions: ['full', 'refusal', 'no-answer'], lines: [], goodsDue: null, shippingDue: null }); if (options.noSplit) snapshot.targets[0]!.delivery = { ...snapshot.targets[0]!.delivery, allowedActions: ['full', 'refusal', 'no-answer'] }; return json(snapshot); }
    if (url.includes('/api/v1/outcomes/rounds/')) return json(outcomeSnapshot);
    if (url.includes('/api/v1/devices/rounds/') && !url.includes('/snapshot')) return json({ roundId: connectedIds.round, workdayId: connectedIds.workday, driverId: connectedIds.driver, owner: { accountId: connectedIds.account, deviceId: options.ownerDevice ?? connectedIds.device, generation: 1 }, viewerDeviceId: connectedIds.device, mode: options.ownerDevice && options.ownerDevice !== connectedIds.device ? 'view-only' : 'owner', roundState: 'active', workdayState: 'open', mayTakeover: Boolean(options.ownerDevice && options.ownerDevice !== connectedIds.device), snapshotRequired: false });
    if (url.includes('/api/v1/outcomes/full') || url.includes('/api/v1/outcomes/no-answer') || url.includes('/api/v1/outcomes/partial') || url.includes('/api/v1/outcomes/refusal')) { posts.push({ url, body: JSON.parse(String(init?.body)) }); outcomeAttempts += 1; if (options.loseFirstOutcome && outcomeAttempts === 1) return Promise.reject(new TypeError('Failed to fetch')); return json({ receipt: { actionId: connectedIds.action, businessStatus: options.rejectOutcome ? 'rejected' : 'accepted', ...(options.rejectOutcome ? { problem: { detail: 'المصدر لا يسمح بتقسيم هذه الشحنة.' } } : {}) }, response: { body: {} } }); }
    if (url.includes('/api/v1/devices/takeover')) { posts.push({ url, body: JSON.parse(String(init?.body)) }); return json({ receipt: { actionId: connectedIds.action, businessStatus: options.rejectTakeover ? 'rejected' : 'accepted', ...(options.rejectTakeover ? { problem: { detail: 'انتقلت الملكية لهاتف آخر' } } : {}) } }, options.rejectTakeover ? 409 : 200); }
    if (url.includes('/api/v1/devices/rounds/') && url.includes('/snapshot')) return json({ context: { mode: 'owner', roundState: 'active' } });
    if (url.includes('/api/v1/outcomes/actions/')) return json({ actionId: connectedIds.action, status: 'pending' }, 202);
    throw new Error(`Unexpected request: ${url}`);
  });
  return posts;
}

