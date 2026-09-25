/** Browser-only test harness, bundled separately under .local and served solely
 * by the disposable fixture API. Uses actual production migrations/readers. */
import { Dexie } from 'dexie';
import { LocalWork } from '../apps/web/src/local-work.js';
import fixture from '../apps/web/test/fixtures/p34-local-v1.json' with { type: 'json' };

export async function migrationProbe() {
  const live = new LocalWork(), old = new Dexie('p35-native-upgrade-' + crypto.randomUUID());
  old.version(fixture.version).stores(fixture.stores);
  for (const name of Object.keys(fixture.stores)) await old.table(name).bulkPut(await live.table(name).toArray());
  const before = await old.table('actions').toArray(), pending = await old.table('pending').toArray(), receipts = await old.table('acknowledgements').toArray();
  old.close(); live.close();
  const interrupted = new LocalWork(old.name, tx => tx.abort());
  let aborted = false;
  try { await interrupted.open(); } catch { aborted = true; } finally { interrupted.close(); }
  const previous = new Dexie(old.name); previous.version(1).stores(fixture.stores); await previous.open();
  const rolledBack = previous.verno === 1 && !previous.tables.some(t => t.name === 'drafts') && !await previous.table('health').get('local-schema');
  const afterAbort = await previous.table('actions').toArray(); previous.close();
  const upgraded = new LocalWork(old.name); await upgraded.open();
  const result = { fixture: fixture.label, aborted, rolledBack, before, afterAbort, pendingBefore: pending, receiptsBefore: receipts, version: upgraded.verno, after: await upgraded.actions.toArray(), pendingAfter: await upgraded.pending.toArray(), receiptsAfter: await upgraded.acknowledgements.toArray() };
  // Native transactions already committed/aborted. Only this disposable clone is removed.
  await upgraded.delete(); return result;
}
