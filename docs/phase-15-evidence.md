# Phase 15 evidence — 23 September 2026

Started at clean HEAD `68ee4a2` (`phase 14`). No AGENTS.md in the workspace or parent path. Only Phase 15 is authorized; no commit, push, deployment or next phase.

Runtime identifies GPT-6. Exact picker model suffix and reasoning effort are unavailable to this task; requested `gpt-6-astra` / `xhigh` are not claimed as observed. Consulted `docs/phases/model-selection.md`.

Prerequisite sources inspected: master-plan ownership/session/domain/transaction/offline rules; current discovery decisions through D-112 and decision map; P05 command kernel/locks, P06 access/revocation, P08 service binding, P10 snapshots/receipt/reservations, P11 pins and P13–14 immutable planning/forecast/manual publication. Existing source/pin handlers already share the driver guard and departure predicates; P15 supplies the actual boundary.

Prerequisite command: `npm run test:integration -- apps/api/test/integration/command-transaction.test.ts apps/api/test/integration/authorization-isolation.test.ts apps/api/test/integration/provisioning-actor.test.ts apps/api/test/integration/b2b-intake-admission.test.ts apps/api/test/integration/planning-publication.test.ts`.

First run failed: PostgreSQL `ECONNREFUSED 127.0.0.1:55432`; startup then failed because `pg_ctl` was absent from PATH. Added `C:\Program Files\PostgreSQL\18\bin` to the process PATH and ran `npm run db:local:start`. The same prerequisite command then **passed 5 files / 106 tests**. No prerequisite code repair. Runtime: Node 24.11.1, npm 11.6.2, PostgreSQL 18.6; existing pins retained.

## Checkpoint A — passed before B

Lifecycle migration and closed contracts are being implemented. Readiness is a short-lived server record bound to account/device/current plan/fingerprint and verified relevant action receipts. It is not a client boolean. P34 must supply the complete local journal manifest and prevent capture between its barrier and start. The server cannot discover unsent records hidden on a device; no full queue-to-start or storage-readiness claim is made in P15.

Added migration 0012: open-day/active-round uniqueness across branches; tenant/driver-compatible plan/forecast/workload references; immutable start readiness/publication/admissions/baseline. Added canonical `round-start.schema.json`, exact examples (including rejected client sync flag/local draft), OpenAPI and generated consumer types. New operations are marked implemented during development, not verified-local yet.

`npm run test:integration -- apps/api/test/integration/start-assignment-race.test.ts apps/api/test/integration/database-lifecycle.test.ts`: **2 files / 7 passed**. Actual inserts prove duplicate open days and invented plan/forecast round references fail. `npm run test:contracts`: **224 passed**. Two preceding database-lifecycle runs failed on the explicit table inventory; updated its expected new tables and reran successfully. No runtime active-start handler claimed by A. Queue integration remains P34.

## Checkpoint B — passed before C

Added `rounds/models.ts`, `departure.ts`, `service.ts`, `routes.ts`, session registration and portable `RoundsClient`. Start acquires the complete driver/workday/assignment/task guard set, revalidates selected ready/manual plan/fingerprint/current authority/accepted action dependencies/earliest/capacity, then writes the open day, active round, server generation, immutable publication/admissions, departure timestamps, audit/result and source-scoped `round.started` intent in the P05 transaction. Pending planning leases are fenced. Original forecast time origin/estimates remain unchanged; first-start references are immutable. No heading/arrival or hard shift end is fabricated.

`npm run test:integration -- apps/api/test/integration/start-assignment-race.test.ts`: **10 passed**. Separate PostgreSQL connections plus `pg_blocking_pids` prove duplicate-action/two-phone start and both serialized start-versus-withdrawal outcomes. Covers lost-response recovery, manual/optimized baseline retention, incomplete/foreign readiness, partial/stale plans and rollback on an injected actual outbox write failure. `npm run typecheck -w @tawsel/api`: **passed**. Initial run was 9/10 because newly introduced sync error codes were absent from the common canonical enum; added them and regenerated types, then reran. Corrected test pool typing to explicit single-connection `pg.Pool`.

