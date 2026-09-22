# Field and status mapping — canonical foundation

All business mappings below are **designed**. Common shapes/examples are schema-verified; the reference ERP and real vendor mapping are not implemented. Canonical field definitions live in [common.schema.json](../../contracts/common.schema.json); envelopes/examples remain there, not copied as another schema here. The [catalog](../contract-coverage.md) names commands/events and owner phases. A real-ERP field/status column stays explicitly unchosen.

P06 access additions (internal PostgreSQL guards verified; login/provisioning HTTP mapping remains P07/P08):

| Field/fact | Consumer meaning and ownership |
| --- | --- |
| Issuer + subject → stable account UUID | Credential authority authenticates; Tawsel binds membership. Never match email, username or a role name to authorize. Company/personal accounts and tenants remain separate. |
| One `roleId`; `CapabilityOverride.capability/effect` | ERP administers one company role and `inherit/allow/deny` exceptions. Explicit choice overrides live inheritance equally in every assigned branch. Missing grants deny. |
| `AccessContext.tenantId/tenantKind/principalKind/sourceId` | Server-resolved display snapshot; stable source is an account or integration, never a token/device. Supplied body/query scope is checked, never authority. |
| `branchIds/driverId/effectiveCapabilities` | Active branch membership, optional active own-driver identity and capability set. Their intersection with source visibility and lifecycle authorizes each operation; the array is not a bearer grant. |
| `forbidden_resource` / `lifecycle_forbidden` | Generic 403 scope/capability denial; hidden and missing resources share 404; 409 lifecycle denial only after visibility. No hidden IDs/contacts/counts in error details. |
| Integration source and asserted actor | P06 binds a service only to its own integration/branches and rejects unverified human assertions. P08 owns verified actor/delegation proof. A shared trip does not expand source visibility. |

