# Phase 26 evidence — 24 September 2026

Starting HEAD `ebe83e0f90fac7f4f1d48e0a1b86e446383b3827` (phase 25); clean working tree. No AGENTS.md found in repository or parent chain. Read master-plan section 12 and acceptance H/L, discovery amendments through D-112, phase/decision/requirement maps, implementation ledger, ERP handoff plan and actual P02/P08/P25 schemas, authorization, sender, replay and tests. Engine data and Stitch exports are outside this change.

Runtime identifies GPT-6; the exact picker variant/reasoning is not exposed. Requested `gpt-6-astra` / `xhigh` is recorded as requested, not asserted as switched. Consulted the local model-selection guide. No subagents or external reviewer.

Prerequisite command (Node bin prepended to PATH): `npm run db:local:start`; `npm run build -w @tawsel/shared`; `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=2 packages/shared/test/fast/contract-foundation.test.ts apps/api/test/integration/provisioning-actor.test.ts apps/api/test/integration/outbox-sender.test.ts apps/api/test/integration/outbox-inbox-recovery.test.ts`. **4 files / 418 tests passed**, 64.66s. Log `.local/phase-26-prerequisites.log`. Node **24.19.0**, npm **11.6.2**, PostgreSQL **18.4**. Existing dependency pins retained. No prerequisite repair needed.