P34 local queue completeness and P20 takeover remain deferred. C will verify all departed edit paths, active admission, public session/client recovery and capacity races.

## Checkpoint C — passed before final checks

`enqueuePlanning` now applies `rounds/departure.ts` active admission in the accepting transaction, covering definitive receipt/reassignment, source or pin resolution and independent intake. Immutable admission records retain the source/assignment/pin/attempt at the boundary. Prepared/unresolved/future-held work is not silently admitted. B2B response/history is captured after that boundary. Active vehicle/endpoint changes are guarded until an execution transition can update their reservations; replan/manual order and allowed driver pin correction remain available. Staff planning, source/recipient/price/assignment/urgency and both pin-confirm/search paths use their real departure predicates.

`npm run test:integration -- apps/api/test/integration/start-assignment-race.test.ts apps/api/test/integration/round-start-http.test.ts apps/api/test/integration/b2b-intake-admission.test.ts apps/api/test/integration/location-provenance.test.ts`: **4 files / 45 passed**. The P15 race file has 17 cases: both start/admission capacity orders, source withdrawal orders, duplicate actions/phones, first forecasts, outbox rollback, all six ERP mutation endpoints, broad-role staff pin/planning denial, assigned-driver pin correction, active receipt/resolution/independent intake locks, expired/foreign readiness, revocation, uniqueness and cross-midnight open day. Capacity includes the start-reserved branch stop. First C run was 40/42: two test pin commands accidentally included the planning fixture's extra `driverId` payload field; removed that field, then reran successfully.

`npm run typecheck -w @tawsel/api`: **passed** after making the HTTP-demo command factory preserve literal operation/payload types. `round-start-http.test.ts` also passed independently: real listening HTTP, application session/CSRF and PostgreSQL; signed OIDC provider fixture. It closes the listener before an attempted start (zero rounds), discards a successful start response, recovers by action ID, restarts the API and verifies a second device observes the same authority. No UI/browser/device or live issuer/Engine evidence is inferred.

Review correction: newly received, currently available work could be excluded by the original preview's older eligibility time. New active admission now advances the next estimate's settings/time anchor and execution revision, without touching the first forecast. The active-admission test explicitly uses earliestAt after the old preview and verifies it enters the new job. `npm run test:rounds`: **2 files / 18 passed** after correction; API typecheck passed. The retained-P13 upgrade fixture now seeds historical rows through the real kernel rather than calling current P15-aware handlers against a pre-P15 schema; forecast-byte preservation remains asserted.

First full check stopped at a generated type mismatch after tightening `StartActionResult`; added runtime schema validation and narrowed the retained start result. Audit/lint/contracts had passed before that stop. Full rerun is recorded below when complete.

Documentation tooling: an initial temporary docs-update script had a JavaScript backtick-escaping syntax error before making any writes; fixed and reran. A whitespace check with `core.autocrlf=false` incorrectly treated existing Windows CRLF as trailing whitespace; the normal repository check with `core.whitespace=cr-at-eol` passed. No repository line-ending configuration was changed.

The final action-table audit initially found three pre-existing read operations mentioned only in prose (`intake.getTask`, `intake.listTasks`, `location.list`). Added them to their existing intake/location rows. `node .local/p15-doc-review.mjs` now verifies all **154** catalog operations are mapped in action tables; this is document coverage, not UI behavior. `git -c core.whitespace=cr-at-eol diff --check` passed.

## Final verification and limits

