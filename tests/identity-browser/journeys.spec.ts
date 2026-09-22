import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { createDatabasePool } from '../../apps/api/src/db/pool.js';
import { parseDatabaseConfig } from '../../apps/api/src/db/config.js';
const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8')) as { password: string; control: string };
const origin = 'http://localhost:5173';
async function passwordLogin(page: Page, username: string, password: string) {
  await page.locator('#password').waitFor();
  if (!await page.locator('#username').isVisible()) await page.locator('a[href*="/login-actions/restart"]').click();
  await page.locator('#username').fill(username); await page.locator('#password').fill(password); await page.locator('#kc-login').click();
}
async function emailLink(email: string) {
  let id = '';
  await expect.poll(async () => {
    const data = await (await fetch('http://127.0.0.1:8025/api/v1/messages')).json();
    id = data.messages.find((m: { To: { Address: string }[] }) => m.To.some(to => to.Address === email))?.ID ?? '';
    return id;
  }).not.toBe('');
  const message = await (await fetch(`http://127.0.0.1:8025/api/v1/message/${id}`)).json();
  const text = String(message.Text);
  const link = text.match(/http:\/\/localhost:8085\/[^\s<>]+/u)?.[0];
  expect(link).toBeTruthy();
  return { link: link!, id };
}
async function companyLogin(page: Page, username = 'driver') {
  await page.goto('/login/company'); await page.getByLabel('كود الشركة (مطلوب)').fill('LOCAL');
  await page.getByRole('button', { name: 'متابعة', exact: true }).click();
  await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await passwordLogin(page, username, secrets.password);
}
test('B: real company denial, field preservation, RTL/focus and logout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login/company');
  await page.getByLabel('كود الشركة (مطلوب)').fill('UNKNOWN'); await page.getByRole('button', { name: 'متابعة', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('راجع');
  await expect(page.locator('.account-error')).toBeFocused();
  await expect(page.getByLabel('كود الشركة (مطلوب)')).toHaveValue('UNKNOWN');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.screenshot({ path: 'output/playwright/phase-07-code-error.png', fullPage: true });
  await companyLogin(page, 'outsider');
  await expect(page).toHaveURL(/error=access_disabled/);
  await expect(page.getByRole('alert')).toContainText('الوصول غير متاح');
  await companyLogin(page);
  await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/phase-07-company-account.png', fullPage: true });
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?kind=company/);
  expect((await page.request.get(`${origin}/api/session/context?kind=company`)).status()).toBe(401);
});
test('B: real registration, local verified email, separate sessions, recovery and phone-only login', async ({ page, context }) => {
  test.setTimeout(120_000);
  const stamp = String(Date.now()); const phone = `+201${stamp.slice(-9)}`; const email = `p07-${stamp}@example.test`;
  const password = `Register-${stamp}!`, recovered = `Recovered-${stamp}!`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register'); await page.getByLabel('رقم الهاتف', { exact: true }).fill(phone); await page.getByRole('button', { name: 'إنشاء حساب', exact: true }).click();
  await page.locator('#username').fill(phone); await page.locator('#email').fill(email);
  await page.locator('input[type="submit"]').click();
  await expect(page.locator('#kc-page-title')).toContainText(/البريد|email/i);
  expect((await page.request.get(`${origin}/api/session/context?kind=personal`)).status()).toBe(401);
  await page.screenshot({ path: 'output/playwright/phase-07-verify-email.png', fullPage: true });
  const activation = await emailLink(email); await page.goto(activation.link);
  await page.locator('#password-new').fill(password); await page.locator('#password-confirm').fill(password); await page.locator('input[type="submit"]').click();
  await expect(page).toHaveURL(/\/account\?kind=personal/);
  await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
  const personal = await (await page.request.get(`${origin}/api/session/context?kind=personal`)).json();
  expect(personal.recoveryEmailVerified).toBe(true); expect(personal.phoneOwnershipVerified).toBe(false);
  await page.evaluate(id => localStorage.setItem(`evidence:${id}`, 'future-pending-evidence'), personal.access.sourceId);
  await companyLogin(page);
  await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
  const company = await (await page.request.get(`${origin}/api/session/context?kind=company`)).json();
  expect(company.access.sourceId).not.toBe(personal.access.sourceId); expect(company.access.tenantId).not.toBe(personal.access.tenantId);
  expect((await context.cookies()).filter(c => ['__Host-tawsel-company','__Host-tawsel-personal'].includes(c.name))).toHaveLength(2);
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?kind=company/);
  expect((await page.request.get(`${origin}/api/session/context?kind=personal`)).status()).toBe(200);
  await page.goto('/account?kind=personal'); await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?kind=personal/);
  await page.goto('/recover?kind=personal'); await page.getByRole('button', { name: 'استعادة كلمة المرور', exact: true }).click();
  await expect(page.locator('#kc-reset-password-form')).toBeVisible();
  await page.locator('#username').fill(email); await page.locator('input[type="submit"]').click();
  await expect(page.getByText('من المفترض أن تتلقى بريدًا إلكترونيًا عما قريب يحتوي على مزيد من الإرشادات.')).toBeVisible();
  await expect(page.getByLabel('رقم الهاتف', { exact: true })).toHaveValue('');
  await page.screenshot({ path: 'output/playwright/phase-07-recovery-ack.png', fullPage: true });
  await expect.poll(async () => (await emailLink(email)).id).not.toBe(activation.id);
  const recovery = await emailLink(email);
  // A direct repeat of the issuer form is suppressed, with the same acknowledgement.
  await page.locator('a[href*="/login-actions/reset-credentials"]').click();
  await page.getByLabel('البريد الإلكتروني للاستعادة', { exact: true }).fill(email); await page.locator('input[type="submit"]').click();
  await expect(page.getByText('من المفترض أن تتلقى بريدًا إلكترونيًا عما قريب يحتوي على مزيد من الإرشادات.')).toBeVisible();
  expect((await emailLink(email)).id).toBe(recovery.id);
  await page.goto(recovery.link);
  await page.locator('#password-new').fill(recovered); await page.locator('#password-confirm').fill(recovered); await page.locator('input[type="submit"]').click();
  // Issuer may continue the pending OIDC flow after resetting the password.
  await expect(page).toHaveURL(/\/account\?kind=personal/);
  await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?kind=personal/);
  await page.goto('/login/independent'); await page.getByLabel('رقم الهاتف', { exact: true }).fill(phone); await page.getByRole('button', { name: 'متابعة تسجيل الدخول' }).click();
  await passwordLogin(page, email, recovered);
  await expect(page.locator('#input-error')).toBeVisible();
  await passwordLogin(page, phone, recovered);
  await expect(page).toHaveURL(/\/account\?kind=personal/);
  expect(await page.evaluate(id => localStorage.getItem(`evidence:${id}`), personal.access.sourceId)).toBe('future-pending-evidence');
  const after = await (await page.request.get(`${origin}/api/session/context?kind=personal`)).json();
  expect(after.access.sourceId).toBe(personal.access.sourceId);
  await page.screenshot({ path: 'output/playwright/phase-07-personal-account.png', fullPage: true });
  // Consumed proof must not allow another password change.
  await page.goto(recovery.link);
  await expect(page.locator('#password-new')).toHaveCount(0);
  await expect(page.locator('#kc-content')).toContainText(/انتهى الإجراء/);
  await expect(page.getByRole('link', { name: 'العودة لتوصيل واستعادة الحساب' })).toBeVisible();
});

