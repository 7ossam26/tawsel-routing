# Phase 22 evidence — 24 September 2026

Started at clean HEAD `99fc8b8` (`phase 21`). No applicable nonempty AGENTS.md found. Runtime identifies GPT-6; exact picker model suffix and reasoning setting are not exposed and are not asserted. Requested recommendation: gpt-6-astra / xhigh; model-selection guide consulted.

Read the master plan (especially 7/9), current discovery/decision amendments through D-112, phase README, assigned coverage rows, implementation ledger, ERP handoff plan and real P14/P16/P18/P19/P21 code/contracts/tests. Retain installed pinned dependencies; no Engine imports, mounts or Stitch edits.

## Prerequisite check

`npm run test:integration -- --maxWorkers=2 apps/api/test/integration/planning-publication.test.ts apps/api/test/integration/current-activity.test.ts apps/api/test/integration/retry-deferral-urgency.test.ts apps/api/test/integration/workday-carryover.test.ts apps/api/test/integration/partial-return-correction.test.ts` — PASS, 5 files / 99 tests, 105.58s, real isolated PostgreSQL, before editing. No prerequisite repair required.

## Checkpoint A — passed before B

Branch service is a round activity mode bound to an actual source return request. Customer reservations remain counted for incoming admission. Retained sequence/forecast identities stay visible. Claimed handback quantities are fixed when interrupting and rechecked under the common driver locks on resume. Arrival records branch origin explicitly. No remote call proves physical receipt.

Migration 0020, closed branch/current/planning schemas, branch transaction/history/publication and driver HTTP commands added. Current snapshot (including takeover) exposes branch activity; customer selection/outcomes, manual plan edits, eligibility changes and closure cannot bypass it. Unknown source branch location blocks rather than inventing coordinates. Resume publishes a fresh manual order and queues replan from explicit confirmed branch origin; first forecast stays immutable.

`npm run typecheck -w @tawsel/api` PASS. `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/branch-interruption.test.ts` PASS, 2 tests, 4.23s, real PostgreSQL. Proves visible pause, arrived-customer denial, no early resume, confirmed two-of-three continuation with one held, same round and preserved baseline/forecast membership. Development failures: Python default Windows text encoding failed before current-service edits (rerun UTF-8); typecheck caught branch origin vocabulary mismatch (corrected to existing branch-pin). No unresolved prerequisite dependency. Full capacity/concurrency remains checkpoint B.

## Checkpoint B — passed before C

The branch plan contains one branch stop and zero executable customer stops; all 50 accepted customers have explicit paused forecast membership. Their original reservations still count during atomic intake. Receipt invalidates planning inputs without replacing the branch segment. Resume filters current eligibility, retains relative sequence, respects urgent-first policy and produces new forecast IDs. Empty continuation clears the active plan pointer rather than leaving an apparently active branch plan.

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/branch-interruption.test.ts` PASS, 6 tests, 13.89s. Includes 50-customer pause/resume, all forecasts and first baseline retained, no second round, entire two-task overflow rejected, late leased planner publication fenced, both independent receipt/resume connection orders with observed PostgreSQL blocking, same-ID rejected recovery, actual receiver write failure, and fault rollback at domain/progress/audit/outbox/result. These are PostgreSQL/service tests; provider failure is labelled and is not live Engine evidence. No unresolved prerequisite dependency.

## Checkpoint C — passed before final review

Migration 0021 adds current-cycle uniqueness, frozen per-cycle source revision, predecessor links and append-only receipt-stock allocations with a database quantity guard. `dispatch.createFromReceipt` creates a new unassigned cycle and exact source snapshot, followed by the existing atomic preparation/receipt APIs. Task/external identity stays stable. Old holder, attempts, outcomes, fees, returns and unreceived discrepancies remain intact; old-customer input disappears only because its resolved cycle is historical, and retained old custody is still exposed separately. A fresh cycle cannot copy more than actual, unallocated receipt stock or inflate those quantities through ordinary snapshot edits. A shipment has one customer execution at a time.

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/dispatch-cycle.test.ts apps/api/test/integration/branch-interruption.test.ts` PASS, 2 files / 12 tests, 23.85s. Confirms new cycle/attempt with stable shipment, preserved original collection plus new exact collection, old held remainder, duplicate recovery, rejected old retry/outcome evidence, SQL old-cycle reopening denial, offer/loss exclusion, independent receipt-versus-dispatch and late-outcome-versus-dispatch races in both orders. All actual transaction boundaries use PostgreSQL. `npm run typecheck` PASS.

