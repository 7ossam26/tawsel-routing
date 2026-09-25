# Phase 35 — Safe offline account recovery and application updates

25 September 2026. Starting HEAD `7f578c771bf1f5e2d073eefd643982e431fc143d` (phase 34), clean working tree. No AGENTS.md in the repository or its ancestors. Runtime identifies Codex/GPT-6; the exact picker model suffix and reasoning setting are not exposed. Requested recommendation: `gpt-6-astra` / `xhigh`; not asserted as the actual setting. No commit, push, publication or Phase 36 execution is authorized by this task.

## Prerequisites

Read the current master plan (especially sections 6, 10–11), discovery decisions through D-112, phase guide/decision map/model fallback guide, assigned requirement rows and implementation ledger. Inspected actual P07 Sessions/OIDC/CSRF, P20 ownership/snapshot, P23 correction/evidence, P33 Dexie capture and P34 replay/receipts, production PWA generation, original 04-login-workspace/09-sync-conflicts images and current UI. Original exports are references and remain unchanged.

Supported runtime: Node `24.19.0`, explicitly selected from `C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`.

- `node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/local-action-capture.test.ts --maxWorkers=1`: **1 file / 12 passed**, 1.48s. Actual Dexie transactions with labelled fake-indexeddb.
- `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/session-auth.test.ts apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/offline-device-takeover.test.ts -t 'same-account|B: mandatory snapshot|P23 C: former-phone evidence is|A: received failed predecessor' --maxWorkers=2 --testTimeout=30000`: **4 files / 4 passed / 94 skipped**, 25.55s. Real isolated PostgreSQL; labelled signed issuer and principal fixtures. `.local/phase-35-prerequisites-focused.log`.
- Full prerequisite command: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/session-auth.test.ts apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/offline-device-takeover.test.ts apps/web/test/fast/local-action-capture.test.ts --maxWorkers=2 --testTimeout=30000`: **5 files / 110 passed**, 273.74s, `.local/phase-35-prerequisites.log`. No missing prerequisite blocks checkpoint A. The check-then-logout race and cookie-loss reauthentication recovery are phase-owned gaps, not claimed as existing success.

## Checkpoint A — passed before update compatibility work

Implemented `account-lifecycle.ts`, the private-screen account boundary, typed SessionClient, and durable `selection.exiting` transition in the actual journal. The same journal lock drains replay; the IndexedDB transaction seals capture across tabs before remote logout. A lost response leaves retryable sealed state after reopen. Received rejected/review evidence can exit; missing receipts cannot. Old in-flight session contexts cannot unseal an exited partition. Context changes unmount private screen state without reloading.

Additive `LoginRequest.expectedAccount` restricts the real OIDC callback to the account resolved by the server when the old cookie is unavailable. It grants no authentication, receipt or execution bypass; provider and current access checks remain required. Account pages expose same-account recovery and explicit exit. Private pages check current auth before exposing cached data online.

`node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/offline-session-update.test.ts --maxWorkers=1 --testTimeout=30000`: **1 file / 5 passed**, 20.98s (`.local/phase-35-checkpoint-a-rerun.log`). Actual session/OIDC adapter, public clients/HTTP handlers, journal and PostgreSQL prove cookie-loss/wrong-account/expiry, durable rejected receipt exit, peer capture fencing, issuer/member revocation, lost logout response/reopen, and missing local receipt denial. Signed issuer, fake-indexeddb and deterministic lock scheduling are explicitly fixtures; no worker/browser claim at this checkpoint.

Initial **5/5 failed in fixture setup** because the test tried to rewrite an immutable identity binding. Fixed `startedFixture` to accept a principal at creation and created the correct initial binding; no invariant was relaxed (`.local/phase-35-checkpoint-a.log`). Canonical generation initially failed AJV strictRequired for a conditional schema, corrected by declaring the condition property. Initial typecheck also caught an invalid UI tone/optional-field assignment and stale generated types; corrected. API/web typechecks and local journal regression **12/12** then passed. No unresolved checkpoint dependency.

## Checkpoint B — passed before recovery UX refinement

Implemented additive Dexie v1→v2 migration (new scoped drafts table and atomic schema marker; all existing records preserved), a frozen released-v1 schema fixture, explicit `1.0.0/1.0.0` local/server readers and fail-closed newer-schema/unsupported-payload paths. No action-payload rewrite, automatic ID replacement or expiry timer. `SyncBatch` now documents unsupported version rejection without a receipt.

`UpdateNotice` offers a waiting worker on safe account/review screens. `applySafeUpdate` holds an installation-wide Web Lock excluding capture/replay/start/exit, checks all partitions for missing receipts and pending overlays, and requests a native worker-side IDB recheck. The worker refuses multiple app tabs and pending/exit states. Activation/reload is explicit; normal activation after all controlled pages close remains the browser's lifecycle. No controller-change forced reload or cache/store reset. The generated generic SKIP_WAITING route is intercepted by the imported gate.

- `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/offline-session-update.test.ts apps/web/test/fast/local-action-capture.test.ts --maxWorkers=2 --testTimeout=30000`: **2 files / 20 passed**, 27.72s (`.local/phase-35-checkpoint-b.log`).
- Added newer-schema refusal and reran the named integration file: **9/9 passed**, 57.02s (`.local/phase-35-checkpoint-b-final.log`). Actual transactions abort the upgrade; no transaction is mocked away. IndexedDB is simulated here; HTTP/auth and PostgreSQL are actual modules.
- `node scripts/offline-demo.mjs --recovery`, third run: **first production-browser scenario passed, 29.2s**. Native Chromium IndexedDB aborted the actual production migration, reopened the old schema and then upgraded without changing three pending actions or receipts. Process reopen, both pending exit/update blockers, worker-side pending refusal, expired/missing-cookie Keycloak reauthentication, original queue replay, multi-tab update refusal, explicit single-tab activation and account isolation all passed. `.local/phase-35-native-migration.json`, `.local/phase-35-recovery-browser.json`, `.local/phase-35-browser-3.log`.

Browser harness failures were retained: run 1 switched offline before the new account boundary finished loading (fixed by waiting for the enabled driver action; its failed-worker cleanup also stopped the next scenario); run 2 incorrectly expected a worker still waiting after OIDC navigation had left no controlled page (now offers a second real update while app pages remain open). Run 3's separate former-phone test expected two company stops although the fixture supplies one; fixed that expectation, with no product change. The full B browser rerun including generic-message refusal passed **2/2**, 41.6s (`.local/phase-35-browser-4.log`). No dependency prevents checkpoint C; physical devices remain P41.

Primary references: [Dexie version upgrade transactions](https://dexie.org/docs/Version/Version.upgrade()), [Workbox update lifecycle](https://developer.chrome.com/docs/workbox/handling-service-worker-updates), [waiting worker state](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/waiting). Existing dependency pins retained.

## Checkpoint C — passed

Added concise saved/confirmed/attention cards with business action/recipient labels and optional technical diagnostics. Account recovery distinguishes unsent work from server-received rejected/review evidence and explicitly permits exit for the latter. Durable exception drafts are account scoped and preserve form input across navigation; read failure does not overwrite an unread draft. The focused phone/storage section states that only received server state is recoverable after storage loss, explains the approximately 24-hour verification target and links to the actual round and server evidence screens.

`node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/local-action-capture.test.ts apps/web/test/fast/local-capture-ui.test.tsx apps/web/test/fast/execution-exceptions.test.tsx`: **3 files / 31 passed**, 7.38s (`.local/phase-35-checkpoint-c-ui-rerun.log`). Covers scoped draft reopen/isolation alongside transactional capture, blocked exit and exception interactions. Initial UI run exposed that pending-work feedback was hidden by the missing-Web-Locks error in jsdom; an early conservative pending check now provides the correct explanation, retaining the authoritative transaction check. An exploratory command named a nonexistent exception-test path and did not count that path as coverage.

`node scripts/offline-demo.mjs --recovery`: C rerun **2/2 passed**, 48.1s (`.local/phase-35-checkpoint-c-browser-2.log`). The initial C browser run tried partial delivery on a one-piece indivisible fixture; changed the labelled public intake fixture to three splittable pieces, preserving all assertions. Default fixtures used by other tests remain unchanged. The final capture/public-report rerun passed **2/2**, 1.2m (31.8s + 20.5s scenarios), `.local/phase-35-browser-final.log`.

Actual Chromium interactions verify: service-worker installation/control and offline shell reopen after browser-process closure; three retained native-IDB actions; actual production migration transaction abort/rollback then successful additive upgrade in a labelled cloned v1 journal; waiting worker and generic activation refusal with pending work; actual expired session and missing cookie through local Keycloak; original same-ID replay; extra-tab activation refusal followed by explicit single-tab activation/reload; private peer-screen unmount on exit; different-account isolation; partial form input retained after local-review navigation; storage-empty second context seeing only server state; and permitted former-phone logout followed by an authorized read of still-unresolved server evidence. Worker update comments, network faults, expiry and routing are controlled fixtures; the browser, worker, IDB, Locks, OIDC and API/database paths are real local services.

Reviewed actual captures at 390px RTL with Cairo and reduced motion:

- [Pending update and exit blockers](../output/playwright/phase-35-pending-update.png): separate honest blockers retain count and recovery links; a deliberately simultaneous update/network/logout fault makes this account view taller than the ordinary stage.
- [Expired session](../output/playwright/phase-35-expired-session.png): one focused same-account action; the prior private round is hidden.
- [Different account](../output/playwright/phase-35-account-isolation.png): empty selected-account journal while original records remain stored; no horizontal overflow.
- [Retained partial input](../output/playwright/phase-35-retained-input.png): one piece of three and the exact source amount survive navigation; cancellation is secondary to explicit confirmation.
- [Unresolved server review after logout](../output/playwright/phase-35-retained-review.png): received evidence stays distinct from accepted outcome, with focused review controls.
- [Storage limits and actual recovery links](../output/playwright/phase-35-storage-limits.png): initial render exposed adjacent links running together; separated them vertically and inspected the final capture. Technical IDs/versions remain in optional diagnostics.

These are interaction/render findings, not human owner approval, screen-reader certification or physical phone evidence. No unresolved local checkpoint dependency.

## Final verification and versions

Commands use supported Node `24.19.0` first on PATH. npm shorthand means `node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'`; the installed CLI reports `11.6.2` (within the repository's supported npm 11 range; the unchanged packageManager field pins `11.1.0`). Existing dependency pins retained: React `19.3.0`, TypeScript `6.0.2`, Vite `8.3.0`, Fastify `5.12.5`, Dexie `4.4.6`, Workbox `7.4.1`, Vitest `5.0.1`, Playwright `1.63.0`, pg `8.23.0`, PostgreSQL `18.4`, local Keycloak `26.7.4`. No dependency upgrade or PostgreSQL migration.

