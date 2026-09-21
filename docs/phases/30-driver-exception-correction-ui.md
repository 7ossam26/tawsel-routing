# Phase 30 — Focused driver exception and correction UI

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Exception and correction UI must expose the right authority and pending/rejected states simply.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Expose the less frequent delivery choices in focused views while keeping the ordinary driver screen simple and enforcing the real server rules.

## Prerequisites to verify before editing

Execute after [Phase 29](29-ordinary-driver-delivery-ui.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 18](18-deferral-retry-driver-urgency.md), [Phase 23](23-bounded-driver-corrections.md), [Phase 29](29-ordinary-driver-delivery-ui.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-12](coverage-matrix.md#r-12), [R-16](coverage-matrix.md#r-16), [R-17](coverage-matrix.md#r-17), [R-19](coverage-matrix.md#r-19), [R-24](coverage-matrix.md#r-24), [R-25](coverage-matrix.md#r-25), [R-31](coverage-matrix.md#r-31), [R-37](coverage-matrix.md#r-37), [R-55](coverage-matrix.md#r-55), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-06, D-11, D-20, D-23, D-24, D-30, D-35, D-36, D-37, D-41, D-46, D-47, D-48, D-49, D-51, D-52, D-55, D-65, D-73, D-76, D-79, D-89, D-91, D-93, D-94, D-95, D-96, D-97, D-98, D-99, D-101, D-102, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- DESIGN.md and docs/ui-spec.md contextual actions, overlays, retained input and concise blocker copy.
- 02-stop-details and 09-sync-conflicts source/image references; actual ordinary delivery components.
- Partial/refusal/no-answer/deferral/retry/urgency/pin/correction APIs and allowed-action responses.

## Required behavior and invariants

1. B2B partial delivery appears only with source permission; accept whole pieces and show exact collection plus rejected remainder's return consequence.

2. Full refusal and explicit shipping-payment refusal are distinct. No-answer does not imply either fee outcome.

3. B2C has no piece-splitting or source-return controls; keep its outcome/correction flow simple.

4. Deferral, urgency, whole retry and history belong in relevant discoverable context, not a wall of buttons.

5. A correction is available only under the current owner/open-day/no-dependent-handover rules and preserves history.

6. Back/cancel retains appropriate draft input and never commits; avoid nested dialogs and repeating confirmations already inherent in the result.

## Ordered implementation checkpoints

### Checkpoint A — Partial and refusal views

- [ ] Build focused whole-piece selection and exact amount display from real frozen snapshot/validation.
- [ ] Connect full refusal and explicit unpaid-shipping exception with clear consequences and no arbitrary amount editor.
- [ ] Check: permission/quantity errors preserve input and leave authoritative outcome unchanged.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Scheduling context

- [ ] Connect earliest deferral, eligible whole retry, urgency and permitted pin correction through existing APIs.
- [ ] Explain unavailable action reasons such as future time, capacity, partial remainder or receipt dependency.
- [ ] Check: contextual options stay discoverable while ordinary full delivery retains one dominant action.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Recording correction

- [ ] Build a focused original/effective result comparison and bounded correction submission.
- [ ] Display durable rejection/review recovery without offering a staff or client-time override.
- [ ] Check: receipt/day closure arriving during editing returns a clear denial with retained evidence/input.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Two of three pieces selected | Exact amount and one return-required remainder shown. |
| B2C task opened | No partial-piece, fee-liability or branch controls. |
| Whole retry blocked by capacity | Explain why while preserving held work and history. |
| Urgency set during execution | Assigned driver action succeeds under current-target protection. |
| Correction dependency changes while form open | Server rejection is clear; no false success or history loss. |
| User cancels exception sheet | No command submitted and useful draft input retained. |

## Required verification

- Run execution-exceptions.test.tsx and extend driver-flow.test.tsx for actual response mappings and conditional controls.
- Run real-API browser scenarios for partial/refusal/unpaid fee, future deferral, permitted/denied retry and accepted/denied correction.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Focused exception/correction UI with coherent shared components and real permission/state feedback.
- Documented screenshots, tap-flow findings and action coverage.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No branch handover/day-end page in this phase, nested modals, all-actions toolbar, free-form underpayment or B2C custody features.

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

The following execution phase adds branch and closure flows; ordinary delivery remains unchanged unless actual UX defects require a focused fix.

Next numbered prompt: [Phase 31](31-driver-branch-closure-ui.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

