import type { Dexie, Transaction } from 'dexie';

/** Released P33/P34 schema. Retained verbatim for upgrade and rollback tests. */
export const localSchemaV1 = {
  partitions: '&scope', selection: '&id', downloads: '&[scope+roundId],scope',
  actions: '&[scope+actionId],&[scope+sequence],scope,[scope+roundId]',
  pending: '&[scope+actionId],scope,[scope+roundId]',
  acknowledgements: '&[scope+actionId],scope', counters: '&scope', health: '&id'
};
export const localSchemaVersion = 2;
export function installLocalSchema(db: Dexie, afterUpgrade?: (tx: Transaction) => void | Promise<void>) {
  db.version(1).stores(localSchemaV1);
  // Additive only. Envelope bytes, IDs, clock metadata, receipts and projections
  // keep their original representation. All upgrade writes commit together.
  db.version(2).stores({ drafts: '&[scope+key],scope' }).upgrade(async tx => {
    await tx.table('health').put({ id: 'local-schema', value: '2' });
    await afterUpgrade?.(tx);
  });
}
