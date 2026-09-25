# Phase 33 — PWA downloads and atomic local capture

Date: 25 September 2026. Started at `854c143` (`phase 32`), clean worktree. No applicable `AGENTS.md` found in the workspace or its ancestors. Only Phase 33 is authorized; no commit, push, publication or Phase 34 execution.

Runtime identifies Codex/GPT-6; the exact picker suffix and reasoning setting are not exposed to this task. Requested Astra/xhigh is recorded as a recommendation, not a verified setting.

## Prerequisites

Read current master-plan sections 6, 10–11, 16, discovery amendments through D-112, phase guide/decision map/assigned requirement rows, implementation ledger, actual session, device, execution, preparation and monitoring code/contracts. Actual existing commands already carry immutable identity/observation fields. Existing UI uses sessionStorage, which is not durable offline evidence.

`node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/session-auth.test.ts apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/round-start-http.test.ts apps/api/test/integration/monitoring-snapshot.test.ts apps/web/test/fast/preparation-flow.test.tsx apps/web/test/fast/driver-flow.test.tsx --maxWorkers=2 --testTimeout=30000`: **6 files / 71 tests passed**, 111.88s. Real isolated PostgreSQL for server tests, labelled fetch/jsdom fixtures for components. Log: `.local/phase-33-prerequisites.log`. Explicit Node 24.19.0 path used for the Vitest process; npm's PowerShell launcher still ran installation under Node 25.2.1 and emitted engine warnings. Subsequent commands use the supported Node executable directly.

