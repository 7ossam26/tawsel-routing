# Phase 10 — ERP snapshots, receipt and atomic admission

Started 22 September 2026, Africa/Cairo, at HEAD `c67d15a` (`phase 8`). Existing uncommitted Phase 09 files were preserved. No repository or ancestor AGENTS.md was found. Runtime identifies GPT-6; exact picker suffix and reasoning effort are not exposed, so Astra/xhigh is the request, not a verified runtime setting. Read the model selection guide.

Prerequisites: inspected actual P05 kernel/locks/migrations, P06 access predicates, P08 credentials/projections and P09 intake/UI changes, canonical master/discovery/decision map through D-112, assigned requirement rows and ERP handoff sources. `npm run db:local:start` succeeded. Shell default Node 25.2.1 is outside the workspace range; checks use existing bundled Node 24.19.0 and existing local npm 11.1.0 shim. No dependencies changed.

`node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/command-transaction.test.ts apps/api/test/integration/authorization-isolation.test.ts apps/api/test/integration/provisioning-actor.test.ts apps/api/test/integration/b2c-intake.test.ts` — **59 passed, 4 files**, real isolated PostgreSQL, before edits. P08 identity provider seams retain their fixture classification.

References checked: [PostgreSQL 18 transaction and advisory locking](https://www.postgresql.org/docs/18/explicit-locking.html), [Ajv JSON Schema 2020-12](https://ajv.js.org/json-schema.html). Existing compatible dependency pins retained. No Engine import, dataset, mount or Stitch change.

## Checkpoint A

Added closed source/assignment/revision/result schemas, exact allocation validation with BigInt totals, additive migration 0007 with immutable snapshots/lines, stable dispatch cycles and assignment history, and source-bound intake authority. P08 operator bootstrap can explicitly grant/revoke the two intake capabilities; omission preserves prior grants. Credential verification and P06 resource checks compose on one transaction without a tenant-wide exclusive admission lock.

Before B: API typecheck and `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/b2b-intake-admission.test.ts` — **3 passed**. Verified persisted source data, immutable history, duplicate/source conflicts, independent same-address shipments, fractional/missing/mixed/overflow/ambiguous allocation rejection, explicit prepaid zero, and tenant/source/branch/actor denial. Initial check caught a test helper UUID inference and missing required `enabled` in a provisioning fixture; both corrected and rerun. Driver compatibility is exercised with actual assignment at B. No material missing prerequisite.

## Checkpoint B

Before C: API typecheck and the same focused test command — **9 passed**. Implemented prepared versus held transitions, current source/assignment revision checks, enabled source driver/branch compatibility, remaining input-slot reservations, full-batch rejection and durable replan/outbound intent in the P05 transaction. Two independent pools/PIDs showed an actual `pg_blocking_pids` barrier, then one entire batch accepted and the other rejected. 49+2 rejects with zero assignment-history/replan/outbox rows for the rejected action and durable rejection audit/evidence. Faults after identity/domain/progress/audit/outbox/result leave no partial receipt. A fresh pool sees committed held work and pending intent without any Engine dependency.

Capacity tests include a labelled future-phase ledger fixture: completed branch visits do not count, one remaining branch visit does, unresolved/future-held/prepared tasks stay outside reservations. No route/branch worker is claimed. A pg deprecation warning exposed parallel reads on one transaction connection; those reads were made sequential before C. No material missing prerequisite. P13 still owns actual planning/worker completion; P15 owns start races.

## Checkpoint C

Implemented revisioned source edits/urgency, prepared/held reassignment, ordinary withdrawal without reason/handover fields, immutable history, scoped pagination and known/pending result recovery. Reassignment into a full driver and readiness changes into a full route roll back every tentative domain write. Departure fixture denies source/priority/removal/reassignment changes; no real round-start race is claimed. API/client/scripts typechecks passed; focused suite first passed **15**, then **18 tests** after review added concurrent same-revision duplicate submissions, source-revision versus receipt with observed independent-connection blocking, and identical IDs across sources/tenants with a cross-source history FK rejection. The migration lifecycle plus earlier 15-test intake suite passed **21 tests** together.

Public proof: `node --env-file=.env.database.local --import tsx scripts/b2b-intake-demo.ts` — **PASS**. Real PostgreSQL and a real listening Fastify HTTP server; the independently copied consumer in `C:/Users/jo/AppData/Local/Temp/tawsel-p10-public-consumer-71mAEr` used only public `schema.d.ts`, `intake.ts`, `tests/erp-conformance/intake.ts`, Node/tsx and its scoped API credential/config. Its explicit environment omitted database/operator/issuer credentials. Observed snapshot → prepared → held/pending-plan, same-address identity, exact replay/recovery, predeparture source edit/withdrawal, 49+2 entire rejection with both additions unassigned, and ambiguous deposit rejection. It withdrew only its accepted conformance assignments through HTTP; the harness removed the isolated database. Command journal retained in that private temporary directory; it is not P27 transactional source-outbox proof. Local issuer subjects are fixtures, no issuer login/Engine/browser/native ERP was invoked.

Updated canonical operation/schema/examples/client/reference and source obligations in the ERP planning/mapping/quickstart, integration/state/access/UI action maps and status/index. Added six command + three read paths, six typed durable event intents; canonical inventory now has 150 entries. Same-source replay rechecks resource visibility, while result recovery is separately scoped. Prepared reads never claim pending planning because of another held task.

Review refinements: sequential SQL on each transaction connection; explicit operator service grants; source-scoped replan visibility; duplicate receipt after acquiring an already-held target lock returns no-op; immutable history includes compatible source/cycle FK. No external reviewer/owner approval claimed.

## Final verification

- `npm run test:contracts` — **183 passed** after narrowly extending the old P09 URL/operation allowlists for P10 paths and its urgency event.
- `npm run db:migrate` — **PASS**, applied 0007 to the dedicated local application database. Migration 0007 is now immutable; earlier migrations were not changed.
- First full `npm run check`: audit zero findings, lint, OpenAPI/reference checks and all typechecks passed; 334/336 tests passed, with exactly the two obsolete contract allowlists failing. Corrected above; final full rerun **PASS: 16 files / 336 tests**, audit zero findings, lint, contracts, all typechecks and shared/API/web production builds with fixture isolation. One pre-existing redirect-only callback OpenAPI warning remains.
- A local ignored documentation-edit helper had a template-literal quoting error; it performed no edits until fixed, then completed. This was not a product/runtime success claim.

Exact final PowerShell environment/command:

```powershell
$env:Path='C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\jo\Desktop\tawsel-routing\.local\runtime\node_modules\.bin;'+$env:Path
$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'
npm run check
npm run intake:demo
```

The packaged `npm run intake:demo` rerun also **passed** from a new independent directory `C:/Users/jo/AppData/Local/Temp/tawsel-p10-public-consumer-olXvkS`. Captured all produced P10 outbox payloads conform to the canonical ChangedEvent schema in the integration suite. The race suite also observes GET result=202 while the command transaction is still uncommitted. Final inspection found PostgreSQL **18.4**, zero leftover disposable test databases and zero source-task fixture rows in the application database. `git diff --check`, handoff-link checks and protected Engine/Stitch path inspection passed. Local migration 0007 remains applied; no background demo server/worker is left running.

Versions retained: Node 24.19.0, npm 11.1.0, PostgreSQL 18.4, pg 8.23.0, Fastify 5.12.5, Ajv 8.20.0, TypeScript 6.0.2, Vitest 5.0.1, tsx 4.23.15. No package dependency or lockfile upgrade. Some ignored one-off contract/document generation helpers used the shell's Node 25.2.1; authoritative checks/build/demo above used the supported pinned Node 24 runtime.

## Changed paths and exact handoff

- Data and implementation: `db/migrations/0007_b2b_intake.sql`, `apps/api/src/b2b-intake/{schema,service,routes}.ts`, API route registration; transaction-local P06 access composition and kernel result read reuse; P08 capability-specific service authentication/operator intake grants/discovery. Existing Phase 09 work and migrations 0001–0006 were preserved.
- Verification/consumer: `apps/api/test/integration/b2b-intake-admission.test.ts` (18 scenarios), migration inventory assertions, `packages/api-client/src/intake.ts`, `tests/erp-conformance/intake.ts`, `scripts/b2b-intake-demo.ts`, workspace/client commands and package file list.
- Canonical/handoff: `contracts/b2b-intake.schema.json`, provisioning optional grants, OpenAPI/operation catalog/valid-invalid examples, generated client/reference/coverage and generator tests; ERP planning/mapping/quickstart/index; `docs/b2b-intake.md`, provisioning/access/integration/consistency/UI action maps, phase index/coverage/current master/discovery summaries and implementation ledger. No product UI changes were made by P10.

Phase 11 may rely on the real P09 personal intake and P10 source snapshot/receipt/read APIs, immutable versioned original addresses/source pins and line money, stable task/cycle identity, prepared versus held/readiness fields, scoped authenticated source access and migration 0007. Source input does not establish geocoder/map correctness; P11 must add execution-pin provenance/readiness without rewriting history. Tests/demo above are the reproducible handoff.

Remaining limits: EGP/exponent 2 is the explicitly supported intake currency policy; one dispatch cycle per shipment until P22. P13 must consume durable replan intent and publish actual routes; P15 must implement active-round start/admission/removal races using the same driver/task locks; P17 owns outcomes/collection/conservation; P18 owns timed reactivation; P21–22 own actual return/redispatch; P25 owns signed delivery; P27 owns native source forms and the transactional ERP outbox. No live Engine, UI/browser/device, real ERP connector, production deployment or owner approval was performed/claimed here. **Phase 11 was not executed; no commit, push or publication.**
