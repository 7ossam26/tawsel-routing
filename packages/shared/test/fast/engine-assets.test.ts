import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { MLD_REQUIRED_PARTS, OSRM_IMAGE, validateAssetEntries, validateProvenance } from '../../../../scripts/engine-assets.mjs';
import { parseAssetVerifyArguments, verifyAssets } from '../../../../scripts/pilot-asset-verify.mjs';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const sourceBytes = 'isolated fixture PBF';
const provenance = (status = 'complete') => ({
  schemaVersion: 1,
  modes: ['car', 'motorcycle'],
  source: { file: 'egypt-261002.osm.pbf', url: 'https://download.geofabrik.de/africa/egypt-261002.osm.pbf', sizeBytes: Buffer.byteLength(sourceBytes), sha256: hash(sourceBytes) },
  osrmImage: OSRM_IMAGE,
  profiles: {
    car: { dataset: 'egypt-261002.osrm', status },
    motorcycle: { dataset: 'egypt-motorcycle.osrm', status, profileSha256: hash('motorcycle lua') }
  },
  capturedAtUtc: '2026-10-03T00:00:00Z',
  osrmVersion: 'v6.0.0'
});
const asset = (path: string, bytes = 'data') => ({ path, sizeBytes: Buffer.byteLength(bytes), sha256: hash(bytes) });
const bootstrap = () => [asset('pbf/egypt-261002.osm.pbf', sourceBytes), asset('.local/maps/manifest.json', '{}')];
const complete = () => [
  ...bootstrap(),
  ...['egypt-261002.osrm', 'egypt-motorcycle.osrm'].flatMap(dataset => MLD_REQUIRED_PARTS.map((part: string) => asset(`data/${dataset}.${part}`)))
];
const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))); });

