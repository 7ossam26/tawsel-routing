# Field and status mapping — canonical foundation

Phase 35 additions are locally verified through [connected and native-browser checks](../phase-35-evidence.md). Canonical ownership remains in the linked schemas, not this table.

| Field/state | Consumer meaning |
| --- | --- |
| `LoginRequest.expectedAccount.tenantId/accountId` with `reauthenticate=true` | Restrict the real OIDC callback to this existing account. No authentication, execution or ERP service grant. [Session schema](../../contracts/session.schema.json). |
| `receipt.evidenceStatus=received`, business rejected/review-required | Safe browser account exit is permitted; unresolved server evidence and original receipt survive. It is not an accepted outcome, reported collection or ERP application. |
| `unsupported_schema_version` | No default translation/success; retain original bytes and IDs. Supported envelope/payload readers are explicitly `1.0.0/1.0.0`. [Sync schema](../../contracts/sync.schema.json). |
| Local `Selection.exiting` / scoped `Draft` | Durable account fence and unsent form input, respectively; no ERP transport field or accepted progress. [Local schema](../../contracts/local-work.schema.json). |


Phase 34 mapping is locally verified; canonical ownership remains in [sync.schema.json](../../contracts/sync.schema.json). A batch is a transport container, never one business transition.

| Public/local field | Consumer meaning |
| --- | --- |
| `SyncEntry.status=received` | Inspect this entry's `ActionResult.receipt.businessStatus`; save the receipt durably before retiring local pending evidence. |
| `waiting.dependencies` | Missing committed predecessors; retain original ID/payload/observation. No receipt or ERP effect is implied. |
| `not-received.retryable` | Transport/input/authentication guidance only; no durable receipt supplied. Other entries may already have committed. |
| `DeviceEvidence.result` | Immutable original received outcome, including review/rejection; never changed to accepted by adoption. |
| `recovery.adoptedOutcomeId` | Separate accepted recovery result linked to original evidence; project existing correction/adoption event semantics once. |
| `recovery.constraints=unresolved-dependency` | Missing/incompatible supporting evidence prevents adoption; receipt/day/owner constraints still apply. |
| `taskLabel`, `nextActionId` | Optional authorized display text and pagination cursor; neither grants mutation authority. |

Generation, sequence, resource versions and observation time remain from capture; resolved dependency versions are internal immutable metadata, not a replacement source snapshot. Tawsel acceptance, signed ERP receipt and ERP application remain separate. [Protocol/demo](../ordered-replay.md).

Phase 33 mapping: local `actions` + `pending` mean “saved on this phone”; they have no ERP-applied mapping and must not enter a server-only monitoring total. `acknowledgements.result.receipt` retains the existing separate evidence/business status and receipt/commit times. Device `observation` remains uncertain clock evidence, never replaced by delayed receipt time. `PlanningRoutePolicy.roadRoute` is optional `RoutingRouteResult | null`; absent/null means no saved road geometry and leaves plan order/details useful. It does not change forecasts, custody, prices or source authority. [Local schema](../../contracts/local-work.schema.json), [storage/version boundary](../offline-local-capture.md).

Phase 29 presentation rule: exact full collection on the driver screen is calculated from the immutable source lines plus remaining shipping ledger and returned in `CurrentTarget.delivery`; the browser does not apportion or edit ERP money. Full/no-answer acceptance is Tawsel execution state and does not itself claim ERP application or settlement. [Connected evidence](../phase-29-evidence.md).

Phase 28 presentation rule: `prepared` is shown as company work that is coming and **not on the driver's custody**; `received`/held is the custody-bearing state. Unresolved location data remains visibly excluded from planning without hiding other valid work. Planning draft/job/manual/start and device-takeover status are Tawsel execution state consumed through existing public/session APIs; they are not new ERP fields and do not authorize a source to mark a route started. [Connected evidence](../phase-28-evidence.md).

## Phase 27 worked native source mapping

