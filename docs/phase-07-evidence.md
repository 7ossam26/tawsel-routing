# Phase 07 — identity and separate sessions

Date: 22 September 2026. Starting HEAD `2084bba` (`phase 6`), clean working tree. No repository or ancestor AGENTS.md found. Read actual P04 components and original 04 login HTML/image, P05 migrations/transactions, P06 schema/guards/fixtures, master plan §6, current discovery through D-112, phase index/decision map, assigned requirement rows, UI specification/design, model-selection guide and implementation ledger.

Runtime model identifies GPT-6; exact picker suffix/reasoning setting is not exposed to the task. The requested recommendation is `gpt-6-astra / high`; it is not recorded as an observed setting or silently switched.

## Prerequisites

Before editing: `npm run test:authorization` passed 39 tests, `npm run test:database` passed 28 tests. Those first two invocations used the host default Node 25.2.1/npm 11.6.2; subsequent implementation/checks explicitly prepend the bundled Node 24.19.0 and existing local npm 11.1.0 shim. No prerequisite defect required repair. Later migration-list assertions were extended to include additive 0003; P05/P06 migration checksums were preserved.

Docker is unavailable on PATH and no Docker executable was found at the usual Desktop path. Used workspace-isolated Keycloak ZIP, a supported local JDK and Mailpit instead. No Engine setup/import/data change. Existing Vite PID 20752 was identified as this repository's dev server and reused, not terminated. Only this task's Keycloak process was stopped for the initial realm configuration correction.

## Checkpoint A — passed before B

Added issuer configuration/theme generator with ignored random local secrets, distinct company/personal realms, confidential Tawsel clients and a distinct ERP reference client; no password grant. Added canonical session schemas, 0003 migration, encrypted server token storage, browser-bound single-use code+PKCE/state/nonce flow, secure HttpOnly cookies, CSRF/origin checks, PostgreSQL rate limits and P06 access context/logout routes.

