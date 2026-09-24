# Phase 23 evidence — 24 September 2026

Started from clean HEAD `933a01166c2fb1b019e94a0fc4b2574c0d7228c3` (`phase 22`). No repository or ancestor AGENTS.md found. Runtime identifies GPT-6; exact picker variant and reasoning effort are not exposed. Requested recommendation is gpt-6-astra / xhigh; `docs/phases/model-selection.md` consulted. No picker change is claimed.

Read the master plan sections 5–8/10–11, current discovery amendments through D-112 and decision map, phase README, assigned requirement rows, implementation status, real outcome/closure/device/receipt/dispatch code and migrations, correction/evidence contracts and A26/A27 (02/09) action specifications. Installed pins retained; no new dependency selection, Engine import, dataset/mount or Stitch change.

## Prerequisites

`npm run test:integration -- apps/api/test/integration/outcome-progress-outbox.test.ts apps/api/test/integration/workday-carryover.test.ts apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/branch-interruption.test.ts apps/api/test/integration/dispatch-cycle.test.ts` — PASS, **6 files / 83 tests**, 97.72s, real isolated PostgreSQL. No prerequisite defect required repair.

## Checkpoint A — passed before B

Correction replaces the effective report for one attempt, preserving every immutable outcome, quantity, collection and original resolution row. A linked correction records the exact prior effective revision and optional durable evidence receipt. Totals use one effective revision per attempt, retaining fees from other attempts. Correction never edits the source snapshot or produces a refund/payment instruction.

Unreceived offers are superseded when their outcome changes. Actual receipt/disposition, redispatch, later attempt or closed workday blocks correction. Current ownership is checked against the driver's latest round, including its generation and snapshot token. Compatible adoption supports recorded delivery outcomes; arrival-only evidence remains retained and explicitly unsupported by this bounded phase.

Commands, focused results, failures, remaining limits and handoff are recorded below in checkpoint order.

Added closed correction/replacement/availability/history/event schemas, generated public types, positive/negative examples and the public availability handler. `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts -t P23` — **1 passed / 18 unrelated skipped**, 2.81s. The actual API explains both a committed native subset receipt and a committed day end while preserving the original result. `npm run test:contracts` — **360 passed**, 1.97s. `npm run typecheck -w @tawsel/api` — PASS. No unresolved prerequisite dependency.

Development failures: first example used an older generic example without resource IDs; corrected to the canonical P17 envelope. Quoted multiword npm test filter matched no tests; corrected to `-t P23` and no skipped test was counted as passing. Contract tests required the P23 path/operation allowlist and a still-designed negative control after adoption became implemented. Mutation endpoints declared here are completed and verified in B, not claimed callable at A.

## Checkpoint B — passed before C

Migration 0022 permits immutable outcome revisions only with a linked correction and retains the original attempt resolution. Added correction/adoption transactions, current generation/snapshot validation, evidence receipt references, exact frozen arithmetic, append-only revision/quantity/collection history and effective per-attempt custody. Pending return offers become superseded; confirmed quantities remain blocking facts. Original outcome APIs, planning/eligibility and basic workday reads now consume effective revisions. Correction and source intent/audit/result/progress share the existing transaction. Denials durably retain evidence plus an account notification intent.

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts -t P23` — **4 passed / 18 unrelated skipped**, 8.57s. Includes live API duplicate recovery, partial result then wrong-piece correction (25000 → 15000 minor units), unchanged source prices/original records, superseded-offer receipt denial, effective round/day/custody assertions and rollback at domain/progress/audit/outbox/result. `npm run typecheck -w @tawsel/api` and canonical generation passed. No unresolved prerequisite dependency. Independent races, adoption compatibility/authorization and B2C proof follow in C.

## Checkpoint C — passed before final gates

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts -t P23` — **26 passed / 18 unrelated skipped**, 43.35s. Real independent PostgreSQL connections observe blocking through `pg_blocking_pids`; both receipt/closure/redispatch orders, duplicate and competing correction identities are checked against custody, effective reports and preserved facts. Driver API injection/real native receipt endpoints are used for correction/receipt/closure races; redispatch/duplicate races use the same transaction services on independent connections. Added first-outcome B2C adoption, simple B2C correction, prior retry shipping preservation, broad staff-role denial, cross-account/resource denial, revoked correction grant, expected receipt/generation/token/source validation and durable incompatible records. Round end alone does not close the correction window; original workday closure does.

