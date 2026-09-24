# Phase 24 evidence — 24 September 2026

Started from clean HEAD `1e38f2d` (`phase 23`). No repository/ancestor AGENTS.md found. Runtime identifies GPT-6; exact picker variant/effort are unavailable. Requested recommendation: gpt-6-astra / high. Consulted `docs/phases/model-selection.md`; no picker switch claimed.

Read phase README, master-plan §§5/7/12/14, latest discovery through D-112 and decision map, R-01/R-04/R-43/R-44/R-45/R-65, status, A32/A33/03-dispatcher specification and real access/outcome/correction/closure/device/return/planning code and migrations. Existing dependency pins retained; no dependency selection or Engine/Stitch edits.

## Prerequisites

`npm run test:integration -- --maxWorkers=2 apps/api/test/integration/authorization-isolation.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts apps/api/test/integration/workday-carryover.test.ts apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/partial-return-correction.test.ts` — PASS, **5 files / 120 tests**, 139.35s, isolated real PostgreSQL. Covers P06/P17/P19/P20/P21/P23 artifacts including real return/correction dependencies. No prerequisite repair needed.

## Checkpoint A

Defined [read contract](monitoring.md): coherent MVCC reads, scoped observed revisions, conditional/full refresh equivalence, revision-bound pagination, distinct shipment/attempt/piece units, current-holder groups and strict source redaction. Fields map to implemented `rounds`, `workdays`, `round_admissions`, `execution_attempts`, `plan_revisions`, `location_tasks`, `effective_attempt_outcomes`, `cycle_custody`, correction/command/return history. No sender/recipient application persistence is assumed. Exact WAL commit time is unavailable; write-time correlation will be explicitly labelled.

Closed canonical `monitoring.schema.json` and generated types added. `npm run contracts:generate` — PASS, 22 schemas / 217 valid / 137 invalid examples / 178 operations. `npm run test:contracts` — PASS, **367 tests**, 1.94s. Existing domain/migration reads and prerequisite checks establish the field sources above; the revision ledger and timing instrumentation are new P24 work. No monitoring HTTP path is declared implemented at A. No unresolved prerequisite dependency. A recorded before B.

## Checkpoint B — passed before C

Added migration 0023 with a historical scoped task relation, indexed domain reads, per-authorized-view revision ledger and transactional write-time/correlation marks. Monitoring uses repeatable-read across fresh authorization, domain queries, counters/history/current/next and revision publication; full transaction retries handle serialization failures. Queries do not invoke state-mutating planning helpers. Browser and bearer-service endpoints provide scoped conditional reads, history and sanitized action receipts. No delivery/applied state is invented.

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/monitoring-snapshot.test.ts` — PASS, **2 tests**, 5.31s. Real PostgreSQL/API verifies 6 full + 1 failed + 11 remaining = 7 processed / 18 shipments; 304/full equivalence and idle refresh metadata; an independently committed outcome during a paused read leaves old current/counts coherent, then a fresh read advances its revision and clears current. `npm run typecheck -w @tawsel/api` passed before route/test additions; full gate follows C. No unresolved prerequisite dependency.

Primary PostgreSQL 18 documentation checked for [repeatable-read transaction retry semantics](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-REPEATABLE-READ) and [clock versus transaction timestamps](https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT). These references guide implementation; the connected tests establish local behavior. Exact WAL commit time remains unavailable and is not claimed.

## Checkpoint C — passed before final gates

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/monitoring-snapshot.test.ts apps/api/test/integration/authorization-isolation.test.ts` — PASS, **2 files / 32 tests**, 37.51s. Covers corrected original/effective history; retry denominators; actual mixed-source projections/direct history/action IDs; branch filters/revocation; unsent versus durably received rejected evidence; prepared/future held groups; personal scope; 304/full refresh equivalence; stale cursor restart; revision persistence/replans; and an older initial read losing a ledger insertion race. Independent read/write PostgreSQL backend IDs differ. The race forces a complete serialization retry, then returns the newer committed meaning/revision.

