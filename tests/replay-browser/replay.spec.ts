import { expect, test, type Page, type BrowserContext } from '@playwright/test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const origin = 'http://localhost:5173', fixture = 'http://127.0.0.1:3029';
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
async function login(context: BrowserContext, info: Info, kind: 'personal' | 'company') {
  const page = await context.newPage(); await page.goto(kind === 'personal' ? '/login/independent' : '/login/company');
  if (kind === 'company') { await page.getByLabel('كود الشركة (مطلوب)').fill(info.companyCode); await page.getByRole('button', { name: 'متابعة', exact: true }).click(); }
  await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await page.locator('#username').fill(kind === 'personal' ? info.personalUser : info.companyUser); await page.locator('#password').fill(info.password); await page.locator('#kc-login').click();
  await page.goto('/prepare?kind=' + kind); await expect(page.getByText('خطة جاهزة')).toBeVisible(); await page.getByRole('button', { name: 'ابدأ الجولة', exact: true }).click();
  await expect(page.getByText(/الجولة منزّلة/)).toBeVisible(); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(page.getByRole('button', { name: 'اتجه للعميل', exact: true })).toBeEnabled(); return page;
}
async function capture(context: BrowserContext, page: Page) {
  await context.setOffline(true); await page.getByRole('button', { name: 'اتجه للعميل', exact: true }).click();
  await page.getByRole('button', { name: 'وصلت', exact: true }).click(); await page.getByRole('button', { name: /تأكيد التسليم/ }).click();
  await expect.poll(async () => (await journal(page)).pending.length).toBe(3);
}
const options = { headless: true, baseURL: origin, viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce' as const, serviceWorkers: 'allow' as const };
test.afterAll(async () => { await writeFile('.local/phase-29-browser.stop', 'stop'); });

test('reconnect loses the first committed response; a new browser process recovers the original ID before its descendants', async ({ playwright, request }) => {
  await mkdir('.local', { recursive: true }); const profile = await mkdtemp(resolve('.local/phase-34-browser-'));
  const info = await (await request.get(fixture + '/__fixture/info')).json() as Info;
  let context = await playwright.chromium.launchPersistentContext(profile, options);
  try {
    let page = await login(context, info, 'personal'); await capture(context, page); const original = await journal(page);
    await context.close(); context = await playwright.chromium.launchPersistentContext(profile, options); await context.setOffline(true); page = await context.newPage();
    await page.goto('/rounds/current?kind=personal'); await expect(page.getByText('محفوظ على الهاتف', { exact: true })).toBeVisible();
    expect((await journal(page)).actions).toEqual(original.actions);
    await page.evaluate(() => { const real = fetch.bind(window); let lost = false; window.fetch = async (...args) => { const path = String(args[0]); if (path.includes('/api/v1/sync/actions')) { if (lost) throw new TypeError('fixture network unavailable after commit'); const response = await real(...args); await response.clone().arrayBuffer(); lost = true; throw new TypeError('fixture lost committed response'); } return real(...args); }; });
    await context.setOffline(false);
    await expect.poll(async () => { const state = await (await request.get(fixture + '/__fixture/state')).json(); return state.actions.filter((x: { action_id: string }) => original.actions.some(a => a.actionId === x.action_id)).length; }).toBe(1);
    expect((await journal(page)).acks).toHaveLength(0); expect((await journal(page)).pending).toHaveLength(3);
    await page.screenshot({ path: 'output/playwright/phase-34-retry-mobile.png', fullPage: true });
    await context.close(); context = await playwright.chromium.launchPersistentContext(profile, options); page = await context.newPage();
    await page.goto('/rounds/current?kind=personal');
    await expect.poll(async () => (await journal(page)).acks.length).toBe(3); await expect.poll(async () => (await journal(page)).pending.length).toBe(0);
    expect((await journal(page)).actions).toEqual(original.actions); await expect(page.getByText('تمت معالجة 1 من 2 وقفات')).toBeVisible();
    await page.screenshot({ path: 'output/playwright/phase-34-recovered-mobile.png', fullPage: true });
    const state = await (await request.get(fixture + '/__fixture/state')).json(); expect(state.actions.filter((x: { action_id: string }) => original.actions.some(a => a.actionId === x.action_id))).toHaveLength(3);
    await writeFile('.local/phase-34-reconnect-evidence.json', JSON.stringify({ evidenceClass: 'Real Chromium process reopen/Workbox/IndexedDB/Web Locks, local Keycloak/Fastify/PostgreSQL. Deliberately dropped HTTP response; no elapsed 24-hour or physical-phone claim.', browser: context.browser()?.version(), original, recovered: await journal(page), state }, null, 2));
  } finally { await context.close(); }
});

test('two tabs share one replay owner; a second phone takes over and explicitly reviews/adopts old offline evidence', async ({ browser, request }) => {
  const info = await (await request.get(fixture + '/__fixture/info')).json() as Info, first = await browser.newContext(options);
  let second: BrowserContext | undefined;
  try {
    const old = await login(first, info, 'company'); await capture(first, old); const original = await journal(old);
    const peer = await first.newPage(); await peer.goto('/rounds/current?kind=company'); await expect(peer.getByText('محفوظ على الهاتف', { exact: true })).toBeVisible();
    second = await browser.newContext({ ...options, storageState: await first.storageState() });
    await second.addInitScript(() => localStorage.setItem('tawsel:device-id', '34000000-0000-4000-8000-000000000002'));
    const owner = await second.newPage(); await owner.goto('/rounds/current?kind=company'); await owner.getByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' }).click(); await expect(owner.getByText(/اكتمل نقل التنفيذ وتحميل الحالة المؤكدة/)).toBeVisible();
    await owner.goto('/prepare?kind=company'); await expect(owner.getByRole('button', { name: 'ابدأ الجولة', exact: true })).toHaveCount(0);
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); const posts: string[] = [];
    await first.route('**/api/v1/sync/actions*', async route => { posts.push(route.request().postData()!); const response = await route.fetch(); if (posts.length === 1) await gate; await route.fulfill({ response }); });
    await first.setOffline(false);
    try {
      await expect.poll(() => posts.length).toBe(1); await peer.evaluate(() => window.dispatchEvent(new Event('focus')));
      const locks = await peer.evaluate(() => navigator.locks.query()); expect(locks.held?.filter(x => x.name?.startsWith('tawsel:journal:'))).toHaveLength(1);
      expect(posts).toHaveLength(1);
    } finally { release(); }
    await expect.poll(async () => (await journal(old)).acks.length).toBe(3); await expect.poll(async () => (await journal(old)).pending.length).toBe(0);
    expect(posts).toHaveLength(3); expect((await journal(old)).actions).toEqual(original.actions);
    expect((await journal(old)).acks.every(a => a.result.receipt.businessStatus === 'review-required')).toBe(true);
    await owner.goto('/sync?kind=company'); await expect(owner.getByText('نتيجة تحتاج مراجعة', { exact: true })).toBeVisible();
    await owner.getByText('نتيجة تحتاج مراجعة', { exact: true }).locator('..').getByRole('button', { name: 'مراجعة الدليل' }).click();
    await expect(owner.getByRole('button', { name: 'اعتماد هذه النتيجة بعد المراجعة' })).toBeVisible();
    expect(await owner.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await owner.screenshot({ path: 'output/playwright/phase-34-evidence-review.png', fullPage: true });
    await owner.getByRole('button', { name: 'اعتماد هذه النتيجة بعد المراجعة' }).click(); await expect(owner.getByText('اعتُمدت النتيجة بالفعل.')).toBeVisible();
    await owner.reload(); await expect(owner.getByText('نتيجة اعتُمدت؛ أصل الدليل محفوظ')).toBeVisible();
    await owner.screenshot({ path: 'output/playwright/phase-34-adopted-evidence.png', fullPage: true });
    const state = await (await request.get(fixture + '/__fixture/state')).json();
    expect(state.actions.filter((x: { action_id: string; business_status: string }) => original.actions.some(a => a.actionId === x.action_id)).every((x: { business_status: string }) => x.business_status === 'review-required')).toBe(true);
    expect(state.outcomes).toHaveLength(2);
    const conflicts = await owner.evaluate(async () => { const response = await fetch('/api/v1/sync/conflicts?kind=company&deviceId=' + localStorage.getItem('tawsel:device-id')); if (!response.ok) throw Error('conflict read'); return response.json(); });
    await writeFile('.local/phase-34-two-device-evidence.json', JSON.stringify({ evidenceClass: 'Two real Chromium contexts simulate phone storage/identity; two same-context tabs use native Web Locks. Local Keycloak/API/PostgreSQL; controlled routing provider and response gate. No physical phones.', original, recovered: await journal(old), posts: posts.map(p => JSON.parse(p)), conflicts, state }, null, 2));
  } finally { await first.close(); await second?.close(); }
});
