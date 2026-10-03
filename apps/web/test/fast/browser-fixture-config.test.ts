import { describe, expect, it } from 'vitest';
import { browserFixtureConfig } from '../../../../scripts/browser-fixture-config.js';

describe('private browser fixture port', () => {
  it('keeps the existing default origin', () => {
    expect(browserFixtureConfig({})).toEqual({ port: 5173, origin: 'http://localhost:5173' });
  });

  it.each(['1024', '5189', '65535'])('uses an explicit valid port %s', port => {
    expect(browserFixtureConfig({ TAWSEL_BROWSER_PORT: port })).toEqual({ port: Number(port), origin: `http://localhost:${port}` });
  });

  it.each(['', '1023', '65536', '-5189', '5189.5', '5e3', ' 5189 ', 'NaN'])('rejects invalid port %j', port => {
    expect(() => browserFixtureConfig({ TAWSEL_BROWSER_PORT: port })).toThrow('TAWSEL_BROWSER_PORT must be an integer between 1024 and 65535');
  });
});
