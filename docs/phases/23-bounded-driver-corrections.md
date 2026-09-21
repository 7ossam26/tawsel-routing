# Phase 23 — Driver corrections and compatible evidence adoption

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Corrections race with receipt, redispatch and closure and cannot invalidate dependent facts.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Let the driver correct a mistaken result or piece count without deleting history or undoing dependent receipt, redispatch or closed-day facts.

## Prerequisites to verify before editing

Execute after [Phase 22](22-branch-interruption-redispatch.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 17](17-outcomes-quantities-collection.md), [Phase 19](19-workday-closure-carryover.md), [Phase 20](20-device-takeover-evidence.md), [Phase 21](21-source-return-receipt.md), [Phase 22](22-branch-interruption-redispatch.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-08](coverage-matrix.md#r-08), [R-09](coverage-matrix.md#r-09), [R-12](coverage-matrix.md#r-12), [R-17](coverage-matrix.md#r-17), [R-18](coverage-matrix.md#r-18), [R-36](coverage-matrix.md#r-36), [R-37](coverage-matrix.md#r-37), [R-38](coverage-matrix.md#r-38), [R-40](coverage-matrix.md#r-40), [R-52](coverage-matrix.md#r-52), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65).
Decision references: D-08, D-10, D-11, D-14, D-22, D-23, D-24, D-26, D-33, D-34, D-35, D-36, D-47, D-51, D-52, D-61, D-67, D-73, D-75, D-78, D-87, D-89, D-91, D-92, D-95, D-96, D-100, D-101, D-105, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 5–8 and 10–11; D-73 as amended by D-91/D-96, plus D-87/D-95.
- Actual quantity ledger, workday closure, owner generation, receipt and cycle dependencies.
- Correction/evidence contracts and 02-stop-details/09-sync-conflicts action specification.

## Required behavior and invariants

1. The assigned current execution owner corrects a recording mistake during an open workday before dependent receipt/redispatch.

2. General ERP staff cannot correct departed delivery outcomes, even with a broad role. Actual receipt/disposition remains a separate narrow authority.

3. Append correction history with the original effective revision; never hard-delete the original action/outcome.

4. Revalidate exact quantities, frozen prices, already reported collection and held disposition. Correction is not an arbitrary refund or underpayment operation.

5. A compatible old-device record can be explicitly adopted by the current driver through validated recovery; client time alone is never authority.

6. If dependencies prevent correction, retain durable discrepancy/evidence and concise permitted next steps; ERP handles commercial consequences.

## Ordered implementation checkpoints

### Checkpoint A — Correction contract

- [ ] Finalize corrected-field constraints, expected effective revision, evidence reference and allowed-action response.
- [ ] Define effective outcome reconstruction without destroying original rows or changing source prices.
- [ ] Check: the API can explain why receipt/day closure makes correction unavailable.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Atomic correction

- [ ] Implement correction/adoption with consistent owner/workday/task/quantity/dependency locks.
- [ ] Update effective progress/collection and outbound correction intent in the same transaction.
- [ ] Check: original history remains queryable while current reads reflect the accepted correction.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Race and recovery proof

- [ ] Extend partial-return-correction.test.ts for correction-versus-receipt/redispatch/day-end and duplicate correction.
- [ ] Exercise old-device compatible adoption and incompatible durable evidence receipt.
- [ ] Check: no recovery endpoint bypasses normal scope, monetary constraints or generation validation.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Wrong piece count, day open, no dependent handover | Validated correction appends history and adjusts effective totals. |
| Receipt/redispatch already depends on result | Correction denied; dependent facts remain intact. |
| Staff attempts departed correction | Denied even if capability name sounds administrative. |
| Duplicate correction request | Same effective result; no repeated quantity/fee movement. |
| Old-phone evidence remains compatible | Current driver may explicitly adopt with current validation. |
| Device timestamp suggests an earlier event | Does not override closure/receipt/ownership dependencies. |

## Required verification

- Run real API/PostgreSQL independent-connection races and injected rollback checks; verify audit/outbox and effective totals.
- Test B2C simple self-correction separately from B2B piece/receipt rules and validate correction event schemas.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Bounded driver correction/adoption APIs, preserved history and allowed recovery reads.
- Concrete accepted/denied examples and completed correction dependency tests.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No staff execution override, source price editor, refund engine, raw undo, reopened closed workday or hidden history deletion.

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

Monitoring and reports consume effective corrected state; online/offline UI displays original, corrected and review-required facts without technical clutter.

Next numbered prompt: [Phase 24](24-coherent-monitoring-api.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