| Entity/fact | Reference ERP storage or input → public mapping | Authority, revisions and null/duplicate treatment | Real ERP field |
| --- | --- | --- | --- |
| Company/source | Configured tenantId/integrationId and separate credential → integration context | Operator reserves source/scope; forms cannot select another tenant or actor. Same external ID in another source is a different identity. | Unchosen |
| Branch | `source_records(branch,cairo).desired` → branch.provision | ERP owns name/enabled/location; `location:null` explicitly clears. Increasing sourceRevision; local revision is separate. | Unchosen |
| Role/user | Local role name/capabilities, subject, roleExternalId, branchExternalIds, exceptions → trusted P08 commands | One role, inherit/allow/deny; empty arrays clear owned grants. Subject must be reserved by operator. Accepted provisioning may still await issuer readiness. | Unchosen |
| Native staff | OIDC issuer/subject → local source_commands.actor_subject | Verified local audit; public service identity has actorId=null. No role selector or assertedActorId grants access. | Unchosen |
| Driver | Local external driver/user reference → driver.provisionReference; returned resourceId → pending-return driverId | ERP owns minimal enabled/profile/reference; vehicleReference:null clears. Tawsel owns assigned execution/ownership. | Unchosen |
| Shipment/cycle/line | `(shipment,external-one)`, cycle-1, pieces → externalId/sourceDispatchCycleId/sourceLineId | ERP supplies immutable revisioned content; Tawsel assigns taskId/dispatchCycleId. New dispatch changes cycle identity, not shipment identity. | Unchosen |
| Money/pieces | 3 whole pieces × 10000 + 5000 shipping = 35000 minor EGP → exact-outstanding-per-unit snapshot | Explicit zero means prepaid/no remaining due; missing allocation is rejected, never assumed zero. New-cycle commercial outstanding prices must be supplied explicitly. | Unchosen |
| Preparation/assignment | Native desired proposal → intake.prepare / assignment.receiveBatch with source and assignment expected revisions | Prepared is not held. `receiptAsserted:true` is an explicit physical-source assertion. Atomic capacity rejection never creates a partial batch/backlog. | Unchosen |
| Normal removal | Source command and desired revision → assignment.withdraw before departure | No mandatory reason. Same-ID retry returns retained result. Departed edit is rejected with `departed_edit_forbidden`; no local source change overrides it. | Unchosen |
| Round/workday/attempt | Public planning/start/return facts retain roundId, workdayId, attemptId | Tawsel execution identities; source does not generate them. A route revision is not an assignment/device/source version. | Unchosen |
| Return offer | Public return.requestHandover → native per-driver/request/item view | Tawsel/driver offer only. Requested/unresolved is not physical receipt or available stock. | Unchosen |
| Actual receipt/disposition | Local return change + immutable command → confirmSubsetReceipt / recordDisposition | Only selected integer item quantities/current expectedRevision; received/lost/damaged remain distinct. Empty subset is invalid. | Unchosen |
| Fresh cycle | Actual compatible receipt + complete snapshot → dispatch.createFromReceipt | New unassigned cycle, new source cycle ID, preserved old attempts/money/custody. Preparation/receipt occur explicitly afterward. | Unchosen |
| Source delivery status | source_commands status/attempts/result → consumer `/api/v1/source/status` | Local pending is not accepted. Valid matching durable result sets accepted/rejected/review-required; unknown HTTP stays pending. Local revisions and transport attempt counts never replace server revisions. | Unchosen |
| Time/projection | Local created/completed times; Tawsel committedAt; signed delivery timestamp; receiver received/applied | Separate provenance. No local save or webhook ACK invents physical arrival, historical transition or settled cash. | Unchosen |

Worked two-task reference: `external-one` and `external-two` share a coordinate but remain separate shipments. Each has three pieces. Both are prepared, then receipt is accepted. Driver partially delivers one piece from the first and reports **15000** minor units; the other has no-answer. Native return offer contains **2 + 3** unresolved pieces. Confirming **1** piece from the first leaves **1 + 3** unresolved. Recording that first remaining piece as lost yields **1 received, 1 lost, 3 unresolved**, never two received. A new cycle consumes the **one received** piece, with explicit 10000 unit due and zero new shipping. Old-cycle delivery/collection is retained; neither the loss nor redispatch adds collection. A departed withdrawal is retained as rejected. A separately tested 51-task received batch is rejected as a whole despite local source persistence. [Actual evidence](../phase-27-evidence.md), [portable commands](consumer-quickstart.md).

Reference local save uses the same immutable action ID after disconnect/restart. Repeated source revision/content is subject to canonical P08/P10 semantics; local expectedRevision independently protects concurrent native edits. A current authoritative read supplies versions for a reviewed new action after rejection. Receiver transitions and current projections preserve their P26 rules below; source desired state must not overwrite accepted execution facts. Real ERP mapping remains unfilled until its supported data/identity surfaces are inspected.

## Phase 26 receiver mapping — locally verified

| Public fact/state | Reference consumer representation and rule | Real ERP mapping |
| --- | --- | --- |
| Tenant + recipient integration | One configured scope per isolated consumer database; nested source identities and status token cannot cross it | Unchosen; preserve recipient isolation |
| Event ID + aggregate recipient sequence | Unique inbox identity and sequence; original wire bytes and semantic replay hash retained | Choose durable inbox/deduplication keys |
| Signed delivery `received` | Inbox commit completed; same-ID/same-bytes returns prior receipt, never implies applied | Keep receipt separate from business application |
| Task/assignment snapshot | Latest emitted source/assignment fact in `state.task`; no new native source command | Map external shipment/cycle/driver references |
| Outcome and correction | Effective outcome per attempt; correction replaces effective quantities/report, originals remain in transition history | Whole pieces/minor-unit money; no cash settlement |
| Return request / received / lost / damaged | Request identity plus distinct current item counters; required dependency and transitions retained | Actual subset receipt distinct from request/disposition |
| `receivedThrough` / `receivedHigh` | Contiguous durable receipt versus maximum received sequence | Use transport sequence, never a domain revision |
| `appliedThrough` / `projectedThrough` | Contiguous historical processing versus current-state coverage | Distinguish historical completeness from a usable current view |
| `snapshotThrough` / `historyComplete` | Adopted replacement checkpoint; missing history remains explicit until actual transitions arrive | Never reconstruct a historical financial ledger from current totals |
| `lastError`, received/applied times | Gap, dependency, projection/limit/history errors and actual local timestamps | Own operational visibility; freshness SLO not yet measured |
| Receiver checkpoint report | Persisted stable command identity, scoped API and monotonic revision; response says `receiver-reported` | Authenticate/assert local processing; no remote DB certification |

Worked actual reference case: original no-answer is corrected to partial delivery of **2 pieces** and **25000 minor units** reported collection; an actual subset receipt confirms **1 piece**. Duplicate transmissions retain those same values. An unavailable-history snapshot restores these current values while historical application remains incomplete; subsequent old required events enter history once without re-adding the amounts. A signed changed-payload reuse returns 409, foreign recipient/aggregate is denied and a missing checkpoint returns 503. [Protocol](receiver-protocol.md), [canonical captured examples](../../contracts/examples/valid.json), [reproducible conformance](consumer-quickstart.md). These are execution projections, not native ERP inventory/accounting tables.

