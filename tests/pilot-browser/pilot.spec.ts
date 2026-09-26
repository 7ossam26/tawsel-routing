import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const output = 'output/playwright/phase-41';
async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}
test.afterAll(async () => {
  await writeFile('.local/phase-41-browser.stop', 'stop');
  await expect.poll(() => existsSync('.local/phase-41-credentials.json'), { timeout: 30000 }).toBe(false);
  await expect.poll(() => existsSync('.local/phase-41-browser.stop'), { timeout: 30000 }).toBe(false);
});
test('continuous persisted B2C create → pin → plan → deliver → close → report → XLSX', async ({ page, request, browser }) => {
  const startedAt = new Date().toISOString();
  const info = await (await request.get('http://127.0.0.1:3041/__fixture/info')).json() as { username: string; password: string; engine: string };
  await mkdir(output, { recursive: true });
  await page.goto('/login/independent');
  await page.getByLabel('رقم الهاتف').fill(info.username);
  await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await page.locator('#username').fill(info.username); await page.locator('#password').fill(info.password); await page.locator('#kc-login').click();
  await expect(page.getByRole('heading', { name: 'حسابي' })).toBeVisible();
  const names = ['تجربة ٤١ — منى عبد الرحمن ذات الاسم الطويل عند المدخل الجانبي', '=1+1'];
  const taskIds: string[] = [];
  for (const [index, name] of names.entries()) {
    await page.goto('/tasks/new');
    await page.getByLabel('اسم المستلم (مطلوب)').fill(name);
    await page.getByLabel('رقم الهاتف (مطلوب)').fill('01012345678');
    await page.getByLabel('العنوان المكتوب (مطلوب)').fill('١٢ شارع التحرير، المدخل الجانبي بجوار الصيدلية — عنوان اختبار فقط');
    if (index === 1) await page.getByLabel('مبلغ التحصيل (اختياري)').fill('125.50');
    await page.getByRole('button', { name: 'حفظ المهمة' }).click();
    const card = page.locator('.task-card').filter({ hasText: name });
    await expect(card.getByText('الموقع يحتاج تحديد')).toBeVisible();
    await card.getByRole('link', { name: 'مراجعة الموقع' }).click();
    taskIds.push(new URL(page.url()).pathname.split('/').at(-1)!);
    await expect(page.getByRole('button', { name: 'اختيار وسط الخريطة' })).toBeEnabled();
    await page.getByRole('button', { name: 'اختيار وسط الخريطة' }).click();
    await page.getByRole('button', { name: 'تأكيد نقطة التوصيل' }).click();
    await expect(page.getByText('تم تأكيد الموقع', { exact: true })).toBeVisible();
    await capture(page, `pin-${index}`);
  }
  expect(new Set(taskIds).size).toBe(2);
  await page.goto('/tasks'); await page.reload();
  for (const name of names) await expect(page.locator('.task-card').filter({ hasText: name }).getByText('الموقع مؤكّد')).toBeVisible();
  await page.goto('/prepare?kind=personal');
  await page.getByLabel('وسيلة الحركة').selectOption('bicycle');
  await page.getByLabel('خط عرض نقطة الانطلاق').fill('');
  await page.getByRole('button', { name: 'احفظ وجهّز المعاينة' }).click();
  await expect(page.getByText('أكمل إحداثيات النقطة المطلوبة قبل تجهيز الخطة.')).toBeVisible();
  await page.getByLabel('خط عرض نقطة الانطلاق').fill('30.0444');
  await page.getByLabel('خط طول نقطة الانطلاق').fill('31.2357');
  await page.getByRole('button', { name: 'احفظ وجهّز المعاينة' }).click();
  await expect(page.getByText('خطة جاهزة', { exact: true })).toBeVisible();
  await expect(page.locator('.action-button--primary:enabled')).toHaveText('ابدأ الجولة');
  await expect(page.getByText(/نسخة الإدخال|التخطيط يعمل على النسخة/)).toHaveCount(0);
  await capture(page, 'ready');
  await page.getByRole('button', { name: 'ابدأ الجولة', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'المحطة الحالية' })).toBeVisible();
  for (let index = 0; index < 2; index++) {
    await page.getByRole('button', { name: 'اتجه للعميل', exact: true }).click();
    await page.getByRole('button', { name: 'وصلت', exact: true }).click();
    const deliver = page.getByRole('button', { name: /تأكيد التسليم/ });
    await expect(deliver).toBeEnabled(); await deliver.focus(); await expect(deliver).toBeFocused();
    const box = await deliver.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
    await page.setViewportSize({ width: 360, height: 800 }); await capture(page, `arrived-${index}`);
    await deliver.press('Enter');
    await expect(page.getByText(`تمت معالجة ${index + 1} من 2 وقفات`, { exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'ملخص العمل وإنهاء الجولة أو اليوم' }).click();
  await page.getByLabel('نطاق الإنهاء').selectOption('day');
  await page.getByRole('button', { name: 'إنهاء يوم العمل', exact: true }).click();
  await expect(page.getByText('انتهى يوم العمل', { exact: true })).toBeVisible();
  await capture(page, 'closed');
  await page.goto('/reports?kind=personal');
  await expect(page.getByRole('heading', { name: 'تمت معالجة 2 من 2 شحنة' })).toBeVisible();
  await page.getByRole('button', { name: 'إنشاء ملف Excel', exact: true }).click();
  await expect(page.getByText('ملف Excel جاهز', { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /تنزيل ملف Excel/ }).click();
  const download = await downloadEvent, path = await download.path();
  const workbook = JSON.parse((await promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/inspect-report-export.ts', path!])).stdout) as { rows: { taskId: string; recipientName: string; recipientCellType: number; outcome: string; collectionMinor: string; currency: string; exponent: number }[]; snapshotId: string };
  expect(workbook.rows).toHaveLength(2);
  expect(workbook.rows.map(row => row.recipientName).sort()).toEqual([...names].sort());
  expect(workbook.rows.map(row => row.taskId).sort()).toEqual([...taskIds].sort());
  expect(workbook.rows.find(row => row.recipientName === '=1+1')).toMatchObject({ collectionMinor: '12550', currency: 'EGP', exponent: 2 });
  expect(workbook.rows.every(row => row.outcome === 'تسليم كامل')).toBe(true);
  expect(workbook.rows.find(row => row.recipientName === '=1+1')!.recipientCellType).toBe(3);
  expect((await readFile(path!)).subarray(0, 2).toString()).toBe('PK');
  for (const width of [320, 390, 1366]) { await page.setViewportSize({ width, height: 844 }); await capture(page, `report-${width}`); }
  await writeFile(`${output}/b2c.json`, JSON.stringify({ startedAt, completedAt: new Date().toISOString(), platform: process.platform, node: process.version, browser: browser.version(), physicalDevice: false, engine: info.engine, identity: 'actual local Keycloak; preverified synthetic account (registration/email not exercised)', maps: 'actual local Cairo map rendered; center selected without dragging', taskIds, reportSnapshot: workbook.snapshotId, outcomes: workbook.rows, ownerFeedback: null, elapsedOffline: null }, null, 2));
});
