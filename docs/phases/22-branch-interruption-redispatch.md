# Phase 22 — Branch interruption, resume and new dispatch cycles

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Branch interruption, capacity, resumed routes and fresh dispatch identities interact.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Integrate branch service into an active round without losing the paused customer sequence, exceeding route capacity or pretending returned goods remain eligible in the old cycle.

## Prerequisites to verify before editing

Execute after [Phase 21](21-source-return-receipt.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 14](14-route-policy-manual-fallback.md), [Phase 16](16-current-heading-arrival.md), [Phase 18](18-deferral-retry-driver-urgency.md), [Phase 19](19-workday-closure-carryover.md), [Phase 21](21-source-return-receipt.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-13](coverage-matrix.md#r-13), [R-29](coverage-matrix.md#r-29), [R-31](coverage-matrix.md#r-31), [R-32](coverage-matrix.md#r-32), [R-33](coverage-matrix.md#r-33), [R-35](coverage-matrix.md#r-35), [R-36](coverage-matrix.md#r-36), [R-65](coverage-matrix.md#r-65), [R-64](coverage-matrix.md#r-64).
Decision references: D-08, D-21, D-22, D-32, D-34, D-42, D-43, D-45, D-49, D-57, D-65, D-66, D-67, D-68, D-79, D-80, D-95, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md sections 7 and 9; D-22, D-34, D-43, D-66, D-68, D-80, D-95.
- Actual current/arrival, planning capacity, source-return confirmation and assignment models.
- State specification's labelled proposed full-capacity interruption treatment.

## Required behavior and invariants

1. Heading-to-customer activity may pause; an arrived/handled customer attempt must be resolved before branch interruption.

2. Keep one active round/workday. Branch activity is explicit and the retained customer sequence remains visible.

3. At 50 customer stops, the baseline temporarily publishes a branch-service segment while visibly pausing the customer sequence. Never publish a 51-stop active plan or secretly discard work.

4. This interruption is not permission to split an over-limit incoming batch; Phase 10 admission remains atomic.

5. Resume from confirmed branch arrival with relevant claimed-handback confirmation, without a whole-request settlement gate.

6. Only compatible confirmed source return permits ERP redispatch through a new cycle. Preserve source identity and earlier attempts/collections; no direct driver transfer.

## Ordered implementation checkpoints

### Checkpoint A — Interruption transitions

- [ ] Finalize pause/branch-heading/arrival/resume contracts and activity mode constraints.
- [ ] Retain customer sequence/forecast membership and implement explicit origin changes from branch arrival.
- [ ] Check: an unresolved arrived customer cannot vanish into branch activity.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Capacity and receipt integration

- [ ] Implement the visible branch-segment treatment using the existing plan/receipt state under shared locks.
- [ ] Require confirmation for the handed subset while retaining unreceived portions honestly.
- [ ] Check: interruption at full capacity preserves every accepted task without a hidden overflow route.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Redispatch cycle

- [ ] Implement new-cycle source commands after compatible actual return; preserve old holder/outcome/history links.
- [ ] Prevent old-cycle retry/outcome/correction from reviving returned or newly dispatched pieces.
- [ ] Check: concurrency between redispatch and old commands has one valid business result.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Driver heading to customer requests branch visit | Customer sequence pauses visibly; one round remains active. |
| Driver already arrived/handling customer | Resolve that attempt before interruption. |
| 50 remaining customer stops plus branch service | No 51-stop active plan, no lost tasks and no extra automatic round. |
| Only a returned subset is confirmed | Confirmed handback can complete without settling every offered item. |
| Source receipt confirmed then redispatched | New cycle with preserved original history; no duplicate pieces. |
| Old-cycle outcome arrives after redispatch | Rejected/review evidence retained without corrupting new cycle. |

## Required verification

- Run branch-interruption.test.ts at normal/full capacity, with stale planner completion and unavailable receipt.
- Extend real PostgreSQL receipt/redispatch races and verify preserved sequence, forecast revisions, quantity/event conservation.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Complete dispatch-cycle and branch-resume mapping in docs/erp/field-and-status-mapping.md. Show why confirmed return permits a new dispatch and does not reopen the old cycle; document stable shipment IDs versus new execution IDs.
- Branch activity/resume and new-cycle redispatch implementation.
- Concrete full-capacity and subset-confirmation scenarios with API examples.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No arbitrary branch selection, direct transfer, automatic batch splitting or invented physical receipt. Surface a proven invariant contradiction rather than silently changing the business rule.

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

Phase 23 adds correction dependency races; execution UI phases 29–31 builds the simple driver branch flow over these real states.

Next numbered prompt: [Phase 23](23-bounded-driver-corrections.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

