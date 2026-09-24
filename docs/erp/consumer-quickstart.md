# External consumer quickstart — Phase 27

Phase 29 adds no ERP endpoint or native administration workflow. The connected company-driver browser consumes the existing frozen allocation and outcome boundary; `npm run test:browser:delivery` proves an ordinary exact full delivery through the labelled mock source with actual Keycloak, Chromium, HTTP and PostgreSQL. It is existing-boundary interoperability evidence, not commercial ERP certification or settlement proof. [Exact evidence and limits](../phase-29-evidence.md).

Phase 28 adds no ERP endpoint or native administration workflow. The connected company-driver browser reads work created by the existing source protocol, shows prepared work as upcoming/non-custody, and plans/starts through human session APIs. `npm run test:browser:preparation` runs the labelled mock-B2B source boundary with actual Keycloak, Chromium, HTTP and PostgreSQL plus a controlled Engine `503`; it is interoperability evidence for the existing boundary, not a commercial ERP certification. [Exact evidence and limits](../phase-28-evidence.md).

Phase 27 adds the [native source and transactional command outbox](source-protocol.md), separate OIDC screens, public source status and a complete two-task public-client exercise. Receiver instructions below remain valid. The independent bundle now also contains `mock-erp/ui-dist`, migrations 0003–0004, `conformance/source.mjs`, `conformance/source-driver.js` and `@tawsel/api-client/source`. Canonical ownership remains `contracts/`; build copies are not another schema source. [Ordered evidence and exact limits](../phase-27-evidence.md).

## Two-way reference setup

There are two independent sides: Tawsel API/issuer/sender, and the reference ERP server/source worker/inbox worker with its own database. They are separate processes and credentials; the native staff session and driver session are also separate. Obtain a test tenant/source credential from the Tawsel operator, reserved existing issuer subject(s), and grants for `identity.provision`, `intake.prepare`, `assignment.manage`, `return.receive`, `return.dispose` and `integration.manage`. The operator configures the approved webhook destination and signing key. The consumer never receives the operator token or Tawsel database URL. Source/actor and branch scope are server checked on every command.

Build/copy/install the bundle as below, then configure `receiver.json` with the consumer scope, own status token/signing keys, public API URL and scoped service credential. Start its server, `source-worker`, and `worker` in separate terminals using only `MOCK_ERP_CONFIG` and `MOCK_ERP_DATABASE_URL`. Native forms are optional for conformance; for the actual screens add:

```json
"native": {
  "privateTestOnly": true,
  "origin": "http://localhost:5191",
  "issuer": "http://localhost:8085/realms/tawsel-company",
  "clientId": "erp-reference",
  "clientSecret": "ISSUER_CONFIGURED_ERP_CLIENT_SECRET",
  "sessionKey": "64_LOWERCASE_HEX_CHARACTERS",
  "adminSubjects": ["EXISTING_AUTHORIZED_NATIVE_STAFF_SUBJECT"]
}
```

Use `host:"127.0.0.1"`, `port:5191`, `testLoopback:true` for this private local configuration. The native mode refuses production environment/nonloopback binding. The issuer must register the exact `/callback` URI and its own ERP client secret; a stale ignored local secret is not repaired by a realm import. Native entry is `http://localhost:5191/`. No browser form accepts a service token or actor ID.

Create a branch, a role, a reserved-subject user and a driver in the administration view. Check issuer readiness separately from source-command acceptance. Create two three-piece shipments, explicitly confirm their delivery coordinates, prepare both for the driver, then assert actual receipt and submit the received batch. Prepared work remains non-executable until accepted receipt. Native status shows pending/accepted/rejected; the integration tab separately shows Tawsel outbound events and consumer received/applied checkpoints. Use the separate Tawsel driver account for planning/start/outcomes, then open that driver in native returns and confirm only physically received pieces. A fresh dispatch uses the confirmed subset and new cycle; it does not revive the original cycle.

## Portable source conformance commands

The shipped source checker requires the receiver running and uses the compiled source CLI with **its own** database. Create `source-conformance.json`:

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

With an empty dedicated test source, `node conformance/source.mjs source-conformance.json prepare` provisions branch/role/user/driver through the durable source CLI, creates `external-one`/`external-two`, verifies preparation has no custody, and submits definitive receipt. It waits for actual issuer reconciliation; missing services fail visibly. Keep the regular source worker stopped for these staged failure checks so each checker command owns the next due attempt.

Stop the Tawsel API process, then run `node conformance/source.mjs source-conformance.json offline-save`. It saves ordinary predeparture removal locally and observes pending after HTTP failure. Restart the consumer server against the same consumer database and restart Tawsel; `node conformance/source.mjs source-conformance.json resume` verifies same-ID acceptance and restores the second received assignment. No SQL repair is used.

