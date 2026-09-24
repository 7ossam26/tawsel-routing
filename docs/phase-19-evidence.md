# Phase 19 evidence — 24 September 2026

Started from clean HEAD `139a03c` (`phase 18`). No applicable repository or ancestor AGENTS.md found. Runtime identifies GPT-6; the exact Codex picker variant/reasoning effort is unavailable. Requested `gpt-6-astra` / `xhigh`; consulted `phases/model-selection.md`, without claiming that prompt text changes the picker. Existing dependency pins are retained.

## Prerequisites and preparation

Read master-plan sections 6–7, 10–11, 15–16, current discovery decisions through D-112 and their amendment map, assigned R-24/R-29/R-52/R-53/R-65 rows, phase README/status, P15–P18 prompts/evidence and actual migrations, start/current/outcome/eligibility/planning/kernel/access code. Reviewed the 05-driver-daily-trips and 08-trip-completion visual-role audits and report/state contracts. No UI change is planned here; closure UI remains P31.

Initial command: `npm run test:integration -- apps/api/test/integration/start-assignment-race.test.ts apps/api/test/integration/round-start-http.test.ts apps/api/test/integration/current-activity.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts apps/api/test/integration/retry-deferral-urgency.test.ts`. Failed before test execution: missing installed `pg` package and absent `.env.database.local`. This is environment setup, not passing prerequisite evidence. Restoring the lockfile with `npm ci` and obtaining the existing PostgreSQL 18.6 version in the ignored local directory; system PostgreSQL 17 and Engine data are untouched.

Design finding to cover: P18 activation/retry currently requires an active round. Held work that is entirely deferred would prevent preparing a later round. P19 will provide explicit preparation eligibility on the most recent ended round, with no active round, the same owner, earliest/capacity checks and immutable prior closure/outcome history. This is bounded carry-forward integration, not a new retry policy or an execution correction.

