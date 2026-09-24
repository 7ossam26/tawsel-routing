# Phase 25 evidence — 24 September 2026

Starting HEAD `7f18ac4` (phase 24), clean working tree; no AGENTS.md found in the repository or parent chain. Read the master plan sections 10/12/14/17, current discovery amendments through D-112, phase README, decision map, R-45/46/47/49/64/65, implementation ledger, ERP handoff plan, integration guide, producer code and canonical feature event schemas. No Engine datasets, mounts, map imports or Stitch exports are involved.

Model: runtime identifies GPT-6; exact picker variant/reasoning setting is not exposed to this task. Requested `gpt-6-astra` / `xhigh` is recorded as requested, not falsely asserted as switched. Consulted the repository [model selection guide](phases/model-selection.md), which says prompt text does not switch the model and unavailable picker settings must not be inferred. No subagents or external reviewer used.

Prerequisites: initial five-file prerequisite run failed (85 failed / 22 skipped) because the dedicated PostgreSQL service was stopped. `npm run db:local:start` started the existing marked local cluster. The rerun passed **5 files / 107 tests**, 293.53s: command-transaction, provisioning-actor, outcome-progress-outbox, partial-return-correction, monitoring-snapshot. Initial shell used Node 25.2.1 / npm 11.6.2, outside the Node range; subsequent checks use bundled Node 24.19.0 by prepending `C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin` to PATH. Node 24 command-transaction separately passed **22 tests**, 9.05s. Logs under ignored `.local/phase-25-*`.

## Checkpoint A — passed before B

Migration 0024 adds transactional per-recipient aggregate sequences, historical intent backfill, retained delivery bytes, endpoints/signing-key storage, attempt records and lease-fenced completion. Sequence allocation occurs within the producer transaction through a trigger, including existing SQL-only plan producers. Account notifications stay out of the ERP delivery queue. Sender reconstructs only committed recipient-filtered payloads; no new business write is required. Receipt leaves source intent unresolved because projection is unknown.

Focused `outbox-sender.test.ts` first run: **1 passed / 2 failed**. Abrupt child-process claim/recovery passed; two fixtures used nonexistent `branch.upsert` and received a real 404. Fix fixture to use the actual canonical provisioning operation before continuing. API typecheck passed.

The additional Node 24 prerequisite rerun overlapped migration creation and exposed an expected migration-inventory mismatch in the P20-to-current upgrade assertion. Updated exact inventories in database-lifecycle, device-ownership and partial-return-correction to include 0024 and its five tables. This is test maintenance, not an earlier domain defect.

Another focused run encountered a stopped PostgreSQL process (ECONNREFUSED); restarted the same managed cluster, whose log records crash recovery. A subsequent run exposed an overly short 150 ms exclusivity-test lease; use the production 30-second lease for exclusivity and explicit database expiry fault injection for fencing. Actual timed expiry remains covered by the abrupt child-process test. Final A command: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/outbox-sender.test.ts` — **3 tests passed**. No unresolved prerequisite prevents B. Historical sequence order is established once by `(created_at,event_id)` within each recipient aggregate; later allocation is serialized transactionally. Event `committedAt` uses retained transaction write time visible only after commit, not an exact WAL commit timestamp.

## Checkpoint B — passed before C

Implemented HMAC-SHA256 over the exact stored/transmitted UTF-8 bytes and a scope/key/timestamp prefix; public verifier enforces a five-minute clock window. Each claim obtains a new millisecond timestamp. Separate operator-provisioned scoped keys are encrypted in the database; versioned public commands rotate by key ID, retaining overlap metadata and never accepting raw secrets into command history. HTTPS exact per-source destination approval, public-address checks, fresh DNS resolution with pinned connection, no redirects/proxies, bounded body/response and total HTTP deadline. Retry uses equal jitter with a five-minute cap; unresolved work stays retained. Canonical sender catalog references **27 actual integration event types** and their feature-owned payload schemas.

First B run: **3 passed / 7 failed**, because the new initial-configuration schema incorrectly required a positive expected revision. Corrected to allow zero only for initial creation. The first recovery-file run failed on the same validation error. Fixed run: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration --maxWorkers=2 apps/api/test/integration/outbox-sender.test.ts apps/api/test/integration/outbox-inbox-recovery.test.ts` — **2 files / 11 tests passed**, 28.68s. API typecheck passed. Checks include real loopback HTTP and independent DB lock acquisition during send; response loss; byte/ID retention and fresh rotated signatures; wrong secret/scope/changed bytes/stale timestamp; bounded timeout/redirect/invalid acknowledgement/503; private address and DNS rebinding policy rejection; a child process exiting after real HTTP receipt but before DB completion, followed by recovered redelivery.