| Command | Actual result |
| --- | --- |
| `npm run audit`, `npm run lint`, `npm run contracts:lint`, `npm run contracts:check`, `npm run typecheck`, `npm run build` | All passed (`.local/phase-35-validation.log`). Audit **zero vulnerabilities**. Build uses explicit local `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3029`, not an invented deployment URL. Existing OIDC 302-only lint and large MapLibre chunk warnings remain. All workspace builds and production fixture isolation pass. |
| `python -X utf8 scripts/check-ui-spec.py check` | Passed original hashes, action coverage for **185 operations**, local links, state cases, contrast and negative controls. `.local/phase-35-ui-spec.log`. This is specification checking, not a browser usability test. |
| `node scripts/offline-demo.mjs --recovery` | Final **2/2 passed**, production PWA **17 assets / 2,398,288 bytes**, no API/map runtime cache. `.local/phase-35-browser-final.log`. |
| `node scripts/offline-demo.mjs` | Original capture regression **1/1 passed**, 34.9s, including atomic abort, offline browser-process reopen, unsent monitoring exclusion, pending exit gate and eventual receipts. `.local/phase-35-capture-regression.log`. |
| `node --import tsx tests/erp-conformance/offline-recovery.ts` | Passed labelled canonical expected-account restriction; fixture only. |
| `node --import tsx tests/erp-conformance/offline-recovery.ts .local/phase-35-recovery-browser.json .local/phase-35-retained-review.json` | Passed actual public original-envelope/receipt/unresolved-evidence checks and native rollback report. `.local/phase-35-consumer-conformance.log`. No internal table/service dependency or commercial ERP application claim. |
| `node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/b2c-intake.test.tsx --maxWorkers=1` | **3/3 passed**, 14.68s. The broad run exposed a historical exact-two-fetch assertion after the added account context read. Changed it to verify the intended invariant: missing required fields issue no writes. `.local/phase-35-intake-regression.log`. |
| `node node_modules/vitest/vitest.mjs run --project fast --maxWorkers=2` | Final **19 files / 584 passed**, 56.99s (`.local/phase-35-final-fast.log`), including the repaired intake assertion and every contract/negative example. |
| `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=2 --testTimeout=30000` | **52 files / 988 tests: 987 passed / 1 failed**, 1110.92s (`.local/phase-35-full-tests.log`). All **404 integration tests** passed, including the 9 named P35 tests. The sole failure was the historical exact-two-read intake assertion described above; the 584-test fast rerun covers its repair. The broad suite was not repeated after that repair and the final monitoring-default adjustment; the latter passed its full 5-test file separately. |
| `npm run test:offline-session-update` | Final documented entry point **9/9 passed**, 38.13s (`.local/phase-35-named-script-final.log`). The script rebuilds shared/client foundations and includes the verified single-worker/30-second connected-test bound. |

