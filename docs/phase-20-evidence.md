# Phase 20 evidence — 24 September 2026

Started from clean HEAD `fd6c09041b6a03f8986195856cc571c354e82a67` (`phase 19`). No repository or ancestor AGENTS.md found. Runtime identifies GPT-6; exact picker model suffix and reasoning effort are unavailable. Requested `gpt-6-astra` / `xhigh`; consulted `phases/model-selection.md`. No claimed picker change. Existing dependency pins are retained.

Read master-plan sections 6 and 10–11 plus relevant state/authority sections; current discovery decisions through D-112 and amendment map; phase README/status, R-27/R-38/R-40/R-65; P07/P15/P16/P19 session, start, current and closure artifacts, actual command kernel/retention, planning, locations, outcomes and eligibility; canonical operation/envelope/receipt contracts and 09-sync-conflicts/A25/A27 concepts. No UI change is planned: P30/P34 own the full takeover/review journey.

Prerequisite command: `npm run test:integration -- apps/api/test/integration/session-auth.test.ts apps/api/test/integration/round-start-http.test.ts apps/api/test/integration/start-assignment-race.test.ts apps/api/test/integration/current-activity.test.ts apps/api/test/integration/workday-carryover.test.ts` — **5 files / 69 tests passed**, 53.97s. Real isolated PostgreSQL, application HTTP/session tests with a signed issuer fixture; no physical-device/provider claim. No missing prerequisite blocks implementation.

Inspection finding: active planning and execution-pin writes need the same generation fence as current/outcome/eligibility/closure commands. This bounded prerequisite integration is included in B. Existing kernel already retains rejected envelopes, so P20 extends that durable evidence path without creating a competing action identity.

Primary reference for existing pinned PostgreSQL transaction/lock behavior: [PostgreSQL 18 explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html). No dependency upgrade or Engine setup/import is needed.

Checkpoint results will be appended after their focused checks and before expanding the next checkpoint.

## Checkpoint A — passed before B

Added closed takeover request/result schemas and optional snapshot token context; logical installation UUID stays separate from authenticated session/account authority. `Devices.takeover` scopes the immutable round owner to the current authenticated driver/account, acquires driver/workday guards, validates expected generation/open day/active round, records one immutable transition and increments generation. The kernel retains exact retry results; takeover results require a subsequent snapshot and never expose its opaque token. Migration 0017 rejects unrecorded/backward/closed transitions without altering the original baseline.

`npm run contracts:generate` passed (18 schemas, existing 172 valid/115 invalid examples, 167 operations; endpoint/catalog promotion follows actual HTTP verification). `npm run test:integration -- apps/api/test/integration/device-ownership.test.ts -t 'A:'` — **3 passed**, 7.17s. Independent PostgreSQL connections and observed database blocking cover duplicate/lost responses and competing devices. Four transaction faults preserve the original owner; forged/other-account requests and unrecorded SQL transitions fail. No unresolved prerequisite; HTTP adapter and mandatory snapshot fence are still B/C work at this checkpoint.

## Checkpoint B — passed before C

Shared locked fence applied to all current/origin, outcome, retry/defer/activate/urgency, round/day closure, active planning and active pin writers. A takeover generation requires the token delivered with a fresh locked current snapshot; context and takeover results omit it. Former commands become durable review evidence without progress/current/quantity/collection/planning/closure mutation. Evidence-only ingress accepts the original exact envelope, never executes it, and distinguishes a duplicate submission from its immutable business result. Unknown/nonformer generation is rejected evidence. Existing session/CSRF/account guards protect the HTTP adapters; scoped result lookup reauthorizes retained round resources.

`npm run typecheck -w @tawsel/api` passed after fixing a union callback inference and a test context narrowing error. First expanded focused run: 3/6 failed (missing transitive b2b schema registration and malformed arrival test fixture); both fixed. `npm run test:integration -- apps/api/test/integration/device-ownership.test.ts` — **6 passed**, 28.22s with regression tests running concurrently. Tests prove required download, new-owner arrival/outcome acceptance, old timestamps unable to overwrite, every execution family fenced, exact envelope retention, duplicate versus receipt, idempotency conflict and evidence/audit/result fault rollback. Broader regression is in progress; recovery constraints/adoption contract remain C, with no adoption handler claimed.

## Checkpoint C — focused checks passed

Added scoped context/snapshot/status/evidence APIs and current recovery metadata. Original closed-day and dependent receipt/redispatch/disposal constraints remain hard blockers. Evidence stays queryable with original timestamps/envelope and its unchanged receipt; current account/driver/branch authorization is rechecked. The canonical adoption command is **designed only**, with receipt/revision/generation expectations and no P20 route. `adoptionImplemented:false` and `requires-validation` never grant permission to apply it. P23 must validate/rebuild corrections atomically; P33–35 own persistent browser queues and safe logout UX.