Harness acknowledgement level: **controlled process-memory capture**, explicitly no durable receiver inbox, business projection or applied guarantee. The sender records only receiver-reported `received`; Phase 26 must establish durable receipt and atomic projection with separate storage. External production HTTPS/DNS/TLS deployment has not been exercised. No dependency blocks C.

## Checkpoint C — passed before final verification

Added scoped authenticated queue/count/oldest-pending reads, paged attempt history, retained aggregate replay, idempotent controlled retry, public client, API registration and standalone worker lifecycle. Live authorization is required for every operational read/mutation; explicit tenant/source predicate precedes pagination and counts. Operational status has an explicit `projectionStatus=unknown`; no applied state or purge is invented. Failed events block only their own aggregate; least-recently-served endpoint claims and bounded concurrent workers keep another recipient progressing. Logging contains correlation IDs, attempts, result and safe error codes, never URL/body/secrets.

Focused command: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/outbox-sender.test.ts apps/api/test/integration/outbox-inbox-recovery.test.ts` — **2 files / 13 tests passed**, 31.70s. New checks use real HTTP/public client for status, paged replay, duplicate retry, retained attempt pages and live revocation; both same-tenant other-source and other-tenant access are denied. An unavailable recipient with four blocked successors does not starve the healthy integration. Typecheck caught an overly broad fixture UUID parameter and unsupported `autoSelectFamily` option; corrected the parameter type and pinned `family` in the supported request options. API typecheck subsequently passed. No unresolved dependency prevents final docs/demo/gates.

## Final verification and review — passed

`npm run outbox:demo` — PASS: **19 unique events / 1 duplicate transmission**, nine actual event types including intake, received assignment, original outcome, correction, return request and subset receipt. All were committed before sender configuration. `npm run test:outbox` after adding this real domain/public consumer check and independent producer/consumer signature implementations — **2 files / 14 tests passed**, 35.61s. API production build passed; lint and all workspace/script typechecks passed. Canonical inventory is **24 schemas / 233 valid / 145 invalid examples / 184 operations**. Exact-byte vector uses a public zero test key and an Arabic task payload; no production secret is included.

Copied public checker, signature verifier/types and capture to `C:\Users\jo\AppData\Local\Temp\tawsel-p25-consumer-HemmUv`, with a minimal module package and Node/tsx runtime. Child environment removed Tawsel/database/operator variables; **exit 0**, same 19/1/unknown result. No server imports or DB access. `python scripts/check-ui-spec.py` initially rejected the newly promoted P25 operations because its phase allowlist ended at P24; extended only the six implemented operations and A44's detail read. Rerun passed original hashes, controls, all 184 operation mappings, links, contrasts and negative controls. No new UI/browser/device evidence is claimed.

Self-review: added a fresh active-lease recheck while holding the endpoint lock, because a discovery statement can carry an older snapshot across another claim's commit; retained independent worker exclusivity. Added the integration predicate needed to use the recipient stream partial index. Accepted configuration retries now recover their original scoped/hash-checked result without requiring current DNS/allowlist approval; new sends still recheck policy. Added explicit P24-data upgrade/backfill and policy-removal recovery tests. No external reviewer/subagent was used.

Local application inspection found the marked `tawsel_app_dev` schema was actually at 0008, despite older phase evidence describing 0023. A pre-migration inspection/backup attempt failed on the absent `rounds` table before producing a dump; the subsequent migration command still ran in that shell invocation. `npm run db:migrate` applied existing migrations **0009–0023 plus 0024**, and a repeat reported **already current**. This is a local prerequisite schema update, not a new implementation phase or production deployment. No pre-migration backup or restore rehearsal is claimed; final data counts are recorded below. Earlier prerequisite guarantees were established on real isolated freshly migrated PostgreSQL, not inferred from this local application's status.

The first full `npm run check` finished with **33 passing / 4 failing files, 824 passing / 7 failing tests**, 751.91s. Three contract assertions still described sender operations as unavailable; two planning upgrade assertions omitted migration 0024; the existing multi-step HTTP workday demonstration exceeded its 10-second budget under four-worker load; the new configuration-policy-removal test failed before the recovery fix was loaded. Updated the exact inventories/availability guards, gave only that multi-step demonstration 30 seconds with unchanged assertions, and verified configuration recovery independently (**1 passed / 13 unselected**, 3.92s). All failures remain in `.local/phase-25-check.log`; the fresh full rerun uses `.local/phase-25-check-final.log`.

Actual local PostgreSQL is **18.4**, not the 18.6 recorded by some earlier phases. Read-only inspection finds **24 applied migrations**, zero B2B tasks/rounds/outcomes, **27 existing pending intents and 27 pending delivery rows**, zero frozen bodies/endpoints/signing keys/attempts. No application event was sent and no live endpoint was installed. The isolated demo/test data is separate from these retained application intents.

Final gate command (PowerShell):

```powershell
$env:PATH='C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'
npm run check
```

The second default-four-worker run finished with **36 passing / 1 failing files, 830 passing / 1 failing tests**, 762.42s. All **16 sender/recovery tests** and the new signature vector passed. The only failure was the existing two-task outcome HTTP demonstration exceeding its 10-second budget (10.038s); gave that multi-step demonstration 30 seconds without changing assertions. To reduce local contention, the final equivalent gate sequence repeats audit, lint, contracts, types, the complete suite with two workers, and production builds:

```powershell
foreach ($step in @('audit','lint','contracts:lint','contracts:check','typecheck','test:ci','build')) {
  if ($step -eq 'test:ci') { npm run $step -- --maxWorkers=2 } else { npm run $step }
  if ($LASTEXITCODE -ne 0) { throw "Verification step failed: $step" }
}
```

Final log: `.local/phase-25-gates-final.log`. This is the same gate set as `npm run check`, with an explicit worker-count override; it is not a claim that the two earlier `npm run check` invocations passed. **Final sequence exited 0: all 37 files / 831 tests passed**, 827.36s, with zero skipped/failed tests. Audit reported **0 vulnerabilities**; ESLint, OpenAPI validation, canonical schema/example/generated-artifact checks, all workspace/script typechecks, shared/API/web production builds and production fixture isolation all passed. Existing redirect-only callback OpenAPI and MapLibre large-chunk warnings remain; Vite also printed informational plugin timings. Final runtime: **Node 24.19.0 / npm 11.6.2 / PostgreSQL 18.4**, with the existing pinned dependency lockfile retained.

`npm run outbox:worker:once` also passed a CLI startup/drain smoke check against the current local application schema with a temporary empty destination/key configuration. It exited **0**, sent nothing, and the temporary file was removed. Actual delivery remains evidenced by the real HTTP/process tests and demo. Repeated `python scripts/check-ui-spec.py` and `git diff --check` passed. Prior SQL migrations, dependency lockfile, Engine paths and original design exports remain unchanged.

Between completed runs, database inventory contained only the marked test-control database and inactive `tawsel_test_c14b51b674f643efb422785702a3ebc3` (zero sessions). Its task provenance was not established, so it was preserved; no claim of zero leftover test databases is made. The runs' newly created isolated databases were removed by their fixtures. The 27 application intents/deliveries remain pending with zero attempts/configured endpoints/keys.

Read-only inspection after the final successful run confirmed the same database inventory and application counts, recorded in `.local/phase-25-final-database.log`. No sender, receiver, new operator configuration or fixture endpoint is left running. The existing managed PostgreSQL cluster remains available. `git diff --check` passed after documentation closeout.

No UI/browser/physical-device changes were made. Production HTTPS/certificate/egress deployment, real ERP interoperability, production-volume migration/load/freshness benchmarks, owner review and backup/restore are unrun. Separate durable inbox/projection, receiver crash/replay proof and applied checkpoints remain Phase 26; no Phase 26 implementation, commit, push or publication is included.

## Acceptance evidence and next-phase boundary

| Required scenario | Observable evidence |
| --- | --- |
| Commit before sender exists; recover older intent | Actual domain demo commits before configuration; P24 migration test preserves original ID/payload/time and claims backfilled intent without a new command |
| Abrupt exit after claim | Child exits 91; timed lease expiry recovers the same ID/bytes, increments the attempt and records lease-expired |
| Exit after real receipt before completion | Child exits 92; database remains sending, restart redelivers identical bytes with a fresh timestamp; first receipt is never called applied |
| Independent worker safety | Independent concurrent claims yield one source lease; expired completion cannot overwrite its replacement; receiver acquires a database row lock while HTTP send is in flight |
| Lost response and rotated key | Controlled socket response loss leaves a retained failure; retry uses identical bytes/current key, overlap validates old key, expired overlap/wrong key/scope/body/time fail |
| Recipient fairness and ordering | Failed aggregate head retains successors while healthy source delivers; rollback consumes no sequence and hidden/account events do not enter recipient stream |
| Authorized network destination | Public command rejects unauthorized/internal URLs; resolver test rejects a mixed public/private rebinding answer; real HTTP proves bounded timeout, rejected redirect/ack and retained 503 |
| Scoped operations/replay | Public HTTP client reads queue/attempt pages, retries idempotently and replays sequences; same-tenant other-source, other-tenant and revoked credentials fail |
| Public integration proof | Copied verifier/checker consumes captured exact wire bytes and public queue results without server imports or database/operator variables; rejects changed bytes, missing sequence and applied claim |

Phase 26 may rely on `0024_outbox_delivery.sql`, `apps/api/src/outbox/`, `scripts/outbox-worker.ts`, the six published operations, `contracts/events/sender-event.v1.schema.json`, `contracts/outbox.schema.json`, the exact signing vector and public client/verifier. Extend the sender-side `outbox-inbox-recovery.test.ts` with a genuinely separate durable receiver, transactional deduplication/projection and applied/error checkpoints. The existing receiver's process-memory captures prove the sender boundary only.

## Changed paths

Complete tracked/new deliverable inventory (ignored local logs/helpers are excluded):

```text
.env.example
TAWSEL-DISCOVERY-LOG.md
apps/api/src/app.ts
apps/api/src/main.ts
apps/api/src/outbox/config.ts
apps/api/src/outbox/destination.ts
apps/api/src/outbox/envelope.ts
apps/api/src/outbox/queue.ts
apps/api/src/outbox/reads.ts
apps/api/src/outbox/routes.ts
apps/api/src/outbox/service.ts
apps/api/src/outbox/signature.ts
apps/api/src/outbox/transport.ts
apps/api/src/outbox/validation.ts
apps/api/src/outbox/worker.ts
apps/api/test/fast/outbox-protocol.test.ts
apps/api/test/integration/database-lifecycle.test.ts
apps/api/test/integration/device-ownership.test.ts
apps/api/test/integration/outbox-inbox-recovery.test.ts
apps/api/test/integration/outbox-sender.test.ts
apps/api/test/integration/outcome-progress-outbox.test.ts
apps/api/test/integration/partial-return-correction.test.ts
apps/api/test/integration/planning-jobs.test.ts
apps/api/test/integration/workday-carryover.test.ts
apps/api/test/support/crash-outbox-worker.ts
apps/api/test/support/outbox-fixture.ts
apps/api/test/support/outbox-receiver.ts
contracts/events/envelope.v1.schema.json
contracts/events/sender-event.v1.schema.json
contracts/examples/README.md
contracts/examples/invalid.json
contracts/examples/valid.json
contracts/examples/webhook-signature.v1.json
contracts/openapi.yaml
contracts/operations.json
contracts/outbox.schema.json
db/migrations/0024_outbox_delivery.sql
docs/contract-coverage.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/README.md
docs/erp/consumer-quickstart.md
docs/erp/field-and-status-mapping.md
docs/implementation-status.md
docs/integration-guide.md
docs/operations.md
docs/outbox-delivery.md
docs/phase-25-evidence.md
docs/phases/README.md
docs/phases/coverage-matrix.md
docs/reference/public-contract.md
docs/tracking-and-consistency.md
docs/ui-actions.md
master-plan.md
package.json
packages/api-client/README.md
packages/api-client/package.json
packages/api-client/src/outbox.ts
packages/api-client/src/schema.d.ts
packages/api-client/src/webhook-signature.ts
packages/shared/test/fast/contract-foundation.test.ts
scripts/check-ui-spec.py
scripts/contracts.mjs
scripts/outbox-demo.ts
scripts/outbox-worker.ts
tests/erp-conformance/outbox.ts
```
