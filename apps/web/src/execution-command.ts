import { useEffect, useRef, useState } from 'react';
import type { components } from '@tawsel/api-client';
import { api, deviceId } from './independent-tasks';
import { localWork, type LocalEnvelope } from './local-work';
import { DevicesClient } from '@tawsel/api-client/src/devices';

export async function confirmedExecutionOwner(kind: 'personal' | 'company', roundId: string) {
  const client = new DevicesClient(kind), owner = await client.context(roundId, deviceId());
  if (owner.mode === 'owner' && owner.snapshotRequired) {
    const confirmed = await client.snapshot(roundId, deviceId());
    if (!confirmed.snapshotToken) throw new Error('تعذر تحميل الحالة المؤكدة لهذا الهاتف.');
    sessionStorage.setItem(`tawsel:owner-snapshot:${roundId}:${deviceId()}`, confirmed.snapshotToken);
  }
  return owner;
}

export function executionEnvelope(context: components['schemas']['SessionContext'], roundId: string, generation: number) {
  const token = sessionStorage.getItem(`tawsel:owner-snapshot:${roundId}:${deviceId()}`);
  return { schemaVersion: '1.0.0' as const, payloadVersion: '1.0.0' as const, actionId: crypto.randomUUID(), context: { kind: 'device' as const, tenantId: context.access.tenantId, accountId: context.access.sourceId, deviceId: deviceId(), deviceGeneration: generation, deviceSequence: 1, ...(token ? { snapshotToken: token } : {}) }, resources: { tripId: roundId }, baseVersions: {}, dependsOnActionIds: [], observation: { observedAt: new Date().toISOString(), clock: { quality: 'uncertain' as const } } };
}
type ReceiptResult = components['schemas']['ActionResult'];
type Status<R> = { status: string; result?: R };

/** In-tab online uncertainty only, not a durable/offline queue. Do not close a
 * day or start a branch transition over an unresolved command on another page. */
export function pendingExecutionLinks(session: components['schemas']['SessionContext'], excludeKey: string) {
  const result: { id: string; href: string }[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)!;
    if (key === excludeKey || !/^tawsel:(delivery-pending|branch|options|correction|closure):/.test(key) || !key.includes(`:${session.access.tenantId}:${session.access.sourceId}:`)) continue;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key)!);
      const command = saved.pending ?? saved.command;
      if (!command?.actionId || command.context?.tenantId !== session.access.tenantId || command.context?.accountId !== session.access.sourceId || command.context?.deviceId !== deviceId()) continue;
      const query = new URLSearchParams({ kind: session.kind, ...(command.payload?.roundId ? { roundId: command.payload.roundId } : {}), ...(command.payload?.taskId ? { taskId: command.payload.taskId } : {}), ...(command.payload?.attemptId ? { attemptId: command.payload.attemptId } : {}), ...(command.payload?.workdayId ? { workdayId: command.payload.workdayId } : {}) });
      const path = key.startsWith('tawsel:branch:') ? '/execution/branch' : key.startsWith('tawsel:options:') ? '/execution/options' : key.startsWith('tawsel:correction:') ? '/execution/correction' : key.startsWith('tawsel:closure:') ? '/execution/closure' : '/rounds/current';
      result.push({ id: command.actionId, href: `${path}?${query}` });
    } catch { result.push({ id: key, href: `/rounds/current?kind=${session.kind}` }); }
  }
  return result;
}

/** Keep an uncertain request byte-for-byte. Terminal review stays inspectable
 * in the session and on the server; no automatic retry-as-new or false success. */
export function useExecutionCommand<C extends LocalEnvelope, R extends ReceiptResult>(key: string, send: (command: C) => Promise<R>, result: (id: string, command: C) => Promise<Status<R>>) {
  const [pending, setPending] = useState<C | null>(null), [review, setReview] = useState<{ command: C; result: R } | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const inFlight = useRef(false);
  useEffect(() => {
    if (!key) return; let active = true;
    try { const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null'); setPending(saved?.pending ?? null); setReview(saved?.review ?? null); } catch { setMessage('تعذر قراءة الطلب المحفوظ؛ راجع المزامنة.'); }
    void (async () => {
      const selected = await localWork.selection.get('active'); if (!selected) return;
      const partition = await localWork.partitions.get(selected.scope);
      if (!partition || !key.includes(':' + partition.identity.tenantId + ':' + partition.identity.accountId + ':')) return;
      const effects = await localWork.pendingFor(partition.scope);
      const first = effects.find(effect => effect.href.split('?')[0] === location.pathname);
      const action = first && await localWork.actions.get([partition.scope, first.actionId]);
      if (active && action) setPending(action.envelope as C);
    })().catch(() => { if (active) setMessage('تعذر قراءة الطلب المحفوظ؛ راجع تخزين الهاتف.'); });
    return () => { active = false; };
  }, [key]);
  async function settle(scope: string, command: C, value: R) {
    await localWork.acknowledge(scope, value);
    setPending(null);
    if (value.receipt.businessStatus === 'accepted') { sessionStorage.removeItem(key); setReview(null); setMessage('تم تأكيد التغيير من الخادم.'); return true; }
    const retained = { command, result: value }; setReview(retained); sessionStorage.setItem(key, JSON.stringify({ review: retained })); setMessage(value.receipt.problem?.detail ?? 'لم يُقبل التغيير؛ الدليل محفوظ للمراجعة.'); return false;
  }
  async function execute(command?: C) {
    if (inFlight.current || !key) return false; const exact = pending ?? command; if (!exact) return false;
    inFlight.current = true; setBusy(true); setMessage(''); let saved = false;
    try {
      if (!navigator.onLine) throw new Error('هذا الإجراء يحتاج اتصالًا؛ استكمال المحطات المنزّلة متاح من الجولة.');
      const kind = new URLSearchParams(location.search).get('kind') === 'company' ? 'company' : 'personal';
      const session = await api('/api/session/context?kind=' + kind) as components['schemas']['SessionContext'];
      const scope = await localWork.select(session, deviceId());
      const captured = await localWork.capture(scope, exact, location.pathname + location.search, false, Boolean(pending));
      const durable = captured.envelope as C; saved = true; setPending(durable);
      // SessionStorage remains only a compatibility pointer for older page guards.
      try { sessionStorage.setItem(key, JSON.stringify({ pending: durable, review })); } catch { /* IndexedDB is the durable record */ }
      if (pending) { const known = await result(durable.actionId, durable); if (known.status !== 'pending' && known.result) return await settle(scope, durable, known.result); }
      return await settle(scope, durable, await send(durable));
    } catch (error) { setMessage(saved ? 'محفوظ على الهاتف؛ تعذر تأكيد نتيجة الخادم. تحقّق من الطلب نفسه.' : 'لم يُحفظ على الهاتف. ' + (error instanceof Error ? error.message : 'المدخلات لم تُحذف.')); return false; }
    finally { inFlight.current = false; setBusy(false); }
  }
  return { pending, review, busy, message, execute };
}
