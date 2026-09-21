# Phase 21 — Source-branch return requests and actual subset receipt

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Actual subset receipt, source ownership and unresolved goods require strict quantity conservation.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Record driver return requests and native-ERP confirmation of actual pieces received, while preserving unresolved goods and the distinction between receipt and loss/damage.

## Prerequisites to verify before editing

Execute after [Phase 20](20-device-takeover-evidence.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 08](08-erp-provisioning-actor-binding.md), [Phase 17](17-outcomes-quantities-collection.md), [Phase 18](18-deferral-retry-driver-urgency.md), [Phase 19](19-workday-closure-carryover.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-08](coverage-matrix.md#r-08), [R-12](coverage-matrix.md#r-12), [R-16](coverage-matrix.md#r-16), [R-31](coverage-matrix.md#r-31), [R-32](coverage-matrix.md#r-32), [R-33](coverage-matrix.md#r-33), [R-34](coverage-matrix.md#r-34), [R-50](coverage-matrix.md#r-50), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65), [R-64](coverage-matrix.md#r-64).
Decision references: D-13, D-14, D-21, D-32, D-35, D-36, D-42, D-44, D-45, D-46, D-47, D-48, D-49, D-52, D-65, D-68, D-73, D-79, D-80, D-84, D-89, D-91, D-93, D-95, D-101, D-105, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md sections 5, 7–8, 10 and 12; D-32, D-42, D-44–D-45, D-68, D-80, D-95.
- Phase 17 quantity ledger, source branch/cycle identity and trusted ERP actor binding.
- Return/receipt/disposition contracts and docs/tracking-and-consistency.md.

## Required behavior and invariants

1. Returns go to the originating dispatch branch only; a user's access to several branches does not change that destination.

2. The driver's request is not physical receipt. Staff confirm actual received pieces through native ERP, not a mandatory Tawsel staff receipt screen.

3. Claimed handback must receive server confirmation before that handover/resume completes. Unavailable confirmation remains pending.

4. A subset may be confirmed independently. Do not require every offered item to be settled before continuation or add a returns quota.

5. Lost/damaged disposition is separate from physical receipt and stock availability. ERP owns commercial consequences.

6. Receipt/disposition changes eligibility and must serialize with retries/outcomes/corrections without resurrecting incompatible quantities.

## Ordered implementation checkpoints

### Checkpoint A — Return data and contracts

- [ ] Finalize request/group/item/receipt/disposition schemas and scoped quantity/cycle migrations.
- [ ] Group items by real source branch; expose pending request reads for the future native mock.
- [ ] Check: wrong-branch receipt and over-receipt quantities are rejected.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Actual receipt commands

- [ ] Implement bound ERP actor receipt/disposition with command idempotency, quantity conservation and event intent.
- [ ] Keep requested/confirmed/unresolved/disposed portions explicit; denial never silently clears held goods.
- [ ] Check: duplicate subset confirmation cannot receive the same pieces twice.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Dependency evidence

- [ ] Race receipt with existing whole retry/outcome operations using common locks.
- [ ] Expose concise driver confirmation/waiting state for branch interruption and later UI.
- [ ] Check: source outage or receiver error leaves an honest pending handover, not fake resume readiness.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Three offered pieces, two actually received | Two confirmed; the third retains its real held/unresolved status. |
| Source branch A goods offered to branch B | Receipt denied even if staff access includes both. |
| Confirmation service unavailable | Relevant handover waits; no assumed receipt. |
| One item lost rather than received | Disposition is recorded separately; no available-stock claim. |
| Duplicate confirmation or receipt-versus-retry race | Exactly one compatible quantity transition commits. |
| B2C task submitted to return endpoint | Rejected by product/domain rules. |

## Required verification

- Begin partial-return-correction.test.ts with real API/PostgreSQL receipt, duplicate/subset/wrong-branch and retry-race cases.
- Validate progress/quantity/audit/outbox coherence and separate loss/receipt event examples.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Complete actual source-branch receipt/disposition mapping in docs/erp/field-and-status-mapping.md. Show requested versus actually received subsets, outstanding pieces and loss/damage separately; link validated commands/events and accepted/rejected cases.
- Return request, native receiver/disposition APIs and accurate per-item confirmation reads.
- Meaningful partial receipt and concurrency evidence.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No ERP inventory valuation, cash settlement, whole-batch departure gate, driver-to-driver transfer or staff delivery-result override.

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

Phase 22 uses actual receipt state to pause/resume branch activity and authorize a new dispatch cycle; Phase 27 implements the native mock screens.

Next numbered prompt: [Phase 22](22-branch-interruption-redispatch.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

