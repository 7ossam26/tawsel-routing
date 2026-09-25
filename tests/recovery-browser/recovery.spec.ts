import { expect, test, type Page, type BrowserContext } from '@playwright/test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const origin = 'http://localhost:5173', fixture = 'http://127.0.0.1:3029';
test.describe.configure({ mode: 'serial' });
type Info = { personalUser: string; companyUser: string; companyCode: string; password: string };
type Journal = { actions: Array<{ actionId: string; bytes: string }>; pending: unknown[]; acks: Array<{ actionId: string; result: { receipt: { businessStatus: string } } }> };
async function journal(page: Page): Promise<Journal> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, fail) => { const r = indexedDB.open('tawsel-local-work'); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
    try {
      const read = (name: string) => new Promise<unknown[]>((ok, fail) => { const r = db.transaction(name).objectStore(name).getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
      return { actions: await read('actions'), pending: await read('pending'), acks: await read('acknowledgements') } as Journal;
    } finally { db.close(); }
  });
}
async function credentials(page: Page, info: Info, kind: 'personal' | 'company') {
  await page.locator('#username').fill(kind === 'personal' ? info.personalUser : info.companyUser);
  await page.locator('#password').fill(info.password); await page.locator('#kc-login').click(); await page.waitForURL('**/account?kind=' + kind);
}
async function login(context: BrowserContext, info: Info, kind: 'personal' | 'company', start = true) {
  const page = await context.newPage(); await page.goto(kind === 'personal' ? '/login/independent' : '/login/company');
  if (kind === 'company') { await page.getByLabel('كود الشركة (مطلوب)').fill(info.companyCode); await page.getByRole('button', { name: 'متابعة', exact: true }).click(); }
  await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click(); await credentials(page, info, kind);
  if (start) { await page.goto('/prepare?kind=' + kind); await expect(page.getByText('خطة جاهزة')).toBeVisible(); await page.getByRole('button', { name: 'ابدأ الجولة', exact: true }).click(); }
  else await page.goto('/rounds/current?kind=' + kind);
  await expect(page.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible(); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(page.getByRole('button', { name: 'اتجه للعميل', exact: true })).toBeEnabled(); return page;
}
async function capture(context: BrowserContext, page: Page, checkDraft = false) {
  await context.setOffline(true); await page.getByRole('button', { name: 'اتجه للعميل', exact: true }).click();
  await page.getByRole('button', { name: 'وصلت', exact: true }).click();
  if (checkDraft) {
    await page.getByText('خيارات المهمة').click(); await page.getByRole('button', { name: 'تسليم بعض القطع' }).click();
    const input = page.getByRole('spinbutton').first(); await input.fill('1');
    await expect.poll(() => page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open('tawsel-local-work'); r.onsuccess = () => resolve(r.result); });
      try { return await new Promise<number>(resolve => { const r = db.transaction('drafts').objectStore('drafts').count(); r.onsuccess = () => resolve(r.result); }); } finally { db.close(); }
    })).toBe(1);
    await page.goto('/local-work?kind=company'); await page.goto('/rounds/current?kind=company');
    await page.getByText('خيارات المهمة').click(); await page.getByRole('button', { name: 'تسليم بعض القطع' }).click();
    await expect(page.getByRole('spinbutton').first()).toHaveValue('1');
    await page.screenshot({ path: 'output/playwright/phase-35-retained-input.png', fullPage: true });
    await page.getByRole('button', { name: 'إلغاء', exact: true }).click();
  }
  await page.getByRole('button', { name: /تأكيد التسليم/ }).click();
  await expect.poll(async () => (await journal(page)).pending.length).toBe(3);
}
const options = { headless: true, baseURL: origin, viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce' as const, serviceWorkers: 'allow' as const };
let originalWorker: string;
test.beforeAll(async () => { await mkdir('.local', { recursive: true }); originalWorker = await readFile('apps/web/dist/sw.js', 'utf8'); });
test.afterAll(async () => { if (originalWorker) await writeFile('apps/web/dist/sw.js', originalWorker); await writeFile('.local/phase-29-browser.stop', 'stop'); });

test('production PWA: offline process reopen, native aborted migration, pending update/logout gates and real same-account reauthentication', async ({ playwright, request }) => {
  const profile = await mkdtemp(resolve('.local/phase-35-browser-')), info = await (await request.get(fixture + '/__fixture/info')).json() as Info;
  let context = await playwright.chromium.launchPersistentContext(profile, options);
  try {
    let page = await login(context, info, 'personal'); await capture(context, page); const original = await journal(page);
    await context.close(); context = await playwright.chromium.launchPersistentContext(profile, options); await context.setOffline(true); page = await context.newPage();
    await page.goto('/rounds/current?kind=personal'); await expect(page.getByText('محفوظ على الهاتف', { exact: true })).toBeVisible(); expect((await journal(page)).actions).toEqual(original.actions);
    await context.route('**/api/v1/sync/actions*', route => route.abort('internetdisconnected')); await context.setOffline(false);
    const migration = await page.evaluate(async url => { const module = await import(url); return module.migrationProbe(); }, fixture + '/__fixture/migration-module');
    expect(migration.aborted).toBe(true); expect(migration.rolledBack).toBe(true); expect(migration.version).toBe(2);
    expect(migration.afterAbort).toEqual(migration.before); expect(migration.after).toEqual(migration.before); expect(migration.pendingAfter).toEqual(migration.pendingBefore); expect(migration.pendingAfter).toHaveLength(3); expect(migration.receiptsAfter).toEqual(migration.receiptsBefore);
    await writeFile('.local/phase-35-native-migration.json', JSON.stringify(migration, null, 2));
    await writeFile('apps/web/dist/sw.js', originalWorker + '\n// Phase 35 controlled release update probe\n');
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update()); await expect(page.getByLabel('تحديث التطبيق')).toBeVisible();
    await page.goto('/account?kind=personal'); await expect(page.getByRole('button', { name: 'تسجيل الخروج', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click(); await expect(page.getByText(/يوجد عمل محفوظ على الهاتف ينتظر المزامنة/)).toBeVisible();
    await page.getByRole('button', { name: 'تحديث التطبيق الآن' }).click(); await expect(page.getByText('التحديث ينتظر مزامنة العمل المحفوظ. عُد للمزامنة ثم حاول.')).toBeVisible();
    const genericBlocked = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready, c = new MessageChannel(); return new Promise(resolve => { c.port1.onmessage = e => { c.port1.close(); resolve(e.data); }; r.waiting!.postMessage({ type: 'SKIP_WAITING' }, [c.port2]); }); });
    expect(genericBlocked).toEqual({ ok: false, reason: 'explicit' });
    const workerBlocked = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready, c = new MessageChannel(); return new Promise(resolve => { c.port1.onmessage = e => { c.port1.close(); resolve(e.data); }; r.waiting!.postMessage({ type: 'TAWSEL_SAFE_UPDATE' }, [c.port2]); }); });
    expect(workerBlocked).toEqual({ ok: false, reason: 'pending' }); expect((await journal(page)).actions).toEqual(original.actions);
    await page.screenshot({ path: 'output/playwright/phase-35-pending-update.png', fullPage: true });
    await request.post(fixture + '/__fixture/expire'); await page.goto('/rounds/current?kind=personal');
    await expect(page.getByRole('button', { name: 'الدخول للحساب نفسه' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'المحطة الحالية' })).toHaveCount(0);
    await page.screenshot({ path: 'output/playwright/phase-35-expired-session.png', fullPage: true });
    await context.clearCookies({ name: '__Host-tawsel-personal' });
    await page.getByRole('button', { name: 'الدخول للحساب نفسه' }).click(); await credentials(page, info, 'personal');
    expect((await journal(page)).actions).toEqual(original.actions);
    await context.unroute('**/api/v1/sync/actions*'); await page.goto('/rounds/current?kind=personal');
    await expect.poll(async () => (await journal(page)).pending.length).toBe(0); await expect(page.getByText('تمت معالجة 1 من 2 وقفات')).toBeVisible();
    // OIDC navigation leaves no controlled app page, so the browser may naturally
    // activate the first worker. Offer a second real release while app tabs stay open.
    await writeFile('apps/web/dist/sw.js', originalWorker + '\n// Phase 35 second controlled release update probe\n');
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update()); await expect(page.getByLabel('تحديث التطبيق')).toBeVisible();
    const peer = await context.newPage(); await peer.goto('/rounds/current?kind=personal'); await expect(peer.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible();
    await page.goto('/account?kind=personal'); await page.getByRole('button', { name: 'تحديث التطبيق الآن' }).click(); await expect(page.getByText('أغلق صفحات توصيل الأخرى ثم حاول التحديث هنا.')).toBeVisible(); await peer.close();
    await Promise.all([page.waitForEvent('domcontentloaded'), page.getByRole('button', { name: 'تحديث التطبيق الآن' }).click()]); await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
    await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting))).toBe(false);
    expect((await journal(page)).actions).toEqual(original.actions);
    const stale = await context.newPage(); await stale.goto('/rounds/current?kind=personal'); await expect(stale.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible();
    await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click(); await page.waitForURL('**/login?kind=personal');
    await expect(stale.getByRole('heading', { name: 'المحطة الحالية' })).toHaveCount(0); await stale.close();
    await page.goto('/login/company'); await page.getByLabel('كود الشركة (مطلوب)').fill(info.companyCode); await page.getByRole('button', { name: 'متابعة', exact: true }).click(); await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click(); await credentials(page, info, 'company');
    await page.goto('/local-work?kind=company'); await expect(page.getByText('لا توجد إجراءات محلية لهذا الحساب.')).toBeVisible(); expect((await journal(page)).actions).toEqual(original.actions);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'output/playwright/phase-35-account-isolation.png', fullPage: true });
    await writeFile('.local/phase-35-recovery-browser.json', JSON.stringify({ evidenceClass: 'Actual production Workbox/Chromium/IndexedDB native upgrade abort/Web Locks; local Keycloak/Fastify/PostgreSQL. Controlled routing, expired DB session and blocked replay fixture. No physical-device/24-hour claim.', browser: context.browser()?.version(), migration, original, recovered: await journal(page), workerBlocked, state: await (await request.get(fixture + '/__fixture/state')).json() }, null, 2));
  } finally { await context.close(); }
});

