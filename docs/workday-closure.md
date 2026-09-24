# Explicit round/day closure and carry-forward — Phase 19

Implemented locally with PostgreSQL 18.6 and actual HTTP clients. [Ordered evidence](phase-19-evidence.md), [canonical schemas](../contracts/workday-closure.schema.json), [client](../packages/api-client/src/closure.ts), [examples](../contracts/examples/valid.json). Full closure UI belongs to P31; offline journal/replay belongs to P33–35. No midnight reset, financial settlement or ERP resubmission is added.

## Reproduce

```powershell
npm ci
# PostgreSQL 18 bin must be on PATH. This checkout's isolated tools are:
$env:PATH="$PWD\.local\postgres-tools-18.6\pgsql\bin;$env:PATH"
npm run db:local:start
npm run test:workdays
npm run workdays:demo
npm run test:erp:workdays -- .local/phase-19-demo.json
npm run test:erp:workdays
```

The demo creates and drops its own marked database. ERP provisioning/intake and manual planning/start use the existing boundary. Session/bootstrap and enabled identity binding are labelled fixtures. It records one full delivery, one refused shipment with unpaid shipping, one unfinished shipment and one future deferral. An explicit heading pause ends round one; round two reuses the workday. It discards the committed End day response, recovers/replays the exact result, then starts a distinct workday with the original held identities. Output is `.local/phase-19-demo.json`. No live Engine, real ERP, browser or physical-device proof is implied.

## Public operations

All paths require the current own-driver human session, `?kind=personal|company`; POST also requires the existing browser CSRF token. ERP service credentials do not impersonate a driver.

| Operation | Method and path | Meaning |
| --- | --- | --- |
| `round.end` | POST `/api/v1/closure/round` | Ends this active round, retains the open workday and all unfinished work. |
| `workday.end` | POST `/api/v1/closure/day` | Ends this explicit workday and its active round, if present. |
| `closure.getResult` | GET `/api/v1/closure/actions/{actionId}` | Scoped pending/accepted/rejected result recovery. |
| `workday.getSummary` | GET `/api/v1/workdays/{workdayId}/summary` | Basic day-scoped outcomes, reported collection, round/baseline identities and admission denominators. |
| `workday.getCarryForward` | GET `/api/v1/workdays/{workdayId}/carry-forward` | Current held/unfinished records of that workday's driver, as of the read; no task copies. |

Use the canonical device envelope. Payload fields are `workdayId`, `roundId`, `expectedActiveRoundId`, `expectedActivityRevision`, `expectedCurrentAttemptId`, `currentAction`. `roundId` anchors device/generation ownership. End day between rounds names the most recent ended round in that day and expects active=null; it cannot silently close a new round started concurrently. When no current exists use `require-none`. A heading needs `pause-heading` and the exact expected current attempt. An arrived customer must first receive a P17 outcome; closure never invents a result or removes arrival evidence. A stale current/device is a durable rejection.

`ClosureRecord` keeps the original action observation separately from the actual UTC `recordedAt`/end timestamp. `pausedActivity` retains the pre-pause heading evidence. `endedRoundId=null` means End day happened between rounds. Same action/payload returns the exact result; changed payload with that ID conflicts. A new command for an already-ended target returns `already-closed` and the original closure record, with no new closure/history/event or planning side effect. It does not affect a later workday.

Closure, current-history pause, round/day timestamps, branch endpoint reservation release, planning invalidation, audit/result and source-filtered intents commit together under existing sorted invariant guards. Customer reservations/custody/outcomes/collections/source snapshots are not reset. Deferred conditional foreign keys enforce current→active round→open workday at commit, in addition to the existing uniqueness constraints. End timestamps cannot be edited or reopened.

## Retained work and summary units

Carry-forward uses existing holder rows plus latest attempt/source/cycle/driver options. It reports original source references/revisions, exact earliest time, admission-in-selected-day flag, current outcome/disposition, held pieces for company work, unpaid shipping and explicit eligibility/blocker. Full deliveries are excluded; unresolved, deferred and return-required work remains visible. B2C has no branch/source/custody pieces; its `heldPieces` is null. Receipt/disposition dependencies block execution; their actual producers/quantities remain P21–22.

P18 eligibility reads now identify `active-round`, `preparation` or `historical`. The latest ended round may anchor preparation by the same owner while no newer round exists. Explicit retry/activation applies the original source/holder/current/earliest/location/capacity checks, changes retained eligibility and enqueues a fresh plan, but creates no execution admission until the next online start. Old rounds show disabled actions. Activation also handles source-future held work that previously had no reservation. Time passing alone never activates a driver's deferral. Partial rejected remainders remain excluded.

Summary `scope.shipments` is distinct tasks admitted during the selected workday; `attempts` is distinct admitted attempt IDs, counted once even across multiple rounds. `processedAttempts` is actual day-scoped outcomes. Shipment buckets use the last admitted attempt for each task in this day: an unresolved explicit retry is unfinished while its earlier failed attempt still counts as processed. `fullShipments` is the full-delivery numerator; partial/refused/no-answer remain distinct. Six full and one failed out of eighteen means seven processed, six fully delivered. Branch reservations and held work that never entered that day's scope are not customer denominators.

`collection.reportedMinor` is an exact decimal integer string summing only that day's reported amounts. `unreportedAttempts` distinguishes missing collection from reported zero. Current outstanding shipping is separately on retained items and does not duplicate earlier refusals or paid shipping. None of these fields mean remitted cash, settlement or physical return. Current `carryForward.asOf` may change after a later day; closed-day scope/outcomes/baselines remain based on their original day. Detailed correction-aware reports, travel/service timing and export are P23/P36–37 extensions.

All stored instants are UTC. The public display timezone is `Africa/Cairo`; `formatWorkdayInstant` uses IANA timezone rules. Tests compare PostgreSQL and Intl through winter/summer and the autumn offset change. No code groups or closes a workday by calendar date.

## Pending closure and later phases

A missing `dependsOnActionIds` predecessor yields HTTP 202 `{actionId,status:'pending'}` without finalizing the action identity. Replay the identical envelope after its predecessor is accepted. An unaccepted durable predecessor yields `sync_incomplete`; reconcile it explicitly. Unknown result lookup also means pending, not proof of server receipt. Same-ID replay after a lost committed response returns the original receipt/time/event identities.

Every later start still needs fresh ready/manual planning and the P15 readiness proof of accepted relevant action IDs. Readiness refuses unknown/unaccepted closure IDs. The server cannot discover an unsent device-local queue. P34 must persist the full local dependency barrier, keep pending day-end visible, send queued predecessors before close, durably retain the receipt, and block new-start controls until that relevant synchronization is accepted. Offline storage, multi-tab replay, phones and browser behavior are not implemented or tested in P19.

P20 may rely on migrations 0012–0016, immutable closure records, open-day/current lifecycle foreign keys, owner generations, `Closures`/`WorkdayReads`, public client/status schemas, and the independent-connection tests. Takeover must require an open day and active round; it cannot reopen ended ownership. P23 must share driver/workday/assignment/task guards with closure and revise effective summaries without rewriting historical evidence. P21/P22 must supply actual return/receipt/disposition producers and coherent held-quantity reads; the pending-request fixture proves no implicit clearance only. No next-phase implementation, publish, commit or push is part of this work.
