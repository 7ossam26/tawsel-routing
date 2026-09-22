# Tracking and consistency contract

Phase 02 foundation, protocol draft `1.0.0`, 22 September 2026. This document specifies required behavior; it does **not** claim persisted domain state, authorization, transactions, offline storage or event delivery are implemented. P05 establishes the transaction kernel; each feature phase proves its rules. Authority comes from [master plan §§5–15](../master-plan.md), amended by D-79–D-101 and D-112 in the [decision map](phases/decision-map.md). The [operation catalog](contract-coverage.md) assigns implementation owners.

## Identity and authority

All Tawsel record IDs are UUIDs. A source reference is `(tenantId, integrationId, externalId)`; entity type supplies the namespace, and a line reference is additionally scoped to its task. No match by phone, address, coordinates or display name merges shipments. Payload tenant/actor IDs are assertions to validate against authentication, never grants of authority. B2C has a separate personal tenant and account even if its contact details match a company account.

| Record / distinct identity | Owner and state vocabulary | Actions and invariants | Owner phase |
| --- | --- | --- | --- |
| Tenant / integration | Tawsel-bound scope; active or disabled integration | Authorized provisioning establishes binding and credentials. No cross-tenant relationships or mixed-integration contact leakage. | 06, 08 |
| Branch / company user / role / driver profile | ERP manages active/disabled references; issuer owns credentials | One role per user, `inherit / allow / deny` overrides, same effective capabilities across allowed branches. Membership and resource lifecycle still constrain every action. Disabling a user does not reassign goods. | 06–08 |
| Account / session / device | Issuer authenticates; Tawsel owns separate sessions and execution device generation | Several devices can read one round. One current generation executes. Logout/account switch with unsynchronized evidence is blocked; reauthentication never clears the queue. | 07, 20, 35 |
| Task / source revision | ERP owns commercial/customer/content/policy snapshot in B2B; independent driver owns simple B2C task | Create and revise before departure; stable task survives attempts and redispatch. Original address and source revision survive execution-pin corrections. Generic contact/location/delivery snapshots do not encode ERP tables. | 09–11 |
| Dispatch cycle | Tawsel execution identity correlated with source dispatch reference; prepared, received, departed, resolved | Preparation asserts no possession. Accepted definitive ERP assignment asserts physical receipt, not independent Tawsel proof. Returned goods require a **new** cycle to dispatch again. | 10, 15, 21–22 |
| Assignment | Separate ID and generation identifying a holder within a cycle; prepared, received, withdrawn, locked, released | Predeparture withdrawal/reassignment races with start. One holder per outstanding portion. Same-driver retry preserves cycle/holder but gets a new attempt. No direct driver transfer. | 10, 15, 18, 22 |
| Workday | Tawsel driver period; open, ended | First round starts it; explicit End day closes it, possibly across midnight. At most one open workday per tenant/driver. Held work carries forward without source re-entry. | 15, 19 |
| Round (`trip` is the public synonym) | Tawsel; draft, ready, active, ended | At most one active round per tenant/driver across branches/devices. Each new start requires online sync and server confirmation. Ending is not delivery success or return. Branch service is a mode within this round. | 13, 15, 19 |
| Plan / route revision | Tawsel; draft, ready, published, superseded; manual or optimized | A plan has its own UUID; route revisions are ordered publications, not assignment generations. Preserve input fingerprint and protected current prefix. Discard stale provider results. | 13–14 |
| Planning job | Tawsel worker; queued, running, succeeded, partial, failed, obsolete | Leased bounded work outside command transaction. Complete ID reconciliation, unassigned tasks, earliest times and capacity are checked before publication. Provider success alone is insufficient. | 12–14 |
| Customer stop / attempt | Shipment-specific stop identity and new attempt UUID for each retry; available, heading, arrived, resolved, paused | Same-address tasks remain independent stops. Next planned is only a suggestion. Explicit heading selects current; explicit arrival records presence. Outcome without arrival does not advance physical origin. | 16–18 |
| Branch activity | Tawsel explicit source-branch service stop; heading, arrived, awaiting-receipt, complete | Not a delivery attempt and not a second active round. Preserve paused customer sequence. Claimed handover needs accepted subset receipt; unrelated unresolved items are no whole-batch gate. | 21–22 |
| Outcome / correction | Driver-owned immutable record and effective revision; full, partial, refused, no-answer, deferred | Corrections append, never delete. Quantities and collection recompute atomically. Partial delivery belongs only to B2B. No-answer does not imply arrival, shipping refusal or a call count. | 17–18, 23 |
| Piece ledger | Tawsel execution facts by cycle/source line; delivered, held, branch-received, disposed | Whole pieces: `dispatched = delivered + held + branchReceived + disposed`. Return-required is a classification of held goods, **not another additive bucket**. No negative or multiply held portion. | 10, 17, 21–23 |
| Return request / receipt / disposition | Driver requests; native ERP confirms actual source-branch subset or explicit loss/damage | Three separate IDs and facts. Request never creates receipt or stock. Disposed is not received. Remaining disputed/missing portions remain explicit. Receipt does not settle cash. | 21–22 |
| Reported collection | Driver report using source-authorized amounts; effective history with corrections | Integer minor units, currency and exponent; no double prepaid/shipping collection. No settlement, refund, arbitrary underpayment or finance ledger. | 17, 23, 36 |
| Forecast | Immutable UUID, first-start baseline or later identified revision | Tie estimates to attempt/stop, route revision and workload membership. Never regenerate the original baseline for comparison. Changed workload/branch pause is labelled. | 13, 15, 36 |
| Action / evidence receipt / business result | Client immutable action ID; received evidence distinct from accepted, rejected or review-required result | Scoped idempotency; old-device evidence survives without authority to overwrite. Server receipt time is not business commit or alleged arrival time. | 05, 20, 23, 34 |
| Audit / outbound event / delivery attempt | Tawsel immutable audit and event identities; separate network-delivery attempts | Required business transitions survive newer replacement progress snapshots. Event ID survives transport retry; signatures may change. | 05, each feature, 25 |
| External inbox / applied checkpoint | ERP owns durable received then applied/failed processing evidence | Inbox acknowledgement proves durable receipt only. Projection and applied marker share ERP-local transaction; no shared database. | 26–27 |
| Progress snapshot / report / export | Tawsel scoped coherent read with revision and filter/snapshot identity | Older reads cannot regress confirmed display. Processed stops, delivered shipments and pieces have different denominators. Export rechecks scope and matches report semantics. | 24, 36–37 |

