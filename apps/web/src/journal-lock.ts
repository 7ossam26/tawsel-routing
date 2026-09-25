/** Same-origin tabs use the same installation/account lock. The browser releases
 * it on process/tab death. Never steal a live lock or expire it by client clock. */
export async function withJournalLock<T>(scope: string, work: () => Promise<T>): Promise<T> {
  if (!globalThis.navigator?.locks) throw new Error('هذا المتصفح لا يتيح تنسيق المزامنة بين الصفحات؛ افتح متصفحًا مدعومًا. الأدلة محفوظة.');
  return navigator.locks.request('tawsel:journal:' + scope, { signal: AbortSignal.timeout(30000) }, work);
}