Development failures retained: initial cycle-source join produced ambiguous joined columns (made explicit); refusal fixture used a noncanonical field (corrected to shippingPayment); historical custody aggregate lacked the complete composite grouping key (fixed). A filtered test command matched no tests and was not counted; the corrected heading filter passed. No external reviewer feedback supplied. Final review adds rollout/retained-migration compatibility and broader public-consumer proof; final results follow.

## Final review and verification

Retained pre-P22 migration fixtures still work: legacy initial-cycle inserts use the new source-revision trigger, and compatible reads tolerate absent P22 columns in those fixtures. New commands require the new migrations. Competing redispatches allocate stock once; ordinary source edits cannot inflate it. A different driver must receive the fresh cycle through the existing receipt boundary. Each injected domain/progress/audit/outbox/result failure rolls back all new-cycle effects.

Review found that work accepted during branch service must appear in the paused sequence immediately. Enqueue now appends new eligible attempts, advances branch revision and publishes a fresh paused forecast under the shared locks. A PostgreSQL test verifies visibility and resumed ordering. Current/takeover reads expose the branch plan ID. Branch publication emits scoped metadata-only plan intent without mixed-source task data.

| Exact command | Actual result |
| --- | --- |
| `npm run test:integration -- --maxWorkers=2 apps/api/test/integration/b2b-intake-admission.test.ts apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/dispatch-cycle.test.ts apps/api/test/integration/branch-interruption.test.ts apps/api/test/integration/planning-jobs.test.ts apps/api/test/integration/workday-carryover.test.ts` | PASS, 6 files / 77 tests, 101.25s, including retained migration compatibility. |
| `npm run test:branches -- --maxWorkers=1` | PASS, 2 files / 15 tests, 28.84s; the subsequent new-admission test brings the final phase suites to 16 tests, included in the full check below. |
| PowerShell `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` | Final PASS, 33 files / 736 tests, 271.74s; audit 0 vulnerabilities, lint, OpenAPI/generated references, types, builds and production fixture isolation pass. |
| `npm run branches:demo` | Final PASS after review: actual HTTP/PostgreSQL branch sequence, subset receipt, new cycle, same-round resume, API outage/restart and public-only child consumer. Credential-free report: `.local/phase-22-demo.json`. |
| `npm run test:erp:dispatch -- .local/phase-22-demo.json` | PASS, captured public identities/conservation plus negative identity mutation. This report check is separate from the live child HTTP proof inside the demo. |
| `npm run db:migrate` (then repeated) | Applied `0020_branch_activity.sql`, `0021_dispatch_cycles.sql`; repeated run already current. |
| `python scripts/check-ui-spec.py check` | PASS, 176 operations / 64 action rows, 33 designed state cases, source hashes, contrast, 75 specification file links and six negative mutations. Specification structure, not UI usability. |
| `git -c core.safecrlf=false diff --check` | PASS. Prior migration, Engine/Stitch and dependency-lock diff checks empty. |

Canonical inventory: **20 schemas / 212 valid examples / 131 invalid examples / 176 operations, events and local actions**. Captured `p22-*` examples remain owned by canonical example files. Local file links in changed Markdown resolve; external URLs/fragments are not validated by that scan.

Repaired interim failures: strict AJV schema authoring and envelope typing; public path/operation allowlists; package exposure corrected to its existing `files` list; first full check stopped on an unused type import. The next full run had **734 passes and two failures**, both obsolete migration/table inventories in device-ownership/database-lifecycle tests. Those inventories were updated; the final full run passed all 736. Failed runs are not represented as passing builds. Existing redirect-only callback-302 and MapLibre bundle-size warnings remain.

