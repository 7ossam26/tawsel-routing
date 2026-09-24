# Phase 21 evidence — 24 September 2026

Started from clean HEAD `f790e49` (`phase 20`). No repository or ancestor AGENTS.md found. Runtime identifies GPT-6; exact picker model suffix/reasoning effort are unavailable. Requested `gpt-6-astra` / `xhigh`; consulted `phases/model-selection.md`, without claiming a picker change. Retained dependency pins. No subagents, UI changes, Engine setup/import, commit or publication.

Read master plan, current discovery/amendment map through D-112, phase README/status and assigned requirement rows; ERP handoff plan; real P08 service binding, P17 quantities, P18 retry dependencies, P19 held-work reads and P20 fences; canonical return operation inventory and tracking/consistency rules. Existing service-operation authority has `actorId:null`; arbitrary human delegation remains rejected. P21 adds explicit operator-granted return capabilities to that existing boundary.

Prerequisite: `npm run test:integration -- --maxWorkers=2 apps/api/test/integration/provisioning-actor.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts apps/api/test/integration/retry-deferral-urgency.test.ts apps/api/test/integration/workday-carryover.test.ts apps/api/test/integration/device-ownership.test.ts` — **5 files / 75 tests passed**, 97.14s. Real isolated PostgreSQL; issuer/Engine fixtures remain labelled. No missing prerequisite blocks this phase. Initial inspection tried nonexistent `src/b2b`/`src/intake` paths, then resolved the actual `src/b2b-intake` module; no change resulted.

Primary reference: [PostgreSQL 18 explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html). Receipt must share driver → workday → assignment → task guards, re-read compatibility after waiting, and append dependencies in the same transaction. P22 branch interruption/redispatch and P23 corrections remain later work.

Checkpoint results are recorded below after running each focused check and before expanding the next checkpoint.

## Checkpoint A — passed before B

Added additive migration 0019 with source/cycle/outcome/line-scoped request items, bounded monotone receipt/disposition counters, immutable request/transition history and a current-cycle custody view. Closed canonical request/group/item/receipt/disposition/confirmation/event schemas and generated types. Driver request/group/read/result and scoped native ERP pending/request reads use real source identity, explicit operator return grants and the P20 device fence. Requests reserve only offers; no receipt/dependency/collection/planning mutation. There is no business item-count quota (normal HTTP body/page bounds still apply).

`npm run contracts:generate` and `npm run typecheck -w @tawsel/api` passed. `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts` — **2 passed**, 4.11s. Tests exercise real API/PostgreSQL request/pending reads, duplicate suppression, held/waiting state, wrong-source and over-offer rejection, and direct SQL over-receipt/cross-branch FK failures. Actual receipt API acceptance remains B, not claimed by A's SQL check.

Initial generation failed on a misnamed VerifiedService reference; corrected. First migration run failed on an ambiguous USING join; corrected before any development DB application. One rejection fixture hit duplicate-key before its intended FK; changed it to another unoffered outcome so the wrong-branch invariant itself is tested. No unresolved dependency.

## Checkpoint B — passed before C

Implemented explicit native service receipt/disposition commands, per-item revision fencing, durable exact-action results, live grant/source/branch checks, immutable transitions, shared cycle balances, dependency facts and source-only event intent through the existing atomic kernel. Service/credential identity is audited; forged human context is rejected. Changed current held-piece progress/carry-forward to subtract committed receipt/loss/damage while preserving original outcome and collection history. Common customer execution guard rejects receipt dependencies. No staff delivery-result override or stock-availability field.

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts` — **8 passed**, 15.19s; API typecheck passed. Real API/PostgreSQL proves 3 offered → 2 received / 1 unresolved, duplicate and changed-payload behavior, independent second-item confirmation, source-branch denial despite multi-branch grants, over-receipt, loss/damage separated from receipt, actual partial delivery then return with conserved pieces/collection, and rollback at domain/progress/audit/outbox/result checkpoints. Every injected receiver failure returns 503 and retains the honest pending request. No unresolved dependency; independent-connection race and public consumer proof remain C.

## Checkpoint C — focused checks passed

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts` — **14 passed**, 25.95s. Separate PostgreSQL connections with observed `pg_blocking_pids` barriers cover receipt versus whole retry in both commit orders, stale receipt versus the new retry outcome in both orders, and duplicate subset confirmation. Exactly the compatible transition commits; current custody stays conserved even when an offer becomes superseded. B2C endpoint rejection and former-phone request evidence are real handler checks. No P23 correction producer is claimed.

