import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const evidenceDirectory = 'output/playwright/phase-04';

async function openFixture(page: Page, query = '') {
  await page.goto(`/__fixtures/driver-review${query}`);
  await expect(page.getByText('عرض مطوّر ببيانات ثابتة')).toBeVisible();
  expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
}

test.beforeAll(async () => { await mkdir(evidenceDirectory, { recursive: true }); });

test('360x800 daily readiness and missing-pin recovery', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 360, height: 800 });
  await openFixture(page);
  await expect(page.getByRole('button', { name: 'ابدأ الجولة' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ابدأ الجولة' })).toBeInViewport();
  const typography = await page.evaluate(async () => {
    await document.fonts.ready;
    const body = getComputedStyle(document.body);
    const heading = getComputedStyle(document.querySelector('h1')!);
    const action = getComputedStyle(document.querySelector('.action-button--primary')!);
    return {
      family: body.fontFamily,
      bodyWeight: body.fontWeight,
      headingWeight: heading.fontWeight,
      actionWeight: action.fontWeight,
      loaded: [400, 600, 700, 800].every((weight) => document.fonts.check(`${weight} 1rem Cairo`))
    };
  });
  expect(typography).toEqual(expect.objectContaining({ bodyWeight: '400', headingWeight: '800', actionWeight: '700', loaded: true }));
  expect(typography.family).toContain('Cairo');
  expect(requests.filter((url) => /^https?:/.test(url) && new URL(url).origin !== new URL(page.url()).origin)).toEqual([]);
  await page.screenshot({ path: `${evidenceDirectory}/360x800-daily-ready.png`, fullPage: true });
  await page.getByLabel('الحالة').selectOption('missing-pin');
  await expect(page.getByRole('button', { name: 'حدّد الموقع' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ابدأ الجولة' })).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDirectory}/360x800-missing-pin.png`, fullPage: true });
});

test('390x844 explicit stages, draft retention, focus restoration and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  await page.getByRole('button', { name: 'ابدأ الجولة' }).click();
  await page.getByRole('button', { name: 'اتجه للعميل' }).click();
  await expect(page.getByRole('button', { name: 'وصلت' })).toBeVisible();
  await expect(page.getByText('المهندس حسام الدين عبد الرحمن محمد عبد الله وشركاؤه لاستلام الطلبات')).toBeVisible();
  await expect(page.getByText('+20 10 0000 0000', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${evidenceDirectory}/390x844-heading-long-content.png`, fullPage: true });
  await page.getByRole('button', { name: 'وصلت' }).click();
  const trigger = page.getByRole('button', { name: 'سجّل النتيجة' });
  await trigger.click();
  await page.getByRole('radio', { name: 'تسليم كامل' }).check();
  await page.getByLabel('المبلغ المحصّل (ج.م)').fill('275');
  await expect(page.getByRole('button', { name: 'حفظ النتيجة' })).toBeInViewport();
  await page.screenshot({ path: `${evidenceDirectory}/390x844-outcome-sheet.png` });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByLabel('المبلغ المحصّل (ج.م)')).toHaveValue('275');
  const duration = await page.locator('.dialog-content').evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
});

test('390x844 exception fixtures keep partial, no-answer, ownership and sync states honest', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  const state = page.getByLabel('الحالة');
  await state.selectOption('partial');
  await expect(page.getByText('قطعتان من ٣ · المطلوب ٢٥٠ ج.م')).toBeVisible();
  await state.selectOption('another-device');
  await expect(page.getByRole('button', { name: 'انقل التنفيذ لهذا الهاتف' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ابدأ الجولة' })).toHaveCount(0);
  await state.selectOption('pending');
  await expect(page.getByText(/ليست نتيجة مؤكدة من الخادم/)).toBeVisible();
  await state.selectOption('rejected');
  await expect(page.getByText(/المسودة محفوظة/)).toBeVisible();
  await state.selectOption('ready');
  await page.getByRole('button', { name: 'ابدأ الجولة' }).click();
  await page.getByRole('button', { name: 'اتجه للعميل' }).click();
  await page.getByRole('button', { name: 'لا يوجد رد' }).click();
  await expect(page.getByRole('radio', { name: 'لا يوجد رد' })).toBeChecked();
  await expect(page.getByText('لا يلزم عدّ المكالمات')).toBeVisible();
  await page.screenshot({ path: `${evidenceDirectory}/390x844-no-answer-variants.png` });
});

for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`${viewport.width}x${viewport.height} selected-driver monitoring remains read-only`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openFixture(page, '?view=desktop');
    await expect(page.getByText('متابعة فقط بعد بدء الجولة')).toBeVisible();
    await expect(page.getByRole('button', { name: /حفظ النتيجة/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'حدد الوقفة التالية، صيدلية الشفاء' }).click();
    await expect(page.locator('.map-selection')).toContainText('صيدلية الشفاء');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `${evidenceDirectory}/${viewport.width}x${viewport.height}-selected-driver.png`, fullPage: true });
  });
}

test('keyboard RTL tabs and 200% effective reflow preserve access', async ({ page }) => {
  await page.setViewportSize({ width: 683, height: 384 });
  await openFixture(page, '?view=desktop');
  const currentTab = page.getByRole('tab', { name: 'الحالي والتالي' });
  await currentTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'كل الوقفات' })).toBeFocused();
  await expect(page.getByText('متابعة فقط بعد بدء الجولة')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${evidenceDirectory}/desktop-200-percent-effective-zoom.png`, fullPage: true });
});
