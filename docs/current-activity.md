# Explicit heading, arrival and physical origin

Phase 29 connects this read to the ordinary production journey. Each eligible `CurrentTarget` now includes a closed `delivery` affordance: personal/company kind, actual permitted outcome identifiers and server-calculated full/goods/remaining-shipping money. The browser uses it for exact display/submission and never derives ERP allocation. The active map/list is destination context only; choosing a pin/list row or opening an external handler remains non-mutating. [Connected UI/browser evidence](phase-29-evidence.md).

P20 shared generation/snapshot fencing now covers all current actions plus outcomes, eligibility, closure and active planning/pins. Stale submissions become durable review evidence; [device protocol](device-ownership.md). No takeover UI was added to this P16 component.

Phase 16, locally verified 24 September 2026. [Ordered evidence](phase-16-evidence.md). The focused production component is `/rounds/current?kind=personal|company`; it requires a P15 started round. Full preparation/outcome/execution UI remains P28–31.

`nextSuggestion` never creates current activity. Choosing a recipient in the local selector only previews details. `current.selectHeading` explicitly begins heading. `current.recordArrival` is a separate action. Calls, WhatsApp and external navigation are ordinary links and create no application commands. The server does not collect GPS or infer contact success.

## Reproduce

```powershell
$env:PATH='C:\Program Files\PostgreSQL\18\bin;'+$env:PATH
npm run db:local:start
npm run test:current
npm run current:demo
npm run test:erp:current -- .local/phase-16-browser-demo.json
```

`current:demo` creates and drops an isolated marked PostgreSQL database, starts real Fastify/Vite and exercises Chromium. Only authenticated-account/session resolution and Engine responses are fixtures. It uses real intake/manual planning/start/current handlers, commits, session-CSRF guard, typed browser clients, browser reload, keyboard/touch and lost-response recovery. Native external-app handoff is intercepted; physical phone, real issuer and live Engine are not claimed. The report contains synthetic identities and exact current/next/physical origin/history, not credentials. Screenshots are in `output/playwright/phase-16-*.png`.

For an interactive isolated fixture, run `node --env-file=.env.database.local --import tsx scripts/current-browser-server.ts`, then Vite on localhost:5178 with `VITE_TAWSEL_API_BASE_URL=http://127.0.0.1:3016`. The script prints the fixture owner device ID; set `localStorage['tawsel:device-id']` to that ID only in this fixture browser, then visit `/rounds/current?kind=personal`. Normal production code uses its existing local device identity; it never copies the owner device ID from a server read. Stop the fixture server cleanly to drop its disposable database. No map imports are involved.

## Public boundary

All routes require a current own-driver browser session and `kind=personal|company`. POST also requires same-origin CSRF. Service credentials cannot impersonate the driver.

| Operation | Endpoint | Result |
| --- | --- | --- |
| `current.getActivity` | `GET /api/v1/current/rounds/{roundId}` | Coherent `CurrentSnapshot`, includes owner, revision, eligible admitted targets, explicit current, physical origin and separate suggestion |
| `current.selectHeading` | `POST /api/v1/current/heading` | Retained `CurrentActionResult` |
| `current.recordArrival` | `POST /api/v1/current/arrival` | Retained `CurrentActionResult` |
| `current.correctOrigin` | `POST /api/v1/current/origin` | Explicit owner-fenced manual correction; does not select a target or claim arrival |
| `current.getResult` | `GET /api/v1/current/actions/{actionId}` | Accepted/rejected/review result or 202 pending; pending is not acceptance |

Canonical ownership: [schema](../contracts/current-activity.schema.json), [OpenAPI](../contracts/openapi.yaml), [examples](../contracts/examples/valid.json), [typed client](../packages/api-client/src/current.ts), [operation map](contract-coverage.md). Exact shape examples are `p16-select-heading`, `p16-arrival`, `p16-correct-origin`, `p16-heading-action-accepted`, `p16-arrival-action-accepted`, `p16-action-pending`, `p16-snapshot-arrived`. These illustrative fixed IDs are schema evidence; the browser report contains actual run IDs. General `action.getResult` is still designed.

Example payloads, inside the standard stable `ActionEnvelope`:

```ts
const state = await current.read(roundId);
const target = state.targets.find(t => t.taskId === selectedTaskId)!;
const selection = {
  roundId, taskId: target.taskId, attemptId: target.attemptId,
  expectedActivityRevision: state.revision,
  expectedCurrentAttemptId: state.currentActivity?.attemptId ?? null,
  expectedSourceRevision: target.sourceRevision,
  expectedAssignmentRevision: target.assignmentRevision,
  expectedPinRevision: target.pinRevision
};
// operationId=current.selectHeading, with this device ID and owner generation.
// Preserve the complete envelope and actionId until a terminal result is known.
// Arrival uses a fresh actionId and refreshed revision/current attempt;
// its operationId is current.recordArrival. A timeout never creates a new ID.
```

`baseVersions.routeRevision` is not an execution dependency. A compatible harmless route reorder does not invalidate selection/arrival. The closed payload requires relevant source, assignment, pin and current-activity versions. A new pin must be reloaded before arrival; correcting a destination after an already recorded arrival does not retroactively move that arrival's retained physical origin.

## State and evidence rules

Selection requires an eligible admitted task/attempt assigned to this driver. It compares both activity revision and the previously current attempt. Changing a heading explicitly pauses that prior attempt; selecting it later reuses the stable attempt identity and original first-heading evidence, with another history entry. Arrived work rejects replacement until an accepted outcome resolves it. Two simultaneous selections yield one accepted transition and a retained stale-revision result for the other. A wrong device ID or generation yields `stale_device`, preserved command evidence and no domain mutation; takeover is P20.

`recordedAt` is server recording time inside the accepted transaction. `observation.observedAt` and `clock` retain the device report, including null/unknown/uncertain values; they do not replace server time or become measured travel time. Browser reports its clock as uncertain. Arrival retry returns the exact same result/time and writes no second history/origin/event. Historical start results stay at their command-time snapshot; `round.getCurrent` and `current.getActivity` expose live current state.

Migration 0013 enforces a single heading/arrived attempt per round, admission/attempt/round FKs, immutable first-heading/arrival evidence, and append-only activity and driver-scoped physical-origin histories. State/current/physical-origin projections, planning generation/job, audit, source-filtered event intent and action result commit together. First forecast/workload references and original forecasts remain unchanged.

Planning input uses the last recorded arrival/manual correction, falling back to its explicit initial manual origin. Physical evidence and protected current participate in its fingerprint; delayed workers cannot publish over them. Replanning may reorder the next suggestion while keeping current unchanged. A retained suggestion can be marked updating and has no fresh ETA claim. Manual correction has its own `expectedOriginRevision`; ordinary active draft saves cannot move the physical origin. Effective `PlanningInputSettings` is server-derived; draft `PlanningSettings` still accepts only a manual pin.

Heading/arrival ERP intents carry only that recipient source's task/attempt, driver/round, stage, activity revision and action time. A replaced source receives a `paused` heading event for its own prior task, without the new source's task/recipient. No manual-origin coordinates are broadcast to unrelated sources. Signed sending remains P25; none of these local intents proves ERP application or custody/delivery/collection.

## Original Phase 16 handoff to Phase 17

Use migration 0013, `apps/api/src/current/{service,state,models,routes}.ts`, `planning_states.current_target/physical_origin`, `execution_attempts`, immutable `current_activity_history`/`physical_origin_history`, and P15 admissions/first forecasts. The verified suite is `current-activity.test.ts`; the real browser fixture/replay demonstration is `tests/current-browser/current.spec.ts`.

At the Phase 16 stopping point, P17 was required to add resolved-attempt/outcome states in a new migration, extend the current-history null/resolution contract, clear the current projection when its attempt resolves, advance activity/execution revisions and enqueue in the same locked transaction. It must not select the next suggestion. Preserve first heading/arrival evidence and add outcome history rather than rewriting it. A phone-only outcome must leave `physical_origin` and its history untouched. **No P17 outcome command exists or was tested in this phase**; the present evidence proves origin writes only through explicit arrival/manual correction and no movement from contact/selection/planning. P18 owns eligibility/retry changes, P20 takeover, P33–34 the full queue/start gate. Do not treat the focused component as full execution UI.

## Phase 17 integration — 24 September 2026

[Outcomes](outcomes.md) now implement that handoff in additive migration 0014. Accepted full/partial/refused/no-answer resolves the compatible attempt, appends current-history with null current, advances activity/execution revisions and enqueues planning atomically. First heading/arrival and physical origin are preserved; a phone-only result has no invented movement. Resolved personal tasks and rejected B2B remainders leave eligible targets and next suggestions. The production current component now supplies the P29 ordinary full/no-answer path with stable action recovery and mandatory takeover snapshot-token propagation. P30 owns partial/refusal/correction choices; P31 owns branch/closure.