`node --env-file=.env.database.local --import tsx scripts/return-demo.ts` — **PASS**. Real listening HTTP/disposable PostgreSQL and driver client offer three, wait through an actual API outage/restart, then a copied independent public-only consumer confirms two, recovers duplicates/results, rejects wrong-source/excess/stale submissions and records one separately lost. A claim for two confirms; a claim for three still waits. API restart retains quantities. The child receives only public URL, scoped service credential and request/report IDs; no DB/operator/issuer inputs or internal imports. Its report contains no credential. Parent fixture identity/bootstrap are explicitly labelled; local outbox inspection establishes intent only. Native ERP screens/outbox and signed transport remain P27/P25–26. Final full gates and review follow below.

## Review and final-check follow-through

Review added cross-tenant/same-tenant cross-source isolation, live grant revocation on replay/read, and upgrade of an actual retained P20 partial outcome. Receipt balances now have a composite outcome/cycle FK, not independent uncorrelated references. Superseded offers expose current cycle custody while retaining their original offered/unresolved history. OutcomeSnapshot gains additive explicit per-line custody; the public outcome conformance check validates it without mistaking historical outcome quantities for current held quantities.

`npm run test:integration -- --maxWorkers=2 apps/api/test/integration/partial-return-correction.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts apps/api/test/integration/retry-deferral-urgency.test.ts apps/api/test/integration/workday-carryover.test.ts` — **4 files / 64 tests passed**, 96.25s. A later real active-round intake of branch-B goods verified two distinct source groups and rejection of a mixed A/B offer: `npm run test:integration -- --maxWorkers=1 apps/api/test/integration/partial-return-correction.test.ts -t 'multi-branch'` — **1 passed / 16 deliberately skipped**, 6.61s.

The first full `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` found **1 failure / 701 passes**, 221.34s: an obsolete public-path allowlist lacked return routes. Corrected the allowlist while retaining the designed-operation exclusion. All domain integration tests passed in that run. A retained-response review also corrected compacted accepted receipt replay to return HTTP 200 with its immutable accepted receipt/summary rather than a misleading 202. Its initial retention fixture omitted outbox resolved_at and correctly hit the existing SQL check; the fixture now sets both fields and is explicitly not sender proof.

Other development failures: the first all-workspace typecheck found missing generic callback typing in the demo (fixed using PlanningAuthenticator and a locally typed Fastify instance); a temporary documentation writer had unescaped Markdown backticks (fixed before executing any documentation writes). No dependency version upgrade was needed. No external reviewer feedback was supplied; these are the agent's own inspection/test findings.

`npm run db:migrate` applied **0019_source_returns.sql** to the existing marked local application database. `npm run returns:demo` and `npm run test:erp:returns -- .local/phase-21-demo.json` passed again after the final read/schema/client changes. `python scripts/check-ui-spec.py check` passed **173 operations / 64 action rows**, **33 designed state cases**, **75 local links**, source hashes/contrast and six negative mutations. It is specification evidence, not UI interaction proof. `git -c core.safecrlf=false diff --check` passed; prior migrations 0001–0018, dependency lockfile and Engine/Stitch assets are unchanged.

## Final verification and stopping point

