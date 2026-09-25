import { localWork, type LocalWork } from './local-work.js';

async function scopeFor(store: LocalWork, key: string) {
  const selection = await store.selection.get('active');
  if (!selection) return null;
  const partition = await store.assertSelected(selection.scope);
  if (!key.startsWith(`tawsel:exception:${partition.identity.tenantId}:${partition.identity.accountId}:`)) throw new Error('المسودة تخص حسابًا آخر.');
  return partition.scope;
}
export async function loadLocalDraft<T>(key: string, store = localWork): Promise<T | null> {
  return store.transaction('r', [store.selection, store.partitions, store.drafts], async () => {
    const scope = await scopeFor(store, key);
    return scope ? (await store.drafts.get([scope, key]))?.value as T ?? null : null;
  });
}
export async function saveLocalDraft(key: string, value: unknown, store = localWork) {
  await store.transaction('rw', [store.selection, store.partitions, store.drafts], async () => {
    const scope = await scopeFor(store, key);
    if (scope) await store.drafts.put({ scope, key, value, savedAt: new Date().toISOString() });
  });
}
