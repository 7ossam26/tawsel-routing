# Field and status mapping — canonical foundation

## P14 planning mapping

| Public value | Consumer meaning |
| --- | --- |
| Plan `draft` / `policyValidated:false` | Retained P13 candidate; not approved for start |
| Plan `ready` / `policyValidated:true` | Complete current/urgent/eligibility/endpoint/capacity validation; still no start |
| Plan `partial` + `routePolicy.exceptions` | Explicit affected task IDs; not a ready complete route |
| Plan `manual`, null `jobId`/`candidate` | Explicit complete eligible order; road distance/geometry and ETA unknown |
| Forecast member `manual` | Preserved task/attempt identity and position, null arrival/completion |
| Job `resultKind` | full / partial / invalid / dependency-failed / null, separate from lifecycle |
| `plans.inputRevision` / `manualRevision` | Optimistic manual-command guards alongside settings revision |
| `plans.continuation` | Rechecked retained sequence; requires manual confirmation, no transplanted road metrics |
| Publication ready/partial/manual | Source-scoped pending intent only; P25 sends, P26 receives |

[Complete semantics and constraints](../route-policy.md). The existing source-assignment/status boundary is unchanged; ERP-specific translation stays in the connector.

## P13 stored draft/job/forecast mapping — 23 September 2026

| Tawsel field | Consumer meaning / ownership |
| --- | --- |
| `PlanningJob.jobId`, `status` | Stable durable poll identity and actual calculation state across API/worker restart; no ERP receipt reversal |
| `blockedReason`, `error`, `nextAttemptAt`, `leaseExpiresAt` | Explicit missing input, safe provider failure and recovery timing; not fabricated success |
| `supersededByJobId` | Current replacement work after inputs changed; old result cannot become effective |
| `inputRevision`, `settingsRevision`, `executionRevision`, `manualRevision`, `locationInputRevision` | Separate monotonic generations; fingerprint includes current choices plus per-member source/assignment/pin revisions |
| `planId`, `revision`, `state=draft`, `policyValidated=false` | Stored normalized candidate, not policy-approved active round; P14/P15 own those transitions |
| `current`, `inputCurrent` | Last stored draft pointer and whether its source inputs still match; neither authorizes departure |
| `forecastId`, `workloadId`, `timeOrigin`, `kind=planning-estimate` | Immutable estimate identity/scope/UTC anchor, not an actual start or first-start baseline |
| member `taskId`, `attemptId`, `dispatchCycleId` | Shipment, stable initial visit identity and B2B cycle, kept distinct; attempt allocation is not arrival |
| `assigned/unassigned/excluded`, expected times | Preserve coverage and missing predictions; partial whole-workload finish and unassigned/excluded stop times are null |
| `plan.revisionPublished` | Atomic source-scoped identity notice with candidate status; no mixed-source task list, delivery or application assertion |

`planningStatus` in existing intake/location reads now uses the durable latest job. Existing `planningEligible` remains an admission/pin fact, not proof of optimizer success. No ERP financial/inventory/physical-holder state changes through planning. See [wire semantics and locking handoff](../planning-jobs.md), [schema](../../contracts/planning.schema.json), [evidence](../phase-13-evidence.md).

## P10 shipment/intake mapping — implemented and locally verified

[Canonical payloads](../../contracts/b2b-intake.schema.json), [wire operations/revision rules](../b2b-intake.md), [public consumer](consumer-quickstart.md) and [PostgreSQL/HTTP evidence](../phase-10-evidence.md) define this implemented slice. Other execution/return/transport rows remain designed. Real vendor field names remain unchosen.

