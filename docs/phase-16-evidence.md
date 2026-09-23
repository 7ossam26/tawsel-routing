# Phase 16 evidence — explicit current activity

Started 23 September 2026 (Africa/Cairo), clean HEAD `10692a5` (`phase 15`). No repository or parent AGENTS.md found. Runtime identifies GPT-6; exact picker model suffix and reasoning effort are unavailable. Requested `gpt-6-astra` / `high` is not asserted as observed; model-selection guide consulted. Existing pinned stack retained. No commit/push/publication or later phase authorized by this implementation.

Read master-plan sections 7, 9–10 and 16, current discovery decisions including amendments through D-112, phase README/decision map, R-20/R-26/R-53/R-65, implementation ledger and actual P14/P15 planning, transaction, admission, round/owner code. Viewed original 01-active-driver-trip and 02-stop-details screenshots and HTML; preserved Cairo, light recipient cards, navy stage action and contextual contact links. No original exports edited.

## Prerequisite verification

`$env:PATH='C:\Program Files\PostgreSQL\18\bin;'+$env:PATH; npm run db:local:start`

`npm run test:integration -- apps/api/test/integration/planning-publication.test.ts apps/api/test/integration/start-assignment-race.test.ts apps/api/test/integration/round-start-http.test.ts`

PASS **3 files / 51 tests**, real isolated PostgreSQL, independent connection races, real HTTP/session fixture recovery. `.local/phase-16-prerequisites.log`. No prerequisite implementation repair. Live Engine remains unavailable per P15; manual planning requires none. New provider-dependent tests must remain fixture-labelled.

## A — current activity contract (before B)

Added migration 0013 with admission/attempt/round FKs, unique one-current index, state/arrival constraint and immutable activity/physical-origin history. Stable attempt IDs reuse P13 allocation; merely opening a screen cannot create heading/arrival. Closed canonical schemas cover explicit selection (= heading), arrival, manual physical-origin correction, action-time provenance, coherent reads and action recovery. Selection compares current revision and prior attempt. Arrived work cannot be replaced before resolution (P17); heading replacement will explicitly pause its previous attempt.

`npm run test:integration -- apps/api/test/integration/current-activity.test.ts`: **3 passed**. Real target resolution denies another account/driver scope, unresolved/unadmitted work, wrong identity and stale task revisions. PostgreSQL rejects a second current attempt and arrival without evidence. `npm run contracts:generate` and `npm run test:contracts`: **231 passed**. Initial failures were an incorrect expected denial code and missing negative-fixture keyword labels; corrected, regenerated and rerun. API typecheck initially found an untyped fixture array; explicitly typed before B.

No unresolved prerequisite. Commands, planning integration and browser interaction remain B/C work at this checkpoint; P17 owns outcomes and P20 owns takeover. No phone-only outcome implementation is claimed here.

## B — atomic transitions (before C)

Added explicit heading/arrival/manual-origin handlers through P05, owner account/device/generation checks, scoped current/action-status reads, and actual current activity on the P15 round read. Driver/workday/assignment/task guards serialize all mutations. Relevant source/assignment/pin versions and activity CAS are checked; route revision alone is not a dependency. Attempt state, immutable history, planning current/origin/revisions, accepted result, audit and source-filtered outbound intent share one commit. Replaced heading pauses visibly in history, arrived reselection rejects. Server recording time and untouched device observation are distinct; neither is GPS. Draft saves cannot replace active physical-origin evidence.

`npm run test:integration -- apps/api/test/integration/current-activity.test.ts apps/api/test/integration/planning-publication.test.ts apps/api/test/integration/start-assignment-race.test.ts`: **3 files / 62 passed** (12 current-activity tests, 33 publication, 17 start races), `.local/phase-16-b.log`. Current API tests use real Fastify handlers/PostgreSQL with labelled authenticated principals. Two independent max-one-connection pools and `pg_blocking_pids` barriers prove one effective selection/arrival under concurrent commits. Arrival replay returns the same time/history/result; wrong device/generation preserves rejected evidence. Manual reorder stays compatible; pin change rejects stale arrival. A controlled delayed HTTP planner is superseded; its replacement preserves arrived current/origin while changing next suggestion. Outbox-stage fault rolls back arrival/origin/progress/history/identity, then the same action succeeds. First forecast remains byte-for-byte unchanged.

API typecheck passed. First focused run failed because the pin-test command omitted its required task resource binding; corrected and rerun. One generated-types write reported a transient Windows `UNKNOWN ... open schema.d.ts`; rerunning generation succeeded, then types passed. No unavailable Engine or issuer was represented as live evidence. No dependency blocks C; full queue replay, takeover and outcome resolution remain later phases.

