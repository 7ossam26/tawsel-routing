import { useEffect, useState, type ReactNode } from 'react';
import { liveQuery } from 'dexie';
import { SessionClient } from '@tawsel/api-client/src/session';
import { localWork } from './local-work';
import { bindSession, recoveryInput } from './account-lifecycle';
import { deviceId } from './independent-tasks';
import { ActionButton, StatusNotice } from './components/ui';

/** Mount private screens only after validating this account. A durable local
 * selection change unmounts previous React state in every tab without a reload. */
export function AccountBoundary({ children }: { children: ReactNode }) {
  const requestedKind = new URLSearchParams(location.search).get('kind');
  const kind = requestedKind === 'company' || (requestedKind !== 'personal' && location.pathname.startsWith('/monitoring')) ? 'company' : 'personal';
  const [allowed, setAllowed] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0), [recoverable, setRecoverable] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false, running = false, bound: string | null = null;
    const check = async () => {
      if (running || disposed) return;
      running = true;
      try {
        if (navigator.onLine) bound = await bindSession(localWork, await new SessionClient().context(kind), deviceId());
        else {
          const partition = await localWork.active(kind, deviceId());
          if (!partition) throw new Error('لا يوجد عمل متاح لهذا الحساب على الهاتف. افتح حسابك عند عودة الاتصال.');
          bound = partition.scope;
        }
        if (!disposed) { setAllowed(true); setError(''); setRecoverable(false); }
      } catch (failure) {
        // Network failure may use an already selected download. A definite auth
        // denial must hide it; no other-account fallback is permitted.
        const code = failure instanceof Error && 'code' in failure ? String(failure.code) : '';
        if (failure instanceof TypeError) {
          const partition = await localWork.active(kind, deviceId());
          if (partition && !disposed) { bound = partition.scope; setAllowed(true); running = false; return; }
        }
        if (['session_expired', 'access_disabled', 'access_denied', 'same_account_required'].includes(code)) await localWork.blockSelected();
        if (!disposed) { setAllowed(false); setRecoverable(Boolean(await recoveryInput(localWork))); setError(code === 'access_disabled' || code === 'access_denied' ? 'الوصول موقوف. راجع مسؤول الشركة؛ الإجراءات باقية على الهاتف ولم تصل للخادم.' : failure instanceof Error && !(failure instanceof TypeError) ? failure.message : 'تعذر التحقق من الحساب. البيانات المحلية لم تُحذف.'); }
      } finally { running = false; }
    };
    const wake = () => { void check(); };
    const subscription = liveQuery(async () => {
      const selected = await localWork.selection.get('active');
      const partition = selected && await localWork.partitions.get(selected.scope);
      return { scope: selected?.scope, sealed: selected?.exiting || partition?.blocked };
    }).subscribe({ next: value => {
      if (bound && (value.scope !== bound || value.sealed)) { setAllowed(false); setError('تغيّر الحساب أو أُوقف الوصول في صفحة أخرى. افتح حسابك للمتابعة.'); }
    }, error: () => { setAllowed(false); setError('تعذر قراءة تخزين الهاتف. لم تُحذف الأدلة؛ أعد المحاولة.'); } });
    window.addEventListener('online', wake); window.addEventListener('focus', wake); window.addEventListener('pageshow', wake);
    document.addEventListener('visibilitychange', wake);
    // Revalidate online revocation while a screen remains open. Offline work
    // cannot learn server revocation until it reconnects.
    const timer = window.setInterval(() => { if (navigator.onLine && document.visibilityState === 'visible') wake(); }, 60000);
    void check();
    return () => { disposed = true; subscription.unsubscribe(); clearInterval(timer); window.removeEventListener('online', wake); window.removeEventListener('focus', wake); window.removeEventListener('pageshow', wake); document.removeEventListener('visibilitychange', wake); };
  }, [kind, retry]);
  if (allowed) return children;
  return <main className="account-shell" dir="rtl"><section className="account-card"><h1>استكمال العمل المحفوظ</h1><StatusNotice tone={error ? 'waiting' : 'info'} title={error ? 'بيانات الهاتف لم تُحذف' : 'جارٍ التحقق من الحساب'}>{error}</StatusNotice>
    {recoverable ? <ActionButton busy={busy} onClick={() => { setBusy(true); void recoveryInput(localWork).then(async input => { if (input) location.assign((await new SessionClient().begin(input)).authorizationUrl); }).catch(e => setError(e instanceof Error && !(e instanceof TypeError) ? e.message : 'تحتاج استعادة الدخول إلى اتصال.')).finally(() => setBusy(false)); }}>الدخول للحساب نفسه</ActionButton> : error ? <ActionButton onClick={() => setRetry(value => value + 1)}>إعادة المحاولة</ActionButton> : null}
    <a className="edit-link" href={'/account?kind=' + kind}>حسابي والمزامنة</a>
  </section></main>;
}