## Independent revisions and time

| Field | Meaning; comparison rule |
| --- | --- |
| `sourceRevision` | Version of accepted source snapshot; content/policy concurrency guard. |
| `resourceRevision` / `outcomeRevision` | Effective business state/correction guard; only compare on the same resource. |
| `assignmentGeneration` | Holder/assignment authority generation; never substituted with route revision. |
| `routeRevision` | Planned ordering/forecast publication. A reorder alone does not invalidate a compatible outcome. |
| `deviceGeneration` | Current executing phone ownership; takeover increments it without changing driver identity. |
| `schemaVersion` / `payloadVersion` | Envelope and feature-payload reader versions; not business sequence numbers. |
| `deviceSequence` / `dependsOnActionIds` | Replay ordering/dependencies within an account/device journal. Missing predecessor waits. |
| `recipientSequence` | Committed event order within `(tenant, recipient integration, aggregate type, aggregate ID)` after visibility filtering. |
| `snapshotRevision` | Replacement read-model version. Never substitutes for required transition delivery. |
| `observedAt` | Device/person capture time with clock quality; nullable when truly unknown. |
| `receivedAt` | Server durable evidence receipt time, recorded separately. |
| `committedAt` | Server business acceptance time; absent on pending/rejected/review-only evidence. |

Use UTC RFC 3339 instants on the wire; render using `Africa/Cairo`, never a fixed UTC offset. Clock evidence is `known`, `uncertain` or `unknown`; include an offset estimate only when measured. Clock time never arbitrates competing writes. Missing arrival leaves arrival/travel metrics unavailable; received/committed time cannot fill that gap.

## Eligibility, departure and current protection

Eligible customer work is received, assigned to this driver, has a confirmed usable execution pin, contains an untouched deliverable portion, and satisfies earliest availability. Prepared work, deferred future work, rejected partial remainders and resolved/lost/disposed goods stay visible in their correct groups but are not executable customer stops. Urgency does not bypass eligibility.

