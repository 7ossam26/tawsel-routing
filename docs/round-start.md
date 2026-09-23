# Online round start — Phase 15

P15 supplies authoritative online start and departure protection. [Ordered evidence](phase-15-evidence.md) separates real PostgreSQL/HTTP results from fixtures. Connected preparation UI remains P28; current/heading/arrival P16, closure P19, takeover P20 and full queue barrier P34.

## Reproduce

Use the existing dedicated PostgreSQL cluster; never run Engine imports. On this machine PostgreSQL is installed outside the shell PATH:

```powershell
$env:PATH = 'C:\Program Files\PostgreSQL\18\bin;' + $env:PATH
npm run db:local:start
npm run db:migrate
npm run test:rounds
npm run rounds:demo
npm run test:erp:rounds
```

The demo creates and removes an isolated marked database. It uses a signed issuer fixture, real application sessions/CSRF, listening HTTP and the portable clients. It creates a manual route with unknown road estimates, obtains readiness, proves an unavailable API cannot start, discards a committed successful response, recovers the same action after restart and observes one round from another device. Exact request/result/forecast evidence is written to `.local/phase-15-demo.json`; no credentials are recorded. The source/withdrawal/capacity races are in `start-assignment-race.test.ts`, using independent connections and PostgreSQL-observed lock waits.

## Public sequence

All endpoints require the existing personal/company session, `?kind=personal|company`, current `execution.own`, tenant/own-driver and branch visibility. POSTs require same-origin CSRF. Integration service credentials cannot start a driver's round.

| Operation | HTTP boundary | Result |
| --- | --- | --- |
| `round.getCurrent` | `GET /api/v1/rounds/current` | Open workday and active round, or null; same authority on another phone |
| `round.prepareStart` | `POST /api/v1/rounds/readiness` | Server-issued, 60-second readiness bound to account/device/plan/input and accepted relevant actions; no active round |
| `round.start` | `POST /api/v1/rounds/start` | Retained action result with `started` or `already-active`; existing owner is preserved |
| `round.getStartResult` | `GET /api/v1/rounds/actions/{actionId}` | 200 accepted/rejected/review result; 202 pending for an unknown/uncommitted action |

Use `packages/api-client/src/rounds.ts`, canonical `contracts/round-start.schema.json`, and examples `p15-readiness`, `p15-start`, `p15-start-result`, `p15-current`, `p15-action-accepted`, `p15-action-rejected`, `p15-action-pending`. `StartActionResult` constrains the accepted response body to `StartResult`. Generic `action.getResult` remains designed; this endpoint discloses start actions only, scoped to the authenticated account with current authorization. A returned receipt is not ERP delivery/application.

Read the current planning history, select its current validated `ready` or explicit `manual` revision, submit `{driverId, deviceId, planId, expectedPlanRevision, relevantActionIds}` for readiness, then send an immutable action envelope with `operationId=round.start` and payload `{driverId, readinessId, planId, expectedPlanRevision}`. Use the same device ID. Retain the complete envelope and action ID on timeout; query or retry it without changing fields. A durable rejection requires a corrected new action, not mutation of the old action. Another phone receives `already-active` with the first owner; that does not grant takeover.

`alreadySynced`, offline drafts and arbitrary local round objects grant no authority. The server checks all listed relevant actions/dependencies are durably accepted, issues readiness only against fresh authorized input, and rechecks expiry, plan/input/assignment revisions, eligibility, earliest dates, policy and capacity inside start. A plan prepared for future work cannot activate it before its actual earliest time. A plan's forecast anchor is preserved; `startedAt` does not rewrite expected arrival times. Manual forecast times stay null.

P34 must supply the complete local journal manifest, ensure every relevant pending action is accepted, persist acknowledgements and keep the journal quiescent until start acceptance. P15 cannot discover omitted unsent device records or verify local storage. This explicitly bounded server evidence is the integration seam, not proof of the future queue-to-start journey. No internet/transport failure can create a local authoritative round; a lost successful response remains unknown until recovery.

## Transaction and departure boundaries

P06 tenant/revocation lock precedes P05 command identity. Start discovers the complete guard set, takes sorted driver → workday → assignment → task guards, re-reads authoritative state and rejects an intervening change. Source edits/admission/pins/planning all share the driver guard. Database partial unique indexes enforce one open workday and active round per tenant/driver across branches. The open day is explicit and can span midnight; no shift-end or arrival is synthesized.

The accepted transaction creates/reuses the open day, creates the active round and server-assigned device generation, records the immutable publication and first plan/forecast/workload references, records source/assignment/pin/attempt admission identities, freezes dispatched content and writes audit/result/outbox together. Pending optimizer leases are superseded. A branch endpoint reserves one remaining stop for subsequent admissions. Source-scoped `round.started` intent includes only that recipient's admitted task IDs; it does not expose the full mixed-source workload or transport a signed event. P25 owns delivery.

An active admission gets the same departure lock in its accepting transaction, including previously unresolved work when its pin/source becomes usable. B2B `editable=false`, command-time assignment history and event task snapshot reflect it. Prepared, unresolved or unadmitted future work stays outside execution. Intake rejection rolls back the whole batch. New membership does not rewrite the first forecast; it is stored in immutable admission history and queued planning revisions. New active membership advances the next estimate's settings revision/time anchor to at least current server time so work available after the old preview is included. It does not automatically reactivate unreserved future work.

All ordinary ERP source/recipient/content/price/urgency/assignment updates are denied after departure, regardless of broad role. Predeparture staff planning/pin changes are denied for departed execution. Assigned-driver execution pin correction remains capability-bound and permitted. P18 adds driver urgency; P21–23 add narrow receipt/disposition/correction transitions. Active vehicle/endpoint changes currently return `lifecycle_forbidden`; a later execution transition must update branch reservations and publication together.

## P16 handoff

P16 may rely on migration 0012, `Rounds`, `rounds/departure.ts`, the four authenticated APIs, typed client, stable start/action recovery, immutable baseline/admission references and the shared driver guard with P05 audit/outbox atomicity. It must add explicit current/heading/arrival without treating plan order or `currentActivity=null` as movement; advance execution/input revisions under the same locks and preserve first baseline references. No P16 action or P20 takeover has been implemented here.
