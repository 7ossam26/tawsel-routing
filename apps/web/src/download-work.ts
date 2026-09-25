import type { components } from '@tawsel/api-client';
import { DevicesClient } from '@tawsel/api-client/src/devices';
import { OutcomesClient } from '@tawsel/api-client/src/outcomes';
import { PlanningClient } from '@tawsel/api-client/src/planning';
import { RoundsClient } from '@tawsel/api-client/src/rounds';
import { localWork, type Download } from './local-work';
import { api, deviceId } from './independent-tasks';

/** Every response is authorized; bracket mutable reads with the server's
 * locked owner/current snapshot. Never turn a stored draft into a started round. */
export async function downloadWork(kind: 'personal' | 'company'): Promise<Download | null> {
  if (!navigator.onLine) throw new Error('تنزيل العمل لأول مرة يحتاج اتصالًا.');
  const session = await api(`/api/session/context?kind=${kind}`) as components['schemas']['SessionContext'];
  const scope = await localWork.select(session, deviceId());
  const round = (await new RoundsClient(kind).current()).round;
  if (!round) {
    await localWork.downloads.where('scope').equals(scope).delete();
    return null;
  }
  const client = new DevicesClient(kind), before = await client.snapshot(round.roundId, deviceId());
  if (!before.current || before.context.mode !== 'owner' || before.context.roundState !== 'active') {
    // Known takeover must immediately revoke old offline execution, retaining evidence.
    await localWork.downloads.where('scope').equals(scope).delete();
    throw new Error('هذا الهاتف لا يملك الجولة النشطة؛ افتح الحالة المتصلة.');
  }
  const outcomes = await new OutcomesClient(kind).read(round.roundId);
  const plans = await new PlanningClient(kind).plans(before.current.driverId, 50);
  const plan = plans.items.find(item => item.planId === before.current!.planning.planId) ?? null;
  const after = await client.snapshot(round.roundId, deviceId());
  const finalSession = await api(`/api/session/context?kind=${kind}`) as components['schemas']['SessionContext'];
  if (JSON.stringify(before.current) !== JSON.stringify(after.current) || JSON.stringify(before.context) !== JSON.stringify(after.context) ||
      JSON.stringify(session.access) !== JSON.stringify(finalSession.access)) throw new Error('تغيّرت الجولة أثناء التنزيل؛ حدّثها مرة أخرى.');
  const value: Download = { format: 1, scope, roundId: round.roundId, downloadedAt: new Date().toISOString(), session, ownership: after.context, snapshotToken: after.snapshotToken, current: after.current!, outcomes, plan, road: plan?.routePolicy?.roadRoute ?? null };
  await localWork.saveDownload(value);
  return value;
}
