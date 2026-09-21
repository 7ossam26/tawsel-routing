# Phase 34 — Ordered replay and durable conflict recovery

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Ordered replay, stale ownership and conflicts require recovery without lost or duplicate business changes.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Reconnect the durable client journal to server execution using dependency-aware replay, per-action results and preserved incompatible evidence.

## Prerequisites to verify before editing

Execute after [Phase 33](33-offline-local-capture.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 15](15-round-start-departure-lock.md), [Phase 19](19-workday-closure-carryover.md), [Phase 20](20-device-takeover-evidence.md), [Phase 23](23-bounded-driver-corrections.md), [Phase 25](25-outbox-signed-delivery.md), [Phase 32](32-monitoring-sync-online-ui.md), [Phase 33](33-offline-local-capture.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-08](coverage-matrix.md#r-08), [R-27](coverage-matrix.md#r-27), [R-28](coverage-matrix.md#r-28), [R-29](coverage-matrix.md#r-29), [R-37](coverage-matrix.md#r-37), [R-38](coverage-matrix.md#r-38), [R-40](coverage-matrix.md#r-40), [R-41](coverage-matrix.md#r-41), [R-49](coverage-matrix.md#r-49), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65).
Decision references: D-08, D-09, D-10, D-13, D-19, D-21, D-27, D-29, D-39, D-40, D-61, D-67, D-69, D-73, D-75, D-78, D-81, D-83, D-87, D-91, D-96, D-98, D-105, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 6 and 10–12; D-61, D-79, D-81, D-87, D-96.
- Actual local stores/envelopes, action-status/evidence APIs, correction dependencies and takeover generation.
- Sync batch/recovery schemas, state/consistency document and online status components.

## Required behavior and invariants

1. Replay on reconnect, foreground/reopen and manual retry. Background assistance is optional, not the correctness mechanism.

2. Coordinate one replay owner across same-device tabs; server idempotency remains the final duplicate protection.

3. Keep original action IDs/payload identity; resolve predecessor results/version bindings without rewriting already recorded history.

4. A newer route order alone is compatible; receipt, assignment, owner or closed-day conflicts require real validation.

5. Persist received rejected/review evidence separately from accepted state. Save the acknowledgement locally before removing pending evidence.

6. New-round start must wait for relevant pending synchronization and a fresh server snapshot. Pending day-end does not authorize a later offline round.

## Ordered implementation checkpoints

### Checkpoint A — Server batch protocol

- [ ] Finalize per-action batch/status/evidence/adoption results and implement durable dependency validation.
- [ ] Reuse existing command handlers/transactions instead of building a second permissive bulk state machine.
- [ ] Check: incompatible old-device actions can be durably received for review without being applied.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Client replay coordinator

- [ ] Implement ordered scheduling, fresh authentication boundary, stable-ID retries and durable local acknowledgement.
- [ ] Handle dependencies, lost HTTP response and partial batch success without dropping later unsent actions.
- [ ] Check: a crash between server commit and local ack recovers without a second business effect.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Recovery integration

- [ ] Connect concise pending/retry/review states and compatible current-driver adoption to actual evidence APIs.
- [ ] Complete sync-before-start and pending-day-end gates against the real queue, including a second phone.
- [ ] Check: route reorder does not falsely reject a valid outcome while receipt/day closure cannot be overridden.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| First action's acknowledgement lost | Retry same ID, recover result, then release dependent action. |
| Later action arrives before required predecessor | Wait/reject dependency explicitly; no out-of-order state mutation. |
| Route reorder only | Compatible task/attempt/owner outcome can still apply. |
| Takeover occurred while old phone offline | Retain evidence, deny silent stale-owner write, allow only validated recovery. |
| Some batch entries accepted, others need review | Each durable result is retained independently; no all-success shortcut. |
| New start requested with unsynchronized relevant work | Blocked until synchronization and authoritative validation succeed. |

## Required verification

- Create offline-device-takeover.test.ts connecting actual queue/replay/API and real database, with lost response, duplicates and dependency races.
- Use real-browser reconnect/reopen and two-tab/two-device simulation separately; label accelerated clock/network fixtures honestly.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Integrated ordered replay, per-action durable acknowledgements and actual conflict recovery.
- Connected offline-to-server tests plus explicit sync-before-start enforcement.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No last-write-wins by client clock, fresh ID per retry, blanket batch success, silent queue purge or staff recovery bypass.

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

Phase 35 hardens account expiry/logout and application updates around these durable pending/received states.

Next numbered prompt: [Phase 35](35-offline-auth-updates-ux.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

