# Field and status mapping — Phase 42 as built

Canonical field definitions are [OpenAPI](../../contracts/openapi.yaml) and the referenced JSON Schemas, with [validated examples](../../contracts/examples/README.md) and [per-operation ownership/evidence](../verification/contract-audit.json). This document explains translation; it is not another schema. API/client **0.1.0**, envelope/payload/event **1.0.0**. [Final public proof](../verification/integration.md).

**Reference ERP mappings below are implemented. Real ERP fields remain unchosen because no vendor schema or connector is supplied.** The connector team must resolve each right-hand column; nothing promises automatic migration.

## Identity, ownership and scope

| Entity / field | Reference source → public mapping | Authority, revisions and omission/null rules | Real ERP mapping |
| --- | --- | --- | --- |
| Company / integration | Protected config `tenantId`, `integrationId`, scoped credential → integration context | Tawsel operator binds source and grants; company code is only a login locator. Same external ID in another source is a different identity. | Vendor company/source keys and connector owner unchosen |
| Branch | `source_records(branch,externalId).desired` → `branch.provision` → stable branch UUID | ERP name/enabled/location projection, monotonic source revision; `location:null` clears. Origin branch is immutable on an existing shipment. | Branch key/location/enablement fields unchosen |
| Role / one role per user | Local role/capabilities → `role.defineCapabilities`, `user.setRole` | Complete role capability array; role name grants nothing. Explicit user inherit/allow/deny overrides inheritance across all assigned branches. | Role/grant schema unchosen |
| User / account | Reserved issuer subject + source user external ID → `user.provision` and account UUID | Operator-reserved immutable issuer+subject; no email/username matching as authority. Empty branch/exception arrays clear those owned projections. User provision preserves existing exceptions. Accepted command may await issuer reconciliation. | Subject migration, user key and lifecycle unchosen |
| Native staff actor | Real ERP OIDC session subject → local `source_commands.actor_subject` | Native actor is verified/audited in the source DB. Public Tawsel command uses verified service with `actorId=null`. `actor_id`/`assertedActorId` cannot impersonate staff. | Native login/branch audit policy unchosen |
| Driver / vehicle | Source driver and user references → `driver.provisionReference` → driver UUID | Minimal enabled/profile/reference, one driver per account; nullable vehicle reference clears. car/motorcycle/bicycle only. Tawsel owns execution/device state. | Driver/user/vehicle keys unchosen |
| Personal account | Phone login + recovery email → separate personal tenant/session/cache scope | No SMS ownership claim, company merge or B2B pieces/returns. | No ERP translation required |

## Shipment, allocation and assignment

| Source field / fact | Public identity or command | Rules and observable state | Real ERP mapping |
| --- | --- | --- | --- |
| Shipment | Required source-scoped `externalId` → stable `taskId` UUID | Nonempty ≤256 characters. Same address/phone/order does not merge tasks. `sourceOrderReference` is optional; null is invalid. | Shipment/order keys unchosen |
| Dispatch cycle | `sourceDispatchCycleId` → `dispatchCycleId`; old `previousDispatchCycleId` for redispatch | Task identity persists; new cycle uses a fresh source cycle and server UUID. Original cycle reference remains through predeparture removal/reassignment. No separate assignment UUID is exposed. | Dispatch key/reuse policy unchosen |
| Snapshot revision | `sourceRevision`, `expectedSourceRevision` | Positive monotonic version and expected current (zero for creation); frozen after departure. Same revision/content may be no-op; conflicting/stale intent rejected. | Change-feed revision source unchosen |
| Recipient / destination | Required name/phone and closed address or confirmed-pin destination | Original input retained. Address-only stays needs-resolution; confirmed coordinates are explicit source assertion, not GPS. Optional instructions/earliest time omitted for absence; null invalid. | Recipient/address/pin provenance fields unchosen |
| Line / split policy | Required distinct `sourceLineId`, description, whole `quantity`, `unitDue`, explicit `splittingAllowed` | 1–100 lines, 1–1,000,000 pieces per line; no fractions. Rejected partial remainder cannot become a customer retry. | Stable line/UOM and authorized splitting fields unchosen |
| Money / prepayment | `allocation=exact-outstanding-per-unit`, explicit unit/shipping/total due | Current intake supports EGP exponent 2. Nonnegative safe-integer minor units and exact sum. Explicit zero means zero outstanding; absent/ambiguous deposit allocation is rejected. No binary-float amounts or inferred refund. | Authoritative remaining due/allocation API unchosen |
| Priority / earliest | Snapshot `ordinary/urgent`, optional UTC `earliestAt` | ERP before departure; assigned driver afterward. Earliest is availability, not appointment. Future work stays held/excluded until explicit admission. | Priority/availability translation unchosen |
| Prepared | `intake.prepare`, current source/assignment bases | Upcoming only, no `receivedAt`, no custody/execution. | Preparation status unchosen |
| Received assignment | `assignment.receiveBatch`, `driverExternalId`, `receiptAsserted:true`, expected/new assignment revisions | ERP asserts physical possession. Full batch atomically fits remaining 50 customer/branch slots or is rejected; no subset/backlog invention. | Physical assignment assertion/workflow unchosen |
| Removal / reassignment | `assignment.withdraw`, `assignment.reassignBeforeDeparture` | Ordinary predeparture change needs no reason. Accepted start and active-round admission lock staff source fields; departed edit rejected. Identity administration remains separate. | Dispatch revision/status workflow unchosen |
| Latest cycle / held | `latest`, `state`, `receivedAt`, `editable`, cycle history | Historical held does not mean all original pieces remain held. Withdrawn retains history. New cycle starts unassigned, then explicit preparation/receipt. | Historical versus current holder model unchosen |