- `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` — **PASS: 31 files / 703 tests**, 217.52s. Includes all **18 Phase 21 tests** and the corrected compaction fixture. Audit **0 vulnerabilities**, ESLint, OpenAPI lint, generated drift checks, all workspace/script typechecks, shared/API/web production builds and production fixture isolation passed. The existing callback-only 302 OpenAPI warning and MapLibre bundle-size warning remain.
- `npm run contracts:generate` / `npm run contracts:check` — **PASS: 19 canonical schema files, 199 valid / 127 invalid examples, 173 operations**. Native commands/events and accurate reads have canonical references; P22/P23 operations remain designed. `npm run test:erp:returns` and the captured-report invocation passed. No schema/example ownership was moved into ERP docs.
- Local PostgreSQL **18.6**, Node **24.19.0**, npm **11.1.0**. Retained pins include pg **8.23.0**, Fastify **5.12.5**, TypeScript **6.0.2**, Vitest **5.0.1**, tsx **4.23.15**, Playwright **1.63.0** and Vite **8.3.0**. No new dependency or lockfile edit. A final local read found **zero disposable test databases and zero application B2B/B2C tasks, rounds or outcomes**. A repeated `npm run db:migrate` reports already current.
- New/updated guide link inspection: **5 documents, zero missing local targets**. Final whitespace check passed. No browser/UI interaction, physical phone, live Keycloak, live Engine, native ERP application or production deployment check was run; those are not required to substitute for this backend/public-consumer slice. Driver demo auth/bootstrap and retention transport-completion fixtures are explicitly labelled. A real ERP/native screen and its transactional source outbox are absent (P27), and signed event delivery/receiver processing are absent (P25–26), so no downstream applied/stock claim is made.
- **P22 may rely on:** migration 0019; source-only request/group/native pending APIs; per-item receipt/disposition revisions and immutable transition IDs; accurate current cycle custody and held progress/carry-forward; `retry_dependencies` produced atomically by actual transfers; `returns/state.ts` driver/common lock helper and validated claimed-subset predicate; canonical OpenAPI/types/client/examples; `partial-return-correction.test.ts` and `npm run returns:demo`. It must implement its own branch interruption/resume/new-cycle transaction and recheck actual claimed receipt under these locks. P23 still owns correction/adoption producer/races. This task stops at P21 with no commit, push, publication or next-phase execution.

## Changed paths

- TAWSEL-DISCOVERY-LOG.md
- apps/api/src/app.ts
- apps/api/src/closure/reads.ts
- apps/api/src/current/state.ts
- apps/api/src/outcomes/service.ts
- apps/api/src/provisioning/service.ts
- apps/api/src/returns/models.ts
- apps/api/src/returns/receiver.ts
- apps/api/src/returns/routes.ts
- apps/api/src/returns/service.ts
- apps/api/src/returns/state.ts
- apps/api/test/integration/database-lifecycle.test.ts
- apps/api/test/integration/device-ownership.test.ts
- apps/api/test/integration/partial-return-correction.test.ts
- apps/api/test/integration/planning-jobs.test.ts
- contracts/common.schema.json
- contracts/examples/README.md
- contracts/examples/invalid.json
- contracts/examples/valid.json
- contracts/openapi.yaml
- contracts/operations.json
- contracts/outcomes.schema.json
- contracts/provisioning.schema.json
- contracts/returns.schema.json
- db/migrations/0019_source_returns.sql
- docs/contract-coverage.md
- docs/erp/ERP-PLANNING-INPUT.md
- docs/erp/README.md
- docs/erp/consumer-quickstart.md
- docs/erp/field-and-status-mapping.md
- docs/implementation-status.md
- docs/integration-guide.md
- docs/phase-21-evidence.md
- docs/phases/README.md
- docs/phases/coverage-matrix.md
- docs/reference/public-contract.md
- docs/returns.md
- docs/tracking-and-consistency.md
- docs/ui-actions.md
- master-plan.md
- package.json
- packages/api-client/README.md
- packages/api-client/package.json
- packages/api-client/src/returns.ts
- packages/api-client/src/schema.d.ts
- packages/shared/test/fast/contract-foundation.test.ts
- scripts/check-ui-spec.py
- scripts/contracts.mjs
- scripts/return-demo.ts
- tests/erp-conformance/outcomes.ts
- tests/erp-conformance/returns.ts