`npm run corrections:demo` and `npm run test:erp:corrections -- .local/phase-23-demo.json` — PASS. Real loopback HTTP/public clients demonstrate 2 pieces/25000 → 1/15000 correction, deliberately lost committed response, API restart/same-action recovery, explicit known former-device adoption back to 2/25000, actual receipt then correction denial despite earlier client time. Source correction and account adoption event payloads validate. The portable conformance script has no server/database imports and rejects missing history and double-counting mutations. Identity/bootstrap/source provisioning are fixtures; no actual ERP or webhook transport claim.

Development failures retained: first regression run had 78 passed / 2 failures because P20 tests/conformance still asserted `adoptionImplemented:false`; updated for the implemented feature. Typechecks caught nullable custody/history and inferred Fastify callback types in the new tests/demo; fixed. Account outbox constraint was extended narrowly for `evidence.adoptionResolved` to the same authenticated source account. Review identified active branch handover claims as dependent facts: correction must not strand a claimed-subset visit by superseding its receipt anchor; added a `claimed-handover` blocker while ordinary unclaimed offers remain supersedable. Final results follow below.

## Final review checks

| Exact command | Observed result |
| --- | --- |
| `npm run typecheck` | PASS for shared/API/web/public client/scripts |
| `npm run test:integration -- --maxWorkers=2 apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/database-lifecycle.test.ts` | PASS, **3 files / 67 tests**, 104.81s, including additive upgrade and copied P20 HTTP demonstration |
| `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts -t anchoring` | PASS, **1 test / 45 unrelated skipped**, 5.33s; claimed handover remains receivable after correction denial |
| `npm run test:contracts` | PASS, **367 tests**, 1.94s, with schema-valid captured correction/adoption events and negative linkage cases |
| `python scripts/check-ui-spec.py` | PASS, all **178 operations / 64 action rows**, original export hashes, 77 links, contrast/state cases and meaningful negative controls; specification check only |
| `npm run db:migrate` | Applied **0022_driver_corrections.sql** to marked local application database; zero existing outcome rows |
| `node .local/p23-portable.mjs` | PASS; copied public schema/conformance script/report into an independent directory and ran with no DB/operator/issuer/service credentials. Report: `.local/phase-23-consumer-check.json`; captured HTTP/event conformance, not live delivery |
| `git -c core.safecrlf=false diff --check` | PASS |
| First `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` | Audit/lint/contracts/types passed; **773 tests passed / 2 failed**, 33 files, 257.18s. Both failures were P12/P13 upgrade-test expected migration arrays missing new 0022, not lost data or failed migration. Updated those two inventories; production build was not reached in this run. |

Final review also aligned the designed correction example's resource IDs and base versions with its payload (no invented predecessor); regeneration plus **367 contract tests** passed again, 2.93s. Added explicit adoption rejection for original source/assignment/pin mismatch and injected rollback of first-outcome adoption at progress/outbox/result, including preserved current heading and original evidence receipt. Repeated application migration reports **already current**. These changes are included in the final gate below.

Final `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` — **PASS**, **33 files / 778 tests**, 303.74s (started 14:44:51 Cairo), including all **49 correction/dependency tests**. Audit reports zero vulnerabilities; lint, OpenAPI lint, generated-contract check, all typechecks, shared/API/web production builds and production fixture isolation passed. Canonical inventory is **21 schemas / 217 valid / 137 invalid examples / 178 operations**. The existing redirect-only callback-302 OpenAPI warning and MapLibre >500 kB bundle warning remain; neither is a failed gate.

