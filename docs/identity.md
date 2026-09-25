# Identity and browser sessions — P07

P35 update: [queue-aware same-account recovery and durable exit](offline-account-updates.md) now connect the actual journal to these session APIs. `LoginRequest.expectedAccount` is accepted only with reauthentication and binds the one-use callback to the server-resolved existing identity, including after cookie loss. Current issuer/member checks still authorize every replay. Unreceived actions block deliberate exit; durable received rejection/review permits it without deleting server evidence. A lost logout response leaves a sealed retryable selection. [Ordered authentication and browser evidence](phase-35-evidence.md). These additions supersede earlier P07 statements that deferred queue guards.

P08 update: [ERP provisioning](provisioning.md) and [public fixture quickstart](erp/consumer-quickstart.md) now provide the company subject/role/branch/driver projection boundary. The P07 LOCAL seed remains historical fixture tooling; P08LOCAL is provisioned through public HTTP. Issuer passwords/accounts remain externally administered. A separate durable worker verifies reserved enabled subjects and revokes sessions after local disable. Ordinary session checks still need no ERP connection.

Tawsel uses a confidential OIDC authorization-code client with S256 PKCE. Passwords, activation and password-reset proofs are handled by Keycloak. There is no password-grant handler or password-hash copy. Company and personal realms, subject bindings, tenant/account records and browser session cookies are separate. Contact equality never links identities. Company codes locate a tenant; P06 live membership grants access.

## Reproduce the local demonstration

Use Node 24 / npm 11 and the dedicated P05 PostgreSQL setup. Windows local issuer setup is separate from `docker-compose.yml` and all Engine datasets/mounts.

1. `npm ci`, `npm run db:local:start`, `npm run db:migrate`.
2. `npm run identity:install` downloads pinned, SHA-256 checked Keycloak **26.7.4**, Temurin **25.0.4.1+1** and Mailpit **1.31.2** into ignored `.local/identity`. `scripts/identity-config.mjs` generates random local credentials, realm imports and `.env.identity.local`. It retains existing secrets. The theme includes the already-pinned local Cairo font, no third-party font request.
3. In two terminals run `npm run identity:mail` and `npm run identity:start`. Both bind loopback only (8025/1025 and 8085). The script does not run map imports. Keycloak imports missing realms only; restart does not overwrite existing users. Re-generating JSON is not a migration of an existing realm. Apply later policy changes explicitly through supported issuer administration, after backup.
4. `npm run identity:seed` creates the labelled `LOCAL` demonstration company and driver binding in the dedicated local application database. It is a local fixture, **not P08 provisioning**. Username `driver` is granted `execution.own`; `outsider` authenticates at the same issuer but has no Tawsel membership. The generated password is in ignored `.local/identity/secrets.json`; never paste this file into a report or commit it.
5. Copy non-secret defaults from `.env.example` into your local `.env` if needed, then `npm run dev`. Open **http://localhost:5173** (the exact configured origin; do not substitute 127.0.0.1). Company entry uses code `LOCAL`. Independent registration creates a new phone/password account after email verification. Captured messages are at **http://127.0.0.1:8025**.
6. `npm run test:auth` runs signed provider-fixture protocol tests on real disposable PostgreSQL. `npm run test:browser:auth` exercises actual local Keycloak/Mailpit/browser journeys. The latter uses the labelled local app database, leaves personal demo records, and requires the issuer/sink already running; it does not silently substitute fixtures. Stop the manually started API before this command: the harness reserves 3001 for its own configured API and reuses the web server on 5173 if present. For the full check/build, set `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001` through `.env` or the shell as in `.env.example`.

`npm run identity:stop` stops only recognized workspace identity processes; it never deletes issuer users/email/database files or stops the Engine. Keep `.local/identity`, `.env.identity.local`, browser traces and the session encryption key private. Local email capture establishes neither external email delivery nor production SMTP reputation/reliability. Production-email verification remains outstanding.

