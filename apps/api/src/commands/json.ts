import { createHash } from 'node:crypto';

// Hash v1: strict JSON, UTF-16 sorted object keys, preserved array order/string
// bytes, JSON number encoding (-0 = 0). No defaults, dropped undefined, toJSON,
// Unicode normalization, transport headers or server receipt times.
export function canonicalJson(value: unknown, ancestors = new Set<object>()): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== 'object' || ancestors.has(value)) throw new Error('Command value must be finite, acyclic JSON');
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length) throw new Error('Sparse or decorated JSON arrays are forbidden');
      return `[${Array.from(value, item => canonicalJson(item, ancestors)).join(',')}]`;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new Error('Command value must contain plain JSON objects');
    }
    if (Object.getOwnPropertySymbols(value).length) throw new Error('Symbol keys are not JSON');
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key], ancestors)}`).join(',')}}`;
  } finally { ancestors.delete(value); }
}

export const payloadHash = (value: unknown): string => createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');

export function freezeJson<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child);
    Object.freeze(value);
  }
  return value;
}
