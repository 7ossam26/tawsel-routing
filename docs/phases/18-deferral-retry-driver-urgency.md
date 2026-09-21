# Phase 18 — Deferral, whole-shipment retry and driver urgency

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Retry, deferral and urgency have different eligibility rules and must protect current work.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Allow the driver to reschedule eligible whole work and set urgency without reopening rejected partial remainders or disturbing the current customer.

## Prerequisites to verify before editing

Execute after [Phase 17](17-outcomes-quantities-collection.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 14](14-route-policy-manual-fallback.md), [Phase 16](16-current-heading-arrival.md), [Phase 17](17-outcomes-quantities-collection.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-12](coverage-matrix.md#r-12), [R-13](coverage-matrix.md#r-13), [R-16](coverage-matrix.md#r-16), [R-18](coverage-matrix.md#r-18), [R-24](coverage-matrix.md#r-24), [R-25](coverage-matrix.md#r-25), [R-30](coverage-matrix.md#r-30), [R-31](coverage-matrix.md#r-31), [R-65](coverage-matrix.md#r-65).
Decision references: D-06, D-20, D-23, D-31, D-35, D-36, D-37, D-46, D-47, D-48, D-49, D-50, D-52, D-57, D-64, D-65, D-66, D-73, D-79, D-89, D-91, D-92, D-93, D-94, D-95, D-97, D-98, D-101, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 7 and 9; D-06, D-37, D-48–D-49, D-64–D-65, D-79, D-94, D-97–D-101.
- Actual outcome/held quantities, planning eligibility and departure permissions.
- Canonical deferral/retry/urgency schemas and attempt history.

## Required behavior and invariants

1. Deferral is an earliest date/time, not a narrow appointment or hard delivery guarantee. Respect it across days.

2. Retry is explicit: same driver, untouched whole return-required shipment still held, before confirmed branch receipt.

3. Rejected partial remnants, disposed lost/damaged goods and incompatible receipt/redispatch are never revived by retry.

4. There is no call counter, three-call cap or artificial retry limit. History is automatic, not extra clerical logging.

5. ERP urgency is allowed before departure; only assigned-driver urgency during execution. Urgency never overrides current target or future eligibility.

6. Retry/deferral/urgency preserves original attempts, source identity and collected fees; reactivation must pass remaining-stop capacity.

## Ordered implementation checkpoints

### Checkpoint A — Eligibility commands

- [ ] Finalize earliest-time/retry/urgency contracts with explicit denial reasons and relevant revisions.
- [ ] Implement reusable eligibility predicates from actual quantity/holder/attempt state; leave hooks for Phase 21 receipt dependencies.
- [ ] Check: two-of-three rejected remainder cannot be turned into a new customer stop.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Transactional transitions

- [ ] Implement commands with consistent capacity/current locks, history/audit/outbox and durable replan intent.
- [ ] Keep future work visible but outside the executable sequence; explicit manual choices still validate eligibility.
- [ ] Check: reactivation at capacity fails without losing the held task or rewriting its history.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — History and UI inputs

- [ ] Expose allowed actions and concise blockers for later contextual UI; derive permission/state on the server.
- [ ] Test repeated retries and collection history so a previously paid fee is not recollected.
- [ ] Check: staff postdeparture urgency request is denied while compatible assigned-driver request succeeds.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Whole no-answer work, still held, no receipt | Explicit same-driver retry is eligible if capacity permits. |
| Rejected remainder after partial delivery | Retry/deferral for customer revisit is denied. |
| Earliest time tomorrow | Task stays visible and ineligible today, even if urgent. |
| Route already at 50 remaining stops | Reactivation denied without hidden backlog or lost held state. |
| Prior shipping was reported on an earlier attempt | Retry cannot charge it again. |
| Call counter field submitted | Unsupported field/behavior does not create a hidden three-call rule. |

## Required verification

- Run retry-deferral-urgency.test.ts through real API/database, capacity races and prior-collection scenarios.
- Extend planning-publication.test.ts for urgency/earliest updates arriving while an older optimization is running.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Validated contextual commands, allowed-action reads and preserved attempt history.
- Concrete denied/accepted cases and updated eligibility documentation.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No automatic retries, rejected-remnant delivery, dispatcher approval, call accounting or guaranteed appointment window.

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

Receipt/correction phases add dependency race coverage; execution UI phases 29–31 exposes these actions progressively without crowding the driver screen.

Next numbered prompt: [Phase 19](19-workday-closure-carryover.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

