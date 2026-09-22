import { ConfigurationError } from '@tawsel/shared';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: false | { rejectUnauthorized: true };
  purpose: 'application' | 'test';
}

export function parseDatabaseConfig(urlText: string | undefined, purpose: DatabaseConfig['purpose']): DatabaseConfig {
  const fail = (): never => { throw new ConfigurationError('Dedicated Tawsel database URL/target is required (see docs/operations.md)'); };
  if (!urlText) return fail();
  let url: URL;
  try { url = new URL(urlText); } catch { return fail(); }
  let database: string;
  let user: string;
  let password: string;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch { return fail(); }
  const allowedName = purpose === 'test' ? /^tawsel_test_[0-9a-f]{32}$/ : /^tawsel_app_[a-z0-9_]+$/;
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !allowedName.test(database) || database.length > 63
    || !url.hostname || !url.port || !url.username || !url.password || url.hash
    || Number(url.port) < 1
    || [...url.searchParams.keys()].some(key => key !== 'sslmode')
    || url.searchParams.getAll('sslmode').length > 1) return fail();
  const sslmode = url.searchParams.get('sslmode') ?? 'verify-full';
  if (!['verify-full', 'disable'].includes(sslmode)) return fail();
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((sslmode === 'disable' || purpose === 'test') && !loopback) return fail();
  return {
    host: url.hostname.replace(/^\[|\]$/g, ''), port: Number(url.port), database,
    user, password,
    ssl: sslmode === 'disable' ? false : { rejectUnauthorized: true }, purpose
  };
}

export const databaseMarker = (purpose: DatabaseConfig['purpose']): string => `tawsel:${purpose}:v1`;
