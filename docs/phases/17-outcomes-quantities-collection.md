# Phase 17 — Delivery outcomes, whole pieces and exact collection

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Whole pieces, partial outcomes, exact money and outbound events must commit coherently.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Record full/partial/refused/no-answer outcomes atomically with exact quantities, reported collection, coherent progress and durable outbound intent.

## Prerequisites to verify before editing

Execute after [Phase 16](16-current-heading-arrival.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 10](10-b2b-intake-admission.md), [Phase 15](15-round-start-departure-lock.md), [Phase 16](16-current-heading-arrival.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-08](coverage-matrix.md#r-08), [R-09](coverage-matrix.md#r-09), [R-14](coverage-matrix.md#r-14), [R-15](coverage-matrix.md#r-15), [R-16](coverage-matrix.md#r-16), [R-17](coverage-matrix.md#r-17), [R-18](coverage-matrix.md#r-18), [R-26](coverage-matrix.md#r-26), [R-30](coverage-matrix.md#r-30), [R-52](coverage-matrix.md#r-52), [R-58](coverage-matrix.md#r-58), [R-63](coverage-matrix.md#r-63), [R-65](coverage-matrix.md#r-65).
Decision references: D-05, D-08, D-11, D-14, D-15, D-19, D-20, D-23, D-24, D-26, D-28, D-31, D-33, D-36, D-38, D-46, D-47, D-48, D-49, D-50, D-51, D-52, D-53, D-54, D-56, D-64, D-65, D-67, D-76, D-89, D-92, D-93, D-99, D-100, D-105, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 7–8, 10 and 18 groups E/G; D-23, D-36, D-46–D-52, D-64, D-89, D-92–D-93.
- Actual frozen source snapshot/price allocation, attempt/current state and transaction kernel.
- Canonical outcome/quantity/collection schemas; UI specification for concise amounts and refusal exceptions.

## Required behavior and invariants

1. B2B splitting requires explicit source permission and stable whole-piece line references; no fractions or B2C splitting.

2. Three pieces at 100 plus 50 shipping: full is 350; two accepted is 250; full refusal with shipping paid is 50.

3. Explicit shipping-payment refusal records zero collected and unpaid shipping 50; no-answer does not imply that exception.

4. Accepted full/partial goods require the calculated authorized amount. No arbitrary underpayment, online ERP price quote or invented deposit allocation.

5. Rejected partial remainders become return-required and cannot be scheduled for later customer delivery.

6. Prepaid/previously collected amounts are not charged twice. Collection is driver-reported money, not remittance/settlement.

7. Each accepted result resolves the attempt and commits quantities, current/progress, audit, idempotency and event intent together.

## Ordered implementation checkpoints

### Checkpoint A — Outcome arithmetic

- [ ] Finalize outcome schemas and build exact integer-minor-unit/whole-piece validation from frozen source allocations.
- [ ] Implement full/partial/refused/unpaid-shipping/no-answer rules and simple B2C outcomes/optional collection separately.
- [ ] Check: the explicit numerical examples and invalid quantities/underpayment fail or pass for business reasons.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Atomic outcome command

- [ ] Add append-preserving attempt/outcome/quantity/collection persistence and effective state projection.
- [ ] Resolve current activity without inventing next heading or missing arrival; register replan intent outside provider calls.
- [ ] Check: injected failure between state/progress/outbox writes rolls back every accepted effect.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Connected evidence

- [ ] Create outcome-progress-outbox.test.ts and a two-task API demonstration through actual start/current/outcomes.
- [ ] Validate emitted event payloads and effective reports/reads available now; retain return-required goods as held.
- [ ] Check: duplicate/repeated commands cannot duplicate pieces or shipping collection.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Two of three pieces accepted with source permission | 250 reported, two delivered, one held return-required. |
| Split not permitted or quantity fractional | Rejected with no partial ledger/progress change. |
| Full refusal, shipping paid | Zero goods delivered; 50 shipping reported. |
| Explicit shipping refusal | Zero collected, unpaid fee separately visible. |
| No answer without arrival | No fabricated arrival, collection or fee-refusal fact. |
| Duplicate outcome or transaction crash | One effective result or full rollback, including outbox. |

## Required verification

- Run outcome-progress-outbox.test.ts against real PostgreSQL with independent duplicate races and injected failure checkpoints.
- Include prepaid allocation, multiple lines, unlike currencies, negative/out-of-range values, B2C rejection of piece workflows and schema-valid events.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Authoritative outcome arithmetic/commands, preserved history and coherent progress/event intent.
- Meaningful connected transaction tests and exact money examples for frontend consumers.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No physical branch receipt, correction/undo, inventory valuation, arbitrary refunds or cash settlement.

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

Phase 18 handles whole untouched retries/deferral. Phase 21 receives actual returned pieces; Phase 23 corrects mistaken records without deleting history.

Next numbered prompt: [Phase 18](18-deferral-retry-driver-urgency.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

