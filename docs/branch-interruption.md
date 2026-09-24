# Branch interruption, resume and fresh dispatch — Phase 22

Locally verified backend/public HTTP behavior, 24 September 2026. [Ordered evidence](phase-22-evidence.md). Driver branch UI remains P31; correction/adoption remains P23. No live Engine or native ERP application is claimed.

## Reproduce

```powershell
npm run db:local:start
npm run db:migrate
npm run test:branches -- --maxWorkers=1
npm run branches:demo
npm run test:erp:dispatch -- .local/phase-22-demo.json
```

The demo uses disposable real PostgreSQL, listening Fastify HTTP, typed driver clients, an API stop/restart and a copied ERP consumer in a separate process. The consumer gets only the URL, scoped token, return request ID and report path. Driver authentication/bootstrap are explicitly labelled fixtures. The demo cleans its database and writes a credential-free report under `.local/phase-22-demo.json`; the copied consumer directory contains public code and its report. Full capacity is exercised by `branch-interruption.test.ts`, not simulated by setting a count variable. No map import/setup is involved.

## Driver sequence

Use the normal immutable action envelope, device generation/snapshot token, session and CSRF guard. `expectedActivityRevision` and `expectedCurrentAttemptId` come from `GET /api/v1/current/rounds/{roundId}?kind=company`. A route revision is not an activity revision.

| Operation / HTTP | Required payload and observable result |
| --- | --- |
| `branch.interruptRound` / `POST /api/v1/branches/commands/branch.interruptRound?kind=company` | Round and expected current identity/revision, source-bound `requestId`, positive cumulative `claims` and explicit `serviceEstimateSeconds`. The source's provisioned branch pin must exist. Pauses heading; denies unresolved arrived customer. Returns branch activity, activity revision and branch plan ID. |
| `branch.recordArrival` / matching command path | Round/current revision, `segmentId`, `expectedBranchRevision`. Records branch arrival and `physicalOrigin.kind=branch-pin`. Does not receive goods. |
| `branch.resumeRound` / matching command path | Same transition fields. Requires recorded branch arrival and actual receipt for every frozen claim. Publishes a fresh manual continuation, queues optimization and clears branch/current activity. Next customer stays a suggestion until explicit heading. |
| `current.getActivity` / current round path | Exposes `branchActivity`, retained task/attempt sequence, paused heading, arrival, claims and branch plan ID. No customer next suggestion while branch service is active. Device takeover snapshot includes the same state. |
| `action.getResult` / `GET /api/v1/actions/{actionId}?kind=company` | Recover the original branch command decision, including compacted receipt. Exact command replay is also supported. |

Concrete interruption payload (substitute IDs/revision from authoritative reads; [captured complete envelopes](../contracts/examples/valid.json) own the examples):

```json
{
  "roundId": "<active round UUID>",
  "expectedActivityRevision": 2,
  "expectedCurrentAttemptId": "<heading customer attempt UUID>",
  "requestId": "<source return request UUID>",
  "claims": [{"itemId": "<offered item UUID>", "quantity": 2}],
  "serviceEstimateSeconds": 300
}
```

Claims are fixed for this visit. A three-piece offer with a two-piece claim can resume once two pieces are actually confirmed; the unreceived third remains held and visible. Loss/damage do not satisfy that claim. The API does not call an ERP endpoint during resume: it checks the committed receipt ledger under the same driver guards. If receipt is absent or the API is unavailable, there is no accepted resume. A durably rejected waiting action remains rejected on replay; after receipt changes, use a fresh action ID with current revisions. Unknown/timeout responses require recovery with the original ID first.

## Fifty-stop case and planning

Start with 50 remaining accepted customers. Interruption publishes `PlanningPlan.state=branch`, `routePolicy.method=branch-service`, one `branchStop` and zero active `orderedTaskIds`. Every retained customer appears in an immutable forecast with `membership=paused`, its sequence position and null new road/timing estimates. Earlier baseline/forecast IDs remain unchanged. Customer admission reservations are retained, so an incoming two-task batch is entirely rejected while those 50 slots are reserved. No extra round, hidden route or deletion frees capacity.

At lower capacity, a newly received task during branch service passes ordinary atomic admission, appears in the retained sequence and a new paused forecast, and increments branch revision. Resume uses the current branch revision. Current eligibility and urgent-first policy are respected; retained relative order is preserved within compatible priority groups and newly admitted work is appended. A fresh optimization starts from confirmed branch arrival. An empty continuation clears the current plan pointer; it does not leave a live branch plan. Engine failure leaves the manual continuation and pending/failed calculation visible. In-flight pre-interruption results cannot overwrite the segment.