test('server-retained former-phone review permits exit; a storage-empty phone recovers only the server state', async ({ browser, request }) => {
  const info = await (await request.get(fixture + '/__fixture/info')).json() as Info, first = await browser.newContext(options);
  let second: BrowserContext | undefined;
  try {
    const old = await login(first, info, 'company'); await capture(first, old, true); const original = await journal(old);
    second = await browser.newContext({ ...options, storageState: await first.storageState() });
    await second.addInitScript(() => localStorage.setItem('tawsel:device-id', '35000000-0000-4000-8000-000000000002'));
    const owner = await second.newPage(); await owner.goto('/rounds/current?kind=company');
    await expect(owner.getByText('تمت معالجة 0 من 1 وقفات')).toBeVisible(); expect((await journal(owner)).actions).toHaveLength(0);
    await owner.getByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' }).click(); await expect(owner.getByText(/اكتمل نقل التنفيذ وتحميل الحالة المؤكدة/)).toBeVisible();
    await first.setOffline(false); await old.goto('/local-work?kind=company'); await expect.poll(async () => (await journal(old)).acks.length).toBe(3);
    expect((await journal(old)).acks.every(a => a.result.receipt.businessStatus === 'review-required')).toBe(true);
    await old.goto('/account?kind=company'); await expect(old.getByText('وصل الدليل؛ يمكنك الخروج')).toBeVisible(); await old.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click(); await old.waitForURL('**/login?kind=company');
    // Separate reauthentication after the shared session is explicitly logged out.
    await owner.goto('/account?kind=company'); await owner.getByRole('button', { name: 'الدخول للحساب نفسه' }).click(); await credentials(owner, info, 'company');
    await owner.goto('/sync?kind=company'); await expect(owner.getByText('نتيجة تحتاج مراجعة', { exact: true })).toBeVisible();
    await owner.goto('/local-work?kind=company'); await owner.getByText('الهاتف والتخزين', { exact: true }).click(); await expect(owner.getByText(/عند فقد الهاتف أو مسح التخزين/)).toBeVisible();
    await owner.screenshot({ path: 'output/playwright/phase-35-storage-limits.png', fullPage: true });
    await owner.getByRole('link', { name: 'الأدلة التي استلمها الخادم' }).click(); await expect(owner.getByText('نتيجة تحتاج مراجعة', { exact: true })).toBeVisible();
    await owner.screenshot({ path: 'output/playwright/phase-35-retained-review.png', fullPage: true });
    const state = await (await request.get(fixture + '/__fixture/state')).json();
    expect(state.actions.filter((a: { action_id: string; business_status: string }) => original.actions.some(o => o.actionId === a.action_id)).every((a: { business_status: string }) => a.business_status === 'review-required')).toBe(true);
    const conflicts = await owner.evaluate(async () => (await fetch('/api/v1/sync/conflicts?kind=company&deviceId=' + localStorage.getItem('tawsel:device-id'))).json());
    await writeFile('.local/phase-35-retained-review.json', JSON.stringify({ evidenceClass: 'Real local services and separate Chromium contexts simulate phone/storage loss; unreceived work is absent from the second phone until server receipt. No reconstruction or physical-device claim.', original, retained: await journal(old), conflicts, state }, null, 2));
  } finally { await first.close(); await second?.close(); }
});
