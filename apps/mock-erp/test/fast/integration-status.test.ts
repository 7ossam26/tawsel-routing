import { describe, expect, it } from 'vitest';
import type { components } from '@tawsel/api-client';
import { applicationState } from '../../ui/integration-status.js';
type Status = components['schemas']['ConsumerStatus'];
function status(values: Partial<Status['checkpoint']>): Status {
  return { checkpoint: { schemaVersion: '1.0.0', tenantId: '10000000-0000-4000-8000-000000000001', recipientIntegrationId: '10000000-0000-4000-8000-000000000002', aggregate: { type: 'task', id: '10000000-0000-4000-8000-000000000003' }, revision: 1, receivedThrough: 0, receivedHigh: 0, appliedThrough: 0, projectedThrough: 0, snapshotThrough: 0, historyComplete: true, receivedAt: null, appliedAt: null, pendingCount: 0, lastError: null, ...values }, state: null };
}
describe('ERP receipt/application status copy', () => {
  it('keeps durable receipt distinct from application', () => expect(applicationState(status({ receivedThrough: 2, receivedHigh: 2, appliedThrough: 1, pendingCount: 1 }))).toBe('received'));
  it('reports application only after the checkpoint advances', () => expect(applicationState(status({ receivedThrough: 2, receivedHigh: 2, appliedThrough: 2 }))).toBe('applied'));
  it('surfaces projection failure instead of relabelling it accepted', () => expect(applicationState(status({ receivedThrough: 2, receivedHigh: 2, appliedThrough: 1, pendingCount: 1, lastError: 'projection_failed' }))).toBe('failed'));
});
