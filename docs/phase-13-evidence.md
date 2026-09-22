# Phase 13 — durable planning evidence

23 September 2026, Africa/Cairo. Starting HEAD `1567f05` (`phase 12`), clean tree; no AGENTS.md in repository or ancestors. Runtime identifies GPT-6; exact picker suffix/effort unavailable. Requested `gpt-6-astra / xhigh` is a recommendation, not an observed setting; consulted `docs/phases/model-selection.md`.

Read master plan §§7,9–10,15, latest discovery through D-112, decision/requirement maps, phase index/status, actual P05/P09/P10/P11/P12 code, migrations, tests, contracts and worker conventions. No material missing prerequisite. Engine live availability remains unverified, independently of database correctness.

Environment: clean `npm ci` passed (357 packages, zero audit findings), initially Node 24.11.1/npm 11.6.2. Installation reported transitive jsdom Node >=24.15 engine warnings. Located bundled Node 24.19.0 for subsequent verification. Installed PostgreSQL 18.6 used to initialize only the dedicated `.local/postgres-18` cluster on 55432 via `npm run db:local:start`; no Engine data/import/startup touched.

Prerequisite command: `npm run build -w @tawsel/shared`, then `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/database-lifecycle.test.ts apps/api/test/integration/command-transaction.test.ts apps/api/test/integration/b2c-intake.test.ts apps/api/test/integration/b2b-intake-admission.test.ts apps/api/test/integration/location-provenance.test.ts apps/api/test/fast/engine-adapters.test.ts`: **PASS, 6 files / 89 tests**. Real isolated PostgreSQL; controlled provider fixtures, not live Engine routes.