Source entity revisions, assignment revisions, item revisions, local source edit counters, route/input versions, device generations, action sequences, report versions and recipient event sequences are independent. Never compare them as one clock. An exact repeated action returns its retained historical result; refresh authoritative reads before making a new decision.

## Execution, location, reports and time

| Public fact | Tawsel ownership / connector meaning | Command/event/read | Real ERP mapping |
| --- | --- | --- | --- |
| Confirmed pin | Original source destination remains unchanged; execution pin has its own revision/provenance/editor/time. Source-confirmed input may have null editor. | Location client and `location.pinConfirmed` | Execution pin projection unchosen |
| Workday / round | `workdayId`, `roundId`; legacy envelope `tripId` means round. One open day/active round per driver, explicit end across midnight, retained held work. | Round/closure clients, `round.started/ended`, `workday.ended` | Optional execution reference fields unchosen |
| Plan / forecast | Stable task/attempt membership, current protected prefix, manual/ready/partial, immutable start baseline and identified later revisions | Planning client, `plan.revisionPublished`, timing report | Route/forecast projection needs unchosen |
| Next / heading / arrived | Suggestion versus explicit driver stage; no inferred movement from navigation/call/outcome | Current client, `current.headingSelected`, `current.arrivalRecorded` | Attempt/stage fields unchosen |
| Outcome | `attemptId`, `outcomeId`, revision, source/cycle/line references; retry creates a new attempt, not shipment | Outcomes client, `outcome.recorded` | Effective outcome and append-history schema unchosen |
| Collection | `collection.reported` null = no claim; zero remains explicit. Goods/shipping/unpaid separate. Shipping not charged twice across attempts. | Outcome/report schemas | Accounting posting rules unchosen; not settlement |
| Correction | Full replacement for exact prior effective outcome; preserve previous IDs/revisions and original history | `outcome.corrected`; assigned-driver command only | Reversal/replacement projection unchosen |
| Correction constraints | Same owner/open workday/no dependent receipt/disposition/redispatch/later attempt/claimed handover; commercial consequences remain ERP-owned | Correction availability/result; rejected/review evidence retained | Native discrepancy workflow unchosen |
| Device / action | Device UUID/generation, immutable action UUID/sequence/dependencies; former phone evidence never silently applies | Device/sync clients and evidence receipt; integration token is not driver authority | Audit correlation only, no ERP device ownership |
| Observed / received / committed time | Original nullable observation/clock quality, separate server receipt and write time visible after commit; not exact WAL timestamp | Observation, ActionResult, event and report schemas | UTC and clock provenance fields unchosen |
| Report snapshot | `snapshotId`, `definitionVersion`, authorized filters, `asOf`, `Africa/Cairo`; processed/full/partial/failed counts have explicit denominators | Human-session ReportingClient | Report projection requirements unchosen |
| Amounts / timing | Aggregate minor units are decimal integer strings grouped by currency/exponent. Missing/uncertain physical time remains missing/uncertain; server receipt does not become arrival. | Report collections/timing | Exact numeric and nullable-time representation unchosen |
| Excel | Same authorized snapshot/filters, identity-bound opaque export ID, reauthorized download; ready/expired distinct; process-local bounded bytes | ReportingClient request/status/download | Optional native attachment lifecycle unchosen |

## Returns and native actual receipt

| Fact | Implemented reference translation and rule | Public boundary | Real ERP mapping |
| --- | --- | --- | --- |
| Driver offer | Per-driver/source-branch request + item IDs, cycle/line references and offered quantities | `return.requestHandover`, `return.requested`, pending/request reads | Native request view/key unchosen |
| Actual subset | Native local source change + immutable command; only positive selected whole pieces/current item expectedRevision | `return.confirmSubsetReceipt`, `return.subsetReceived` | Physical receipt workflow unchosen |
| Loss / damage | Separate explicit command; never branch receipt or stock | `return.recordDisposition`, `return.dispositionRecorded` | Discrepancy/liability fields unchosen |
| Unresolved pieces | Offered minus received/disposed remains explicit and held according to custody rules | Request/custody reads | Exception handling unchosen |
| Branch continuation | One active round, customer sequence retained; claimed handed-back subset must be confirmed, other unresolved pieces do not impose whole-batch clearance | Branch/current clients; canonical branch activity events | Usually read-only execution projection |
| Fresh dispatch | New source cycle + complete explicit outstanding-price snapshot, funded only by actual compatible unallocated receipt | `dispatch.createFromReceipt`, `dispatch.createdFromReceipt`, `dispatch.listCycles` | Stock allocation/new dispatch mechanism unchosen |