Implementation references: [Fastify exact-buffer parsers](https://fastify.dev/docs/latest/Reference/ContentTypeParser/), [PostgreSQL transaction locks](https://www.postgresql.org/docs/18/explicit-locking.html), [node-postgres transactions](https://node-postgres.com/features/transactions). Provider fixtures and fault injection will be labelled separately from real HTTP/process/database evidence.

## Checkpoint A — passed before B

Added `apps/mock-erp`, independent migration 0001 and restricted-role setup, public client build/schema validator, exact-byte signed receipt and mismatch audit. The receiver receives only its own database URL, public configuration and sanitized OS environment in process tests. A separate role cannot SELECT Tawsel outbox tables (`42501`). Same-event concurrent requests create one inbox row; changed bytes are durably rejected. Unsupported schemas, wrong recipient/aggregate identity and stale signatures leave no receipt.

Focused command: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/mock-erp/test/integration/receiver.test.ts` — **3 tests passed**, 17.38s; `.local/phase-26-a.log`. Actual child exits before inbox commit leave zero rows/no acknowledgement; exits after commit retain one row/no response, and restart deduplicates it. Typecheck passed after correcting a missing brace in the process harness. Initial npm invocation selected the system Node 25 wrapper despite PATH's Node 24; install only emitted engine warnings, 0 vulnerabilities. Subsequent verification invokes Node 24 directly (including npm's CLI). No unresolved dependency prevents B.

## Checkpoint B — passed before C

Added the public reference projection mapping, atomic local worker, append-only received transition history and authenticated consumer status. Distinct checkpoints expose contiguous received/applied sequences, projection/snapshot watermarks, pending errors and timestamps. Cross-stream return requests wait for their outcome dependency. A snapshot never inserts transition history.

Focused command: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/mock-erp/test/integration/receiver.test.ts` — **7 tests passed**, 39.89s; `.local/phase-26-b.log`. Public-client and receiver typechecks passed after narrowing validated notice events to SenderEvent. SQL failure after projection write rolls back state and marker, retry/independent workers apply once. Actual process exits before/after projection commit preserve atomicity. Real P25 domain/signed-HTTP captures replay into the separate receiver: effective corrected delivery **2 pieces**, reported collection **25000 minor units**, actual branch receipt **1 piece**; all **19** unique transitions are applied once. The initial source identity/provider preparation is a fixture, with real commands/SQL/HTTP; this check is not yet the packaged two-process conformance run. No unresolved dependency prevents C.

## Checkpoint C — passed before final gates

Implemented migration 0025, scoped authoritative published-state checkpoint/cache, truthful 410 for genuinely missing retained history, authenticated monotonic consumer reports, bounded public-only replay/reconciliation, persistent report command identity and a portable URL/credential-configured conformance checker. No sender purge policy changed. Older replacement snapshots do not regress current state; late required transitions still create real history/markers without double-counting snapshot-covered quantities.

Focused C command: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=2 --project integration apps/mock-erp/test/integration/receiver.test.ts apps/mock-erp/test/integration/recovery.test.ts apps/api/test/integration/outbox-inbox-recovery.test.ts` — **3 files / 13 tests passed**, 67.41s; `.local/phase-26-c.log`. Includes actual sender child exit after durable external inbox commit, receiver restart, expired sender lease and exactly one projection; projection failure after corrected quantities; cross-stream dependency buffering; source isolation; report response-loss retry; changed-payload/stale-signature rejection; real gap replay; snapshot recovery with explicit missing history and later historical completion.

The first retention-loss test failed because P25's immutable-row trigger correctly refused deletion. The corrected test uses a transaction-local `session_replication_role=replica` **only in its disposable database** to inject lost retained payloads after caching a checkpoint. It does not add a purge feature. Rerun: **2 tests passed**, 15.19s (`.local/phase-26-c-recovery.log`). Without a retained checkpoint the same missing history yields 503, never invented success. The earlier separate-process check passed 3 tests/25.93s before the additional abrupt sender test.

`node <system-npm>/bin/npm-cli.js run receiver:package` under Node 24 built `dist/erp-reference`. Copied that distribution alone to `C:\Users\jo\AppData\Local\Temp\tawsel-p26-consumer-fb856fc759b646018ef9eeccfb3deb93`; independent `npm install --ignore-scripts` installed 65 packages, audit 0 vulnerabilities. Import probes for `@tawsel/api` and `@tawsel/shared` fail with `ERR_MODULE_NOT_FOUND`. Ran the compiled receiver, separate compiled worker and copied conformance checker from that directory, with only public config/own DB in the consumer and no DB/operator credential in the checker. The actual sender/API remain in separate processes. **PASS:** 19 unique events, 10 negative checks, 2 delivered pieces, 25000 reported minor units, 1 received piece, both services restarted, `lease-expired,received` sender attempts and 5 separately applied reports. `.local/phase-26-standalone.log` and `.local/phase-26-demo.json`. The latter contains fixture snapshots/reports/history, no credentials.

Public definitions/types/examples/operation coverage are updated: 25 schemas, 245 valid/148 invalid examples, 185 operations. Captured checkpoint examples come from the standalone run; the report command and invalid cases are schema fixtures. OpenAPI lint passed with the existing redirect-only callback warning. UI specification/hash/mapping negative checks passed; no UI or browser/device work is claimed. No unresolved dependency prevents the final regression gates.

## Final review and gates — passed

Self-review strengthened nested source/version/correlation identity validation, required a receiver role without memberships and validated optional key lifetime values. Receiver transactions explicitly use synchronous commit and bounded SQL/lock waits. Exact migration inventories were extended for 0025, preserving previous migration SQL. The P25 business demo's setup was extracted for reuse without changing its behavior; source setup remains a labelled harness, not native ERP source functionality.

The first gate sequence stopped at the web typecheck: existing `/src/current` and `/src/rounds` package imports needed compatible compiled export aliases. Added `/src/*` aliases without changing UI behavior. The next stopped at a recovery fixture's broad string tenant ID; used the fixture's actual UUID-typed ID. Both were compile/packaging findings, not transaction failures. The first full suite then exposed three stale Phase 25 contract assertions (P26 availability, the chosen future-operation negative control and the generated-reference sentence). Updated only those explicit expectations; the focused contract file passed **406 tests**, 13.50s. Logs: `.local/phase-26-gates.log`, `phase-26-gates-final.log`, `phase-26-gates-complete.log`, `phase-26-contract-final.log`.

Added a public-boundary regression that parses every runtime source import and checks the restricted dependency manifest; internal package, relative escape and computed-import negative fixtures are rejected. Its first run used the wrong relative package manifest path (ENOENT); corrected run passed **1 test**, 1.38s. Recursive directory reads subsequently needed an explicit UTF-8 encoding for the Node type overload; receiver typecheck and focused lint then passed. This supplements, rather than substitutes for, actual standalone installation and restricted-role SQL evidence. A nested source-identity rejection is now included in the real callback test. No external reviewer was used.

The first full test invocation completed with **38 passing files, 854 passing tests and only the 3 already-corrected contract assertions failing**, 865.67s. No database, sender or receiver test failed in that run. The final complete gate rerun includes the added boundary test and all fixes: **40 files / 858 tests passed**, 913.53s, with two workers. Audit returned **0 vulnerabilities**; lint, OpenAPI, canonical/generated contract checks, all typechecks and all production builds passed. Production fixture isolation passed. The existing redirect-only OpenAPI warning and MapLibre chunk-size warning remain nonblocking. Log: `.local/phase-26-verified.log`.

Final gate sequence under Node 24.19.0: invoke `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` with `run audit`, `run lint`, `run contracts:lint`, `run contracts:check`, `run typecheck`, `run test:ci -- --maxWorkers=2`, then `run build`, stopping on any nonzero exit. `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001` selects the established local build configuration. These are the complete `npm run check` gates with explicitly bounded test workers. Final canonical counts: **25 schemas / 245 valid examples / 148 invalid examples / 185 operations**. `python scripts/check-ui-spec.py` and `git diff --check` passed; UI verification log: `.local/phase-26-ui-spec-final.log`.

The standalone installation was refreshed after runtime/identity/config/export changes and its independent HTTP demo passed again with the same 19-event, 10-negative-check, 2-piece/25000-minor/1-return-piece, five-report results and both restarts. Log: `.local/phase-26-standalone-final.log`. The distribution's quickstart/protocol/evidence references were included in the bundle; its packaging script passed focused lint. Final evidence-only document edits were recopied after the gates; they did not change the tested runtime.

Read-only cleanup inspection after the final suite found **no mock_erp databases or roles and no phase test/receiver/sender child processes**. The unrelated pre-existing inactive `tawsel_test_c14b51b674f643efb422785702a3ebc3` database was preserved. The existing local application database still has **24 migrations**, latest `0024_outbox_delivery.sql`, 27 pending intents, zero delivery attempts and zero endpoints; this phase did not migrate or populate it. All P26 migration/transaction proof used disposable real databases. No commit, push, publication or Phase 27 execution.

## Exact Phase 27 handoff

Phase 27 may rely on `apps/mock-erp/src/{app,inbox,projection,recovery,database}.ts`, independent receiver migrations `0001_receiver.sql`/`0002_checkpoint_reports.sql`, Tawsel `0025_consumer_checkpoints.sql` and `apps/api/src/outbox/reconciliation.ts` plus the existing P25 sender. Public compatibility is `contracts/consumer.schema.json`, the P25 sender catalog/feature schemas, generated `packages/api-client/src/schema.d.ts` and compiled `packages/api-client/dist` version 0.1.0. The buildable independent distribution is `dist/erp-reference`; its conformance entry is `conformance/receiver.mjs`, owned by `tests/erp-conformance/receiver.ts`.

Verified observations are durable receipt, separate processed status, local atomic quantities/collection/history, duplicate/mismatch handling, cross-stream dependencies, replay/gap/retention recovery, both sides' restart and actual public HTTP reporting. The reference stores execution facts and effective reports, not accounting. Phase 27 still must implement native source provisioning/assignments/return forms and its business-command outbox. It is not executed here. Production TLS/egress, actual vendor ERP compatibility, owner/browser/device review, freshness/load benchmarks, sender purge/snapshot scheduling and backup/restore remain unverified or outside scope. Default retention is indefinite. Current checkpoints cannot reconstruct unavailable historical transitions.

## Changed paths

Tracked/new deliverables; ignored logs, generated dist and disposable standalone installations are excluded. Previous SQL migrations, Engine data and original Stitch exports are unchanged.

```text
TAWSEL-DISCOVERY-LOG.md
apps/api/src/outbox/reads.ts
apps/api/src/outbox/reconciliation.ts
apps/api/src/outbox/routes.ts
apps/api/src/outbox/service.ts
apps/api/test/integration/database-lifecycle.test.ts
apps/api/test/integration/device-ownership.test.ts
apps/api/test/integration/outbox-inbox-recovery.test.ts
apps/api/test/integration/outbox-sender.test.ts
apps/api/test/integration/partial-return-correction.test.ts
apps/api/test/integration/planning-jobs.test.ts
apps/api/test/support/receiver-harness.ts
apps/api/test/support/receiver-sender-process.ts
apps/mock-erp/README.md
apps/mock-erp/config.example.json
apps/mock-erp/migrations/0001_receiver.sql
apps/mock-erp/migrations/0002_checkpoint_reports.sql
apps/mock-erp/package.json
apps/mock-erp/src/app.ts
apps/mock-erp/src/config.ts
apps/mock-erp/src/database.ts
apps/mock-erp/src/inbox.ts
apps/mock-erp/src/main.ts
apps/mock-erp/src/projection.ts
apps/mock-erp/src/recovery.ts
apps/mock-erp/test/fast/boundary.test.ts
apps/mock-erp/test/integration/receiver.test.ts
apps/mock-erp/test/integration/recovery.test.ts
apps/mock-erp/test/support/crash-receiver.ts
apps/mock-erp/test/support/process.ts
apps/mock-erp/tsconfig.build.json
apps/mock-erp/tsconfig.json
contracts/consumer.schema.json
contracts/examples/README.md
contracts/examples/invalid.json
contracts/examples/valid.json
contracts/openapi.yaml
contracts/operations.json
db/migrations/0025_consumer_checkpoints.sql
docs/contract-coverage.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/README.md
docs/erp/consumer-quickstart.md
docs/erp/field-and-status-mapping.md
docs/erp/receiver-protocol.md
docs/implementation-status.md
docs/integration-guide.md
docs/operations.md
docs/outbox-delivery.md
docs/phase-26-evidence.md
docs/phases/README.md
docs/phases/coverage-matrix.md
docs/planning/erp-handoff-deliverables.md
docs/reference/public-contract.md
docs/tracking-and-consistency.md
docs/ui-actions.md
docs/verification/integration.md
master-plan.md
package-lock.json
package.json
packages/api-client/README.md
packages/api-client/package.json
packages/api-client/src/outbox.ts
packages/api-client/src/projection.ts
packages/api-client/src/schema.d.ts
packages/api-client/src/validation.ts
packages/api-client/tsconfig.build.json
packages/shared/test/fast/contract-foundation.test.ts
scripts/build-public-client.mjs
scripts/build-receiver-bundle.mjs
scripts/check-ui-spec.py
scripts/contracts.mjs
scripts/mock-erp-database.ts
scripts/outbox-demo.ts
scripts/receiver-demo.ts
tests/erp-conformance/receiver.ts
```
