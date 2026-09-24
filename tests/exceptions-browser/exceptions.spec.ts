import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const fixture = 'http://127.0.0.1:3030';
type Info = { personalUser: string; companyUser: string; password: string; companyCode: string; taskIds: Record<string, string> };
async function login(page: Page, info: Info, kind: 'personal' | 'company') {
  await page.goto(kind === 'personal' ? '/login/independent' : '/login/company');
  if (kind === 'personal') await page.getByLabel('رقم الهاتف').fill(info.personalUser);
  else { await page.getByLabel('كود الشركة (مطلوب)').fill(info.companyCode); await page.getByRole('button', { name: 'متابعة', exact: true }).click(); }
  await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click(); await page.locator('#username').fill(kind === 'personal' ? info.personalUser : info.companyUser); await page.locator('#password').fill(info.password); await page.locator('#kc-login').click();
  await page.goto(`/prepare?kind=${kind}`); await expect(page.getByText('خطة جاهزة')).toBeVisible(); await page.getByRole('button', { name: 'ابدأ الجولة' }).click(); await expect(page.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible();
}
async function choose(page: Page, name: string) { await page.getByRole('list', { name: 'قائمة المحطات المتاحة' }).getByRole('button', { name: new RegExp(name) }).click(); await expect(page.getByRole('region', { name: 'تفاصيل المحطة' }).getByRole('heading', { name, exact: true })).toBeVisible(); }
async function options(page: Page) { const summary = page.getByText('خيارات المهمة', { exact: true }); if (await summary.locator('..').getAttribute('open') === null) await summary.click(); }
async function assertLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: 'No horizontal overflow after viewport reflow' }).toBe(true);
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('body *')].map(element => { const rect = element.getBoundingClientRect(); return { tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 80), left: rect.left, right: rect.right, width: rect.width }; }).filter(rect => rect.width && (rect.left < -1 || rect.right > innerWidth + 1)) }));
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width); expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
}
test.afterAll(async () => { await writeFile('.local/phase-30-browser.stop', 'stop'); });