Within each cycle, `dispatched = delivered + held + received + lost + damaged`; return-required is within held. A request, branch arrival, source local save, webhook ACK or recorded loss never creates physical receipt, available stock or settled money.

## Command, event and recovery states

| Field/state | Reference persistence and required meaning | Real ERP mapping |
| --- | --- | --- |
| Local desired / pending | `source_records` and `source_commands` commit together. Own edit revision is independent of Tawsel revision. | Transactional source outbox unchosen |
| Source accepted / rejected / review-required | Only schema-valid matching durable ActionResult settles acceptance; bare error/timeout/malformed response stays pending. Native staff audit remains local. | Terminal versus uncertain command states unchosen |
| `actionId` replay / conflict | Stable authenticated source scope + immutable semantic payload. Same ID/different payload → 409; same payload returns established result. | Durable command deduplication keys unchosen |
| Full / compacted result | Full response retained at least 30 days by policy; long-lived identity/result tombstone prevents a new effect. A compacted body is unavailable, not pending. | Long-lived recovery lookup unchosen |
| Event ID / recipient aggregate sequence | Unique recipient scope and per-aggregate ordered identity; retain original wire bytes/hash and event/payload versions separately | Durable inbox/dedup keys unchosen |
| Signed delivery | Exact UTF-8 body, HMAC-SHA256, key ID and fresh attempt timestamp; timestamp window five minutes. Rotation requires agreeing verifier overlap. | Key store and verification/rotation owner unchosen |
| Sender pending / sending / failed / received | Queue, lease/retry/error, durable receiver acknowledgement; not application | Transport monitoring unchosen |
| Receiver received / applied | Inbox commit before ACK; separate atomic projection/processed commit | Local projection transaction and marker unchosen |
| `receivedThrough` / `receivedHigh` | Contiguous durable receipt from 1 / maximum received sequence | Gap tracking unchosen |
| `appliedThrough` / `projectedThrough` / `snapshotThrough` | Contiguous historical application / current coverage / adopted replacement coverage | Historical versus current projection fields unchosen |
| `historyComplete=false`, errors | Retained gap/dependency/projection/history-unavailable error; no invented financial transition from a snapshot | Reconciliation and discrepancy workflow unchosen |
| Applied checkpoint report | Durable stable command; scoped monotonic public report, `receiver-reported` evidence | Separate application-status publishing unchosen |
| Evidence received / business accepted | Receipt of former-phone/invalid/review evidence is distinct from execution acceptance; adoption has a separate accepted outcome ID | Do not book receipt as outcome |
| Monitoring refreshed/stale | Last successful coherent read, conditional ETag/nonregressing same-scope revision; unsent phone work unknown | Native monitoring freshness display unchosen |

Current sender retention is **indefinite, no automatic purge**. Retention-loss tests inject a hole only in disposable databases. A known missing stream may be reconciled by scoped HTTP; no account-wide discovery or background checkpoint scheduler is promised. Reserved `progress.snapshot` and `integration.applicationReported` webhooks are not emitted; current replacement/checkpoint operations use HTTP. The signed sender schema defines the actual supported event set.

## Worked verified examples

| Input / action | Observable result | Concrete proof |
| --- | --- | --- |
| `external-one` and `external-two` share confirmed coordinates, each 3 × 10000 + shipping 5000 | Two tasks/cycles; prepare has no custody; receive is explicit and atomic | Final clean `source.mjs prepare`; P10 admission tests |
| API offline after locally saved withdrawal | Command stays pending, same action ID survives restart and later acceptance | Final `offline-save` / `resume`; source transaction/process tests |
| First task one-piece partial, second no-answer | Delivered 1, held 5, reported 15000 minor EGP; report counts two processed, one partial, one no-answer, zero full | Final `execute` public report and parsed XLSX; P17/P36/P37 tests |
| Staff withdraws departed first task | Durable `departed_edit_forbidden`, no override | Final `execute` |
| Offer both remainders; receive 1 of first task's 2; record other first piece lost | First cycle delivered 1 / held 0 / received 1 / lost 1; second retains 3 unresolved | Final `execute` and receiver totals |
| New first-shipment cycle from that received piece with zero new shipping | New cycle ID, one piece, 10000 outstanding; old cycle/history preserved, preparation/receipt explicit | Final `execute`; dispatch-cycle transaction tests |
| Repeat signed events and alter same event/time | Duplicate returns durable receipt, no second effect; changed bytes →409; expired signature →401 | Final `receiver.mjs`; independent DB recovery tests |
| Same action ID changed payload, fractional pieces, ambiguous prepayment, foreign actor/source | Conflict/validation/allocation/scope refusal; no partial write | Canonical negative examples and real owning-module integration tests |
| Former-phone evidence after takeover / correction after dependent receipt | Durable review/rejection, no silent overwrite or invented reversal | P20/P23/P34 integration and P41 desktop replay evidence |

Real ERP acceptance must repeat these mappings against its own records, staff permissions, local transactions and network/recovery setup. Passing the reference alone does not certify that separate implementation.
