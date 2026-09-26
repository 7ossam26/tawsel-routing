# Integration guide — as-built public boundary

Phase 42 local candidate. Start with the [handoff](ERP-INTEGRATION-HANDOFF.md), [planning input](erp/ERP-PLANNING-INPUT.md), [mapping](erp/field-and-status-mapping.md) and [clean consumer quickstart](erp/consumer-quickstart.md). [Final integration evidence](verification/integration.md) identifies actual local proof and its limits. API/client version is 0.1.0; action/event/payload readers use 1.0.0. This is not a deployed or vendor-certified release.

## Ownership and access

ERP owns commercial records, source identifiers, branches/users/roles/driver profiles, preparation and definitive received assignment, native actual receipt/disposition, inventory and settlement. Tawsel owns accepted execution snapshots, cycles/attempts, workdays/rounds, plans/forecasts, explicit activity/outcomes, reported collections, progress, evidence and outbound execution events. Shared company identity uses the trusted issuer with separate ERP/Tawsel clients and sessions.

A connector uses public URLs, schemas and credentials. Its persistent outbox/inbox and identity mappings belong in its own storage. It does not need Tawsel tables, domain imports or private Engine access. The provided TypeScript client and native mock demonstrate this boundary; vendor mechanisms, fields and identities remain choices for the separate real ERP project.

Browser session APIs, public ERP APIs, operator-only diagnostics/provisioning bootstrap and consumer-owned APIs have distinct credentials and owners in [OpenAPI](../contracts/openapi.yaml). Native `/native/*` forms are private reference implementation details. `/health` is workspace liveness. No fixture identity header is accepted by production handlers.

## Bootstrap and source sequence

1. The Tawsel operator binds a tenant/integration and immutable reserved issuer subjects with `integration.bindSource`. Out-of-band operator credentials stay outside the consumer. Command credentials, status credentials, signing secrets and browser session secrets are separate. Configure exact allowed callback destinations and key IDs using [provisioning](provisioning.md) and [sender setup](outbox-delivery.md).
2. The source projects branches, one role per user, exceptions, memberships and driver profiles using monotonic source revisions. Same revision/content is stable; conflicting content and older updates are rejected. Local access revocation commits before separately reconciled issuer logout. Inspect pending/retry/ready issuer state; acceptance is not issuer readiness.
3. Explicit service commands carry verified service identity and `actorId=null`. Arbitrary `assertedActorId` does not grant human authority. Native reference forms record their own verified OIDC staff subject, then enqueue the permitted service command. Driver-owned execution uses a separately authenticated Tawsel session, CSRF and current device authority.
4. Persist scoped external shipment/line/dispatch references and Tawsel UUIDs; task, cycle, assignment, round, attempt, action and event IDs are distinct. Phone/address equality never merges tasks. Source IDs are not recycled for unrelated goods.
5. Submit the exact [B2B source snapshot](b2b-intake.md): contact/address/location provenance, source revisions, source branch/driver, whole-piece lines, splitting flag and exact supported due allocation. Personal intake is a separate simple B2C session boundary with no item splitting or branch custody.
6. Preparation has no driver custody. Definitive received assignment asserts actual receipt and passes whole-batch admission. A rejected batch creates no partial acceptance or phantom holder. Source pending stays pending across HTTP failure; retry the immutable original action. Accepted custody survives Engine outage independently of planning status.
7. Predeparture source changes race with online start under the same invariant locks. After departure, staff cannot change execution contents/details/urgency. The assigned driver executes; narrow original-source-branch receipt/disposition operations remain available. Fresh dispatch requires actual receipt and a new cycle. Never reopen the old cycle or directly transfer between drivers.

## Quantities, money, time and revisions

Use [field mapping](erp/field-and-status-mapping.md) and [state consistency](tracking-and-consistency.md) for per-entity details. UUIDs are lowercase; opaque external IDs are scoped and bounded. Empty string, missing and null are distinct. Full source snapshots preserve explicit field-clear rules; optional input does not imply zero or permission.

Quantities are nonnegative whole pieces within exact integer bounds; goods operations require positive supported quantities. Delivered, held, requested, actually received, lost and damaged are distinct. Receipt creates stock; return intent and loss do not. Money commands use exact minor units/currency/exponent; report totals use decimal integer strings. Current source policy supports EGP, exponent 2. Do not add floats, infer payment allocation or sum unlike currencies. Reported collection is not settlement.

