# Phase 04 — Shared components and early simple-UX review

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Why this choice:** Implement and inspect a bounded set of representative components and fixture journeys.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Deliver a small interactive fixture-backed driver journey and selected-driver desktop view that the owner can inspect early. Validate common patterns before copying them across production journeys.

## Prerequisites to verify before editing

Execute after [Phase 03](03-design-action-specification.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 01](01-workspace-test-harness.md), [Phase 02](02-state-contract-foundation.md), [Phase 03](03-design-action-specification.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-55](coverage-matrix.md#r-55), [R-56](coverage-matrix.md#r-56), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-41, D-76, D-102, D-103, D-104, D-106, D-107, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- DESIGN.md; docs/ui-spec.md Driver simplicity, Routes and actions, State copy and feedback, Components and overlays.
- Original assets in stitch-export/screens/01-active-driver-trip through 05-driver-daily-trips; consult 08-trip-completion and 09-sync-conflicts for status continuity.
- Phase 02 schemas and fixture examples; Phase 01 actual web/test setup.

## Required behavior and invariants

1. Fixture routes are clearly labelled and excluded from production navigation/build behavior. A demo click must never impersonate server acceptance.

2. Show daily work, the existing round, selected customer and explicit heading/arrival/outcome stages with a single dominant stage action.

3. Keep name/phone and contextual call/WhatsApp/navigation discoverable without placing every rare action on the main card.

4. Use one focused outcome sheet, back/cancel that preserves input and concise missing/waiting feedback. Avoid nested dialogs.

5. A schematic map is allowed here only as a labelled fixture. Real maps and Engine routes arrive later.

6. Desktop staff see selected-driver state; fixture controls cannot suggest postdeparture outcome authority.

## Ordered implementation checkpoints

### Checkpoint A — Shared visual primitives

- [ ] Implement theme tokens, RTL shells, navigation, forms, status/stop components and focused overlays using selected shadcn/Smooth sources.
- [ ] Reuse and verify the Phase 01 self-hosted Cairo 400/600/700/800 baseline and its OFL attribution; add other font/icon assets only with local packaging and license attribution. Respect focus restoration and reduced motion.
- [ ] Check: component rendering at mobile and desktop sizes, with long Arabic/LTR content.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Representative interactions

- [ ] Connect fixtures for login presentation, daily list, active map/list and stop outcome flow.
- [ ] Include empty/loading, missing pin, another-device round, no-answer, partial selection and pending/rejected states in the developer environment.
- [ ] Check: back/cancel retains input and no fixture success leaks into production routes.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Owner-review artifact

- [ ] Run the representative flow and desktop view in a real browser; capture screenshots and tap/navigation observations.
- [ ] Create docs/ui-review.md with actual findings, confusing labels, intentional reference changes and unresolved defects; provide a working preview.
- [ ] Check: purpose/next action/blocker/waiting can be identified without narration; record actual owner feedback separately.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Ready daily work | Start is the obvious main action; missing requirements remain visible. |
| Heading versus arrived | Different next actions appear; completing an outcome does not imply heading to another stop. |
| Outcome sheet cancelled | No business result is simulated as committed; draft input survives appropriately. |
| Another device owns the round | Existing activity is clear; no misleading second-start control. |
| Reduced motion enabled | Actions remain immediate and focus behaves correctly. |
| Production build inspected | Fixture state simulators and demo network toggles cannot be mistaken for real features. |

## Required verification

- Create driver-flow.test.tsx for component/state integration, blockers, input retention and fixture isolation; test behavior rather than CSS class snapshots.
- Run browser screenshots/interactions at all four specified viewports plus zoom/focus/RTL. Separate browser findings from owner approval.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Reusable components and a small reviewable interactive preview.
- UI review record with evidence and concrete corrections before wider reuse.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No real authentication, routing, offline durability, domain persistence or nine-page frontend one-shot. Backend phases may proceed while unrelated visual feedback is pending.

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

Subsequent UI phases reuse these components; explicitly rejected patterns must be corrected before expansion, not silently treated as approved.

Next numbered prompt: [Phase 05](05-postgres-atomic-command-kernel.md). State the exact verified artifacts it may rely on. Do not execute it in this task.