test('C: real expiry reauth rejects a different account, preserves context; current membership and issuer revocation deny', async ({ page, context }) => {
  const env = parseEnv(await readFile('.env.database.local', 'utf8'));
  const pool = createDatabasePool(parseDatabaseConfig(env.TAWSEL_DATABASE_URL, 'application'));
  const account = '70000000-0000-4000-8000-000000000101';
  try {
    await companyLogin(page); await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
    await page.evaluate(() => localStorage.setItem('p07-expiry-evidence', 'retained'));
    const cookie = (await context.cookies()).find(c => c.name === '__Host-tawsel-company')!;
    await pool.query("UPDATE tawsel.web_sessions SET expires_at=now()-interval '1 second' WHERE session_hash=$1", [createHash('sha256').update(cookie.value).digest('hex')]);
    await page.reload(); await expect(page.getByRole('alert')).toContainText('انتهت الجلسة');
    await page.getByRole('button', { name: 'الدخول للحساب نفسه' }).click(); await passwordLogin(page, 'outsider', secrets.password);
    await expect(page).toHaveURL(/error=same_account_required/);
    await expect(page.getByRole('alert')).toContainText('الحساب نفسه');
    await page.goto('/account?kind=company'); await page.getByRole('button', { name: 'الدخول للحساب نفسه' }).click();
    await passwordLogin(page, 'driver', secrets.password); await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('p07-expiry-evidence'))).toBe('retained');
    await pool.query('UPDATE tawsel.memberships SET enabled=false WHERE account_id=$1', [account]);
    await page.reload(); await expect(page.getByRole('alert')).toContainText('الوصول غير متاح');
    await page.screenshot({ path: 'output/playwright/phase-07-disabled-member.png', fullPage: true });
    await pool.query('UPDATE tawsel.memberships SET enabled=true WHERE account_id=$1', [account]);
    await page.reload(); await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
    const token = await (await fetch('http://localhost:8085/realms/tawsel-company/protocol/openid-connect/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) })).json();
    const revoke = await fetch('http://localhost:8085/admin/realms/tawsel-company/users/70000000-0000-4000-8000-000000000001/logout', { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}` } });
    expect(revoke.status).toBe(204);
    await page.reload(); await expect(page.getByRole('alert')).toContainText('انتهت الجلسة');
    expect(await page.evaluate(() => localStorage.getItem('p07-expiry-evidence'))).toBe('retained');
  } finally { await pool.query('UPDATE tawsel.memberships SET enabled=true WHERE account_id=$1', [account]); await pool.end(); }
});

test('C: unknown recovery email receives neutral acknowledgement; malformed proof has a clear recovery path', async ({ page }) => {
  const email = `unknown-${Date.now()}@example.test`;
  await page.goto('/recover?kind=personal'); await page.getByRole('button', { name: 'استعادة كلمة المرور', exact: true }).click();
  await page.getByLabel('البريد الإلكتروني للاستعادة', { exact: true }).fill(email); await page.locator('input[type="submit"]').click();
  await expect(page.getByText('من المفترض أن تتلقى بريدًا إلكترونيًا عما قريب يحتوي على مزيد من الإرشادات.')).toBeVisible();
  const messages = await (await fetch('http://127.0.0.1:8025/api/v1/messages')).json();
  expect(messages.messages.some((m: { To: { Address: string }[] }) => m.To.some(to => to.Address === email))).toBe(false);
  await page.goto('http://localhost:8085/realms/tawsel-personal/login-actions/action-token?key=invalid&client_id=tawsel-web');
  await expect(page.locator('#kc-content')).toContainText(/حدث خطأ/);
  await expect(page.locator('#password-new')).toHaveCount(0);
  await page.getByRole('link', { name: 'العودة لتوصيل واستعادة الحساب' }).click();
  await expect(page.getByRole('heading', { name: 'استعادة الحساب' })).toBeVisible();
});

test('C: issuer rejects a manipulated redirect; app errors and desktop/mobile layout stay usable', async ({ page, context }) => {
  await page.goto('/login/independent');
  const authorizationUrl = await page.evaluate(async () => {
    const { csrfToken } = await (await fetch('/api/session/bootstrap')).json();
    return (await (await fetch('/api/session/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ kind: 'personal' }) })).json()).authorizationUrl;
  });
  const wrong = new URL(authorizationUrl); wrong.searchParams.set('redirect_uri', 'https://example.invalid/callback');
  await page.goto(wrong.href); await expect(page.locator('#kc-content')).toContainText(/redirect_uri/);
  expect((await context.cookies()).some(c => c.name === '__Host-tawsel-personal')).toBe(false);
  for (const width of [360, 1366, 1440]) {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 900 });
    await page.goto('/login/company');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByLabel('كود الشركة (مطلوب)').focus(); await expect(page.getByLabel('كود الشركة (مطلوب)')).toBeFocused();
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  }
  await page.screenshot({ path: 'output/playwright/phase-07-desktop-login.png', fullPage: true });
  await page.route('**/api/session/bootstrap', route => route.abort());
  await page.getByLabel('كود الشركة (مطلوب)').fill('LOCAL'); await page.getByRole('button', { name: 'متابعة', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('تحقق من الإنترنت');
});
