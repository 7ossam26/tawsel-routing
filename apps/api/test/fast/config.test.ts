import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '@tawsel/shared';
import { parseApiConfig } from '../../src/config.js';

describe('API configuration', () => {
  it('accepts an explicit local host and valid port', () => {
    expect(
      parseApiConfig({
        TAWSEL_API_HOST: '127.0.0.1',
        TAWSEL_API_PORT: '3001'
      })
    ).toEqual({ host: '127.0.0.1', port: 3001 });
  });

  it('rejects a missing host instead of inventing a network binding', () => {
    expect(() =>
      parseApiConfig({ TAWSEL_API_PORT: '3001' })
    ).toThrow(new ConfigurationError('TAWSEL_API_HOST is required'));
  });

  it.each(['0', '65536', 'not-a-port', '3001.5'])(
    'rejects malformed port %s with the configuration key in the error',
    (port) => {
      expect(() =>
        parseApiConfig({
          TAWSEL_API_HOST: '127.0.0.1',
          TAWSEL_API_PORT: port
        })
      ).toThrow('TAWSEL_API_PORT must be an integer between 1 and 65535');
    }
  );
});