- `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check`: **PASS**, zero audit findings, lint, OpenAPI/schema/reference checks, all workspace/script typechecks, **22 files / 480 tests**, production builds and production fixture isolation. Existing redirect-only OpenAPI warning and MapLibre chunk-size warning remain. Full log: `.local/phase-15-check.log`.
- `npm run rounds:demo` and `npm run test:erp:rounds`: **PASS**. Actual request/recovery output `.local/phase-15-demo.json` contains no session tokens. The session HTTP test executes the same reusable demo.
- `npm run db:migrate`: **PASS**, applied additive `0012_round_start.sql` to the dedicated local application database. No earlier migration edited. Final database inventory: {"version":"18.6","migration":"0012_round_start.sql","disposableDatabases":0,"applicationTasks":0,"applicationRounds":0}.
- Versions observed: Node **24.11.1**, npm **11.6.2**, PostgreSQL **18.6**, pg **8.23.0**, Fastify **5.12.5**, TypeScript **6.0.2**, Vitest **5.0.1**. All dependency pins and lockfile retained; no package/version selection or upgrade.
- `npm run engine:live`: **unavailable / exit 1**, checked `2026-09-23T20:23:37.669Z`: all nine route/table/optimization probes failed with `unavailable`; Docker inventory unavailable; local data only `.gitkeep`. No live optimized-route/profile suitability claim. Manual start requires no Engine. Provider fixtures establish application policy/forecast behavior only.
- No UI changed, so no new browser/render/usability evidence is claimed or required here. Real phone/Safari/offline journal, real issuer/production session, real ERP, signed sender, production/load/owner review were not run. Full queue-to-start gate/storage acknowledgement belongs to P34, explicit current/arrival to P16, end-round/day to P19, takeover/former-device fencing to P20.
- Review feedback was self-review only: corrected active admission forecast horizon, made source command-time snapshots reflect the lock, preserved start-result authorization on replay, and kept source event payloads scoped. No external reviewer/owner approval is implied. No commit/push/publication or next-phase execution. Protected Engine datasets/mount configuration, original Stitch exports, maps, prior migrations and dependency lockfile are unchanged.

## Changed paths

- `README.md`
- `apps/api/src/app.ts`
- `apps/api/src/b2b-intake/service.ts`
- `apps/api/src/b2c-intake/routes.ts`
- `apps/api/src/b2c-intake/service.ts`
- `apps/api/src/planning/queue.ts`
- `apps/api/src/planning/service.ts`
- `apps/api/src/rounds/departure.ts`
- `apps/api/src/rounds/models.ts`
- `apps/api/src/rounds/routes.ts`
- `apps/api/src/rounds/service.ts`
- `apps/api/test/integration/database-lifecycle.test.ts`
- `apps/api/test/integration/planning-jobs.test.ts`
- `apps/api/test/integration/round-start-http.test.ts`
- `apps/api/test/integration/start-assignment-race.test.ts`
- `apps/api/test/support/planning-company-fixture.ts`
- `apps/api/test/support/round-http-demo.ts`
- `contracts/common.schema.json`
- `contracts/examples/README.md`
- `contracts/examples/invalid.json`
- `contracts/examples/valid.json`
- `contracts/openapi.yaml`
- `contracts/operations.json`
- `contracts/round-start.schema.json`
- `db/migrations/0012_round_start.sql`
- `docs/contract-coverage.md`
- `docs/erp/ERP-PLANNING-INPUT.md`
- `docs/erp/README.md`
- `docs/erp/consumer-quickstart.md`
- `docs/erp/field-and-status-mapping.md`
- `docs/implementation-status.md`
- `docs/operations.md`
- `docs/phase-15-evidence.md`
- `docs/phases/README.md`
- `docs/phases/coverage-matrix.md`
- `docs/reference/public-contract.md`
- `docs/round-start.md`
- `docs/tracking-and-consistency.md`
- `docs/ui-actions.md`
- `master-plan.md`
- `package.json`
- `packages/api-client/README.md`
- `packages/api-client/package.json`
- `packages/api-client/src/rounds.ts`
- `packages/api-client/src/schema.d.ts`
- `packages/shared/test/fast/contract-foundation.test.ts`
- `scripts/contracts.mjs`
- `scripts/round-start-demo.ts`
- `tests/erp-conformance/rounds.ts`

## Concrete P16 handoff

Rely on migration 0012 workday/round/publication/admission/readiness constraints; `apps/api/src/rounds` session APIs, own-driver authorization, immutable first baseline and generation; P05 atomic result/audit/outbox and shared driver guards; P13–14 ready/manual plans and the new active-admission trigger. Use `npm run test:rounds`, `npm run rounds:demo`, canonical `p15-*` examples and `RoundsClient`. P16 must add explicit heading/arrival and current state under the same locks/revisions. Start currently reports `currentActivity:null` and does not synthesize physical travel. See [the runbook](round-start.md).
