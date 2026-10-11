import {Corrections} from '../../src/corrections/service.js';
import type {components} from '@tawsel/api-client';
type S=components['schemas'];
type Fixture=Awaited<ReturnType<typeof companyPlanningFixture>>;
import { beforeEach, afterEach, test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture } from '../support/access-fixture.js';
import { outcomeCompanyFixture } from '../support/outcome-fixture.js';
import { companyPlanningFixture } from '../support/planning-company-fixture.js';
import { operatorToken, send } from '../support/provisioning-fixture.js';
import { Outcomes } from '../../src/outcomes/service.js';
import { CurrentActivity } from '../../src/current/service.js';
import { B2bIntakeService } from '../../src/b2b-intake/service.js';
import { Returns } from '../../src/returns/service.js';
import { ReturnReceiver } from '../../src/returns/receiver.js';
import { Monitoring } from '../../src/monitoring/service.js';
import { money } from '../../src/outcomes/arithmetic.js';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const cleanup: (() => Promise<unknown>)[] = [];
const expectEqual = (actual: unknown, expected: unknown, message?: string) => assert.equal(actual, expected, message);
beforeEach(async () => { db = await createTestDatabase(); await prepareAccessFixture(db.pool); });
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); await db.close(); });
function accepted<T extends S['ActionResult']>(result: T, label: string) {
  expectEqual(result.receipt.businessStatus, 'accepted', `${label}: ${JSON.stringify(result)}`);
  return result;
}
async function provision(f: Fixture, operation: string, payload: object) {
  const response = await send(f.app, f.source.token, f.source.command(operation, payload));
  expectEqual(response.statusCode, 200, response.body);
  return response.json() as {response:{body:{resourceId:string}}};
}
async function adopt(f: Fixture) {
  const action = structuredClone(f.source.bootstrapCommand);
  action.actionId = randomUUID();
  Object.assign(action.payload, { sourceRevision: 3, interopVersion: '2.0.0', erpCompanyId: randomUUID(), intakeCapabilities: ['intake.prepare', 'assignment.manage'], returnCapabilities: ['return.receive', 'return.dispose'], monitoringCapabilities: ['monitor.read'] });
  const response = await send(f.app, operatorToken, action);
  expectEqual(response.statusCode, 200, response.body);
}
test.each(['monitoring', 'recovery', 'legacy-recovery'])('B-only membership preserves immutable A/B scope for %s after same-round redispatch', async mode => {
  const f = await outcomeCompanyFixture(db, [{}]);
  cleanup.push(() => f.close());
  await adopt(f);
  const branchB = (await provision(f, 'branch.provision', { externalId: 'branch-b', sourceRevision: 1, name: 'B', enabled: true, location: null })).response.body.resourceId;
  await provision(f, 'role.defineCapabilities', { externalId: 'role', sourceRevision: 2, name: 'Driver', capabilities: ['execution.own', 'correction.own'] });
  const outcomes = new Outcomes(db.pool), current = new CurrentActivity(db.pool), corrections = new Corrections(db.pool);
  const heading = f.make(0, 'current.selectHeading');
  accepted(await current.command(f.principal, heading), 'A heading');
  const arrival = f.make(0, 'current.recordArrival', {}, 1, String(heading.payload.attemptId));
  accepted(await current.command(f.principal, arrival), 'A arrival');
  const refusal = f.make(0, 'outcome.recordRefusal', { shippingPayment: 'collected', reportedCollection: money(5000), rejection: { catalogVersion: '1.0.0', code: 'changed-mind' } }, 2, String(heading.payload.attemptId));
  refusal.payloadVersion = mode === 'legacy-recovery' ? '1.0.0' : '2.0.0';
  if (mode === 'legacy-recovery') delete refusal.payload.rejection;
  const originalOutcome = accepted(await outcomes.command(f.principal, refusal), 'A refusal');
  const stale = structuredClone(refusal); stale.actionId = randomUUID(); stale.payload.expectedActivityRevision = 999;
  expect((await outcomes.command(f.principal, stale)).receipt.businessStatus).toBe('rejected');
  const correction = f.planCommand('outcome.correct', { roundId: f.round.roundId, taskId: refusal.payload.taskId, attemptId: refusal.payload.attemptId, expectedOutcomeRevision: 1, replacement: { outcome: 'refused', shippingPayment: 'collected', reportedCollection: money(5000), ...(mode === 'legacy-recovery' ? {} : { rejection: { catalogVersion: '1.0.0', code: 'wrong-product' } }) } });
  delete correction.payload.driverId; correction.payloadVersion = refusal.payloadVersion;
  expect((await corrections.command(f.principal, correction)).receipt.businessStatus).toBe('accepted');
  const returns = new Returns(db.pool), group = (await returns.groups(f.principal)).groups[0]!, item = group.items[0]!;
  const offer = f.planCommand('return.requestHandover', { roundId: f.round.roundId, sourceBranchId: group.sourceBranchId, items: [{ taskId: item.taskId, dispatchCycleId: item.dispatchCycleId, outcomeId: item.outcomeId, sourceLineId: item.sourceLineId, quantity: 3 }] });
  delete offer.payload.driverId;
  const request = (accepted(await returns.request(f.principal, offer), 'A return offer').response!.body as S['ReturnCommandResult']).request;
  const auth = `Bearer ${f.source.token}`, intake = new B2bIntakeService(db.pool), old = await intake.get(auth, 'shipment-0');
  const receipt = f.source.command('return.confirmSubsetReceipt', { requestId: request.requestId, receivingBranchId: request.sourceBranchId, items: [{ itemId: request.items[0]!.itemId, quantity: 3, expectedRevision: 0 }] });
  accepted(await new ReturnReceiver(db.pool).command(auth, 'return.confirmSubsetReceipt', receipt), 'Actual A receipt');
  const move = f.source.command('dispatch.createFromReceipt', { externalId: old.externalId, previousDispatchCycleId: old.dispatchCycleId, snapshot: { ...old.snapshot, sourceBranchExternalId: 'branch-b', sourceDispatchCycleId: 'B-audit', sourceRevision: 2, expectedSourceRevision: 1, shippingDue: money(0), totalDue: money(30000) }, transfer: { sourceBranchExternalId: 'branch', transferId: randomUUID(), destinationReceiptId: randomUUID(), receivedAtDestination: true } });
  move.payloadVersion = '2.0.0';
  accepted(await intake.command(auth, 'dispatch.createFromReceipt', move), 'A receipt to B dispatch');
  await provision(f, 'user.setBranchMemberships', { externalId: 'policy-driver', sourceRevision: 2, branchExternalIds: ['branch', 'branch-b'] });
  const received = await f.post('assignment.receiveBatch', { driverExternalId: 'policy-driver', receiptAsserted: true, items: [{ externalId: old.externalId, sourceDispatchCycleId: 'B-audit', expectedSourceRevision: 2, expectedAssignmentRevision: 0, assignmentRevision: 1 }] });
  accepted(received.json() as S['ActionResult'], 'B driver receipt');
  const bCurrent = await current.read(f.principal, f.round.roundId);
  const bTarget = bCurrent.targets.find((t) => t.taskId === old.taskId);
  assert.ok(bTarget);
  assert.notEqual(bTarget.attemptId, heading.payload.attemptId);
  const admissions = (await db.pool.query<{attempt_id:string;dispatch_cycle_id:string;round_id:string}>('SELECT attempt_id,dispatch_cycle_id,round_id FROM tawsel.round_admissions WHERE tenant_id=$1 AND task_id=$2 ORDER BY admitted_at', [f.tenantId, old.taskId])).rows;
  assert.equal(admissions.length, 2);
  assert.equal(new Set(admissions.map((a) => a.round_id)).size, 1);

  await provision(f, 'role.defineCapabilities', { externalId: 'monitor-role', sourceRevision: 1, name: 'Staff', capabilities: ['monitor.read'] });
  await provision(f, 'user.provision', { externalId: 'policy-staff', sourceRevision: 1, subject: 'policy-staff', roleExternalId: 'monitor-role', branchExternalIds: ['branch-b'], enabled: true });
  await db.pool.query('UPDATE tawsel.identity_subjects SET enabled=true WHERE tenant_id=$1', [f.tenantId]);
  const staff = { kind: 'account' as const, issuer: 'https://issuer.fixture.invalid', subject: 'policy-staff' };
  const monitor = await new Monitoring(db.pool).read(staff, { kind: 'task', id: old.taskId });
  const monitorText = JSON.stringify(monitor.body);
  if (mode === 'monitoring') {
    const monitorService = new Monitoring(db.pool);
    const paged: S['MonitoringHistory']['items'] = [];
    let cursor: string | undefined;
    do {
      const page = (await monitorService.read(staff, { kind: 'task', id: old.taskId }, { limit: 1, ...(cursor ? { cursor } : {}) })).body as S['MonitoringHistory'];
      assert.ok(page.progress);
      expect(page.progress.attempts).toBe(1);
      paged.push(...page.items); cursor = page.nextCursor ?? undefined;
    } while (cursor);
    for (const id of [heading.actionId, arrival.actionId, refusal.actionId, offer.actionId]) {
      expect(monitorText).not.toContain(id); expect(JSON.stringify(paged)).not.toContain(id);
      await expect(monitorService.read(staff, { kind: 'action', id, sourceId: f.accountId })).rejects.toMatchObject({ statusCode: 404 });
    }
    await provision(f, 'user.setBranchMemberships', { externalId: 'policy-staff', sourceRevision: 2, branchExternalIds: ['branch'] });
    const a = JSON.stringify((await monitorService.read(staff, { kind: 'task', id: old.taskId })).body);
    for (const id of [heading.actionId, arrival.actionId, refusal.actionId]) expect(a).toContain(id);
    expect(a).not.toContain(move.actionId);
  }
  await provision(f, 'user.setBranchMemberships', { externalId: 'policy-staff', sourceRevision: 3, branchExternalIds: ['branch', 'branch-b'] });
  const both = JSON.stringify((await new Monitoring(db.pool).read(staff, { kind: 'task', id: old.taskId })).body);
  for (const id of [heading.actionId, arrival.actionId, refusal.actionId]) expect(both).toContain(id);
  if (mode === 'monitoring') return;
  await provision(f, 'user.setBranchMemberships', { externalId: 'policy-driver', sourceRevision: 3, branchExternalIds: ['branch-b'] });
  const actualBranches = (await db.pool.query<{branch_id:string}>('SELECT branch_id FROM tawsel.membership_branches WHERE tenant_id=$1 AND account_id=$2', [f.tenantId, f.accountId])).rows.map((r) => r.branch_id);
  assert.deepEqual(actualBranches, [branchB]);
  for (const [service, action] of [[outcomes, refusal], [outcomes, stale], [corrections, correction], [current, heading], [current, arrival]] as const) {
    await expect(service.result(f.principal, action.actionId)).rejects.toMatchObject({ code: 'forbidden_resource', statusCode: 404 });
    await expect(service.command(f.principal, action)).rejects.toMatchObject({ code: 'forbidden_resource', statusCode: 404 });
  }
  await expect(corrections.availability(f.principal, String(refusal.payload.attemptId), heading.context.kind === 'device' ? heading.context.deviceId : randomUUID())).rejects.toMatchObject({ code: 'forbidden_resource', statusCode: 404 });
  await db.pool.query("UPDATE tawsel.command_identities SET response_body=NULL,response_status=NULL,compacted_at=clock_timestamp() WHERE action_id=$1", [refusal.actionId]);
  await expect(outcomes.result(f.principal, refusal.actionId)).rejects.toMatchObject({ code: 'forbidden_resource', statusCode: 404 });
  await expect(outcomes.command(f.principal, refusal)).rejects.toMatchObject({ code: 'forbidden_resource', statusCode: 404 });
  await provision(f, 'user.setBranchMemberships', { externalId: 'policy-driver', sourceRevision: 4, branchExternalIds: ['branch', 'branch-b'] });
  const recovered = await outcomes.result(f.principal, refusal.actionId);
  assert.ok('result' in recovered);
  expect(recovered.result).toMatchObject({ retention: 'compacted', summary: originalOutcome.summary });
  expect(await outcomes.command(f.principal, refusal)).toEqual(recovered.result);
});
test('duplicate relocation line IDs reject at public validation without mutation or outbox intent', async () => {
  const db2 = db, f2 = await companyPlanningFixture(db2);
  cleanup.push(() => f2.close());
  await adopt(f2);
  await provision(f2, 'branch.provision', { externalId: 'branch-b', sourceRevision: 1, name: 'B', enabled: true, location: null });
  const twoLines: S['B2bSourceSnapshot'] = { externalId: 'duplicate-lines', sourceDispatchCycleId: 'A-original', sourceRevision: 1, expectedSourceRevision: 0, sourceBranchExternalId: 'branch', recipientName: 'Audit', recipientPhone: '01012345678', destination: { kind: 'confirmed-pin', coordinates: { latitude: 30, longitude: 31 } }, splittingAllowed: true, allocation: 'exact-outstanding-per-unit', lines: [{ sourceLineId: 'one', description: 'One', quantity: 1, unitDue: money(10000) }, { sourceLineId: 'two', description: 'Two', quantity: 1, unitDue: money(10000) }], shippingDue: money(0), totalDue: money(20000), priority: 'ordinary' };
  const acceptedA = await f2.post('intake.submitSnapshot', twoLines), taskA = (acceptedA.json() as {response:{body:{tasks:S['B2bTask'][]}}}).response.body.tasks[0]!;
  const relocation = f2.source.command('dispatch.relocateBeforeDeparture', { externalId: twoLines.externalId, previousDispatchCycleId: taskA.dispatchCycleId, snapshot: { ...twoLines, sourceBranchExternalId: 'branch-b', sourceDispatchCycleId: 'B-duplicate', sourceRevision: 2, expectedSourceRevision: 1, lines: [twoLines.lines[0], twoLines.lines[0]] }, transfer: { sourceBranchExternalId: 'branch', transferId: randomUUID(), destinationReceiptId: randomUUID(), receivedAtDestination: true } });
  relocation.payloadVersion = '2.0.0';
  const response = await f2.app.inject({ method: 'POST', url: '/api/v1/intake/commands/dispatch.relocateBeforeDeparture', headers: { authorization: `Bearer ${f2.source.token}` }, payload: relocation });
  assert.equal(response.statusCode, 400);
  const status = await new B2bIntakeService(db2.pool).result(`Bearer ${f2.source.token}`, relocation.actionId);
  assert.equal(status.status, 'pending');
  const unchanged = await new B2bIntakeService(db2.pool).get(`Bearer ${f2.source.token}`, twoLines.externalId);
  assert.equal(unchanged.dispatchCycleId, taskA.dispatchCycleId);
  // Historical reproduction is preserved separately.
  assert.equal((await db.pool.query('SELECT count(*)::int n FROM tawsel.dispatch_transfer_assertions')).rows[0].n, 0);
  assert.equal((await db.pool.query("SELECT count(*)::int n FROM tawsel.outbox_intents WHERE event_type='dispatch.relocatedBeforeDeparture'")).rows[0].n, 0);
});