`npm run test:integration -- --maxWorkers=1 apps/api/test/integration/device-ownership.test.ts` — **13 passed**, 35.06s. Includes independent takeover versus outcome/day-close in both commit orders; closed-day timestamps cannot reopen; labelled future receipt dependency; durable evidence through compaction; revoked/cross-account and hidden-branch isolation; real two-session HTTP/client/CSRF, deliberately discarded committed takeover response, API restart, snapshot download and old evidence receipt. Signed OIDC issuer is a fixture, sessions and PostgreSQL are real. No browser/device claim.

Expanded C initially failed 2/12 tests and the HTTP demo because recovery queried assignment_revision on a view that does not own it. Fixed by joining the original dispatch cycle. `node --env-file=.env.database.local --import tsx scripts/device-demo.ts` now passes and writes `.local/phase-20-demo.json`.

Regression first run: 87 passed / 8 failed, including fixtures using a random device ID for each action and worker waits that therefore never received a planning job; one DB cleanup hook also timed out under load. Fixed both personal/company fixture constructors to retain a logical installation, without weakening existing assertions. `npm run test:integration -- --maxWorkers=2 apps/api/test/integration/current-activity.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts apps/api/test/integration/retry-deferral-urgency.test.ts apps/api/test/integration/workday-carryover.test.ts apps/api/test/integration/planning-publication.test.ts` — **5 files / 95 passed**, 139.01s. Final gates and canonical/example handoff follow.

## Review and full-check follow-through

Review added an actual retained P19-round migration check and a metadata isolation check: rejected caller IDs without a matching round/task/attempt admission must never probe source revisions, outcomes or dependencies. The focused suite passed **15 tests**, 75.78s while a full check ran. The first full check found **5 failures / 656 passes**: obsolete endpoint allowlist, migration-list/table inventories, and the new isolation test against the pre-fix module loaded earlier by that run. Inventories and isolation were fixed. A following check stopped at lint (`no-unsafe-finally` in the safe temporary-directory cleanup guard); cleanup validation moved to a helper. A temporary documentation script also had an unescaped template-string delimiter; fixed without changing implementation. Ledger paragraph replacement on CRLF input was repaired from the original clean HEAD, preserving all historical entries; changed Markdown was normalized and `git diff --check` passed.

`$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` then **passed 30 files / 661 tests**, 185.27s, audit 0 vulnerabilities, lint, canonical contracts, typechecks, production builds and fixture isolation. Existing callback-302 OpenAPI and MapLibre chunk warnings remain. This was before the final canonical-event follow-through below, so final kernel/event verification is recorded separately.

Canonical review found P20-owned `device.executionTransferred` / `evidence.received` notification producers still designed. Added account-recipient durable intents: transfer joins its accepted ownership transaction, evidence notification is written only after the rejected domain savepoint rolls back. The kernel's rejection type permits only evidence.received, with a runtime guard against business events. No transport, ERP business mutation or external message is sent. Tests cover duplicate suppression, submitting-account recipient isolation, every outcome variant and faults after outbox insertion. Original schemas for notification payloads are closed; P25/P30/P34 own delivery/consumption.

`npm run db:migrate` applied **0017_device_takeover.sql** to the existing marked local development database. Earlier migration files, dependency pins/lockfile, Engine datasets/mounts and original Stitch exports are unchanged.

Notification follow-through initially failed on the existing integration-only recipient FK (16 device failures, all 22 kernel checks passed). Added separate additive migration **0018_account_evidence_notifications.sql**, retaining that composite tenant/kind FK and narrowly allowing account recipients only for the two P20 notification types and only when recipient equals command source. Kernel intents explicitly distinguish integration/account recipients. The next run found one malformed partial-outcome fixture (missing reportedCollection); fixed. `npm run test:integration -- --maxWorkers=2 apps/api/test/integration/device-ownership.test.ts apps/api/test/integration/command-transaction.test.ts` — **2 files / 38 tests passed**, 24.91s, comprising 16 device cases and 22 kernel cases. Account notification restrictions are checked by real database failures, not mocks. Migration 0017 was not edited after local application.

## Final verification and handoff

