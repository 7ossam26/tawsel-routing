import { useEffect, useRef, useState } from 'react';
import type { components } from '@tawsel/api-client';
import { deviceId, nextSequence } from './independent-tasks';
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
  return { schemaVersion: '1.0.0' as const, payloadVersion: '1.0.0' as const, actionId: crypto.randomUUID(), context: { kind: 'device' as const, tenantId: context.access.tenantId, accountId: context.access.sourceId, deviceId: deviceId(), deviceGeneration: generation, deviceSequence: nextSequence(), ...(token ? { snapshotToken: token } : {}) }, resources: { tripId: roundId }, baseVersions: {}, dependsOnActionIds: [], observation: { observedAt: new Date().toISOString(), clock: { quality: 'uncertain' as const } } };
}
type ReceiptResult = { receipt: { businessStatus: string; problem?: { detail?: string } } };
type Status<R> = { status: string; result?: R };

/** Keep an uncertain request byte-for-byte. Terminal review stays inspectable
 * in the session and on the server; no automatic retry-as-new or false success. */
export function useExecutionCommand<C extends { actionId: string }, R extends ReceiptResult>(key: string, send: (command: C) => Promise<R>, result: (id: string) => Promise<Status<R>>) {
  const [pending, setPending] = useState<C | null>(null), [review, setReview] = useState<{ command: C; result: R } | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const inFlight = useRef(false);
  useEffect(() => { if (!key) return; try { const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null'); setPending(saved?.pending ?? null); setReview(saved?.review ?? null); } catch { setMessage('تعذر قراءة الطلب المحفوظ؛ راجع المزامنة.'); } }, [key]);
  function settle(command: C, value: R) {
    setPending(null);
    if (value.receipt.businessStatus === 'accepted') { sessionStorage.removeItem(key); setReview(null); setMessage('تم تأكيد التغيير من الخادم.'); return true; }
    const retained = { command, result: value }; setReview(retained); sessionStorage.setItem(key, JSON.stringify({ review: retained })); setMessage(value.receipt.problem?.detail ?? 'لم يُقبل التغيير؛ الدليل محفوظ للمراجعة.'); return false;
  }
  async function execute(command?: C) {
    if (inFlight.current || !key) return false; const exact = pending ?? command; if (!exact) return false;
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      sessionStorage.setItem(key, JSON.stringify({ pending: exact, review })); setPending(exact);
      if (pending) { const known = await result(exact.actionId); if (known.status !== 'pending' && known.result) return settle(exact, known.result); }
      return settle(exact, await send(exact));
    } catch (error) { setMessage(error instanceof Error ? `${error.message} — الطلب محفوظ حتى التحقق من نتيجته.` : 'تعذر التحقق؛ الطلب محفوظ بنفس المعرّف.'); return false; }
    finally { inFlight.current = false; setBusy(false); }
  }
  return { pending, review, busy, message, execute };
}