Canonical inventory is **28 schemas / 261 valid / 162 invalid examples / 185 operations**. Updated session/local/sync canonical ownership, explicit operation status, generated types/reference/coverage, exported session client and ERP planning/mapping/quickstart/public conformance. Initial OpenAPI generation failed on the added description's YAML indentation; corrected before all final canonical gates passed. No separate schema copy was introduced.

Actual browser version from the final report: Chromium **153.0.8010.12**. Python UI checker runtime: **3.11.9**. Owner review feedback was not received. Agent render review found and corrected the recovery-link spacing described above; no design approval is inferred.

Final route review found that `/monitoring` without a kind parameter defaults to company in the existing screen, whereas the new boundary defaulted to personal. Aligned the boundary with that route and extended the existing monitoring interaction test to render the full production shell with a staff-only session and no kind parameter. `node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/monitoring-client.test.tsx --maxWorkers=1`: **5/5 passed**, 9.23s (`.local/phase-35-monitor-boundary.log`). No other account default changed.

After that final route change, `npm run typecheck -w @tawsel/web`, targeted ESLint and `npm run build -w @tawsel/web` passed. The clean-source production PWA contains **17 assets / 2,398,353 bytes** (`.local/phase-35-clean-source-build.log`); fixture isolation passed. A direct `tsc -p` diagnostic initially emitted 39 untracked JavaScript files beside web TypeScript sources. Only those verified matching generated outputs were removed, and the correct workspace `--noEmit` check and clean-source build were rerun. No generated source copies remain. Final whitespace checking passed.

