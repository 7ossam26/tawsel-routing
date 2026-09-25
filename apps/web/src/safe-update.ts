import type { LocalWork } from './local-work.js';

export async function assertUpdateSafe(store: LocalWork) {
  await store.transaction('r', [store.actions, store.pending, store.acknowledgements, store.selection], async () => {
    if (await store.pending.count() || (await store.unreceived()).length) throw new Error('التحديث ينتظر مزامنة العمل المحفوظ. عُد للمزامنة ثم حاول.');
    if ((await store.selection.get('active'))?.exiting) throw new Error('أكمل تسجيل الخروج أولًا ثم حدّث التطبيق.');
  });
}

/** Explicit user action, one tab, no pending work. The lifecycle lock excludes
 * capture/replay/start/logout until worker activation and this page navigation. */
export async function applySafeUpdate(store: LocalWork, registration: ServiceWorkerRegistration) {
  if (!navigator.locks) throw new Error('أغلق صفحات التطبيق وافتحه مجددًا لتحديث آمن؛ البيانات محفوظة.');
  await navigator.locks.request('tawsel:lifecycle', { signal: AbortSignal.timeout(30000) }, async () => {
    await assertUpdateSafe(store);
    const worker = registration.waiting;
    if (!worker) throw new Error('لا يوجد تحديث ينتظر التثبيت.');
    const channel = new MessageChannel();
    try {
      const response = await new Promise<{ ok: boolean; reason?: string }>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('تعذر تأكيد التحديث. احتفظ بالصفحة وأعد المحاولة.')), 15000);
        channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data); };
        worker.postMessage({ type: 'TAWSEL_SAFE_UPDATE' }, [channel.port2]);
      });
      if (!response.ok) throw new Error(response.reason === 'tabs' ? 'أغلق صفحات توصيل الأخرى ثم حاول التحديث هنا.' : 'التحديث ينتظر مزامنة العمل أو إكمال الخروج؛ البيانات محفوظة.');
      if (worker.state !== 'activated') await new Promise<void>((resolve, reject) => {
        const done = () => { if (worker.state === 'activated') { clearTimeout(timer); worker.removeEventListener('statechange', done); resolve(); } };
        const timer = setTimeout(() => { worker.removeEventListener('statechange', done); reject(new Error('التحديث لم يكتمل بعد. أغلق التطبيق وافتحه حين يناسبك.')); }, 15000);
        worker.addEventListener('statechange', done); done();
      });
      await assertUpdateSafe(store);
      window.location.reload();
    } finally { channel.port1.close(); channel.port2.close(); }
  });
}
