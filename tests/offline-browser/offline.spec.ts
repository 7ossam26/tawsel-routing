import { expect, test, type Page } from '@playwright/test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = 'http://localhost:5173', fixture = 'http://127.0.0.1:3029';
async function journal(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, fail) => { const request = indexedDB.open('tawsel-local-work'); request.onsuccess = () => ok(request.result); request.onerror = () => fail(request.error); });
    try {
      const read = (name: string) => new Promise<unknown[]>((ok, fail) => { const request = db.transaction(name).objectStore(name).getAll(); request.onsuccess = () => ok(request.result); request.onerror = () => fail(request.error); });
      return { actions: await read('actions'), pending: await read('pending'), downloads: await read('downloads'), acks: await read('acknowledgements') };
    } finally { db.close(); }
  });
}
test.afterAll(async () => { await writeFile('.local/phase-29-browser.stop', 'stop'); });
test('built PWA survives offline browser process restart, retains atomic evidence and keeps unsent work out of server monitoring', async ({ playwright, request }) => {
  await mkdir('.local', { recursive: true }); const profile = await mkdtemp(resolve('.local/phase-33-browser-'));
  const info = await (await request.get(fixture + '/__fixture/info')).json();
  const options = { headless: true, baseURL: origin, viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce' as const, serviceWorkers: 'allow' as const };
  let context = await playwright.chromium.launchPersistentContext(profile, options);
  try {
    let page = await context.newPage();
    await page.goto('/login/independent'); await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
    await page.locator('#username').fill(info.personalUser); await page.locator('#password').fill(info.password); await page.locator('#kc-login').click();
    await page.goto('/prepare?kind=personal'); await expect(page.getByText('خطة جاهزة')).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready); await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true); await page.reload(); await expect(page.getByRole('button', { name: 'ابدأ الجولة', exact: true })).toBeDisabled();
    await page.goto('/rounds/current?kind=personal'); await expect(page.getByText(/لا توجد جولة مبدوءة منزّلة/)).toBeVisible();
    expect((await (await request.get(fixture + '/__fixture/state')).json()).rounds).toHaveLength(0);
    await context.setOffline(false); await page.goto('/prepare?kind=personal'); await page.getByRole('button', { name: 'ابدأ الجولة', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible(); await expect(page.getByText(/الجولة منزّلة/)).toBeVisible();
    const initial = await journal(page); expect(initial.downloads).toHaveLength(1);
    expect(initial.downloads[0]).toMatchObject({ format: 1, road: { geometrySource: 'osrm-road' }, current: { revision: 0 } });
    const serverBefore = await (await request.get(fixture + '/__fixture/state')).json();
    await context.setOffline(true); await page.getByRole('button', { name: 'اتجه للعميل', exact: true }).click();
    await expect(page.getByText('محفوظ على الهاتف', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'وصلت', exact: true }).click();
    await expect(page.getByRole('button', { name: /تأكيد التسليم/ })).toBeVisible();
    // Real Chromium IndexedDB abort, injected after the first object-store write.
    await page.evaluate(() => { const original = IDBObjectStore.prototype.add; const state = window as typeof window & { restoreAdd?: () => void }; state.restoreAdd = () => { IDBObjectStore.prototype.add = original; }; IDBObjectStore.prototype.add = function (...args) { const result = original.apply(this, args); if (this.name === 'pending') this.transaction.abort(); return result; }; });
    await page.getByRole('button', { name: /تأكيد التسليم/ }).click(); await expect(page.getByText(/لم يُحفظ على الهاتف/)).toBeVisible();
    const aborted = await journal(page); expect(aborted.actions).toHaveLength(2); expect(aborted.pending).toHaveLength(2);
    await page.evaluate(() => (window as typeof window & { restoreAdd?: () => void }).restoreAdd?.());
    await page.getByRole('button', { name: /تأكيد التسليم/ }).click();
    await expect.poll(async () => (await journal(page)).actions.length).toBe(3);
    await expect(page.getByText('مسار الطريق المنزّل — دون خريطة أساس')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'output/playwright/phase-33-offline-mobile.png', fullPage: true });
    const saved = await journal(page); const serialized = JSON.stringify(saved.actions);
    const afterLocal = await (await request.get(fixture + '/__fixture/state')).json(); expect(afterLocal.actions).toEqual(serverBefore.actions); expect(afterLocal.outcomes).toEqual(serverBefore.outcomes);
    await context.close();
    context = await playwright.chromium.launchPersistentContext(profile, options); await context.setOffline(true); page = await context.newPage();
    await page.goto('/rounds/current?kind=personal'); await expect(page.getByText('محفوظ على الهاتف', { exact: true })).toBeVisible();
    expect(JSON.stringify((await journal(page)).actions)).toBe(serialized);
    await page.getByRole('link', { name: 'مراجعة الإجراءات المحفوظة' }).click(); await expect(page.getByRole('heading', { name: 'محفوظ على الهاتف — لم يتأكد وصوله للخادم' })).toHaveCount(3);
    await page.getByText('تفاصيل التشخيص').first().click(); await page.screenshot({ path: 'output/playwright/phase-33-reopened-evidence.png', fullPage: true });
    // Same account reconnect reads only; no automatic replay is implemented here.
    await context.setOffline(false); const monitor = await page.evaluate(async driver => { const response = await fetch('/api/v1/monitoring/drivers/' + driver + '?kind=personal'); if (!response.ok) throw new Error('monitor read: ' + response.status); return response.json(); }, info.personalDriverId);
    for (const action of saved.actions as Array<{ actionId: string }>) expect(JSON.stringify(monitor)).not.toContain(action.actionId);
    await page.goto('/account?kind=personal'); await page.getByRole('button', { name: 'تسجيل الخروج' }).click(); await expect(page.getByText(/يوجد عمل محفوظ على الهاتف ينتظر المزامنة/)).toBeVisible();
    await page.screenshot({ path: 'output/playwright/phase-33-account-guard.png', fullPage: true });
    const cacheUrls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(item => item.url)))).flat());
    expect(cacheUrls.some(url => /\/api\/|\/maps\//.test(url))).toBe(false); expect(cacheUrls.some(url => url.includes('.woff2'))).toBe(true);
    await writeFile('.local/phase-33-browser-evidence.json', JSON.stringify({ evidenceClass: 'Actual Chromium production Workbox/IndexedDB, browser process restart, local Keycloak/Fastify/PostgreSQL; labelled OSRM/VROOM HTTP fixtures. No physical device or 24-hour claim.', profile, browser: context.browser()?.version(), actions: saved.actions, pending: saved.pending, confirmedRevision: (saved.downloads[0] as { current: { revision: number } }).current.revision, serverBefore, afterLocal, monitor, cacheUrls }, null, 2));
  } finally { await context.close(); }
});