Pinned Dexie 4.4.6, Workbox build 7.4.1, fake-indexeddb 6.2.5. Primary documentation reviewed: [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction()), [Workbox build](https://developer.chrome.com/docs/workbox/modules/workbox-build), [Workbox precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching). Transaction completion determines saved feedback; network awaits stay outside transactions; API/map data are excluded from shared Workbox caches.

## Ordered checkpoints

### A — focused storage check passed before atomic capture work

Versioned Dexie stores use explicit kind/tenant/account/device partitions. Selection guards and download validation reject foreign identity, unstarted/ended/view-only work and stale revisions. The shell/fonts/scripts are precached without API or map runtime caching, forced activation, automatic reload or queue expiry. Current APIs provide authorized task/plan context; existing planning records do not expose road geometry. That narrow prerequisite gap will be addressed before final route-context verification.

`node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/local-action-capture.test.ts`: **3/3 passed**, 1.76s, labelled simulated IndexedDB with actual Dexie transactions. Reopen retains recipient details; other kind/device/account cannot select that download; ended/missing-owner-snapshot/stale versions reject. Web TypeScript check passed. Real production-worker browser reopen is reserved for C; the simulated test is not claimed as browser evidence.

### B — atomic capture and UI focused checks passed before C

The production ordinary heading/arrival/full/no-answer/partial/refusal path commits immutable envelopes, account-scoped sequence/dependency and pending effects in one Dexie transaction before any POST or saved feedback. Last confirmed snapshots remain separate. The online execution hook now uses the same journal for additional execution commands; those pages still require connectivity. Server receipts must be stored before local pending cleanup. The UI shows phone-saved effects separately from confirmed progress and keeps unsaved editor input on transaction failure.

`node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/local-action-capture.test.ts apps/web/test/fast/local-capture-ui.test.tsx apps/web/test/fast/driver-flow.test.tsx --maxWorkers=1`: **3 files / 28 tests passed**, 9.57s (`.local/phase-33-checkpoint-b.log`). Tests inject quota and native transaction abort after the action write, assert all stores roll back, verify immutable retries/dependencies/cross-tab stale capture, preserve two-piece input with no POST/no saved notice, reopen offline arrival/full evidence and guard account logout. These are explicitly simulated IndexedDB/jsdom fixtures, not physical-browser proof.

Earlier component runs exposed IndexedDB setup occurring after Dexie import, stale sessionStorage assertions and an inconsistent personal-kind fixture. Setup now precedes component imports and old assertions inspect the actual journal. No failed run is presented as passing. Full extended execution regression and real browser verification follow in C.

### C — durability, actual browser and final checks

Downloads now verify coherent before/after device/current reads, account capabilities, active owner generation, exact plan identity and nonregressing revisions. Local inspection preserves original IDs/bytes, sequence, dependencies, versions and uncertain capture-clock evidence. A committed storage write probe gates new starts. Unsupported local formats stop execution without deleting evidence. Deliberate account changes/logout expose pending work.

The narrow route prerequisite repair adds optional `PlanningRoutePolicy.roadRoute`, using the existing validated OSRM result schema and existing JSON column. The worker obtains geometry for immutable plan order outside its database transaction with a bounded deadline; unavailable geometry remains null and does not invalidate a good plan. Tests use controlled HTTP OSRM/VROOM, not a live Engine or map import. Existing pinned package versions were not upgraded; Dexie 4.4.6, Workbox build 7.4.1 and test-only fake-indexeddb 6.2.5 were added.

Final actual-browser command: `& 'C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts/offline-demo.mjs`. **1/1 passed**, 13.8s test / 24.2s Playwright run. Log `.local/phase-33-final-browser.log`; redacted fixture result `.local/phase-33-browser-evidence.json`; Chromium **153.0.8010.12**. The helper builds foundation/public client and production web, generates Workbox and verifies production fixture isolation before starting real local Keycloak/Fastify/isolated PostgreSQL browser fixtures. Workbox precaches **16 assets / 2,363,607 bytes**. The API/database fixture is disposed after the test; the ignored persistent browser profile remains available for inspection.

The real browser verifies: an offline unstarted plan has a disabled start and creates zero rounds; an online accepted round downloads details and the controlled provider's persisted road; offline heading and arrival commit; a native IndexedDB abort while adding the outcome's pending effect leaves both action/pending counts unchanged at two; the visible failure remains until a successful capture produces three records; confirmed revision remains zero; the entire Chromium process closes and a new one opens the same profile while offline; all saved bytes/dependencies survive; server actions/outcomes/history and authorized server monitoring contain none of the three unsent action IDs; account exit remains blocked; caches contain shell/fonts but no API/maps. This is a seconds-long real browser-storage test, not a 24-hour/device-retention claim.

Reviewed actual captures:

- [Offline mobile round](../output/playwright/phase-33-offline-mobile.png): three phone-saved actions, separate 0/2 confirmed progress, retained details/contact/collection, one dominant next action and explicit stored road without basemap.
- [Reopened diagnostics](../output/playwright/phase-33-reopened-evidence.png): all three saved actions remain inspectable with uncertain observation clock and collapsed metadata; long IDs scroll within their diagnostic panel.
- [Account exit guard](../output/playwright/phase-33-account-guard.png): logout is blocked with actionable links to saved evidence and the round. Review found crowded recovery links; spacing was corrected before the final browser run. Mobile RTL has no page-level horizontal overflow. No human owner or physical-device approval was obtained.

Final checks below use Node 24.19.0 at the explicit path above; `node` in the commands is shorthand for that executable. npm audit used that executable with `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`, because the PowerShell npm launcher otherwise chooses Node 25.

| Executed command | Actual result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --project fast --maxWorkers=2` | **19 files / 567 passed**, 27.08s, `.local/phase-33-fast-final.log`. Includes 10 real-module simulated-IndexedDB cases, four local-capture UI cases and new-start storage-probe failure. |
| `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/download-route-context.test.ts apps/api/test/integration/planning-jobs.test.ts apps/api/test/integration/planning-publication.test.ts --maxWorkers=2 --testTimeout=30000` | **3 files / 47 passed**, 146.15s, real isolated PostgreSQL/controlled HTTP; `.local/phase-33-route-regression.log`. |
| `node node_modules/eslint/bin/eslint.js .` | Passed; `.local/phase-33-lint.log`. |
| `node <npm-cli.js> audit --audit-level=high` | **0 vulnerabilities**; `.local/phase-33-audit.log`. |
| `node scripts/contracts.mjs generate` then `node scripts/contracts.mjs check` | Passed: **27 schemas / 254 valid / 155 invalid / 185 operations**. |
| `node node_modules/@redocly/cli/bin/cli.js lint contracts/openapi.yaml` | Passed; existing redirect-only session callback warning (no 2XX) remains. |
| `node --import tsx tests/erp-conformance/planning.ts` | Passed canonical/public planning and new road provenance checks; no live ERP claim. |
| `node node_modules/typescript/bin/tsc -p <config> --noEmit` for `apps/api/tsconfig.json`, `apps/web/tsconfig.json`, `packages/api-client/tsconfig.json`, `tsconfig.scripts.json`, `apps/mock-erp/tsconfig.json`, `apps/mock-erp/tsconfig.ui.json` | All passed. |
| `node node_modules/typescript/bin/tsc -p <config>` for `packages/shared/tsconfig.json`, `packages/api-client/tsconfig.build.json`, `apps/api/tsconfig.build.json`, `apps/mock-erp/tsconfig.build.json`; `node scripts/build-public-client.mjs` | Foundation, public client, API and mock ERP builds passed. |
| `node ../../node_modules/vite/bin/vite.js build` from `apps/web`; `node scripts/build-pwa.mjs`; `node scripts/check-production.mjs` | Passed through demo; existing large-chunk warning remains. |
| `node ../../node_modules/vite/bin/vite.js build --config vite.config.ts` from `apps/mock-erp` | Native ERP production UI build passed. |
| `python scripts/check-ui-spec.py` | Passed all source/hash, canonical action coverage, Arabic state, link, contrast and negative checks. This is specification validation, separate from browser evidence. |
| `git diff --check` | Passed after final fixture line-ending cleanup. |

Failed intermediate checks were corrected, not counted as passing: incomplete legacy component receipt fixtures; IndexedDB installed after module import; a wrong personal fixture URL; TypeScript mismatches against the actual receipt/optional prop schema; `console` absent from the build-script lint environment; the first browser test incorrectly expected the offline start button to be absent (the actual required behavior is disabled, now asserted together with zero server rounds); a guessed UI-check path was nonexistent (the real check is `python scripts/check-ui-spec.py`); that check then found its older lifecycle allow-list missing P33, now updated only for the three local-ui operations. A mistaken compile without the build config emitted 221 untracked `.js` files beside their `.ts` sources; all were path-validated and removed, then the proper build configurations passed. Final whitespace check corrected mixed CRLF on three fixture lines. The installed Node 25 launcher warning and harmless Playwright color warnings do not constitute supported-runtime verification.

## Changed artifacts and stopping point

Production files: `apps/web/src/local-work.ts`, `download-work.ts`, `local-status.tsx`, actual current/activity/exception/execution/account/preparation/closure components, route-map/style/shell wiring, `apps/web/scripts/build-pwa.mjs`, manifest/index/main; optional road capture in `apps/api/src/planning/worker.ts`. Versioned canonical local/planning schemas and examples, generated client/reference/operation coverage, public-client README, ERP planning/mapping/quickstart/conformance and phase/status/runbook/action docs are updated. No migration, new server endpoint or wire action/event was added.

Verification files: `apps/web/test/fast/local-action-capture.test.ts`, `local-capture-ui.test.tsx`, `local-work-fixture.ts`, real-journal execution fixtures/regressions and early IndexedDB setup; `apps/api/test/integration/download-route-context.test.ts` and routing fixture; `tests/offline-browser/offline.spec.ts`, `playwright.offline.config.ts`, `scripts/offline-demo.mjs`; canonical/UI lifecycle checkers; package scripts/lockfile; reviewed PNGs. `.local` profiles/logs and Playwright raw results stay ignored. Engine data/mounts and original Stitch exports are unchanged.

The full repository PostgreSQL suite was **not** rerun: verification consists of the 71 prerequisite tests, 47 targeted planning/database tests, all 567 fast tests and the real browser/production checks above. Physical Android/Chrome and iPhone/Safari, installed home-screen review, power-loss/eviction/storage-clear recovery, a real 24-hour observation, production deployment, live Engine routing, commercial ERP and human owner acceptance remain unrun. There is no universal background-sync or phone-loss protection claim.

Phase 34 may rely on the exact bytes/envelopes in `LocalWork.actions`, transactionally paired pending effects/counters, acknowledged receipt store, scoped confirmed downloads, pure pending projection, guard/diagnostic UI and reproducible browser evidence. It must preserve original IDs/observations/base revisions/generation/dependencies while implementing ordered replay, cross-tab coordination and conflict handling. Full authentication/exit/update compatibility recovery remains Phase 35. [Schema boundaries, supported commands and reproduction](offline-local-capture.md). No next-phase execution, commit, push or publication.
