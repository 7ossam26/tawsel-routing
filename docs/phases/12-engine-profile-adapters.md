# Phase 12 — Routing Engine adapters and vehicle profiles

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Three Engine profiles need precise adapter units, coordinates and honest failure behavior.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Implement and verify the OSRM/VROOM routing boundary for all three vehicle modes, with correct units, coordinates and provider failure semantics.

## Prerequisites to verify before editing

Execute after [Phase 11](11-locations-map-assets.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 02](02-state-contract-foundation.md), [Phase 11](11-locations-map-assets.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-20](coverage-matrix.md#r-20), [R-21](coverage-matrix.md#r-21), [R-22](coverage-matrix.md#r-22), [R-23](coverage-matrix.md#r-23), [R-65](coverage-matrix.md#r-65).
Decision references: D-18, D-30, D-70, D-71, D-72, D-82, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 4 and 9; D-30, D-69–D-72.
- TAWSEL-ENGINE-CONTEXT.md, existing docker-compose.yml, profiles/motorcycle.lua and vroom-conf/config.yml; inspect actual running versions when reachable.
- Canonical planning/coordinate schemas; current primary documentation for the pinned Engine APIs.

## Required behavior and invariants

1. Public modes are car, motorcycle and bicycle; map them deliberately to actual services/datasets, including internal bike naming.

2. Use explicit latitude/longitude in public contracts and the provider-required order only inside adapters. Durations are seconds and distances metres.

3. Default customer service is 600 seconds. Branch service is a separately identified estimate, not a customer outcome.

4. Origin is a last confirmed physical stop or manual/branch pin; never GPS inferred from phone interactions.

5. VROOM temporary numeric IDs are internal and must map back to every public task. Priority alone does not prove urgent-first ordering.

6. Engine failures do not undo accepted receipt/outcomes. Never turn straight-line geometry or missing results into verified road routes.

## Ordered implementation checkpoints

### Checkpoint A — Profile/config boundary

- [ ] Inspect configured and actual reachable Engine versions, profile mapping, ports and dataset compatibility.
- [ ] Implement request/response adapters and safe config validation with explicit units, coordinate conversion and temporary ID mapping.
- [ ] Check: car/motorcycle/bicycle each target the intended service; no default silently routes all modes as car.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Provider behavior

- [ ] Add bounded timeouts/concurrency, typed errors, response validation and route/table/optimization conversion.
- [ ] Keep Engine requests outside domain transactions; do not expose raw service URLs or provider payloads as the public API.
- [ ] Check: malformed/partial/unreachable responses remain distinguishable from success.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Verification fixtures and live calls

- [ ] Create deterministic adapter fixtures for coordinate order, seconds/metres, 600-second service and ID reconciliation.
- [ ] Run separate small live calls for all three configured profiles when available, recording versions and limitations.
- [ ] Check: setup preserves datasets/mounts; missing local Engine is reported without importing OSM automatically.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Bicycle request | Uses verified bicycle profile mapping, not an arbitrary label. |
| Provider returns unknown or duplicate job IDs | Invalid result, never silently accepted. |
| Coordinates reversed | Fixture catches the transformation error. |
| Unreachable leg or unassigned job | Explicit partial/failure data reaches caller. |
| Timeout or Engine outage | Bounded failure; no rollback of previously committed task receipt. |
| Actual Engine inaccessible | Controlled tests may pass; live verification remains unrun. |

## Required verification

- Run engine-adapters.test.ts with controlled boundary fixtures and invalid payloads.
- Record live profile/version/dataset evidence independently; do not infer runtime success from Compose text or historical reports.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Typed routing adapters, profile configuration and validated normalized result models.
- Fixture tests, live-call notes and Engine boundary documentation.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No urgent-group scheduling algorithm, durable job queue, active round publication or dataset refresh in this phase.

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

Phase 13 adds durable jobs; Phase 14 validates complete stitched routes and urgency semantics above these adapters.

Next numbered prompt: [Phase 13](13-planning-jobs-forecast-storage.md). State the exact verified artifacts it may rely on. Do not execute it in this task.