| External field/fact | Required / optional and public mapping | Authority, scope and revision rule | Real ERP field |
| --- | --- | --- | --- |
| Shipment externalId | Required, nonempty 1–256; source-scoped → opaque taskId UUID | ERP identity, immutable within tenant/integration; same coordinates do not merge tasks | Unchosen |
| sourceOrderReference | Optional, 1–256; omitted means no order link, null invalid | ERP commercial reference only; not task identity or grouping | Unchosen |
| sourceDispatchCycleId | Required, source reference within a shipment → dispatchCycleId UUID | One P10 cycle; preserved across predeparture removal/reassignment; actual-return redispatch remains P22 | Unchosen |
| sourceRevision / expectedSourceRevision | Required safe integers; positive new revision, expected 0 initially/current revision afterward | ERP snapshot/urgency stream; exact duplicate current revision is no-op, conflicting content/stale base rejected | Unchosen |
| sourceBranchExternalId | Required; P08 branch mapping → source branch UUID | Must belong to credential source and be enabled/authorized; immutable origin per shipment | Unchosen |
| recipientName / recipientPhone | Required; 1–200 nonblank name, E.164 or Egyptian mobile | Source snapshot authority before departure; history retains old values | Unchosen |
| destination | Required closed address or confirmed-pin object; addressText required for address, coordinates required for pin; pin label optional | Immutable versioned original source input. Address-only remains needs-resolution. Pin is a source assertion, never GPS/geocoder evidence; P11 owns execution-location changes | Unchosen |
| instructions / earliestAt | Optional nonblank ≤1000 text / UTC instant; omit for none/current availability; null invalid | ERP predeparture source fields; future-held work is not automatically admitted when time elapses | Unchosen |
| priority | Required ordinary/urgent | ERP predeparture source revision; departure locks ordinary staff/source edits | Unchosen |
| splittingAllowed | Required explicit boolean | Only ERP grants piece splitting; never inferred from line count | Unchosen |
| allocation | Required exact-outstanding-per-unit | Source asserts unit/fee amounts already account for commercial adjustments/prepayment | Unchosen |
| lines | Required 1–100 entries; distinct stable sourceLineId, description 1–200, quantity 1–1,000,000 whole pieces, unitDue | ERP owns quantity/price snapshot. Per-piece differences require stable distinct allocation/line references; no fractional pieces or invented allocation | Unchosen |
| unitDue / shippingDue / totalDue | Every amount required explicitly, amountMinor integer 0–9007199254740991, EGP/exponent 2 | Matching currency/exponent and exact sum required. Zero is explicit prepaid/zero due, not a missing default. No settlement/payment verification | Unchosen |
| driverExternalId | Required on preparation/receipt/reassignment; resolves through source's P08 mapping | Driver/account/membership enabled, belongs to every source branch; raw foreign UUID/other-source reference cannot select a holder | Unchosen |
| expectedAssignmentRevision / assignmentRevision | Required per batch item/change; initial expected 0, next greater positive revision | Separate stream across prepare/receive/remove/reassign; snapshot revisions do not increment assignment stream | Unchosen |
| receiptAsserted | Required true for receiveBatch; required matching held=true/prepared=false on reassignment | ERP definitive assignment asserts physical receipt. Tawsel records that assertion, not independent proof of possession | Unchosen |
| unassigned / prepared / held / withdrawn | Current state from getTask/listTasks | Prepared=upcoming and receivedAt=null; held=accepted receipt; withdrawn retains history and no holder; none means delivered/returned/settled | Unchosen |
| receivedAt / editable | Server receipt-commit transaction timestamp / departure field guard | Client observation is separate evidence, never ordering authority. Real start/admission race closes in P15 | Unchosen |
| planningEligible / planningStatus | Reserved remaining-input eligibility / not-requested or pending | No optimization/execution success claim. Future/unresolved/prepared excluded. Engine work arrives P13 | Unchosen |
| actionId and command result | Stable ActionEnvelope identity; getBatchResult or same-command replay | Source pending until known; accepted/rejected durable locally. Unknown/in-flight GET=202 pending with no result, not confirmed receipt | Unchosen |
| events | task.snapshotAccepted, assignment.prepared/received/withdrawn/reassigned, task.urgencyChanged | ChangedEvent payload records actionId + committed task projection, own-source outbox intent. Signed envelope/recipient sequence delivery belongs P25 | Unchosen |

Worked public workflow: submit shipment-100/cycle-1 revision 1 expected 0 → task/cycle UUIDs, unassigned. prepare assignment revision 1 expected 0 → prepared, not held. receive revision 2 expected 1 plus expectedSourceRevision=1 and receiptAsserted=true → held, pending planning. Normal withdrawal revision 3 expected 2 → withdrawn, original source/assignment history remains; no reason or driver handover form.