`node --env-file=.env.database.local --import tsx scripts/monitoring-demo.ts` — PASS: real loopback HTTP through the public MonitoringClient, source A/B and own-driver views, 304, partial → full correction and immutable original/effective history, hidden direct history 404 and full resync. Capture: `.local/phase-24-demo.json`. The portable conformance consumer imports public types only; no DB, server or fixture imports. No runtime provider, device or native ERP claim.

Development failures: mixed-source test first expected the revision to stay fixed when hidden heading made the actual next visible task change; corrected the assertion and independently proved hidden arrival leaves A unchanged. The test then found accepted heading actions missing from sanitized history; added a persisted `current_activity_history` admission join. Personal fixture defaults to three tasks; explicitly selected one for its one-task assertion. Lint caught three unused test imports; removed. Contract negative control referenced newly implemented monitoring; moved it to still-designed reconciliation. None of these failed runs is counted as a pass.

Review improvements: driver monitoring selects the latest **authorized** round rather than exposing a newer hidden-source-only round; historical cycles retain frozen source revisions and do not inherit newer-cycle deferral options; original held discrepancies remain visible alongside the latest cycle; pre-P24 changes use persisted accepted-action time when no new write mark exists. Operator-only `monitoringCapabilities` grants/revokes `monitor.read` through the existing versioned bootstrap instead of requiring manual production SQL.

Limit: P08 has no public operator workflow for linking two integration driver references to one shared driver. The mixed-source setup labels that reference/membership binding as a fixture; all shipment intake, assignment, round admission, current/outcome/correction and monitoring use real APIs/services/database commits. This phase verifies safe projection of persisted mixed-source work, not a new cross-source identity administration product. Full polling/render freshness, signed transport/application, native ERP and physical-device proof remain P25–27/P32/P38/P41.

## Final review and gates

Follow-up review checked source-only later rounds and retained holder history. `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/monitoring-snapshot.test.ts apps/api/test/integration/database-lifecycle.test.ts` — PASS, **2 files / 17 tests**, 25.28s. `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/dispatch-cycle.test.ts apps/api/test/integration/monitoring-snapshot.test.ts` — PASS, **2 files / 20 tests**, 36.70s. The redispatch test uses actual receipt/new-cycle/assignment/location commands and proves a later holder's pin/action/write mark cannot change the former holder's history/revision or disclose a direct action ID. Historical pins come from retained location history at the cycle's source revision. No external reviewer or subagent review was used.

The first full `npm run check` failed after **797 passed / 2 failed** (34 files / 799 total, 308.06s): `device-ownership.test.ts` lacked migration 0023 in its expected inventory, and `database-lifecycle.test.ts` lacked the two new monitoring tables. Fixed both inventory expectations; these were test-maintenance omissions, not hidden passing results. Build was not reached in that failed run. A second full run passed **799 / 800 tests** (34 files, 341.04s), failing only the real HTTP demo test at the inherited 10-second timeout under four-worker load (12.83s including teardown). Its standalone run and semantic assertions passed. Gave this test an explicit **30-second** limit; assertions and transaction behavior are unchanged. Build again was not reached. Final run passed as recorded below.

`npm run monitoring:demo` and `npm run test:erp:monitoring -- .local/phase-24-demo.json` — PASS. A copied consumer under `.local/p24-consumer-fNvz9D` ran successfully with only `tests/erp-conformance/monitoring.ts`, public `monitoring.ts`/`schema.d.ts`, the JSON capture, and the installed Node/tsx runtime; child environment had no database/operator credentials. It imports no server/fixture code. Portable checker negative controls in the connected suite reject hidden task leakage, double delivered counts and erased correction history.

`npm run db:migrate` — applied **0023_monitoring_snapshots.sql** to the marked local application database; repeated command returned **already current**. Read-only inspection reports PostgreSQL **18.6**, application B2B tasks/rounds/outcomes all **0**. No Engine datasets/mounts/map imports touched. Test databases are isolated and removed by the harness.

`python scripts/check-ui-spec.py` — PASS: 18 original asset hashes, 105 control dispositions, 64 action rows covering 183 operations, 79 local links, contrast checks and all negative controls. This is specification/reference verification, not new UI/browser evidence. `git -c core.safecrlf=false diff --check` — PASS.

