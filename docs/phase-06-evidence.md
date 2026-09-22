# Phase 06 evidence — tenant, branch and capability enforcement

Date: 22 September 2026. Starting HEAD: `62f27fe` (`phase 5`); working tree clean. No repository/ancestor AGENTS.md found. Read master plan §5, current discovery/decision map through D-112, phase index, R-01/R-03/R-04/R-43/R-58/R-65, P02 state/capability/catalog artifacts, P05 actual schema/kernel/migration/harness and implementation ledger.

Model evidence: runtime identifies GPT-6; exact picker suffix and effort are not exposed. Requested recommendation is `gpt-6-astra / xhigh`, not an observed setting. Consulted the model-selection guide; no setting change claimed.

## Prerequisites

Supported runtime: Node 24.19.0, npm 11.1.0 (existing ignored `.local/runtime` npm shim; bundled Node prepended to PATH). `npm run db:local:start` passed using the dedicated existing local PostgreSQL cluster. Before editing: `npm run test:database` passed 2 files / 27 tests; `npm run test:contracts` passed 113 tests; `npm run contracts:check` passed 5 schemas / 62 valid + 38 invalid examples / 147 operations. No prerequisite repair needed.

## Checkpoint A — membership schema

Added additive typed tenant/account/subject/branch/role/membership/driver/integration schema over retained P05 scope keys; composite foreign keys, single company role, personal account separation, explicit exceptions and tenant administration serialization. Existing untyped keys are not automatically trusted or classified.

Before B: `node --env-file-if-exists=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/authorization-schema.test.ts apps/api/test/integration/database-lifecycle.test.ts` **PASS, 2 files / 18 tests**, with actual committed PostgreSQL fixtures. Invalid branch/role/account/driver/integration/source-kind relationships fail at the DB boundary; personal separation, stable subject links, role/exception constraints and canonical capability vocabulary pass. Fresh/racing/idempotent migrations and history checks pass. First draft had one test masked by an existing account uniqueness violation; supplied an unlinked other-tenant account so the unchanged intended FK assertion specifically proves scope enforcement, then reran successfully.

No unresolved prerequisite. P07/P08 authentication/provisioning and later domain tables remain outside scope. Synthetic resource fixture tables are in disposable databases only.

## Checkpoint B — effective access

Added `apps/api/src/access/service.ts`: issuer/subject versus business membership lookup; current role/explicit override resolution; active tenant/account/subject/membership/branch/driver/integration checks; fixed personal own-work capabilities; transaction-lifetime sessions; payload scope assertions; shared parameterized SQL and row predicates; mandatory lifecycle predicate for operations. Own-driver capabilities cannot be broadened by a caller's policy, and service credentials do not impersonate humans. Tenant-row share locks serialize access use with trigger-enforced permission changes. Added command-kernel same-transaction composition point so access and writes share commit boundaries.

Before C: `node --env-file-if-exists=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/effective-access.test.ts` **PASS, 4 tests**. Role changes, persistent direct allow/deny, explicit inherit, equal two-branch access, third-branch denial, powerless Admin label, lifecycle rejection, issuer mismatch, disabled membership and expired-session rejection verified against PostgreSQL. `npm run typecheck -w @tawsel/api` **PASS** after A and B. No production identity selector, OIDC implementation, editor or resource endpoint added. Lifecycle domain truth is intentionally supplied by each later locked feature adapter, not invented in P06.

## Checkpoint C — isolation evidence

`authorization-isolation.test.ts` initial focused run **PASS, 20 tests**, actual PostgreSQL and commits. Covers two companies plus separate personal tenant, two assigned branches plus forbidden/other branches, separate drivers, mixed integrations sharing a driver/trip, SQL filtering/counts, own-driver restrictions, operation denial, forged envelope/payload scope, disabled bindings, queued-job/export guard pattern, rollback, current authorization on stored replay and concurrent direct-SQL revocation. The initial fixture draft had a missing closing brace; corrected before tests ran. Typecheck then found a union narrowing and overloaded query-return annotation in test code; corrected and API typecheck passed. These failed drafts are not acceptance results.