## Phase 25 sender field/status mapping — locally verified

[Complete protocol/catalog](../outbox-delivery.md), [canonical sender schema](../../contracts/events/sender-event.v1.schema.json), [operational schemas](../../contracts/outbox.schema.json), [exact signature vector](../../contracts/examples/webhook-signature.v1.json). These replace earlier designed sender statements. Actual ERP fields remain unchosen.

| Public field / state | Owner and consumer meaning | Real ERP field |
| --- | --- | --- |
| `eventId` + tenant + recipient integration | Immutable Tawsel identity; ERP deduplicates for record lifetime | Unchosen |
| `aggregate.type/id/recipientSequence` | Source-filtered stream starting at one; gap detection only within this scope | Unchosen |
| `resources`, feature source/assignment/outcome revisions | Correlation/concurrency facts from committed payload; never transport order | Unchosen |
| `committedAt` | Retained transaction write time visible after commit; not exact WAL time | Unchosen |
| `X-Tawsel-Delivery-Timestamp` | Fresh Unix milliseconds for this signed attempt; independent of event time | Unchosen |
| `schemaVersion/payloadVersion=1.0.0` | Validate envelope and mapped feature payload independently | Unchosen |
| `pending/sending/failed/received` | Sender queue, leased attempt, retained error/retry, receiver-reported receipt | Unchosen |
| `projectionStatus=unknown` | No application evidence in P25; received must not imply applied | Unchosen |
| `blockedBy/nextAttemptAt/leaseUntil/lastError` | Scoped ordering blocker, jittered schedule, recoverable lease, sanitized error | Unchosen |
| `keyId/activatedAt/verifyUntil` | Scoped out-of-band secret activation and explicit old verifier overlap | Unchosen |
| `retention=indefinite-no-purge` | Original envelopes and identities retained; no fabricated replay expiry | Unchosen |

A correction replaces its named preceding effective outcome while preserving both events; a subset receipt records actual pieces only. Replay/duplicate network delivery must not add either collection or custody twice. Worked captured examples in `contracts/examples/valid.json` use `p25-*`; rejected examples cover unsupported event/version and an acknowledgement claiming applied. The consumer must still implement durable inbox/projection in P26, native source operations in P27 and its own commercial mapping. The P24 monitoring freshness field remains `unavailable`; the new sender API is authoritative for transport state only.

## Phase 24 monitoring mapping

| Public field | Consumer meaning |
| --- | --- |
| `scopeKey`, `snapshotRevision` | Compare only within the same authenticated resource/filter scope; replacement versions, not business-event sequence numbers |
| `progress.shipments` / `attempts` | Unique admitted shipments / distinct attempts; retry adds an attempt |
| `processedShipments` / `fullDeliveredShipments` / `partialShipments` / `failedShipments` | Distinct latest-attempt classifications; processed includes full, partial and failed |
| `remainingShipments` | Latest admitted attempt has no effective outcome; not necessarily currently eligible |
| `groups.heldPieces` / `returnRequiredPieces` | Current custody, including retained old-cycle discrepancies; return-required is a subset |
| `current` / `nextSuggestion` | Explicit current stage versus actual planned suggestion; hidden and absent both null |
| `lastCommittedChange.recordedAt` / `correlationId` | Write/acceptance time visible after commit and transaction/action correlation, not exact WAL commit instant |
| `freshness.refreshedAt` | Successful server read time, never device presence or render proof |
| `freshness.lastReceivedActionAt` | Scoped durable receipt time; unsent phone actions are unknown |
| `freshness.integrationDelivery` | `unavailable` until actual transport/application persistence; not applied |
| `nextCursor` | Opaque authorized-snapshot cursor; 409 means restart pagination |

[API/counter semantics](../monitoring.md). Source/assignment/outcome revisions remain independent. This table adds no financial settlement, stock receipt or GPS inference.

## P23 effective corrections — locally verified

| Public field / fact | Meaning for ERP / consumer | Real ERP field |
| --- | --- | --- |
| `correctionId`, `previousOutcomeId`, `previousRevision` | Immutable correction identity and exact prior effective report; preserve original history | Unchosen |
| `correction.outcome` | Full validated replacement for that attempt, retaining task/cycle/source/driver IDs and frozen prices | Unchosen |
| `outcome.revision` | Monotonic task report revision; neither device generation nor source revision | Unchosen |
| `collection.reported`, line delivered/held counts | Effective reported facts; replace superseded values, preserve fees from other attempts; never issue refund/settlement automatically | Unchosen |
| `evidenceActionId`, `evidenceReceiptId` | Optional retained original-device evidence linkage; original receipt status never becomes historical acceptance | Unchosen |
| `recovery.adoptedOutcomeId` | Separate accepted adoption fact; duplicate adoption is prohibited | Unchosen |
| availability / review-required | Actual receipt/disposition, redispatch, later attempt, closure or claimed handover block execution correction; commercial handling remains ERP-owned | Unchosen |

Use [canonical schemas/client/API](../corrections.md) and [evidence](../phase-23-evidence.md). Source correction events are revision replacements; account adoption notifications are private. No actual ERP schema or signed delivery has been verified.


## P22 branch resume and dispatch cycles — locally verified