## C — focused real browser surface (24 September, before final review)

Connected `/rounds/current?kind=personal|company` to real round/current APIs with the typed `CurrentClient`. Reused `StopIdentity`, `ContactActions`, action/notice components and existing design tokens. Selecting a recipient previews locally; only “اتجه للعميل” accepts heading, then “وصلت” accepts arrival. Next remains separately labelled. Another browser device sees the round without mutation controls. An uncertain online command is retained in account/round/device-scoped session storage and recovered by stable action ID on reload; this is explicitly not the P33 offline queue.

`npx playwright test -c playwright.current.config.ts`: **1 passed**, real Chromium → Vite → Fastify → isolated PostgreSQL. Fixture account/session resolver and controlled HTTP planner are labelled. Keyboard Enter accepted selection and restored heading focus; touch tap recorded arrival. Intercepted native external links were clicked without any API POST/activity/origin event. A real committed arrival response was discarded; reload recovered the same action and exactly two activity history entries/one origin. Delayed planner completion retained selected current and separate next. Second browser context was read-only. Zero page errors, no horizontal overflow at 360/390/1366 widths, reduced motion enabled. Actual rendered screenshots inspected: `output/playwright/phase-16-heading-mobile.png`, `phase-16-arrived-mobile.png`, `phase-16-arrived-desktop.png`; long Arabic name, phone bidi, concise stage and single navy heading-stage action remained readable.

`npm run typecheck`: PASS all workspaces/scripts. Initial script typecheck needed `deferred<void>` rather than unresolved generic return type. Initial browser run found a real P15 prerequisite defect: storing native `fetch` as a class property then calling it used the wrong receiver in Chromium (`Illegal invocation`). Fixed `RoundsClient` and new `CurrentClient` defaults with a global fetch wrapper; browser rerun passed. Native dialer/WhatsApp/navigation delivery, physical phones, live issuer/Engine, owner review and production deployment are not verified. Outcomes remain unavailable, honestly stated in the arrived demo. `.local/phase-16-browser-demo.json` retains exact real state/history/results for review.

## Final review, verification and remaining limits

- Hardened immutable attempt first-heading/arrival evidence in SQL; normalized source phone values for recipient links; checked event-specific stage payloads. Ordinary source/location changes cannot rewrite a recorded arrival's physical coordinate snapshot.
- First full `npm run check`: **504 passed / 3 failed**. The P13 retained-data upgrade revealed an actual compatibility defect: adding `physicalOrigin:null` changed the old fingerprint without any physical change. New snapshots now omit this optional field until physical evidence exists. The upgrade test passes without weakening its `inputCurrent:true` assertion. Updated the exact table inventory for four new tables. Made the delayed-planner test deliberately choose the opposite of the controlled provider's ordering, eliminating a random UUID-order assumption while retaining the required changed-next assertion.
- `npm run test:integration -- apps/api/test/integration/current-activity.test.ts apps/api/test/integration/planning-jobs.test.ts apps/api/test/integration/database-lifecycle.test.ts`: **3 files / 28 passed**, `.local/phase-16-review.log`.
- `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3016'; npm run check`: **PASS**, zero audit findings, ESLint/OpenAPI/generated checks/all workspace and script typechecks, **23 files / 507 Vitest tests**, all production builds and fixture isolation. `.local/phase-16-check.log`. Existing redirect-only callback 302 warning and large MapLibre chunk warning remain.
- `$env:TAWSEL_CURRENT_PRODUCTION_CHECK='1'; npm run current:demo`: **1 Chromium test passed against production preview**. `.local/phase-16-browser-production.log`. Inspected the resulting mobile render again; same readable stage/card/contact/next hierarchy. This rerun uses the final API/client/component and real isolated PostgreSQL, with the same explicit fixture limitations.
- `npm run test:erp:current`; `npm run test:erp:rounds`; `npm run test:erp:current -- .local/phase-16-browser-demo.json`: **PASS**. Public-only consumers distinguish schema fixtures from the actual browser state report. No actual ERP transport interoperability claim.
- `python -X utf8 scripts/check-ui-spec.py check`: **PASS** all original source/image checks, 105 exported-control dispositions, 157 operations / 64 action rows, 33 designed state cases, 69 links, contrast and six negative checks. Repair: the old checker allowed only P07/P08 availability, rejected unchanged Windows Git CRLF code checkouts, and mutated a prose occurrence rather than the action table in its invented-operation negative test. It now uses explicit verified owner/family bounds through P16, permits only CRLF→LF when checking code against original hashes (images byte-exact), and targets A13 for the negative. Initial duplicate A47 documentation row corrected to A48. No original export bytes were changed.
- `npm run db:migrate`: **0013_current_activity.sql applied locally**. Final read-only inventory: PostgreSQL **18.6**, zero disposable test databases, application tasks/rounds/attempts all **0**. The first ad-hoc inventory script correctly failed the database-name guard when passed the test-control name as a disposable database; fixed the read-only script to query inventory through the allowed application connection. No database guard was weakened or unrelated database removed.
- Actual retained runtime/dependency versions: Node **24.11.1**, npm **11.6.2**, PostgreSQL **18.6**, pg **8.23.0**, Fastify **5.12.5**, TypeScript **6.0.2**, Vitest **5.0.1**, Playwright **1.63.0**. No dependency/lockfile changes. `git -c core.whitespace=cr-at-eol diff --check`: PASS. Engine/config/data/maps, original Stitch exports and migrations 0001–0012 have no diff.
- `npm run engine:live`: **unavailable / exit 1**, at `2026-09-23T21:17:50.907Z` (24 September Cairo); all nine route/table/optimize calls for car/motorcycle/bicycle unavailable, Docker inventory unavailable, local datasets only `.gitkeep`. `.local/phase-16-engine-live.log` and `.local/engine-live-report.json`. No map import, Engine start, data/mount edit or provider fallback claimed. This prevents live routing/dataset/version suitability proof; manual start/current/arrival and controlled-provider state fencing are verified independently.