Added `executeAuthorizedCommand`: fixes operation ID and payload validator, uses trusted scope and the same transaction as P05, requires a locked authoritative resource adapter, reauthorizes duplicates, retains lifecycle rejection evidence, and cannot use a service actor string as authentication. Generic hidden/missing denial is identical; lifecycle is checked only after visibility. Guard inputs and every capability family are documented in [authorization contract](authorization.md).

`npm run access:demo` **PASS**: visible source-only records, one accepted change/stable replay, other-source denial, durable lifecycle rejection, disabled-integration denial; disposable DB removed. `npm run test:database` **PASS, 27 tests** after the kernel composition change. Expanded final verification below includes an additional P05 upgrade test and the opposite revocation ordering. No actual background worker/export endpoint/HTTP identity adapter is claimed; tests use the same reusable service through explicitly labelled adapters.

## Acceptance mapping

| Requested scenario | Executed evidence |
| --- | --- |
| Role grants, direct deny | `effective-access` follows role edits and exceptions; `authorization-isolation` denies writes in both assigned branches |
| Role denies, direct allow | Actual accepted command in allowed branch, hidden-branch denial and retained departed-state rejection with unchanged value |
| Two branches, same capabilities, no third | Effective-capability assertions plus SQL reads, counts and command denial; disabled/deleted branch membership immediately narrows access |
| Admin label lacks grant | Role switch to empty `Admin` produces zero capabilities; direct allow remains lifecycle-bound |
| Shared driver trip, other source | Same-driver mixed-source fixture filters contacts/current/next/counts; hidden source command returns safe 404 and creates no command identity |
| Forged job/export scope | Trusted job-principal fixture re-resolves current DB scope; forged tenant/branch/driver/account/integration rejected; membership removal and grant revocation affect subsequent job/export reads |
| Revocation races | Both commit orders observed using independent connections and `pg_blocking_pids`; no sleep-based success assumption |
| DB constraints and upgrades | Cross-tenant FKs, personal separation, one role/stable subject, source kind and capability enum; real 0001 data/retained command survives 0002, legacy keys gain no automatic authority |
| Retained result and rollback | Same-ID result remains identical after lifecycle advances; current branch revocation blocks its disclosure; injected failure after audit rolls back resource and command rows |

## Final verification and review

- `npm run test:authorization`: **PASS, 3 files / 38 tests** before adding the final real-context schema test. Final complete check includes **39 authorization tests** (13 schema, 5 effective access, 21 isolation).
- `npm run test:database`: **PASS, 2 files / 28 tests**, including real P05 → P06 upgrade/idempotent rerun, original durability/rollback/independent-connection/process-recovery coverage and pool shutdown.
- Initial full `npm run check`: audit/lint/contracts/types and **222 tests passed**, then web build correctly refused a missing `VITE_TAWSEL_API_BASE_URL` (there is no `.env` in this checkout). Set the documented local environment value; no existing user environment file was overwritten.
- Final `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check`: **PASS**, audit with zero vulnerabilities, ESLint, OpenAPI lint, generated contract drift/examples/catalog checks, all workspace/script typechecks, **10 files / 223 Vitest tests**, shared/API/web builds and production UI-fixture exclusion.
- Final contracts: **5 canonical schema files, 70 valid + 45 invalid examples, 147 operation entries**. Added CapabilityEffect/CapabilityOverride/AccessContext, generic lifecycle denial, actual-context schema checks and portable public consumer examples. All business HTTP operations/events remain designed; the catalog separately records verified internal authorization foundation. Generated references/types/coverage were regenerated from their canonical sources.
- `npm run db:migrate` applied `0002_tenant_access.sql` to the existing dedicated application DB; repeated command reported **already current**. No P05 migration checksum was rewritten. `npm run access:demo` reran successfully after migration and removed its disposable DB.
- Database inventory: actual PostgreSQL **18.4**, migrations 0001 and 0002 present, **zero** remaining UUID-named disposable test databases and **zero** synthetic test tables in the application DB. The local cluster remains available on loopback 55432; existing `npm run db:local:stop` stops it when desired.
- `git diff --check`: **PASS**. `git diff --exit-code HEAD -- package-lock.json docker-compose.yml setup.ps1 profiles/motorcycle.lua vroom-conf/config.yml data stitch-export`: **PASS**, dependency lockfile and protected tracked artifacts unchanged. No map import, Engine/data/mount edit, existing-process termination or original-export edit occurred. Final changed-document relative link audit passed **1,089 links / zero missing** (file targets only, not anchors/web reachability).
- Self-review checked resolver/SQL predicate agreement, immutable trusted context snapshots, current authorization on retries, FK test specificity, disabled bindings and lock ordering. It added the opposite revocation ordering, actual-context schema/mutation test and real retained-data migration test. No external reviewer or owner feedback was received or inferred. One documentation patch failed an exact heading match and the status-update helper stopped on a nonexistent no-op anchor; both were corrected explicitly, with no runtime defect hidden by the successful check.

