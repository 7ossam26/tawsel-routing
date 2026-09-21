# Phase 13 — Durable planning jobs and forecast revisions

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Durable jobs, stale result rejection and forecast revisions must survive concurrency and restart.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Turn accepted planning inputs into durable asynchronous jobs and stored plan/forecast revisions, with restart and stale-result protection.

## Prerequisites to verify before editing

Execute after [Phase 12](12-engine-profile-adapters.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 09](09-b2c-task-intake.md), [Phase 10](10-b2b-intake-admission.md), [Phase 11](11-locations-map-assets.md), [Phase 12](12-engine-profile-adapters.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-10](coverage-matrix.md#r-10), [R-22](coverage-matrix.md#r-22), [R-28](coverage-matrix.md#r-28), [R-53](coverage-matrix.md#r-53), [R-65](coverage-matrix.md#r-65).
Decision references: D-07, D-09, D-18, D-19, D-29, D-33, D-39, D-69, D-72, D-82, D-88, D-98, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 7, 9–10 and 15; D-09, D-19, D-39, D-69, D-82, D-88.
- Phase 12 normalized adapters, Phase 10 replan intent and Phase 11 location revision model.
- Planning operation inventory and transaction/worker conventions.

## Required behavior and invariants

1. Intake acceptance, optimization result, plan publication and round start are distinct. This phase stores plans; Phase 15 starts a round.

2. Planning snapshots include source/assignment/pin revisions, mode, origin, current target, urgency, earliest availability and endpoint.

3. Jobs persist inputs/fingerprints and have recoverable claims/leases. HTTP/Engine work runs outside long transactions.

4. A result based on obsolete input cannot replace newer manual choices, assignments, outcomes or current-target decisions.

5. Store forecasts and workload membership now. Do not reconstruct old expected times later when reports are built.

6. Expose pending/running/complete/partial/failed/superseded states honestly, with a stable job result query.

## Ordered implementation checkpoints

### Checkpoint A — Job and plan contract

- [ ] Finalize job/status/plan/forecast schemas and migrations; define input fingerprint and revision comparison explicitly.
- [ ] Connect accepted intake/pin changes to durable planning requests with bounded per-driver concurrency.
- [ ] Check: committed intake survives an unavailable planner and queued intent remains inspectable.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Worker persistence

- [ ] Implement claim, lease expiry, restart recovery and result persistence using real database records.
- [ ] Store normalized route candidates and forecast snapshots with task/attempt/workload identity; do not activate a round.
- [ ] Check: a killed worker recovers a job without publishing duplicate effective revisions.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Obsolete work handling

- [ ] Recheck input under lock before publishing a ready/draft revision; mark stale results superseded and request current work when appropriate.
- [ ] Return useful async status/errors through real APIs and generated client types.
- [ ] Check: an intentionally delayed response cannot overwrite a later pin/manual/source change.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Worker dies during an Engine call | Lease recovery permits retry; job is not permanently lost. |
| Engine result arrives after pin revision changes | Result is superseded rather than published as current. |
| Same replan intent retried | No duplicate effective plan/forecast publication. |
| Partial provider result | Stored as partial with explicit affected IDs, pending Phase 14 complete validation. |
| Several forecasts created | All identifiable revisions remain available; no baseline overwritten. |
| API client polls job after restart | Reads durable actual status instead of process memory. |

## Required verification

- Create planning-jobs.test.ts and begin planning-publication.test.ts with real PostgreSQL, delayed provider fixtures and worker restart.
- Inspect committed job/plan/forecast rows and outbound intent. A fixture route must not be labelled live Engine evidence.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Durable planner worker responsibility, planning/status APIs and versioned plan/forecast storage.
- Restart/stale-result tests and documented trigger/input semantics.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No active round start, complete urgent-order guarantee, device takeover or report UI.

## Instructions for an agent starting with no chat history

Tawsel is an Arabic RTL delivery PWA around an existing Nominatim/OSRM/VROOM Engine. B2C drivers enter their own work; B2B companies assign work through ERP. Tawsel owns execution and progress. The real shipping ERP is a separate project; the mock must use the same public boundary.

Use the accepted React/TypeScript/Vite, shadcn/ui + Smooth UI, Fastify, PostgreSQL, Keycloak/OIDC and MapLibre/PMTiles stack. Use Vitest for connected behavior and Playwright for real browser flows. Choose compatible pinned versions from current primary documentation during implementation.

Execute only this numbered phase. Inspect AGENTS.md, HEAD, working changes and the real prerequisite code before editing. Preserve unrelated work, Engine datasets/mounts and original Stitch exports. Never run map imports as ordinary application setup. The preceding phase being listed as complete is not proof that its output works.

Read master-plan.md, the current/latest discovery decisions, docs/phases/README.md, this phase's requirement rows in coverage-matrix.md and docs/implementation-status.md. Then read the specific sources below. The rules embedded here are the minimum scope; the canonical documents resolve terminology and amendments. Do not depend on another agent's memory or silently substitute an easier behavior.

No V1 GPS, billing, call counters, advanced POD, direct driver transfer, financial settlement or real ERP build. B2C has no item splitting or branch custody. Do not add speculative modules to fill screens.

## Execution rhythm and evidence

Work through the three checkpoints below in order. After each checkpoint, run its focused check and record the result before expanding the change. These are implementation checkpoints within this phase, not permission requests. A checkpoint failure must be fixed or reported with its concrete dependency; do not hide it under a passing build.

Use real isolated PostgreSQL for transaction/locking/durability claims, with independent connections and real commit boundaries where relevant. Label provider fixtures, local services and browser/device evidence separately. No empty test files, implementation-mirroring assertions or invented pass results.

UI changes must preserve the reference design language while implementing plan-defined actions. Keep one dominant stage action, brief Arabic purpose/next-step/blocker/waiting copy, contextual secondary controls, RTL, accessible focus and reduced motion. A screenshot or build does not prove usability.

At completion update canonical schemas/examples/client/docs affected here, the operation coverage map and docs/implementation-status.md. Record changed paths, exact commands, actual results, versions, failed/unrun checks and any review feedback. Leave a reproducible demo and a concrete handoff. Do not run the next phase, publish, commit or push merely because this prompt exists.

For any affected public interface, update docs/erp/ERP-PLANNING-INPUT.md, field-and-status-mapping.md and the available consumer quickstart/conformance checks in the same phase. Preserve canonical schema/example ownership and distinguish designed from verified behavior. Record the actual Codex model/reasoning setting in the phase evidence.

## Handoff and stopping point

Phase 14 adds complete route validation/manual fallback; Phase 15 binds an accepted plan revision to the first-start baseline.

Next numbered prompt: [Phase 14](14-route-policy-manual-fallback.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

