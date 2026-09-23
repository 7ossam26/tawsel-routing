# Urgent-first policy and manual routes — Phase 14

An optimized **ready** revision has passed complete route validation. A **partial** revision records every unassigned task and cannot be treated as ready. A **manual** revision records a complete eligible order with no computed road candidate, distance, geometry or arrival/finish estimate. Historical P13 **drafts** remain unvalidated. None of these states starts a round; P15 must recheck current input and accept a ready/manual revision online.

## Policy and timing

The authoritative snapshot uses the saved `plannedStartAt` as a common eligibility/forecast horizon. Work after that instant stays excluded, even if urgent or if a simulated route would pass its earliest time. Prepared, unresolved, unreserved and resolved/paused members also stay excluded. No future task is automatically admitted. Future execution/outcome/retry writers must update that same eligibility model; P17–18 return-required partial remnants are not implemented by this phase.

1. Validate the received eligible set and capacity, counting each shipment independently and an explicit branch endpoint as one additional stop. The maximum is 50 remaining stops; no shift-end cutoff, automatic splitting or fleet allocation.
2. Optimize the explicit current target alone, then the urgent group, then the ordinary group. Each next group starts at the preceding group's last customer. Translate local offsets by the preceding departure time, accumulating travel/distance and preserving waiting separately from service.
3. An unreachable current target blocks the following sequence. Unassigned urgent work remains an explicit `unassigned-urgent` exception; an ordinary candidate is only partial in that case. It never proves urgent work was satisfied.
4. Default end is the last customer. For a selected B2C fixed endpoint or B2B branch, compute a final OSRM road leg from the last visited customer using the same mode. Add branch service separately. Failure of that leg fails the calculation; it is never silently omitted. Endpoint choice affects the appended leg, not group optimization's objective.
5. Reconcile every eligible ID exactly once across visits/unassigned; reject unknown, repeated or omitted IDs, wrong profile/coordinates/service, non-monotonic cumulative units, broken arrival/leg arithmetic, earliest violations, endpoint mismatch, wrong totals and capacity overflow. Validate again under the publication fence before appending history.

This is a sequencing heuristic, **not a globally optimal route guarantee**. VROOM priority controls inclusion preferences and does not enforce the required sequence. [Pinned primary API](https://raw.githubusercontent.com/VROOM-Project/vroom/v1.15.0/docs/API.md). Ten-minute customer service remains an estimate. `candidate.policyValidated:false` describes the normalized provider format; `plan.policyValidated:true` and `routePolicy` record application validation of the assembled result. No geometry is inferred from visit coordinates.

Example: current ordinary A, urgent B/C, ordinary D, future urgent E gives `A → optimized(B,C) → D`; E is excluded. With controlled 10-second legs and seven seconds waiting per customer, arrivals are 10, 627, 1244 and 1861 seconds from the common origin. Service is 2400 seconds, waiting 28, travel 40. Unassigned B produces a partial exception naming B. Co-located A/D still have separate task/attempt/forecast membership.

## Manual command and continuation

Use the existing human session + CSRF `PlanningClient`; ERP bearer credentials do not impersonate a driver. Read `plans(driverId)` to get `settingsRevision`, `inputRevision`, `manualRevision`, current history and latest job. Submit `planning.setManualOrder` through `/api/v1/planning/commands/planning.setManualOrder?kind=personal|company` with the normal action envelope and:

```json
{
  "driverId": "<driver UUID>",
  "expectedSettingsRevision": 1,
  "expectedInputRevision": 3,
  "expectedManualRevision": 0,
  "selection": { "kind": "order", "taskIds": ["<all eligible task UUIDs in order>"] }
}
```

Alternatively use `selection: {kind: "select-first", taskId: "<eligible UUID>"}`. Remaining members retain the most recent valid order within urgency groups; new members use stable task-ID order. This selects a planned first suggestion. It does not record heading, replace an already current target or assert movement/arrival. The current target must remain first; urgent members must precede ordinary ones. Missing, duplicate, foreign, future or prepared tasks cannot form a manual plan. Neither form bypasses capacity or branch/account restrictions.

HTTP 200 returns an idempotent ActionResult with `{planId, revision, manualRevision, inputRevision}`. A stale settings/input/manual version returns 409 `stale_revision`; an ineligible or invalid order returns 409 `invalid_manual_order`. Reload before making a new decision; retry the identical command/action after an unknown delivery outcome. Valid manual acceptance atomically increments input/manual revisions, supersedes pending/running jobs, appends the plan, forecast membership and source-scoped notice, then updates the current pointer. An older worker cannot publish afterward. A **newer** accepted intake/source/pin trigger or explicit replan may request new optimization, always preserving the actual current target.

Manual `candidate` and `jobId` are null. Forecast membership is `manual` with a position and null arrival/completion; expected finish is null. Forecast/workload IDs and task/attempt/source/assignment/pin identity remain stored. Prior estimates never change. No road feasibility is claimed for a manual order.

On provider failure/pending reoptimization, `plans.continuation` exposes the latest ready/manual sequence only if its remaining eligible IDs still cover current work and satisfy current/urgent/capacity constraints. Otherwise it is null. It contains `requiresManualConfirmation:true` and `roadMetricsAvailable:false`; submit that order to create a current manual revision. It does not make a stale plan startable or transplant old estimates onto changed pins. The historical revision remains inspectable regardless.

## Durable states, demo and handoff

Job lifecycle remains `pending/running/complete/partial/failed/superseded`. `resultKind` distinguishes `full`, `partial`, `invalid`, `dependency-failed`, or null before a result. A retrying pending job may retain a dependency error. Inspect plan state as well: historical P13 complete jobs still reference drafts. Ready requires complete coverage; partial plans name affected IDs in `routePolicy.exceptions` and have null whole-workload finish.

```powershell
npm run db:local:start
npm run db:migrate
npm run test:planning
npm run planning:policy:demo
npm run test:erp:planning
npm run engine:live
```

`planning:policy:demo` creates/removes an isolated PostgreSQL database. Its controlled HTTP providers demonstrate Engine failure → manual first plan → ready plan → newer manual decision superseding delayed optimization, preserving three forecasts. Inspect `.local/phase-14-demo.json`. The integration tests separately verify public ERP urgency/prepared/future inputs, current prefix fixtures, malformed output, endpoints, actual worker kill/recovery, manual races and real-session HTTP restart. These fixtures do not establish live road suitability. The live probe is read-only and currently fails; see [dated evidence](phase-14-evidence.md).

P15 may rely on migrations 0009–0011; the driver/input/lease fences in `planning/queue.ts` and `worker.ts`; `policy.ts` complete validation; `manual.ts` revisioned publication; stored plan/forecast/workload identity; and generated Planning contracts/client. It must require a current valid ready/manual revision, establish one online round/departure authority and capture the first baseline atomically. There is no round-start implementation here. P16 owns actual heading/arrival and physical-origin integration; P17–18 outcomes/retries; P22 full-capacity branch interruption/branch attempt lifecycle; P25 signed delivery; P28 connected UI. Existing last-customer/manual-pin settings and explicitly selected branch pins retain their P13 semantics.

## P18 eligibility updates

Driver earliest/urgency commands enqueue under the same driver lock. Deferred tasks remain visible in input but excluded even after the time passes until explicit capacity-checked activation. Retry replaces only the latest attempt identity. A delayed optimization after either update is superseded; protected current/origin and first forecast survive. [API/evidence](eligibility.md).