The admission limit is 50 **remaining planned stops**, including planned branch visits. Co-located shipments each count. It is neither a daily cap nor a cap on all held records. Reject a new over-limit batch atomically; do not silently split it or create a phantom backlog. Retry/reactivation must pass current admission. Failure to admit does not delete the existing held record or prevent recording a physical outcome.

Online start atomically publishes the chosen ready/manual plan, locks dispatched snapshots, creates/reuses the open workday, establishes the one active round and device generation, and captures the first forecast. Lock start against predeparture withdrawal/reassignment. New received work admitted to active execution acquires the same departure protection. ERP staff cannot then change recipient/content/price/assignment/outcome/urgency. Driver pin correction, assigned-driver urgency and bounded self-correction remain allowed. Native source-branch receipt/disposition is a narrow exception, not a staff override. Identity administration remains separate.

Current is either absent, heading, arrived or branch service. Selecting heading is explicit; navigation/call/WhatsApp links are local UI actions with no execution transition. Arrival is explicit. Automatic replanning preserves current; eligible urgent work follows it, then ordinary work, respecting earliest times. After resolution current clears; showing next planned does not claim heading. A phone outcome without arrival leaves last confirmed physical origin unchanged. First origin is confirmed branch/manual; later origin is last explicit physical stop. No GPS is collected.

Branch interruption may pause heading-to-customer work; arrived/handled customer work must first resolve. P22 must verify the master-plan proposal at full capacity: publish a visible branch-service segment, retain the paused customer sequence, count branch stops against that active segment, then resume/replan it. This is not automatic splitting of an incoming addition batch. No second round or disappearing shipment is permitted. Claimed returned subsets wait for server-confirmed receipt before resume; unresolved other items remain held/disputed without a whole-batch gate. The detailed full-capacity concurrency proof remains P22 work, not an extra permission decision here.

## Atomic acceptance and recovery

Every accepted command must authenticate and scope, acquire consistent invariant locks, check lifecycle/revisions/ownership, write domain state plus effective progress, immutable history/audit, durable idempotency result and required outbound intent in **one** PostgreSQL transaction. All commit or all roll back. P05 chooses and tests lock order; feature phases add their rows under that order. Provider/issuer/ERP HTTP is outside that transaction. Persist planning intent before asynchronous Engine work; provider outage does not reverse accepted receipt/outcome.

Idempotency key is `(tenantId, authenticated command source, actionId)`. The authenticated source is stable across token refresh and cannot be chosen by an untrusted body. Same key plus same semantic payload returns the established result; different payload returns HTTP 409 `idempotency_conflict`, never a second accepted change. P05 must specify canonical hashing of all semantic envelope/payload fields, excluding transport headers/retry receipt times. Query/retry an uncertain response with the same action ID. Do not generate a new ID to escape uncertainty or an expired response body; retained identity/result tombstones prevent re-execution.

Validation for an outcome uses the current compatible task snapshot, assignment/attempt, effective outcome and device authority. A newer route revision alone is not grounds for rejection. Changed price/content, dependent handover, day closure or stale ownership is different. No universal last-write-wins or equality check against every known revision.

Correction is by the owning driver during the open workday before dependent branch receipt/redispatch, with quantity/money validation and preserved original history. It races with receipt, redispatch and day end under shared locks. No staff correction endpoint, refund authority or reversal of actual receipt is created. Former-device actions receive durable evidence identity and review/conflict result; current owner may adopt compatible evidence through the same bounded correction rules. Keep rejection and provenance even if adoption is forbidden. Received restricted evidence does not grant a revoked account execution rights.

Client local journal action and pending projection share one IndexedDB transaction (P33); storage failure cannot show saved success. Replay waits for dependencies and same-account authentication. Save returned receipt before retiring pending state. Pending overlays remain separate from confirmed snapshots. Start, takeover, optimization and ERP branch receipt require connectivity; already-started downloaded execution can continue within allowed offline actions. Roughly 24 hours is a support target, never an evidence deletion timer. No forced update/reload with pending work; keep versioned old payload readers (P34–35).

Integration events use at-least-once delivery with durable idempotency, not exactly-once networking. Domain transitions/corrections have immutable event IDs. Replacement progress snapshots can be superseded, but a later snapshot cannot erase a missing quantity/receipt event. One recipient's sequence must not disclose another integration's hidden events. Poll scoped coherent snapshots with conditional revisions; freshness, last action, device contact, receiver receipt and projection application are separate observations. The one-second poll/ten-second stale defaults and 30-day retention floors remain engineering proposals to verify in P24–26/P38.

