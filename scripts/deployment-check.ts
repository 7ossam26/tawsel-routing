import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';

export interface ReleaseEvidence {
  project: string;
  target: string;
  composeSha256: string;
  images: { app: string; web: string; issuer: string };
  previousImages: { app: string; web: string; issuer: string };
  inventory: { recordedAt: string; engineMountsReviewed: boolean; portsReviewed: boolean; resourcesReviewed: boolean; privateNetworkReviewed: boolean };
  backup: { target: string; completedAt: string; restoredAt: string; separateFailureDomain: boolean; reportSha256: string; app: boolean; identity: boolean; secrets: boolean };
  oldQueueCheckPassed: boolean;
  environment: 'staging' | 'live';
}
const digest = /^\S+@sha256:[a-f0-9]{64}$/;
export function validateRelease(e: ReleaseEvidence, compose: string, now = Date.now()): void {
  const fail = () => { throw new Error('Release evidence incomplete, stale or mismatched; target mutation refused'); };
  const recent = (date: string, maxAge: number) => {
    const age = now - Date.parse(date); return Number.isFinite(age) && age >= 0 && age <= maxAge;
  };
  if (!e || typeof e.project !== 'string' || !/^[a-z][a-z0-9-]+$/.test(e.project) || typeof e.target !== 'string' || !e.target || /REPLACE|UNKNOWN|\.invalid/i.test(e.target)) fail();
  if (!['staging', 'live'].includes(e.environment)) fail();
  if (e.composeSha256 !== createHash('sha256').update(compose).digest('hex')) fail();
  for (const group of [e.images, e.previousImages]) for (const name of ['app', 'web', 'issuer'] as const) if (!digest.test(group?.[name] ?? '')) fail();
  const i = e.inventory, b = e.backup;
  if (!i || !recent(i.recordedAt, 86400000) || [i.engineMountsReviewed, i.portsReviewed, i.resourcesReviewed, i.privateNetworkReviewed].some(v => v !== true)) fail();
  if (!b || b.target !== e.target || !recent(b.completedAt, 900000) || !recent(b.restoredAt, 30 * 86400000)
    || [b.separateFailureDomain, b.app, b.identity, b.secrets, e.oldQueueCheckPassed].some(v => v !== true) || !/^[a-f0-9]{64}$/.test(b.reportSha256)) fail();
}

export function validateCompose(source: string): string[] {
  const document = parse(source, { merge: true });
  if (!document?.services || !document.networks?.engine?.external || !document.networks?.ingress?.external) throw new Error('Missing explicit external networks');
  for (const [name, service] of Object.entries(document.services) as [string, Record<string, unknown>][]) {
    if (service.ports || service.privileged || service.network_mode || service.container_name) throw new Error(`Unsafe service exposure: ${name}`);
    const image = String(service.image ?? '');
    if (!/^\$\{[A-Z_]+:\?[^}]+\}$/.test(image) && !digest.test(image)) throw new Error('Image must be explicitly pinned');
    if (/osrm|nominatim|vroom|preprocess/i.test(name)) throw new Error('Engine service must not be managed by app release');
    for (const volume of (service.volumes ?? []) as (string | Record<string, unknown>)[]) {
      if (typeof volume !== 'string' && (volume.read_only !== true || (volume.bind as { create_host_path?: boolean })?.create_host_path !== false)) throw new Error('Host mounts must exist and be read-only');
    }
  }
  return Object.keys(document.services);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const compose = await readFile('deploy/compose.yaml', 'utf8');
    console.log(`Application config checked: ${validateCompose(compose).join(', ')}. No target contacted.`);
    if (process.argv[2]) {
      validateRelease(JSON.parse(await readFile(process.argv[2], 'utf8')) as ReleaseEvidence, compose);
      console.log('Operator release evidence is current and matches this config. This checks attestations, not backup contents or target state.');
    }
  } catch {
    console.error('Deployment check refused; inspect configuration/evidence locally. No secret values logged.');
    process.exitCode = 1;
  }
}
