export type AccountKind = 'company' | 'personal';
export interface IssuerConfig { issuer: string; clientId: string; clientSecret: string }
export interface AuthConfig {
  origin: string;
  encryptionKey: Buffer;
  issuers: Record<AccountKind, IssuerConfig>;
  sessionSeconds: number;
}

export function parseAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const required = (key: string) => { const v = env[key]; if (!v) throw new Error(`Missing ${key}`); return v; };
  const origin = required('TAWSEL_ORIGIN');
  const url = new URL(origin);
  const safeUrl = (value: string) => {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash || (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)))) throw new Error('HTTPS required outside loopback');
    return value;
  };
  safeUrl(origin);
  if (url.origin !== origin) throw new Error('TAWSEL_ORIGIN must be an exact origin');
  const encryptionKey = Buffer.from(required('TAWSEL_SESSION_KEY'), 'hex');
  if (encryptionKey.length !== 32 || !/^[a-f0-9]{64}$/i.test(required('TAWSEL_SESSION_KEY'))) throw new Error('TAWSEL_SESSION_KEY must be 32 random bytes in hex');
  const issuer = (kind: string): IssuerConfig => ({ issuer: safeUrl(required(`TAWSEL_${kind}_ISSUER`)), clientId: required(`TAWSEL_${kind}_CLIENT_ID`), clientSecret: required(`TAWSEL_${kind}_CLIENT_SECRET`) });
  const issuers = { company: issuer('COMPANY'), personal: issuer('PERSONAL') };
  if (issuers.company.issuer === issuers.personal.issuer) throw new Error('Separate company and personal realms required');
  return { origin, encryptionKey, issuers, sessionSeconds: 8 * 60 * 60 };
}
