import { useEffect, useState } from 'react';
import { ActionButton } from './components/ui';
import { localWork } from './local-work';
import { applySafeUpdate } from './safe-update';

export function UpdateNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let disposed = false, registered: ServiceWorkerRegistration | undefined;
    const inspect = () => { if (!disposed && registered?.waiting && navigator.serviceWorker.controller) setRegistration(registered); };
    const found = () => { registered?.installing?.addEventListener('statechange', inspect); inspect(); };
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(value => { registered = value; value.addEventListener('updatefound', found); found(); }).catch(() => { /* Shell remains usable; installation is not falsely reported. */ });
    return () => { disposed = true; registered?.removeEventListener('updatefound', found); };
  }, []);
  if (!registration) return null;
  const safePage = ['/account', '/local-work', '/sync'].includes(location.pathname);
  return <aside className="sync-notice" dir="rtl" aria-label="تحديث التطبيق"><strong>تحديث جاهز</strong><span> يمكنك إكمال عملك؛ التحديث ينتظر مزامنة الإجراءات.</span>{error ? <p role="alert">{error}</p> : null}
    {safePage ? <ActionButton variant="secondary" busy={busy} onClick={() => { setBusy(true); setError(''); void applySafeUpdate(localWork, registration).catch(e => setError(e instanceof Error ? e.message : 'تعذر التحديث؛ البيانات محفوظة.')).finally(() => setBusy(false)); }}>تحديث التطبيق الآن</ActionButton> : <a href={'/account' + location.search}>مراجعة التحديث في حسابي</a>}
  </aside>;
}
