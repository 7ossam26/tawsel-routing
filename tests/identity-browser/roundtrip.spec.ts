import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const secrets = JSON.parse(await readFile('.local/identity/secrets.json', 'utf8')) as { password: string };
test('A: real Keycloak code + PKCE creates a company session bound to P06', async ({ page, context }) => {
  await page.goto('/login');
  const start = await page.evaluate(async () => {
    const { csrfToken } = await (await fetch('/api/session/bootstrap')).json();
    return (await fetch('/api/session/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ kind: 'company', companyCode: 'LOCAL' }) })).json();
  });
  expect(start.authorizationUrl).toContain('code_challenge_method=S256');
  await page.goto(start.authorizationUrl);
  await page.locator('#username').fill('driver');
  await page.locator('#password').fill(secrets.password);
  await page.locator('#kc-login').click();
  await expect(page).toHaveURL(/\/account\?kind=company/);
  const response = await page.evaluate(async () => (await fetch('/api/session/context?kind=company')).json());
  expect(response, JSON.stringify(response)).toHaveProperty('access.tenantKind', 'company');
  expect(response.access.effectiveCapabilities).toContain('execution.own');
  const cookie = (await context.cookies()).find(c => c.name === '__Host-tawsel-company');
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('tawsel-company');
});