[Public API and worked examples](../branch-interruption.md), [ordered PostgreSQL/HTTP evidence](../phase-22-evidence.md), [branch schema](../../contracts/branch-activity.schema.json), [cycle schema](../../contracts/b2b-intake.schema.json). This section supersedes older designed-only resume/redispatch statements. Actual ERP columns remain unchosen.

| ERP fact → public field | Authority, revisions and meaning | Public boundary | Real ERP field |
| --- | --- | --- | --- |
| Shipment → `externalId`, `taskId` | Source ID is tenant/integration scoped; server task UUID stays stable across dispatches. Neither is new stock. | Intake task/cycle reads, dispatch event | Unchosen |
| Execution → `sourceDispatchCycleId`, `dispatchCycleId`, `attemptId` | Fresh source cycle reference/server UUID and new attempt on assignment. Preserve original execution IDs. | `dispatch.createFromReceipt` → `dispatch.createdFromReceipt` | Unchosen |
| Stock donor → `previousDispatchCycleId` | Required command UUID; null in original-cycle reads. Same source shipment/origin; only unallocated actual receipt quantities qualify. | Create-from-receipt and `dispatch.listCycles` | Unchosen |
| Frozen source → `sourceRevision`, `snapshot` | Monotonic shipment revision, matching expected revision, exact whole pieces and explicit outstanding unit/shipping money. Old cycles keep their own snapshots. Allocated quantities cannot be inflated through edits. | New-cycle command, existing source/assignment APIs | Unchosen |
| Latest execution → `latest` | One latest executable cycle per shipment. New cycle is unassigned, driver null, assignment revision zero; no possession or round start implied. | Latest task; cycle history pages of 100 | Unchosen |
| Earlier holder → old `driverId`, `receivedAt`, `state` | Preserved assignment history. Old unreceived portions stay in return/carry-forward custody. `latest=false` prevents customer revival; historical `held` does not mean every original piece is still held. | Cycle, return and carry-forward reads | Unchosen |
| Branch activity → `segmentId`, `roundId`, `stage`, `revision` | Own driver/device acts inside the same active round/day. Request binds source branch; provisioned pin fixes destination. Arrived customer must resolve first. | Interrupt/arrival/resume; current/takeover snapshot | Unchosen |
| Paused work → `retainedSequence`, `retainedPlanId`, `pausedActivity` | Visible task/attempt membership; admission reservations remain. New accepted work appends under locks and increments branch revision. | Current branch state and plan history | Unchosen |
| Active segment → `state=branch`, `method=branch-service`, `branchStop` | One branch stop, zero active customer order, paused customer forecast memberships. Unknown timing stays null; original baseline remains immutable. | Planning history; metadata-only plan event | Unchosen |
| Physical origin → `kind=branch-pin` | Explicit arrival changes origin, never custody. Resume estimates start there. | `branch.recordArrival`, current physical origin | Unchosen |
| Handed subset → frozen `claims` | Positive cumulative quantities. Resume checks committed physical receipts for exactly these items under common locks; unrelated unresolved offered items do not gate departure. | Resume; P21 confirmation/receipt APIs | Unchosen |
| Recovery → action ID, expected activity/branch/source revision | Exact replay returns original result. Timeout stays unknown. A rejected waiting action remains rejected; after confirmation refresh and create a new command. | Driver `action.getResult`; intake result API | Unchosen |

Verified worked cases: 50 accepted customers pause into one branch segment with all 50 forecasts retained; an incoming two-task overflow is rejected atomically. Three offered / two claimed / two received resumes with one still held. Those two enter a fresh cycle while the old holder's unresolved one remains visible. Original refusal fee 5000 plus new source-authorized collection 20000 preserves reported total 25000. A different driver receives only the new cycle through the definitive receipt API; direct transfer after departure remains forbidden.

Physical receipt creates a dependency that closes old customer eligibility. New dispatch consumes confirmed stock into new source/assignment/attempt identities without deleting that dependency. Old-cycle outcomes/retries and future corrections cannot reverse it. Historical `received` is a transfer count; available branch stock is receipt minus committed allocations. Do not sum original quantities across cycles as new stock. Per-cycle conservation plus predecessor allocations preserve pieces across dispatches. Unreceived/lost/damaged items are never available stock.

The [copied public consumer](../../tests/erp-conformance/dispatch.ts) verifies early/excess/stale denial, new identities, preserved snapshots/holders and duplicate recovery through released HTTP only. Native ERP stock/valuation/settlement, transactional source outbox and signed event transport remain P25–27. Driver branch UI remains P31; P23 must use the same receipt/redispatch dependencies for correction.

## P21 actual source-branch receipt/disposition — locally verified

[Wire API and retry/confirmation rules](../returns.md), [canonical schemas](../../contracts/returns.schema.json), [validated p21 examples](../../contracts/examples/README.md), [public client](../../packages/api-client/src/returns.ts), [real PostgreSQL/HTTP proof](../phase-21-evidence.md). This section supersedes older designed-only return statements below. Native mock screens remain P27 and new dispatch remains P22. Real ERP field names are unchosen.