## Two of three pieces: state walkthrough

This is a **designed arithmetic/state example**, not an executed delivery. Symbolic IDs below denote different UUIDs. Task `T1` and co-located task `T2` never merge. `T1` source is `(tenant A, integration A, shipment-001)`; line `L1` belongs to that task. Cycle `C1`, assignment `A1`, workday `W1`, round `R1`, plan `P1`, attempt `V1`, outcome `O1`, action IDs and event IDs are all distinct. Three pieces each have EGP 10,000 minor units due; outstanding shipping is EGP 5,000, exponent 2, and splitting is explicitly allowed.

| Step / authoritative actor | Identity / effective state | Pieces: delivered / held / received / disposed | Collection and evidence |
| --- | --- | --- | --- |
| ERP prepares | `T1`, source revision 1, `C1/A1` prepared; no driver custody | 0 / 0 / 0 / 0 in driver ledger; source has 3 prepared | No collection, receipt or available-stock claim. |
| ERP definitive received assignment accepted | Same `T1/C1/A1`, assignment generation 1; 3 admitted | 0 / 3 / 0 / 0 | Action `I1` accepted and required event `E1` committed together; not yet ERP-applied. |
| Driver online start | New `W1/R1/P1/V1`; first forecast `F1`; route revision 1; device generation 1 | 0 / 3 / 0 / 0 | Snapshot locked; next planned alone is not movement. |
| Driver heading then arrival | `V1` heading then arrived through different actions | 0 / 3 / 0 / 0 | Explicit observed, received and committed times; physical origin advances only on arrival. |
| Driver records two pieces | `O1` revision 1 from action `I4`; `V1` resolved; current clears | 2 / 1 / 0 / 0 | EGP 25,000 = 2 × 10,000 + 5,000; held 1 is return-required; transition `E4` survives later progress snapshot. |
| Optional mistake correction BEFORE receipt | New correction `O2`, same `T1/C1/A1/V1`, open `W1`; correction action/event `I5/E5` | 1 / 2 / 0 / 0 | Correctly reported original physical result was 1 piece and EGP 15,000. Original 25,000 report stays in history; effective report is 15,000, not a refund. |
| Driver requests source-branch return | New request `Q1` offering the 2 held pieces after correction | 1 / 2 / 0 / 0 | Request has **zero** received pieces and implies no available stock or settled cash. |
| ERP confirms actual subset | New receipt `H1` accepts 1 offered piece at source branch | 1 / 1 / 1 / 0 | Only accepted subset finalizes. Other piece remains held/disputed; no whole-batch gate. |
| Late correction / remainder retry | Receipt dependency blocks correction of this outcome; rejected partial remainder cannot retry | 1 / 1 / 1 / 0 | Durable rejected/review evidence, no ledger change, no arbitrary staff override. |
| ERP resolves missing held piece as loss | New disposition `D1`, separate from `H1` | 1 / 0 / 1 / 1 | Still only 1 actually received; loss is not stock. |
| ERP redispatches the received piece | Same task `T1`, **new** `C2/A2` and later attempt `V2`; source dispatch ref changes | `C1` stays 1 / 0 / 1 / 1; `C2` starts 0 / 1 / 0 / 0 | Per-cycle conservation; received old cycle is the provenance of new cycle, not an additional physical piece. No reuse of old attempt/action/event. |

Without the optional correction, return request offers 1 and accepted receipt yields `C1 = 2 / 0 / 1 / 0`, effective collection 25,000. Before any correction, merely reordering route to revision 2 keeps `A1/V1` compatible; it cannot alone invalidate the two-piece outcome. A second action using `I4` with a different count conflicts instead of recording another result. A newer progress snapshot may show the corrected count while consumers still must process `E4` and `E5` individually.

## Deliberate exclusions and proof boundaries

No V1 GPS, billing, call counters, advanced POD, direct driver handoff, financial settlement, commercial ERP build or speculative modules. B2C shares execution primitives but never item splitting or branch custody. P02 validates schema/example/reference consistency only. Real PostgreSQL rollback/locking, Engine outcomes, signed delivery, independent consumer durability, browser storage, measured freshness and physical-device support remain assigned future evidence, not passing mocks.