Focused signed-provider-fixture check: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/session-auth.test.ts` passed **4 tests** with real isolated PostgreSQL. Proves code/PKCE context, company outsider denial, CSRF/redirect rejection and concurrent callback replay. The issuer in these tests is explicitly a signed HTTP fixture, not Keycloak.

Early failures retained: malformed closing brace in session JSON prevented startup (fixed); existing port 5173 required explicitly reusing the identified workspace Vite; test-fixture attempts to change/remove immutable P06 subject links were correctly rejected (fixture now accepts an issuer at creation); real Keycloak callback created a session but introspection initially returned inactive. Added the Keycloak `basic` scope and repeated the actual round trip before proceeding. These failures are not acceptance passes.

The issuer log then identified the precise remaining cause: `Client 'tawsel-web' is not in the token audience`. Added an explicit own-client audience mapper; no token-validation bypass. Reimported only the task-created local realms before any personal user registration. `npx playwright test -c playwright.auth.config.ts` then **passed 1 real Chromium/Keycloak test**: code+S256, company session, live P06 `execution.own` context and Secure/HttpOnly/SameSite=Lax cookie checks. `contracts:generate` and `contracts:check` passed 6 schemas / 76 valid + 49 invalid examples / 148 operations. API typecheck and 4 session integration tests passed. No unresolved prerequisite; production TLS/email and actual ERP client integration remain explicitly outside this local result.

## Checkpoint B — passed before C

Connected the production Arabic account shell to actual HTTP endpoints, retaining P04 fixture routes. Reused reviewed fields/buttons/notices; code entry, issuer login, personal registration/activation/recovery, account identity, separate logout and safe error states are connected. Added a local Cairo issuer theme and canonical phone profile. Personal activation creates the P06 tenant/account/membership/driver in one real transaction only after signed verified-email evidence.

`npm run test:auth` **passed 10 tests** (3 fast config/crypto/phone, 7 real-PostgreSQL signed-provider-fixture integration). This includes matching subject/contact claims in distinct realms, independent cookies and company logout, blocked unverified activation and idempotent personal creation. `test:contracts` **passed 138 tests**, typecheck and lint passed. Canonical references/client types were regenerated.

Real browser focused runs: `npx playwright test -c playwright.auth.config.ts -g 'company denial'` **passed 1 test** (invalid code retains input, focus lands on Arabic error, outsider denied, authorized login/logout); `… -g 'real registration'` **passed 1 test in 26.1s** (phone registration → captured email verification → issuer password setup → personal activation; company/personal sessions coexist independently; company logout preserves personal; verified-email recovery → changed password; email rejected for normal login, normalized phone succeeds; account ID stable and a future-evidence localStorage sentinel preserved).

Actual screenshots inspected: `phase-07-code-error.png` and `phase-07-verify-email.png` at 390×844: Cairo/RTL, readable short notices, retained field, visible next action and no horizontal clipping. Additional account/recovery screenshots are under `output/playwright`. These are connected UI/service captures, not the P04 fixtures. Sentinel preservation is not a durable offline queue, and human owner review has not occurred.

Failures resolved during B: initial user-profile component used an obsolete key; corrected to `kc.user.profile.config` after checking pinned source. Keycloak's current verification-first registration has password setup after verification, so the test followed the actual policy. Existing SSO reauthentication offers a restart control before changing username; the browser test exercises that control. Recovery acknowledgement uses text, not a guessed `.alert` class. Browser test navigation now waits for logout completion before navigating. Finally, real email recovery exposed that Keycloak's standard chooser disables email lookup together with email login. Added the compiled, pinned `VerifiedEmailRecovery` authenticator **only** to the personal recovery flow, delegating proof and password actions to Keycloak; ordinary email login remains disabled. Installing that flow used a temporary local bootstrap service account, which was deleted after the bounded setup. Existing registered users were retained, not reimported. No application admin credential was added.

Local verification/recovery messages reached Mailpit only. Production SMTP delivery, real devices, deployed TLS and real ERP interoperability remain unverified/out of this phase's local evidence. No unresolved dependency prevents C.

## Checkpoint C — expiry and denial

`npm run test:auth` passed **21 tests**: 3 fast config/crypto/phone tests and 18 signed-provider-fixture tests using real disposable PostgreSQL. Negative protocol coverage includes invalid signature, issuer, audience, nonce, verifier, state, origin and CSRF, concurrent callback replay, shared rate limits and logout CSRF. Session checks cover concurrent single-use refresh rotation, absolute expiry, wrong-subject reauthentication, invalid refresh, issuer outage, local logout and current membership/issuer revocation around an actual P05/P06 guarded database command. The command test uses real transactions without an ERP service/configuration/network dependency; its domain write is a labelled synthetic counter, not a shipment operation.

Review exposed a rotation fault: rolling back the replacement token after a later introspection outage would retry an already-consumed refresh token. The implementation now preserves a successful rotation while returning the retryable outage/denial; a dedicated fault test fails if the predecessor is reused. Online session use holds its row lock through the supplied server operation, while domain authorization remains a separate P06 transaction. No issuer request is inserted into the P05 atomic write transaction.

Real Chromium/Keycloak/Mailpit checks cover expiry with same-subject recovery, rejected account substitution, retained localStorage sentinel, disabled membership, actual issuer-session logout/revocation, unknown-email neutral acknowledgement with no captured message, invalid/reused proof and a return link, exact redirect rejection, mobile/desktop RTL/focus/reduced-motion and a clear network error. A recovery-specific limiter suppresses repeated direct issuer requests without disclosing account existence. Malformed signed-token tests use the fixture; actual issuer journeys establish local end-to-end behavior.

## Acceptance mapping

| Scenario | Actual evidence |
| --- | --- |
| Existing company code, no membership | Signed fixture + real `outsider` login denied; no company session/access created. |
| Personal recovery email | Real captured email → issuer reset → new password; normal email login rejected and phone login succeeds; account/source ID stable. |
| Expired session | Server-bound subject intent rejects another subject; same-account browser reauthentication succeeds; sentinel remains. Durable queue is not implemented. |
| ERP unavailable after login | Actual session-authorized P05/P06 test command succeeds without any ERP endpoint/service; live membership and issuer revocation each deny it afterward. Real ERP interoperability is not claimed. |
| Callback replay/redirect manipulation | Atomic browser-bound single-use callback race and changed state/origin fail; actual Keycloak rejects altered redirect. |
| Local sink only | Mailpit captured verification and reset messages; production delivery remains untested. |

## Reproducibility, versions and preserved boundaries

Use [identity.md](identity.md) for install/start/seed/demo commands and the browser consumer contract. Versions: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.4**, Keycloak **26.7.4**, Temurin **25.0.4.1+1**, Mailpit **1.31.2**, openid-client **6.8.8**, @fastify/cookie **11.0.2**, Playwright **1.63.0**, Vitest **5.0.1**. Existing React/TypeScript/Vite/Fastify/pg/Cairo pins retained. Runtime ZIPs are SHA-256 checked by `identity-local.ps1`; generated credentials/imports, H2 databases, traces and email content stay ignored. Provider compilation succeeded against pinned Keycloak jars; its internal SPI warning requires rebuild/retest on upgrades.

Fresh canonical realm JSON imported successfully into a **separate empty H2 database** (`.local/identity/clean-demo`) using `kc.bat import --optimized`, with `KC_DB_URL` selecting that isolated file. Offline export verified default browser/registration flows and personal `tawsel-email-recovery`, verified-email policy, disabled email login and the declarative phone profile. This did not reset the working issuer/users. A second temporary issuer start was rejected by automatic approval review with only “blocked by policy”; no fresh-database browser pass is claimed. Real browser journeys use the primary local issuer. Initial import CLI syntax split a semicolon in `--db-url` (resolved by `KC_DB_URL`); export `--users=skip` required directory rather than file output (corrected).

Final regression corrections: updated the migration table inventory for four additive P07 tables; excluded generated browser report/results JavaScript from source lint; limited Vitest startup to four workers after a startup timeout during issuer import (independent-connection race tests unchanged). The old UI-spec checker assumed every non-health operation was still designed; it now allows only workspace and owner-P07 session-context promotion. Build initially rejected missing `VITE_TAWSEL_API_BASE_URL`; subsequent verification supplies the documented value. No failure is counted as a pass.

Actual render review includes code error, verification waiting, company account and recovery acknowledgement at 390×844. Cairo/RTL and readable focus/next steps are retained. Review caught the issuer carrying recovery email into the phone-labelled login input; the theme now clears it and the browser test asserts this. Seven connected screenshots are retained under `output/playwright/phase-07-*.png`; private traces/results are ignored. Owner review, real phones, production TLS/SMTP and external ERP are outstanding.

## Changed artifacts and handoff

Final commands/results on the versions above:

- PowerShell `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check`: **PASS**, 12 files / **254 Vitest tests**, zero audit vulnerabilities, lint, six canonical schemas / 76 valid + 49 invalid examples / 148 owned operations, typechecks, all builds and production fixture exclusion. OpenAPI retains one explained warning: the redirect-only callback has 302 rather than a fabricated 2xx response.
- `npm run test:browser:auth`: **6 passed in 54.5s**, final real issuer/sink/database Chromium run. `npm run test:auth`: **21 passed** in its focused run; included again in the 254-test suite.
- PowerShell `$env:TAWSEL_BROWSER_PORT='5174'; npm run test:browser:ui`: **6 passed in 20.7s**, P04 development-fixture regression; restored its generated old screenshot to preserve the prior evidence file. This is distinct from real identity UI evidence.
- `python scripts/check-ui-spec.py check`: **PASS**, nine source sets / 18 original hashes / 105 control dispositions, 63 rows / 148 operations, 33 state cases, contrast/link and six negative mutation checks. Document checks do not establish browser behavior.
- `git diff --check` and protected-path diff against starting HEAD: **PASS** for Engine compose/setup/profiles/config/data, original Stitch exports and migrations 0001/0002. No Engine imports or changes to existing application records outside labelled local demo/test data.

The updated CI path filters include identity changes; hosted CI itself was not run. CI's application suite uses the signed provider fixture and PostgreSQL; the Windows local Keycloak/Mailpit browser run is separately recorded above, not silently claimed as hosted CI coverage.

Final local smoke: `db:migrate` reports already current; `identity:seed` reruns idempotently; the test control database contains **zero leftover disposable databases**. The compiled API starts with the generated environment and serves same-origin bootstrap 200 / unauthenticated context 401 through Vite. The primary issuer, sink, original Vite and compiled API were left running for review at `http://localhost:5173/login/company`. No credentials were printed. Stop the manual API before rerunning the auth browser harness, which reserves port 3001.