No external review feedback was received. Self-review fixes and failed checks are recorded above. No owner approval, full offline queue, takeover, outcomes, physical-device/native-app or live issuer/ERP/deployment proof is implied. The exact P17 handoff and required no-auto-next/no-phone-origin outcome rules are in [current-activity.md](current-activity.md#phase-17-handoff). Phase 17 was not executed. No commit/push/publication.

## Changed paths

- `.gitignore`
- `README.md`
- `TAWSEL-DISCOVERY-LOG.md`
- `apps/api/src/app.ts`
- `apps/api/src/current/models.ts`
- `apps/api/src/current/routes.ts`
- `apps/api/src/current/service.ts`
- `apps/api/src/current/state.ts`
- `apps/api/src/planning/models.ts`
- `apps/api/src/planning/queue.ts`
- `apps/api/src/planning/service.ts`
- `apps/api/src/rounds/models.ts`
- `apps/api/src/rounds/service.ts`
- `apps/api/test/integration/current-activity.test.ts`
- `apps/api/test/integration/database-lifecycle.test.ts`
- `apps/api/test/integration/planning-jobs.test.ts`
- `apps/api/test/support/current-fixture.ts`
- `apps/api/test/support/planning-fixture.ts`
- `apps/web/src/components/ui.tsx`
- `apps/web/src/current-activity.tsx`
- `apps/web/src/production-shell.tsx`
- `apps/web/src/styles.css`
- `contracts/current-activity.schema.json`
- `contracts/examples/README.md`
- `contracts/examples/invalid.json`
- `contracts/examples/valid.json`
- `contracts/openapi.yaml`
- `contracts/operations.json`
- `contracts/planning.schema.json`
- `contracts/round-start.schema.json`
- `db/migrations/0013_current_activity.sql`
- `docs/contract-coverage.md`
- `docs/current-activity.md`
- `docs/erp/ERP-PLANNING-INPUT.md`
- `docs/erp/README.md`
- `docs/erp/consumer-quickstart.md`
- `docs/erp/field-and-status-mapping.md`
- `docs/implementation-status.md`
- `docs/phase-16-evidence.md`
- `docs/phases/README.md`
- `docs/phases/coverage-matrix.md`
- `docs/reference/public-contract.md`
- `docs/tracking-and-consistency.md`
- `docs/ui-actions.md`
- `master-plan.md`
- `output/playwright/phase-16-arrived-desktop.png`
- `output/playwright/phase-16-arrived-mobile.png`
- `output/playwright/phase-16-heading-mobile.png`
- `package.json`
- `packages/api-client/README.md`
- `packages/api-client/package.json`
- `packages/api-client/src/current.ts`
- `packages/api-client/src/rounds.ts`
- `packages/api-client/src/schema.d.ts`
- `packages/shared/test/fast/contract-foundation.test.ts`
- `playwright.current.config.ts`
- `scripts/check-ui-spec.py`
- `scripts/contracts.mjs`
- `scripts/current-browser-server.ts`
- `tests/current-browser/current.spec.ts`
- `tests/erp-conformance/current.ts`
- `tests/erp-conformance/rounds.ts`
