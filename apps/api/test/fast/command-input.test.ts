import { describe, expect, test } from 'vitest';
import { canonicalJson, payloadHash } from '../../src/commands/json.js';
import { parseDatabaseConfig } from '../../src/db/config.js';

describe('command identity input boundaries', () => {
  test('object order is semantic-equivalent; dependency order and original strings are preserved', () => {
    expect(payloadHash({ b: 2, a: { c: 1 } })).toBe(payloadHash({ a: { c: 1 }, b: 2 }));
    expect(payloadHash([1, 2])).not.toBe(payloadHash([2, 1]));
    expect(payloadHash('é')).not.toBe(payloadHash('e\u0301'));
    expect(canonicalJson({ amount: -0 })).toBe('{"amount":0}');
  });

  for (const [label, value] of Object.entries({
    undefined: { amount: undefined }, nonfinite: { amount: Infinity },
    sparse: new Array(1), date: new Date(0), bigint: 1n,
    symbol: { [Symbol('hidden')]: 1 }
  })) {
    test(`rejects ${label} rather than dropping or coercing identity fields`, () => {
      expect(() => canonicalJson(value)).toThrow();
    });
  }

  test('rejects cyclic input', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow();
  });

  test('URL target errors never expose credentials or accept unsafe host/query defaults', () => {
    for (const url of [
      'postgres://user:do-not-print@localhost:0/tawsel_app_dev',
      'postgres://user:do-not-print@remote:5432/tawsel_app_dev?sslmode=disable',
      'postgres://user:do-not-print@localhost:5432/nominatim',
      'postgres://user:do-not-print@localhost:5432/tawsel_app_dev?options=-csearch_path=nominatim',
      'postgres://user:%ZZdo-not-print@localhost:5432/tawsel_app_dev'
    ]) {
      try { parseDatabaseConfig(url, 'application'); throw new Error('unexpected accepted URL'); }
      catch (error) {
        expect((error as Error).message).toContain('Dedicated Tawsel database');
        expect((error as Error).message).not.toContain('do-not-print');
      }
    }
  });
});