| ERP fact / Tawsel field | Authority, null/required semantics and revision | Public command/event/read | Real ERP field |
| --- | --- | --- | --- |
| Origin / sourceBranchId, receivingBranchId | Required UUID from P08/P10 source branch; receiving must equal the immutable origin despite multi-branch access | requestHandover / confirmSubsetReceipt / recordDisposition | Unchosen |
| Shipment and dispatched stock / taskId, dispatchCycleId, sourceDispatchCycleId, sourceLineId | Required stable task/cycle/line identity; source external shipment ID retained in request item/transition; no new cycle here | listSourceBranchGroups, getRequest/getNativeRequest | Unchosen |
| Driver / driverId; execution anchor / roundId | Authenticated own driver, latest round/device fence for offers; ERP cannot select a different holder through body identity | requestHandover, listPending(driverId, sourceBranchId) | Unchosen |
| Offered / requested | Positive whole pieces; offer cannot exceed currently held unoffered pieces; creates no physical receipt/dependency or stock | return.requested | Unchosen |
| Actually received / received | Cumulative count; command quantity is an incremental positive subset; expectedRevision per selected item prevents double count | confirmSubsetReceipt → return.subsetReceived | Unchosen |
| Outstanding / unresolved | requested − received − lost − damaged; denial leaves it intact; pending/superseded/settled are distinct from receipt | getRequest/getNativeRequest/listPending | Unchosen |
| Still held / custody.held | Cycle-wide original source quantity − delivered − physical receipt − loss − damage; may include unoffered pieces | Request item custody; OutcomeSnapshot.custody; carry-forward | Unchosen |
| Loss and damage / lost, damaged | Separate cumulative counters; disposition=lost or damaged required; cannot also receive/dispose those same held pieces; never automatic stock | recordDisposition → return.dispositionRecorded | Unchosen |
| Claim / claims[itemId,quantity] | Positive cumulative physical subset only; confirmed when every explicitly claimed quantity is received; unrelated offered items do not gate | return.checkConfirmation; P22 rechecks atomically before resume | Unchosen |
| Actor / identity.mode, tenantId, integrationId, actorId | Explicit P08 service-operation, actorId is always null; credential/service audited; arbitrary asserted human rejected. Native ERP authorizes its staff locally | Operator returnCapabilities; receipt/disposition transition identity | Unchosen |
| Native pending / actionId | Exact immutable envelope, expected item revision; HTTP uncertainty stays pending; duplicate recovers original result, not a fresh read | getNativeResult / same command replay | Unchosen |
| Superseded offer / eligibility | A compatible whole retry before receipt retires the old attempt; old unresolved offer is retained but cannot receive | getRequest/getNativeRequest; retry_dependencies after actual transfer | Unchosen |
| Server time / transition.time | Server recordedAt plus preserved device/source observation; client clock never orders competing transitions | Separate receipt/disposition event payloads | Unchosen |

Verified worked case: request 3 pieces, receive 2 → requested 3 / received 2 / unresolved 1 / held 1. Lose the remaining 1 → received 2 / lost 1 / unresolved 0 / held 0. Two-piece claim confirms; three-piece claim waits. No available-stock/valuation/cash-settlement claim. A separate two-delivered/one-returned case preserves 25000 reported EGP minor units and the original outcome history.

Verified rejected cases: branch A goods at B (even with access to A/B); 4 received from 3 offered; old expectedRevision under a fresh action; changed payload under a reused action; forged staff actor; B2C; cross-source/tenant access; former phone. Independent receipt/retry races commit one compatible transition. An unavailable API/receiver error retains the unresolved request. See the named tests and exact command results in the evidence; SQL/HTTP proof does not claim native ERP UI or signed webhook delivery.


## Phase 20 — device ownership and preserved evidence

| Public field/fact | Consumer meaning |
| --- | --- |
| `owner.accountId` / `driverId` | Same authenticated person/assignment; never link accounts by phone or contact. |
| `owner.deviceId` / `owner.generation` | Logical installation and server execution generation; separate from source/assignment/route/schema revisions. |
| `snapshotRequired` / `snapshotToken` | A takeover generation must fetch confirmed execution state; token goes in newly created command context. Never treat a historical successful takeover as current ownership. |
| `receipt.evidenceStatus=received` | Server durably retained the result/evidence; not execution acceptance, branch receipt, money receipt or ERP application. |
| `receipt.businessStatus=review-required|rejected` | No accepted domain mutation. Preserve original record and discrepancy. |
| `submissionStatus=duplicate` | Repeat of the original immutable command/hash; receipt and business result stay unchanged. |
| `envelope.observation` / `receipt.receivedAt` / `receipt.committedAt` | Captured time, server evidence receipt and accepted command commit remain separate. Rejected/review records have no business committedAt. |
| `recovery.constraints` | Current closed-day/dependency/authority/revision constraints; no client-time exception or staff override. |
| `recovery.adoptionImplemented=false` | Adoption remains P23/P34; `requires-validation` is not application permission. |
| `device.executionTransferred` / `evidence.received` | Durable affected/submitting-account notification intent only; not an ERP business event, delivery guarantee or applied outcome. |

Canonical ownership stays in [device schemas](../../contracts/device-ownership.schema.json) and [captured examples](../../contracts/examples/README.md). [Protocol/demo](../device-ownership.md), [conformance](../../tests/erp-conformance/devices.ts). Device changes never change ERP source task/cycle references or authorize stock/settlement changes.

## Phase 19 — explicit closure and retained holder work