Worked rejection: driver already has 49 remaining customer/branch slots; submit a receiveBatch containing shipment-101 and shipment-102. HTTP 409 ActionResult reports capacity_exceeded for the entire batch, and neither obtains an assignment or route slot. Existing prepared inputs stay prepared; unassigned inputs stay unassigned. Retrying that action returns the same rejected result even after capacity changes; deliberately corrected intent uses a new action with current revisions. Different same-address shipment IDs remain independent. Fractional quantity gives validation_failed; depositMinor without exact allocations gives unsupported_price_allocation; stale source/assignment base gives stale_revision. Concrete valid/error wire data is under p10-* in the canonical examples.

Immutable snapshots and line rows retain the full supplied outstanding amounts. For 3 × 10000 + shipping 5000, totalDue=35000; a valid source-allocated partial prepayment can instead be 3 × 5000 + shipping 2000=17000. No averaging, equal allocation or unallocated deposit is accepted. The actual ERP-specific transformation must be implemented and tested by its connector.


## P08 implemented identity/provisioning mapping

[Canonical provisioning schema](../../contracts/provisioning.schema.json), [wire/trust/recovery contract](../provisioning.md), [public consumer quickstart](consumer-quickstart.md) and [actual evidence](../phase-08-evidence.md) now complete the identity slice below. P10 task/dispatch/intake rows are implemented above; execution/event delivery remain designed. Real vendor fields remain **unchosen**.

| ERP/source field or fact | Tawsel/public mapping and authority | Revision / valid and denied behavior | Real ERP field |
| --- | --- | --- | --- |
| Company and source | Operator-established tenantId/integrationId; companyCode locates login; service credential determines scope | Source entity revision shared by bind/rotation/disable; body scope must match credential | Unchosen |
| Branch reference | branch.provision externalId → stable resourceId/branchId; name/enabled/location projection | Source-scoped; nullable location clears; branch.disable retains history and removes active access | Unchosen |
| Role | role.defineCapabilities externalId → stable role UUID; complete capabilities array | Next role revision changes inherited access; names confer no grants | Unchosen |
| User and issuer identity | user.provision externalId → account UUID; immutable configured issuer + operator-reserved subject | All user operations share one source revision; another source's or unreserved subject is denied | Unchosen |
| One role/user | roleExternalId resolves within same source | setRole replaces only role; user.provision preserves existing explicit exceptions | Unchosen |
| Exceptions and branches | exceptions use inherit/allow/deny; branchExternalIds is full assigned list | Empty arrays clear; identical effective permissions at all active assigned branches; explicit deny persists across role edits | Unchosen |
| Actor and service | VerifiedService mode=service-operation, actorId=null, tenantId/integrationId; authenticating credentialId/operator retained in audit | Raw actor_id/assertedActorId rejected. This credential never impersonates staff; human receipt remains P21 work | Unchosen |
| Driver and vehicle | driver.provisionReference externalId → driver UUID, stable userExternalId, enabled, profile, nullable vehicleReference | One driver per account, no reassignment/reuse; only car/motorcycle/bicycle execution metadata | Unchosen |
| Command acceptance | ActionResult receipt, stable summary, original response; actionId scoped to tenant/source | Exact replay returns original; changed payload same ID conflicts; same revision/content new action is projection no-op | Unchosen |
| Stale disable/re-enable conflict | sourceRevision is positive monotonic per entity, independent of envelope version | Disable revision 12 then fresh enable revision 11 → 409 stale_revision; higher revision plus issuer verification required | Unchosen |
| Issuer pending/retry/ready | provisioning.getStatus exposes issuerStatus/attempts/nextAttemptAt/lastError and enabled | Accepted is local commit only; ready + enabled=false means completed disable, not account-ready | Unchosen |
| Provisioning event | provisioning.changed payload references entity/externalId/resourceId/sourceRevision/actionId/service | Durable own-source outbox intent only; no signed transport, received/applied or sequence claim before P25 | Unchosen |

Worked valid wire inputs are p08-* in [valid examples](../../contracts/examples/valid.json); malformed actor/password/version/branch examples are in [invalid examples](../../contracts/examples/invalid.json). Runtime denied cases (wrong integration, unreserved subject, missing reference, stale enable) are in provisioning-actor.test.ts and authorization-isolation.test.ts. The public-only conformance runner and real browser demo cover HTTP and actual local issuer behavior; they do not certify an unknown ERP.


