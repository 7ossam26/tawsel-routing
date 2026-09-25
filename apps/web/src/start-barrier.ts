import { localWork, scopeKey, sessionScope, storageReadiness } from './local-work';
import { replayCoordinator } from './replay-runtime';
import { SyncClient } from '@tawsel/api-client/src/sync';
import { deviceId } from './independent-tasks';

/** Capture takes this same lock. Hold it through fresh readiness and the actual
 * start response, so another tab cannot insert work in the checked-empty gap. */
export async function synchronizedStart<T>(kind: 'personal' | 'company', work: (acceptedActionIds: string[]) => Promise<T>): Promise<T> {
  if (!navigator.onLine) throw new Error('بدء جولة جديدة يحتاج اتصالًا وقبول الخادم.');
  const session = await new SyncClient(kind).session(), scope = scopeKey(sessionScope(session, deviceId()));
  await localWork.select(session, deviceId());
  await storageReadiness();
  return replayCoordinator(kind).beforeStart(scope, work);
}