| Public field/fact | Consumer meaning |
| --- | --- |
| `workdayId` | Explicit driver period, including across Cairo midnight; never replace it with a date key. |
| `ClosureRecord.time` | UTC server recording instant plus original device observation/clock quality; delayed receipt is not alleged action time. |
| `endedRoundId` / `roundEndedAt` | The round actually ended by this closure; null when End day happens between rounds. |
| `workdayEndedAt` | Explicit End day, not task delivery, physical branch receipt or cash settlement. |
| `ClosureEvent.tasks[].sourceReference`, `sourceDispatchCycleId`, `dispatchCycleId` | Original source/cycle identities scoped to that recipient; preserve them and do not resubmit/clone held work daily. |
| Carry item `attemptId`, `earliestAt`, `deferred`, `blocker` | Retained execution identity and eligibility; earliest-time passage does not auto-activate driver deferral or retry a failed shipment. |
| `scope.shipments`, `attempts`, `processedAttempts`, `fullShipments` | Distinct admitted tasks, distinct attempts, resolved attempts, fully delivered tasks; these are different denominators/numerators. |
| `collection.reportedMinor`, `unreportedAttempts` | Exact day-reported amounts and missing reports; neither bank confirmation nor settlement. |
| Carry `heldPieces`, `heldReturnRequiredPieces`, `unpaidShippingMinor` | Current company held work/unpaid fee projection; B2C has `heldPieces=null` and no return pieces. A return request/closure cannot clear these facts. |
| `asOf` / `carryForward.asOf` | Current holder read, separately labelled from the selected day's preserved outcomes/scope. |

`round.ended` and `workday.ended` currently prove only durable source-specific intent. Unknown/202 closure is pending until accepted; a new round requires accepted relevant actions and fresh planning/readiness. P19's seeded pending-return intent is not a P21 receipt implementation. [Contract, examples, demo and limits](../workday-closure.md).


## P18 current mapping — 24 September 2026

| Public field/status | Consumer meaning |
| --- | --- |
| `EligibilityState.revision` | Compare via `expectedEligibilityRevision`; also compare task/source/assignment/pin and current-activity revisions. Route reorder alone is compatible. |
| `earliestAt`, `deferred` | Effective earliest time respects both source and driver restriction. Future/deferred work stays visible but outside execution until explicit capacity-checked activation/retry. |
| `urgency` | Driver execution override; source snapshot stays frozen. Does not override current or future eligibility. |
| `actions.*.allowed/blocker/message` | Server business eligibility with concise Arabic cause. Active owner/device authority is rechecked on submit. |
| `change.previousAttemptId`, `attemptId` | Retry creates a new identity; deferral/activation/urgency retain unresolved attempt identity. Never erase previous results. |
| `change.sourceReference`, `sourceDispatchCycleId` | Original ERP tenant/integration/external task and cycle identity; no new shipment or custody transfer is implied. |
| `change.sourceRevision`, `assignmentRevision` | Frozen source/assignment compatibility, distinct from execution-option revision. |
| `OutcomeSnapshot.history` | All accepted outcomes in the round. `items`/processed quantities describe latest resolved attempts only; collection totals include earlier attempts and do not duplicate shipping. |
| `capacity_exceeded` | No admission/attempt/history change; old whole return-required shipment stays held. |
| `receipt-or-disposition`, `partial-or-delivered` | No customer revisit. Future physical receipt/disposal commands must maintain the dependency boundary. |

Use [canonical schema](../../contracts/eligibility.schema.json) and [exact sequence](../eligibility.md). New source intents are committed locally, not yet signed/delivered. Earlier dated mappings below retain their historical scope.

P15 [verified start/departure mapping](../round-start.md):

| Public field/status | Meaning / source obligation |
| --- | --- |
| B2B task `editable=false` | Accepted start or active admission froze the dispatch. Recipient/content/prices/assignment/ERP urgency edits return `departed_edit_forbidden`; broad staff grants do not override it. |
| `RoundRound.owner` | Server-assigned account/device/generation. Second-phone start returns the existing owner; P20 takeover is unavailable. |
| `firstPlanId / firstForecastId / firstWorkloadId` | Immutable references captured at first accepted start; later pin changes/admissions do not replace them. |
| `startedAt` versus forecast `timeOrigin` | Separate server start and original estimate anchor; no fabricated arrival or recalculated baseline. |
| Start action `pending` (202) | Unknown/uncommitted, never permission to depart. Retry the same full action envelope. |
| `accepted` / `already-active` | Same authoritative round and owner; inspect result instead of creating local authority. |
| `sync_required / sync_incomplete / stale_revision / plan_not_startable` | Refresh/reconcile the indicated dependency; a new corrected action follows a known rejection. |
| `round.started.taskIds` | Only admitted tasks owned by this recipient integration. Full round contacts/counts are not included. Event is durable intent, not delivered/applied proof. |

Canonical ownership: `contracts/round-start.schema.json`, OpenAPI, `p15-*` examples and `packages/api-client/src/rounds.ts`. ERP service credentials do not invoke driver start. P34 owns the complete local journal barrier.

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
| Assignment / holder | P10 dispatchCycleId + assignmentRevision, driverId and source driverExternalId | Assignment history is revisioned in the stable cycle; no separate assignment UUID is exposed yet. Predeparture remove/reassign verified; real departure races are verified in P15 | `assignment.withdraw`, `assignment.reassignBeforeDeparture`, `assignment.received`; P10 verified; `round.started` P15 | **Unknown** assignment revision/status |
| Line / whole pieces | Stable source line ref scoped to task; cycle ledger holds whole piece counts | B2B explicit split permission. `dispatched = delivered + held + branchReceived + disposed`; return-required ⊆ held. No decimal quantity; counts never inferred from missing data | `outcome.recordPartial`, `outcome.recorded`, `return.subsetReceived`, `return.dispositionRecorded`; P10/P17/P21 | **Unknown** line IDs/UOM; reject unsupported fractional model |
| Prices/due/prepayment | ERP supplies final collectable unit/shipping and sufficient allocated prepaid information | Money integers + currency/exponent; EGP exponent 2. Missing allocation ≠ zero; reject ambiguity. Source snapshot frozen after departure; no source financial schema in core | `intake.submitSnapshot`; `unsupported_price_allocation` error; P10/P17 | **Unknown** authoritative due/allocation API |
| Reported collection | Tawsel outcome reports matching currency minor units; ERP owns accounting/application | P09 verifies optional simple B2C EGP collection as positive integer minor units/exponent 2, without items or fees. B2B exact authorized due remains P10/P17. No bank/settlement proof | `task.createIndependent`/`task.reviseIndependent` verified P09; outcome/report operations P17/P36 | **Unknown** ERP ledger posting/clearing rules |
| Workday / trip | P15 `workdayId` and `roundId` UUIDs; legacy envelope `tripId` means round, not task/cycle | One open day and active round per driver; explicit End day may cross midnight; carry held work | `round.start`, `round.end`, `workday.end`, corresponding events; P15/P19 | **Unknown** optional external execution-reference fields |
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

