# Phase 19 — Round closure, workday closure and carry-forward

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Round/workday closure and carry-forward interact with unfinished custody and immutable history.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Close rounds and explicit workdays without losing held work, resetting history at midnight or implying delivery, receipt or settlement.

## Prerequisites to verify before editing

Execute after [Phase 18](18-deferral-retry-driver-urgency.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 15](15-round-start-departure-lock.md), [Phase 16](16-current-heading-arrival.md), [Phase 17](17-outcomes-quantities-collection.md), [Phase 18](18-deferral-retry-driver-urgency.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-24](coverage-matrix.md#r-24), [R-29](coverage-matrix.md#r-29), [R-52](coverage-matrix.md#r-52), [R-53](coverage-matrix.md#r-53), [R-65](coverage-matrix.md#r-65).
Decision references: D-06, D-08, D-20, D-21, D-24, D-26, D-37, D-49, D-67, D-82, D-88, D-89, D-100, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 6–7, 11 and 15; D-08, D-21, D-24, D-67, D-81.
- Actual workday/round/current constraints, outcomes and earliest-time eligibility.
- 08-trip-completion and 05-driver-daily-trips visual roles; report/state contracts.

## Required behavior and invariants

1. Many rounds belong to one explicit workday. A workday can span midnight; it is not reset by calendar date.

2. End round and End day are distinct operations. End day resolves/pauses current activity explicitly and ends its active round.

3. Unfinished held work carries forward with original source/cycle/history and earliest constraints; ERP need not submit it again.

4. Closure does not mark held returns as received, unpaid money as settled or unfinished scope as fully delivered.

5. Store actual UTC timestamps and use Africa/Cairo display rules, not a fixed UTC offset assumption.

6. Later offline day-end remains pending until accepted; no new round can start before relevant synchronization succeeds.

## Ordered implementation checkpoints

### Checkpoint A — Closure contract

- [ ] Finalize end-round/end-day schemas, current-activity requirements and idempotent closure results.
- [ ] Define carry-forward queries by workday/holder rather than cloning tasks each day.
- [ ] Check: unresolved current activity is explained and cannot disappear through a generic close action.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Transactional close

- [ ] Implement close under driver/workday locks with preserved outcome/held state, audit/result/outbox and actual timestamps.
- [ ] Prevent concurrent new-start/close races from creating multiple open workdays or a round under a closed day.
- [ ] Check: closure at midnight retains exact histories and source identities.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Summary and next day

- [ ] Expose a basic effective outcome/collection/held-work summary for later UI; distinguish processed from delivered.
- [ ] Demonstrate reopening daily work and starting a later round with carried held eligible tasks.
- [ ] Check: deferred future tasks stay ineligible and remain visibly retained.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Day ends with held unfinished shipments | Tasks remain held and available under correct later eligibility. |
| Workday crosses midnight | Same workday ID until explicit End day. |
| End day retried after lost response | Same closure result; no duplicate history or event. |
| Close races with new start | One valid lifecycle order under database constraints. |
| A return request is pending | Closure does not fabricate actual receipt or settlement. |
| Client later queues offline day-end | Server contract supports pending/replay; actual offline behavior is verified in Phase 34. |

## Required verification

- Run workday-carryover.test.ts with real database, midnight/Cairo offset fixtures, duplicate close and separate-connection races.
- Check basic summary denominators and unchanged source/attempt identities; detailed timing/report export belongs to Phases 36–37.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Round/day closure commands, carry-forward reads and basic summary API.
- Lifecycle tests and clear prerequisites for pending offline closure.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No automatic midnight reset, source resubmission requirement, financial day settlement or final report dashboard.

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

Phase 20 uses open-day constraints for takeover; Phase 23 races correction with closure; later PWA phases enforce the pending-close start gate.

Next numbered prompt: [Phase 20](20-device-takeover-evidence.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

