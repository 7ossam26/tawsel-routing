# External consumer quickstart — Phase 42

This runs the private reference ERP against an authorized **dedicated test source**. It mutates test shipments and deliberately repeats signed events. It does not build or certify a commercial ERP. [Exact executed results](../verification/integration.md), [artifact identity](release-manifest.json), [source](source-protocol.md) and [receiver](receiver-protocol.md) semantics.

## 1. Obtain and verify the handoff

The Tawsel operator builds from the checkout with supported Node 24/npm 11 and the locked dependencies:

```powershell
npm ci
npm run source:demo  # requires the local test services described in section 7
npm run erp:package
npm run erp:verify
```

The output is `dist/erp-handoff/`. Copy that entire directory to a clean location outside Tawsel. It preserves canonical contracts, public client source/output, reference source/migrations/output, conformance source/output and the guides/evidence. At its root:

```powershell
node scripts/verify-erp-release.mjs .
Set-Location dist/erp-reference
npm ci --ignore-scripts
```

This package uses a captured standalone lockfile. Rebuilding does not resolve new dependencies; an intentional dependency change requires refreshing `docs/erp/reference-package-lock.json` and rerunning the proof. ExcelJS 4.4.0 is included for the public workbook checker; the receiver runtime imports only its own modules and public client/standard dependencies.

Verified local toolchain: Node **24.19.0**, npm **11.1.0**, PostgreSQL **18.4**, local Keycloak **26.7.4**. API/client/reference package **0.1.0**, action/event/payload **1.0.0**. Other language/database connectors may implement the same public protocol. On Windows, ensure npm's wrapper invokes Node 24; the recorded checkout run invokes `.local/runtime/node_modules/npm/bin/npm-cli.js` using the supported Node binary.

No Tawsel database URL, operator token, internal package or domain import is needed in the consumer directory/environment. An operator may separately start/provision the systems. The conformance checker is an external client, not that setup harness.

## 2. Required inputs from the two operators

**Tawsel operator:** public test API origin, bound tenant/integration UUIDs, expiring scoped service credential, reserved existing issuer subject for the test driver, configured company issuer/client, allowed callback and signing key ring. Grant `identity.provision`, `intake.prepare`, `assignment.manage`, `return.receive`, `return.dispose`, `integration.manage`. The source checker creates a driver role with `execution.own`, `reports.read`, `reports.export`; those are human-session grants, not service impersonation. The operator owns `integration.bindSource`, reserved subjects, approved destination/secret configuration and issuer worker. See [provisioning](../provisioning.md) and [sender setup](../outbox-delivery.md).

**Consumer operator:** separate PostgreSQL database/role, independent status token, callback listener, durable source/inbox workers and optional native OIDC client. Database name must match `mock_erp_[a-z0-9_]+`, with comment `tawsel:external-mock-erp:v1`. Its owner is LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS, with no role memberships or Tawsel privileges/schema. Revoke PUBLIC database access; configure SCRAM/TLS for the actual deployment. Startup checks isolation and recipient ownership. No shared Tawsel tables are permitted.

Use separate random service, status, signing and session secrets. Supply values privately; none belong in the bundle or recorded public proof. Copy the example:

```powershell
Copy-Item mock-erp/config.example.json receiver.json
```

Set the actual `tenantId`, `integrationId`, `statusToken`, `keys[{keyId,secret,activatedAt?,verifyUntil?}]`, `tawselBaseUrl` and `tawselAuthorization`. For this explicit local proof use `host:"127.0.0.1"`, `port:3012`, `testLoopback:true`, Tawsel `http://127.0.0.1:3011`. The key secret is 64 lowercase hex characters. Normal nonloopback Tawsel access requires HTTPS. Sender callback is the approved consumer `/api/v1/consumer/events`; both sides must agree on key activation/expiry. Missing/unusable input is a failed setup, never a fallback to internal access.

## 3. Migrate and start the consumer

From the installed standalone consumer directory, in each terminal:

```powershell
$env:MOCK_ERP_CONFIG=(Resolve-Path receiver.json).Path
$env:MOCK_ERP_DATABASE_URL='postgresql://OWN_ROLE:SECRET@127.0.0.1:55432/mock_erp_reference?sslmode=disable'
$env:MOCK_ERP_MANAGED_MIGRATIONS='true'
node mock-erp/dist/main.js migrate
node mock-erp/dist/main.js
```

Use your real consumer URL; the shown URL is the local configuration format, not a credential. In a second terminal with the same variables run `node mock-erp/dist/main.js worker`. This applies incoming events and reports processed checkpoints. A third terminal normally runs `node mock-erp/dist/main.js source-worker`; **keep it stopped during staged source conformance below**, because the checker owns each due source attempt. `--once` processes one due attempt, not an implicit drain. Stop owned foreground processes with Ctrl+C. Managed server/worker startup checks exact migration history; only the explicit migrate command changes schema.

Before application, status can show durable received ahead of applied. Poll `/api/v1/consumer/status?aggregateType=task&aggregateId=<UUID>` with `Authorization: Bearer <statusToken>`. Source status is `/api/v1/source/status` under that same consumer-owned status token. Tawsel's source-scoped `/api/v1/integration/applied-checkpoint` separately reports receiver assertions. Transport queue `projectionStatus=unknown` does not replace that report.

## 4. Staged two-task source/driver/report/return proof

Create a private `source-conformance.json`:

```json
{
  "apiUrl":"http://127.0.0.1:3011",
  "receiverUrl":"http://127.0.0.1:3012",
  "tenantId":"11111111-1111-4111-8111-111111111111",
  "integrationId":"22222222-2222-4222-8222-222222222222",
  "credential":"SOURCE_SCOPED_SERVICE_TOKEN",
  "statusToken":"DISTINCT_CONSUMER_STATUS_TOKEN",
  "driverSubject":"OPERATOR_RESERVED_TEST_DRIVER_SUBJECT",
  "entry":"ABSOLUTE_PATH_TO/mock-erp/dist/main.js",
  "consumerConfig":"ABSOLUTE_PATH_TO/receiver.json"
}
```

Replace all example scope/secret/path values with the configured test inputs. Start with an empty dedicated source and live Tawsel provisioning worker/issuer:

```powershell
node conformance/source.mjs source-conformance.json prepare
```

This provisions branch/role/user/driver, creates `external-one` and `external-two`, each with three 10000-minor EGP pieces plus 5000 shipping at the same coordinates, proves preparation has no custody, receives both and waits for actual issuer reconciliation.

The **Tawsel test operator** stops only the isolated API. Then:

```powershell
node conformance/source.mjs source-conformance.json offline-save
```

Local withdrawal commits and remains pending after HTTP failure. Restart the consumer against its same database; the Tawsel operator restarts its API. Then:

```powershell
node conformance/source.mjs source-conformance.json resume
```

The original action is accepted without a new ID; the second task is explicitly received again. No SQL repair is part of recovery.

