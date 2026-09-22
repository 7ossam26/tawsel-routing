import type { Transaction } from '../db/transaction.js';

// After command acquisition and before feature row locks. Use these guards even
// for an invariant whose row does not exist yet; constraints remain mandatory.
// Fixed order: driver -> workday -> assignment -> task, UUID lexical within kind.
const rank = { driver: 0, workday: 1, assignment: 2, task: 3 } as const;
export interface InvariantLock { kind: keyof typeof rank; id: string }

export async function lockInvariants(tx: Transaction, tenantId: string, locks: readonly InvariantLock[]): Promise<void> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(tenantId) || locks.some(lock => !Object.hasOwn(rank, lock.kind) || !uuid.test(lock.id))) {
    throw new Error('Invariant lock keys must be tenant/resource UUIDs and a known lock kind');
  }
  const ordered = locks.map(lock => ({ ...lock, id: lock.id.toLowerCase() }))
    .sort((a, b) => rank[a.kind] - rank[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const lock of ordered) {
    // Hash collisions only serialize unrelated work; they cannot grant access.
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 18005))', [JSON.stringify([tenantId.toLowerCase(), lock.kind, lock.id])]);
  }
}