test('real API partial, refusal, scheduling, retry, correction and dependency changes', async ({ browser, request }) => {
  const info = await (await request.get(`${fixture}/__fixture/info`)).json() as Info;
  const context = await browser.newContext({ baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce' });
  const publicViews: unknown[] = [], reads: Promise<void>[] = [];
  const page = await context.newPage(); page.on('response', response => { if (response.ok() && (response.url().includes('/api/v1/current/rounds/') || response.url().includes('/api/v1/corrections/attempts/'))) reads.push(response.json().then(data => { publicViews.push({ url: response.url(), data }); })); }); await login(page, info, 'company');
  await choose(page, 'عميل الجزئي'); await page.getByRole('button', { name: 'اتجه للعميل' }).click();
  await options(page); await page.getByRole('link', { name: 'التأجيل والأولوية والسجل' }).click();
  await page.getByRole('button', { name: 'أولوية المهمة' }).click(); await expect(page.getByText('تم تأكيد التغيير من الخادم.')).toBeVisible();
  // The assigned driver can correct a pin during execution using the real API.
  await page.getByRole('link', { name: 'تصحيح نقطة التوصيل' }).click(); await page.getByText('إدخال الإحداثيات يدويًا', { exact: true }).click();
  await page.getByLabel('خط العرض', { exact: true }).fill('30.051'); await page.getByLabel('خط الطول', { exact: true }).fill('31.241'); await page.getByRole('button', { name: 'استخدام الإحداثيات' }).click(); await page.getByRole('button', { name: 'تأكيد نقطة التوصيل' }).click(); await expect(page.getByText('تم تأكيد الموقع', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'العودة', exact: true }).click(); await page.getByRole('link', { name: 'العودة للجولة' }).click();
  await expect(page.getByRole('button', { name: 'وصلت', exact: true })).toBeVisible(); // Urgency and pin preserve the current target.
  await page.getByRole('button', { name: 'وصلت', exact: true }).click(); await options(page);
  expect(await page.locator('.action-button--primary').count()).toBe(1);
  await page.getByRole('button', { name: 'تسليم بعض القطع' }).click(); await page.getByLabel('القطع المسلّمة — قميص').fill('2');
  await expect(page.getByText(/٢٥٠٫٠٠/)).toBeVisible(); await expect(page.getByText(/المتبقي معك للإرجاع: 1 قطعة/)).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 }); await assertLayout(page); await page.screenshot({ path: 'output/playwright/phase-30-partial-360.png', fullPage: true });
  const posted: unknown[] = []; page.on('request', value => { if (value.method() === 'POST' && value.url().includes('/outcomes/')) posted.push(value.postDataJSON()); });
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click(); expect(posted).toEqual([]); await options(page); await page.getByRole('button', { name: 'تسليم بعض القطع' }).click(); await expect(page.getByLabel('القطع المسلّمة — قميص')).toHaveValue('2'); await page.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }).click(); await expect(page.getByText(/تم تأكيد النتيجة والتحصيل من الخادم/)).toBeVisible();
  await page.getByRole('link', { name: 'العمل المؤجل والنتائج السابقة' }).click(); await page.getByLabel('المهمة', { exact: true }).selectOption(info.taskIds.partial!); await page.getByRole('link', { name: 'مراجعة النتيجة وتصحيح التسجيل' }).click();
  await page.getByLabel('القطع المسلّمة — قميص').fill('1'); await page.getByRole('button', { name: 'حفظ التصحيح' }).click(); await expect(page.getByText('تم تأكيد التغيير من الخادم.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'النتيجة الأصلية' })).toBeVisible(); await expect(page.getByText(/المراجعة 2/)).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 }); await assertLayout(page); await page.screenshot({ path: 'output/playwright/phase-30-correction-1440.png', fullPage: true });
  await page.getByRole('radio', { name: 'تسليم كامل', exact: true }).check();
  const received = await request.post(`${fixture}/__fixture/receive`); expect(received.ok(), await received.text()).toBe(true);
  await page.getByRole('button', { name: 'حفظ التصحيح' }).click(); await expect(page.getByText('لم يُقبل التصحيح؛ الدليل محفوظ للمراجعة')).toBeVisible(); await expect(page.getByRole('radio', { name: 'تسليم كامل', exact: true })).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'output/playwright/phase-30-receipt-denial-390.png', fullPage: true });
  await page.reload(); await expect(page.getByText('لم يُقبل التصحيح؛ الدليل محفوظ للمراجعة')).toBeVisible();
  await page.getByRole('link', { name: 'العودة للسجل', exact: true }).click(); await page.getByRole('link', { name: 'العودة للجولة' }).click();
  // Paid refusal and whole retry: goods remain whole and shipping is never charged twice.
  await choose(page, 'عميل الرفض'); await options(page); await page.getByRole('button', { name: 'رفض الاستلام', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.getByRole('dialog').locator('#focused-overlay-title')).toBeFocused();
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click(); await expect(page.locator('#task-options')).toBeFocused(); await page.getByRole('button', { name: 'رفض الاستلام', exact: true }).click(); await page.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }).click(); await expect(page.getByText(/تم تأكيد النتيجة والتحصيل من الخادم/)).toBeVisible();
  await page.getByRole('link', { name: 'العمل المؤجل والنتائج السابقة' }).click(); await page.getByLabel('المهمة', { exact: true }).selectOption(info.taskIds.paid!); await page.getByLabel('اختر الإجراء').selectOption('retry'); await page.getByRole('button', { name: 'إعادة المحاولة كاملة', exact: true }).click(); await expect(page.getByText('تم تأكيد التغيير من الخادم.')).toBeVisible();
  await page.getByRole('link', { name: 'العودة للجولة' }).click(); await choose(page, 'عميل الرفض'); await expect(page.getByText(/٣٠٠٫٠٠/).first()).toBeVisible(); await page.getByRole('button', { name: 'اتجه للعميل' }).click(); await page.getByRole('button', { name: 'لم يرد العميل', exact: true }).click(); await expect(page.getByText(/تم تسجيل عدم الرد من الخادم/)).toBeVisible();
  await choose(page, 'عميل الشحن'); await options(page); await page.getByRole('button', { name: 'رفض الاستلام', exact: true }).click(); await page.getByRole('radio', { name: 'رفض العميل دفع الشحن صراحةً' }).check();
  await assertLayout(page); await page.screenshot({ path: 'output/playwright/phase-30-unpaid-sheet-390.png', fullPage: true }); await page.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }).click(); await expect(page.getByText(/تم تأكيد النتيجة والتحصيل من الخادم/)).toBeVisible();
  await choose(page, 'عميل التأجيل'); await options(page); await page.getByRole('link', { name: 'التأجيل والأولوية والسجل' }).click(); await page.getByLabel('اختر الإجراء').selectOption('defer'); await page.getByLabel('الإتاحة بدءًا من').fill('2030-02-03T12:00'); await page.getByRole('button', { name: 'تأجيل المهمة كاملة', exact: true }).click(); await expect(page.getByText('تم تأكيد التغيير من الخادم.')).toBeVisible(); await page.getByLabel('اختر الإجراء').selectOption('activate'); await expect(page.getByText('لم يحن وقت الإتاحة بعد.')).toBeVisible();
  await page.setViewportSize({ width: 1366, height: 768 }); await page.screenshot({ path: 'output/playwright/phase-30-future-1366.png', fullPage: true });
  await page.getByLabel('المهمة', { exact: true }).selectOption(info.taskIds.paid!); await page.getByLabel('اختر الإجراء').selectOption('retry'); await expect(page.getByRole('button', { name: 'إعادة المحاولة كاملة', exact: true })).toHaveAttribute('aria-disabled', 'false');
  const capacity = await request.post(`${fixture}/__fixture/capacity`); expect(capacity.ok(), await capacity.text()).toBe(true); await page.getByRole('button', { name: 'إعادة المحاولة كاملة', exact: true }).click(); await expect(page.getByText('لم يُقبل التغيير؛ السجل محفوظ')).toBeVisible(); await expect(page.getByText(/الجولة بها ٥٠ محطة/).last()).toBeVisible(); await expect(page.getByRole('button', { name: 'إعادة المحاولة كاملة', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await page.reload(); await expect(page.getByText('لم يُقبل التغيير؛ السجل محفوظ')).toBeVisible(); await expect(page.getByText(/capacity:/)).toHaveCount(0); await expect(page.getByRole('button', { name: 'إعادة المحاولة كاملة', exact: true })).toHaveAttribute('aria-disabled', 'true'); await expect(page.getByLabel('المهمة', { exact: true })).toHaveValue(info.taskIds.paid!);
  await page.setViewportSize({ width: 320, height: 800 }); await assertLayout(page); await page.screenshot({ path: 'output/playwright/phase-30-capacity-320.png', fullPage: true }); await context.close();
  // A real closure arriving after the independent driver opens a simple correction.
  const personalContext = await browser.newContext({ baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 }, locale: 'ar-EG', timezoneId: 'Africa/Cairo', reducedMotion: 'reduce' }); const personal = await personalContext.newPage(); await login(personal, info, 'personal');
  await options(personal); await expect(personal.getByRole('button', { name: 'تسليم بعض القطع' })).toHaveCount(0); await personal.getByRole('button', { name: 'رفض الاستلام', exact: true }).click(); await expect(personal.getByText('دفع الشحن')).toHaveCount(0); await personal.getByRole('button', { name: 'تأكيد النتيجة والتحصيل' }).click(); await expect(personal.getByText(/تم تأكيد النتيجة والتحصيل من الخادم/)).toBeVisible();
  await personal.getByRole('link', { name: 'العمل المؤجل والنتائج السابقة' }).click(); const recordedOption = personal.getByRole('option', { name: /لها نتيجة/ }); await personal.getByLabel('المهمة', { exact: true }).selectOption(await recordedOption.getAttribute('value') ?? ''); await personal.getByRole('link', { name: 'مراجعة النتيجة وتصحيح التسجيل' }).click(); await personal.getByRole('radio', { name: 'تسليم كامل', exact: true }).check(); await expect(personal.getByText('دفع الشحن')).toHaveCount(0);
  const closed = await request.post(`${fixture}/__fixture/close-personal`); expect(closed.ok(), await closed.text()).toBe(true); await personal.getByRole('button', { name: 'حفظ التصحيح' }).click(); await expect(personal.getByText('لم يُقبل التصحيح؛ الدليل محفوظ للمراجعة')).toBeVisible(); await personal.screenshot({ path: 'output/playwright/phase-30-day-denial-personal.png', fullPage: true }); await personalContext.close();
  const state = await (await request.get(`${fixture}/__fixture/state`)).json();
  expect(state.actions.filter((a: {operation_id: string; business_status: string}) => a.operation_id === 'outcome.correct' && a.business_status === 'accepted')).toHaveLength(1);
  expect(state.actions.filter((a: {operation_id: string; business_status: string}) => a.operation_id === 'outcome.correct' && a.business_status === 'review-required')).toHaveLength(2);
  expect(state.outcomes.filter((o: {task_id: string}) => o.task_id === info.taskIds.partial).map((o: {revision: string; collection: {reported: {amountMinor: number}}}) => [Number(o.revision), o.collection.reported.amountMinor]).sort()).toEqual([[1,25000],[2,15000]]);
  expect(state.outcomes.filter((o: {task_id: string}) => o.task_id === info.taskIds.paid)).toHaveLength(2);
  expect(state.actions.filter((a: {operation_id: string; business_status: string}) => a.operation_id === 'task.retryWhole' && a.business_status === 'rejected')).toHaveLength(1);
  expect(state.outcomes.some((o: {collection: {shippingStatus: string}}) => o.collection.shippingStatus === 'explicitly-unpaid')).toBe(true);
  await Promise.all(reads);
  await writeFile('.local/phase-30-browser-evidence.json', JSON.stringify({ evidenceClass: 'Real local Keycloak, Fastify, PostgreSQL and Chromium. Controlled routing and public mock source; test orchestration uses actual receipt/capacity/closure commands. No physical device/commercial ERP evidence.', publicViews, state }, null, 2));
});
