// Generates local-only secrets/seed users into ignored storage. No real ERP data.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const dir = resolve(root, '.local/identity');
await mkdir(dir, { recursive: true });
const key = () => randomBytes(32).toString('hex');
let secrets;
try { secrets = JSON.parse(await readFile(resolve(dir, 'secrets.json'), 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  secrets = { session: key(), company: key(), personal: key(), admin: key(), password: `Local-${key().slice(0, 24)}!`, control: key() };
  await writeFile(resolve(dir, 'secrets.json'), JSON.stringify(secrets, null, 2));
}
if (!secrets.erp) { secrets.erp = key(); await writeFile(resolve(dir, 'secrets.json'), JSON.stringify(secrets, null, 2)); }
const installation = resolve(dir, 'keycloak-26.7.4');
const personalProfile = JSON.parse(await readFile(resolve(root, 'identity/personal-profile.json'), 'utf8'));
await mkdir(resolve(installation, 'data/import'), { recursive: true });
for (const kind of ['company', 'personal']) {
  const client = (id, secret, redirect) => ({ clientId: id, enabled: true, protocol: 'openid-connect', publicClient: false, secret,
    standardFlowEnabled: true, directAccessGrantsEnabled: false, implicitFlowEnabled: false, serviceAccountsEnabled: false,
    redirectUris: [redirect], webOrigins: [], defaultClientScopes: ['basic', 'profile', 'email'],
    protocolMappers: [{ name: 'own-api-audience', protocol: 'openid-connect', protocolMapper: 'oidc-audience-mapper', config: { 'included.client.audience': id, 'access.token.claim': 'true', 'id.token.claim': 'false', 'introspection.token.claim': 'true' } }],
    attributes: { 'pkce.code.challenge.method': 'S256', 'post.logout.redirect.uris': 'http://localhost:5173/login' } });
  const realm = {
    realm: `tawsel-${kind}`, enabled: true, sslRequired: 'external', displayName: 'توصيل', loginTheme: 'tawsel',
    registrationAllowed: kind === 'personal', registrationEmailAsUsername: false, loginWithEmailAllowed: false,
    duplicateEmailsAllowed: false, verifyEmail: kind === 'personal', resetPasswordAllowed: true, editUsernameAllowed: false,
    internationalizationEnabled: true, supportedLocales: ['ar', 'en'], defaultLocale: 'ar',
    bruteForceProtected: true, permanentLockout: false, failureFactor: 5, waitIncrementSeconds: 30,
    accessTokenLifespan: 120, ssoSessionIdleTimeout: 1800, ssoSessionMaxLifespan: 28800,
    revokeRefreshToken: true, refreshTokenMaxReuse: 0,
    passwordPolicy: 'length(12) and notUsername and notEmail',
    ...(kind === 'personal' ? { resetCredentialsFlow: 'tawsel-email-recovery', authenticationFlows: [{ alias: 'tawsel-email-recovery', description: 'Verified recovery email; phone-only ordinary login', providerId: 'basic-flow', topLevel: true, builtIn: false, authenticationExecutions: [
      { authenticator: 'tawsel-verified-email-recovery', requirement: 'REQUIRED', priority: 10, authenticatorFlow: false },
      { authenticator: 'reset-credential-email', requirement: 'REQUIRED', priority: 20, authenticatorFlow: false },
      { authenticator: 'reset-password', requirement: 'REQUIRED', priority: 30, authenticatorFlow: false }
    ] }] } : {}),
    smtpServer: { host: '127.0.0.1', port: '1025', from: 'no-reply@tawsel.local', fromDisplayName: 'Tawsel local evidence', ssl: 'false', starttls: 'false', auth: 'false' },
    clients: [client('tawsel-web', secrets[kind], 'http://localhost:5173/api/session/callback'),
      ...(kind === 'company' ? [client('erp-reference', secrets.erp, 'http://localhost:5191/callback')] : []),
      { clientId: 'local-test-control', secret: secrets.control, enabled: true, protocol: 'openid-connect', publicClient: false, serviceAccountsEnabled: true, standardFlowEnabled: false, directAccessGrantsEnabled: false }],
    users: [{ username: 'service-account-local-test-control', enabled: true, serviceAccountClientId: 'local-test-control', clientRoles: { 'realm-management': ['manage-users', 'view-users', 'query-users'] } },
      ...(kind === 'company' ? ['driver', 'outsider'].map((username, index) => ({ id: `70000000-0000-4000-8000-00000000000${index + 1}`, username, enabled: true, emailVerified: true, firstName: 'Local', lastName: username, email: `${username}@example.test`, credentials: [{ type: 'password', value: secrets.password, temporary: false }] })) : [])],
    components: kind === 'personal' ? { 'org.keycloak.userprofile.UserProfileProvider': [{ name: 'declarative-user-profile', providerId: 'declarative-user-profile', config: { 'kc.user.profile.config': [JSON.stringify(personalProfile)] } }] } : {}
  };
  await writeFile(resolve(installation, `data/import/tawsel-${kind}-realm.json`), JSON.stringify(realm, null, 2));
}
const env = { TAWSEL_ORIGIN: 'http://localhost:5173', TAWSEL_SESSION_KEY: secrets.session,
  TAWSEL_COMPANY_ISSUER: 'http://localhost:8085/realms/tawsel-company', TAWSEL_COMPANY_CLIENT_ID: 'tawsel-web', TAWSEL_COMPANY_CLIENT_SECRET: secrets.company,
  TAWSEL_PERSONAL_ISSUER: 'http://localhost:8085/realms/tawsel-personal', TAWSEL_PERSONAL_CLIENT_ID: 'tawsel-web', TAWSEL_PERSONAL_CLIENT_SECRET: secrets.personal };
await writeFile(resolve(root, '.env.identity.local'), Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
await mkdir(resolve(installation, 'themes/tawsel/login/resources/css'), { recursive: true });
await mkdir(resolve(installation, 'themes/tawsel/login/resources/js'), { recursive: true });
for (const file of ['theme.properties', 'resources/css/tawsel.css', 'resources/js/tawsel.js']) {
  if (file.endsWith('.js')) {
    const script = await readFile(resolve(root, 'identity/themes/tawsel/login', file), 'utf8');
    await writeFile(resolve(installation, 'themes/tawsel/login', file), script.replace('__TAWSEL_APP_ORIGIN__', 'http://localhost:5173'));
  } else await copyFile(resolve(root, 'identity/themes/tawsel/login', file), resolve(installation, 'themes/tawsel/login', file));
}
await mkdir(resolve(installation, 'themes/tawsel/login/resources/fonts'), { recursive: true });
await copyFile(resolve(root, 'node_modules/@fontsource/cairo/files/cairo-arabic-400-normal.woff2'), resolve(installation, 'themes/tawsel/login/resources/fonts/cairo.woff2'));
console.log('Local realm configuration and ignored secrets generated. See docs/identity.md; credentials are in .local/identity/secrets.json.');
