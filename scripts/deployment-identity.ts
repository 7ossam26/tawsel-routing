import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface IdentityInput {
  appOrigin: string;
  companySecret: string;
  personalSecret: string;
  workerSecret: string;
  smtp: { host: string; port: string; from: string; user: string; password: string; starttls: 'true'; auth: 'true' };
}
export function httpsOrigin(value: string): string {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.origin !== value || u.username || u.password || /REPLACE|\.invalid$/i.test(u.hostname)) throw new Error('Exact HTTPS origin required');
  return value;
}
export async function prepareTheme(origin: string, destination: string) {
  httpsOrigin(origin);
  await cp('identity/themes/tawsel', destination, { recursive: true });
  const path = resolve(destination, 'login/resources/js/tawsel.js');
  await writeFile(path, (await readFile(path, 'utf8')).replace('__TAWSEL_APP_ORIGIN__', origin));
  await mkdir(resolve(destination, 'login/resources/fonts'), { recursive: true });
  await copyFile('node_modules/@fontsource/cairo/files/cairo-arabic-400-normal.woff2', resolve(destination, 'login/resources/fonts/cairo.woff2'));
}
export async function realmConfiguration(input: IdentityInput) {
  httpsOrigin(input.appOrigin);
  if (![input.companySecret, input.personalSecret, input.workerSecret].every(s => /^[a-f0-9]{64}$/.test(s)) || new Set([input.companySecret, input.personalSecret, input.workerSecret]).size !== 3) throw new Error('Distinct random client secrets required');
  if (!input.smtp || input.smtp.starttls !== 'true' || input.smtp.auth !== 'true' || !input.smtp.host || !input.smtp.user || !input.smtp.password || !input.smtp.from.includes('@')) throw new Error('Verified external SMTP setup required');
  const profile = JSON.parse(await readFile('identity/personal-profile.json', 'utf8'));
  return ['company', 'personal'].map(kind => ({
    realm: `tawsel-${kind}`, enabled: true, sslRequired: 'all', displayName: 'توصيل', loginTheme: 'tawsel',
    registrationAllowed: kind === 'personal', registrationEmailAsUsername: false, loginWithEmailAllowed: false,
    duplicateEmailsAllowed: false, verifyEmail: kind === 'personal', resetPasswordAllowed: true, editUsernameAllowed: false,
    internationalizationEnabled: true, supportedLocales: ['ar', 'en'], defaultLocale: 'ar',
    bruteForceProtected: true, permanentLockout: false, failureFactor: 5, waitIncrementSeconds: 30,
    accessTokenLifespan: 120, ssoSessionIdleTimeout: 1800, ssoSessionMaxLifespan: 28800,
    revokeRefreshToken: true, refreshTokenMaxReuse: 0, passwordPolicy: 'length(12) and notUsername and notEmail',
    smtpServer: input.smtp,
    clients: [{ clientId: 'tawsel-web', secret: kind === 'company' ? input.companySecret : input.personalSecret,
      enabled: true, protocol: 'openid-connect', publicClient: false, standardFlowEnabled: true, directAccessGrantsEnabled: false,
      redirectUris: [`${input.appOrigin}/api/session/callback`], webOrigins: [], defaultClientScopes: ['basic', 'profile', 'email'],
      protocolMappers: [{ name: 'own-api-audience', protocol: 'openid-connect', protocolMapper: 'oidc-audience-mapper', config: { 'included.client.audience': 'tawsel-web', 'access.token.claim': 'true', 'id.token.claim': 'false', 'introspection.token.claim': 'true' } }],
      attributes: { 'pkce.code.challenge.method': 'S256', 'post.logout.redirect.uris': `${input.appOrigin}/login` } },
    ...(kind === 'company' ? [{ clientId: 'tawsel-provisioning', secret: input.workerSecret, enabled: true, protocol: 'openid-connect', publicClient: false, serviceAccountsEnabled: true, standardFlowEnabled: false, directAccessGrantsEnabled: false }] : [])],
    users: kind === 'company' ? [{ username: 'service-account-tawsel-provisioning', enabled: true, serviceAccountClientId: 'tawsel-provisioning', clientRoles: { 'realm-management': ['manage-users', 'view-users', 'query-users'] } }] : [],
    ...(kind === 'personal' ? {
      resetCredentialsFlow: 'tawsel-email-recovery',
      authenticationFlows: [{ alias: 'tawsel-email-recovery', description: 'Verified recovery email; phone-only ordinary login', providerId: 'basic-flow', topLevel: true, builtIn: false, authenticationExecutions: [
        { authenticator: 'tawsel-verified-email-recovery', requirement: 'REQUIRED', priority: 10, authenticatorFlow: false },
        { authenticator: 'reset-credential-email', requirement: 'REQUIRED', priority: 20, authenticatorFlow: false },
        { authenticator: 'reset-password', requirement: 'REQUIRED', priority: 30, authenticatorFlow: false }
      ] }],
      components: { 'org.keycloak.userprofile.UserProfileProvider': [{ name: 'declarative-user-profile', providerId: 'declarative-user-profile', config: { 'kc.user.profile.config': [JSON.stringify(profile)] } }] }
    } : {})
  }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === 'theme') {
      if (!process.argv[3] || !process.argv[4]) throw new Error('Missing theme inputs');
      await prepareTheme(process.argv[3], process.argv[4]);
    } else {
      if (!process.argv[2] || !process.argv[3]) throw new Error('Missing identity input/output');
      const realms = await realmConfiguration(JSON.parse(await readFile(process.argv[2], 'utf8')) as IdentityInput);
      await mkdir(process.argv[3], { recursive: true });
      for (const realm of realms) await writeFile(resolve(process.argv[3], `${realm.realm}-realm.json`), JSON.stringify(realm, null, 2), { flag: 'wx', mode: 0o600 });
    }
    console.log('Identity artifacts prepared; realm import and external email verification have not run.');
  } catch { console.error('Identity preparation refused; check inputs privately. Existing realm files are not overwritten.'); process.exitCode = 1; }
}