P07 session mapping, 22 September 2026 (locally implemented): issuer + opaque subject → immutable P06 account binding; company code → login locator only; `SessionContext.access.sourceId` → stable account key for display/account-local storage; `recoveryEmailVerified` → issuer email evidence, **never SMS phone ownership**; `phoneOwnershipVerified` is false. `kind=company` and `kind=personal` select separate cookies/realms, not linked workspaces. A browser session/CSRF token is not an ERP integration credential or actor assertion. Current membership can deny an otherwise valid login. The [canonical session schema](../../contracts/session.schema.json) owns exact fields; [identity guide](../identity.md) owns the flow. P10 intake is implemented above; later execution/status rows below remain designed.

P08 identity/provisioning mappings above and P07 sessions are implemented locally; P10 intake mappings above are implemented; remaining execution/return mappings below are **designed**. Common shapes/examples are schema-verified; the reference ERP and real vendor mapping are not implemented. Canonical field definitions live in [common.schema.json](../../contracts/common.schema.json); envelopes/examples remain there, not copied as another schema here. The [catalog](../contract-coverage.md) names commands/events and owner phases. A real-ERP field/status column stays explicitly unchosen.

P06 access additions (internal PostgreSQL guards verified; P07 login and P08 provisioning HTTP are now implemented):

| Field/fact | Consumer meaning and ownership |
| --- | --- |
| Issuer + subject → stable account UUID | Credential authority authenticates; Tawsel binds membership. Never match email, username or a role name to authorize. Company/personal accounts and tenants remain separate. |
| One `roleId`; `CapabilityOverride.capability/effect` | ERP administers one company role and `inherit/allow/deny` exceptions. Explicit choice overrides live inheritance equally in every assigned branch. Missing grants deny. |
| `AccessContext.tenantId/tenantKind/principalKind/sourceId` | Server-resolved display snapshot; stable source is an account or integration, never a token/device. Supplied body/query scope is checked, never authority. |
| `branchIds/driverId/effectiveCapabilities` | Active branch membership, optional active own-driver identity and capability set. Their intersection with source visibility and lifecycle authorizes each operation; the array is not a bearer grant. |
| `forbidden_resource` / `lifecycle_forbidden` | Generic 403 scope/capability denial; hidden and missing resources share 404; 409 lifecycle denial only after visibility. No hidden IDs/contacts/counts in error details. |
| Integration source and asserted actor | P06 binds a service only to its own integration/branches and rejects unverified human assertions. P08 authenticates explicit service operations with actor=null and rejects human assertions. A shared trip does not expand source visibility. |

Canonical definitions remain in [common.schema.json](../../contracts/common.schema.json), with valid/invalid access fixtures and generated consumer types. See [permission contract and guard inputs](../authorization.md), `npm run test:authorization` and `npm run access:demo`. Real ERP fields remain unchosen and the provisioning public HTTP slice is available; complete two-way conformance remains P26/P27.

P05 recovery additions (internal PostgreSQL behavior verified; public HTTP mapping still designed):

| Field/fact | Consumer meaning |
| --- | --- |
| `(authenticated tenant, stable account/integration source, actionId)` | Immutable command identity across retries, token refresh and process restarts. Never infer scope from a body field. |
| Same identity, different semantic envelope/actor | 409 `idempotency_conflict`; original history/result survives. |
| `ActionResult.retention=full`, `response.status/body` | Original persisted response, retained at least 30 days; recovery is not a second operation. |
| `ActionResult.retention=compacted`, receipt/summary | Previously finalized command; response body unavailable. Reconcile the referenced record when APIs exist; never create a new identity for the old action. |
| `receipt.businessStatus` rejected / review-required | Evidence may be durable without accepted state/progress/outbound business intent; no business committedAt. |
| Internal outbox pending intent | Transaction committed a future delivery obligation. It is neither public DeliveryStatus received nor ApplicationStatus applied. |

Examples and generated public types follow [action-result.v1.schema.json](../../contracts/action-result.v1.schema.json). P05 does not change commercial/status ownership or implement any of the domain mappings below.

## Identity, fields and state authority

Phase 03's [action map](../ui-actions.md) and [Arabic state cases](../ui-spec.md#acceptance-copy-cases) add presentation traceability only. Preserve separate fields rather than serializing a translated badge as a new ERP status:

