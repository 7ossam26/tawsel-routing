# Phase 30 — focused driver exceptions and corrections

Date: 25 September 2026. Starting HEAD: `7513fb7` (`phase 29`), clean worktree. No applicable AGENTS.md found. Read the master plan, current discovery amendments through D-112, phase README/decision/requirement maps, implementation ledger, P18/P23/P29 evidence and actual services/clients/components. Inspected original 02-stop-details and 09-sync-conflicts HTML and images; exports and Engine data remain untouched.

Model record: this runtime identifies GPT-6; the exact picker variant and reasoning setting are not exposed to the agent. Requested recommendation is `gpt-6-astra` / `high`; reviewed the model-selection guide, but cannot attest the picker setting.

## Prerequisites

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/retry-deferral-urgency.test.ts apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/current-activity.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts`: **4 files / 90 tests passed**, 355.90s, real isolated PostgreSQL. The quiet reporter initially looked stalled; read-only database/log inspection showed ongoing disposable database creation/checkpoints. No service repair was necessary. The P29 component prerequisite passed **15/15** in 12.00s.

## Checkpoint A — partial and refusal

Added a shared frozen delivery projection with integer source quantities/unit prices and effective prior shipping. The current read supplies it; B2C now advertises the already-supported simple refusal command. Added focused partial page and refusal sheet, exact preview, explicit unpaid shipping, retained scoped drafts and contextual entry. No amount editor or B2C pieces/fee/custody controls. Server commands continue to revalidate authoritative data.

`node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/execution-exceptions.test.tsx apps/web/test/fast/driver-flow.test.tsx`: **2 files / 21 passed**, 7.48s. Actual HTTP client mappings with labelled response fixtures prove 2/3 = 250, one return remainder, invalid quantity, source denial, cancellation without POST, retained input/focus and paid/unpaid/simple B2C refusal. `npm run typecheck` passed. Initial typecheck caught a nonexistent generated alias; corrected it to the canonical target delivery type. Contract generation passed 26 schemas / 247 valid / 150 invalid / 185 operations.

Browser/real API acceptance follows after connected checkpoints B/C. No missing material prerequisite. Session drafts are not the future durable offline queue.

## Checkpoint B — scheduling context

Connected an independent task-options/history page reached from the current task or held/previous work link. It reads real eligibility reasons, keeps deferred/resolved work discoverable, and submits exact defer/activate/retry/driver-urgency commands with current-target and eligibility revisions. Pin review links preserve task/round context; repaired the existing location page's hard-coded generation for execution entry, propagating the actual owner generation and takeover snapshot token. Draft scheduling input and uncertain exact requests survive in-session navigation.

Focused A real PostgreSQL regression passed **14/14**, 48.73s. Focused UI checkpoint: **2 files / 24 passed**, 5.99s, including capacity/future denial with zero POSTs, retained task visibility, exact urgency/defer endpoint/payload mappings and pin context. Browser scheduling and pin interaction remains a final acceptance check. Typecheck initially caught optional legacy history; handled missing history explicitly. No material dependency unresolved.

## Checkpoint C — bounded recording correction

Added a dedicated correction page and shared result fields. Availability now includes the first original result and frozen replacement inputs; prior collection excludes the replaced attempt. UI displays original/effective/proposed quantities and amounts, honors availability/current owner, retains draft base revision, and requires review after a changed revision. A terminal rejection/review retains the exact action and server response across reload; uncertain requests recover by action ID. No staff or client-time override.

Focused command: the same two UI files passed **27/27**, 6.98s. New response-fixture cases cover receipt/day closure arriving during edit, retained selection and evidence after reload, no false success, and accepted lost-response recovery with one POST. Full workspace typecheck passed. These are client/component fixtures; database dependency-race guarantees remain the real P23 suite and the following real-API browser evidence. No permission pause or Phase 31 work.

## Real API and browser acceptance

`npm run test:browser:exceptions`: **1 passed / 52.6s** in the final pre-runtime-review run. Actual local Keycloak 26.7.4, Chromium, Fastify and disposable PostgreSQL exercise:

- Assigned driver urgency while heading and a permitted pin correction, retaining the same current target.
- 2/3 whole pieces, 250 EGP, one return remainder; cancel/back retains two with zero commands before the explicit save.
- Accepted correction from two to one piece (150 EGP), preserved original/effective revisions; actual driver return request and native public ERP subset receipt arriving while a new correction is open; durable review denial after reload.
- Shipping-paid refusal (50 EGP), accepted whole retry and 300 EGP full amount with zero remaining shipping; no-answer on that successor remains separate.
- Explicit unpaid-shipping refusal (zero collection, 50 EGP unpaid), future deferral and unavailable activation. Public admissions fill 50 remaining stops, so whole retry remains held with a capacity explanation. The final browser rerun additionally checks a command-time capacity change while the retry form is open.
- Personal refusal and simple correction without pieces/shipping/branch controls; actual workday closure arriving during edit rejects correction and preserves input/history.

`node --import tsx tests/erp-conformance/exceptions.ts .local/phase-30-browser-evidence.json`: passed captured public current/correction JSON, integer allocations, prior-fee exclusion, retained original/effective revisions and receipt denial. Running it without an argument checks canonical fixtures/negative controls only. Report data distinguishes direct database audit evidence from captured public responses. Routing is controlled HTTP and source input uses the labelled mock public boundary; issuer, application transactions, native receipt and closure commands are real local services.

Failures and review feedback: first browser run exposed clickable task selection while refresh ignored selection; list/marker buttons now disable while pending/busy, and the scenario verifies the selected recipient. Second run exposed a harness assumption that task details were always closed; it now checks the actual `open` state before toggling. Subsequent full journeys passed. Visual review found a narrow refusal footer button and success-colored unsaved amount; the footer now gives confirmation the wide column and previews use neutral navy/blue with “المبلغ المطلوب عند التأكيد”. Review denial copy is concise; action identity is under its own evidence disclosure. None of the failed runs is reported as green.

## Render and interaction findings

| Capture | Actual observation |
| --- | --- |
| `output/playwright/phase-30-partial-360.png` | 360×800 partial page, full whole-piece field/250 amount/remainder/action; no horizontal overflow. |
| `output/playwright/phase-30-unpaid-sheet-390.png` | 390×844 refusal sheet, explicit radio choice, neutral zero preview, remainder and full-width confirmation. One Radix portal; heading focus on open and trigger focus on cancel verified. |
| `output/playwright/phase-30-correction-1440.png` | 1440×900 original/effective/proposed comparison with retained revision and exact amount. |
| `output/playwright/phase-30-receipt-denial-390.png` | Receipt denial keeps original/effective results and selected full draft; reload retains evidence. |
| `output/playwright/phase-30-future-1366.png` | 1366×768 future task stays discoverable, exact server blocker beside activation. |
| `output/playwright/phase-30-capacity-320.png` | 320 CSS px reflow, retained held task, focusable blocked retry and capacity explanation; no horizontal overflow. This is viewport reflow, not physical 400% browser-zoom evidence. |
| `output/playwright/phase-30-day-denial-personal.png` | Personal day-denial comparison, no piece/shipping/custody controls, retained selection. |

The browser uses Arabic RTL and reduced-motion emulation; screenshots were visually inspected. Cancellation/selection/radio/date/submit/focus interactions are actual Chromium, not screenshot-only claims. Physical touch, on-screen keyboard/safe-area behavior, iPhone Safari/Android browser, native external apps and owner acceptance remain unverified. No live Engine or commercial ERP claim.

## Reproduce

Use the repository's Node 24 range (the bundled runtime is `C:/Users/jo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`) before invoking npm. Local PostgreSQL and Keycloak must be running; `npm run db:local:start` and `npm run identity:start` use the existing marked local services. No map imports are needed.

```text
node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/execution-exceptions.test.tsx apps/web/test/fast/driver-flow.test.tsx
npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts
npm run test:browser:exceptions
node --import tsx tests/erp-conformance/exceptions.ts .local/phase-30-browser-evidence.json
python -X utf8 scripts/check-ui-spec.py check
```

The browser command creates disposable users/database, publishes no site, runs no map import, and cleans its own fixture resources. Generated result/trace folders are ignored; seven review captures are deliverables. Manual tap flow: start via `/prepare?kind=company` → current task → `خيارات المهمة` → partial/refusal; use `التأجيل والأولوية والسجل` or `العمل المؤجل والنتائج السابقة` for scheduling/history → `مراجعة النتيجة وتصحيح التسجيل`. The reproducible browser test seeds the necessary data through public source intake.

## Verification and remaining limits

Post-change real database suite: `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts` passed **63/63**, 272.81s. This includes existing independent-connection receipt/correction races, rollback/durability and new frozen-input/original-view assertions. Canonical inventory is **26 schemas / 249 valid / 151 invalid / 185 operations**. No command/event schema was weakened and no migration/dependency added.

The shell initially resolved Node **25.2.1** even though package engines require Node 24; those results above are labelled accordingly. Final supported-runtime checks use the available bundled Node **24.19.0**. npm **11.6.2**, PostgreSQL **18.6**, Vitest **5.0.1**, Playwright **1.63.0**, Keycloak **26.7.4** and the existing pinned stack are retained. A new dominance test initially assumed jsdom excludes closed-details content from role lookup; corrected it to inspect the native `open` property while real browser visibility remains separately verified.

Session draft/action storage is bounded in-tab recovery, not P33–P35 durable offline capture/replay. Former-device evidence adoption remains P34. No branch/closure screen, staff override, underpayment editor, B2C custody, commit, push, publication or Phase 31 execution.

## Handoff to Phase 31

Rely on `deliveryFor` frozen integer allocation/prior-fee projection; current partial/refusal command wiring; `execution-result.tsx` shared exact result fields; `execution-options.tsx` eligibility/pin/history context; `correction-page.tsx` original/effective/review flow; `execution-command.ts` generation/token and same-action recovery; canonical additive read fields/generated client, focused tests and actual browser/consumer evidence. Existing P29 full/no-answer remains the ordinary path. Phase 31 adds branch and closure views through its existing APIs and must preserve these focused flows and their server bounds.

## Supported-runtime verification

With bundled Node 24.19.0 prepended to `PATH`:

- Focused UI final: **2 files / 30 tests passed**, 15.56s. This includes the added ordinary-flow hierarchy/pending-selection checks and takeover-snapshot scheduling command check.
- `npm run test:browser:exceptions`: **1 passed**, 1.9m scenario / 2.7m total. Captures and public evidence report were refreshed. Public-only `exceptions.ts` conformance passed again against this run.
- `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001 npm run build` (PowerShell environment assignment): all foundation/API/web/mock-ERP builds and production fixture isolation passed. Existing MapLibre chunk-size advisory remains. The first build invocation lacked the required API-base environment setting and failed honestly at Vite config load; rerun with the documented setting passed.
- The default Node 25 repository check passed audit (zero vulnerabilities), ESLint, contract lint/check and types before its broad test stage. The standard redirect-only OpenAPI warning remains. Its broader integration failures under concurrent host load are recorded below after the isolated rerun, not counted as a successful full check.

Local Keycloak was started for the browser checks and stopped afterward; test-only users/databases are disposed by the harness. Existing PostgreSQL and all Engine/real application data remain in place.

## Changed paths

```text
.gitignore
apps/api/src/corrections/state.ts
apps/api/src/current/service.ts
apps/api/src/outcomes/delivery.ts
apps/api/test/integration/outcome-progress-outbox.test.ts
apps/api/test/integration/partial-return-correction.test.ts
apps/web/src/components/active-route-map.tsx
apps/web/src/correction-page.tsx
apps/web/src/current-activity.tsx
apps/web/src/exception-editor.tsx
apps/web/src/execution-command.ts
apps/web/src/execution-options.tsx
apps/web/src/execution-result.tsx
apps/web/src/location-review.tsx
apps/web/src/production-shell.tsx
apps/web/src/styles.css
apps/web/test/fast/driver-flow.test.tsx
apps/web/test/fast/execution-exceptions.test.tsx
apps/web/test/fast/execution-fixture.ts
contracts/corrections.schema.json
contracts/current-activity.schema.json
contracts/examples/invalid.json
contracts/examples/valid.json
contracts/operations.json
docs/contract-coverage.md
docs/corrections.md
docs/current-activity.md
docs/eligibility.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/consumer-quickstart.md
docs/erp/field-and-status-mapping.md
docs/implementation-status.md
docs/phase-30-evidence.md
docs/phases/coverage-matrix.md
docs/reference/public-contract.md
docs/ui-actions.md
docs/ui-spec.md
output/playwright/phase-30-capacity-320.png
output/playwright/phase-30-correction-1440.png
output/playwright/phase-30-day-denial-personal.png
output/playwright/phase-30-future-1366.png
output/playwright/phase-30-partial-360.png
output/playwright/phase-30-receipt-denial-390.png
output/playwright/phase-30-unpaid-sheet-390.png
package.json
packages/api-client/README.md
packages/api-client/src/schema.d.ts
playwright.exceptions.config.ts
scripts/exceptions-browser-server.ts
tests/erp-conformance/exceptions.ts
tests/exceptions-browser/exceptions.spec.ts
```

### Broad regression failure and isolated rerun

The default Node 25 `npm run check` test stage finished **37 files passed / 7 failed; 873 tests passed / 6 failed**, 830.27s. `outbox-sender.test.ts` could not collect because a concurrently rebuilt generated client schema was briefly locked (`EBUSY`). Six failures were time limits: current-activity and monitoring teardown hooks (10s), database lifecycle/P20 upgrade/retry HTTP demo (10s), and receiver process-restart test (30s). No assertion mismatch was reported. The concurrency mistake was in this run's orchestration: foundation/browser builds wrote generated client files while the broad suite read them.

Final rerun is isolated from builds/browser/issuer, using Node 24.19.0:

```text
node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=2 --testTimeout=30000 --hookTimeout=30000
```

This is a command-local allowance; repository test settings and assertions are unchanged. **44 files / 896 tests passed**, 933.72s. No failures in this isolated run.

## Final ownership review

Review found that correction authorization follows the latest round, while the initial UI read ownership from the outcome’s original round. The focused repair adds `executionRoundId` to the availability read, uses its device generation/snapshot token, and keeps the correction payload/history on the original round. Snapshot reads also remain available after ending a round during an open workday. The server’s existing ownership/dependency fence is unchanged. Cross-round PostgreSQL and connected UI regression results are recorded after verification below.

Final ownership regression command (Node 24.19.0, after rebuilding foundation):

```text
node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=2 --testTimeout=30000 --hookTimeout=30000 apps/web/test/fast/execution-exceptions.test.tsx apps/web/test/fast/driver-flow.test.tsx apps/api/test/integration/partial-return-correction.test.ts -t "P30:|."
```

The pattern includes all tests in these three files: **81/81 passed**, 205.64s (**50 real PostgreSQL correction tests + 31 connected UI tests**). The new PostgreSQL case starts a later round on a different phone in the same open workday, checks the prior phone is denied, and corrects the original round with the latest generation while retaining both records. The UI case verifies the latest round's snapshot is fetched even after round end, while the command retains the original round. Final Node 24 `npm run lint`, `npm run contracts:check`, `npm run typecheck` and UI-spec checks passed.

The strengthened command-time capacity browser run initially failed an immediate post-resize overflow assertion (39.5s). A diagnostic rerun passed layout unchanged but caught the audit assertion treating PostgreSQL bigint revisions as numbers (48.8s). The test now waits for font/viewport reflow, retains the no-overflow invariant and compares the explicitly converted revision. The next complete journey passed (51.4s), including rejected retry/no extra attempt and unchanged accepted correction history. Visual inspection of the capacity denial prompted removing the machine reason prefix from display only; the raw receipt remains retained. Scheduling review copy now also restores from retained evidence after reload, verified in the final rerun below.

The reload-only review run passed (47.0s / 56.9s total), but visual review found its capacity capture was still loading. Waiting for the loaded selection then exposed a real retained-context defect: reload returned to the task originally in the URL (40.6s failed run). Task selection now updates the local URL, retaining its task-scoped action draft and receipt context. The browser asserts the selected task and disabled retry after reload before taking the final screenshot.

## Final accepted result

Final Node 24 real-API journey: **1 passed**, 41.2s scenario / 51.2s total (`node node_modules/@playwright/test/cli.js test -c playwright.exceptions.config.ts`, after the foundation build). All seven captures and the public-response evidence report were refreshed. The loaded 320px capacity capture was visually reinspected: selected held task, retained rejection after reload, disabled retry, clear Arabic reason and history entry remain present, without overflow. Public-only conformance passed against this exact report. Final changed-file ESLint, web typecheck, production web build and fixture-isolation check passed after the retained-task fix. Full workspace production builds had already passed; the existing MapLibre size advisory remains.

Completed A/B/C within Phase 30. Latest schema inventory remains 26 / 249 valid / 151 invalid / 185 operations. The supported-runtime broad suite passed 896 tests; subsequent correction API/UI regression passed 81 tests, and the final browser explicitly covers the last retained-task/display changes. These are separate runs, not an invented combined test total. Every known failed invocation and its resolution is recorded above. Keycloak was stopped after verification, disposable browser users/databases were cleaned, and existing PostgreSQL/Engine data remains untouched. No Phase 31 execution, commit, push or publication.
