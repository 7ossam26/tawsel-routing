import { SyncClient } from '@tawsel/api-client/src/sync';
import { DevicesClient } from '@tawsel/api-client/src/devices';
import { localWork } from './local-work';
import { ReplayCoordinator } from './replay';
import { downloadWork } from './download-work';
import { deviceId } from './independent-tasks';
import { reconcileExecutionPointers } from './execution-pointers';

export function replayErrorMessage(error: unknown) {
  return error instanceof Error && !(error instanceof TypeError) && !['AbortError', 'TimeoutError'].includes(error.name)
    ? error.message : 'تعذر تأكيد المزامنة؛ الإجراءات محفوظة على الهاتف. أعد المحاولة عند عودة الاتصال.';
}

export function replayCoordinator(kind: 'company' | 'personal') {
  const client = new SyncClient(kind), devices = new DevicesClient(kind);
  return new ReplayCoordinator(localWork, {
    session: () => client.session(), submit: actions => client.submit(actions), result: id => devices.result(id),
    async refresh(scope) {
      await reconcileExecutionPointers(localWork, scope);
      const rounds = new Set((await localWork.pending.where('scope').equals(scope).toArray()).map(item => item.roundId));
      for (const roundId of rounds) {
        if (!roundId) continue;
        const snapshot = await devices.snapshot(roundId, deviceId());
        if (snapshot.context.roundState === 'ended' || snapshot.context.mode !== 'owner') await localWork.retireConfirmedRound(scope, roundId);
      }
      // An old owner must lose its downloaded execution authority even when all
      // rejected overlays were already retired by acknowledgements.
      for (const saved of await localWork.downloads.where('scope').equals(scope).toArray()) {
        const snapshot = await devices.snapshot(saved.roundId, deviceId());
        if (snapshot.context.roundState === 'ended' || snapshot.context.mode !== 'owner') await localWork.retireConfirmedRound(scope, saved.roundId);
      }
      const active = await localWork.downloaded(kind, deviceId());
      if (active) await downloadWork(kind);
    }
  });
}
export async function replaySelected(kind: 'company' | 'personal') {
  if (!navigator.onLine) throw new Error('المزامنة تحتاج اتصالًا؛ الإجراءات محفوظة على الهاتف.');
  const selection = await localWork.selection.get('active'), partition = selection && await localWork.partitions.get(selection.scope);
  if (!partition || partition.identity.kind !== kind || partition.identity.deviceId !== deviceId()) return null;
  const result = await replayCoordinator(kind).run(partition.scope);
  return result;
}
