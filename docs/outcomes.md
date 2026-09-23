# Delivery outcomes — Phase 17

Implemented locally on 24 September 2026. [Ordered evidence](phase-17-evidence.md), [canonical schema](../contracts/outcomes.schema.json), [HTTP contract](../contracts/openapi.yaml), [typed client](../packages/api-client/src/outcomes.ts), [portable consumer checks](../tests/erp-conformance/outcomes.ts). Full execution UI is P29–30; signed delivery/receiver application remains P25–27.

## Reproduce

With the dedicated application PostgreSQL configuration in `.env.database.local`:

```powershell
$env:PATH='C:\Program Files\PostgreSQL\18\bin;'+$env:PATH
npm run db:local:start
npm run test:outcomes
npm run outcomes:demo
npm run test:erp:outcomes -- .local/phase-17-demo.json
```

The demo creates and drops its own marked database. Real public ERP provisioning/intake handlers create two independent shipments at the same address; identity reconciliation is a fixture. Real manual planning precedes loopback HTTP readiness/start → explicit heading → arrival → partial → no-answer. Browser identity/bootstrap is explicitly a fixture, separate from production session routes. There is no Engine call. The typed client consumes actual HTTP responses. A transport wrapper discards a successful partial response **after receiving the committed server response**; a fresh client queries/retries the identical action and verifies one result. `.local/phase-17-demo.json` contains the actual commands, status/results, effective read and source-intent payloads. It contains no source credentials. This is API evidence, not browser, native ERP, physical-device or financial settlement evidence.

## Commands and recovery

All routes use `?kind=company` or `?kind=personal`, that account's live session, current own-driver capability and scope. POSTs require same-origin browser CSRF. Another device may read the same driver's results; mutations require the active round's owner account/device/generation.

| Operation | Method/path | Payload schema |
| --- | --- | --- |
| `outcome.recordFull` | POST `/api/v1/outcomes/full` | `Full` |
| `outcome.recordPartial` | POST `/api/v1/outcomes/partial` | `Partial` |
| `outcome.recordRefusal` | POST `/api/v1/outcomes/refusal` | `Refusal` |
| `outcome.recordNoAnswer` | POST `/api/v1/outcomes/no-answer` | `NoAnswer` |
| `outcome.getRound` | GET `/api/v1/outcomes/rounds/{roundId}` | Effective `Snapshot` |
| `outcome.getResult` | GET `/api/v1/outcomes/actions/{actionId}` | `ActionStatus` |

Use the existing versioned action envelope and stable action ID. The closed payload contains `roundId`, `taskId`, `attemptId`, `expectedActivityRevision`, `expectedCurrentAttemptId` (explicit null allowed), `expectedSourceRevision`, `expectedAssignmentRevision`, and `expectedPinRevision`. Values come from the authoritative [current snapshot](current-activity.md), not route position. A compatible route reorder does not invalidate this command. Source/assignment must also match immutable round admission. No arbitrary `alreadySynced`, arrival or price fields are accepted.

For the 3 × EGP100 + EGP50 shipment, extend that target payload with:

```json
{
  "pieces": [{ "sourceLineId": "pieces", "delivered": 2 }],
  "reportedCollection": { "amountMinor": 25000, "currency": "EGP", "exponent": 2 }
}
```

Every frozen line must appear once for partial delivery, including zero accepted counts. Source permission is mandatory and the result must actually be partial. Full delivery has no client-supplied pieces. Quantities and prices in the result are server calculated. B2C has no partial or shipping-payment workflow: full with a saved optional collection amount requires that exact amount; full without one omits `reportedCollection`; simple refusal/no-answer also omit it.

If another attempt is current, explicitly change heading first or resolve the arrived customer. The outcome cannot silently abandon that customer. Outcome for the current attempt, or a compatible admitted attempt with no current target, resolves its stable attempt. The current revision advances and activity becomes null; no next heading or arrival is fabricated. Any earlier paused/heading/arrival evidence remains. Phone-only no-answer can resolve an attempt that never had heading/arrival. The last physical origin stays unchanged.

Accepted POST returns `OutcomeActionResult`: receipt status `accepted`, `response.body.outcome` and `response.body.current`. The latter is the command-time current/origin snapshot. Same action and payload returns exactly that retained result, even if later work changes the round. Do not replace the action ID on a timeout. Query returns `{actionId,status:"pending"}` with HTTP 202 if no committed identity exists, or `{actionId,status:"accepted"|"rejected"|"review-required",result}`. Unknown/pending is not acceptance. Compacted receipts preserve identity/summary but may omit the full response. Replays and reads recheck current authorization.

Malformed/fractional/negative/unsafe/wrong-currency wire requests fail before domain execution. Valid-shaped business violations, including forbidden splitting or incorrect amount, have retained rejection evidence and no accepted effect. Stale current/task revisions and owner generation return retained conflicts. A different payload under the same ID conflicts. Exceptions/crashes roll back the entire transaction; retry that ID after checking status. Canonical valid/invalid command, record, event, status and progress examples are in `contracts/examples`.

