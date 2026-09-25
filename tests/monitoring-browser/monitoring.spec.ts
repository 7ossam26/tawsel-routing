import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
type Info = { username: string; password: string; companyCode: string; driverId: string; hidden: string };
async function login(page: Page, info: Info) {
  await page.goto('/login/company'); await page.getByLabel('كود الشركة (مطلوب)').fill(info.companyCode); await page.getByRole('button', { name: 'متابعة', exact: true }).click(); await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await page.locator('#username').fill(info.username); await page.locator('#password').fill(info.password); await page.locator('#kc-login').click(); await expect(page.getByRole('heading', { name: 'حسابي' })).toBeVisible();
}
test.afterAll(async ({ request }) => { await writeFile('.local/phase-32-browser.stop', 'stop'); await request.get('http://127.0.0.1:3032/__fixture/info').catch(() => undefined); });
test('authorized monitor stays coherent, reconnects fully and renders a committed change', async ({ page, request }) => {
  const info = await (await request.get('http://127.0.0.1:3032/__fixture/info')).json() as Info, reads: { etag: string | undefined; at: number }[] = [];
  page.on('request', value => { if (value.url().includes(`/api/v1/monitoring/drivers/${info.driverId}`)) reads.push({ etag: value.headers()['if-none-match'], at: Date.now() }); });
  await login(page, info); await page.goto(`/monitoring?kind=company&driverId=${info.driverId}`); await expect(page.getByRole('heading', { name: 'حالة المندوب والعمل' })).toBeVisible();
  await expect(page.getByText('الجولة غادرت — التنفيذ للقراءة فقط')).toBeVisible(); await expect(page.getByText('المتابعة محدثة')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(info.hidden); await expect(page.getByRole('button', { name: /تسليم|وصلت|رفض/ })).toHaveCount(0);
  await expect.poll(() => reads.some(read => Boolean(read.etag)), { timeout: 10_000 }).toBe(true);
  const beforeReconnect = reads.length; await page.evaluate(() => window.dispatchEvent(new Event('online'))); await expect.poll(() => reads.length, { timeout: 10_000 }).toBeGreaterThan(beforeReconnect); expect(reads.at(-1)?.etag).toBeUndefined();
  const started = Date.now(); const commit = await request.post('http://127.0.0.1:3032/__fixture/commit-current'); expect(commit.ok()).toBe(true); await expect(page.getByText('هناك عميل حالي ظاهر ضمن نطاقك.')).toBeVisible({ timeout: 10_000 }); const commitToRenderMs = Date.now() - started;
  await page.getByRole('button', { name: 'مقبول' }).click(); await expect(page.getByText(/intake.submitSnapshot|assignment.receiveBatch/).first()).toBeVisible();
  await page.keyboard.press('Tab'); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/phase-32-monitoring-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: 'output/playwright/phase-32-monitoring-mobile.png', fullPage: true });
  const state = await (await request.get('http://127.0.0.1:3032/__fixture/state')).json(); await mkdir('.local', { recursive: true }); await writeFile('.local/phase-32-browser-evidence.json', JSON.stringify({ class: 'Actual local Keycloak, Chromium, Fastify and isolated PostgreSQL; fixture source identities', commitToRenderMs, requests: reads, state }, null, 2));
});