Versions retained: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.4**, pg **8.23.0**, TypeScript **6.0.2**, Vitest **5.0.1**, Fastify **5.12.5**, Ajv **8.20.0**. No new dependency or lockfile change. Technical references consulted: [PostgreSQL 18 constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) for composite foreign keys, and [row locking](https://www.postgresql.org/docs/18/explicit-locking.html) for the share/update serialization choice. The passing evidence comes from repository execution, not documentation.

## Changed paths and limits

| Paths | Delivered result |
| --- | --- |
| `db/migrations/0002_tenant_access.sql` | Typed scope/identity/membership/role/exception/branch/driver/integration model; FK and revocation serialization |
| `apps/api/src/access/{service,command}.ts`; `apps/api/src/commands/kernel.ts` | Current effective access, scoped SQL/row/lifecycle guards, trusted command composition and visibility recheck on replay |
| `apps/api/test/integration/{authorization-schema,effective-access,authorization-isolation,database-lifecycle}.test.ts`; `apps/api/test/support/access-fixture.ts` | Real PostgreSQL constraints, role/scope isolation, concurrency and upgrade evidence; labelled fixture principals and synthetic records |
| `scripts/access-demo.ts`; root `package.json`; `.github/workflows/application-checks.yml` | Reproducible demo/test commands and CI path coverage |
| `contracts/{common.schema.json,openapi.yaml,operations.json,examples/*}`; `scripts/contracts.mjs`; `packages/api-client/{src/schema.d.ts,examples/consumer.ts,README.md}` | Canonical access shapes/examples, operation foundation annotation and generated portable client |
| `docs/{authorization,phase-06-evidence,implementation-status,tracking-and-consistency,contract-coverage,operations,integration-guide}.md`; `docs/reference/public-contract.md`; `docs/erp/*`; current phase index/coverage; master/discovery status | Permission table, guard integration protocol, ERP planning/mapping/conformance distinction and actual handoff |

No actual OIDC/session/service authentication, provisioning endpoint, company editor, shipment command, background worker, export job/download or event sender was implemented. No browser/device/UI change required new Playwright evidence; none was run or claimed in P06. Real issuer/email/ERP/device/production performance checks, remote CI and deployment are unrun because they belong to later phases. P04 owner UI review remains pending. The per-tenant administration lock is deliberately coarse and has no throughput claim; P38/P39 must validate load and database-role deployment. External connectors still require the public-boundary conformance work in P26/P27.

Reproduce using Node 24/npm 11: `npm run db:local:start`, `npm run db:migrate`, `npm run test:authorization`, `npm run test:database`, `npm run access:demo`; for the complete gate set `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3001` in the shell and run `npm run check`. Tests create/commit/drop owned disposable databases, never an in-memory substitute or surrounding rollback transaction.

**P07 may rely on** the actual 0002 schema, `withAccess`/`executeAuthorizedCommand`, current role/exception/source/branch/driver guards, safe denial behavior, canonical access context/override types and P05 transaction/test infrastructure. It must bind real issuer/session subjects to this model and add actual authentication checks; fixture principals confer no production login. **Phase 07 was not executed. No commit, push or publication was performed.**
