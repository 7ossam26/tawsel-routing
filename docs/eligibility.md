# Deferral, whole retry and driver urgency

Phase 18, 24 September 2026. [Evidence](phase-18-evidence.md), [canonical schema](../contracts/eligibility.schema.json), [client](../packages/api-client/src/eligibility.ts), [captured wire examples](../contracts/examples/valid.json).

All four commands use the active round's authenticated assigned driver and owning device generation. They preserve the protected current customer, physical origin, frozen source allocation and first-start forecast. No call count, retry count limit, automatic retry, appointment guarantee or dispatcher approval is introduced.

| Operation | HTTP path below `/api/v1/eligibility` | Meaning |
| --- | --- | --- |
| `task.deferWhole` | POST `/defer` | Set a future earliest datetime on untouched whole work. Unresolved work is paused; prior return-required outcomes remain preserved. |
| `task.activateDeferred` | POST `/activate` | Explicitly restore unresolved deferred work at/after earliest time, with location and remaining capacity revalidated. Reuses its unresolved attempt. |
| `task.retryWhole` | POST `/retry` | Explicitly reactivate a whole no-answer/refused shipment still held by the same driver, before any receipt/disposal/redispatch dependency. Creates a new admitted attempt. |
| `task.setDriverUrgency` | POST `/urgency` | Set `ordinary` or `urgent`. Does not activate deferred work, override earliest time or change current. |
| `task.getEligibility` | GET `/rounds/{roundId}` | Server-derived contextual actions/blockers, relevant revisions, current activity revision and preserved change history. |
| `task.getEligibilityAction` | GET `/actions/{actionId}` | Recover a retained result. Unknown returns HTTP 202/pending; this is not acceptance. |

Every path requires `?kind=company` or `?kind=personal`. Browser commands use session cookies, same-origin and bootstrap CSRF. Production routes use the existing session service; fixture authentication is confined to tests/demo. A broad staff capability or ERP token grants no assigned-driver execution bypass. ERP `intake.setUrgencyBeforeDeparture` stays departure-locked. These commands require a started round; P19 owns closure/carryover and later rounds.

## Consumer sequence

Read eligibility and current round ownership. For the selected task, copy `taskId`, `attemptId`, `sourceRevision`, `assignmentRevision`, `pinRevision`, `revision` into the command's `expectedSourceRevision`, `expectedAssignmentRevision`, `expectedPinRevision`, `expectedEligibilityRevision`. Copy snapshot `activityRevision` and `currentAttemptId` into `expectedActivityRevision` / `expectedCurrentAttemptId`, and supply `roundId`. Deferral adds only `earliestAt`; urgency adds only `urgency`. The standard action envelope supplies stable action ID, device context and honest observation provenance.

Retain the exact request until the result is known. Retry with the same ID/bytes or read action status after a timeout. A retained accepted result describes that action's acceptance, not current state; reload eligibility afterward. New attempt IDs come from the server's retry result. Harmless route reorder alone does not invalidate these commands. Unsupported fields such as `callCounter` or an appointment end are rejected.

`actions` contains `allowed`, a stable `blocker`, and concise Arabic `message`. Blockers distinguish current customer, future time, capacity, missing location/result, wrong holder, receipt/disposal and delivered/partial work. These are business eligibility affordances; ownership/device generation is also checked when submitting. Deferring current heading/arrived work requires explicit current change or outcome first, so a handled customer cannot disappear silently. Changes to another task preserve current exactly.

## Attempts, quantities and money

Retries preserve source task/cycle identity, source and assignment revisions, old heading/arrival/outcome records and all reported collection. The new attempt has no fabricated heading or arrival. At most one latest attempt exists per B2C task/B2B dispatch cycle, and each old attempt has at most one successor. Retried work passes the same remaining-stop capacity of 50, including branch stops. Denial leaves the shipment held, with its old outcome/reservation/history intact.

B2B retry is whole-only: every frozen line remains undelivered and held. A two-of-three partial delivery leaves one return-required piece; it can never become a customer stop through retry, deferral, urgency, pin correction or manual planning. Personal tasks use simple full/refused/no-answer history without piece, shipping or branch custody fields.

| Three pieces ×100 EGP +50 shipping | New report | Cumulative report |
| --- | --- | --- |
| Refusal, shipping collected | 50 | 50 |
| Explicit retry | No collection | 50 |
| Another refusal after paid shipping | 0 | 50 |
| Explicit retry, then full delivery | 300 | 350 |

Frozen per-unit amounts already exclude prepaid/previously collected source allocations. Outcome arithmetic also subtracts shipping actually reported in earlier attempts. Explicit unpaid shipping remains visible until paid; repeated unpaid attempts do not multiply the fee. Collection is reported money, not settlement. Outcome reads return append-preserved `history`; `items` and processed/quantity counts include latest resolved attempts only, while reported totals include all accepted attempt collections. Amount aggregates remain decimal integer strings.

Deferral persists an earliest timestamp across dates. Its execution override cannot precede a later ERP source earliest time. Merely reaching the time, setting urgency, replanning or correcting a pin does not activate deferred work: use activation for unresolved deferred work, retry for return-required work. No hidden backlog is admitted when capacity is full.

## Reproduce and extend

With the existing local PostgreSQL environment:

```powershell
npm run db:local:start
npm run test:eligibility
npm run eligibility:demo
npm run test:erp:eligibility -- .local/phase-18-demo.json
```

The demo creates/drops only its own isolated test database. It uses actual loopback HTTP clients, public ERP intake, server manual-plan readiness/start, refusal → lost-response retry recovery → full delivery, and future deferral/urgency. Identity/bootstrap is labelled fixture evidence. It produces `.local/phase-18-demo.json`; no live Engine, browser UI, physical receipt, signed sender or real ERP receiver is claimed.

`retry_dependencies` is an append-only P21/P22 hook with `branch-received`, `lost`, `damaged`, `redispatched`. Future receipt/disposal writers must lock driver → workday → assignment → task consistently, append dependency and update quantities/reservation in their own transaction, and test both race orders with retry. Current tests seed these dependency facts explicitly; no receipt API exists yet. P22 must also initialize execution overrides for its new dispatch cycle. P19 may rely on migration 0015, latest-attempt snapshots, durable options/history, capacity admission, fee-preserving outcomes and typed recovery; it must implement closure/carry-forward, its read affordances and cross-round reporting itself. This task does not implement P19.

## P19 preparation integration

The latest ended round can now anchor same-owner preparation without reopening its round/workday. Read `mode` (`active-round`, `preparation`, `historical`); historical action affordances are disabled. Explicit activation/retry respects earliest, source, current, custody, location and capacity rules; start alone creates later admissions. Source-future held work without a reservation also requires explicit admission when due. See [carry-forward contract/evidence](workday-closure.md).
