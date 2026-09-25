/* Production worker gate. No API responses or credentials are cached here. */
self.addEventListener('message', event => {
  // generateSW includes a generic SKIP_WAITING listener. This earlier imported
  // listener disables that unguarded route; only our checked request may activate.
  if (event.data?.type === 'SKIP_WAITING') {
    event.stopImmediatePropagation(); event.ports[0]?.postMessage({ ok: false, reason: 'explicit' }); return;
  }
  if (event.data?.type !== 'TAWSEL_SAFE_UPDATE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const reply = value => event.ports[0].postMessage(value);
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (tabs.length !== 1 || tabs[0].id !== event.source?.id) { reply({ ok: false, reason: 'tabs' }); return; }
    let db;
    try {
      db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('tawsel-local-work');
        request.onupgradeneeded = () => { request.transaction.abort(); reject(Error('Missing journal')); };
        request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
      });
      const safe = await new Promise((resolve, reject) => {
        const tx = db.transaction(['actions', 'pending', 'acknowledgements', 'selection'], 'readonly');
        const actions = tx.objectStore('actions').getAll(), pending = tx.objectStore('pending').count(), acks = tx.objectStore('acknowledgements').getAll(), selection = tx.objectStore('selection').get('active');
        tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => {
          const received = new Set(acks.result.filter(a => a.result.receipt.evidenceStatus === 'received').map(a => JSON.stringify([a.scope, a.actionId])));
          resolve(!pending.result && !selection.result?.exiting && actions.result.every(a => received.has(JSON.stringify([a.scope, a.actionId]))));
        };
      });
      if (!safe) { reply({ ok: false, reason: 'pending' }); return; }
      await self.skipWaiting(); reply({ ok: true });
    } catch { reply({ ok: false, reason: 'storage' }); }
    finally { db?.close(); }
  })());
});
