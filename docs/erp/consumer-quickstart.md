# Public ERP consumer quickstart — provisioning and intake

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