## P16 explicit current activity — 24 September 2026

| Public field/status | Meaning / mapping constraint |
| --- | --- |
| `CurrentSnapshot.revision` | Current-activity CAS; independent from plan/input/source/device versions |
| `currentActivity = null` | No explicit current customer; next suggestion does not imply movement |
| `currentActivity.stage = heading` | Assigned owner explicitly selected the stable task/attempt |
| `currentActivity.stage = arrived` | Separate explicit arrival accepted; not delivered/paid/contacted |
| `nextSuggestion` | Eligible task from retained route order; may change during replan without changing current |
| `planning.updating` | Retained suggestion awaiting current planning; no fresh ETA claim |
| `heading` / `arrival` ActionTime | Stable action ID, server `recordedAt` and original device observation/clock; not GPS timing |
| `physicalOrigin` | Latest driver-recorded arrival/manual correction, driver-scoped history; independent of source destination |
| `expectedCurrentAttemptId` + `expectedActivityRevision` | Explicit replacement precondition; arrived work rejects reselection until resolution |
| `expectedSourceRevision` / `expectedAssignmentRevision` / `expectedPinRevision` | Task compatibility checked under driver/assignment locks; route reorder alone is compatible |
| `stale_device` | Retained rejection/evidence; no transition; takeover remains P20 |
| `current.headingSelected.stage = paused` | Previous source target explicitly replaced; no next-source target disclosure |
| `current.getResult = pending` | Unknown/uncommitted, not success; retry exact original action |

Schemas own fields and examples: [current](../../contracts/current-activity.schema.json), [examples](../../contracts/examples/valid.json). Local proof: real API/PostgreSQL/Chromium with labelled account/provider fixtures. Native ERP and event delivery remain unverified.

## P17 effective outcome mapping — 24 September 2026

| Public field/fact | Meaning and translation boundary |
| --- | --- |
| `outcomeId`, `revision`, `attemptId` | Stable accepted result and attempt; duplicate action returns the same result, no new delivery |
| `sourceReference.externalId`, `sourceDispatchCycleId`, `lines[].sourceLineId` | ERP shipment, dispatch cycle and stable source line identities; preserve separately from Tawsel UUIDs |
| `sourceRevision`, `assignmentRevision` | Immutable admitted source/assignment, checked against the frozen departure boundary |
| `lines[].delivered` / `heldReturnRequired` | Whole pieces; sum equals `sourceQuantity`; rejected partial remainder cannot be scheduled again |
| `collection.reported` | Exact driver-reported amount; null means no collection claim, explicit zero remains distinguishable |
| `goods`, `shipping`, `unpaidShipping` | Separate EGP minor-unit components; no settlement, refund or merchant-charge command |
| `shippingStatus = explicitly-unpaid` | Explicit refusal to pay a positive remaining shipping fee; zero reported collection |
| `shippingStatus = not-attempted` | No-answer; no shipping collection/refusal assertion |
| `shippingStatus = not-due` | Source prepaid shipping or already-collected fee; no second charge |
| `kind = personal`, `lines = []` | Simple B2C outcome; no company item/return/fee-liability projection |
| `heading`, `arrival`, `time` | Real preserved optional movement evidence plus outcome server time/original observation; no inferred timestamps |
| `current.currentActivity = null` | Attempt resolved; next remains a suggestion and physical origin stays fixed |
| `progress.processed/full/partial/refused/noAnswer` | Distinct effective task outcome counts; processed is not successful delivery |
| `progress.collection[].reportedMinor/unpaidShippingMinor` | Decimal integer strings for exact aggregate minor units, with currency/exponent; never binary-float totals |
| `outcome.recorded` pending intent | Schema-valid source payload `{outcome}` committed with state; not delivered/applied/settled |

[Canonical ownership](../../contracts/outcomes.schema.json), [exact examples/client/demo](../outcomes.md) and [public-only conformance](../../tests/erp-conformance/outcomes.ts). The existing dispatch `state:held` is the P10 assignment/receipt state, not a piece-balance report. Actual branch receipt is P21; full report/filter/export semantics remain P36–37.

## Phase 30 driver projections

| Public field | Meaning / consumer obligation |
| --- | --- |
| `CurrentTarget.delivery.lines[]` | Frozen source `sourceLineId`, description, whole `quantity`, exact `unitDue`; no invented apportionment. Empty for personal tasks. |
| `CorrectionAvailability.executionRoundId` | Latest round for owner/generation/snapshot reads; keep command `roundId` on the original outcome. |
| `CorrectionAvailability.originalOutcome` | First result for this attempt; retain alongside effective history. |
| `CorrectionAvailability.delivery` | Exact replacement inputs, excluding this attempt from prior shipping. Does not grant permission. |
| `allowed`, `constraints`, review-required receipt | Current owner/open-day/dependency checks remain final; retain rejected evidence and effective result. |

