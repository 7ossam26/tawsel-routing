import { expect, test, type Page } from '@playwright/test';

async function activationLink(email: string) {
  let id = '';
  await expect.poll(async () => {
    const data = await (await fetch('http://127.0.0.1:8025/api/v1/messages')).json();
    id = data.messages.find((message: { To: { Address: string }[] }) => message.To.some(to => to.Address === email))?.ID ?? '';
    return id;
  }).not.toBe('');
  const message = await (await fetch(`http://127.0.0.1:8025/api/v1/message/${id}`)).json();
  const link = String(message.Text).match(/http:\/\/localhost:8085\/[^\s<>]+/u)?.[0];
  if (!link) throw new Error('Activation link missing from local provider fixture');
  return link;
}
async function createTask(page: Page, name: string, phone: string, address: string, amount?: string) {
  await page.goto('/tasks/new');
  await page.getByLabel('اسم المستلم (مطلوب)').fill(name);
  await page.getByLabel('رقم الهاتف (مطلوب)').fill(phone);
  await page.getByLabel('العنوان المكتوب (مطلوب)').fill(address);
  if (amount) await page.getByLabel('مبلغ التحصيل (اختياري)').fill(amount);
  await page.getByRole('button', { name: 'حفظ المهمة' }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test('real browser creates, reloads and independently corrects two same-address tasks', async ({ page }) => {
  const stamp = String(Date.now());
  const phone = `+201${stamp.slice(-9)}`;
  const email = `p09-${stamp}@example.test`;
  const password = `Intake-${stamp}!`;
  const address = '١٢ شارع التحرير، الدقي';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await page.getByLabel('رقم الهاتف', { exact: true }).fill(phone);
  await page.getByRole('button', { name: 'إنشاء حساب', exact: true }).click();
  await page.locator('#username').fill(phone);
  await page.locator('#email').fill(email);
  await page.locator('input[type="submit"]').click();
  await page.goto(await activationLink(email));
  await page.locator('#password-new').fill(password);
  await page.locator('#password-confirm').fill(password);
  await page.locator('input[type="submit"]').click();
  await expect(page).toHaveURL(/\/account\?kind=personal/);

  await createTask(page, 'منى الأولى', '01012345678', address);
  await createTask(page, 'منى الثانية', '01112345678', address, '125.50');
  await page.reload();
  await expect(page.getByText('منى الأولى')).toBeVisible();
  await expect(page.getByText('منى الثانية')).toBeVisible();
  await expect(page.getByText('الموقع يحتاج تحديد')).toHaveCount(2);
  await expect(page.getByText(/لن يصبح وقفة قابلة للتنفيذ/)).toHaveCount(2);

  const first = page.locator('.task-card').filter({ hasText: 'منى الأولى' });
  await first.getByRole('button', { name: 'تصحيح البيانات' }).click();
  await page.getByLabel('اسم المستلم (مطلوب)').fill('منى الأولى — مصححة');
  await page.getByRole('button', { name: 'حفظ التصحيح' }).click();
  await expect(page.getByText('منى الأولى — مصححة')).toBeVisible();
  await expect(page.getByText('منى الثانية')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/phase-09-two-tasks.png', fullPage: true });
});