| UI label intent | Existing canonical fact | Connector consequence |
| --- | --- | --- |
| محفوظ على الهاتف | Local action plus pending projection, not yet server evidence | Not visible in a server-only ERP projection; no accepted shipment status inferred. |
| وصل السجل إلى توصيل | EvidenceStatus `received`; business result may be `pending`, `rejected` or `review-required` | Keep evidence acknowledgement separate from applied execution facts. |
| تم تأكيد النتيجة في توصيل | BusinessStatus `accepted` | Does not mean the recipient ERP received or applied the event. |
| بانتظار تأكيد الفرع | Offered return request, no actual received subset yet | Native ERP confirms physical subset with trusted actor; request does not create stock. |
| أكد الفرع استلام قطعة | Accepted subset receipt; separate unresolved held pieces | Map actual receipt quantity only; disposal and financial settlement are different facts. |
| انتهى يوم العمل | Explicit workday closure with held carryover | Never translate into all delivered, all returned or cash remitted. |

No canonical wire field/status, example or client type changes in P03. Product routes are browser paths, not public API endpoint specifications; feature owners complete schemas in their assigned phases. Vendor-specific mapping remains unknown until connector discovery.

| Entity / public fields | Source versus Tawsel identity and authority | Required/optional/null, revision and state rules | Command / event / authoritative read; owner | Real ERP mapping |
| --- | --- | --- | --- | --- |
| Tenant/company, integration | Tawsel UUIDs bound to a source company by authorized bootstrap; source tenant/integration references never self-authorize | Tenant+integration required for source references; same external ID in another scope is independent | `integration.bindSource`, `integration.getConfiguration`; P08 | **Unknown** company/source IDs |
| Branch | ERP external branch ref ↔ Tawsel branch UUID; ERP owns configuration/disable | Versioned source updates; no branch removal erases held pieces or permits other-source receipt | `branch.provision`, `branch.disable`, `provisioning.changed`; P08 | **Unknown** branch ID/table/API |
| Company user / actor | ERP user ref and reserved issuer subject ↔ Tawsel account UUID; P08 service identity recorded with actor=null | `assertedActorId` optional envelope assertion, never authentication. Issuer audience/subject binding required by P08; stale source cannot re-enable disabled user | `user.provision`, `user.disable`, `session.getContext`; P07/P08 | **Unknown** user/subject binding |
| Role / overrides / memberships | ERP role ref ↔ one role per Tawsel company user; explicit inherit/allow/deny overrides | Same effective capability set across assigned branches; membership/lifecycle still restricts resource | `role.defineCapabilities`, `user.setRole`, `user.setCapabilityExceptions`, `user.setBranchMemberships`; P06/P08 | **Unknown** role/grant model |
| Driver / vehicle mode | ERP driver ref ↔ Tawsel driver UUID, separate from phone/device ID | Minimal execution profile; car/motorcycle/bicycle. No fleet allocator or direct driver handoff | `driver.provisionReference`, `routing.getVehicleProfiles`; P08/P12 | **Unknown** driver/profile refs |
| Task / order source references | P10 `externalId`, optional string `sourceOrderReference`, credential-bound tenant/source ↔ stable task UUID | Source/expected revision required; optional order ref omitted when absent, not empty/null. Same address/order does not merge shipments | `intake.submitSnapshot`, `task.snapshotAccepted`; P10 verified | **Unknown** order/shipment identifiers |
| Contact snapshot | P10 required recipientName and recipientPhone; ERP customer master stays external | Snapshot strings are not person identity. P09 personal intake and P10 company source intake use separate authorities; no externalCustomerReference field is implemented in P10 | `task.createIndependent` verified P09; `intake.submitSnapshot` verified P10 | **Unknown** ERP customer/contact fields; do not call the personal endpoint |
| Location snapshot | Original address separate from confirmed `{latitude,longitude}` and location revision/provenance | P09 stores original written address or explicit confirmed coordinates independently and exposes `needs-resolution`/`confirmed`; unresolved address cannot execute. P11 still owns execution-location revision and real map confirmation. No GPS or inferred accuracy | `task.createIndependent`/`task.reviseIndependent` verified P09; `location.*` P11 | **Unknown** ERP address/pin/provenance fields |
| Delivery requirements | P10 optional instructions/earliestAt and required priority; future planning defaults 600s | Absence is not null; P10 does not accept serviceDurationSeconds/latestAt. Urgent cannot bypass earliest availability. Further planning settings remain P13 | `intake.setUrgencyBeforeDeparture`/`task.urgencyChanged` verified P10; driver producer P18 | **Unknown** service/priority/window fields |
| Dispatch cycle | Source dispatch ref ↔ new Tawsel cycle UUID for each redispatch; task identity retained | Prepared, received, departed and resolved separate. New cycle only from actual branch-received portion; old ledger immutable | `intake.prepare`, `assignment.receiveBatch`, `dispatch.createFromReceipt`, `dispatch.createdFromReceipt`; P10/P22 | **Unknown** source dispatch mechanism |
| Assignment / holder | P10 dispatchCycleId + assignmentRevision, driverId and source driverExternalId | Assignment history is revisioned in the stable cycle; no separate assignment UUID is exposed yet. Predeparture remove/reassign verified; real departure race remains P15 | `assignment.withdraw`, `assignment.reassignBeforeDeparture`, `assignment.received`; P10 verified; `round.started` P15 | **Unknown** assignment revision/status |
| Line / whole pieces | Stable source line ref scoped to task; cycle ledger holds whole piece counts | B2B explicit split permission. `dispatched = delivered + held + branchReceived + disposed`; return-required ⊆ held. No decimal quantity; counts never inferred from missing data | `outcome.recordPartial`, `outcome.recorded`, `return.subsetReceived`, `return.dispositionRecorded`; P10/P17/P21 | **Unknown** line IDs/UOM; reject unsupported fractional model |
| Prices/due/prepayment | ERP supplies final collectable unit/shipping and sufficient allocated prepaid information | Money integers + currency/exponent; EGP exponent 2. Missing allocation ≠ zero; reject ambiguity. Source snapshot frozen after departure; no source financial schema in core | `intake.submitSnapshot`; `unsupported_price_allocation` error; P10/P17 | **Unknown** authoritative due/allocation API |
| Reported collection | Tawsel outcome reports matching currency minor units; ERP owns accounting/application | P09 verifies optional simple B2C EGP collection as positive integer minor units/exponent 2, without items or fees. B2B exact authorized due remains P10/P17. No bank/settlement proof | `task.createIndependent`/`task.reviseIndependent` verified P09; outcome/report operations P17/P36 | **Unknown** ERP ledger posting/clearing rules |
| Workday / trip | Tawsel `workdayId` and `tripId` UUIDs; trip=round, not task/cycle | One open day and active round per driver; explicit End day may cross midnight; carry held work | `round.start`, `round.end`, `workday.end`, corresponding events; P15/P19 | **Unknown** optional external execution-reference fields |
| Plan / route / forecast | Tawsel `planId`, `routeRevision`, forecast identity and initial/revised workload | Route revision independent of assignment/device/schema/event sequence. First start baseline immutable; changing scope labelled | `planning.getPlan`, `plan.revisionPublished`, `report.getRoundTiming`; P13/P15/P36 | **Unknown** route/forecast projection needs |
| Stop / attempt / outcome | Separate shipment-specific stop, attempt and immutable outcome UUIDs/revisions | Retry has new attempt; co-located task separate; heading/arrival/resolution explicit. Phone outcome can lack arrival | `current.selectHeading`, `current.recordArrival`, each `outcome.record*`, `monitoring.getTaskHistory`; P16–18/P24 | **Unknown** visit/attempt status mapping |
| Return request | Tawsel request UUID ↔ ERP native review reference; driver offers source-branch subset | Requested is not received/stock. Other held/disputed pieces survive accepted subset; no whole-batch clearance | `return.requestHandover`, `return.requested`, `return.getRequest`; P21/P27 | **Unknown** return-request workflow |
| Actual receipt / disposition | Separate receipt/disposition UUIDs, native ERP trusted actor, source branch/pieces | Only actual requested received subset becomes branch-received. Lost/damaged is distinct, not receipt/stock. Revision/idempotency guards duplicates | `return.confirmSubsetReceipt`, `return.recordDisposition`, corresponding events; P21/P27 | **Unknown** native receipt/loss mechanism |
| Correction | New Tawsel correction/outcome revision linked to original | Owning driver, open day, before dependent receipt/redispatch; append history and recompute effective report, no refund | `outcome.correct`, `outcome.corrected`, `evidence.adoptCompatible`; P23 | **Unknown** append/reversal projection format; no staff overwrite |
| Device/action/evidence | Device UUID/generation + action UUID/sequence/dependencies ↔ durable receipt UUID; no ERP device authority | Original ID/version retained. Old owner may provide received evidence but cannot silently apply. Body actor/source validated | `device.takeOver`, `evidence.receiveFormerDevice`, `sync.submitActions`, `action.getResult`; P05/P20/P34 | **Unknown** connector audit correlation fields |
| Event / delivery / applied checkpoint | Event UUID stable across delivery attempts; per-recipient aggregate sequence; ERP inbox ID mapping | Required transitions kept separately from snapshot revision. Received acknowledgement and projection applied are different states | `consumer.receiveSignedEvent`, `integration.getDeliveryStatus`, `integration.reportAppliedCheckpoint`, `integration.replayEvents`; P25–27 | **Unknown** inbox/outbox/checkpoint persistence |
| Time and observation | `observedAt` nullable + clock quality; separate server `receivedAt`, accepted `committedAt`, ERP application time | UTC `Z` on wire, Cairo display; missing actual never replaced by receive time. Client clock not conflict authority | Common Observation/EvidenceReceipt/EventEnvelope; P16/P17/P24/P26/P36 | **Unknown** native UTC/timezone/clock support |