Observed versions: **Node 24.19.0, npm 11.1.0, PostgreSQL 18.6, pg 8.23.0, Fastify 5.12.5, TypeScript 6.0.2, Vitest 5.0.1, Playwright 1.63.0, Vite 8.3.0**. Pins and lockfile retained. After final checks, the local application database has zero B2B fixture tasks, rounds or outcomes; no disposable test databases remain (test control database retained).

## Evidence boundaries and Phase 23 handoff

Database tests use actual isolated PostgreSQL, independent connections, observed lock barriers and real commit/rollback boundaries. The demo uses real Fastify HTTP, public clients, a copied separate consumer with only URL/scoped token/request/report inputs, and actual API interruption/restart. Driver authentication/bootstrap and routing-provider behavior are fixtures. No new UI component changed; no new browser interaction or usability evidence is claimed. Branch UI remains P31. Live Engine/physical device/live issuer/native ERP/signed sender and receiver checks were not run here: road timing, physical delivery, ERP application, production deployment and transport delivery are not established. Locally durable event intent is the implemented boundary.

P23 may rely on **0020–0021**, `apps/api/src/branch/{service,state,publication}.ts`, P21 `returns/state.ts` shared driver/round locks and claimed-subset confirmation, immutable `branch_activity_history`, receipt/disposition balances, `redispatch_allocations`, predecessor/frozen-source cycle identities and `retry_dependencies` including `redispatched`. Current/takeover snapshots, intake cycle history, old held custody and original outcome/collection reads retain provenance. The two new integration suites and [API/demo](branch-interruption.md) reproduce these guarantees. P23 must revalidate owner, workday, effective outcome, receipt and redispatch dependencies under those locks; correction/adoption is **not implemented here**. No unresolved P22 prerequisite remains. No external reviewer feedback was supplied.

No next phase, commit, push, publication or map import was performed. Engine datasets/mounts, original Stitch exports and prior migrations were preserved.

## Changed paths

Exact phase working-tree paths (generated artifacts included):

```text
TAWSEL-DISCOVERY-LOG.md
apps/api/src/b2b-intake/routes.ts
apps/api/src/b2b-intake/schema.ts
apps/api/src/b2b-intake/service.ts
apps/api/src/branch/models.ts
apps/api/src/branch/publication.ts
apps/api/src/branch/service.ts
apps/api/src/branch/state.ts
apps/api/src/closure/reads.ts
apps/api/src/closure/service.ts
apps/api/src/current/service.ts
apps/api/src/current/state.ts
apps/api/src/devices/service.ts
apps/api/src/eligibility/service.ts
apps/api/src/outcomes/service.ts
apps/api/src/planning/manual.ts
apps/api/src/planning/queue.ts
apps/api/src/planning/service.ts
apps/api/src/returns/routes.ts
apps/api/test/integration/branch-interruption.test.ts
apps/api/test/integration/database-lifecycle.test.ts
apps/api/test/integration/device-ownership.test.ts
apps/api/test/integration/dispatch-cycle.test.ts
apps/api/test/integration/partial-return-correction.test.ts
apps/api/test/integration/planning-jobs.test.ts
contracts/b2b-intake.schema.json
contracts/branch-activity.schema.json
contracts/current-activity.schema.json
contracts/examples/README.md
contracts/examples/invalid.json
contracts/examples/valid.json
contracts/openapi.yaml
contracts/operations.json
contracts/planning.schema.json
db/migrations/0020_branch_activity.sql
db/migrations/0021_dispatch_cycles.sql
docs/branch-interruption.md
docs/contract-coverage.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/README.md
docs/erp/consumer-quickstart.md
docs/erp/field-and-status-mapping.md
docs/implementation-status.md
docs/integration-guide.md
docs/phase-22-evidence.md
docs/phases/README.md
docs/phases/coverage-matrix.md
docs/reference/public-contract.md
docs/tracking-and-consistency.md
docs/ui-actions.md
master-plan.md
package.json
packages/api-client/README.md
packages/api-client/package.json
packages/api-client/src/branches.ts
packages/api-client/src/intake.ts
packages/api-client/src/schema.d.ts
packages/shared/test/fast/contract-foundation.test.ts
scripts/branch-demo.ts
scripts/check-ui-spec.py
scripts/contracts.mjs
tests/erp-conformance/dispatch.ts
```