Fields are additive and optional in older examples. Current server reads supply them; connected forms refuse to infer absent prices. ERP source/receipt commands and outbound event shapes are unchanged. [Actual evidence](../phase-30-evidence.md).

## Phase 31 additive reads

| Field/state | Consumer meaning |
| --- | --- |
| `ReturnGroups.pendingRequests[]` | Own authorized unresolved offers, rediscoverable on another phone. Offer is not receipt. |
| `ReturnGroup/ReturnRequestView.sourceBranchName` | Current source label or null, for display only; retain sourceBranchId identity. |
| `ClosureRoundSummary.activityRevision` | Retained current activity revision, including a heading pause; use with latest ended round and active=null for between-round End day. |
| Visit claims + confirmation | Cumulative per-item received threshold for this visit; unrelated unresolved/lost/damaged portions do not impose whole-batch clearance. |
| `summary.endedAt` + carryForward | Explicit workday closure alongside actual held records; no delivery/receipt/settlement inference. |

Optional additions preserve older canonical examples. Current server reads supply them; driver controls fail closed for missing closure revision. [Public-only conformance](../../tests/erp-conformance/branch-closure.ts).

## Phase 32 status presentation

| Presented fact | Exact meaning |
| --- | --- |
| Tawsel source command accepted/rejected | Business command result at Tawsel; independent of outbound transport |
| ERP received | A durable inbox checkpoint exists for the event |
| ERP applied | The receiver projection advanced through the event |
| ERP application failed | Receipt may exist, but projection application failed and remains operationally actionable |
| Monitoring fresh/stale | Age of the last successful coherent HTTP refresh; never driver online/offline presence |
| Action accepted/rejected/review-required | Server-received history evidence only; unsent phone actions remain unknown |

Retries retain event and business identities. They must never transform a rejected source command into an accepted one or describe a merely received event as applied. Phase 32 adds no canonical field or status value; these labels map existing public reads to the staff/native ERP UI. [Evidence](../phase-32-evidence.md).

## Phase 36 report fields — 25 September 2026

| Public field | Meaning and consumer rule |
| --- | --- |
| workdayId, openedAt, endedAt | Explicit start/End-day lifecycle; never split on midnight or Cairo offset change. |
| definitionVersion, filters, snapshotId, asOf, displayTimeZone | Versioned coherent authorized content; ID mismatch returns 409. Preserve exact selection/timezone. ID grants no access and is not historical lookup. |
| counts / scopeCounts | Selected shipment outcomes versus authorized scope before outcome filtering; processed includes unsuccessful outcomes, full-delivery percentage does not. |
| attempts / processedAttempts / failedAttempts | Distinct attempts; retries do not create extra shipments. Branch service is separate. |
| collections[] | Exact minor-unit strings grouped by currency/exponent. Reported money is not remitted money. Unreported is unknown, not confirmed zero. Goods/shipping/unpaid remain separate. |
| pieces | Current accepted disposition of selected cycles, possibly affected by a later receipt; dispatched = delivered + held + received + lost + damaged. returnRequired is within held. Personal reports return null. |
| attempts[].outcome / history / corrections | Effective revision plus immutable original/correction history; do not sum revisions. |
| timing[].baseline / latest / stops[].revisions | Captured forecast/workload/task/attempt/cycle identity; post-resolution forecasts cannot rewrite per-stop expectations. |
| status: missing / uncertain / available | Observed action time quality. recordedAt is server provenance, never substituted for physical arrival. Null durations require explicit reasons. |
| scopeChanged / interrupted / ended-unfinished / authorized-subset | Explanations restricting comparison; no ranking or simple lateness claim across changed/hidden/unfinished work. |
| acceptedOnly / pendingLocalActions | Accepted server state only; unsent phone evidence remains unknown to server totals. |

The APIs require a current human session with reports.read. ERP command and event authority is unchanged. [Definitions](../reporting.md), [public-response checker](../../tests/erp-conformance/reporting.ts).

## Phase 37 export fields — 26 September 2026

| Public field/state | Meaning and consumer rule |
| --- | --- |
| snapshotId + filters at creation | Must match the currently authorized report exactly; `snapshot_changed` requires a report refresh. |
| exportId | Opaque job identity only. It grants no authority and is bound to the creating authenticated identity and visibility fingerprint. |
| status: ready | Synchronous generation completed and bounded XLSX bytes remain available. Identical unexpired creation requests reuse the artifact. |
| status: expired / downloadUrl: null | Workbook bytes were deleted by time/capacity cleanup; create again from a current report. |
| createdAt / expiresAt / bytes | UTC lifecycle and actual bounded artifact size; no durability or multi-instance claim. |
| fileName / downloadUrl | Safe server-created name and same-origin authenticated route. Never expose a filesystem/object-store path. |
| workbook minor-unit columns | Exact text digits paired with explicit currency/exponent; do not coerce long values through floating-point arithmetic. |
| workbook missing / uncertain | Same report semantics, not empty zero values or inferred arrival/completion. |

Status and download require current `reports.read` plus `reports.export` and unchanged visibility. The workbook is a report representation, not a finance/settlement worksheet or ERP writeback. [Lifecycle](../reporting.md#authorized-excel-export), [portable evidence check](../../tests/erp-conformance/report-export.ts).