Log the provisioned driver into Tawsel through the real separate OIDC browser flow. Supply that test session's cookie header as `driverCookie` and its exact application origin as `driverOrigin` in this private conformance file; do not commit/log/share these credentials. The checker maintains CSRF bootstrap cookies and uses the published browser clients. `node conformance/source.mjs source-conformance.json execute` manually plans/starts two tasks, reports one-piece partial delivery (15000 EGP minor units) plus no-answer, requests returns, proves a departed staff edit is rejected, confirms one returned piece, records one separate lost piece, then creates/prepares/receives a new compatible one-piece cycle. This is explicit manual planning; it does not claim live Engine routes.

Restart both server processes against their existing databases. Start the incoming `worker`; let sender leases/retry timers expire naturally. Run the shipped receiver checker below against the resulting aggregates with expected totals `{deliveredPieces:1,reportedMinor:15000,receivedPieces:1}`. It replays schema-valid signed messages twice, checks mismatch/expiry negatives, and compares applied state with public authoritative snapshots. `source.mjs ... status` shows source acceptance/rejection separately. The conformance configuration has no dependency on Tawsel internal modules or tables.

Repository-only operator orchestration: `npm run source:demo` performs that exact staged exercise with disposable real databases/issuer user, a fresh copied bundle plus independent `npm install --ignore-scripts`, separate API/consumer processes and a real browser login. It saves redacted facts to `.local/phase-27-standalone-evidence.json`. `npm run test:source` runs transaction/process/auth checks; `npm run test:browser:source` exercises actual native forms. Start the existing local PostgreSQL and Keycloak services first. These setup scripts are not shipped to the consumer. Exact actual results and earlier failures are in the [phase evidence](../phase-27-evidence.md); no vendor compatibility, production TLS or owner/device acceptance is implied.

The runnable reference is **@tawsel/mock-erp 0.1.0**. It uses a separate database/role, verifies signed HTTP, commits inbox receipt, then applies in an independent worker. See [receiver protocol](receiver-protocol.md), [source protocol](source-protocol.md), [actual verification](../verification/integration.md) and [public contract](../../contracts/consumer.schema.json). Earlier phase examples below remain available and are labelled by their scope.

## Versions and build

Verified local runtime: Node **24.19.0**, npm **11.6.2**, PostgreSQL **18.4**. Pins retained: Fastify **5.12.5**, pg **8.23.0**, Ajv **8.20.0**, TypeScript **6.0.2**, Vitest **5.0.1**, tsx **4.23.15**. Use Node 24 in the supported package range. On Windows, check both Node and npm's wrapper; a system npm.ps1 may launch a different Node.

From the Tawsel checkout:

```powershell
npm ci
npm run receiver:package
```

Outputs: compiled public client and canonical schema copies in `packages/api-client/dist/`; compiled receiver in `apps/mock-erp/dist/`; portable distribution in `dist/erp-reference/` containing `api-client/`, `mock-erp/`, `conformance/receiver.mjs` and a standalone package manifest. These are build copies, not independent schema owners. This is a locally verified reference artifact, not a published npm release.

Copy only `dist/erp-reference` into a new directory outside Tawsel, then:

```powershell
npm install --ignore-scripts
Copy-Item mock-erp/config.example.json receiver.json
```

No Tawsel server source, shared internal package or database URL belongs in that directory/environment. The consumer requires only its own PostgreSQL URL, recipient scope, webhook verification keys, consumer status token and Tawsel HTTPS URL/scoped service credential. A future vendor connector may use a different language/database while conforming to these contracts.

## Separate database and configuration

Have the database operator create a dedicated `mock_erp_<name>` database owned by a separate LOGIN role with NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT, NOREPLICATION and NOBYPASSRLS. Grant no memberships or Tawsel schema/table privileges. Mark it with `COMMENT ON DATABASE mock_erp_reference IS 'tawsel:external-mock-erp:v1'`; revoke PUBLIC access to the consumer database. The consumer checks the marker, role privileges, owner and absence of a Tawsel schema before migrations. Use SCRAM/TLS according to the deployment. It never reads TAWSEL_DATABASE_URL.

For a local disposable setup in this repository, `npm run db:local:start` then `npm run mock-erp:db:create` creates a random dedicated database/role and writes its URL to ignored `.local/mock-erp.database.env`. That administrative harness uses the marked test-control credential; it is **not** part of the distributed consumer. Do not give that admin credential to the consumer. Database/role names from this setup are retained for the operator; normal test/demo fixtures drop only their own created database/role.

Edit `receiver.json`: use actual tenant/integration UUIDs, a random status token (at least 32 characters), and sender-provisioned key IDs plus 32-byte lowercase-hex secrets. Copy the sender's activation/verification-expiry times when rotating; both key lists must agree. Set `tawselBaseUrl` and `tawselAuthorization` to the scoped `integration.manage` credential. Use the [P08 setup](../provisioning.md) and [P25 endpoint/key commands](../outbox-delivery.md); no operator token is needed by the consumer. Use distinct status and service credentials. A loopback demonstration may explicitly set `testLoopback:true` with `http://127.0.0.1:<port>`; nonloopback API access requires HTTPS.

