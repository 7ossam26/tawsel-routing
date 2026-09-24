# Phase 29 — connected ordinary driver delivery UI

Date: 25 September 2026. Starting revision: `c69b649` (`phase 28`).

## Ordered checkpoint evidence

### Prerequisite review

- The worktree was clean and Phase 28's connected daily/preparation/start artifacts, real-browser report and exact-action recovery were inspected rather than inferred from its status row.
- P16 current activity, P17 exact outcome arithmetic, P19 closure, P20 ownership snapshots and P24 monitoring artifacts are present. The focused P16 production page stopped at arrival, as its documented handoff said.
- Small prerequisite repair: `CurrentTarget` had recipient/location data but no authoritative outcome affordance or exact collection amount. The current read now supplies a closed `delivery` affordance from the frozen B2C amount or B2B source allocation and accepted shipping ledger. This prevents browser price recomputation and exposes actual allowed actions.

### A — active trip and contact

- Changed the canonical current snapshot and generated client reference to carry personal/company delivery kind, permitted result actions and exact full/goods/shipping amounts.
- The existing connected selected/current/next read, stable target/attempt IDs, phone normalization and owner-fenced heading/arrival remain the source of the active trip.
- Focused result: `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/current-activity.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts` — **2 files / 26 tests passed** in 90.03s after rebuilding the generated client.
- No external dependency is unresolved for this checkpoint. Browser interaction and zero-command external-link evidence are recorded under Checkpoint C after the complete page is connected.

### B — ordinary delivery

- `/rounds/current` now joins the authoritative current and outcome snapshots. One dominant control advances heading → arrival → full result; no result selects the following customer.
- B2C uses its independent optional collection amount or no amount. B2B displays the server-calculated exact goods, remaining shipping and full total, then submits that same amount in the full command. Partial/refusal/correction controls remain outside this common-path phase.
- A heading customer exposes a secondary simple no-answer action. Its closed payload has no arrival, shipping refusal, reported collection or call count.
- Focused component result: `driver-flow.test.tsx` — **15 passed**, including actual client endpoint mapping, stage, exact collection, no-answer shape, retained session command and ownership denial.
- Focused PostgreSQL result after adding affordance assertions: the current/outcome suite is rerun in final verification below.

### C — failure and simplicity

- Loading/empty/read-only ownership, pending response and retained exact-command states are explicit. A takeover must download and retain the server snapshot token before writes enable; an actual browser run first exposed a missing token propagation and the server correctly rejected it with `sync_required`. The UI now carries the confirmed token in every fenced command.
- Contact/navigation links have descriptive accessible names, LTR phone isolation and local handoff feedback; component and browser checks observe zero business POSTs.
- `npm run test:browser:delivery` — **1 passed**, 37.8s in the final run after the ownership fix and evidence-query correction. Actual local Keycloak 26.7.4, Chromium, Fastify and isolated PostgreSQL verified a two-stop B2C full/no-answer journey plus ordinary mock-B2B exact full delivery, same-ID lost-response retry, accepted-state reload and another-phone takeover/read-only denial.
- Captures: `output/playwright/phase-29-b2c-two-stop-mobile.png`, `output/playwright/phase-29-b2b-full-desktop.png`; durable IDs/actions/outcomes: `.local/phase-29-browser-evidence.json`.
- Evidence classification: local real API/database/issuer/browser; routing is controlled HTTP and B2B is the labelled public mock source. No commercial ERP, live Engine profile, native dialer/WhatsApp/navigation completion or physical-device owner acceptance is claimed.

## Reproduce

```text
node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/driver-flow.test.tsx --reporter=verbose
npm run test:integration -- --maxWorkers=1 apps/api/test/integration/current-activity.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts
npm run test:browser:delivery
```

The browser command requires the repository local PostgreSQL and Keycloak setup. The first attempt stopped before tests with Keycloak unavailable on port 8085; `npm run identity:start` restored that prerequisite. Later runs found and fixed the mandatory takeover snapshot-token defect and an evidence-only query using nonexistent generic columns. During final evidence refinement, three runs exposed an unstable Playwright `route.fetch()`/`route.abort()` combination after the real commit; the harness now deterministically lets the real browser POST finish and throws before the client consumes its response. None of these failures is reported as passing evidence.

## Final verification

- `contracts:generate` produced **26 schemas / 247 valid / 150 invalid examples / 185 operations**; contract check/lint, UI-spec check, ESLint and typecheck passed.
- The Phase 29 driver component suite passed **15/15**; the current/outcome PostgreSQL suite passed **26/26**; the retained Phase 16 current browser regression and new Phase 29 browser acceptance each passed **1/1**.
- The first default `npm run check` test stage passed **876** assertions and reported two findings: its lifecycle guard had not yet admitted the three Phase 29 local-UI operations, and the older retry/deferral HTTP test exceeded the default 10-second per-test limit under full-suite load. The lifecycle guard was corrected and passed **410/410** assertions. The older file independently passed **15/15** in 70.59s.
- The complete accepted Vitest rerun with the repository's existing scoped `--testTimeout=30000` allowance passed **43 files / 878 tests** in 778.00s. All API, web, generated-client and mock-ERP production builds passed; web fixture isolation passed. Vite retained its non-failing MapLibre chunk-size advisory.
- No assertion failure, browser failure or default-timeout result is presented as green evidence.

## Handoff to Phase 30

Phase 30 may rely on the production active map/list, current/next separation, `CurrentTarget.delivery` server affordance, exact full-result command builder, simple no-answer path, stable session action recovery, online takeover snapshot-token propagation, focused component coverage and the real-browser evidence above. It should add focused partial/refusal/correction choices without moving them onto the dominant ordinary path. Phase 30 was not executed.

## Model record

The requested picker recommendation was GPT-5.6 Sol at high reasoning. This runtime identifies the GPT-5 family but does not expose a verifiable picker suffix or reasoning label, so availability/use of that exact setting is not asserted.
