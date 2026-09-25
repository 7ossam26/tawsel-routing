# Phase 32 — dispatcher monitoring and online synchronization feedback

Date: 25 September 2026. Starting revision: `f7371cb` (`phase 31`), initially clean. No `AGENTS.md` was present. The requested picker recommendation was GPT-5.6 Sol/high; this runtime identifies the GPT-5 family but does not expose a verifiable picker suffix or reasoning label, so that exact setting is not asserted.

## Prerequisites and repair

The real P24 coherent snapshot/history service and client, P25 delivery queue, P26 receiver checkpoint/application state, P27 native mock ERP, and P28–31 connected pages were inspected. `npm run test:monitoring -- --maxWorkers=1` passed **2 files / 34 tests** against isolated PostgreSQL after the UI work. The small prerequisite defect repaired here was the public `MonitoringClient` lacking `AbortSignal`; reconnect/foreground could not safely cancel an older conditional request. The client now accepts an optional signal without changing the HTTP contract.

Original `03-dispatcher-workspace` and `09-sync-conflicts` image/source findings were applied as visual structure, not copied controls. Broken prototype optimize/draft/script assumptions, GPS/presence language and postdeparture staff mutation were not carried into production.

## Ordered checkpoints

### A — shared workspace

- Added production `/monitoring?kind=company&driverId=…` with authorized server-side branch scope, source filtering over already-authorized rows, selected task/map/list, coherent progress, current/next-safe copy and task action history.
- Departed work is explicitly read-only. Recipient phone and coordinates appear only for returned authorized tasks. A null current is described only as not visible in this scope; the page does not infer a hidden target, hidden total or driver presence.
- Component evidence confirms a redacted secret is absent, scoped counts stay at one, and no delivery/arrival/refusal mutation button appears.
- Focused A/B/C client and status suites pass **2 files / 8 tests**, including retained-body stale transition after ten seconds without a successful response.

### B — refresh controller

- Visible monitoring starts at one-second polling. Each controller has one cancellable in-flight request, sends the confirmed ETag on ordinary polls, applies revisions only within the same scope, and ignores lower delayed revisions.
- Visibility return and browser `online` cancel the prior conditional request and perform a full read without ETag before presenting the response as current. Failures retain the last confirmed body with exponential backoff capped at ten seconds.
- A successful 304 resets transport freshness even when no driver action changed. After ten seconds without any successful response the page labels the confirmed data stale; it never labels an idle driver offline. Refresh time and last received action time remain separate.
- Controlled tests deliberately resolve revision 2 before revision 1 and fail if the old recipient replaces the new one. They also check 304 idle freshness, in-flight bounding, cancellation and full reconnect headers.

### C — evidence and integration status

- Selected-task history filters real server-received `accepted`, `rejected` and `review-required` action metadata. Copy says unsent phone actions are unknown and exposes no rejected payload/audit internals.
- The private native mock ERP integration panel now polls visible status every second with one in-flight refresh. It labels Tawsel source acceptance, durable ERP receipt, ERP application and application failure separately. Failed transport recovery tells an authorized operator to retry the same event and explicitly says retry does not change business acceptance.
- Pure tests fail if `receivedHigh > appliedThrough` is labelled applied or if a projection error is hidden.

## Actual browser and timing evidence

The final `npm run test:browser:monitoring` passed **1/1** in 24.6 seconds. It used actual local Keycloak 26.7.4, Chromium, Fastify and an isolated PostgreSQL database. Source identities and the mixed-source driver relationship are labelled fixtures; no commercial ERP or physical device is claimed.

The accepted run verified a staff login, authorized branch/source selectors, two visible tasks, absence of `SECRET RECIPIENT B`, departed read-only detail, a normal conditional request, an online-event full request with no ETag, accepted evidence filtering, desktop/mobile RTL reflow and no horizontal clipping. A real committed `current.selectHeading` became visible after **3899 ms** locally. This is a small diagnostic commit-to-render sample, not the Phase 38 p95/load or freshness SLO claim.

Artifacts:

- `output/playwright/phase-32-monitoring-desktop.png`
- `output/playwright/phase-32-monitoring-mobile.png`
- `.local/phase-32-browser-evidence.json`

The first browser attempt stopped because local Keycloak was unavailable on port 8085. After starting the documented prerequisite, setup exposed that the reusable monitoring fixture required its normal access seed, and the first authenticated run exposed an issuer mismatch caused by the fixture issuer; the harness now passes the actual issuer without weakening immutable subject bindings. A later assertion expected a round/current action on the initially selected task, while the authorized history correctly contained its actual intake/receipt actions; the assertion was narrowed to the selected resource. None of those runs is reported as passing.

Two disposable `p32-staff-*` issuer users and seven idle databases bearing the explicit `tawsel:test:v1` marker from failed setup attempts were removed; they are ephemeral and not recoverable. The harness cleanup now begins immediately after issuer-user creation, so a later setup failure removes every resource already acquired. The final rerun left no P32 user or marked test database.

## Verification and limits

- `monitoring-client.test.tsx` plus native status classification: **2 files / 8 tests passed**.
- Existing coherent monitoring PostgreSQL/isolation regression: **2 files / 34 tests passed**.
- Actual browser: **1 test passed**; reviewed 1366×768 and 390×844 captures.
- Full repository regression: **47 files / 928 tests passed** in 929.40 seconds (`--maxWorkers=2 --testTimeout=30000`).
- Lint, generated-contract drift, contract lint (one unchanged 302-response warning), types, all production builds and `npm audit --audit-level=high` passed; the audit reported zero vulnerabilities.

No wire schema, operation, migration or dependency changed. The generated client surface changes only by accepting an optional cancellation signal. There is no GPS/presence, unsent-action projection, stream infrastructure, staff execution override, commercial ERP proof, physical-device/owner acceptance, background freshness promise or p95/load claim.

## Phase 33 handoff

Phase 33 may rely on the connected read-only monitoring workspace, scope-aware nonregressing refresh controller, optional client cancellation, explicit stale/reconnect behavior, received-action filtering, and distinct native ERP received/applied/failed feedback. It must add durable local capture only for the owning driver and must not make unsent actions visible to this server monitor. Phase 33 was not executed.