## Start and observe

From the standalone directory, set the two consumer variables in each terminal:

```powershell
$env:MOCK_ERP_DATABASE_URL='postgresql://receiver_role:REPLACE@127.0.0.1:55432/mock_erp_reference?sslmode=disable'
$env:MOCK_ERP_CONFIG=(Resolve-Path receiver.json).Path
node mock-erp/dist/main.js migrate
node mock-erp/dist/main.js
```

In a second terminal with the same two variables: `node mock-erp/dist/main.js worker`. To drain once: `node mock-erp/dist/main.js worker --once`. From the checkout, equivalent scripts are `npm run mock-erp:migrate`, `npm run mock-erp:start` and `npm run mock-erp:worker`; these load the local receiver-only URL file. Startup applies only receiver migrations. Stop each local process with Ctrl+C.

Configure the sender callback to `http://127.0.0.1:3010/api/v1/consumer/events` for the explicit local fixture, or the approved HTTPS callback for deployment. With the worker stopped, a signed event is acknowledged as received and GET `/api/v1/consumer/status?aggregateType=task&aggregateId=<task UUID>` using `Authorization: Bearer <statusToken>` shows received advancing while applied remains behind. Starting the worker advances applied, with quantities and the processed marker committed together. Tawsel's `/api/v1/integration/applied-checkpoint` exposes the separately reported result; its ordinary delivery queue still describes transport receipt.

For a known gap or an entirely missing local stream: `node mock-erp/dist/main.js reconcile task <UUID>`. Recovery uses scoped HTTP only. An expired/unavailable history can restore current state from an available checkpoint while `historyComplete=false` and `lastError=history_unavailable` remain visible. It never fills missing transition history from a snapshot.

## Reproduce and run conformance

Repository demonstration (isolated databases and child processes; source/issuer preparation is explicitly a fixture):

```powershell
npm run db:local:start
npm run receiver:demo
npm run test:receiver
```

Expected demonstration: **19 unique events**, **2 delivered pieces**, **25000 reported minor units**, **1 actual return piece received**, both sides restarted, sender attempts `lease-expired, received`, and separate applied reports. Disposable setup uses actual previous domain commands and real PostgreSQL/HTTP; it does not use native ERP source forms. Capture: `.local/phase-26-demo.json` (fixture facts, no credentials). The tests additionally kill processes at commit boundaries and inject projection/retention faults.

Reusable network checker: create `conformance.json` with these exact fields:

```json
{
  "apiUrl":"http://127.0.0.1:3001",
  "callbackUrl":"http://127.0.0.1:3010/api/v1/consumer/events",
  "statusUrl":"http://127.0.0.1:3010/api/v1/consumer/status",
  "authorization":"Bearer SOURCE_SCOPED_SERVICE_TOKEN",
  "statusAuthorization":"Bearer RECEIVER_STATUS_TOKEN",
  "tenantId":"11111111-1111-4111-8111-111111111111",
  "integrationId":"22222222-2222-4222-8222-222222222222",
  "signingKey":{"keyId":"reference_v1","secret":"64_LOWERCASE_HEX_CHARACTERS"},
  "aggregates":[{"type":"task","id":"33333333-3333-4333-8333-333333333333"}],
  "expected":{"deliveredPieces":2,"reportedMinor":25000,"receivedPieces":0}
}
```

Use actual dedicated test data and include all aggregates whose totals you expect. The checker intentionally redelivers signed retained events twice and submits changed-payload/stale-signature negative cases, so use test credentials/data. It validates replay envelopes, acknowledgements, processed watermarks, snapshots and independent expected totals; it fails if a worker is absent or history is unavailable. Run `node conformance/receiver.mjs conformance.json` in the standalone directory, or `npm run test:erp:receiver -- <configuration path>` in the checkout. It needs no database or operator credential. The quickstart does not claim vendor ERP compatibility, production TLS/egress verification or measured freshness.

## Earlier public integration examples


## P25 public sender consumer slice

Use Node 24.19/npm 11, `npm run db:local:start`, `npm run test:outbox`, `npm run outbox:demo`, then `npm run test:erp:outbox -- .local/phase-25-demo.json`. The demonstration uses real isolated PostgreSQL and HTTP, commits actual intake/outcome/correction/return events before sender startup, loses the first receipt response and redelivers the same bytes/ID with a fresh signature. Expected: **19 unique events, 1 duplicate transmission, projection unknown**, receiver acknowledgement level **controlled-process-memory**. The fixture key in the capture is disposable, not a production credential.