## Account journeys and policy

Company: code → themed issuer username/password → current subject membership check → company account. An unknown code or unprovisioned/disabled subject receives safe Arabic feedback. No role selector grants access. The ERP reference client has a distinct exact redirect and secret; its session is not used by Tawsel. Real ERP identity migration, connector/user provisioning and delegated actors are outside P07.

Independent: normalized phone (E.164, with Egyptian `01…` and Arabic digit input normalization) → required recovery email → email verification → password setup at Keycloak → separate personal tenant/account/driver creation in one PostgreSQL transaction. `identity/personal-profile.json` enforces phone usernames at the issuer even if JavaScript is disabled. Email is excluded as a login identifier. Registration before email verification cannot activate Tawsel. Phone ownership is **not SMS verified**. Password policy: minimum 12 characters, not username/email. This local realm enables temporary brute-force lockout and one-use refresh-token rotation.

Recovery: the application opens a fresh browser-bound OIDC attempt; the themed issuer opens its reset form. A matching verified email receives a short-lived issuer action link, followed by password reset. Unknown and known accounts get the issuer's neutral acknowledgement. Expired/reused proof must be restarted. Company recovery follows company issuer policy; Tawsel never enumerates unrelated identities.

Keycloak's default chooser ties email recovery lookup to email-login permission. `identity/provider` supplies a small **personal-recovery-only** authenticator that selects an enabled user by already-verified email, then delegates proof delivery/consumption/password changes to the standard issuer executions. Normal login retains `loginWithEmailAllowed=false`. The provider is compiled against the pinned distribution by `identity-provider.ps1` during install, never downloaded as an unreviewed plugin. Keycloak labels this authenticator SPI internal; upgrading the issuer requires rebuilding and rerunning the real recovery/negative tests before release. No additional admin API credential is needed by the application.

Online sessions have an absolute eight-hour application lifetime, independent of the issuer's 30-minute idle/eight-hour maximum. Tokens live only in authenticated AES-256-GCM ciphertext in PostgreSQL. `__Host-tawsel-company` and `__Host-tawsel-personal` are random opaque, hashed server-side, Secure/HttpOnly/SameSite=Lax/Path=/ cookies. The server uses a row lock for refresh rotation/logout serialization and introspects on **every online use**, then P06 re-resolves membership/capabilities. Issuer failures fail closed and do not delete local evidence. No ERP request occurs in this path; the identity service must be online.

Expired session cookies retain only server-bound same-subject reauthentication intent for up to 30 days. The server binds that expected subject into the one-use login attempt; a different subject is rejected. Client storage is never cleared by these screens, errors, refresh or logout. Future local work must be indexed by the returned stable account source ID, not contact/phone. P33/P35 still own the durable queue and queue-aware exit/switch blocking. The small browser sentinel test is preservation evidence only, not an implemented queue.

Logout revokes the local session first and attempts issuer revocation for that Tawsel refresh token. It clears only that account-kind cookie. It does not promise realm-wide/ERP logout; `prompt=login` requires credentials at subsequent entry even if the issuer SSO cookie remains. Membership disabling is enforced by P06 on subsequent online operations; issuer user/session revocation is enforced through introspection. There is no instantaneous offline revocation claim.

## HTTP boundary / consumer quickstart

Canonical ownership: `contracts/session.schema.json`, `contracts/openapi.yaml`, `contracts/operations.json`; generated `packages/api-client/src/schema.d.ts` and `docs/reference/public-contract.md`. `account.verifyRecoveryEmail` / `account.completeRecovery` are issuer-hosted single-use actions, not invented Tawsel endpoints. P08 provisioning paths are separately documented; other delivery-business paths remain unavailable.

