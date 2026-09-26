# ERP integration evidence — final local handoff, 26 September 2026

## Phase 42 final public consumer — 26 September 2026

**Passed locally.** [Redacted machine-readable result](integration-local-2026-09-26.json), [ordered A/B/C evidence](../phase-42-evidence.md), [released artifact manifest](../erp/release-manifest.json), [exact external setup](../erp/consumer-quickstart.md). Earlier P26/P27 entries below preserve their historical code and runtime scope.

Operator commands in the checkout, with supported Node on PATH:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/postgres-local.ps1 start
# Existing identity install/config; run in a separate terminal and await discovery:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/identity-local.ps1 start
node .local/runtime/node_modules/npm/bin/npm-cli.js run erp:package
node --env-file=.env.database.local --import tsx scripts/source-demo.ts
# Refresh final docs/proof into the bundle, then compare final source/artifacts/proof:
node .local/runtime/node_modules/npm/bin/npm-cli.js run erp:package
node .local/runtime/node_modules/npm/bin/npm-cli.js run erp:verify
```

The actual independent installation ran `node <npm-11.1.0-cli> ci --ignore-scripts` in `C:\Users\jo\AppData\Local\Temp\tawsel-p42-consumer-cDIh8B`. It contained copied release runtime artifacts, its own `node_modules`, consumer config and own database URL. Each copied input digest matched the manifest. The environment allowlist contained OS/runtime variables plus `MOCK_ERP_DATABASE_URL`; no Tawsel database variable was passed. Both Tawsel internal-package imports failed as required. Operator fixture setup separately created isolated application/consumer databases and reserved an actual local issuer subject; those are not imports or credentials in the consumer.

The portable checker ran `node conformance/source.mjs source-conformance.json prepare`, `offline-save`, `resume`, `execute` and `node conformance/receiver.mjs receiver-conformance.json`, using each process's absolute copied paths. The operator stopped/restarted only the isolated services and logged the driver into the real local Keycloak through a separate browser session. The driver's private session cookie is an explicit scoped input; it cannot be replaced by the ERP credential. Consumer configs/issuer user/disposable databases were removed after the run; private raw logs are ignored.

Observed Node **v24.19.0**, npm **11.1.0**, PostgreSQL **18.4**; Keycloak startup identifies **26.7.4**. Public API/client/reference **0.1.0**, OpenAPI **3.1.1**, JSON Schema **2020-12**, envelope/payload/event/report definitions **1.0.0**. Proof timestamps: **2026-09-26T07:07:14.079Z–2026-09-26T07:09:04.971Z**. The proof records source and consumer runtime SHA-256 identities; documentation refresh does not alter the tested executable identity.

| Observation | Actual result |
| --- | --- |
| Preparation and receipt | Two independent three-piece same-address tasks; preparation created no custody; accepted receipt created assigned goods |
| Source outage/recovery | HTTP failure retained pending local action; restart recovered the same original action ID; accepted/rejected source status remained distinct |
| Driver execution | Separate authenticated session; explicit manual route/start; one-piece partial delivery and one no-answer |
| Report/XLSX | 2 shipments/2 processed attempts, 1 partial/1 no-answer/0 full; delivered 1/held 5; exact 15000 EGP minor units, exponent 2; actual 14338-byte workbook with matching snapshot/task IDs and no formulas |
| Native source changes | Departed withdrawal rejected; one offered piece actually received, a different piece recorded lost, fresh one-piece cycle from confirmed receipt |
| Signed receiver | 24 unique events; 10 changed-byte/expired-signature negative checks; duplicates/replay did not double-count |
| Application after restarts | 2 API and 2 consumer restarts; public receiver projection/replay comparison passed; application reports recorded separately from transport receipt |
| Final totals | Delivered pieces 1; reportedMinor 15000; actually received pieces 1 |

The final integrated selection covers wrong actor/scope, stale revisions, atomic admission, transaction rollback/locking, lost responses, sender/receiver/source process recovery, gaps/current-state reconciliation with unavailable history, offline ownership, reports and export reauthorization. Exact test names/counts and failures are retained in the [final acceptance record](acceptance-local-2026-09-26.json) and phase evidence; the portable receiver's 10 negatives alone do not claim all those invariants.

The clean install retained two moderate dependency advisories; final audit details are recorded in phase evidence. Manual planning and desktop OIDC are local evidence. Physical devices, real elapsed offline day, live Engine, target deployment/capacity/recovery, owner approval and commercial ERP integration remain unrun. No publication or credential distribution occurred.

## Historical integration evidence


Phase 27 extends this proof with a complete source→execution→signed-projection loop. `npm run source:demo` builds and independently installs the public bundle, provisions two tasks via its own transactional source CLI, runs a genuine Keycloak driver session, receives a subset and allocates a fresh cycle. API outage and two restarts of each side recover the same source identity without SQL repair. Result: **24 unique events, 10 negative checks, delivered 1 / reported 15000 minor / received 1**. Native staff forms separately pass actual Keycloak/Chromium at 390×844 and 1366×768. Source transaction/process and session tests use separate real databases. [Exact commands, captures and limitations](../phase-27-evidence.md), [portable source setup](../erp/consumer-quickstart.md), [source protocol](../erp/source-protocol.md). Historical P26 proof follows.

Phase 26 local proof, reference consumer version 0.1.0. Starting Tawsel HEAD `ebe83e0f90fac7f4f1d48e0a1b86e446383b3827`; changes are uncommitted. [Ordered evidence and interim failures](../phase-26-evidence.md), [protocol](../erp/receiver-protocol.md), [reproduction](../erp/consumer-quickstart.md).

| Invariant | Executed evidence |
| --- | --- |
| Independent storage and public boundary | Separate PostgreSQL databases/restricted roles; consumer read of Tawsel outbox rejected with SQLSTATE 42501. Compiled distribution installed outside the checkout; internal package import probes fail. |
| No false durable receipt | Receiver child exits 93 before inbox COMMIT: no response, zero rows. Exit after COMMIT: no response, one received/unapplied row. Restart/redelivery recover it. |
| Bytes and scope | Changed authenticated bytes/payload and sequence collisions reject with 409 and audit. Foreign tenant/source, stale signature, unsupported schema and manipulated aggregate do not enter inbox. |
| Atomic processing | Failure after corrected quantity writes retains prior delivered 0/reported null and no marker; retry yields exactly 2/25000. Child exits before/after projection COMMIT preserve atomic state. Concurrent workers apply once. |
| Sender/receiver restart | Sender child exits 92 after real external durable receipt and before sender completion. Receiver restarts; sender lease expires; same bytes redeliver; one history row is projected. Separate API/receiver restart demo records `lease-expired,received`. |
| Gap/dependency | Out-of-order events buffer and recover through actual authenticated HTTP replay. Cross-stream return requests wait for outcomes. Foreign source checkpoint/read/report is denied. |
| History unavailable | Disposable-database fault removes retained events after checkpoint caching. Real replay returns 410. Snapshot restores current quantities while `appliedThrough=0`/`historyComplete=false`; no prior history rows invented. Late required transitions apply once without double-counting. Without checkpoint, 503. |
| Public conformance | Copied checker calls public API/callback/status URLs; validates replay payloads, receipts, checkpoints and snapshots; verifies independent expected totals. Mutated applied checkpoint is rejected. Checker has no DB/operator credential. |

Verified runtime: Node **24.19.0**, npm **11.6.2**, PostgreSQL **18.4**, Fastify **5.12.5**, pg **8.23.0**, Vitest **5.0.1**. Node 24 invokes `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js` because the host's npm.ps1 otherwise uses Node 25.

- Prerequisites: **4 files / 418 tests**, 64.66s.
- Checkpoint A: receiver test file **3 passed**, 17.38s.
- Checkpoint B: receiver test file **7 passed**, 39.89s.
- Checkpoint C: `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=2 --project integration apps/mock-erp/test/integration/receiver.test.ts apps/mock-erp/test/integration/recovery.test.ts apps/api/test/integration/outbox-inbox-recovery.test.ts` — **3 files / 13 passed**, 67.41s.
- `npm run receiver:package`: compiled `dist/erp-reference`. Copied only that distribution to `C:\Users\jo\AppData\Local\Temp\tawsel-p26-consumer-fb856fc759b646018ef9eeccfb3deb93`. Independent `npm install --ignore-scripts`: **65 packages, audit 0 vulnerabilities**; imports of `@tawsel/api` and `@tawsel/shared` fail.
- `node --env-file=.env.database.local --import tsx scripts/receiver-demo.ts` with `MOCK_ERP_DEMO_ENTRY`, `MOCK_ERP_DEMO_CWD`, `MOCK_ERP_DEMO_CHECKER` selecting that standalone distribution — **19 unique events, 10 negative checks, 2 delivered pieces, 25000 reported minor units, 1 actual received return piece, 5 separately applied reports, both services restarted**. Compiled receiver, compiled worker, checker and sender API run separately. Capture `.local/phase-26-demo.json` contains fixture facts, no credentials; results `.local/phase-26-standalone.log` and the final refreshed-runtime repeat `.local/phase-26-standalone-final.log`. Both passed with the same observations.
- Final complete gates: **40 files / 858 tests passed**, 913.53s with two workers; audit **0 vulnerabilities**; lint, OpenAPI/schema/example/generated-reference checks, typechecks and production builds/fixture isolation passed. UI specification/hash/mapping and whitespace checks also passed. The pre-existing OpenAPI redirect and MapLibre bundle-size warnings remain. Exact commands and interim failures: [phase evidence](../phase-26-evidence.md); final log `.local/phase-26-verified.log`. No receiver database/role or test child process remained after cleanup; the application database remains at migration 0024.

Source/issuer/driver/plan setup is the established fixture harness; events come from actual previous domain commands and PostgreSQL commits. Transactions, signed HTTP, durable processes, crashes, replay and reporting are real. The initial retention fault was refused by the normal immutable-row trigger; the test uses transaction-local trigger bypass only in its disposable database. That is failure injection, not an available purge policy. Ordinary history remains indefinitely retained. The stale replacement test passes a captured public snapshot with a lower watermark directly to the actual adoption function (a boundary fixture); normal gap replay and 410/snapshot fetches use real HTTP. Dedicated child-process tests and the installed distribution establish process isolation separately.

The external package contains public client/schema artifacts, consumer/migrations and checker. Dependency isolation and database privileges are demonstrated; this is not an OS filesystem sandbox claim. The consumer gets no Tawsel DB credentials; the checker gets neither application's DB credentials. Earlier P25 memory-receiver tests remain labelled sender-only evidence.

Unrun/outside scope: production HTTPS/certificates/egress, vendor ERP interoperability, native source forms/outbox, browser/device/owner review, measured load/freshness percentiles and backup/restore. There is no automatic sender checkpoint scheduler/purge or account-wide stream discovery. Known aggregate recovery is explicit and bounded. Phase 27 owns native source workflows; Phase 42 owns final release packaging.