Versions retained: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.6**, pg **8.23.0**, Fastify **5.12.5**, TypeScript **6.0.2**, Vitest **5.0.1**, Playwright **1.63.0**. No dependency upgrade. Existing redirect-only OIDC callback 302 OpenAPI warning remains; no fabricated 200 was added.

Remaining limits: full authorized history is reconstructed before page slicing; ledger growth/load/freshness SLO remain unmeasured (P38). Transaction marks record precommit write time visible after commit, not WAL commit instant. Scoped viewers receive authorized task/action marks only: shared plan-only changes can advance the replacement revision without advancing that mark; it is not a complete freshness watermark. Catalog `progress.snapshot` push event remains designed; the delivered replacements here are conditional HTTP reads. Sender/application states, physical device/native ERP, external issuer/Engine and polling/render evidence are not established by this phase. P25 may rely on migration 0023, the ten verified HTTP read operations, closed schema/examples, public client, actual PostgreSQL tests and demo, plus prior source-specific outbox intents; it must establish signed delivery separately. No P25 work, commit, push or publication was performed.

Final command: `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` — **PASS, 34 files / 800 tests**, 356.46s (started 15:43:58 local). Audit reports **0 vulnerabilities**; lint, OpenAPI validation, canonical checks, all typechecks, API/shared/web production builds and production fixture isolation pass. Canonical inventory is **22 schemas / 222 valid / 142 invalid examples / 183 operations**. Log: `.local/phase-24-check-final-2.log`. Existing callback-302 and MapLibre >500kB bundle warnings remain. Final read-only cleanup check: **0 disposable databases**, application B2B tasks/rounds/outcomes **0/0/0**. All requested local checks completed; no new UI/browser/device/external-service checks were run or claimed.

## Changed paths

- `TAWSEL-DISCOVERY-LOG.md`
- `apps/api/src/app.ts`
- `apps/api/src/db/transaction.ts`
- `apps/api/src/monitoring/models.ts`
- `apps/api/src/monitoring/queries.ts`
- `apps/api/src/monitoring/routes.ts`
- `apps/api/src/monitoring/service.ts`
- `apps/api/src/provisioning/service.ts`
- `apps/api/test/integration/authorization-isolation.test.ts`
- `apps/api/test/integration/database-lifecycle.test.ts`
- `apps/api/test/integration/device-ownership.test.ts`
- `apps/api/test/integration/dispatch-cycle.test.ts`
- `apps/api/test/integration/monitoring-snapshot.test.ts`
- `apps/api/test/integration/partial-return-correction.test.ts`
- `apps/api/test/integration/planning-jobs.test.ts`
- `apps/api/test/support/monitoring-fixture.ts`
- `contracts/examples/README.md`
- `contracts/examples/invalid.json`
- `contracts/examples/valid.json`
- `contracts/monitoring.schema.json`
- `contracts/openapi.yaml`
- `contracts/operations.json`
- `contracts/provisioning.schema.json`
- `db/migrations/0023_monitoring_snapshots.sql`
- `docs/authorization.md`
- `docs/contract-coverage.md`
- `docs/erp/ERP-PLANNING-INPUT.md`
- `docs/erp/README.md`
- `docs/erp/consumer-quickstart.md`
- `docs/erp/field-and-status-mapping.md`
- `docs/implementation-status.md`
- `docs/integration-guide.md`
- `docs/monitoring.md`
- `docs/phase-24-evidence.md`
- `docs/phases/README.md`
- `docs/phases/coverage-matrix.md`
- `docs/reference/public-contract.md`
- `docs/tracking-and-consistency.md`
- `docs/ui-actions.md`
- `master-plan.md`
- `package.json`
- `packages/api-client/README.md`
- `packages/api-client/package.json`
- `packages/api-client/src/monitoring.ts`
- `packages/api-client/src/schema.d.ts`
- `packages/shared/test/fast/contract-foundation.test.ts`
- `scripts/check-ui-spec.py`
- `scripts/contracts.mjs`
- `scripts/monitoring-demo.ts`
- `tests/erp-conformance/monitoring.ts`