Common schemas reject undeclared fields outside deliberate payload extension points. A full source snapshot is not a PATCH; omitted optional values versus clearing must be finalized by the feature schema. No database nullable-column assumptions follow from JSON absence. Domain checks additionally validate scope relationships, currency policy, arithmetic bounds, chronological consistency, requested-subset containment and actual state. Passing a common schema is not permission or business acceptance.

## Status mapping that must not collapse

| Designed fact | Allowed projection meaning | Forbidden inference | Owner |
| --- | --- | --- | --- |
| Source command pending / rejected / Tawsel accepted | Native source intent versus confirmed application result | Local ERP click/HTTP timeout proves receipt or state change | P10/P27 |
| Prepared / definitive received assignment | Upcoming source work versus accepted asserted driver custody | Prepared is on-board or executable | P10 |
| Next planned / heading / arrived | Suggestion versus explicit driver target versus explicit presence | Navigation, call, plan publication or outcome proves arrival | P16 |
| Full / partial / refused / no-answer / deferred | Distinct effective result and attempt history | Failed or processed stop equals delivered shipment; no-answer implies fee refusal | P17/P18/P36 |
| Return-required / requested / actually branch-received / disposed | Held classification / offered intent / accepted actual subset / separate loss-damage | Return request, branch arrival or loss creates available stock | P21/P22 |
| Evidence received / pending / accepted / rejected / review-required | Durable evidence plus separate Tawsel business decision | Received evidence is accepted, or former phone overwrites current owner | P20/P23/P34 |
| Outbound pending / sending / received / failed | Transport evidence | Receiver HTTP acknowledgement proves projection applied | P25 |
| ERP application unknown / pending / applied / failed | Receiver-local projection evidence/checkpoint | Applied equals financial settlement or universal ERP compatibility | P26/P27 |
| Replacement progress snapshot / transition event | Current scoped view versus individually identified durable business fact | Newer snapshot discards missed quantity/correction/receipt transition | P24–26 |

