import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

type Info = { personalUser: string; companyUser: string; password: string; companyCode: string };
async function keycloakLogin(page: Page, username: string, password: string) {
  await page.locator('#username').fill(username); await page.locator('#password').fill(password); await page.locator('#kc-login').click();
}

test.afterAll(async ({ request }) => { await writeFile('.local/phase-28-browser.stop', 'stop'); await request.get('http://127.0.0.1:3028/health').catch(() => undefined); });

test('actual B2C stale recovery and mock-B2B Engine failure/manual fallback both start once', async ({ browser, request }) => {
  const info = await (await request.get('http://127.0.0.1:3028/__fixture/info')).json() as Info;
  const evidence: Record<string, unknown> = { class: 'Actual local Keycloak 26.7.4, Chromium, real HTTP/PostgreSQL; controlled Engine HTTP; mock B2B public boundary' };

  const personalContext = await browser.newContext({ baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce' });
  const personal = await personalContext.newPage();
  await personal.goto('/login/independent'); await personal.getByLabel('رقم الهاتف').fill(info.personalUser); await personal.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click(); await keycloakLogin(personal, info.personalUser, info.password);
  await expect(personal.getByRole('heading', { name: 'حسابي' })).toBeVisible();
  await personal.goto('/day?kind=personal'); await expect(personal.getByText('عميلة جاهزة')).toBeVisible(); await expect(personal.getByText('عميل يحتاج موقعًا')).toBeVisible(); await expect(personal.getByText(/يمكنك متابعة تجهيز/)).toBeVisible();
  await personal.getByRole('link', { name: 'جهّز الجولة' }).click(); await expect(personal.getByText('خطة جاهزة')).toBeVisible();
  await request.post('http://127.0.0.1:3028/__fixture/personal-stale');
  await personal.getByRole('button', { name: 'ابدأ الجولة' }).click(); await expect(personal.getByText('تغيّرت الخطة بعد المزامنة؛ حدّث التجهيز قبل البدء.')).toBeVisible();
  expect((await (await request.get('http://127.0.0.1:3028/__fixture/state')).json()).rounds).toHaveLength(0);
  const refreshedPlans = personal.waitForResponse(response => response.url().includes('/plans?') && response.ok());
  await personal.getByRole('button', { name: 'تحديث', exact: true }).click(); expect((await (await refreshedPlans).json()).inputRevision).toBe(4);
  await expect(personal.getByText('خطة جاهزة', { exact: true })).toBeVisible(); await personal.getByRole('button', { name: 'ابدأ الجولة' }).click();
  await expect(personal.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible(); await expect(personal.getByRole('button', { name: 'اتجه للعميل' })).toBeVisible(); await personal.screenshot({ path: 'output/playwright/phase-28-b2c-start-mobile.png', fullPage: true }); await personalContext.close();

  const companyContext = await browser.newContext({ baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce' });
  const companyPage = await companyContext.newPage(); await companyPage.goto('/login/company'); await companyPage.getByLabel('كود الشركة (مطلوب)').fill(info.companyCode); await companyPage.getByRole('button', { name: 'متابعة', exact: true }).click(); await companyPage.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click(); await keycloakLogin(companyPage, info.companyUser, info.password);
  await expect(companyPage.getByRole('heading', { name: 'حسابي' })).toBeVisible(); await request.post('http://127.0.0.1:3028/__fixture/company-engine-failure');
  await companyPage.goto('/day?kind=company'); await expect(companyPage.getByText(/عمل الشركة قادم وليس على عهدتك/)).toBeVisible(); await companyPage.goto('/prepare?kind=company');
  await expect(companyPage.getByText('تعذّر تجهيز المسار الآن')).toBeVisible(); await expect(companyPage.getByRole('button', { name: 'اعتماد الترتيب اليدوي' })).toBeVisible(); await companyPage.getByRole('button', { name: 'اعتماد الترتيب اليدوي' }).click();
  await expect(companyPage.getByText('ترتيب يدوي صالح', { exact: true })).toBeVisible(); await companyPage.reload(); await expect(companyPage.getByText('ترتيب يدوي صالح', { exact: true })).toBeVisible(); const companyStart = companyPage.getByRole('button', { name: 'ابدأ الجولة' }); await expect(companyStart).toBeEnabled(); await companyStart.click(); await expect(companyPage.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible(); await expect(companyPage.getByRole('button', { name: 'اتجه للعميل' })).toBeVisible();
  await companyPage.setViewportSize({ width: 1366, height: 900 }); await companyPage.screenshot({ path: 'output/playwright/phase-28-b2b-manual-desktop.png', fullPage: true }); await companyContext.close();
  evidence.state = await (await request.get('http://127.0.0.1:3028/__fixture/state')).json(); await mkdir('.local', { recursive: true }); await writeFile('.local/phase-28-browser-evidence.json', JSON.stringify(evidence, null, 2));
  expect((evidence.state as { rounds: unknown[] }).rounds).toHaveLength(2);
});
