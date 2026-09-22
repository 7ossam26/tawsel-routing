# Public ERP consumer quickstart — provisioning and intake

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