While branch service is active, customer heading/arrival/outcome, customer eligibility changes, plan edits and round/day closure reject attempts to bypass the branch mode. The database also prevents simultaneous branch/customer activity and branch activity in an ended round. Receipt, intake and device ownership use their existing authorized boundaries.

## Redispatch from actual receipt

`POST /api/v1/intake/commands/dispatch.createFromReceipt` uses the source integration credential with `assignment.manage`. It takes `externalId`, `previousDispatchCycleId` and a complete canonical `B2bSourceSnapshot` under `snapshot`. The source must preserve shipment/branch/line identity, supply a fresh `sourceDispatchCycleId`, and advance the shipment source revision with matching `expectedSourceRevision`.

For a three-piece failed cycle with two actually received and one still held, the new snapshot may contain those two pieces. It cannot contain three. The new cycle starts **unassigned**; preparation/definitive physical receipt then use the existing P10 commands, with assignment revision starting at zero. No new round or driver possession is implied by creation. A different driver is permitted only through this fresh receipt. Existing predeparture/atomic capacity rules still apply.

```json
{
  "externalId": "shipment-0",
  "previousDispatchCycleId": "<old Tawsel cycle UUID>",
  "snapshot": {
    "externalId": "shipment-0",
    "sourceDispatchCycleId": "delivery-2",
    "sourceRevision": 2,
    "expectedSourceRevision": 1,
    "sourceBranchExternalId": "branch",
    "recipientName": "عميل",
    "recipientPhone": "01012345678",
    "destination": {"kind": "confirmed-pin", "coordinates": {"latitude": 30.05, "longitude": 31.24}},
    "splittingAllowed": true,
    "allocation": "exact-outstanding-per-unit",
    "lines": [{"sourceLineId": "pieces", "description": "قطع", "quantity": 2, "unitDue": {"amountMinor": 10000, "currency": "EGP", "exponent": 2}}],
    "shippingDue": {"amountMinor": 0, "currency": "EGP", "exponent": 2},
    "totalDue": {"amountMinor": 20000, "currency": "EGP", "exponent": 2},
    "priority": "ordinary"
  }
}
```

The zero new shipping due is an explicit source choice in this example, not inferred settlement/refund. Earlier collected fees remain recorded. Quantity/line allocations in a redispatched snapshot cannot be enlarged or replaced through ordinary source edits. Returned stock already allocated to another cycle is unavailable. A shipment has one executable customer cycle at a time: resolve current execution before creating another; old-cycle unreceived discrepancies remain separate custody. Further actual receipts can supply later cycles after compatible current execution resolves.

`GET /api/v1/intake/task?externalId=...` returns the latest execution; `GET /api/v1/intake/cycles?externalId=...&cursor=...` exposes all frozen source/assignment cycles in pages of 100. Stable `taskId` and external shipment identity are distinct from fresh `dispatchCycleId`, `sourceDispatchCycleId`, attempt and assignment identities. `previousDispatchCycleId` links the stock donor. Earlier outcomes/collections/holder/receipt history are not overwritten. Old `latest=false` cycles cannot reopen. Their `state=held` is historical assignment, while current custody says how many pieces are actually still held.

Do not sum original source quantities across cycles as new inventory. `return.received` is a historical transfer; its available stock equals actual receipt minus committed new-cycle allocations. Those allocations are durable and checked under driver/task locks and a database receipt-balance lock. New-cycle quantities plus unallocated branch stock and old held/delivered/disposed portions conserve the original pieces.

Canonical contracts: [branch](../contracts/branch-activity.schema.json), [current](../contracts/current-activity.schema.json), [planning](../contracts/planning.schema.json), [intake/cycles](../contracts/b2b-intake.schema.json), [OpenAPI](../contracts/openapi.yaml). Clients: [driver branch](../packages/api-client/src/branches.ts), [ERP intake](../packages/api-client/src/intake.ts). Events remain locally durable intent: `branch.roundInterrupted`, `branch.arrivalRecorded`, `branch.roundResumed`, `dispatch.createdFromReceipt` and metadata-only `plan.revisionPublished`. Signed delivery/receiver application remain P25–27.
