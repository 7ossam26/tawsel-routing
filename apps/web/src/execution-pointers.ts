import type { LocalWork } from './local-work';

/** Old page guards are pointers, never receipt authority. Reconcile only this
 * installation/account after the durable IndexedDB acknowledgement exists. */
export async function reconcileExecutionPointers(store: LocalWork, scope: string, storage: Storage = sessionStorage) {
  const partition = await store.partitions.get(scope); if (!partition) return;
  const { tenantId, accountId, deviceId } = partition.identity;
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)!);
  for (const key of keys) {
    if (!/^tawsel:(delivery-pending|branch|options|correction|closure):/.test(key) || !key.includes(`:${tenantId}:${accountId}:`)) continue;
    let saved;
    try { saved = JSON.parse(storage.getItem(key)!); } catch { continue; }
    const command = saved?.pending ?? saved?.command;
    if (!command?.actionId || command.context?.tenantId !== tenantId || command.context?.accountId !== accountId || command.context?.deviceId !== deviceId) continue;
    const ack = await store.acknowledgements.get([scope, command.actionId]); if (!ack) continue;
    if (ack.result.receipt.businessStatus === 'accepted') storage.removeItem(key);
    else storage.setItem(key, JSON.stringify({ review: { command, result: ack.result } }));
  }
}