`node --env-file=.env.database.local .local/p23-clean-check.mjs` — read-only final inventory: **0 disposable test databases**, application **0 B2B tasks / 0 rounds / 0 outcomes**. The query counts database names matching `^tawsel_test_[0-9a-f]{32}$` and the three application tables; no unrelated data was removed.

Versions observed: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.6**, pg **8.23.0**, Fastify **5.12.5**, TypeScript **6.0.2**, Vitest **5.0.1**, Playwright **1.63.0**. Existing pins retained. No external review feedback was supplied; the branch-claim finding above is agent review.

## Remaining limits and handoff

No UI component changed, so no browser/render/usability or physical-device check was run or claimed. P30 owns connected correction controls, P33–35 durable local capture/replay. Adoption supports delivery outcome evidence only; arrival-only records remain retained with an unsupported-operation blocker. Creating a first outcome requires the original active round; correcting an existing outcome may follow round end while that workday is open. No refund, settlement, staff execution override, source price editor or day reopening.

Real native ERP interoperability, signed sender/receiver delivery and physical-device behavior remain unverified. Local identity/bootstrap/provisioning fixtures are explicitly labelled. Engine availability does not affect these transaction checks; no Engine import, mount, dataset or original Stitch file was changed. The final demo is reproducible with `npm run corrections:demo`; `.local/phase-23-demo.json` is captured evidence, not a canonical schema owner.

Phase 24 may rely on the exact artifacts listed in [the handoff](corrections.md#phase-24-handoff): migration 0022; immutable correction links, original outcomes and effective-attempt/custody projections; current driver APIs/client/allowed reads; effective outcome/day/eligibility/planning integration; canonical schema/examples and ERP references; independent-connection/rollback tests; real HTTP restart demonstration. No Phase 24 work, commit, push or publication was performed.

## Changed paths

```text
TAWSEL-DISCOVERY-LOG.md
apps/api/src/app.ts
apps/api/src/closure/reads.ts
apps/api/src/corrections/models.ts
apps/api/src/corrections/routes.ts
apps/api/src/corrections/service.ts
apps/api/src/corrections/state.ts
apps/api/src/devices/service.ts
apps/api/src/eligibility/state.ts
apps/api/src/outcomes/persistence.ts
apps/api/src/outcomes/service.ts
apps/api/src/planning/queue.ts
apps/api/src/returns/receiver.ts
apps/api/src/returns/state.ts
apps/api/test/integration/database-lifecycle.test.ts
apps/api/test/integration/device-ownership.test.ts
apps/api/test/integration/partial-return-correction.test.ts
apps/api/test/integration/planning-jobs.test.ts
contracts/corrections.schema.json
contracts/device-ownership.schema.json
contracts/examples/README.md
contracts/examples/invalid.json
contracts/examples/valid.json
contracts/openapi.yaml
contracts/operations.json
db/migrations/0022_driver_corrections.sql
docs/contract-coverage.md
docs/corrections.md
docs/device-ownership.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/README.md
docs/erp/consumer-quickstart.md
docs/erp/field-and-status-mapping.md
docs/implementation-status.md
docs/integration-guide.md
docs/outcomes.md
docs/phase-23-evidence.md
docs/phases/README.md
docs/phases/coverage-matrix.md
docs/reference/public-contract.md
docs/returns.md
docs/tracking-and-consistency.md
docs/ui-actions.md
master-plan.md
package.json
packages/api-client/README.md
packages/api-client/package.json
packages/api-client/src/corrections.ts
packages/api-client/src/schema.d.ts
packages/shared/test/fast/contract-foundation.test.ts
scripts/check-ui-spec.py
scripts/contracts.mjs
scripts/correction-demo.ts
tests/erp-conformance/corrections.ts
tests/erp-conformance/devices.ts
```