Portable consumer inputs: `tests/erp-conformance/outbox.ts`, `packages/api-client/src/webhook-signature.ts`, `packages/api-client/src/schema.d.ts`, the capture and Node/tsx. Preserve relative directories when copying outside the repository. Run the checker without Tawsel DB/operator environment variables; it consumes only public captured bytes/status. `packages/api-client/src/outbox.ts` supplies live authenticated queue/detail/commands/replay. [Setup, complete headers/byte vector, versioning, overlap, endpoints and recovery](../outbox-delivery.md), [canonical schemas](../../contracts/outbox.schema.json), [evidence](../phase-25-evidence.md).

The older memory receiver below has no durable storage; use the Phase 26 consumer above for durable receipt. Captured-wire conformance does not prove projection atomicity, production TLS, ERP compatibility or freshness SLOs. Do not promote the memory harness to production.

## Phase 24 coherent reads

Ask the server operator to include `monitoringCapabilities:["monitor.read"]` in the next versioned source binding. Use the public `MonitoringClient({baseUrl, authorization})`, then `driver(driverId)`, `trip(roundId)`, `taskHistory(taskId)`, `workdayHistory(workdayId)` or `action(actionId, sourceId)`. Pass `{etag:previous.etag}` for conditional refresh; status 304 has no body. Preserve the previous data and store the new refresh time. On reconnect omit `etag`. Never compare revisions across different `scopeKey` values. Fetch each cursor page under the same filters, restarting on 409.

Run `npm run monitoring:demo`, then `npm run test:erp:monitoring -- .local/phase-24-demo.json`. [Contract and fixture boundaries](../monitoring.md). For an independent capture check, copy `tests/erp-conformance/monitoring.ts`, `packages/api-client/src/monitoring.ts`, `packages/api-client/src/schema.d.ts` and the report, preserving relative paths. With Node 24 and tsx installed, run `node --import tsx tests/erp-conformance/monitoring.ts <report.json>`. No server code or database/operator credentials are needed to check a capture. It is not native ERP or event application proof.

## P23 correction consumer demonstration

Run `npm run corrections:demo`, then `npm run test:erp:corrections -- .local/phase-23-demo.json`. The first command executes actual loopback HTTP, PostgreSQL, driver/public receiver clients, committed-response loss and API restart. The second validates captured public response/event data and negative history/double-counting controls. It does not send driver commands using an ERP token or claim live webhook delivery.

Portable consumer: copy `packages/api-client/src/schema.d.ts` and `tests/erp-conformance/corrections.ts` with their relative paths plus the report. It imports no API/database code and needs no database credentials. Corrections are explicit assigned-driver session/CSRF/device commands; ERP consumes `outcome.corrected` revision replacements. See [API and examples](../corrections.md), [mapping](field-and-status-mapping.md), and [evidence](../phase-23-evidence.md). Real ERP connector/transport verification remains future work.


## P22 public redispatch and driver branch demonstration

```powershell
npm run db:local:start
npm run db:migrate
npm run test:branches -- --maxWorkers=1
npm run branches:demo
npm run test:erp:dispatch -- .local/phase-22-demo.json
```

The real HTTP/PostgreSQL demo pauses a heading customer, records branch arrival, rejects premature resume, stops/restarts the API, runs an independent copied ERP consumer that receives two of three pieces and creates a new cycle, then resumes the same round while one old piece stays held. Driver principal/bootstrap are fixtures. The focused tests separately exercise all 50 retained stops, independent commit races, rollback and new-cycle allocation conservation. [Detailed runbook/API](../branch-interruption.md), [evidence](../phase-22-evidence.md).

For an independently hosted dedicated test scenario, copy `packages/api-client/src/{schema.d.ts,intake.ts,returns.ts}` and `tests/erp-conformance/dispatch.ts` preserving their relative paths, create an ESM package, and run the script with Node/tsx. Set `TAWSEL_ERP_API_URL`, `TAWSEL_ERP_SERVICE_TOKEN`, `TAWSEL_RETURN_REQUEST_ID` and `TAWSEL_DISPATCH_REPORT`, then invoke `node --import tsx tests/erp-conformance/dispatch.ts --live`. Use an untouched three-piece, one-line return request with exact unit allocation and a token granted `assignment.manage` plus `return.receive`; the scenario deliberately allocates two received pieces with source-authorized zero new shipping due. It mutates only that dedicated shipment. Never supply database/operator/issuer credentials to the consumer. The harness copies these files and runs that exact restricted boundary; its output/report prove the calls, not a real ERP's transactional source outbox.

Timeout/503 remains unknown: recover/replay the same command. Receipt balance revisions prevent duplicate physical transfers; source revision and fresh cycle reference prevent duplicate dispatch. Creation returns an unassigned new cycle; subsequent `assignment.receiveBatch` remains explicit and atomic. Driver branch clients use session/CSRF/device authority, not the ERP service token. New branch events are durable intent only until P25–26 transport/receiver work.

## P21 public receiver slice

