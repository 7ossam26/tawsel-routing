import type { Download, LocalEnvelope } from '../../src/local-work';
import { scopeKey, sessionScope } from '../../src/local-work';
import type { components } from '@tawsel/api-client';
// Labelled browser-storage fixture. No real API/identity/clock claim.
export const localIds = {
  tenant: '33000000-0000-4000-8000-000000000001', account: '33000000-0000-4000-8000-000000000002',
  device: '33000000-0000-4000-8000-000000000003', driver: '33000000-0000-4000-8000-000000000004',
  round: '33000000-0000-4000-8000-000000000005', task: '33000000-0000-4000-8000-000000000006',
  attempt: '33000000-0000-4000-8000-000000000007', day: '33000000-0000-4000-8000-000000000008'
};
export function downloadedFixture(): Download {
  const session: components['schemas']['SessionContext'] = { kind: 'personal', expiresAt: '2026-09-25T20:00:00Z', loginIdentifier: '+201012345678', recoveryEmailVerified: true, phoneOwnershipVerified: false, access: { principalKind: 'account', tenantId: localIds.tenant, tenantKind: 'personal', sourceId: localIds.account, branchIds: [], driverId: localIds.driver, effectiveCapabilities: ['execution.own'] } };
  const owner = { accountId: localIds.account, deviceId: localIds.device, generation: 1 };
  return {
    scope: scopeKey(sessionScope(session, localIds.device)), roundId: localIds.round, format: 1, downloadedAt: '2026-09-25T08:00:00Z', session,
    ownership: { roundId: localIds.round, workdayId: localIds.day, driverId: localIds.driver, owner, viewerDeviceId: localIds.device, mode: 'owner', roundState: 'active', workdayState: 'open', mayTakeover: false, snapshotRequired: false }, snapshotToken: null,
    current: { roundId: localIds.round, driverId: localIds.driver, owner, revision: 0, currentActivity: null, physicalOrigin: null, planningOrigin: { kind: 'manual-pin', coordinates: { latitude: 30, longitude: 31 } }, nextSuggestion: null, planning: { planId: null, updating: false }, branchActivity: null,
      targets: [{ taskId: localIds.task, attemptId: localIds.attempt, sourceRevision: 1, assignmentRevision: 0, pinRevision: 1, coordinates: { latitude: 30.1, longitude: 31.1 }, recipientName: 'عميل محفوظ', recipientPhone: '01012345678', address: 'عنوان محفوظ', delivery: { kind: 'personal', allowedActions: ['full', 'refusal', 'no-answer'], fullCollection: null, goodsDue: null, shippingDue: null, lines: [] } }] },
    outcomes: { roundId: localIds.round, items: [], history: [], custody: [], progress: { processed: 0, full: 0, partial: 0, refused: 0, noAnswer: 0, deliveredPieces: 0, heldReturnRequiredPieces: 0, collection: [] } }, plan: null, road: null
  };
}
export function headingFixture(): LocalEnvelope {
  return { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: crypto.randomUUID(), operationId: 'current.selectHeading', context: { kind: 'device', tenantId: localIds.tenant, accountId: localIds.account, deviceId: localIds.device, deviceGeneration: 1, deviceSequence: 1 }, resources: { tripId: localIds.round, taskId: localIds.task, attemptId: localIds.attempt }, baseVersions: {}, dependsOnActionIds: [], observation: { observedAt: '2026-09-25T08:02:00Z', clock: { quality: 'uncertain' } }, payload: { roundId: localIds.round, taskId: localIds.task, attemptId: localIds.attempt, expectedActivityRevision: 0, expectedCurrentAttemptId: null, expectedSourceRevision: 1, expectedAssignmentRevision: 0, expectedPinRevision: 1 } };
}
