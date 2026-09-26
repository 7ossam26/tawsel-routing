import { test, expect } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateCompose, validateRelease, type ReleaseEvidence } from '../../../../scripts/deployment-check.js';
import { retainAssets } from '../../../../scripts/deployment-assets.js';
import { realmConfiguration, prepareTheme, type IdentityInput } from '../../../../scripts/deployment-identity.js';

test('rejects exposed ports, writable Engine mounts and mutable images in application config', async () => {
  const source = (await readFile('deploy/compose.yaml', 'utf8')).replaceAll('\r\n', '\n');
  expect(validateCompose(source)).toContain('migrate');
  expect(() => validateCompose(source.replace('  api:\n', '  api:\n    ports: ["3000:3001"]\n'))).toThrow();
  expect(() => validateCompose(source.replace('read_only: true\n        bind:', 'read_only: false\n        bind:'))).toThrow();
  expect(() => validateCompose(source.replace('${WEB_IMAGE:?immutable web image required}', 'nginx:latest'))).toThrow();
});

test('requires current target-bound inventory, restore evidence and exact release config', () => {
  const now = Date.now(), date = new Date(now - 1000).toISOString(), image = 'example/app@sha256:' + 'a'.repeat(64), compose = 'fixture';
  const e: ReleaseEvidence = { environment: 'live', project: 'tawsel-fixture', target: 'fixture-host', composeSha256: createHash('sha256').update(compose).digest('hex'), images: { app: image, web: image, issuer: image }, previousImages: { app: image, web: image, issuer: image }, inventory: { recordedAt: date, engineMountsReviewed: true, portsReviewed: true, resourcesReviewed: true, privateNetworkReviewed: true }, backup: { target: 'fixture-host', completedAt: date, restoredAt: date, separateFailureDomain: true, reportSha256: 'b'.repeat(64), app: true, identity: true, secrets: true, measuredRpoSeconds: 60, measuredRtoSeconds: 90, archiveHealthy: true, businessCheckpointVerified: true }, oldQueueCheckPassed: true };
  expect(() => validateRelease(e, compose, now)).not.toThrow();
  for (const modified of [
    { ...e, backup: { ...e.backup, measuredRpoSeconds: 901 } },
    { ...e, backup: { ...e.backup, measuredRtoSeconds: 14401 } },
    { ...e, backup: { ...e.backup, measuredRpoSeconds: NaN } },
    { ...e, backup: { ...e.backup, measuredRtoSeconds: -1 } },
    { ...e, backup: { ...e.backup, archiveHealthy: false } },
    { ...e, backup: { ...e.backup, businessCheckpointVerified: false } },
    { ...e, backup: { ...e.backup, separateFailureDomain: false } },
    { ...e, backup: { ...e.backup, identity: false } },
    { ...e, backup: { ...e.backup, secrets: false } },
    { ...e, composeSha256: 'wrong' }, { ...e, oldQueueCheckPassed: false },
    { ...e, backup: { ...e.backup, completedAt: new Date(now - 901000).toISOString() } },
    { ...e, backup: { ...e.backup, target: 'other-host' } },
    { ...e, backup: { ...e.backup, restoredAt: '' } },
    { ...e, images: { ...e.images, app: 'example/app:latest' } }
  ]) expect(() => validateRelease(modified, compose, now)).toThrow();
});

test('web update and rollback preserve old hashed bytes and refuse immutable collisions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tawsel-assets-'));
  try {
    const first = join(root, 'first'), next = join(root, 'next'), kept = join(root, 'kept');
    await mkdir(join(first, 'assets'), { recursive: true }); await mkdir(join(next, 'assets'), { recursive: true });
    await writeFile(join(first, 'assets', 'old.js'), 'old queued reader'); await writeFile(join(first, 'workbox-old.js'), 'old worker');
    await writeFile(join(next, 'assets', 'new.js'), 'new compatible reader');
    await retainAssets(first, kept); await retainAssets(next, kept); await retainAssets(first, kept);
    expect(await readFile(join(kept, 'assets', 'old.js'), 'utf8')).toBe('old queued reader');
    expect(await readFile(join(kept, 'assets', 'new.js'), 'utf8')).toBe('new compatible reader');
    expect(await readFile(join(kept, 'workbox-old.js'), 'utf8')).toBe('old worker');
    await writeFile(join(next, 'assets', 'old.js'), 'incompatible collision');
    await expect(retainAssets(next, kept)).rejects.toThrow('collision');
    expect(await readFile(join(kept, 'assets', 'old.js'), 'utf8')).toBe('old queued reader');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('production identity prepares exact redirects, separate secrets, phone policy and verified-email recovery without seeded users', async () => {
  const input: IdentityInput = { appOrigin: 'https://tawsel.example.test', companySecret: 'a'.repeat(64), personalSecret: 'b'.repeat(64), workerSecret: 'c'.repeat(64), smtp: { host: 'smtp.example.test', port: '587', from: 'sender@example.test', user: 'fixture', password: 'fixture-only', starttls: 'true', auth: 'true' } };
  const realms = await realmConfiguration(input), company = realms[0]!, personal = realms[1]!;
  expect(company.clients[0]!.redirectUris).toEqual(['https://tawsel.example.test/api/session/callback']);
  expect(company.clients[0]!.secret).not.toBe(personal.clients[0]!.secret);
  expect(personal.loginWithEmailAllowed).toBe(false); expect(personal.verifyEmail).toBe(true);
  expect(personal.users).toEqual([]); expect(personal.resetCredentialsFlow).toBe('tawsel-email-recovery');
  await expect(realmConfiguration({ ...input, appOrigin: 'http://tawsel.example.test' })).rejects.toThrow();
  await expect(realmConfiguration({ ...input, personalSecret: input.companySecret })).rejects.toThrow();
  const root = await mkdtemp(join(tmpdir(), 'tawsel-theme-'));
  try {
    await prepareTheme(input.appOrigin, root);
    const js = await readFile(join(root, 'login/resources/js/tawsel.js'), 'utf8');
    expect(js).toContain(input.appOrigin); expect(js).not.toContain('__TAWSEL_APP_ORIGIN__');
    expect((await readFile(join(root, 'login/resources/fonts/cairo.woff2'))).byteLength).toBeGreaterThan(1000);
  } finally { await rm(root, { recursive: true, force: true }); }
});