Run the existing workspace with its marked PostgreSQL, then `npm run returns:demo` and `npm run test:erp:returns -- .local/phase-21-demo.json`. The demo runs a copied public-only consumer as a separate process with only URL, scoped token and request/report IDs. It tests pending reads → two of three actual receipt → duplicate/result recovery → one separately lost, plus rejected branch/quantity/revision cases. Parent HTTP tests stop/restart the API; driver auth/bootstrap is a labelled fixture. No native ERP UI, ERP transactional outbox, signed transport, physical-device or production claim.

For a separately prepared dedicated untouched three-piece request, copy `packages/api-client/src/{returns.ts,schema.d.ts}` and `tests/erp-conformance/returns.ts` preserving their relative layout, use Node 24 and the workspace-pinned tsx runtime (or compile the public TypeScript), then run:

```powershell
$env:TAWSEL_ERP_API_URL='https://your-test-tawsel.example'
# Supply TAWSEL_ERP_SERVICE_TOKEN privately; never commit it.
$env:TAWSEL_RETURN_REQUEST_ID='<dedicated-three-piece-request-uuid>'
$env:TAWSEL_RETURN_REPORT='./receipt-proof.json'
node --import tsx tests/erp-conformance/returns.ts --live
```

This command **mutates that dedicated request**: receives two and records the third lost. It requires explicit return.receive/return.dispose plus the existing integration configuration read grant; missing setup fails clearly. A rerun uses a fresh dedicated offer, because the first has already settled. The exact command/result/event mapping and unknown-response rules are in [returns.md](../returns.md). The consumer uses no Tawsel database, operator token, issuer credential, Engine adapter or backend module. P26/P27 still own durable separate-database ERP inbox/outbox and full native two-way proof.


## P19 closure/carry-forward consumer check

Run `npm run workdays:demo`, then `npm run test:erp:workdays -- .local/phase-19-demo.json`. The first command uses actual loopback HTTP, public intake, manual plans and a disposable PostgreSQL database with labelled session/issuer fixtures. The second imports only public contract types and inspects the resulting protocol; `npm run test:erp:workdays` checks captured canonical examples. No real ERP receiver or signed transport is claimed.

Preserve task/cycle/attempt/earliest references when handling `round.ended` / `workday.ended`; do not reset a source shipment, resubmit held work, mark return received or settle money. The event payload includes only your integration's tasks. The driver browser uses `ClosureClient.endRound/endDay/result/summary/carryForward` with human session + CSRF, not ERP service authority. Keep an exact command pending after offline capture, HTTP 202 or lost response; recover the same ID. P34 supplies the complete device journal/start barrier. [Precise endpoints, units, demonstration and handoff](../workday-closure.md).


## P18 human execution consumer — 24 September 2026

Use `packages/api-client/src/eligibility.ts` (`EligibilityClient`) with generated public types. Select the company/personal browser session; use `read(roundId)`, then `defer`, `retry`, `activate` or `urgency` with the exact revisions and owner context described in [eligibility API](../eligibility.md). Keep the original action ID/request; use `result(actionId)` or identical resubmission after uncertainty. These are assigned-driver APIs, not ERP bearer-token commands.

`npm run eligibility:demo` exercises real HTTP readiness/start, refusal with 50 EGP shipping, lost-response retry recovery, subsequent delivery with 300 EGP goods, and future urgent work denied activation. `npm run test:erp:eligibility -- .local/phase-18-demo.json` independently checks public wire semantics and cumulative reported money. `npm run test:erp:eligibility` checks canonical examples only. The demo uses disposable real PostgreSQL and labelled identity/bootstrap; no browser interaction, live Engine, receipt, real ERP or signed-event transport is claimed. For return-required work use explicit retry; for unresolved deferred work use activation. Preserve old attempts and source identity on the consumer side.

P15 consumers: [online start and exact request/recovery sequence](../round-start.md), [canonical examples](../../contracts/examples/README.md), [portable session client](../../packages/api-client/src/rounds.ts). Run `npm run test:erp:rounds` for public-only conformance and `npm run rounds:demo` for an isolated real HTTP/session/PostgreSQL demonstration (signed issuer fixture, no live ERP/Engine). The latter closes the API for an unsuccessful offline attempt, discards a committed response and recovers the same owner after restart. Source apps must honor departed rejections and `editable=false` on newly received active work. `round.started` is only durable outbound intent until P25. P34 will integrate the complete pending-action journal; do not infer local queue readiness from connectivity.

## Phase 14 manual and validated-route consumers

Run `npm run planning:policy:demo`, inspect `.local/phase-14-demo.json`, then `npm run test:planning` and `npm run test:erp:planning`. The demo uses real isolated PostgreSQL and controlled HTTP providers, removes its database and preserves three identified forecasts. For a human session, call `client.plans(driverId)`, then `client.command()` with `planning.setManualOrder`, expected settings/input/manual revisions and either complete `order` IDs or `select-first`. Reuse the exact envelope after uncertain delivery. [Payload, error and continuation examples](../route-policy.md). Canonical `p14-*` examples and the public-only conformance checker cover ready, urgent partial and unknown-time manual plans. Real HTTP/session/API-restart tests exercise this same typed client. No external ERP, live Engine or signed webhook proof is claimed.