Primary references consulted for the retained database/runtime approach: [PostgreSQL Windows distribution](https://www.postgresql.org/download/windows/), [EDB binaries](https://www.enterprisedb.com/download-postgresql-binaries), [PostgreSQL 18 constraint triggers](https://www.postgresql.org/docs/18/trigger-definition.html), [Intl.DateTimeFormat timezone support](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).

Checkpoint A, B and C results will be recorded in order before expanding each checkpoint. No database or external-service success is implied by this preparation entry.

## Checkpoint A — contract and focused policy result

Closed `workday-closure.schema.json` defines distinct round/day commands, explicit active-round/current expectations, ownership anchor, explicit heading pause, immutable closure result/time, pending recovery, holder carry-forward and basic summary denominators. An arrived customer requires an existing outcome command first. Carry-forward reads the current holder and original attempt/source/cycle; it does not copy tasks per date. Migration 0016 adds conditional deferred foreign keys for active-round/open-day and current/active-round, irreversible closure timestamps and immutable closure records.

`npm run test:contracts` before these changes: **282 passed**. `npm run contracts:generate`: **17 schemas, 162 valid / 107 invalid examples, 167 catalog operations**, successful. `npm run test:fast -- apps/api/test/fast/closure-contract.test.ts`: **1 passed**; missing expectations, generic heading close, arrived pause and fabricated settlement fields fail. These are contract/policy checks, not transaction proof.

Concrete unresolved check at this checkpoint entry: PostgreSQL 18.6 tooling download is in progress after slow/reset external downloads. `npm ci` initially failed with ECONNRESET; `npm ci --prefer-offline --fetch-retries=5` succeeded (357 packages, audit 0 vulnerabilities). Node **24.19.0**, npm **11.1.0**. The real prerequisite and A database checks remain required before acceptance; dependent runtime behavior is not marked verified. No material prerequisite implementation is missing in inspected P15–P18 code. Database evidence will follow below before B is accepted.

A database follow-up: EDB 18.6-4 Windows binary archive was fetched in ranges because of network resets; a damaged ICU range failed ZIP decompression/CRC and was redownloaded, then verified. Only required local PostgreSQL runtime files were extracted under `.local/postgres-tools-18.6`; `pg_ctl --version` reports **18.6**. With that bin directory prepended to PATH, `npm run db:local:start` initialized a dedicated loopback cluster on 55432 and marked development/control databases. No system PostgreSQL service changed.

`npm run test:integration -- apps/api/test/integration/workday-carryover.test.ts -t 'A:'`: **1 passed, 11 unselected**, 4.36s. Real PostgreSQL rejected both invalid parent/child closures and retained current heading. Contract/current requirements and database constraints are now verified. While the environment was unavailable, B source/test drafts were prepared and type/lint checked; they were not labelled transactional evidence. Full prerequisite rerun and B tests follow before expanding summary/read behavior.

## Checkpoint B — passed before summary/read implementation

`Closures` uses the existing command kernel, current authorization, driver/workday/assignment/task guards, same-device generation and explicit current expectations. End round leaves the day open; End day ends its active round. Heading pauses append current history; arrived work requires outcome first. Closure records/timestamps are irreversible, original identity/history/quantities/collection are preserved, branch endpoint reservations are released without receipt, and audit/result/planning/source-filtered outbox intent share one commit. Missing predecessors return pending/202 without finalizing the action ID, allowing exact replay. Closed result retries produce no additional business event. Start reserves a fresh candidate day so a close while waiting cannot reuse a closed ID. P18 gets explicit preparation mode on the latest ended ownership anchor, with historical-round actions disabled.

Prerequisite command listed above: **58 passed / 1 failed** initially; the single failure was the P15 test expecting the existing immutable-baseline error text after P19 extended that trigger. Retained the existing error substring. First full closure suite: **6 passed / 6 failed**; corrected zero activity revision incorrectly included in the positive-only receipt version, the test's shipping-refusal enum, and a stale-device test unintentionally reusing its rejected action ID for a different payload. These failures are not hidden under compilation.

`npm run test:integration -- apps/api/test/integration/workday-carryover.test.ts apps/api/test/integration/start-assignment-race.test.ts`: **2 files / 29 passed**, 30.27s. Combined with the four unchanged passing prerequisite suites, all **59 prerequisite tests** are verified. B includes 12 closure cases (A included), independent connection/observed PostgreSQL blockers and real commit boundaries, five injected write-stage rollbacks, arrived/current denials, exact duplicate result recovery, preserved unpaid held returns, CSRF/ownership/revocation, pending dependency replay and readiness dependency gating. `npm run typecheck -w @tawsel/api`, `npm run lint`, canonical generation/check passed. No live offline queue, physical return producer or signed transport claim. Checkpoint C begins after this result.

## Checkpoint C — focused connected result

Added own-driver workday summary/current-holder reads, exact string money aggregates, admission-based distinct shipment/attempt denominators, day-scoped outcome history, unchanged forecast references and `Africa/Cairo` formatting. Later delivery does not rewrite the previous day's scope/outcome counts; current-holder carry-forward is explicitly a live as-of read. Preparation can activate all-deferred work when due, or explicitly admit source-future held work that never had a reservation, using the same capacity check. It does not reopen old execution or produce admissions until new start.

`npm run test:workdays`: **18 passed**, 32.57s. Verified many rounds in one day, subsequent workday IDs with original task/cycle/attempt/source/earliest identity, stable closed-day history after later delivery, cross-day paid retry fees, processed versus delivered denominators, deferred work excluded even after time passes until activation, and source-future admission. Earliest boundaries use actual PostgreSQL clock and bounded `pg_sleep`; the midnight opening-time fixture changes only test table defaults before real start. PostgreSQL Cairo conversions match Intl for winter, summer and the autumn offset transition; actual closure time remains database UTC and preserves separate delayed device observation.

Pending return-request evidence is explicitly a **seeded P21 intent fixture**; it remains pending and closure adds no receipt/dependency/settlement fact. It is not proof of the future physical-return API. `npm run test:integration -- apps/api/test/integration/retry-deferral-urgency.test.ts apps/api/test/integration/database-lifecycle.test.ts apps/api/test/integration/planning-jobs.test.ts`: **31 passed**, 37.84s, including retained migration upgrade and P18 behavior.

`npm run workdays:demo` and `npm run test:erp:workdays -- .local/phase-19-demo.json`: passed actual loopback HTTP with typed clients, manual plans, public ERP intake and real PostgreSQL. Two rounds share one day; a committed day-end response is deliberately discarded and recovered exactly; next day retains unfinished/future/unpaid return work. Source-filtered closure intents are schema-checked, not delivered. Identity/bootstrap are labelled fixtures. Added the same demonstration to the connected suite after the 18-test run.

C interim failures: summary route's union-return inference was fixed; four initial summary tests failed because the closure validator had not loaded the referenced B2B money schema, then all 18 passed. Consumer typecheck needed removal of a redundant comparison after assert narrowed accepted status. New canonical examples exposed three outdated coverage expectations (P19 path/phase allowlist and round.end used as an unimplemented negative fixture); these were updated to include P19 and keep device.takeOver as a genuinely designed negative fixture. Final verification follows separately.

## Final verification and review

PowerShell command: `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check`.

**PASS on 24 September 2026:** audit **0 vulnerabilities**, ESLint, OpenAPI lint, generated contract check, all workspace/script typechecks, **29 files / 630 tests** (246.57s), production builds and fixture isolation. This includes the final **19-test** `workday-carryover.test.ts`, 300 contract checks, prerequisite and existing regressions. The first full-check attempt stopped at an unused destructuring variable in the retained-identity test; changed the comparison to normalize the explicit admission flag and reran the entire gate successfully. Existing OpenAPI callback-302/no-2xx and lazy MapLibre chunk-size warnings remain, with no new warning accepted as proof.

Retained installed versions: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.6** (EDB Windows 18.6-4 distribution), pg **8.23.0**, Fastify **5.12.5**, TypeScript **6.0.2**, Vitest **5.0.1**, Playwright **1.63.0**, Vite **8.3.0**. No dependency version or lockfile change.

Final follow-up commands/results:

| Command/check | Actual result |
| --- | --- |
| `npm run contracts:generate` then `npm run contracts:check` | PASS; **17 schema files, 172 valid / 115 invalid examples, 167 catalog operations**. Final reference wording distinguishes designed fixtures from captured local API examples; no blanket runtime claim. |
| `npm run workdays:demo` | PASS again in 4.78s, actual loopback HTTP + disposable PostgreSQL; output `.local/phase-19-demo.json`. |
| `npm run test:erp:workdays -- .local/phase-19-demo.json` | PASS against that captured HTTP report, public types/client only. |
| `npm run test:erp:workdays` | PASS against canonical summary/carry-forward examples; this invocation is schema/consumer fixture evidence. |
| `npm run db:migrate` | PASS. New marked `tawsel_app_dev` had no application tables before migration; applied retained **0001–0015** and new **0016**, rather than claiming an already-populated local upgrade. The connected database suite separately verifies retained migration upgrades. |
| `node --env-file=.env.database.local --import tsx .local/phase19-inventory.ts` | Read-only inventory: PostgreSQL 18.6, marked application target, 0016 present; zero workdays, rounds, outcomes, closures, B2B/B2C tasks and disposable test databases. No fixture was inserted into the application database. |
| `python scripts/check-ui-spec.py check` | PASS: **18 original hashes, 9 reference sets, 105 control dispositions, 64 action rows / 167 operations, 73 local links**, contrast and negative checks. Document/source evidence only. |
| `git -c core.whitespace=cr-at-eol -c core.autocrlf=false diff --check` | PASS. |

Agent review found and repaired the existing start candidate-day reuse race and the bounded P18 preparation/source-future admission gaps. Reviewed explicit current requirements, authorisation on replay/read, no fabricated receipt/settlement, source-scoped event construction, preserved old-day denominators, exact amounts and dependency/readiness gating. No external review feedback or owner/device approval was supplied. The accepted source model currently has one dispatch cycle per task; P22 must extend holder/cycle queries when it introduces subsequent source cycles. P23 must evolve effective reporting under shared lifecycle guards when corrections exist.

### Changed paths

Paths below are relative to the repository root; all new/modified tracked deliverables are listed. Ignored local tools, database data and demo output are environment/evidence artifacts, not application source.

```text
apps/api/src/app.ts
apps/api/src/closure/models.ts
apps/api/src/closure/policy.ts
apps/api/src/closure/reads.ts
apps/api/src/closure/routes.ts
apps/api/src/closure/service.ts
apps/api/src/closure/state.ts
apps/api/src/eligibility/policy.ts
apps/api/src/eligibility/service.ts
apps/api/src/eligibility/state.ts
apps/api/src/rounds/service.ts
apps/api/test/fast/closure-contract.test.ts
apps/api/test/integration/database-lifecycle.test.ts
apps/api/test/integration/planning-jobs.test.ts
apps/api/test/integration/workday-carryover.test.ts
db/migrations/0016_workday_closure.sql
contracts/workday-closure.schema.json
contracts/eligibility.schema.json
contracts/openapi.yaml
contracts/operations.json
contracts/examples/README.md
contracts/examples/valid.json
contracts/examples/invalid.json
packages/api-client/src/closure.ts
packages/api-client/src/schema.d.ts
packages/api-client/package.json
packages/api-client/README.md
packages/shared/test/fast/contract-foundation.test.ts
scripts/workday-demo.ts
scripts/contracts.mjs
scripts/check-ui-spec.py
tests/erp-conformance/workdays.ts
package.json
docs/workday-closure.md
docs/phase-19-evidence.md
docs/implementation-status.md
docs/erp/ERP-PLANNING-INPUT.md
docs/erp/field-and-status-mapping.md
docs/erp/consumer-quickstart.md
docs/reference/public-contract.md
docs/contract-coverage.md
docs/ui-actions.md
docs/operations.md
docs/eligibility.md
docs/round-start.md
docs/tracking-and-consistency.md
docs/phases/README.md
docs/phases/coverage-matrix.md
master-plan.md
TAWSEL-DISCOVERY-LOG.md
```

### Remaining limits and exact handoff

- **P20:** rely on migrations **0012–0016**, `Closures`/`WorkdayReads`, `ClosureClient`, canonical closure/status/summary/carry-forward contracts and the connected suite/demo. Current→active round→open workday is enforced at database commit, end timestamps/closure records are immutable, sorted guards serialize close/start and owner generations remain fenced. Takeover must require an open workday and active round. P20 was not executed.
- **P33–35:** server 202/pending, dependency replay, exact lost-response recovery and relevant-action readiness gating are verified. A server cannot see an unsent local action. Persist the full offline queue/barrier, upload prior actions, retain accepted receipts and prevent new-start controls until relevant synchronization succeeds. No offline browser/phone, multi-tab or device storage check was run; those behaviors remain unverified.
- **P21–23:** pending return request is a labelled seeded intent only. There is no physical receipt/disposition producer yet, so this proves closure does not clear it or manufacture return/settlement. Corrections and subsequent cycles need their planned extensions; no actual ERP receipt or corrected final report is claimed.
- **P25–27 / P31 / P36–37:** outbox records are durable recipient-scoped intents, not signed transport or ERP receiver success. Full closure UI and timing/export dashboards were not changed or browser-tested. Local bootstrap/session/provider fixtures are identified in the demo; there is no live issuer/Engine/real ERP/physical device or production validation in this phase. Manual-plan evidence does not claim optimized live Engine behavior.
- No automatic midnight closure/reset, financial day settlement, source resubmission requirement or speculative module. No map import, Engine dataset/mount/configuration change, original Stitch change, commit, push or publication. The dedicated local PostgreSQL cluster remains available for the documented reproduction.