Log the provisioned driver into Tawsel through its separate real OIDC browser flow. Privately add `driverCookie` (that test session's cookie header) and `driverOrigin` (the exact registered application origin) to the conformance file. Never log or distribute these values. The public session clients handle CSRF bootstrap; an ERP service token cannot replace the driver session.

```powershell
node conformance/source.mjs source-conformance.json execute
```

This manually plans/starts the two tasks, records one-piece partial delivery (15000 minor EGP) and no-answer, validates the actual report schema/counts/pieces/money and parses the downloaded XLSX for the same snapshot/task IDs/exact amount/no formulas. It offers returns, verifies departed staff withdrawal rejection, receives one piece, records one separate lost piece, and creates/prepares/receives a new one-piece cycle from that actual receipt. The other task retains three unresolved pieces. Manual planning proves no live road route or physical arrival.

Restart both API and consumer against their existing databases, retain original IDs and allow normal sender leases/retries to recover. Keep the incoming projection worker running. Use `node conformance/source.mjs source-conformance.json status` for accepted/rejected source state.

## 5. Signed receiver conformance and recovery

Create private `receiver-conformance.json` with actual scope, URLs, distinct credentials, test signing key and **all aggregate IDs** from the scoped public sender queue:

```json
{
  "apiUrl":"http://127.0.0.1:3011",
  "callbackUrl":"http://127.0.0.1:3012/api/v1/consumer/events",
  "statusUrl":"http://127.0.0.1:3012/api/v1/consumer/status",
  "authorization":"Bearer SOURCE_SCOPED_SERVICE_TOKEN",
  "statusAuthorization":"Bearer CONSUMER_STATUS_TOKEN",
  "tenantId":"11111111-1111-4111-8111-111111111111",
  "integrationId":"22222222-2222-4222-8222-222222222222",
  "signingKey":{"keyId":"CONFIGURED_KEY_ID","secret":"64_LOWERCASE_HEX_CHARACTERS"},
  "aggregates":[{"type":"task","id":"ACTUAL_TASK_UUID"}],
  "expected":{"deliveredPieces":1,"reportedMinor":15000,"receivedPieces":1}
}
```

The illustrative single aggregate entry must be replaced with the complete public queue aggregate list for this journey (including provisioning/return streams). The check fails if totals, history or application disagree:

```powershell
node conformance/receiver.mjs receiver-conformance.json
```

It validates real replay messages, delivers each twice, rejects authenticated changed bytes and expired signatures, waits for contiguous application, and compares public authoritative snapshots with consumer state. It needs neither database URL nor operator credentials. Duplicate/actor/wrong-scope/stale-revision/capacity/process-crash/gap/expired-history cases also have real owning-module suites recorded in final evidence; they are not all simulated by this one checker.

For a known missing stream: `node mock-erp/dist/main.js reconcile task <UUID>`. Recovery uses scoped public HTTP. `historyComplete=false` remains visible after a current snapshot covers unavailable transitions. Do not reset inbox/source history or infer historical accounting entries from totals. The ordinary sender does not automatically purge events.

## 6. Optional actual native forms

Add `native` with `privateTestOnly:true`, origin `http://localhost:5191`, configured company issuer, confidential `erp-reference` client/secret, random 64-hex `sessionKey`, and authorized existing `adminSubjects`. Set receiver port 5191. Register exact `http://localhost:5191/callback`; stale local client secrets must match the actual issuer. Native mode rejects production/nonloopback binding. Browser forms accept no service token or actor selector.

At `/`, create branch/role/user/driver; inspect issuer readiness separately. Create/prepare/receive two shipments, then use the separate Tawsel driver session. Native returns select driver/original branch, confirm only actually received items and retain discrepancies; fresh dispatch uses confirmed stock and new cycle identity. [P41 native browser proof](../phase-41-evidence.md) is desktop/local-service evidence, not commercial staff/device approval.

## 7. Reproduce the executed local proof from the checkout

Start only the existing local PostgreSQL and Keycloak (install/seed instructions: [operations](../operations.md), [identity](../identity.md)); do not import maps/Engine as app setup. With supported Node/npm:

```powershell
npm run db:local:start
npm run identity:start
# In another terminal after the issuer is ready:
npm run source:demo
```

`source:demo` builds the full handoff, copies only the published consumer artifacts to a new temporary directory, runs independent `npm ci --ignore-scripts`, verifies internal imports are unavailable, creates isolated test systems and real OIDC driver login, and executes sections 4–5 with two API/receiver restarts. Its allowlisted consumer environment carries only its own DB URL and public inputs. It writes redacted [final proof](../verification/integration-local-2026-09-26.json); private raw facts/config remain ignored and credentials are removed on normal cleanup. Setup is operator-only and is not required by an external implementer with existing public test endpoints.

Relevant repository regression: `npm run test:source`, `npm run test:receiver`, `npm run test:outbox`, `npm run test:reporting`, `npm run test:report-export`, plus authorization/provisioning and the final integrated suite. These intentionally use isolated real Tawsel databases to prove server transactions; the installed consumer never receives those credentials. Historical capture-only checkers remain in `tests/erp-conformance/` with their original evidence classifications. No physical device, live Engine, target deployment or real ERP guarantee is implied.