Implementation: `apps/api/src/auth`, API startup/registration, additive `db/migrations/0003_identity_sessions.sql`, `apps/web/src/account-shell.tsx`, production shell/styles/proxy, `identity` theme/profile/provider and `scripts/identity-*`. Tests: auth config/integration/signed issuer fixture, migration inventory, `tests/identity-browser`, auth Playwright configuration, bounded Vitest concurrency and CI path triggers. Contracts: session schema, examples, ten OpenAPI paths, twelve owner-P07 catalog operations marked **verified-local**, regenerated client/reference/coverage and typed consumer example. Docs: identity/evidence/status, phase coverage/index, master/discovery status, UI action map, ERP planning/mapping/quickstart and integration/operations guidance. Other domain operations remain designed.

Phase 08 may rely on verified issuer+subject `AuthenticatedPrincipal`, `Sessions.use`/`context`, P06 guards, P05 transactions, migration 0003, canonical session schemas/types and runnable local issuer/auth tests. It must implement service/provisioning/actor authentication and trusted mappings itself; demo seeding and the local test-control issuer client are not production provisioning. Feature adapters must still execute current resource/capability/lifecycle guards. P33/P35 own durable account-local evidence and queue-aware logout/switch. **Phase 08 was not executed. No commit, push or publication.**
