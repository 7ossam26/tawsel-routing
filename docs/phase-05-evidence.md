# Phase 05 evidence — PostgreSQL command foundation

Date: 22 September 2026. Starting HEAD: `cbf1452c07b355887f346594ebe12c82637cf1c1` (`phase 4`); working tree initially clean. No repository/ancestor AGENTS.md was found. Read current phase/decision/coverage maps, master plan §§5/7/10–12/17–18, consistency/common action/error/event definitions, P01/P02/P04 artifacts and Engine Compose mounts.

Model evidence: this session identifies the agent as GPT-6. The exact Codex picker model suffix and reasoning setting are not exposed to the agent; `gpt-6-astra / xhigh` is the supplied recommendation, not a verified setting. Consulted `docs/phases/model-selection.md`; no setting change is claimed.

## Prerequisites

- Initial `npm run test:ci`: 4 files / 127 tests passed, host-default Node 25.2.1/npm 11.6.2 (exploratory, outside the project's Node range). `npm run contracts:check`: 4 canonical schemas, 95 examples, 147 operations passed.
- Bundled Node 24.19.0 and local tooling npm 11.1.0 selected for subsequent acceptance runs. Initial npm install still resolved host npm's adjacent Node 25; fixed by a workspace-ignored npm shim installation plus explicit PATH. Exact new dependencies: pg 8.23.0, @types/pg 8.23.1; native PostgreSQL 18.4.
- Browser prerequisite initially blocked by an existing listener on 5173. Small harness repair: optional `TAWSEL_BROWSER_PORT`; no unrelated process stopped.
- P04 owner review is still pending; no UI pattern is being expanded in P05. P01/P02 real code is available; business HTTP/authentication remains future work.

## Checkpoint A — database lifecycle

Implemented dedicated local PostgreSQL 18 cluster/configuration, strict URL/name/owner/purpose/version guards, single checksummed SQL migration runner, bounded single-connection transaction helper and API pool startup/shutdown. Only scoped key, command identity, audit/evidence and outbound intent foundations are migrated. Local data and generated credentials are ignored; no Engine Compose/mount change.

Focused checks on actual PostgreSQL 18.4, Node 24.19.0/npm 11.1.0:

- `npm run test:database`: **PASS**, `database-lifecycle.test.ts`, 4 tests. Fresh migration, concurrent migration runners, idempotent rerun, checksum drift rejection, unexpected name/URL/marker rejection, nonempty target refusal, rollback and reusable connection verified.
- `npm run typecheck -w @tawsel/api`: **PASS**.
- `npm run db:migrate`: applies `0001_command_foundation.sql` to the separate `tawsel_app_dev` database.
- First database test ran before startup finished and correctly failed on missing configuration. Windows `Start-Process -Wait` also waited for detached PostgreSQL descendants; fixed to wait on the pg_ctl process handle only. Rerun is the passing result above.

Remaining dependency: trusted scope/authentication and real domain tables belong to P06 onward. No HTTP business result route is exposed without those checks. Native test harness requires a marked loopback control database and creates/drops only a UUID-named database it owns; no outer rollback transaction hides commits.

## Checkpoint B — command transaction

Added authenticated-source-scoped PostgreSQL acquisition (`INSERT ON CONFLICT` then `SELECT FOR UPDATE`), hash-v1 semantic JSON fingerprint, stable result read/replay, explicit invariant guard ordering, feature domain/progress hooks, audit, distinct rejection evidence, outbound intent and response retention primitive. Rejected decisions roll back tentative domain writes to a savepoint before recording their evidence. A deferred constraint refuses a committed acquisition without a finalized result. Added canonical ActionResult schema/generated type; HTTP `action.getResult` remains honestly designed until authenticated bindings exist.

Before recovery-test expansion: `npm run test:database` **PASS**, 2 files / 15 tests (11 command + 4 lifecycle). Every accepted write checkpoint (identity, domain, progress, audit, outbox, result) was faulted against PostgreSQL; zero partial rows remained and the same ID could subsequently succeed. Rejected evidence failure also rolls back. Same-result duplicate, object-key reordering, changed payload/operation/revision/actor conflict, tenant/source isolation and retained rejection passed. `npm run typecheck -w @tawsel/api` and `npm run lint`: **PASS**.

The initial result-schema draft failed strict Ajv nested-object validation; fixed the canonical schema and regenerated types. A generated receipt type then exposed the pending-versus-finalized distinction; narrowed the kernel receipt to the final result type and passed typecheck. These failed drafts are not acceptance results.

Prerequisite completion: `$env:TAWSEL_BROWSER_PORT='5185'; npm run test:browser:ui` **PASS**, all 6 P04 Chromium tests. The first alternate-port run found a hardcoded origin in the network-isolation assertion; fixed to compare the actual page origin, then reran. No UI behavior changed or owner review claimed.

Remaining dependency: feature callbacks must enforce their own lifecycle, revisions, permissions and required event content; generic synthetic counters prove transaction mechanics only. No sender or authentication implementation added.

## Checkpoint C — recovery tests

Before final hardening/documentation: `npm run test:database` **PASS**, 2 files / 23 tests (19 command + 4 lifecycle), PostgreSQL 18.4 / Node 24.19.0 / npm 11.1.0; API typecheck **PASS**.

Independent pools/connections exercise commit, rollback and changed-payload races. Deferred JavaScript barriers hold the winner before COMMIT; an observer verifies `pg_blocking_pids(waiter)` contains the winner, then verifies zero uncommitted rows are visible. Only then does the test release the transaction. This is not timing-sleep-only evidence. Actual child Node processes are terminated with SIGKILL at IPC barriers immediately before commit and after commit/before any business response. A fresh pool recovers committed results without invoking the domain hook; precommit termination permits exactly one subsequent change.

Compaction exercises database-aged test records: recent, pending outbox, held and review-required results keep full bodies; resolved old accepted/rejected responses compact while identities/receipts/summary/audit/evidence survive. Same old ID returns a compacted result; changed old payload conflicts. Cross-tenant recipient foreign keys roll back the whole transaction. A deferred constraint rejects a resultless command at actual COMMIT.

Cleanup: every database suite owns one random `tawsel_test_<32 hex>` database, migrates it through the production runner, uses real per-command commits and drops it only after closing its pools/children. There is no enclosing test transaction and no FORCE drop. Pre-existing PostgreSQL services and Engine datasets are outside this lifecycle.

Remaining limits: the process tests prove application-process failure, not power-loss or backup recovery (P40). The outbox is intent only; ordering/signing/sending/receiver acknowledgement belong to P25/P26. Authentication, tenant memberships and feature-specific invariants remain P06 onward. HTTP result retrieval remains unavailable until those dependencies are implemented.

## Final review and verification

Supported runtime for the following checks: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.4**, pg **8.23.0**, @types/pg **8.23.1**. Existing TypeScript 6.0.2 / Vitest 5.0.1 / Fastify 5.12.5 / Vite 8.3.0 retained. Ajv 8.20.0 and ajv-formats 3.0.1 are explicit API dependencies using the existing workspace pins. No new library beyond the PostgreSQL driver/types was selected.

- Review added immutable command snapshots passed to feature callbacks; the mutation-during-acquisition test proves the fingerprint and write input stay aligned. A checked-out connection error now rejects waiting work and destroys the client; `pg_terminate_backend` proves rollback and subsequent same-ID recovery. Hash input tests reject lossy/non-JSON values and unsafe credential-bearing URLs without echoing secrets.
- Lock-order test verifies the waiter blocks on driver **before acquiring task**, using `pg_blocking_pids` plus an independent `pg_try_advisory_xact_lock` probe. Reversed lists and UUID casing cannot change guard identity/order. This assertion detects a missing sort; merely waiting on any held lock would not suffice.
- Root `npm ci` failed with Windows EPERM because a pre-existing Vite process held the rolldown native binary. No existing process was stopped. `npm install` restored the working checkout (zero vulnerabilities; warning about a locked temporary old binary). Its package-lock checksum was unchanged. The failed clean install and resulting missing-ESLint check are not passes.
- Copied current tracked/new source into ignored `.local/phase05-clean-check` (no Engine datasets, no shared node_modules), then `npm ci`: **PASS**, 325 packages installed, zero vulnerabilities. `npm run check`: **PASS** — audit, lint, OpenAPI, generated drift/examples/catalog, all typechecks, **7 files / 167 tests**, all builds and production fixture exclusion. This copy preceded only the final stronger lock assertion and pool-close test; the root/focused checks below cover those additions.
- Repaired root `npm run check`: **PASS**, all gates and **7 files / 167 tests**, including the stronger lock assertion. Added one final real Fastify `app.close()`/pool-drain test, then `npm run test:database`: **PASS**, **2 files / 27 tests** (22 command/recovery and 5 lifecycle). API typecheck passed again. The total current test inventory is 168; the all-project run observed 167 before that final additional lifecycle test, with its full 27-test database suite subsequently passing.
- Canonical contract generation/check: **5 schema files, 62 valid and 38 invalid examples, 147 operation entries**. `action.getResult` remains designed as an HTTP operation, with its internally verified primitive and dependency explicitly recorded. Generated type/reference/coverage files and consumer recovery example updated from canonical inputs. No duplicate schema ownership introduced.
- `npm run db:demo`: **PASS**; accepted counter/progress/identity/audit/outbox counts all 1, duplicate result identical, fresh-pool recovery identical; injected failure after outbox leaves all six observed counts 0. It names its disposable database and labels intent-only delivery, then cleans up.
- `npm run db:local:stop` → `npm run db:local:start` → `npm run db:migrate`: **PASS**, clean stop/restart and “already current.” Generated credentials/application data persist. A compiled `apps/api/dist/main.js` process listened on an ephemeral loopback port after migration validation; HTTP `/health` returned the original workspace payload, `/actions` was 404 and stderr was empty. The smoke process was stopped afterward; graceful pool drain is separately verified by the Fastify lifecycle test (Windows process termination is not a POSIX signal proof).
- Database inventory after all suites/demo: **zero** remaining `tawsel_test_<32 hex>` databases, **zero** synthetic tables in the application database. Only seven foundation/runner tables exist. The local cluster remains available at 55432; stop with `npm run db:local:stop` when finished.
- `git diff --check`: **PASS**. `git diff --exit-code HEAD -- docker-compose.yml setup.ps1 profiles/motorcycle.lua vroom-conf/config.yml data stitch-export`: **PASS**, no protected changes. The checkout's data-directory file metadata predates this task; no map import, Engine Compose/volume command or dataset write ran. Docker was not available on PATH, so Engine volume contents/runtime readiness were not reverified. Original Stitch exports and the existing user Vite process remain untouched.
- Changed-document link check: **1,053 relative file links checked, zero missing** at the final review point (anchors/web availability excluded). No remote GitHub Actions, deployment, owner/device review, real ERP or sender verification is claimed.

Primary technical references consulted on 22 September 2026: [node-postgres transactions](https://node-postgres.com/features/transactions), [pool lifecycle/onConnect](https://node-postgres.com/apis/pool), [PostgreSQL 18 INSERT/ON CONFLICT](https://www.postgresql.org/docs/18/sql-insert.html), [transaction timeout settings](https://www.postgresql.org/docs/18/runtime-config-client.html). npm registry metadata was checked directly before pinning pg/types; installed PostgreSQL reports 18.4. These sources informed implementation choices; the evidence above comes from executed repository tests.

## Changed paths and P06 handoff

| Paths | Result |
| --- | --- |
| `db/migrations/0001_command_foundation.sql`; `apps/api/src/db/{config,pool,transaction,migrate}.ts` | Isolated target validation, migration history and transaction/pool lifecycle |
| `apps/api/src/commands/{kernel,json,locks,retention,validation}.ts` | Scoped acquisition/result, strict fingerprints, lock guards, evidence/audit/outbox writes and compaction |
| `apps/api/src/{app,main}.ts`; API/root package files and lockfile | Startup migration check, pool ownership and pinned dependencies/commands |
| `apps/api/test/integration/{database-lifecycle,command-transaction}.test.ts`; `test/support/*.ts`; `test/fast/command-input.test.ts` | Real disposable PostgreSQL, fault/race/process/retention proofs and strict input boundaries |
| `scripts/{postgres-local.ps1,db-migrate.ts,command-demo.ts,setup-app.ps1}`; `.env.example`, `.gitignore`, `eslint.config.js`, `tsconfig.scripts.json`, CI workflow | Reproducible lifecycle/demo and checks; ignored runtime data; CI PostgreSQL service |
| `playwright.config.ts`, `tests/browser/driver-review.spec.ts` | Small P04 prerequisite repair for an occupied browser port |
| Canonical action/result schema, examples, OpenAPI/catalog; contract generator, generated client/reference/coverage; public consumer example | Full/compacted result shape, unchanged public availability, schema conformance |
| Consistency/operations, ERP planning/mapping/index/integration/client guides; phase coverage/index, master/discovery status and implementation ledger | Actual implementation/lock/retention rules, limits, ownership and handoff |

Reproduce from supported Node/npm/PostgreSQL: `npm ci`, `npm run db:local:start` (Windows; other hosts use the marked control database instructions), `npm run db:migrate`, `npm run test:database`, `npm run db:demo`, `npm run check`. Ordinary API startup also needs the P01 values from `.env.example`.

Phase 06 can rely on the seven foundation tables/constraints, versioned runner, trusted-scope kernel API, `getCommandResult`, immutable envelope hash, rejection/savepoint semantics, consistent guard order, retention holds and the real database test helpers. It must implement membership/role/branch/resource checks, bind trusted scope and add real domain assertions. It must not equate synthetic counter proof with shipment or authorization correctness. P25 owns sending/ordering; P26 owns independent consumer proof. **No Phase 06 execution, commit, push, deployment or publication occurred.**
