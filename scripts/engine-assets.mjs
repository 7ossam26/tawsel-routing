export const OSRM_IMAGE = 'ghcr.io/project-osrm/osrm-backend@sha256:8a1b1bc938412f15f9b5b32d794c4ec6bf4a85dfbbabfa0a014b70b187edb53b';

// osrm-routed --algorithm mld --list-inputs for the pinned image above.
export const MLD_REQUIRED_PARTS = Object.freeze([
  'datasource_names', 'ebg_nodes', 'edges', 'fileIndex', 'geometry', 'icd',
  'maneuver_overrides', 'names', 'nbg_nodes', 'properties', 'ramIndex',
  'timestamp', 'tld', 'tls', 'turn_duration_penalties', 'turn_weight_penalties',
  'cells', 'cell_metrics', 'mldgr', 'partition'
]);

const modes = ['car', 'motorcycle'];
const sha256Pattern = /^[a-f0-9]{64}$/;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (message) => { throw new Error(message); };
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function safeBasename(value, suffix) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
    && !value.includes('..') && value.endsWith(suffix);
}

/** Validate evidence without reading or changing assets. Incomplete bootstrap must be explicit. */
export function validateProvenance(value, { allowIncomplete = false } = {}) {
  if (!isObject(value) || value.schemaVersion !== 1) fail('Provenance schemaVersion must be 1');
  if (!Array.isArray(value.modes) || value.modes.length !== modes.length
    || value.modes.some((mode, index) => mode !== modes[index])) {
    fail('Provenance modes must be exactly car and motorcycle');
  }
  if (value.osrmImage !== OSRM_IMAGE) fail('Provenance OSRM image does not match the pinned image');
  const source = value.source;
  if (!isObject(source) || !safeBasename(source.file, '.osm.pbf')
    || !/^egypt-\d{6}\.osm\.pbf$/.test(source.file)) {
    fail('Provenance source must be a dated Egypt PBF basename');
  }
  const stamp = source.file.slice(6, 12);
  const year = 2000 + Number(stamp.slice(0, 2));
  const month = Number(stamp.slice(2, 4));
  const day = Number(stamp.slice(4, 6));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    fail('Provenance source date is invalid');
  }
  if (source.url !== `https://download.geofabrik.de/africa/${source.file}`) {
    fail('Provenance source URL must match the official dated Egypt PBF');
  }
  if (!Number.isSafeInteger(source.sizeBytes) || source.sizeBytes <= 0
    || !sha256Pattern.test(source.sha256 ?? '')) {
    fail('Provenance source size or SHA-256 is invalid');
  }
  if (!isObject(value.profiles) || Object.keys(value.profiles).length !== modes.length
    || modes.some((mode) => !hasOwn(value.profiles, mode))) {
    fail('Provenance profiles must be exactly car and motorcycle');
  }
  const datasets = new Set();
  for (const mode of modes) {
    const profile = value.profiles[mode];
    if (!isObject(profile) || !safeBasename(profile.dataset, '.osrm')
      || /bicycle|cycling|bike/i.test(profile.dataset)) fail(`Invalid ${mode} dataset basename`);
    // Windows source evidence must not alias case-insensitively either.
    const datasetKey = profile.dataset.toLowerCase();
    if (datasets.has(datasetKey)) fail('Provenance profile datasets must be distinct');
    datasets.add(datasetKey);
    if (!['pending', 'failed', 'complete'].includes(profile.status)) fail(`Invalid ${mode} profile status`);
    if (!allowIncomplete && profile.status !== 'complete') fail(`Incomplete ${mode} profile requires allowIncomplete`);
    if (mode === 'motorcycle' || hasOwn(profile, 'profileSha256')) {
      if (!sha256Pattern.test(profile.profileSha256 ?? '')) fail(`Invalid ${mode} profile SHA-256`);
    }
  }
  // Only reviewed evidence is exported; arbitrary metadata can contain local credentials.
  const profiles = Object.fromEntries(modes.map((mode) => {
    const profile = value.profiles[mode];
    return [mode, {
      dataset: profile.dataset, status: profile.status,
      ...(hasOwn(profile, 'profileSha256') ? { profileSha256: profile.profileSha256 } : {})
    }];
  }));
  const canonical = {
    schemaVersion: 1, modes: [...modes],
    source: { file: source.file, url: source.url, sizeBytes: source.sizeBytes, sha256: source.sha256 },
    osrmImage: OSRM_IMAGE, profiles
  };
  if (hasOwn(value, 'osrmVersion')) {
    if (typeof value.osrmVersion !== 'string' || !/^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.osrmVersion)) {
      fail('Invalid provenance OSRM version');
    }
    canonical.osrmVersion = value.osrmVersion;
  }
  if (hasOwn(value, 'capturedAtUtc')) {
    if (typeof value.capturedAtUtc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.capturedAtUtc)
      || !Number.isFinite(Date.parse(value.capturedAtUtc))) fail('Invalid provenance capture timestamp');
    canonical.capturedAtUtc = value.capturedAtUtc;
  }
  return canonical;
}