## Changed paths

Repository-relative paths from the final uncommitted working tree. Raw fault logs, public-response reports and generated browser traces remain under ignored `.local`/test-output paths; six reviewed screenshots are retained.

- `.gitignore`
- `apps/api/src/auth/service.ts`
- `apps/api/src/commands/readers.ts`
- `apps/api/src/sync/service.ts`
- `apps/api/test/integration/offline-session-update.test.ts`
- `apps/api/test/support/current-fixture.ts`
- `apps/api/test/support/planning-company-fixture.ts`
- `apps/web/public/update-gate.js`
- `apps/web/scripts/build-pwa.mjs`
- `apps/web/src/account-boundary.tsx`
- `apps/web/src/account-lifecycle.ts`
- `apps/web/src/account-shell.tsx`
- `apps/web/src/action-reader.ts`
- `apps/web/src/exception-editor.tsx`
- `apps/web/src/journal-lock.ts`
- `apps/web/src/local-drafts.ts`
- `apps/web/src/local-schema.ts`
- `apps/web/src/local-status.tsx`
- `apps/web/src/local-work.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/production-shell.tsx`
- `apps/web/src/recovery-limits.tsx`
- `apps/web/src/replay.ts`
- `apps/web/src/safe-update.ts`
- `apps/web/src/styles.css`
- `apps/web/src/update-notice.tsx`
- `apps/web/test/fast/b2c-intake.test.tsx`
- `apps/web/test/fast/local-action-capture.test.ts`
- `apps/web/test/fast/monitoring-client.test.tsx`
- `apps/web/test/fixtures/p34-local-v1.json`
- `contracts/examples/README.md`
- `contracts/examples/invalid.json`
- `contracts/examples/valid.json`
- `contracts/local-work.schema.json`
- `contracts/openapi.yaml`
- `contracts/operations.json`
- `contracts/session.schema.json`
- `contracts/sync.schema.json`
- `docs/contract-coverage.md`
- `docs/erp/ERP-PLANNING-INPUT.md`
- `docs/erp/consumer-quickstart.md`
- `docs/erp/field-and-status-mapping.md`
- `docs/identity.md`
- `docs/implementation-status.md`
- `docs/offline-account-updates.md`
- `docs/operations.md`
- `docs/phase-35-evidence.md`
- `docs/phases/README.md`
- `docs/phases/coverage-matrix.md`
- `docs/reference/public-contract.md`
- `docs/ui-actions.md`
- `eslint.config.js`
- `output/playwright/phase-35-account-isolation.png`
- `output/playwright/phase-35-expired-session.png`
- `output/playwright/phase-35-pending-update.png`
- `output/playwright/phase-35-retained-input.png`
- `output/playwright/phase-35-retained-review.png`
- `output/playwright/phase-35-storage-limits.png`
- `package.json`
- `packages/api-client/README.md`
- `packages/api-client/package.json`
- `packages/api-client/src/schema.d.ts`
- `packages/api-client/src/session.ts`
- `packages/shared/test/fast/contract-foundation.test.ts`
- `playwright.recovery.config.ts`
- `scripts/check-ui-spec.py`
- `scripts/contracts.mjs`
- `scripts/delivery-browser-server.ts`
- `scripts/offline-demo.mjs`
- `scripts/offline-migration-browser.ts`
- `tests/erp-conformance/offline-recovery.ts`
- `tests/offline-browser/offline.spec.ts`
- `tests/recovery-browser/recovery.spec.ts`

## Remaining limits and handoff

No actual 24-hour elapsed offline test, Android/Chrome or iPhone/Safari physical-device/home-screen installation, power-loss/eviction, production TLS/rollout, live Engine, commercial ERP, performance or human owner approval is claimed. Browser service-worker installation is not OS home-screen installation. A 2020 captured-at fixture proves no age-based purge, not elapsed retention. An empty second browser context simulates storage loss; it does not certify hardware loss/recovery. Existing local PostgreSQL/Keycloak remain available; disposable APIs/databases close through their harnesses. Engine datasets/mounts/configuration and original Stitch exports are unchanged.

Reproduce with `npm run test:offline-session-update`, `npm run recovery:demo` and the two-report `npm run test:erp:recovery -- …` command above. [The compatibility runbook](offline-account-updates.md) documents rollout/rollback constraints and the [exact Phase 36 handoff](offline-account-updates.md#exact-phase-36-handoff). P36 may rely on original journal/receipt separation, safe account boundary/exit, explicit version readers, native update/migration proof and scoped forms; reports must exclude pending/unaccepted evidence from accepted totals. P36 was not executed. No commit, push or publication.