- `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` — **PASS, 30 files / 665 tests**, 176.43s. Audit **0 vulnerabilities**, lint, OpenAPI lint, generated contract drift checks, all typechecks, shared/API/web production builds and fixture isolation passed. The existing redirect-only callback-302 OpenAPI warning and MapLibre chunk-size warning remain; neither is a newly introduced failure.
- `npm run contracts:generate`, `npm run test:erp:devices`, `npm run test:erp:devices -- .local/phase-20-demo.json` — **PASS**. Final canonical inventory: **18 schema files / 185 valid / 121 invalid examples / 168 operations**. Captured examples include one transfer and two evidence account-notification payloads. Designed adoption remains explicitly separate from verified APIs.
- `npm run db:migrate` — **PASS**, additive 0017 and 0018 applied to the existing marked local application database. Final read-only database inventory: **zero disposable test databases**, **zero B2C/B2B tasks, rounds, outcomes or takeovers** in the development application database. The initial ad-hoc inventory query used nonexistent generic task/outcome table names and failed; corrected to the actual B2C/B2B/delivery tables before reporting these counts.
- `npm run devices:demo` followed by `npm run test:erp:devices -- .local/phase-20-demo.json` — **PASS**, rerun after final notification assertions. The report is reproducible at `.local/phase-20-demo.json`; no generated fixture rows remain in the application database. This is real application-session/HTTP/PostgreSQL/API-restart evidence using a signed issuer fixture, not browser or physical-phone evidence.
- `python scripts/check-ui-spec.py check` — **PASS**: all **168 operations / 64 action rows**, **33 designed state cases**, **75 local links**, original source hashes, token contrast and six negative mutations. Initial final-doc check caught the new snapshot operation absent from A25's structured row and an obsolete verified-phase allowlist; corrected both, keeping adoption outside the verified allowlist. These are specification checks, not new usability evidence.
- `git -c core.safecrlf=false diff --check` — **PASS**. Existing migrations 0001–0016, dependency lockfile, Engine datasets/mounts and original Stitch exports are unchanged. No map import, new dependency, commit, push, publication or Phase 21 execution.

Observed runtime: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.6**. Retained package pins: pg **8.23.0**, Fastify **5.12.5**, TypeScript **6.0.2**, Vitest **5.0.1**, Playwright **1.63.0**, Vite **8.3.0**. No external reviewer feedback was supplied; the review findings and fixes above are this agent's inspection and verification.

Remaining limits: P23 implements bounded adoption/correction; P21/P22 implement actual receipt/dependency producers (current dependency tests explicitly seed those future facts); P25 supplies notification transport; P30/P33–35 supply takeover/review UI, persistent browser queues, replay and safe logout. No new browser interaction, physical-phone, live Keycloak, live Engine or real ERP test was run for this phase. Logical device IDs are not hardware attestation. Expired/revoked sessions must reauthenticate; restricted evidence-only revoked-account upload remains later work. Durable evidence receipt does not itself apply business state or unlock an unpersisted local queue.

Phase 21 may rely on additive migrations **0017–0018** and retained **0012–0016**, the shared `devices/fence.ts` owner/snapshot guard, `Devices` context/status/evidence service, canonical device schema/OpenAPI/client, immutable round/attempt/source IDs, account-scoped retained receipts and tested `retry_dependencies` blocker hook. Its receipt writer must share driver → workday → assignment → task guards and record dependency facts in the receipt transaction. The exact public sequence and reproducible commands are in [device-ownership.md](device-ownership.md). Phase 21 was not started.

## Changed paths

- TAWSEL-DISCOVERY-LOG.md
- apps/api/src/app.ts
- apps/api/src/closure/service.ts
- apps/api/src/commands/kernel.ts
- apps/api/src/current/service.ts
- apps/api/src/devices/fence.ts
- apps/api/src/devices/models.ts
- apps/api/src/devices/routes.ts
- apps/api/src/devices/service.ts
- apps/api/src/devices/state.ts
- apps/api/src/eligibility/service.ts
- apps/api/src/locations/service.ts
- apps/api/src/outcomes/service.ts
- apps/api/src/planning/service.ts
- apps/api/test/integration/database-lifecycle.test.ts
- apps/api/test/integration/device-ownership.test.ts
- apps/api/test/integration/planning-jobs.test.ts
- apps/api/test/support/device-demo.ts
- apps/api/test/support/planning-company-fixture.ts
- apps/api/test/support/planning-fixture.ts
- contracts/action-result.v1.schema.json
- contracts/common.schema.json
- contracts/device-ownership.schema.json
- contracts/examples/README.md
- contracts/examples/invalid.json
- contracts/examples/valid.json
- contracts/openapi.yaml
- contracts/operations.json
- db/migrations/0017_device_takeover.sql
- db/migrations/0018_account_evidence_notifications.sql
- docs/contract-coverage.md
- docs/current-activity.md
- docs/device-ownership.md
- docs/erp/ERP-PLANNING-INPUT.md
- docs/erp/consumer-quickstart.md
- docs/erp/field-and-status-mapping.md
- docs/implementation-status.md
- docs/phase-20-evidence.md
- docs/phases/README.md
- docs/phases/coverage-matrix.md
- docs/reference/public-contract.md
- docs/round-start.md
- docs/tracking-and-consistency.md
- docs/ui-actions.md
- master-plan.md
- package.json
- packages/api-client/README.md
- packages/api-client/package.json
- packages/api-client/src/devices.ts
- packages/api-client/src/schema.d.ts
- packages/shared/test/fast/contract-foundation.test.ts
- scripts/check-ui-spec.py
- scripts/contracts.mjs
- scripts/device-demo.ts
- tests/erp-conformance/devices.ts