## Worked designed reference mappings

These are examples for the future reference ERP, not its implemented schema. The symbolic IDs denote distinct UUIDs and point to the [complete state walkthrough](../tracking-and-consistency.md); concrete valid/invalid envelope values live only in [canonical examples](../../contracts/examples/README.md).

| Input / sequence | Designed mapping and expected result | Canonical example / proof owner |
| --- | --- | --- |
| Tenant A/source A `shipment-001`, optional `order-001`, line L1; same address as `shipment-002` | Two Tawsel tasks; source order/contact/address never substitutes for task identity | `common-DeliverySnapshot`; P10 isolation/identity tests future |
| Prepare three pieces, then definitive received batch | Preparation produces zero driver-custody receipt; accepted received batch creates cycle C1/assignment A1 with three held | `action-source-envelope`; P10 real admission proof future |
| C1: three × EGP 100 due + EGP 50 shipping; authorized two-piece delivery | Deliver 2, held return-required 1, reported 25,000 minor EGP; action/attempt distinct | `action-partial-envelope`, `common-Money`; envelope/arithmetic design only, P17 actual outcome proof |
| Same action ID with different delivered count | HTTP 409 `idempotency_conflict`; no second business write | `error-idempotency_conflict`, invalid `conflict-must-be-409`; P05 real database guarantee verified; P08 public retry/conflict proof available |
| Fractional 1.5 pieces, decimal money string, or ambiguous prepaid split | First two fail actual foundation validation; ambiguous allocation must reject at intake instead of guessing | `piece-1.5`, `money-decimal-string`, `error-unsupported_price_allocation`; P10 arithmetic/allocation proof future |
| Route revision advances while A1/attempt V1 and relevant source state stay compatible | Revalidate outcome against actual assignment/attempt/owner, do not blanket-reject route-only drift | Versions schema permits independent values; P17/P34 state validation future |
| Optional correct recorded two-piece outcome to actual one-piece before receipt | Preserve original O1; correction O2 effective 15,000 minor EGP, two held; not a refund | `event-correction-transition`; P23 transactional proof future |
| Request return of two after that correction; actual receipt one | Request leaves zero branch-received; accepted subset gives delivered 1/held 1/received 1; other piece explicit | `event-return-request` shows offered intent only; P21 subset proof future |
| Record remaining piece lost, then redispatch received piece | C1 delivered 1/held 0/received 1/disposed 1. New C2/A2/V2 for received piece; no extra physical piece or reopening C1 | P21/P22/P27 reference examples must complete schemas/runtime |
| Former device sends after takeover | Durable receipt + review-required, no committedAt; current owner may adopt only within correction bounds | `evidence-old-device-review`; P20/P23/P34 proof future |
| Progress revision 8 arrives around distinct outcome/request/correction events | Replacement view can be refreshed; every required transition retains own event ID and sequence processing obligation | `event-progress-snapshot`, `event-outcome-transition`, `event-correction-transition`; P25/P26 recovery proof future |

