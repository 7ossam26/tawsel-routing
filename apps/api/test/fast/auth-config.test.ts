import { expect, test } from 'vitest';
import { normalizePhone, seal, unseal } from '../../src/auth/crypto.js';
import { parseAuthConfig } from '../../src/auth/config.js';
test('phone normalization is explicit, recovery email never becomes login identifier', () => {
  for (const value of ['010 0000 0000', '٠١٠٠٠٠٠٠٠٠٠', '00201000000000', '+20 (10) 0000-0000']) expect(normalizePhone(value)).toBe('+201000000000');
  for (const value of ['same@example.test', '123', '+00012345678']) expect(() => normalizePhone(value)).toThrow('phone_invalid');
});
test('tokens are authenticated ciphertext and cannot be opened with a wrong key or tampered data', () => {
  const key = Buffer.alloc(32, 1); const text = seal('private-refresh', key);
  expect(unseal(text, key)).toBe('private-refresh');
  expect(() => unseal(text, Buffer.alloc(32, 2))).toThrow();
  expect(() => unseal(text.slice(0, -5) + 'xxxxx', key)).toThrow();
});
test('production transport, independent realms and exact origins fail closed at startup', () => {
  const env = { TAWSEL_ORIGIN: 'https://tawsel.example', TAWSEL_SESSION_KEY: 'a'.repeat(64), TAWSEL_COMPANY_ISSUER: 'https://issuer.example/company', TAWSEL_PERSONAL_ISSUER: 'https://issuer.example/personal', TAWSEL_COMPANY_CLIENT_ID: 'tawsel', TAWSEL_PERSONAL_CLIENT_ID: 'tawsel', TAWSEL_COMPANY_CLIENT_SECRET: 'secret', TAWSEL_PERSONAL_CLIENT_SECRET: 'secret' };
  expect(parseAuthConfig(env).origin).toBe(env.TAWSEL_ORIGIN);
  expect(() => parseAuthConfig({ ...env, TAWSEL_ORIGIN: 'http://tawsel.example' })).toThrow();
  expect(() => parseAuthConfig({ ...env, TAWSEL_ORIGIN: 'https://tawsel.example/other' })).toThrow();
  expect(() => parseAuthConfig({ ...env, TAWSEL_PERSONAL_ISSUER: env.TAWSEL_COMPANY_ISSUER })).toThrow();
  expect(() => parseAuthConfig({ ...env, TAWSEL_SESSION_KEY: 'weak' })).toThrow();
});
