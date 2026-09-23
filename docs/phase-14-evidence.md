# Phase 14 evidence — 23 September 2026

Started at clean HEAD `c7c22c6` (`phase 13`). No applicable AGENTS.md found in the repository or ancestors. Runtime identifies GPT-6; exact picker suffix and reasoning effort are unavailable. Requested `gpt-6-astra`/`xhigh` is therefore not asserted as observed; `docs/phases/model-selection.md` consulted. No dependency version changes or Engine dataset/mount/import operations.

Read master-plan §§7/9, current D-112 discovery amendments, decision map, coverage rows R-13/14/21/23/24/25/26/28/58/65, phase index/status, state/consistency specification, and actual P10/P12/P13 code, migrations and tests. Inspected [VROOM v1.15 primary API](https://raw.githubusercontent.com/VROOM-Project/vroom/v1.15.0/docs/API.md): priority governs inclusion, not the required sequence; provider offsets use seconds and distances metres; omitted endpoint means last task. Existing pinned adapters retained.

Commands below use process-local PATH prefix `C:\Users\LOQ\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin` for Node 24.19.0. PostgreSQL tests use the isolated databases allocated by `.env.database.local`, not transaction mocks. HTTP providers are controlled fixtures, never live Engine evidence.

Prerequisite command: `npm run build -w @tawsel/shared`, then `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/b2b-intake-admission.test.ts apps/api/test/fast/engine-adapters.test.ts apps/api/test/integration/planning-jobs.test.ts apps/api/test/integration/planning-publication.test.ts`: **4 files / 66 tests passed** before editing. No prerequisite repair required.

## Checkpoint A — ordering (passed before B)

Added `planning/policy.ts`: current prefix, urgent and ordinary groups, propagated origin and common forecast offsets, explicit unassigned reconciliation, waiting/service distinctions, endpoint leg and branch service. This is a sequencing heuristic, not global optimality. Tests use real persisted snapshots with explicitly labelled future execution/deferral inputs, plus controlled HTTP VROOM responses.

`npm run typecheck -w @tawsel/api` passed. `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/planning-publication.test.ts -t 'P14 A'`: **2 passed / 9 deliberately unselected**. Future urgent is absent from all provider requests; unreachable urgent remains explicitly unassigned/partial; unreachable current blocks following visits. Four visits preserve 28 seconds waiting separately from 2,400 seconds service. No unresolved implementation dependency for B; actual heading/deferral/outcome writers remain P16–18.

## Checkpoint B — complete validation (passed before C)

Migration 0010 preserves old drafts and adds immutable ready/partial policy evidence. Worker now invokes the grouped policy and revalidates the entire candidate under the existing publication fence. Durable APIs distinguish `resultKind` full/partial/invalid/dependency-failed; partial plans expose each unassigned current/urgent/ordinary task or work blocked by an unreachable current target. No partial result becomes ready.

`npm run contracts:generate` and `npm run typecheck -w @tawsel/api` passed. `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/planning-publication.test.ts`: **25 passed**, including 12 malformed-result variants with committed failed jobs and zero plan/forecast rows, whole-route urgency/current/earliest/capacity checks, fixed-endpoint HTTP OSRM timing and distinct same-address shipments. Existing delayed revisions and atomic outbox rollback still pass. Initial strict-schema required-property placement, the old negative example's const-to-enum expectation and one fixture branch identifier were corrected before the successful run. No unresolved dependency for C. Live Engine has not yet been reprobed.

## Checkpoint C — manual behavior (passed)

Migration 0011 adds immutable manual revisions with command provenance and no provider candidate/job. Same driver locks and optimistic settings/input/manual revisions guard complete orders and first-suggestion selection. Current target, urgent groups, eligibility and capacity remain constraints. Manual acceptance supersedes pending/in-flight jobs atomically, preserves historical forecasts and stores ordered membership with null road/arrival/completion/finish estimates. Failed replans expose a retained valid sequence only after checking current input; confirming it creates a fresh manual revision.

`node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/planning-publication.test.ts`: **29 passed**. Delayed optimizer versus actual manual command, exact action replay, independent-connection competing manual CAS, injected forecast-write rollback and retained-order failure behavior passed. `npm run typecheck -w @tawsel/api` passed after adjusting null-aware consumer types. `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/session-auth.test.ts -t P13`: **1 passed / 19 unselected**, extended with real listening HTTP, signed issuer fixture/session/CSRF, typed manual command and durable history after a second API restart. No new UI or browser usability claim.

## Review, demonstration and external gap

Additional focused tests for actual public ERP urgent/prepared/future intake and first manual plan after a committed HTTP 503 failure: **2 passed / 29 unselected** using `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run apps/api/test/integration/planning-publication.test.ts -t 'P14: public|P14: first'`. ERP commands and planning persistence are real; enabled issuer subject and future current-target writer are explicitly labelled fixtures.

`npm run planning:policy:demo` passed: committed provider failure → manual first revision → ready revision → delayed optimizer superseded by a newer manual decision. Three distinct forecast/workload revisions retained; actual rows inspected in `.local/phase-14-demo.json`; disposable database removed. `npm run test:erp:planning` passed after correcting a one-member canonical example that could not actually exercise a reversed-order assertion. Canonical P14 manual/partial/ready examples now contain useful distinct IDs; ready schema requires at least one visit. No passing assertion was substituted for the initially failing check.

`npm run engine:live` **failed as expected from observed unavailability**, exit 1, at `2026-09-23T00:16:55.235Z` (23 Sep Cairo). All nine route/table/optimize requests for car/motorcycle/bicycle returned unavailable. Docker inventory unavailable; local dataset directory contains only `.gitkeep`. `.local/engine-live-report.json` records the attempt. Actual provider runtime versions, profile/dataset compatibility, live grouped route quality and endpoint road feasibility remain **unverified**. No import, container startup, dataset/mount edit or fixture-as-live claim.

Local review corrected a status edge case: after a valid current manual plan, an older failed job must not advertise a redundant pending continuation. Its regression assertion passes. Added an upgrade test committing a real P13 draft/forecast before migrations 0010/0011, then asserting unchanged times/IDs and no automatic policy promotion. Initial test used `filename` instead of migration metadata `name`; that typecheck/test failed, then was corrected. Focused upgrade/branch/first-manual check: **3 passed / 39 unselected**. Branch endpoint now has explicit stored final-leg/service evidence, and unassigned urgent has a committed exception row through real public ERP inputs.

Automatic approval review rejected a combined command containing cleanup of the empty test directory `C:\Users\LOQ\AppData\Local\Temp\tawsel-p13-upgrade-wVPNoz` with the reason “blocked by policy” and no further detail. The empty directory was left untouched (read-only inspection confirmed no contents). Verification/migration commands were then run separately; no database was left by the failed upgrade test. This does not block the phase outcome.

## Final verification and stopping point

- `npm run check` with `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001`: **PASS**, final **20 files / 453 tests**, audit zero vulnerabilities, ESLint, OpenAPI, canonical/generation checks, API/web/client/script typechecks, API/shared/web production builds and production-fixture isolation. The earlier full run passed 450 tests; the final run includes the subsequent review regressions. Existing callback-only 302 OpenAPI and MapLibre >500 kB warnings remain.
- `npm run contracts:generate` / check: **12 canonical schemas, 120 valid / 83 invalid examples, 151 owned operations**. `planning.setManualOrder` is now verified-local. `npm run test:erp:planning`, `npm run planning:demo`, `npm run planning:policy:demo`: **PASS**. Demo inspected three immutable forecasts and manual → ready → manual revisions; no test database retained.
- `npm run db:migrate`: **applied 0010_route_policy.sql and 0011_manual_plans.sql** to the dedicated local application database. Read-only final inspection found zero disposable test databases, zero application personal/company fixture tasks and zero application plans. Actual versions: **Node 24.19.0 / npm 11.6.2 / PostgreSQL 18.6**. Existing pg 8.23.0, Fastify 5.12.5, Vitest 5.0.1, TypeScript 6.0.2 and Vite 8.3.0 pins retained; no dependency additions.
- `npm run planning:worker:once`: passed after migration, reported **No due planning job** and exited. No worker daemon was left running.
- `git diff --check` with the repository's normal CRLF normalization and `core.whitespace=cr-at-eol`: passed. An initial read-only check overriding `core.autocrlf=false` incorrectly treated retained CRLF lines as changed whitespace; it caused no file/config edits. Protected Engine/Stitch/map/prior-migration/lockfile paths are unchanged.
- P15 may rely on the exact artifacts listed in [route-policy handoff](route-policy.md#durable-states-demo-and-handoff): migrations 0009–0011, `policy.ts`, `manual.ts`, locked `queue.ts`/`worker.ts`, canonical/generated Planning API and immutable plan/forecast/workload records. **Current valid ready/manual only** is the online-start boundary; historical draft/partial or stale input is insufficient. P15 must create/bind the first baseline and departure authority; none exists here. No next phase, commit, push or publication.

## Changed paths (complete)

```text
apps/api/src/planning/manual.ts
apps/api/src/planning/models.ts
apps/api/src/planning/policy.ts
apps/api/src/planning/routes.ts
apps/api/src/planning/service.ts
apps/api/src/planning/worker.ts
apps/api/test/integration/database-lifecycle.test.ts
apps/api/test/integration/planning-jobs.test.ts
apps/api/test/integration/planning-publication.test.ts
apps/api/test/integration/session-auth.test.ts
apps/api/test/support/planning-company-fixture.ts
apps/api/test/support/planning-fixture.ts
db/migrations/0010_route_policy.sql
db/migrations/0011_manual_plans.sql
contracts/planning.schema.json
contracts/openapi.yaml
contracts/operations.json
contracts/examples/README.md
contracts/examples/valid.json
contracts/examples/invalid.json
packages/api-client/README.md
packages/api-client/src/planning.ts
packages/api-client/src/schema.d.ts
packages/shared/test/fast/contract-foundation.test.ts
scripts/contracts.mjs
scripts/planning-demo.ts
scripts/route-policy-demo.ts
tests/erp-conformance/planning.ts
package.json
README.md
master-plan.md
TAWSEL-DISCOVERY-LOG.md
docs/route-policy.md
docs/planning-jobs.md
docs/phase-14-evidence.md
docs/implementation-status.md
docs/phases/README.md
docs/phases/coverage-matrix.md
docs/tracking-and-consistency.md
docs/ui-actions.md
docs/contract-coverage.md
docs/reference/public-contract.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/field-and-status-mapping.md
docs/erp/consumer-quickstart.md
```

Generated artifacts retain canonical schema/example/catalog ownership. No changes to dependency lockfile, migrations 0001–0009, retained Engine configuration/datasets/mounts, map assets or original Stitch exports. Working changes remain uncommitted at HEAD `c7c22c6`. No subagent or external reviewer was used; review findings above are local inspection/test findings. No UI changes, Playwright/physical-device run, production deployment, real ERP connector, active start or Phase 15 implementation.
