# Phase 31 — branch handover, resume and closure

25 September 2026. Inspected master plan, discovery through D-112, phase/decision/requirement maps, DESIGN.md, action map, P19–22/P29/P30 evidence and actual services/contracts. Reviewed original 01/05/08/09 HTML and images. No AGENTS.md found. Initial HEAD was 7513fb7 with P30 changes; while prerequisites ran these were committed externally as 438a6ec (`phase 30`), leaving a clean tree before P31 edits. Preserve those artifacts.

Runtime identifies GPT-6; exact picker variant/effort unavailable. Requested Astra/high is a recommendation, not an attested setting. Consulted model-selection.md. Retain installed pinned dependencies; Node 24.19.0.

Prerequisite command: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=1 --testTimeout=30000 --hookTimeout=30000 apps/api/test/integration/branch-interruption.test.ts apps/api/test/integration/workday-carryover.test.ts apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/partial-return-correction.test.ts apps/web/test/fast/execution-exceptions.test.tsx apps/web/test/fast/driver-flow.test.tsx` — **6 files / 123 passed**, 330.57s. Real isolated PostgreSQL plus labelled UI response fixtures. No prerequisite transaction failure.

Small prerequisite gaps: pending driver offers were not discoverable on another installation; add authorized `pendingRequests` to existing return groups. Between-round closure also needs the retained round activity revision from the day summary, rather than guessing zero. Ordered checkpoint results follow as implemented.

## A — return and branch activity

Connected `/execution/branch?kind=company` source-group/item offer, explicit cumulative claimed subset, interruption and arrival. Display all retained customers and paused heading; arrived customer has an actionable return link. B2C entry contains no custody API/control. `return.listSourceBranchGroups` gains optional additive `pendingRequests` for authorized recovery; original transactions remain intact.

`node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/branch-closure-flow.test.tsx`: **4/4 passed**, 3.30s. Response fixtures exercise actual typed HTTP routes, chosen quantity/source, revision/generation, distinct offer/interrupt/arrival, all fifty visible paused customers, invalid over-offer and no B2C API. Real capacity/transaction prerequisite passed above. Initial typecheck caught mixed `??`/`||`, an unrebuilt generated client and a status-union narrowing; fixed. No unresolved external prerequisite. Real browser interaction follows after B/C.

## B — receipt and resume

Server confirmation is requested for the frozen visit claims; only confirmed claims enable resume, independently of whole-request unresolved/lost/damaged portions. Current-trip page shows the branch stage instead of customer execution controls. Unknown requests retain exact envelopes across reload and query their correct family result endpoint before replay; pending receipts no longer become terminal review in the shared hook.

`node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/branch-closure-flow.test.tsx apps/web/test/fast/driver-flow.test.tsx`: **2 files / 26 passed**, 5.66s. Includes subset resume with one unresolved piece, unavailable confirmation, loss/disposition separation, exact lost-response reload/retry and other-phone view without writes. Web typecheck passed. Browser/provider evidence remains a separate final check, not established by these fixtures. No material unresolved prerequisite.

## C — closure and continuation

Connected `/execution/closure` to real own-day summary, held records, distinct `round.end`/`workday.end`, explicit heading pause, arrived/branch blockers, actual generation/token and action-result recovery. URL retains the workday after closure/reload. Add optional `RoundSummary.activityRevision` from the authoritative retained activity row so day closure between rounds has a correct anchor. No zero-revision guess. Existing daily preparation retains real held tasks; current page provides explicit owner transfer and confirmed snapshot recovery.

Focused `branch-closure-flow.test.tsx`: **16/16 passed**, 5.31s. Added round→day revision/token mappings, heading checkbox, arrived/branch/other-owner blockers, HTTP pending reload/replay, lost accepted closure response with no second POST, held-work visibility and B2C summary without custody. API/web types passed after narrowing end-round's active ID. This is response-fixture evidence; real API/native ERP/browser validation follows. No settlement, offline promise, next phase or dependency addition.

## Real API/browser acceptance and review

Final `node node_modules/@playwright/test/cli.js test -c playwright.branch-closure.config.ts`: **1 passed**, 47.1s scenario / 1.1m total. Actual Keycloak 26.7.4, Chromium, Fastify, isolated PostgreSQL and a separate native mock ERP process/database/source worker prove:

- Company no-answer produces three held pieces; an arrived customer blocks branch entry and links back to record the result.
- A different heading customer pauses visibly. The driver offers three pieces, claims two, interrupts and arrives through distinct commands. Arrival's accepted HTTP response is lost; reload recovers the same action without duplicate arrival.
- Another browser installation views the same branch segment, has no new-start action, explicitly takes over and reloads its confirmed owner snapshot. The first phone becomes view-only.
- Actual native staff login/form/outbox/public receipt confirms two pieces. The driver waits before confirmation and resumes after it, with one unresolved piece still shown. No browser or server fixture inserts a physical receipt.
- End round explicitly pauses heading and retains the open day; after reload, End day uses the authoritative ended-round revision and generation token. A lost accepted day response remains pending; preparation refuses a fresh start until the same action is recovered.
- New day starts on the same held task identity, with the original unreceived return still listed and no ERP resubmission. Personal closure retains two unfinished tasks without branch/piece/receiver controls.

The report under `.local/phase-31-browser-evidence.json` separates **138 captured public responses** from read-only fixture database audit rows. One response body became unavailable during navigation; its URL is explicitly recorded. Required public evidence is asserted independently by `node --import tsx tests/erp-conformance/branch-closure.ts .local/phase-31-browser-evidence.json` (**passed**), including quantity conservation, waiting/confirmed claims, real owner generation, ended summary and the same-task new-day continuation. Without a report argument the consumer checks canonical fixtures and a negative conservation control only.

Initial setup is labelled: identities/source assignments use the retained fixture setup and controlled routing HTTP. Native receipt, command commits, source outbox and owner/closure operations are real. Logical browser contexts are not physical phones. No live Engine, commercial ERP, phone keyboard/safe-area, Safari/Android or independent owner-acceptance claim.

Failures and fixes: initial browser harness omitted the public provisioning/receiver routes, leaving native setup pending with HTTP 404; enabled the normal integration route configuration. Added whole-harness cleanup on setup failures; removed only the precisely identified failed-run test databases/role/three identities after matching scope/markers/creation records. A later recorder run failed when a navigated response body became unavailable; the recorder now handles and lists this browser limitation while conformance still requires the substantive responses. Neither failed invocation is counted as passing. An example-edit script initially assumed a standalone RoundSummary fixture; used the canonical summary's actual round instead. A guarded personal-identity cleanup refused absent name attributes, then succeeded only after verifying the exact known subject, username and failed-run creation interval. Default-shell Node 25 was used for a few file-edit/administrative commands; verification uses Node 24.19.0.

Visual review replaced primary internal branch UUID display with source-provisioned `sourceBranchName` and mixed numeric formatting with exact Arabic minor-unit display. Added bounded cross-page uncertainty links/guards so an unresolved result cannot be bypassed by visiting closure or preparation. Final focused UI run: **3 files / 49 tests passed**, 7.31s (18 branch/closure + 31 existing driver/exception tests). Post-initial-change real database regression: **2 files / 26 passed**, 107.77s; final broad result follows below and covers the later label projection too.

## Captures and interaction findings

| Capture under output/playwright | Finding |
| --- | --- |
| phase-31-offer-390.png | Distinct offer totals and selected two-piece claim; visible one-stage action and quantity focus. |
| phase-31-waiting-390.png | Recorded arrival plus explicit waiting, disabled resume, retained customer and unresolved goods. |
| phase-31-subset-320.png | Source branch label; 3 requested / 2 received / 1 unresolved; enabled resume, retained customer, zero overflow at 320 CSS px. |
| phase-31-native-subset-1366.png | Separate native mock staff form shows actual two received, one pending. |
| phase-31-other-phone-390.png | Existing round/branch and explicit transfer; no customer movement controls or second start. |
| phase-31-closure-390.png | Accepted outcome counts and reported collection, two held records, explicit heading pause and round-only consequence. |
| phase-31-ended-day-390.png | Accepted day end while unfinished/held records remain. |
| phase-31-personal-closure-390.png | Two retained personal tasks, no custody content or success-delivery claim. |

Captures were visually inspected; scenario assertions cover real selection, keyboard input, checkbox, disabled/enabled transitions, reload and native confirmation. Arabic RTL/reduced-motion and 320/390/1366 viewports are browser evidence, not physical 400% zoom or touch acceptance.

## Reproduce and handoff

Use bundled Node `C:/Users/jo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` on PATH (24.19.0), npm 11.6.2, existing PostgreSQL 18.6 and Keycloak 26.7.4. Vitest 5.0.1 / Playwright 1.63.0 / pinned stack unchanged. No migration/dependency or map import is needed.

```text
npm run db:local:start
npm run identity:start
npm run test:browser:branch-closure
node --import tsx tests/erp-conformance/branch-closure.ts .local/phase-31-browser-evidence.json
node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/branch-closure-flow.test.tsx
```

Manual entry: current round → الإرجاع وزيارة الفرع → offer → claim subset → head/arrive → native ERP confirmation → refresh/resume. Current round or daily list → ملخص العمل وإنهاء الجولة أو اليوم → review retained work → explicit heading pause where needed → end round/day. Use daily preparation for the next round/day. All uncertain requests retain exact identities in this session; full durable offline storage/replay remains P33–35.

Phase 32 may rely on the connected branch/closure pages, actual `branchActivity`/claims/receipt statuses, optional additive pending-offer/branch-label/round-activity-revision read projections, existing owner generation/snapshot logic, scoped in-tab pending recovery links, canonical clients/examples/operation map and this real-browser/native/public-response proof. Full polling monitoring, timing comparison/export, durable offline behavior, former-device evidence adoption and physical-device/owner review remain their later phases. Phase 32 was not executed.

Repository gates: `npm run audit` (zero vulnerabilities), `npm run lint`, `npm run contracts:lint`, `npm run contracts:check`, `npm run typecheck`, `python -X utf8 scripts/check-ui-spec.py check` and full `npm run build` with `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001` all passed. Canonical inventory: **26 schemas / 251 valid / 153 invalid examples / 185 operations**. Existing redirect-only OpenAPI warning and MapLibre size advisory remain. Production fixture isolation passed. Keycloak started for browser validation and stopped afterward; Engine/Stitch data preserved.

Full regression command `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=2 --testTimeout=30000 --hookTimeout=30000` completed in **945.45s: 44 files passed / 1 failed; 918 tests passed / 2 failed (920 total)**. Both failures were missing expected-error `keyword` metadata on the two new invalid examples; all database-backed suites passed, including the final branch-label projections. The schemas correctly rejected both values. Added `required`/`minimum`; the first focused rerun then detected the corresponding generated reference drift. Updated that reference too. The final focused command `node node_modules/vitest/vitest.mjs run --project fast packages/shared/test/fast/contract-foundation.test.ts apps/web/test/fast/branch-closure-flow.test.tsx apps/web/test/fast/driver-flow.test.tsx apps/web/test/fast/execution-exceptions.test.tsx` passed **4 files / 466 tests**, 16.13s. It includes all 417 contract tests and the final recovery-link fix preserving a selected option task ID across pages. `npm run contracts:check` and lint passed again. Together these checks cover all 920 tests after the fixes; there was no second complete 45-file invocation. Failed invocations are retained here rather than counted as passes. The staged diff check also found and fixed a trailing blank line/CRLF at the new branch page's EOF; its final check passed.

## Changed paths

- API reads: `apps/api/src/returns/{service,state}.ts`, `apps/api/src/closure/reads.ts`; regression assertions in `apps/api/test/integration/{branch-interruption,workday-carryover}.test.ts`.
- Connected UI: `apps/web/src/{branch-page,closure-page,current-activity,preparation-flow,production-shell}.tsx`, `apps/web/src/execution-command.ts`, `apps/web/src/styles.css`; `apps/web/test/fast/branch-closure-flow.test.tsx`.
- Public boundary: `contracts/{returns,workday-closure}.schema.json`, `contracts/examples/{valid,invalid}.json`, `contracts/operations.json`, `packages/api-client/{README.md,src/schema.d.ts}`, `docs/reference/public-contract.md`, `docs/contract-coverage.md`.
- Browser/public consumer proof: `scripts/branch-closure-browser-server.ts`, `playwright.branch-closure.config.ts`, `tests/branch-closure-browser/branch-closure.spec.ts`, `tests/erp-conformance/branch-closure.ts`, `package.json`, `.gitignore`; the eight `output/playwright/phase-31-*.png` captures listed above.
- Canonical handoff: `docs/{branch-interruption,returns,workday-closure,ui-spec,ui-actions,implementation-status,phase-31-evidence}.md`, `docs/phases/{README,coverage-matrix}.md`, `docs/erp/{ERP-PLANNING-INPUT,field-and-status-mapping,consumer-quickstart}.md`.