Times are UTC RFC3339 `Z`; display uses `Africa/Cairo`. Device observation/clock quality, server receipt and business commit timestamps are separate. Route, source, assignment, outcome, device and report snapshot revisions are independent. Route reorder alone does not reject compatible execution; changed content, actual receipt dependencies, owner generation and day closure can.

## Durable commands and recovery

Scope command identity by tenant, stable authenticated source and action ID. Same semantic content returns the durable prior result; changed content conflicts. Preserve original bytes, versions, dependencies and identity after an uncertain response. Use the public action-result/read/replay surface appropriate to the operation. Full results have a minimum 30-day floor; compaction retains identity, receipt and minimal recovery references. No scheduled purge is installed.

Accepted mutations atomically commit state, history, audit, command result and outbound intent in real PostgreSQL transactions. HTTP to the issuer, Engine or ERP runs outside those transactions with durable intent/lease fencing. Evidence receipt may remain pending/rejected/review-required without business acceptance. Source-command state, webhook receipt and consumer application are separate facts.

Errors use the canonical Problem shape and operation-specific codes. Reauthenticate on 401; reconcile authority on 403, named conflicts on 409 and supported input on 422. Retryable dependency failure retains the original action. Do not change account IDs or action IDs to escape rejection. A valid generic envelope alone is insufficient: validate the closed operation payload and authenticated authority.

## Signed events, receiver application and replay

The [sender protocol](outbox-delivery.md) owns exact headers, HMAC-SHA256 byte input, scope/time/key checks, overlap, destination policy, pagination and recovery. Canonical supported types are in [sender-event.v1](../contracts/events/sender-event.v1.schema.json); [the exact signature vector](../contracts/examples/webhook-signature.v1.json) is tested. Verify the original bytes before parsing; never reserialize for signature verification.

Events have immutable IDs/body bytes and contiguous sequences per recipient-visible aggregate. A retry uses the original body and fresh delivery timestamp/signature. Domain revisions and recipient sequences are different. Default sender leases are 30 seconds with bounded retries; failed recipients do not starve healthy ones. Private-address/redirect/DNS checks apply except explicit isolated loopback testing.

The independent [receiver](erp/receiver-protocol.md) validates signature/schema/scope, commits a durable inbox before returning the exact acknowledgement, and atomically commits projection/history/processed markers. Applied progress is reported through separately authenticated checkpoints. Sender `projectionStatus=unknown` does not override those reports. Duplicate identical events are harmless; changed bytes under the same identity are rejected. Gaps/dependencies remain pending until replay/reconciliation resolves them.

Retained replay returns original messages. Current-snapshot reconciliation preserves `historyComplete=false` when required historical transitions are unavailable; it does not invent accounting history. No automatic event purge is installed. Reserved `progress.snapshot` and `integration.applicationReported` webhook names are not emitted; coherent HTTP snapshots and authenticated applied-checkpoint reporting serve the current use cases.

The [native source](erp/source-protocol.md) commits desired state, verified staff audit and an immutable outgoing action together in its own database. Its leased worker uses public HTTP and recovers uncertainty with the same action. Native actual receipt and separate loss/damage use the original branch and exact offered subset; redispatch consumes only confirmed received stock.

## Compatibility and offline evidence

HTTP major path, package version, envelope/payload version, migrations, local Dexie schema and report-definition version are separate axes. Common envelopes retain an extensible payload slot; implemented operation/event payloads are closed. Extra fields are not automatically compatible. Preserve readers or publish a new negotiated version; never reinterpret missing amounts or silently acknowledge an unknown event as applied.

P34/P35 retain original offline v1 envelopes and Dexie v1→v2 migration with explicit same-account reauthentication and safe update ordering. Keep old hashed assets while supported clients may need them. Do not force reload/clear site data with pending work. Roughly 24 offline hours is a support target, not an evidence expiry timer. Received former-device/expired-session evidence remains distinct from accepted business state; current authority and bounded correction rules still apply.

## Reproduction and limits

`npm run contracts:check`, `npm run erp:audit`, `npm run erp:package` and `npm run erp:verify` validate the final artifacts. Follow the quickstart for external installation, required public inputs and the two-task source/driver/report/return/receiver proof. `npm run source:demo` is the separate operator orchestration for existing local PostgreSQL/Keycloak; it installs public artifacts into a clean external directory.

See [recorded results](verification/integration.md) and [readiness](verification/pilot-readiness.md). Physical devices, an actual elapsed offline day, owner review, live Engine profiles/data, target capacity/deployment/TLS/email/private callback topology and independent recovery remain outstanding. No real ERP compatibility is inferred from the reference consumer.