## Phase 13 planning consumers

Run `npm run planning:demo` for a disposable real-PostgreSQL demonstration with explicitly labelled HTTP Engine fixtures. `.local/phase-13-demo.json` contains inspected committed job/plan/forecast/replan-intent rows; the demo removes its test database. `npm run test:planning` proves process kill/recovery, delayed stale results and publication atomicity. `npm run test:erp:planning` runs public-only schema-example semantics; the same checker runs on actual stored plans. No real road-route or external-ERP delivery proof is substituted by these fixtures.

Copy `packages/api-client/src/planning.ts` with generated `schema.d.ts` for a human same-origin session consumer. Instantiate `new PlanningClient('personal')` or `'company'`, call `plans(driverId)` for settings revision/latest job, submit a canonical `planning.saveDraft` envelope, retain it until acceptance is known, then poll `job(result.response.body.job.jobId)`. `requestPreview`/`requestReplan` use the same command method. Reuse the exact action ID after unknown delivery. An intentional retry after terminal failure is a new command; old history remains queryable. [Full command fields, statuses and runbook](../planning-jobs.md).

ERP bearer consumers continue using source intake/assignment APIs. `planningStatus=complete` is a provider candidate, never active start or completed delivery. `plan.revisionPublished` is only a pending source-scoped notice in this phase. Browser-session planning transport is verified over real HTTP after API restart with a signed issuer fixture; native ERP UI, production issuer/Engine, signed sender and independent event receiver remain later verification.

## Phase 10 public intake consumer

The reproducible no-setup consumer proof is npm run db:local:start, then npm run intake:demo. It uses real isolated PostgreSQL and HTTP, copying only public client/types/conformance code into a separate working directory/process. Source/user projections are labelled fixtures; Engine/issuer login/native ERP UI are not exercised. The isolated database is removed at completion, and the private command journal remains in the printed temporary directory. [Exact behavior and limitations](../b2b-intake.md), [actual run evidence](../phase-10-evidence.md).

For an independently provisioned dedicated test driver, copy packages/api-client/src/{schema.d.ts,intake.ts} and tests/erp-conformance/intake.ts preserving their relative paths. Use Node 24 with the pinned tsx runtime and a package.json with type=module. Supply a private JSON configuration with apiUrl, token, tenantId, integrationId, branchExternalId, driverExternalId and dedicatedTestDriver=true. No operator, database or issuer-admin credential belongs in it. Set TAWSEL_INTAKE_CONFIG to its path and run node --import tsx tests/erp-conformance/intake.ts (repository shortcut: npm run test:erp:intake). The source needs both explicit intake grants and P08 branch/driver mappings. Configuration/discovery/provisioning setup remains below.

The runner refuses an already-held driver, journals each command before HTTP, verifies snapshot → prepared → received, same-address independence, retry/result recovery, revision/withdrawal, 49+2 whole rejection and unsupported deposits, and withdraws only the work it accepted. It leaves unassigned rejected test snapshots/history for inspection. A failed run retains its journal; reconcile those action IDs and withdraw its accepted test records via public APIs before rerunning. Do not delete a journal and assume a timeout meant rejection. The driver must be dedicated because the test deliberately fills its remaining-stop capacity.

Canonical p10-* examples live in contracts/examples. Public error distinction: contract/credential Problem before admission versus durable rejected ActionResult for capacity/version/lifecycle failures; GET results=202 pending means no committed result visible. Full/compacted historical results follow P05. The six command and three read operations are defined in OpenAPI and the mapping, not private application imports.


> P09 boundary: `/api/v1/independent/tasks*` is implemented for an authenticated **personal browser session** only. An ERP/service credential cannot use it, and its simple optional collection/address shape is not the P10 B2B snapshot/admission contract. ERP consumers use the P08 provisioning and P10 source operations described here.

The remainder describes P08 provisioning setup. P10 task intake is implemented above; event receiver/source databases and the complete two-way mock remain P25–P27. Production release/vendor interoperability remain unverified. [Provisioning contract](../provisioning.md) defines trust, revisions, recovery and limits; [phase evidence](../phase-08-evidence.md) records actual runs.

## Local reference setup

Use Node 24.19.0, npm 11.1.0 and the existing locked dependencies. On Windows, `npm ci`, `npm run db:local:start`, `npm run db:migrate`; start the real local Keycloak/Mailpit with [P07 setup](../identity.md). Do not run Engine imports or reset existing issuer data.

1. `npm run provisioning:local:setup` creates two uniquely named labelled company users at the running local issuer, private `.local/provisioning/setup.json`/`consumer.json`, and `.env.provisioning.local`. It uses the **local test-control** issuer client; it is fixture tooling, not production administration. Re-running retains identities/passwords/action IDs. No secret is printed.
2. Stop the old manually started application API if it still occupies port 3001. Start this revision with:

   ```powershell
   $env:TAWSEL_API_HOST='127.0.0.1'
   $env:TAWSEL_API_PORT='3001'
   node --env-file=.env.database.local --env-file=.env.identity.local --env-file=.env.provisioning.local --import tsx apps/api/src/main.ts
   ```

