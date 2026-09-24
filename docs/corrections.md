# Driver corrections and compatible evidence adoption

Phase 23, 24 September 2026. [Ordered evidence](phase-23-evidence.md), [canonical schema](../contracts/corrections.schema.json), [device evidence](../contracts/device-ownership.schema.json), [typed client](../packages/api-client/src/corrections.ts).

Run against the marked local application/test PostgreSQL service:

```powershell
npm run db:local:start
npm run db:migrate
npm run test:corrections -- --maxWorkers=1
npm run corrections:demo
npm run test:erp:corrections -- .local/phase-23-demo.json
```

The demo uses a disposable database and actual loopback HTTP. Identity/bootstrap and provisioning are fixtures. Its report records real results, including a committed response deliberately discarded before API restart. The database is removed on completion. No Engine import or real ERP is needed.

## Public driver boundary

All commands use the immutable action envelope, own human session, CSRF, current driver device/generation and takeover snapshot token. Stable same-ID retries return the original result; changed payload under that ID conflicts. A fresh ID with an old effective revision is retained for review. No ERP credential or broad staff capability permits departed correction.

| Operation | Endpoint | Payload / result |
| --- | --- | --- |
| `outcome.getCorrectionAvailability` | `GET /api/v1/corrections/attempts/{attemptId}?kind=company|personal&deviceId=…` | Effective outcome/revision, exact blockers, Arabic message and permitted next steps |
| `outcome.correct` | `POST /api/v1/corrections/outcomes?kind=…` | `roundId`, `taskId`, `attemptId`, `expectedOutcomeRevision`, closed `replacement` |
| `evidence.adoptCompatible` | `POST /api/v1/corrections/adopt?kind=…` | Original evidence action/receipt IDs plus expected generation, outcome/activity/source/assignment/pin revisions; no replacement of the retained payload |
| `correction.getResult` | `GET /api/v1/corrections/actions/{actionId}?kind=…` | Pending versus original accepted/review result; pending is not acceptance |

Existing outcome round reads retain **all** original/corrected rows in `history` and return only effective latest-attempt records in `items`. Their collection totals include effective reports from earlier attempts, preserving prior shipping fees. Basic workday summaries likewise use effective reports. `CorrectionRecord` links the exact preceding outcome/revision, new outcome and optional immutable evidence receipt. Original `execution_attempts.resolved_outcome_id` remains unchanged.

## Accepted and denied examples

For three pieces at EGP100 and shipping EGP50, a mistaken report of two pieces/25000 minor units can be corrected to one piece/15000. This replaces the reported fact in totals and preserves both immutable reports; it does not issue a refund. Quantity, splitting permission and outstanding source price allocation are recalculated. Ordinary delivery underpayment, fractional pieces, source-price changes and unknown fields fail. Previously collected shipping from another attempt remains counted once; it is excluded from the corrected attempt's required collection. B2C only has simple outcomes and its frozen optional collection amount, with no pieces, shipping liability or branch custody.

The original workday must remain open and the attempt must still be current for that cycle. Ending the round alone is not day closure. Actual receipt, loss/damage, redispatch or a later attempt prevents correction. An active branch visit's explicit claimed handover is also a dependent fact: its receipt anchor cannot be invalidated. An ordinary **unclaimed, unreceived offer** can be superseded; its immutable request stays queryable and receiver mutation is denied as superseded. A new offer can reference the corrected outcome.

Corrections do not clear a different current customer, change physical origin, reopen a day, change frozen source records or restore a historical driver/cycle. They advance planning execution revision and update effective progress, quantities, audit, idempotency result and outbound intent in one transaction.

## Former-device evidence

`DevicesClient.receive` durably preserves the original envelope without applying it. The current driver fetches the evidence and latest confirmed snapshot, then explicitly calls `CorrectionsClient.adopt`. Only known former generations and supported delivery outcome payloads qualify. Source/assignment/pin and current activity/outcome revisions are rechecked; earlier client time never bypasses dependencies. The first outcome may be adopted only through the normal active-round/eligible-target rules; replacing an existing outcome uses the correction window above.

The original evidence receipt permanently retains its original business status. `recovery.adoptedOutcomeId` and the account-scoped adoption event identify later adoption separately. Reusing the evidence under a fresh ID cannot apply it twice. Blocked proposals keep durable review evidence and concise next steps; ERP owns any commercial consequences. Arrival-only and other unsupported operation evidence remains retained, with no adoption permission. Local offline capture/replay UI is P33–35; full correction UI is P30.

## Phase 24 handoff

May rely on migration `0022_driver_corrections.sql`, immutable `outcome_corrections` and original outcome ledgers, `effective_attempt_outcomes`, corrected `cycle_custody`, effective task pointers, outcome/workday/planning/eligibility reads, correction/adoption routes and client, portable schema examples, connected tests and the HTTP demo above. Source `outcome.corrected` contains previous and corrected records; apply it as a revision replacement, never add its full amount to the prior report. `evidence.adoptionResolved` is an own-account notification; initial adoption emits `outcome.recorded` to the source, while adopted replacement emits `outcome.corrected`.

These are durable local intents. Signed sender/receiver delivery, coherent monitoring endpoints, full reports/UI, native ERP integration and real-device behavior are not established here. Phase 24 is not executed.

## Phase 30 focused comparison

`executionRoundId` identifies the latest ownership round for generation/snapshot reads; correction payload `roundId` remains the original outcome round.

`CorrectionAvailability` now adds `originalOutcome` (first immutable result of this attempt) and `delivery` (frozen replacement choices/amounts). Replacement shipping excludes this attempt from prior collections; changing two pieces to one still includes its one original shipping charge rather than charging it again or subtracting it twice. `allowed` and `constraints` remain authoritative, even when replacement inputs are supplied for read-only review. These additive fields are optional for older captures; P30 readers with no inputs disable submission. The UI retains the draft/base revision and rejected request evidence; it neither trusts client time nor reinterprets review-required as accepted. [Reproduce and screenshots](phase-30-evidence.md).