function safeAssetPath(path) {
  return typeof path === 'string' && !path.includes('\\') && !path.includes(':')
    && !Array.from(path).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    && path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

/** Validate an asset manifest and compute readiness from its entries, never from a claimed flag. */
export function validateAssetEntries(entries, provenance, { allowIncomplete = false } = {}) {
  if (!Array.isArray(entries) || entries.length === 0) fail('Asset manifest must be a nonempty array');
  const evidence = provenance === undefined ? undefined : validateProvenance(provenance, { allowIncomplete });
  const seen = new Set();
  const parts = Object.fromEntries(modes.map((mode) => [mode, new Map()]));
  const canonical = [];
  let sourceSeen = false;
  let totalBytes = 0;
  for (const entry of entries) {
    if (!isObject(entry) || !safeAssetPath(entry.path)) fail(`Unsafe asset path: ${entry?.path ?? ''}`);
    if (!Number.isSafeInteger(entry.sizeBytes) || entry.sizeBytes < 0
      || !sha256Pattern.test(entry.sha256 ?? '')) fail(`Invalid asset entry: ${entry.path}`);
    const key = entry.path.toLowerCase();
    if (seen.has(key)) fail(`Duplicate asset path: ${entry.path}`);
    seen.add(key);
    if (entry.path.startsWith('.local/maps/')) {
      // Basemap tiles, fonts, styles and their JSON metadata share this preserved root.
    } else if (entry.path.startsWith('data/')) {
      if (evidence) {
        const mode = modes.find((candidate) => entry.path.startsWith(`data/${evidence.profiles[candidate].dataset}.`));
        if (!mode) fail(`Extraneous routing data: ${entry.path}`);
        const suffix = entry.path.slice(`data/${evidence.profiles[mode].dataset}.`.length);
        if (!/^[A-Za-z0-9_-]+$/.test(suffix)) fail(`Invalid OSRM part: ${entry.path}`);
        if (evidence.profiles[mode].status !== 'complete') fail(`Partial ${mode} outputs cannot be exported`);
        parts[mode].set(suffix, entry.sizeBytes);
      }
    } else if (evidence && entry.path === `pbf/${evidence.source.file}`) {
      if (entry.sizeBytes !== evidence.source.sizeBytes || entry.sha256 !== evidence.source.sha256) {
        fail('Raw PBF asset does not match provenance hash and size');
      }
      sourceSeen = true;
    } else {
      fail(`Unexpected asset path: ${entry.path}`);
    }
    totalBytes += entry.sizeBytes;
    if (!Number.isSafeInteger(totalBytes)) fail('Asset total size exceeds safe integer range');
    canonical.push({ path: entry.path, sizeBytes: entry.sizeBytes, sha256: entry.sha256 });
  }
  const readiness = { car: false, motorcycle: false };
  if (evidence) {
    if (!sourceSeen) fail('Raw PBF asset is required by provenance');
    for (const mode of modes) {
      if (evidence.profiles[mode].status !== 'complete') continue;
      for (const part of MLD_REQUIRED_PARTS) {
        if (!(parts[mode].get(part) > 0)) fail(`Missing or empty ${mode} MLD part: ${part}`);
      }
      readiness[mode] = true;
    }
  }
  return { entries: canonical, ready: readiness.car && readiness.motorcycle, readiness, files: canonical.length, totalBytes };
}
