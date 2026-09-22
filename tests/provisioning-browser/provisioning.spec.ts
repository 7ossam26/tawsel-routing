import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { provisioningClient, type ProvisioningCommand } from '../../packages/api-client/src/provisioning.js';

test('C: public provision → real Keycloak login → changed role → disabled membership and issuer session revocation', async ({ page }) => {
  const config = JSON.parse(await readFile('.local/provisioning/consumer.json', 'utf8')) as { apiUrl: string; token: string; tenantId: string; integrationId: string; companyCode: string; users: { username: string; subject: string }[] };
  const setup = JSON.parse(await readFile('.local/provisioning/setup.json', 'utf8')) as { password: string };
  const client = provisioningClient(config.apiUrl, config.token);
  async function revision(entity: 'role' | 'user', id: string) {
    const response = await client.status(entity, id); expect(response.status).toBe(200);
    if (!('sourceRevision' in response.body)) throw new Error('Missing source revision');
    return response.body.sourceRevision + 1;
  }
  async function command(operationId: ProvisioningCommand['operationId'], payload: object) {
    const body = { schemaVersion: '1.0.0', payloadVersion: '1.0.0', actionId: randomUUID(), operationId,
      context: { kind: 'integration', tenantId: config.tenantId, integrationId: config.integrationId }, resources: {}, baseVersions: {}, dependsOnActionIds: [],
      observation: { observedAt: null, clock: { quality: 'unknown' } }, payload } as ProvisioningCommand;
    const response = await client.command(body); expect(response.status).toBe(200);
    return response;
  }
  const worker = () => promisify(execFile)(process.execPath, ['--env-file=.env.database.local','--env-file=.env.identity.local','--env-file=.env.provisioning.local','--import','tsx','scripts/provisioning-worker.ts','--once'], { windowsHide: true });
  await command('role.defineCapabilities', { externalId: 'driver-role', sourceRevision: await revision('role','driver-role'), name: 'ERP role', capabilities: ['execution.own','monitor.read'] });
  const user = config.users[0]!;
  await command('user.provision', { externalId: 'driver-1', sourceRevision: await revision('user','driver-1'), subject: user.subject, roleExternalId: 'driver-role', branchExternalIds: ['cairo','giza'], enabled: true });
  expect((await client.status('user','driver-1')).body).toMatchObject({ issuerStatus: 'pending' });
  await worker();
  expect((await client.status('user','driver-1')).body).toMatchObject({ issuerStatus: 'ready' });
  await page.goto('/login');
  const start = await page.evaluate(async companyCode => {
    const { csrfToken } = await (await fetch('/api/session/bootstrap')).json();
    return (await fetch('/api/session/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ kind: 'company', companyCode }) })).json();
  }, config.companyCode);
  await page.goto(start.authorizationUrl);
  await page.locator('#username').fill(user.username);
  await page.locator('#password').fill(setup.password);
  await page.locator('#kc-login').click();
  await expect(page).toHaveURL(/\/account\?kind=company/);
  const context = () => page.evaluate(async () => { const r = await fetch('/api/session/context?kind=company'); return { status: r.status, body: await r.json() }; });
  const initial = await context(); expect(initial.status).toBe(200);
  expect(initial.body.access.effectiveCapabilities).toEqual(['execution.own','reports.read']);
  expect(initial.body.access.branchIds).toHaveLength(2); expect(initial.body.access.driverId).not.toBeNull();
  await expect(page.getByText('أنت مسجّل الدخول')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/phase-08-provisioned-account.png', fullPage: true });
  await command('role.defineCapabilities', { externalId: 'driver-role', sourceRevision: await revision('role','driver-role'), name: 'ERP role changed', capabilities: ['monitor.read'] });
  expect((await context()).body.access.effectiveCapabilities).toEqual(['reports.read']);
  await command('user.disable', { externalId: 'driver-1', sourceRevision: await revision('user','driver-1') });
  expect((await context()).status).toBe(403); // denies before the external worker
  expect((await client.status('user','driver-1')).body).toMatchObject({ issuerStatus: 'pending' });
  await page.reload();
  await expect(page.getByText('الوصول غير متاح لهذا الحساب. راجع مسؤول الشركة أو استعد حسابك.')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/phase-08-disabled-account.png', fullPage: true });
  await worker(); expect((await client.status('user','driver-1')).body).toMatchObject({ issuerStatus: 'ready' });
  // Direct issuer read proves the actual external logout effect, not just local 403.
  const secrets = JSON.parse(await readFile('.local/identity/secrets.json','utf8')) as { control: string };
  const tokenResponse = await fetch('http://localhost:8085/realms/tawsel-company/protocol/openid-connect/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'local-test-control', client_secret: secrets.control }) });
  expect(tokenResponse.status).toBe(200); const token = await tokenResponse.json() as { access_token: string };
  const sessions = await fetch(`http://localhost:8085/admin/realms/tawsel-company/users/${encodeURIComponent(user.subject)}/sessions`, { headers: { authorization: `Bearer ${token.access_token}` } });
  expect(sessions.status).toBe(200); expect(await sessions.json()).toEqual([]);
});