P08 has validated live identity examples; P10/P21/P22/P25–27 must replace their designed feature examples with captured/validated real messages and add concrete native reference ERP mappings without changing canonical schema ownership. Real ERP fields remain unknown until its discovery. Available consumer quickstart/conformance must be updated in the same phase as any public interface change; P08 supplies the identity slice, P26/P27 add the two-way flow, and P42 audits the final bundle.

## P11 execution-location mapping

| Field/status | Meaning and ownership |
| --- | --- |
| original | Unchanged intake/ERP destination; never overwritten by location confirmation |
| sourceRevision | Current task/source snapshot version, independently checked |
| locationRevision | Monotonic explicit confirmation revision; 0 for source-confirmed input/no review |
| pin.coordinates | Named finite latitude/longitude; only a current confirmed pin is usable |
| pin.provenance | manual, nominatim (saved selected candidate), or source-confirmed; no inferred match percentage |
| pin.confirmedBy / confirmedAt | Account and server time for explicit reviews; null for original source-confirmed input |
| needs-resolution | Only this task lacks a current confirmation; unrelated valid work remains usable |
| planningInputRevision / pending | Input invalidation and durable intent, never a published route |
| location.pinConfirmed | Source-scoped durable B2B event intent; transport unimplemented until P25 |

The [schema](../../contracts/location.schema.json) and [location consumer](../../packages/api-client/src/locations.ts) own the public shapes. ERP must not map a corrected execution pin to commercial customer-master replacement. P11 actual local evidence is in [the phase record](../phase-11-evidence.md).

## P12 normalized routing reference

| Canonical value | Meaning / connector obligation |
| --- | --- |
| `RoutingMode` | car, motorcycle, bicycle only. Internal bike/provider service names never become ERP enums. |
| `RoutingProfiles.liveVerification` | not-checked: metadata is not a health/coverage guarantee. Human session read, not service impersonation. |
| `RoutingOrigin` | Confirmed physical stop or explicit manual/branch pin; phone interactions do not move origin. |
| `Coordinates` | Explicit latitude/longitude. Positional arrays belong only inside adapters. |
| `serviceEstimateSeconds` | Customer default 600; branch endpoint requires its own separate estimate. Never actual dwell or customer outcome. |
| `RoutingOptimizationResult` | Relative offsets in seconds and metres, public task IDs, complete or partial candidate, policyValidated=false. Unassigned work must remain visible. |
| `RoutingFailure` | Sanitized dependency/validation failure; never reverses accepted receipt or supplies a synthetic road route. |

These normalized models are verified internally and exported for coherent handoff; no optimization HTTP operation is available to the ERP yet. [P12 evidence](../phase-12-evidence.md).