Primary references consulted: [PostgreSQL 18 locking](https://www.postgresql.org/docs/18/explicit-locking.html), [SELECT/SKIP LOCKED](https://www.postgresql.org/docs/18/sql-select.html). Retain repository dependency pins; no new dependency needed.

## Checkpoint A

Migration 0009 adds durable jobs, explicit settings/revision state, stable initial attempt identities, immutable plan/forecast/workload rows, recoverable claim fields and unique pending/running slots per driver. Canonical planning schema/OpenAPI/client types describe drafts only, six honest job states and stored estimates. B2C create/revise, B2B receipt/source/urgency/assignment changes and pin confirmations enqueue inside their acceptance transaction. Upgrade preserves old intents and seeds retained B2C intake intent. Settings are an explicit manual origin/mode/endpoint/time anchor; missing settings remain inspectable pending work. No provider I/O in commands.

Focused command (bundled Node 24.19.0): `npm run typecheck -w @tawsel/api`, then `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/planning-jobs.test.ts apps/api/test/integration/b2b-intake-admission.test.ts apps/api/test/integration/location-provenance.test.ts`: **PASS 3 files / 30 tests** before B. Contract generation passed 12 schemas, 108 valid/70 invalid examples. PostgreSQL verifies committed intake with no planner, independent-pool status reads, original input immutability, same-command replay, bounded pending queue, settings compare-and-set, live authorization and full pin rollback.

Initial checks: fixed a missing required kernel `resourceVersions` property. Two pre-existing assertions assumed P10 pending intent and no B2C intent; updated to assert linked intent plus pending durable job, and compare pre/post jobs/intents after rollback rather than expecting an empty table. Final focused checks above passed. Remaining dependency: live Engine unavailable; no route-policy/start/physical-device proof claimed.

## Checkpoint B

Implemented worker claim/lease recovery, immutable attempt audit, one claim per driver across processes, and atomic candidate/forecast/workload/outbound-intent persistence. Worker performs HTTP after claim commit and releases its connection. Default lease 90s exceeds the retained Engine maximum timeout of 60s; the worker also sends a lease-bounded abort signal. Forecasts use the saved UTC planning anchor and explicit task/attempt/cycle membership; partial candidates retain unassigned IDs and no false whole-workload finish. No round or baseline is activated.

Review during B added monotonic input generation per accepted trigger, preventing removed/restored workload from accidentally reusing an older fingerprint. Same command/intent retains stable identity. This is internal P13 refinement, not prerequisite repair.

`npm run typecheck -w @tawsel/api`: **PASS**. Focused command `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/planning-jobs.test.ts apps/api/test/integration/planning-publication.test.ts`: **PASS, 2 files / 7 tests** before C. Tests actually kill a separate Node worker while its loopback Engine HTTP response is held, wait for natural PostgreSQL lease expiry, recover from a fresh pool, prove competing live claims cannot coexist, fence an old token, reject duplicate completion and roll back publication after a database forecast-write fault. All old forecast rows/attempt IDs remain identifiable after a second revision. `pg_stat_activity` shows no idle transaction during the delayed provider call.

Initial partial-fixture check failed because its VROOM unassigned item lacked required `type: job`; the P12 adapter correctly rejected it as `invalid_response`. Corrected the fixture and reran both files, passing above. This is controlled HTTP evidence, not live Engine validation. Current-input stale-result gate and real APIs remain C work.

## Checkpoint C

Added current-input comparison under tenant/driver/state locks immediately before any success/error publication. Obsolete results retain candidate/error evidence as superseded; no plan/forecast is appended and current work is queued if a future writer invalidated context without already queuing. Current-target, manual and execution generations are snapshot fields; their actual execution commands remain P14/P16/P17. Added browser-session/CSRF planning commands, durable getJob, paged plan/forecast history with latest job/settings discovery, generated public types and PlanningClient. Intake/location reads now expose actual latest job status instead of a permanent pending label. All plans remain `draft`, `policyValidated:false`; no round start.

`npm run typecheck -w @tawsel/api`: **PASS**. `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/planning-publication.test.ts apps/api/test/integration/planning-jobs.test.ts apps/api/test/integration/b2c-intake.test.ts apps/api/test/integration/b2b-intake-admission.test.ts apps/api/test/integration/location-provenance.test.ts`: **PASS 5 files / 47 tests**. Delayed real HTTP fixtures race actual pin/source/origin changes and real ERP urgency/reassignment commands; separate committed future execution-writer fixtures test target/manual/outcome generation fencing without claiming those future actions implemented. Database failure at final outbound-intent insert rolls back the draft/forecast/pointer, then retry commits once. Stored notices are source-scoped identity metadata without another source's task list. Transient provider errors retain accepted intake and bounded retry/failed states.

`node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/session-auth.test.ts -t 'P13:'`: **PASS 1 test**, 19 intentionally filtered. Actual signed issuer fixture → real PostgreSQL session → listening Fastify HTTP → typed consumer → API close/new instance/pool → same-job poll → worker → persisted forecast. Anonymous 401, CSRF 403, wrong-driver 404 and canonical output checked. This is HTTP/database/controlled issuer evidence, not a browser, live Keycloak or live Engine claim.

Canonical generation after schema/examples finalized: **PASS 12 schemas, 115 valid/76 invalid examples, 151 operations**. Final whole-workspace verification, migration/demo/conformance and handoff follow below.

## Acceptance evidence and review

| Required behavior | Actual evidence |
| --- | --- |
| Worker dies during Engine call | `planning-jobs.test.ts`: forked Node process killed after controlled HTTP request reaches a held response; no idle DB transaction; live lease cannot be stolen; natural expiry and fresh-pool worker recover the same job |
| Pin changed while provider delayed | `planning-publication.test.ts`: real `Locations.confirm` commits on another connection; old response becomes superseded, zero old plans/forecasts, current job then stores the new pin |
| Replan retry | Exact command replay returns original job/receipt, one pending request; duplicate completion and an expired/replaced lease append no extra effective revision |
| Partial provider result | Explicit assigned/unassigned membership; null unassigned times and whole-workload finish; policy remains unvalidated and state draft |
| Several forecasts | Distinct plan/forecast/workload IDs; same initial attempt identity retained; original stored estimates unchanged and updates rejected by DB triggers |
| Poll after restart | Signed issuer fixture + actual HTTP client + Fastify close/new instance/new pool: same job reads pending then complete and stored history |
| Newer source/manual/assignment/outcome context | Real B2C source, manual-origin, ERP urgency/reassignment and pin commands; locked future target/manual/outcome fixtures separately identified; old response never changes newer context |
| Atomic outbound intent | Real company source notice inspected; last-write DB fault rolls back draft/forecast/pointer; retry commits one notice, with no mixed-source members or delivered/applied claim |
| Upgrade retained P12 data | Separate eight-migration DB populated with prior intake command/task/event, then 0009 applied; retained receipt/task unchanged and legacy intent materializes once |

Self-review strengthened status/lease/finished-time consistency, per-driver plan FKs, immutable attempt records and forecast task/attempt identity. Added canonical rejection examples for impossible status shapes. A representability/identity check rejects unusable provider estimates as durable `failed/invalid_response`, preventing endless crash/reclaim on a timestamp outside RFC3339's stored display range. This is persistence boundary validation, not P14 route policy. No external/owner review feedback received.

Final revision-semantics review corrected the accepted receipt's `planningInputRevision` to report the complete input generation rather than the separate settings revision; the PostgreSQL queue test now checks their intentionally different values after two intake changes and a settings save. Full verification was rerun after that correction.

## Final verification and limitations

- Retained dependency pins; actual final runtime Node **24.19.0**, npm **11.6.2**, PostgreSQL **18.6**, pg **8.23.0**, Fastify **5.12.5**, Vitest **5.0.1**, TypeScript **6.0.2**. Root lockfile unchanged. Initial Node 24.11.1 install warnings were avoided by using bundled Node 24.19.0 for final checks.
- First full `npm run check`: audit/lint/contracts/types passed; **416 passed / 1 failed**. Failure was P05's exact table inventory missing the seven new tables. Updated that inventory without weakening the migration test. Second full check: **417 passed / 1 failed**; the remaining test required an obsolete generated-reference sentence. Updated it to require the explicit draft/no-active-round and later-execution/signed-delivery limits. `npm run test:contracts` then **206 passed**; `npm run build` passed all three packages and production fixture isolation.
- Final canonical inventory: **12 schema files, 115 valid / 78 invalid examples, 151 owned operations**. P13's seven assigned command/read/internal/event operations are `verified-local`, with event transport explicitly still unavailable.
- `npm run planning:demo` and `npm run test:erp:planning`: **PASS**, latest demo recorded `2026-09-22T23:49:03.519Z` (23 Sep Cairo), `.local/phase-13-demo.json`. Inspected committed jobs, plans, forecasts and replan intent; all estimates explicitly controlled fixtures. Consumer checker imports only public types/Node and the existing public routing checker.
- `npm run db:migrate`: **PASS**, all migrations 0001–0009 applied to this host's newly initialized, dedicated application database. The separate retained-data test proves actual P12→P13 upgrade. `npm run planning:worker:once`: **PASS**, no due job; no fake application data seeded. Worker asserts migration currency and starts independently of Fastify.
- Current live probe `npm run engine:live`: **exit 1**, `2026-09-22T23:45:21.164Z`; car/motorcycle/bicycle route, table and optimize requests all **unavailable (9/9)**. Docker inventory unavailable; local `data/` only `.gitkeep`. Actual Engine versions/profile datasets/mount compatibility/road quality remain unverified. No service startup, image pull, map import or dataset write. Controlled providers cannot establish this missing evidence.
- `git diff --check`: **PASS** with repository settings. A diagnostic using `core.autocrlf=false` treated existing CRLF files as whitespace changes; normal repository checking passed without mass line-ending edits. Protected Engine/config/Stitch paths, migrations 0001–0008 and package-lock preservation checks passed.
- Local Markdown file-target check: **17 changed documents / 1,294 local links, zero missing** at that check. Fragment/external URL validation excluded. Final file-target rerun checked 1,295 local links with zero missing; no disposable test databases remained after the full suite.
- No new UI, actual browser render/interactions, physical device, real Keycloak run, real ERP connector, signed sender, production deployment or owner approval was requested/established here. Session proof uses the signed issuer fixture; Engine proof uses controlled HTTP. No active round, first-start baseline, complete urgent-order policy, manual fallback implementation, outcome/retry commands, device takeover or report UI. No Phase 14 execution, commit, push or publication.

Final command environment (PowerShell; ordinary compatible Node 24 installation also works):

```powershell
$env:PATH = 'C:\Users\LOQ\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
$env:VITE_TAWSEL_API_BASE_URL = 'http://127.0.0.1:3001'
npm run check
```

## Exact handoff to Phase 14

- `db/migrations/0009_planning.sql`: real per-driver queue/lease constraints, immutable input/attempt/plan/forecast/member storage, legacy intent upgrade. Do not edit an applied migration; use an additive follow-up migration.
- `apps/api/src/planning/{models,queue,service,routes,worker}.ts`: coherent snapshots, canonical fingerprint, monotonic trigger/settings/execution/manual fences, committed claim/HTTP separation and atomic stale-checked draft persistence. Future execution writers must reuse the documented driver lock and invalidate/queue under that lock.
- P12 `apps/api/src/engine`: normalized validated candidates, explicit failures, cancellation and units. P14 must implement current-prefix/urgency/earliest/endpoint/whole-route validation and manual fallback; P13 does not upgrade a provider candidate to ready/active.
- `contracts/planning.schema.json`, affected intake/location status schemas, OpenAPI, catalog/examples, generated `schema.d.ts`, `packages/api-client/src/planning.ts`, generated reference/coverage and ERP mapping/quickstart/conformance: verified local boundary, no production-release claim.
- `planning-jobs.test.ts`, `planning-publication.test.ts`, P13 session-auth case and support providers/kill worker: PostgreSQL/commit/lease/process/stale/input/API evidence. Future action fixtures are not implemented outcomes or manual fallback.
- `scripts/planning-worker.ts`, `scripts/planning-demo.ts`, npm scripts and [runbook](planning-jobs.md): reproducible demonstration and supervised worker responsibility. Existing forecasts may be retained/identified; P15 alone binds a first-start baseline and activates a round.

## Final result

`npm run check` **PASS, exit 0**, after the receipt-generation correction: audit **0 vulnerabilities**, ESLint, OpenAPI validation, generated-artifact checks, all workspace/script typechecks, **20 files / 418 tests**, all shared/API/web builds and production fixture isolation. Final Vitest run started `02:54:41` Cairo, 45.11 seconds. The two planning test files contain **18 tests**, plus the actual HTTP/session restart test in session-auth. Existing redirect-only callback warning and MapLibre chunk-size warning remain; neither is a new P13 failure. `git diff --check` passed. No test databases remain; dedicated local PostgreSQL stays available.

The task is complete within Phase 13: stored drafts/forecasts and durable asynchronous status are verified. Live Engine routing and later-phase policy/activation limitations above remain explicit. No commit, push, publication or next-phase execution.

## Changed paths

Tracked edits and new deliverables (ignored local runtime/reports/credentials are excluded):

```text
.env.example
README.md
TAWSEL-DISCOVERY-LOG.md
apps/api/src/app.ts
apps/api/src/b2b-intake/service.ts
apps/api/src/b2c-intake/service.ts
apps/api/src/locations/service.ts
apps/api/src/planning/models.ts
apps/api/src/planning/queue.ts
apps/api/src/planning/routes.ts
apps/api/src/planning/service.ts
apps/api/src/planning/worker.ts
apps/api/test/integration/b2b-intake-admission.test.ts
apps/api/test/integration/database-lifecycle.test.ts
apps/api/test/integration/location-provenance.test.ts
apps/api/test/integration/planning-jobs.test.ts
apps/api/test/integration/planning-publication.test.ts
apps/api/test/integration/session-auth.test.ts
apps/api/test/support/access-fixture.ts
apps/api/test/support/crash-planning-worker.ts
apps/api/test/support/planning-fixture.ts
contracts/b2b-intake.schema.json
contracts/examples/README.md
contracts/examples/invalid.json
contracts/examples/valid.json
contracts/location.schema.json
contracts/openapi.yaml
contracts/operations.json
contracts/planning.schema.json
db/migrations/0009_planning.sql
docs/contract-coverage.md
docs/engine-boundary.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/consumer-quickstart.md
docs/erp/field-and-status-mapping.md
docs/implementation-status.md
docs/operations.md
docs/phase-13-evidence.md
docs/phases/README.md
docs/phases/coverage-matrix.md
docs/planning-jobs.md
docs/reference/public-contract.md
docs/ui-actions.md
package.json
packages/api-client/README.md
packages/api-client/package.json
packages/api-client/src/planning.ts
packages/api-client/src/schema.d.ts
packages/shared/test/fast/contract-foundation.test.ts
scripts/contracts.mjs
scripts/planning-demo.ts
scripts/planning-worker.ts
tests/erp-conformance/planning.ts
```
