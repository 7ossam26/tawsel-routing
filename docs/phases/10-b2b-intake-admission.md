# Phase 10 — ERP task snapshots, receipt and atomic admission

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** ERP revisions, receipt semantics and concurrent atomic capacity admission interact.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Accept real ERP-preassigned work with precise source snapshots, distinguish preparation from receipt and reject over-capacity batches atomically.

## Prerequisites to verify before editing

Execute after [Phase 09](09-b2c-task-intake.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 06](06-tenant-capabilities-isolation.md), [Phase 08](08-erp-provisioning-actor-binding.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-02](coverage-matrix.md#r-02), [R-08](coverage-matrix.md#r-08), [R-09](coverage-matrix.md#r-09), [R-10](coverage-matrix.md#r-10), [R-11](coverage-matrix.md#r-11), [R-13](coverage-matrix.md#r-13), [R-14](coverage-matrix.md#r-14), [R-18](coverage-matrix.md#r-18), [R-50](coverage-matrix.md#r-50), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65), [R-64](coverage-matrix.md#r-64).
Decision references: D-01, D-07, D-13, D-14, D-18, D-22, D-23, D-33, D-39, D-40, D-52, D-56, D-57, D-66, D-84, D-92, D-105, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md sections 5, 7–8, 10 and 13; D-14, D-33, D-39, D-40, D-46–D-48, D-52, D-56–D-57, D-66, D-92–D-93.
- Phase 08 trusted provisioning/source identity, Phase 05 transaction kernel and Phase 06 guards.
- Intake/quantity/error contracts; no raw ERP database access.

## Required behavior and invariants

1. Prepared work is upcoming, not held or executable. Definitive assignment asserts receipt and commits before asynchronous planning.

2. The limit is 50 remaining planned stops, including planned branch visits. It is not 50 per workday or all held/prepared records.

3. Reject an entire incoming over-limit addition batch; no partial acceptance, automatic split or phantom assigned backlog.

4. Each shipment is independent even at identical coordinates. Stable source line/cycle IDs preserve quantities and history.

5. Accept only source-authoritative whole-piece prices/splitting permission and exact outstanding goods/shipping allocations; reject ambiguous deposits.

6. Predeparture removal/reassignment is ordinary ERP work without mandatory reasons/handover ceremony. Departure guards are finalized in Phase 15.

## Ordered implementation checkpoints

### Checkpoint A — Source schema and validation

- [ ] Finalize intake/assignment/revision/error schemas and add source snapshot, line, prepared/received and dispatch-cycle persistence.
- [ ] Validate integral quantities, matching currency, exact due allocation and tenant/source branch/driver compatibility.
- [ ] Check: unsupported partial-prepaid data is rejected explicitly instead of defaulting to zero or equal allocation.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Atomic receipt/admission

- [ ] Implement batch receipt/admission under a per-driver capacity lock with command/audit/event intent in the same transaction.
- [ ] Record durable replan intent without requiring Engine success before acceptance; prepared work stays outside executable inputs.
- [ ] Check: two concurrent valid-looking batches cannot jointly exceed capacity or partially commit.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Normal source updates

- [ ] Implement revisioned predeparture edit/removal/reassignment with retained history and future departure lock hooks.
- [ ] Expose accepted/pending/rejected results and held/prepared reads usable by later UI/mock ERP.
- [ ] Check: stale versions and duplicate source submissions do not clone tasks or silently change frozen data.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| 49 remaining stops plus batch of 2 | Reject the whole batch; neither becomes assigned. |
| Two concurrent batches compete for last slots | Only capacity-compatible whole batches commit. |
| Prepared task received | Becomes held and schedules planning; receipt is durable if Engine fails. |
| Fractional piece or ambiguous deposit | Explicit contract rejection with actionable source error. |
| Normal removal before departure | Allowed without extra clerical procedure; history preserved. |
| Two same-address shipments | Count/identity/outcome remain independent. |

## Required verification

- Run b2b-intake-admission.test.ts on real PostgreSQL with independent connections, source-version and isolation cases.
- Inspect task/assignment/audit/idempotency/outbox writes on rollback; do not claim active start/departure races are fully covered until Phase 15.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Complete the shipment/intake portion of docs/erp/field-and-status-mapping.md: external and Tawsel IDs, source revisions, prepared versus received, required/optional fields, quantities/money, ownership and atomic rejection examples. Carry concrete source obligations into docs/erp/ERP-PLANNING-INPUT.md.
- B2B source/intake/receipt APIs, accurate held/prepared states and atomic admission.
- Concrete payload/error examples and source revision rules for the native mock.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No staff postdeparture override, actual stock valuation, route optimizer, automatic batch splitting or real ERP screens.

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

Planning consumes only accepted eligible work. Phase 15 closes the admission/removal/start race using these same locks.

Next numbered prompt: [Phase 11](11-locations-map-assets.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

