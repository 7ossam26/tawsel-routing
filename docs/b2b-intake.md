# ERP intake, receipt and atomic admission — Phase 10

Locally verified HTTP/Fastify/PostgreSQL implementation, not a production release or real ERP connector. [Evidence](phase-10-evidence.md), [canonical schema](../contracts/b2b-intake.schema.json), [OpenAPI](../contracts/openapi.yaml), [field/status mapping](erp/field-and-status-mapping.md).

## Reproduce

Use the existing Node 24 LTS/npm 11 workspace and dedicated PostgreSQL setup:

```powershell
npm run db:local:start
npm run test:intake:b2b
npm run intake:demo
```

The demo creates an isolated marked test database, provisions a labelled source/branch/driver through public provisioning commands, starts a real loopback HTTP API and copies only the public client/types/conformance script to a temporary directory. The separate consumer process has a source credential and API URL, **no database, operator or issuer credentials**. It journals immutable commands before sending, exercises prepared → received, replay/result recovery, source correction/removal, 49+2 rejection and ambiguous deposit rejection, then withdraws only its accepted conformance work. The harness removes its own database after API/consumer closure; the retained temporary command journal is evidence, not a working source outbox. Issuer subjects are fixtures; no login, Engine, browser or signed transport is claimed.

To use the local application database, run `npm run db:migrate`, then start the API with the existing P08 provisioning configuration. An operator must explicitly add `intakeCapabilities: ["intake.prepare", "assignment.manage"]` to a **newer** `integration.bindSource` command for that source, retaining its original source/credential/subject fields. Omission preserves grants, `[]` revokes both. These are explicit service operations with `actorId=null`; `assertedActorId` is rejected. No default provisioning credential gains assignment authority. Source configuration discovery lists the granted intake operations.

## Public operations and source obligations

All commands are `POST /api/v1/intake/commands/{operationId}` using the P08 bearer credential. Supply a complete canonical ActionEnvelope with immutable actionId, integration context, `resources={}`, `baseVersions={}`, empty dependencies and the exact payload below. Version fields stay inside the payload; duplicated or contradictory envelope selectors are rejected.

| Operation | Capability | Payload and effect |
| --- | --- | --- |
| `intake.submitSnapshot` | intake.prepare | Complete SourceSnapshot; create unassigned source task/cycle or revise the predeparture source snapshot |
| `intake.prepare` | intake.prepare | driverExternalId + items; upcoming only, no physical receipt, route slot or replan intent |
| `assignment.receiveBatch` | assignment.manage | driverExternalId + items + receiptAsserted=true; all-or-none definitive receipt; eligible additions reserve remaining stops |
| `assignment.withdraw` | assignment.manage | One AssignmentReference; remove ordinary prepared/held work before departure without a reason; retain history |
| `assignment.reassignBeforeDeparture` | assignment.manage | AssignmentReference + different driverExternalId + receiptAsserted; true for held, false for prepared; capacity and branch compatibility rechecked |
| `intake.setUrgencyBeforeDeparture` | intake.prepare | externalId/sourceDispatchCycleId + expectedSourceRevision/sourceRevision + priority; same source revision stream as full snapshots |

References use this source's external IDs. Drivers must be enabled with enabled account/membership and belong to every originating branch in the batch. Branches must be enabled and visible to this integration. Source branch/cycle identity cannot be replaced in a revision. Reassigning held work preserves task/cycle IDs and asserts receipt by the new driver; it is allowed only before departure. A new cycle after actual return is Phase 22, not a way to bypass these checks.

`GET /api/v1/intake/task?externalId=...` returns current source data, stable task/cycle IDs, source/assignment revisions, state, holder, receivedAt, location readiness, editable and planning status. `GET /api/v1/intake/tasks` optionally filters by state and driverExternalId; limit defaults to 20 (1–100), and nextCursor is the last task UUID. Authorization filters precede pagination; responses are current per request, not a historical pagination snapshot. Either intake capability permits these own-source reads. This source API is available to later mock/UI adapters; company-driver browser monitoring remains its later phase.

