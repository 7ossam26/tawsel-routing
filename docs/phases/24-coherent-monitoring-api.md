# Phase 24 — Coherent monitoring snapshots and scoped history

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Coherent projections and scoped history must preserve revisions and mixed-source isolation.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Provide consistent operational read models for drivers, authorized company viewers and individual integrations without leaking mixed-source work.

## Prerequisites to verify before editing

Execute after [Phase 23](23-bounded-driver-corrections.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 06](06-tenant-capabilities-isolation.md), [Phase 17](17-outcomes-quantities-collection.md), [Phase 19](19-workday-closure-carryover.md), [Phase 20](20-device-takeover-evidence.md), [Phase 21](21-source-return-receipt.md), [Phase 23](23-bounded-driver-corrections.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-01](coverage-matrix.md#r-01), [R-04](coverage-matrix.md#r-04), [R-43](coverage-matrix.md#r-43), [R-44](coverage-matrix.md#r-44), [R-45](coverage-matrix.md#r-45), [R-65](coverage-matrix.md#r-65).
Decision references: D-02, D-04, D-12, D-15, D-17, D-24, D-25, D-27, D-62, D-90, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 5, 7, 12 and 14; D-12, D-24, D-62–D-63, D-67.
- Actual effective outcomes, current/next, held/prepared work, corrections and action evidence.
- Monitoring/history schemas and 03-dispatcher-workspace visual/action specification.

## Required behavior and invariants

1. A snapshot contains coherent driver/workday/round, current stage, next suggestion, plan revision, progress and held/prepared groups.

2. Read related values under one coherent database snapshot/revision; do not mix unrelated latest queries or SKIP LOCKED worker reads.

3. Processed, full delivered, partial and failed counts have distinct meanings; a retry is another attempt, not another shipment.

4. Integration views contain only authorized source tasks and safe scoped totals. Inaccessible current/next details must be redacted.

5. Server can show only received evidence, never unsent offline phone activity. Idle action time is not proof the device is offline.

6. Expose last committed change and successful-refresh revision/time support. Frontend polling/reconnect behavior arrives in Phase 32.

## Ordered implementation checkpoints

### Checkpoint A — Read contract

- [ ] Finalize driver/round/history snapshot schemas, filters, pagination, redaction and conditional revision/ETag behavior.
- [ ] Define denominator/held-group semantics from effective corrected data with no commercial settlement claims.
- [ ] Check: all snapshot fields can be derived coherently from implemented state.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Snapshot queries

- [ ] Implement scoped queries/transaction boundaries with appropriate indexes and one authorized source of revision truth.
- [ ] Add action/evidence and integration-status fields only where actual persistence exists; unavailable transport is not labelled applied.
- [ ] Check: a concurrent outcome cannot produce contradictory counts/current/next.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Isolation and freshness evidence

- [ ] Test mixed-integration trips, branch filters and nonregressing revisions across corrections/replans.
- [ ] Instrument commit timestamp/correlation used by later freshness measurement.
- [ ] Check: conditional reads and full resync return the same authorized meaning.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Six delivered, one failed, eleven remaining | Seven processed of eighteen; not seven delivered. |
| Integration A shares a trip with B | A cannot infer B's recipients, pins or hidden totals. |
| Outcome commits during snapshot read | Response represents a coherent point, not half-updated state. |
| Driver idle but refresh succeeds | Transport is fresh; no false offline status. |
| Old snapshot arrives at client later | Revision supports rejecting regression in Phase 32. |
| Unsent phone action exists | Server snapshot does not claim knowledge of it. |

## Required verification

- Run monitoring-snapshot.test.ts through real API/database with concurrent writes, conditional queries and correction history.
- Extend authorization-isolation.test.ts for mixed-trip projections and direct history/action IDs.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Coherent conditional monitoring/history APIs, indexed scoped queries and timing fields.
- Runnable consistency/isolation tests and documented counter units.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No live GPS markers, unsupported presence guarantee, fleet allocation or fresh-data claim derived only from last action time.

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

Phase 32 builds the polling UI; Phases 25–27 add truthful recipient delivery/application states and Phase 38 measures freshness.

Next numbered prompt: [Phase 25](25-outbox-signed-delivery.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

