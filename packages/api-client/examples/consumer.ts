import type { components, paths } from '@tawsel/api-client';

// A portable public consumer needs no application/domain/database imports.
export const collection: components['schemas']['Money'] = {
  amountMinor: 25000,
  currency: 'EGP',
  exponent: 2
};

export const source: components['schemas']['SourceReference'] = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  integrationId: '10000000-0000-4000-8000-000000000002',
  externalId: 'shipment-001'
};

// There are no published business paths in the foundation.
export const availablePaths: paths = {};

// P05 defines the recovery shape; there is still no available HTTP method.
// A compacted response requires later scoped reconciliation, never a new ID.
export function recoveryState(result: components['schemas']['ActionResult']) {
  return result.retention === 'compacted'
    ? { actionId: result.receipt.actionId, summary: result.summary, next: 'reconcile-existing-record' as const }
    : { actionId: result.receipt.actionId, response: result.response, next: 'use-durable-response' as const };
}