`GET /api/v1/intake/results/{actionId}` returns the source-scoped accepted/rejected ActionResult with the original receipt/response (or P05 compacted summary). Its current operation capability and branch visibility are rechecked. HTTP 202/status=pending means **no committed result is visible**, including unknown or still-in-flight actions; it does not assert durable receipt. Retain and retry the exact command. Validation failures before command admission return Problem without a durable command result; lifecycle/capacity/version rejections retain evidence/audit and roll back domain writes. Same-action HTTP replay remains authoritative after a lost response.

## Exact quantities and source revisions

V1 intake supports EGP, exponent 2, integer nonnegative minor units; each line quantity is a positive whole piece count. The source supplies explicit splittingAllowed, allocation=`exact-outstanding-per-unit`, unitDue on every stable sourceLineId, shippingDue and totalDue. The service checks the exact BigInt equation `totalDue = Σ(quantity × unitDue) + shippingDue`, rejecting totals beyond the public safe integer range. Zero is accepted only when explicitly supplied. No equal/proportional deposit allocation, tax, discount, refund or payment negotiation is inferred. If pieces have different due amounts, the source must expose stable distinct line/allocation references; it cannot send one ambiguous average. Whole-shipment refusal keeps the supplied shipping due distinct for Phase 17.

Example: 3 × 10000 + 5000 = 35000 minor units. With splitting permitted, later two-piece delivery would require 25000; this phase stores the inputs and does **not** implement outcomes/collection. Exact partial prepayment may instead supply 3 × 5000 + 2000 = 17000. A deposit aggregate with no unit/shipping allocation yields `422 unsupported_price_allocation`, never a zero balance. [Canonical valid/invalid wire examples](../contracts/examples/README.md) contain the concrete payloads.

Source snapshot revisions are positive increasing safe integers; the first expectedSourceRevision is 0, subsequent changes must name the current revision. AssignmentReference requires externalId, sourceDispatchCycleId, expectedSourceRevision, expectedAssignmentRevision and a greater assignmentRevision. The assignment stream starts at 0 and spans prepare/receive/withdraw/reassign. Gaps are allowed; client timestamps never order writes. Source edits/urgency do not advance assignmentRevision.

Same current revision and identical command content under a new action is a no-op; conflicting content is `idempotency_conflict`, lower revisions are `stale_revision`. Exact same-action retries return their historical result even after later changes and do not restore old state. Newer revisions preserve immutable full source snapshots, line quantities/due and assignment history. A task has one supported dispatch cycle in P10; no cycle recycling/redispatch API exists yet.

## Capacity and planning handoff

The ledger represents **remaining planned input slots**, not an optimized/published route. Each independent shipment uses one customer slot; coordinates never group shipments. Planned branch visits use a slot too. Completed/released/paused entries, prepared records, future availability and unresolved destinations do not count. Held work with a confirmed source pin and current availability is admitted into this ledger. A future task does not automatically join when its time arrives: P18/P13 must explicitly re-admit under the same lock/capacity checks.

Every mutation discovers the current holders, locks all old/new drivers in UUID order then tasks using the existing P05 invariant locks, and rechecks holder/source/assignment state. A new holder whose lock is not already held returns stale instead of taking locks out of order. Receipt, snapshot readiness changes and reassignment validate the final total in one transaction. For 49+2, both tentative assignments/history/reservations are rolled back, original source tasks remain in their previous unassigned/prepared state, and a durable rejected result explains the batch failure. No split, accepted subset or assigned backlog is created.

Receipt/relevant held edits atomically write `intake_replan_intents`, command result/audit and recipient-scoped event intent. There is no network call inside acceptance. `planningStatus=pending` means durable input-change intent, not Engine success. P13 must consume these intents and publish plans with revision fencing; P25 must deliver outbox events. Prepared work has no planning eligibility. Later planning must consume only accepted, held, reserved eligible inputs, never all source rows.

P15 must set departure_at while holding the **same driver and task invariant locks**, close start/admission/removal races and freeze newly active mid-round work. This phase checks an already-set departure field for all ordinary source/assignment edits, but does not implement or claim the real start race. P11 may rely on immutable source address/pin inputs and explicit unresolved reads; it must preserve original source provenance while adding execution-location authority. No Phase 11 work is included here.