| Operation | Wire surface | Trust |
| --- | --- | --- |
| `session.bootstrap` | GET `/api/session/bootstrap` | Issues browser-bound CSRF token, no access |
| `session.resolveCompany` | POST `/api/session/company` `{code}` | Locator only |
| `session.beginLogin` | POST `/api/session/login` `{kind,companyCode?,phone?,reauthenticate?}` | Returns server-selected authorization URL |
| `account.registerIndependent` | POST `/api/session/register` `{kind:"personal",phone?}` | Redirects to issuer registration |
| `account.beginRecovery` | POST `/api/session/recover` `{kind,companyCode?}` | Redirects to issuer recovery |
| `session.completeLogin` | GET `/api/session/callback` | Browser cookie, one-use state, nonce, signed ID token, PKCE and fixed redirect |
| `session.getContext` / `account.getStatus` | GET `/api/session/context?kind=…` or `/api/account/status?kind=…` | Current session + current P06 access |
| `session.refresh` | POST `/api/session/refresh` `{kind}` | Server-side refresh and current access |
| `session.logout` | POST `/api/session/logout` `{kind}` | Local revocation even during issuer outage |

Browser consumers fetch bootstrap with same-origin credentials, then send its `csrfToken` as `X-CSRF-Token` on POST. The browser must send the exact configured `Origin`. No permissive CORS is enabled. Redirect destinations, issuer/client choices and capabilities cannot be supplied by requests. Query/body additional fields are rejected. Callback does not echo arbitrary issuer errors or code values. All responses are `no-store`; codes/tokens are not logged by Fastify. Use a reverse proxy that also redacts callback queries; do not capture credentials/tokens in production telemetry.

Shared PostgreSQL rate limits use hashed client IP + route category + minute. Entry limit 20/minute; context/bootstrap 120, callback 60, refresh/logout 30. Issuer brute-force protection independently handles credential guesses. Proxy trust is off by default: production must deliberately configure its trusted proxy topology and capacity limits; do not trust arbitrary forwarding headers. Over-limit returns 429 with `Retry-After: 60`.

The personal recovery provider additionally uses the issuer's shared single-use-object cache for ten submissions per IP/minute and one message attempt per email/minute, with hashed keys and neutral acknowledgement on suppression. This protects direct issuer-form submissions too; it is not just a UI button limit. Production edge limits/SMTP abuse monitoring remain deployment work.

Consumer conformance: `npm run contracts:check`, `npm run test:contracts`, `npm run typecheck -w @tawsel/api-client`, `npm run test:auth` and actual `npm run test:browser:auth` are distinct checks. These browser sessions are not service credentials for ERP connectors. P08 now adds the authenticated explicit provisioning-service boundary; P26/P27 still own external receiver/source conformance.

## Production configuration and remaining deployment work

`parseAuthConfig` requires distinct configured realms, an exact application origin, nonempty confidential client secrets and a 32-byte random session key. HTTPS is mandatory outside loopback. The localhost HTTP demonstration relies on browser localhost secure-cookie treatment and is not production TLS verification. Production serves `/api` through the same origin as the application. Vite's proxy is development-only.

Do not deploy the local development issuer, H2 storage, test-control service account, demo users or SMTP sink as production. P39 owns production issuer/database/TLS/proxy/secrets/backups/rate-capacity verification. Rotating the encryption key invalidates old encrypted sessions and requires reauthentication; preserve any device evidence. Session rows expire logically; this phase has no automatic bulk purge of retained reauthentication records or test accounts. Plan bounded retention in deployment work without touching device queues.

Supported references consulted: [Keycloak 26.7.4 release](https://www.keycloak.org/2026/09/keycloak-2674-released), [ZIP setup](https://www.keycloak.org/getting-started/getting-started-zip), [OIDC endpoints](https://www.keycloak.org/securing-apps/oidc-layers), [realm import](https://www.keycloak.org/server/importExport), [registration/verification policy](https://www.keycloak.org/docs/latest/server_admin/), [profile API](https://www.keycloak.org/docs-api/26.7.4/rest-api/index.html), [openid-client](https://github.com/panva/openid-client). Local tests, not those documents, establish the recorded behavior.