3. In another terminal, `npm run provisioning:bootstrap` submits the operator source/subject reservation over HTTP. `npm run provisioning:demo` then runs only as the scoped ERP credential: company → Cairo/Giza branches → configurable role → two users → two driver/vehicle references → deny monitor.read and allow reports.read for driver-1. The role capability array can be chosen in consumer.json **before the first run**. Subsequent edits need newer source revisions, not a changed retry envelope.
4. `npm run provisioning:worker:once` twice processes the two pending users. `node --import tsx packages/api-client/examples/provision-company.ts status` shows ready/enabled, attempts and stable IDs. No ready result is assumed while the issuer is down.
5. Start/reuse the P07 web server at exactly [localhost:5173](http://localhost:5173). Company code is `P08LOCAL`. Read the generated usernames/password locally from setup.json; never commit or paste that file. Both branches and the projected driver belong to the actual session; driver-1 has execution.own/reports.read and its explicit monitor.read denial.
6. `npm run test:erp:provisioning` exercises real public HTTP discovery, stable retries, conflicting actions, forged actor/wrong source, disable/stale-revision rejection and status. It creates a unique conformance branch and leaves it disabled. `npm run test:browser:provisioning` runs the real Keycloak/browser provision → login → role change → disable flow, verifies issuer sessions are revoked, and intentionally leaves driver-1 disabled. It restores that driver's membership through a **newer public revision** at the start of each rerun, so it is repeatable. Driver-2 remains available.

The browser test captures two P08 account/denial screenshots under output/playwright. These use the existing account UI. No mock administration UI or fleet module is added. Production SMTP/TLS, target phones and owner review remain separate.

## Independent connector inputs

Publish/copy `packages/api-client/src/schema.d.ts`, `src/provisioning.ts` and `examples/provision-company.ts`, or use another language against canonical OpenAPI. The TypeScript example needs Node and a TypeScript runner such as the repository's pinned tsx; it imports only those public files and Node built-ins. Set `TAWSEL_PROVISIONING_CONFIG` to a private JSON config containing apiUrl, tenantId, integrationId, token, companyCode, the operator-reserved users' subject/username references, and roleCapabilities. The operator performs bootstrap separately. The ordinary consumer needs neither the operator token nor issuer admin/database credentials.

Run the example in its own directory/process. It writes `<config>.journal.json` **before sending**, retaining each immutable command across uncertain responses. Keep that journal on durable source storage; do not delete it to retry a timeout. The example is a reproducible CLI fixture, not P27's transactional ERP source outbox. Production connectors must commit their own business change and outgoing intent together.

The available `tests/erp-conformance/provisioning.ts` uses only the public HTTP client/config and may also be copied with the public client. Run `node --import tsx tests/erp-conformance/provisioning.ts`. It requires a provisioned service credential; it does not bootstrap via database access or substitute a fake API. For malformed-body/type conformance use `npm run test:contracts`; for application transaction/process guarantees use `npm run test:provisioning` and `npm run test:database` against isolated PostgreSQL. These are separate kinds of evidence.

## Valid and denied examples

- Valid role definition and user/branch/driver/exception envelopes are the `p08-*` entries in [valid.json](../../contracts/examples/valid.json). Copy their structure, replace IDs with your authenticated source, generate an action UUID, and persist the envelope before POST. The sample secretHash is schema data only, never a usable deployed credential.
- Add `context.assertedActorId` or `payload.actor_id`: `400 validation_failed`. A valid credential with another integrationId in the context: `403 forbidden_resource`. An unreserved issuer subject: rejected ActionResult with 403 and no effective user binding.
- `user.disable` at revision 12 followed by a **fresh action** user.provision at revision 11: `409 stale_revision`, membership stays disabled. An exact replay of the original older accepted action returns its historical receipt and also leaves current membership disabled.
- Change role permissions at the role's next revision: inherited access changes on the existing login session; direct user allow/deny persists. Branch disable removes that branch from current access. User re-enable needs a higher user revision and completed issuer verification.
- Issuer unreachable after acceptance: query status to observe retry, attempts and nextAttemptAt. Retain the accepted source command; repair issuer connectivity and let the worker reconcile. Do not resend it with a fabricated new actor or mark ERP's account ready.

Rotation is an ordinary source command with a fresh credential ID/hash, next source revision and bounded overlap. Generate/store the new raw secret **before** sending. If the response is lost and overlap has expired, use the new credential to retry the same envelope. Lost-all-credentials or source-disable recovery uses operator-authenticated rotateCredential with recover=true and a newer source revision; no self-service backdoor. Disabling a source stops connector access without deleting the company's user history.

## P11 location review and conformance

The reviewer uses a same-origin personal/company browser session and CSRF bootstrap; do not reuse the P08/P10 bearer credential as a human. Copy src/locations.ts with the generated schema.d.ts for the public typed LocationClient. Persist each exact LocationConfirmCommand until its result is known. See [reproducible location/map demo](../locations-and-maps.md).

An ERP source still supplies its original destination through P10; task reads now reflect execution-location readiness. location.pinConfirmed is durably recorded for that source but is not delivered until P25. tests/erp-conformance/locations.ts checks usable coordinates, source/current-confirmation alignment and pending input revision; P11's real PostgreSQL suite invokes it on an actual result and validates stored event payloads against canonical JSON Schema. This is local conformance evidence, not an independent real ERP connector or signed-receiver test.

## P12 profile read and routing model conformance

With an authenticated Tawsel browser session, use `fetch('/api/v1/routing/profiles?kind=company', { credentials: 'same-origin', cache: 'no-store' })` (personal accounts use `kind=personal`). Current planning.manage or execution.own is required. The result lists all three modes and explicitly does not check live Engine availability. Never embed private OSRM/VROOM URLs into ERP code or interpret this response as a published plan.

Copy the generated `packages/api-client/src/schema.d.ts` plus canonical `routing.schema.json`/`common.schema.json` for model validation. `tests/erp-conformance/routing.ts` consumes only generated public types and checks ID coverage, partial-state semantics, estimates and absence of policy approval after schema validation. Run `npm run test:erp:routing`; this is controlled consumer evidence, **not live ERP planning interoperability**. `npm run engine:demo` separately exercises fixture-backed internal adapters. Actual planning HTTP contracts/jobs and route policy remain P13/P14. [Boundary](../engine-boundary.md).

## Phase 16 current/arrival consumer

Run `npm run current:demo`, then `npm run test:erp:current -- .local/phase-16-browser-demo.json`. The first drives real Chromium/HTTP/PostgreSQL with labelled account and planner fixtures; the second imports only public types/assertions and checks that actual report. Without a report, `npm run test:erp:current` checks canonical examples only. Neither proves native ERP/event transport.

Copy `packages/api-client/src/{schema.d.ts,current.ts,rounds.ts}` and `tests/erp-conformance/current.ts` preserving relative paths. `CurrentClient` uses a human driver browser session and CSRF, not source bearer credentials. [Exact endpoint/envelope/retry sequence](../current-activity.md) and [mapping](field-and-status-mapping.md) distinguish current versus next, retained action-time provenance and physical origin. Treat heading/arrival intent as execution activity, never delivery/collection or inferred contact. P25 signs/delivers and P26–27 verify the external receiver/source.
## P17 outcome consumer addition — 24 September 2026

Use [outcomes.md](../outcomes.md) for the six implemented human-session operations, exact amounts and stable action recovery. Canonical `outcomes.schema.json` owns requests/results/events; generated OpenAPI/client types refer to it. `packages/api-client/src/outcomes.ts` supplies the portable session client. ERP service credentials are not a driver identity.

```powershell
npm run test:erp:outcomes
npm run outcomes:demo
npm run test:erp:outcomes -- .local/phase-17-demo.json
```

The first command checks public examples and deliberately invalid quantities/money. The demo uses two independent ERP shipments, real loopback HTTP start/current/outcome commands and isolated PostgreSQL; identity/bootstrap is explicitly a fixture and the plan is genuinely manual. It reports two accepted pieces for EGP250 plus a phone-only no-answer on the other task, four held return-required pieces and unchanged physical origin. A successful response is discarded and recovered with the original action. The last command checks actual public JSON with no server/domain/database imports. No real shipping ERP, signed event transport, production session setup or physical phone is claimed by this demo.

When consuming the pending `outcome.recorded` payload, preserve original outcome/action/attempt identities and external cycle/line references. Treat partial remainder as held return-required, never customer-retry stock; distinguish reported money, explicit unpaid shipping and no collection claim. Schema acceptance is not receiver application. P25–27 supplies signed transport/inbox and native mock integration; P42 packages release artifacts. Earlier phase-specific limits are historical to their dates.
# Phase 20 two-device consumer check

Run `npm run devices:demo`, then `npm run test:erp:devices -- .local/phase-20-demo.json`. The report comes from separate OIDC application sessions, actual loopback HTTP/PostgreSQL, lost-response recovery and API restart; the signed issuer is a fixture. With no report argument, `npm run test:erp:devices` checks captured canonical example semantics only. The conformance module imports public types and needs no database, issuer or operator credentials.

`packages/api-client/src/devices.ts` is a same-origin **driver session** client, not an integration bearer adapter. Persist its confirmed snapshot before enabling new-generation commands. Treat evidence receipt and duplicate transport separately from business acceptance. ERP-side correction consequences/receipt producers remain external/later phases. [Full protocol, constraints and limits](../device-ownership.md).