## Exact quantities and money

| Result for three outstanding 100-EGP pieces + 50 shipping | Reported / goods / shipping | Explicit unpaid shipping | Effective disposition |
| --- | --- | --- | --- |
| Full | 350 / 300 / 50 EGP | 0 | 3 delivered |
| Partial, 2 accepted | 250 / 200 / 50 EGP | 0 | 2 delivered, 1 held return-required |
| Refusal, `shippingPayment:"collected"` | 50 / 0 / 50 EGP | 0 | 3 held return-required |
| Refusal, `shippingPayment:"refused"` | 0 / 0 / 0 EGP | 50 | 3 held return-required |
| No-answer | `reported:null`; no collection claim | 0 | 3 held return-required, fee `not-attempted` |

All individual wire amounts are EGP integer minor units with exponent 2 (250 EGP = 25000). V1 rejects unlike currencies. BigInt intermediates enforce exact totals and safe wire bounds. Frozen `unitDue` and `shippingDue` already reflect source-authorized prepayments; zero is explicit and missing allocation is invalid. Example: a prepaid line with one unit at zero plus two units with 65 EGP outstanding, shipping zero: accepting the prepaid unit and one other reports 65 EGP, with one held return-required. Distinct per-piece outstanding amounts require distinct stable source lines. No proportional allocation, online quote, arbitrary under/overpayment, refund or settlement is added.

Accepted shipping ledger amounts are subtracted from the frozen outstanding fee before any compatible future attempt. P17 exposes no retry command. Duplicate/repeated P17 results cannot charge a fee or deliver a piece twice; any previously delivered pieces prohibit treating the remaining portion as an untouched whole retry. P18 must retain these checks when admitting new whole attempts. Explicit refusal of a zero remaining fee is invalid. No-answer never invents fee refusal or an unpaid-liability fact.

## Persistence, reads and event intent

Migration 0014 adds immutable `delivery_outcomes`, `outcome_quantities`, `outcome_collections`, and `effective_task_outcomes`. Each accepted result references the immutable admission, stable attempt/source lines, source/action identity and exact frozen source revision. A deferred foreign key ties a resolved attempt to its actual outcome. Quantity conservation, nonnegative money, unique attempt/action/result and append-only history are database constrained. Previous heading/arrival and recorded observation remain immutable. `time.recordedAt` is server action time; `observation` retains the driver's provided clock evidence without pretending it is trusted arrival time.

The P05 kernel commits domain → effective projection/current/capacity/replan → audit → source intent → idempotency result together, under driver/workday/assignment/task locks. Faults at the tested boundaries roll everything back. A completed reservation frees the remaining-stop slot. Planning and active admission exclude resolved tasks; pin correction cannot revive a completed reservation. Rejected partial pieces remain held and return-required. The P10 dispatch `state:"held"` continues to describe the accepted receipt/assignment boundary; it does not by itself count undelivered pieces or prove branch inventory. Read outcome quantities for the effective disposition. Physical branch receipt remains P21.

`getRound` returns one effective result per resolved task in that round plus processed/full/partial/refused/no-answer counts, delivered and held return-required piece counts, and exact collection totals. Processing/refusal/no-answer is not successful delivery. B2C has zero piece/custody counts. To preserve exactness when many safe individual amounts exceed JavaScript's safe aggregate, `progress.collection[].reportedMinor` and `unpaidShippingMinor` are **decimal integer strings** with explicit currency/exponent. The connected test sums two `9007199254740991` amounts to `"18014398509481982"`. No-answer-only reads have an empty collection array. This bounded own-round read is not the P36 workday/filter/export reporting implementation.

Each company result creates one source-filtered `outcome.recorded` payload `{outcome: OutcomeRecord}` in the same transaction. Personal results have no ERP recipient. External shipment, dispatch-cycle and stable line references identify the source allocation. The payload is schema validated before insertion; receiver sequence/signature/delivery/application are later features. An accepted result or pending outbox row must not be presented as ERP-applied or settled cash.

## Handoff to Phase 18

P18 may rely on migration 0014, exact arithmetic, fenced outcome commands/read/recovery, resolved-attempt history, effective task projection, durable planning invalidation, independent duplicate/fault tests, and the two-task public-client demo. Untouched whole return-required goods have delivered count zero; rejected partial remainders have positive delivered count and cannot be retried. A retry needs a new attempt/admission and must preserve old outcomes, prior shipping and first forecasts, revise effective projection/counting coherently and pass capacity. The initial-attempt uniqueness in P13 still exists; P17 does not loosen it or implement retry/deferral. P21 receives actual pieces and P23 appends corrections later.

## P18 extension — preserved retries

[Explicit whole retry](eligibility.md) now creates a new admitted attempt while preserving every old outcome and fee. `OutcomeSnapshot.history` contains prior attempts, `items`/processed quantities count latest resolved attempts only, and collection totals include all attempts. Rejected partial remainders stay return-required and non-retryable. P17 sections above retain their dated evidence; physical receipt, correction, cross-round reporting and settlement remain outside P18.
