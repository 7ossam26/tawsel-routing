# Phase 28 — connected daily work, preparation and route start

Date: 24 September 2026. Starting revision: `05ce349` (`phase 27`).

## Scope delivered

The production web shell now connects `/day` and `/prepare` to the existing authenticated monitoring, planning, round-start and device-ownership APIs for personal and company drivers. The journey keeps daily work categories distinct, lets valid work proceed while unresolved locations remain excluded, treats prepared company work as upcoming rather than custody, persists preparation choices, shows durable planning job states, supports explicit manual ordering after an honest Engine failure, and starts only a current input-valid ready/manual plan.

The start boundary keeps one immutable `round.start` envelope in session storage until its result is known. A timeout exposes status lookup and same-command retry; it does not mint another action. An already-active round becomes a continue action. A round owned by another phone offers explicit takeover and never a second start.

No schema, operation, migration or ERP administration interface changed. Phase 28 consumes the canonical interfaces already owned by P10–P15, P20, P24 and P27. The only prerequisite repair was to wrap the default browser `fetch` receiver in the older monitoring, planning and locations public clients; actual Chromium exposed the unbound native method as `Illegal invocation`.

## Ordered checkpoints

### Prerequisite review

- Worktree was clean at `05ce349`; Phase 27 public source/receiver boundaries were treated as immutable prerequisites.
- Relevant intake, location, planning, publication, start, session and ownership paths were exercised against real PostgreSQL/API state by the connected browser proof and focused regression commands below.
- The small browser-client fetch binding defect was repaired before claiming UI evidence. No business rule was weakened to make the journey pass.

### A — connected daily work

- `/day?kind=personal` shows ready and unresolved work together; the unresolved item links to location recovery while the ready item remains usable.
- `/day?kind=company` distinguishes prepared/upcoming, held, deferred and unresolved work. Prepared ERP work is labelled as not on the driver's custody.
- The existing B2C creation and P27 native ERP source workflows remain the entry points. Tawsel does not add a duplicate commercial assignment/editor screen.
- Focused component coverage proves the usable-valid-work and category distinctions.

### B — preparation and planning

- Vehicle, origin, endpoint and planned-start choices are explicit and saved through `planning.saveDraft`; draft edits do not imply a plan or a start.
- Queued/running/failed/partial/obsolete job states remain visible. Partial/unassigned work cannot be started.
- A controlled real HTTP `503` from the Engine leaves the database/API available and shows failure truthfully. The user may adopt an explicit complete manual order; the UI never substitutes a straight-line or timer-based success.
- A manual fallback includes every currently eligible monitored task, not only an older retained route. This defect was found by the first real Engine-failure run and fixed before the accepted evidence run.
- A lost planning response retains the exact action identity and local choices.

### C — readiness, start and ownership

- Readiness rejects an actually stale plan after new work changes the input fingerprint. Refresh obtains the new plan; start then creates exactly one round.
- The start envelope is persisted before transmission. Unknown delivery offers result lookup and an exact-envelope retry.
- Existing active work routes to the current round. A different device receives continue/takeover choices and no start control.
- Both accepted browser journeys end on the connected current-activity screen and database evidence contains two rounds and two accepted `round.start` actions only.

## Actual browser and database proof

Run `npm run test:browser:preparation`.

The harness starts actual local Keycloak 26.7.4, a real disposable PostgreSQL database, the real API and production web shell, Chromium, and a controlled HTTP Engine. It creates and later disposes issuer users and database state.

1. Personal/B2C mobile journey: real phone login; ready plus unresolved daily work; ready plan; server-side input changed after preview; stale readiness rejection; refresh; exactly one accepted start; settled current-round screen.
2. Company/mock-B2B journey: real company-code/OIDC login; prepared/upcoming and held work from the public source boundary; controlled Engine `503`; visible failure; explicit manual order; reload; exactly one accepted start; settled current-round screen.

Captured evidence:

- `output/playwright/phase-28-b2c-start-mobile.png`
- `output/playwright/phase-28-b2b-manual-desktop.png`
- `.local/phase-28-browser-evidence.json` (two rounds; accepted manual-order action; two accepted start actions; failed Engine job recorded separately)

This is actual local issuer/browser/HTTP/PostgreSQL evidence with a labelled controlled Engine and labelled mock-B2B public source boundary. It is not a live production routing profile, commercial ERP, physical-device, TLS/email or owner-acceptance claim.

## Verification

- Focused preparation component tests: **6 passed**.
- Actual Keycloak/Chromium/PostgreSQL journeys: **1 passed** with both B2C and mock-B2B cases in one isolated run.
- Final equivalent repository gate: audit **0 vulnerabilities**; lint, OpenAPI lint, canonical contract check and all typechecks passed; **43 files / 873 tests passed** in 779.36s with a scoped 30-second test allowance; API, web, public-client, shared and mock-ERP production builds passed with the required `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001`; production fixture isolation passed.
- Canonical operation/schema inventories remain unchanged; the affected public-client and ERP/UI references were updated.

The runtime identifies the GPT-5 family. The exact picker suffix and reasoning setting are not exposed, so no requested model switch is asserted.

The first complete default-timeout run recorded two unrelated older additive-migration tests at their 10-second limit. Their two files then passed **59/59** in isolation (the exact cases took 6.8s and 2.7s), and the unchanged full suite passed with a 30-second allowance. The first build invocation after that green suite correctly rejected a missing mandatory API-base setting; rerunning with the explicit local acceptance value passed. An earlier full-gate attempt also stopped on one unused harness import, which was removed before every accepted check above. These intermediate results are retained here rather than reported as passing runs.

## Reproduce

```text
node node_modules/vitest/vitest.mjs run --project fast apps/web/test/fast/preparation-flow.test.tsx --reporter=verbose
npm run test:browser:preparation
npm run check
```

The browser command builds the public client first. It requires the repository's local issuer and PostgreSQL prerequisites described by the existing identity/database setup; failure is surfaced rather than replaced with an in-memory fixture.
