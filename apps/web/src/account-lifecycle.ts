import type { components } from '@tawsel/api-client';
import { LocalWork, scopeKey, sessionScope } from './local-work.js';
import { withJournalLock } from './journal-lock.js';

type S = components['schemas'];
export async function bindSession(store: LocalWork, session: S['SessionContext'], device: string) {
  const selected = await store.selection.get('active');
  if (selected && selected.scope !== scopeKey(sessionScope(session, device))) {
    await store.blockSelected();
    throw Object.assign(new Error('الحساب المفتوح مختلف. عُد للحساب الذي حفظ العمل ثم سجّل الخروج لتغييره.'), { code: 'same_account_required' });
  }
  return store.select(session, device);
}

export async function recoveryInput(store: LocalWork): Promise<S['LoginRequest'] | null> {
  const selected = await store.selection.get('active'), partition = selected && await store.partitions.get(selected.scope);
  if (!partition || selected?.exiting) return null;
  return { kind: partition.identity.kind, reauthenticate: true, expectedAccount: { tenantId: partition.identity.tenantId, accountId: partition.identity.accountId } };
}

/** The journal lock drains in-flight replay. The persisted exiting selection
 * fences capture in every tab (even without Web Locks), including after a crash.
 * An unknown logout response leaves a retryable sealed selection, never a purge. */
export async function exitAccount(store: LocalWork, logout: () => Promise<unknown>, lock = withJournalLock) {
  const selected = await store.selection.get('active');
  // Early feedback also works in a browser without Web Locks. The transactional
  // check below remains authoritative against a concurrent capture.
  if (selected && (await store.unreceived(selected.scope)).length) throw new Error('يوجد عمل محفوظ على الهاتف ينتظر المزامنة. راجعه قبل الخروج أو تغيير الحساب.');
  return lock(selected?.scope ?? 'account-entry', async () => {
    const scope = await store.prepareExit();
    await logout();
    await store.finishExit(scope);
  });
}