describe('two-mode engine provenance and transfer manifest', () => {
  it('exports the pinned runtime input set and derives complete readiness without trusting metadata', () => {
    expect(MLD_REQUIRED_PARTS).toHaveLength(20);
    expect(new Set(MLD_REQUIRED_PARTS).size).toBe(20);
    expect(MLD_REQUIRED_PARTS).toEqual(expect.arrayContaining(['cell_metrics', 'cells', 'mldgr', 'partition', 'fileIndex', 'ramIndex']));
    const evidence = { ...provenance(), ready: false };
    const entries = complete();
    const before = structuredClone({ evidence, entries });
    const report = validateAssetEntries(entries, evidence);
    expect(report).toMatchObject({ ready: true, readiness: { car: true, motorcycle: true }, files: 42 });
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
    expect(validateProvenance(evidence)).toEqual(provenance());
    expect({ evidence, entries }).toEqual(before);
  });

  it('requires explicit incomplete bootstrap and computes false readiness for pending and failed profiles', () => {
    for (const status of ['pending', 'failed']) {
      const evidence = { ...provenance(status), ready: true };
      expect(() => validateProvenance(evidence)).toThrow('requires allowIncomplete');
      expect(validateProvenance(evidence, { allowIncomplete: true })).toEqual(provenance(status));
      expect(validateAssetEntries(bootstrap(), evidence, { allowIncomplete: true })).toMatchObject({ ready: false, readiness: { car: false, motorcycle: false }, files: 2 });
      expect(() => validateAssetEntries([...bootstrap(), asset('data/egypt-261002.osrm.cells')], evidence, { allowIncomplete: true })).toThrow('Partial car');
    }
  });

  it('reports individual readiness when one profile is complete and the other is pending', () => {
    const evidence = provenance();
    evidence.profiles.motorcycle.status = 'pending';
    const entries = complete().filter(entry => !entry.path.startsWith('data/egypt-motorcycle.osrm.'));
    expect(validateAssetEntries(entries, evidence, { allowIncomplete: true })).toMatchObject({ ready: false, readiness: { car: true, motorcycle: false } });
  });

  it.each([
    ['missing part', (entries: ReturnType<typeof complete>) => entries.filter(entry => entry.path !== 'data/egypt-motorcycle.osrm.cell_metrics')],
    ['empty part', (entries: ReturnType<typeof complete>) => entries.map(entry => entry.path === 'data/egypt-261002.osrm.partition' ? { ...entry, sizeBytes: 0 } : entry)]
  ])('rejects a claimed complete dataset with a %s', (_name, change) => {
    expect(() => validateAssetEntries(change(complete()), provenance())).toThrow(/Missing or empty .* MLD part/);
  });

  it.each([
    'data/egypt-bicycle.osrm.cells', 'data/egypt-260930.osrm.cells', 'data/egypt-261002.osrm',
    'data/egypt-261002.osrm.cells/nested', 'data/egypt-261002.osrm.cells.evil', 'pbf/egypt-latest.osm.pbf'
  ])('rejects extraneous or malformed fresh data: %s', path => {
    expect(() => validateAssetEntries([...complete(), asset(path)], provenance())).toThrow();
  });

  it.each([
    'data/../outside', '.local/maps/../../outside', 'data\\outside', 'data/C:secret',
    '.local/maps//style.json', '.local/maps/./style.json', '/data/file', '.local/maps/style\u0000.json'
  ])('rejects unsafe asset path %s even in legacy verification', path => {
    expect(() => validateAssetEntries([asset(path)])).toThrow(/Unsafe|Unexpected/);
  });

  it('rejects duplicate paths, including aliases on the Windows source filesystem', () => {
    expect(() => validateAssetEntries([...complete(), complete()[0]], provenance())).toThrow('Duplicate');
    expect(() => validateAssetEntries([asset('.local/maps/style.json'), asset('.local/maps/STYLE.json')])).toThrow('Duplicate');
  });

  it('requires exactly the declared raw source bytes and their hash before readiness', () => {
    expect(() => validateAssetEntries(complete().filter(entry => !entry.path.startsWith('pbf/')), provenance())).toThrow('Raw PBF asset is required');
    for (const changed of [{ sizeBytes: 1 }, { sha256: hash('other source') }]) {
      const entries = complete().map(entry => entry.path.startsWith('pbf/') ? { ...entry, ...changed } : entry);
      expect(() => validateAssetEntries(entries, provenance())).toThrow('Raw PBF asset does not match');
    }
  });

  it('rejects unsafe source evidence and profile collisions without altering evidence', () => {
    const invalid = [
      { ...provenance(), modes: ['car', 'motorcycle', 'bicycle'] },
      { ...provenance(), modes: ['motorcycle', 'car'] },
      { ...provenance(), osrmImage: 'ghcr.io/project-osrm/osrm-backend:latest' },
      { ...provenance(), source: { ...provenance().source, url: 'https://example.org/egypt-261002.osm.pbf' } },
      { ...provenance(), source: { ...provenance().source, file: '../egypt-261002.osm.pbf' } },
      { ...provenance(), source: { ...provenance().source, file: 'egypt-261332.osm.pbf', url: 'https://download.geofabrik.de/africa/egypt-261332.osm.pbf' } },
      { ...provenance(), source: { ...provenance().source, sizeBytes: 0 } },
      { ...provenance(), source: { ...provenance().source, sha256: 'bad' } },
      { ...provenance(), profiles: { ...provenance().profiles, bicycle: provenance().profiles.car } },
      { ...provenance(), profiles: { ...provenance().profiles, car: { ...provenance().profiles.car, dataset: 'egypt-bicycle.osrm' } } },
      { ...provenance(), profiles: { ...provenance().profiles, motorcycle: { ...provenance().profiles.motorcycle, dataset: 'EGYPT-261002.osrm' } } },
      { ...provenance(), profiles: { ...provenance().profiles, motorcycle: { ...provenance().profiles.motorcycle, profileSha256: undefined } } },
      { ...provenance(), profiles: { ...provenance().profiles, car: { ...provenance().profiles.car, profileSha256: 'bad' } } },
      { ...provenance(), profiles: { ...provenance().profiles, car: { ...provenance().profiles.car, status: 'ready' } } }
    ];
    const before = structuredClone(invalid);
    for (const evidence of invalid) expect(() => validateProvenance(evidence)).toThrow();
    expect(invalid).toEqual(before);
  });

  it('canonicalizes evidence without exporting local arbitrary metadata or claimed readiness', () => {
    const evidence = {
      ...provenance(), ready: true, apiToken: 'must not export', metadata: { password: 'must not export' },
      source: { ...provenance().source, authorization: 'must not export' },
      profiles: { ...provenance().profiles, car: { ...provenance().profiles.car, environment: { secret: 'must not export' } } }
    };
    expect(validateProvenance(evidence)).toEqual(provenance());
    expect(JSON.stringify(validateProvenance(evidence))).not.toContain('must not export');
  });

  it('keeps historical three-positional verification compatible without assigning routing readiness', () => {
    const report = validateAssetEntries([asset('data/egypt-bicycle.osrm.cells'), asset('.local/maps/styles/style.json')]);
    expect(report).toMatchObject({ files: 2, ready: false, readiness: { car: false, motorcycle: false } });
    expect(parseAssetVerifyArguments(['ASSETS.json', 'data', 'maps'])).toMatchObject({ manifestFile: 'ASSETS.json', dataDirectory: 'data', mapsDirectory: 'maps', provenanceFile: undefined });
  });

  it('parses provenance/root flags and rejects incomplete, repeated or unknown options', () => {
    expect(parseAssetVerifyArguments(['ASSETS.json', 'data', 'maps', '--pbf-directory', 'pbf', '--provenance', 'PROVENANCE.json'])).toMatchObject({ pbfDirectory: 'pbf', provenanceFile: 'PROVENANCE.json' });
    for (const flags of [
      ['--provenance', 'file'], ['--pbf-directory', 'pbf'], ['--wat', 'file'],
      ['--provenance'], ['--allow-incomplete'], ['--pbf-directory', 'pbf', '--pbf-directory', 'other'],
      ['--pbf-directory', 'pbf', '--provenance', 'file', '--allow-incomplete', '--allow-incomplete']
    ]) expect(() => parseAssetVerifyArguments(['ASSETS.json', 'data', 'maps', ...flags])).toThrow();
  });

  it('verifies actual bootstrap files then rejects changed bytes even when their size is unchanged', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tawsel-engine-assets-'));
    temporaryDirectories.push(directory);
    const dataDirectory = join(directory, 'data');
    const mapsDirectory = join(directory, 'maps');
    const pbfDirectory = join(directory, 'pbf');
    await Promise.all([dataDirectory, mapsDirectory, pbfDirectory].map(path => mkdir(path)));
    const manifestFile = join(directory, 'ASSETS.json');
    const provenanceFile = join(directory, 'PROVENANCE.json');
    await writeFile(manifestFile, JSON.stringify(bootstrap()));
    await writeFile(provenanceFile, JSON.stringify(provenance('pending')));
    await writeFile(join(pbfDirectory, 'egypt-261002.osm.pbf'), sourceBytes);
    await writeFile(join(mapsDirectory, 'manifest.json'), '{}');
    const options = { manifestFile, dataDirectory, mapsDirectory, pbfDirectory, provenanceFile, allowIncomplete: true };
    const before = await readFile(provenanceFile, 'utf8');
    expect(await verifyAssets(options)).toEqual({ result: 'verified', files: 2, totalBytes: Buffer.byteLength(sourceBytes) + 2, ready: false, readiness: { car: false, motorcycle: false } });
    await expect(verifyAssets({ ...options, allowIncomplete: false })).rejects.toThrow('requires allowIncomplete');
    const { stdout } = await promisify(execFile)(process.execPath, [resolve('scripts/pilot-asset-verify.mjs'), manifestFile, dataDirectory, mapsDirectory, '--pbf-directory', pbfDirectory, '--provenance', provenanceFile, '--allow-incomplete']);
    expect(JSON.parse(stdout.trim().split(/\r?\n/).at(-1)!)).toMatchObject({ result: 'verified', ready: false, files: 2 });
    await writeFile(join(pbfDirectory, 'egypt-261002.osm.pbf'), 'x'.repeat(Buffer.byteLength(sourceBytes)));
    await expect(verifyAssets(options)).rejects.toThrow('SHA-256 mismatch');
    expect(await readFile(provenanceFile, 'utf8')).toBe(before);
  });

  it('runs the unchanged legacy CLI against historical file names without provenance', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tawsel-engine-legacy-'));
    temporaryDirectories.push(directory);
    const dataDirectory = join(directory, 'data');
    const mapsDirectory = join(directory, 'maps');
    await Promise.all([mkdir(dataDirectory), mkdir(mapsDirectory)]);
    const manifestFile = join(directory, 'ASSETS.json');
    await writeFile(join(dataDirectory, 'egypt-bicycle.osrm.cells'), 'data');
    await writeFile(manifestFile, JSON.stringify([asset('data/egypt-bicycle.osrm.cells')]));
    const { stdout } = await promisify(execFile)(process.execPath, [resolve('scripts/pilot-asset-verify.mjs'), manifestFile, dataDirectory, mapsDirectory]);
    expect(JSON.parse(stdout.trim().split(/\r?\n/).at(-1)!)).toEqual({ result: 'verified', files: 1, totalBytes: 4 });
  });
});