Canonical definitions remain in [common.schema.json](../../contracts/common.schema.json), with valid/invalid access fixtures and generated consumer types. See [permission contract and guard inputs](../authorization.md), `npm run test:authorization` and `npm run access:demo`. Real ERP fields remain unchosen and public conformance is still P26/P27.

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
| Company user / actor | ERP user ref and trusted issuer subject ↔ Tawsel user UUID; verified human + service identity recorded | `assertedActorId` optional envelope assertion, never authentication. Issuer audience/subject binding required by P08; stale source cannot re-enable disabled user | `user.provision`, `user.disable`, `session.getContext`; P07/P08 | **Unknown** user/subject binding |
| Role / overrides / memberships | ERP role ref ↔ one role per Tawsel company user; explicit inherit/allow/deny overrides | Same effective capability set across assigned branches; membership/lifecycle still restricts resource | `role.defineCapabilities`, `user.setRole`, `user.setCapabilityExceptions`, `user.setBranchMemberships`; P06/P08 | **Unknown** role/grant model |
| Driver / vehicle mode | ERP driver ref ↔ Tawsel driver UUID, separate from phone/device ID | Minimal execution profile; car/motorcycle/bicycle. No fleet allocator or direct driver handoff | `driver.provisionReference`, `routing.getVehicleProfiles`; P08/P12 | **Unknown** driver/profile refs |
| Task / order source references | `sourceTaskReference`, optional `sourceOrderReference` each scoped `(tenantId,integrationId,externalId)` ↔ stable task UUID | Task/source revision required; optional order ref omitted when absent, not empty/null. Same address/order does not merge shipments | `intake.submitSnapshot`, `task.snapshotAccepted`; P10 | **Unknown** order/shipment identifiers |
| Contact snapshot | Required name and phone; optional `externalCustomerReference`; ERP customer master stays external | Snapshot strings are not person identity. Source owns before departure; source revision guards changes | `intake.submitSnapshot`; P10. Own B2C `task.createIndependent` P09 | **Unknown** customer/contact fields |
| Location snapshot | Original address separate from confirmed `{latitude,longitude}` and location revision/provenance | Address or pin required in common shape; unresolved address can exist but cannot execute until confirmed. No GPS or inferred accuracy. Optional pin omitted if unconfirmed | `location.searchCandidates`, `location.confirmPin`, `location.pinConfirmed`, `location.getSnapshot`; P11 | **Unknown** address/pin/provenance fields |
| Delivery requirements | Optional instructions, priority, service duration seconds and time window | Absence is not null; proposed feature defaults ordinary/600s. Earliest/latest chronological checks in owner phase. Urgent cannot bypass current/earliest | `planning.saveDraft`, `intake.setUrgencyBeforeDeparture`, `task.setDriverUrgency`, `task.urgencyChanged`; P10/P13/P18 | **Unknown** service/priority/window fields |
| Dispatch cycle | Source dispatch ref ↔ new Tawsel cycle UUID for each redispatch; task identity retained | Prepared, received, departed and resolved separate. New cycle only from actual branch-received portion; old ledger immutable | `intake.prepare`, `assignment.receiveBatch`, `dispatch.createFromReceipt`, `dispatch.createdFromReceipt`; P10/P22 | **Unknown** source dispatch mechanism |
| Assignment / holder | Tawsel assignment UUID + generation, driver and cycle; source driver ref mapped | Required by feature execution schema. Predeparture withdraw/reassign allowed; departure locks assignment; no live staff transfer | `assignment.withdraw`, `assignment.reassignBeforeDeparture`, `assignment.received`, `round.started`; P10/P15 | **Unknown** assignment revision/status |
| Line / whole pieces | Stable source line ref scoped to task; cycle ledger holds whole piece counts | B2B explicit split permission. `dispatched = delivered + held + branchReceived + disposed`; return-required ⊆ held. No decimal quantity; counts never inferred from missing data | `outcome.recordPartial`, `outcome.recorded`, `return.subsetReceived`, `return.dispositionRecorded`; P10/P17/P21 | **Unknown** line IDs/UOM; reject unsupported fractional model |
| Prices/due/prepayment | ERP supplies final collectable unit/shipping and sufficient allocated prepaid information | Money integers + currency/exponent; EGP exponent 2. Missing allocation ≠ zero; reject ambiguity. Source snapshot frozen after departure; no source financial schema in core | `intake.submitSnapshot`; `unsupported_price_allocation` error; P10/P17 | **Unknown** authoritative due/allocation API |
| Reported collection | Tawsel outcome reports matching currency minor units; ERP owns accounting/application | Optional simple B2C collection; B2B exact authorized due. Shipping only once; refusal-to-pay distinct. No bank/settlement proof | `outcome.recordFull/Partial/Refusal`, `outcome.recorded`, `report.getWorkday`; P17/P36 | **Unknown** ledger posting/clearing rules |
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
| Same action ID with different delivered count | HTTP 409 `idempotency_conflict`; no second business write | `error-idempotency_conflict`, invalid `conflict-must-be-409`; P05 database guarantee future |
| Fractional 1.5 pieces, decimal money string, or ambiguous prepaid split | First two fail actual foundation validation; ambiguous allocation must reject at intake instead of guessing | `piece-1.5`, `money-decimal-string`, `error-unsupported_price_allocation`; P10 arithmetic/allocation proof future |
| Route revision advances while A1/attempt V1 and relevant source state stay compatible | Revalidate outcome against actual assignment/attempt/owner, do not blanket-reject route-only drift | Versions schema permits independent values; P17/P34 state validation future |
| Optional correct recorded two-piece outcome to actual one-piece before receipt | Preserve original O1; correction O2 effective 15,000 minor EGP, two held; not a refund | `event-correction-transition`; P23 transactional proof future |
| Request return of two after that correction; actual receipt one | Request leaves zero branch-received; accepted subset gives delivered 1/held 1/received 1; other piece explicit | `event-return-request` shows offered intent only; P21 subset proof future |
| Record remaining piece lost, then redispatch received piece | C1 delivered 1/held 0/received 1/disposed 1. New C2/A2/V2 for received piece; no extra physical piece or reopening C1 | P21/P22/P27 reference examples must complete schemas/runtime |
| Former device sends after takeover | Durable receipt + review-required, no committedAt; current owner may adopt only within correction bounds | `evidence-old-device-review`; P20/P23/P34 proof future |
| Progress revision 8 arrives around distinct outcome/request/correction events | Replacement view can be refreshed; every required transition retains own event ID and sequence processing obligation | `event-progress-snapshot`, `event-outcome-transition`, `event-correction-transition`; P25/P26 recovery proof future |

P08/P10/P21/P22/P25–27 must replace designed feature examples with captured/validated real messages and add concrete native reference ERP mappings without changing canonical schema ownership. Real ERP fields remain unknown until its discovery. Available consumer quickstart/conformance must be updated in the same phase as any public interface change; they are first created in P26/P27, and P42 audits the final bundle.
