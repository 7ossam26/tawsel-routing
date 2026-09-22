# Phase 03 — Visual system and requirement-driven action specification

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Reconcile the full action inventory with the visual references and a very simple driver experience.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Create a usable design and action specification that preserves the visual references while covering the actual agreed product, including missing pages and removed prototype controls.

## Prerequisites to verify before editing

Execute after [Phase 02](02-state-contract-foundation.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 01](01-workspace-test-harness.md), [Phase 02](02-state-contract-foundation.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-55](coverage-matrix.md#r-55), [R-56](coverage-matrix.md#r-56), [R-57](coverage-matrix.md#r-57), [R-63](coverage-matrix.md#r-63), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-11, D-13, D-28, D-38, D-41, D-54, D-64, D-76, D-102, D-103, D-104, D-106, D-107, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md section 16 and D-102, D-103, D-105, D-106, D-109.
- stitch-export/manifest.json and README; inspect every original code.html, metadata.json and image under the nine screen directories.
- Phase 02 state vocabulary and operation inventory; docs/planning/repository-and-ui-assessment.md.
- Fetch https://smoothui.dev/llms-full.txt and inspect the selected components' actual registry APIs at implementation time.

Exact reference directories under stitch-export/screens/: 01-active-driver-trip; 02-stop-details; 03-dispatcher-workspace; 04-login-workspace; 05-driver-daily-trips; 06-route-preparation; 07-location-review; 08-trip-completion; 09-sync-conflicts. Inspect each directory's code.html, metadata.json and original image.

## Required behavior and invariants

1. References 01–03 use screen.jpg; 04–09 use screen.png. Record exact source paths/IDs and inspect images, not HTML alone.

2. The nine directories cover active trip, stop detail, dispatcher workspace, login, daily work, preparation, location review, completion and sync review. They do not constrain the product to nine routes.

3. Preserve Cairo typography, navy primary actions, blue accents, light surfaces, RTL and map/list relationships. Phase 01 already self-hosts the real Cairo 400/600/700/800 files and disables synthetic weights; formalize those choices as shared typography tokens rather than reintroducing Google Fonts runtime imports or faux bold. Adapt responsive layouts rather than copying device frames.

4. Buttons and permissions come from decisions. Remove GPS/call counters/demo switches/financial settlement assumptions; add B2C intake, returns, correction, takeover and reporting where required.

5. Every state explains purpose, next action, missing input and waiting. One dominant action does not remove useful recipient call/navigation shortcuts.

6. Unify shadcn and Smooth UI under shared tokens; inspect focus, RTL, reduced motion and licensing before adopting components.

## Ordered implementation checkpoints

### Checkpoint A — Reference inventory

- [ ] Inspect all nine source/image/metadata sets and document reusable layout patterns and defects.
- [ ] Classify exported controls as retained, adapted or removed with the requirement behind the decision.
- [ ] Check: each source has a documented visual role and no exported control silently becomes a requirement.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Design and routes

- [ ] Write DESIGN.md tokens, component conventions, motion, spacing, responsive rules and accessible interaction patterns.
- [ ] Write docs/ui-spec.md with Reference inventory, Driver simplicity, Routes and actions, State copy and feedback, Components and overlays, Screen coverage and Visual acceptance.
- [ ] Check: every required action maps to role/state, contract operation, page or focused overlay and implementation phase.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — State acceptance

- [ ] Specify brief Arabic copy intent for ready, missing, empty, waiting, pending, rejected and stale states.
- [ ] Define mobile/desktop review at 360×800, 390×844, 1366×768 and 1440×900 plus zoom, long text and safe areas.
- [ ] Check: walk login → daily work → heading → arrival → result; identify the main action and blocker without developer narration.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Prototype contains unsupported feature | Document removal and preserve surrounding visual language. |
| Required return/correction action absent in export | Add it to the action map using the same design system. |
| Button disabled because a pin is missing | Specify visible cause and a direct recovery action. |
| A short decision needs separation | Use a focused sheet/modal without nesting or repeated confirmation. |
| Long Arabic name and LTR phone coexist | Specify wrapping/isolation and accessible touch targets. |
| No owner review yet | Record design status honestly; no approved label based on silence. |

## Required verification

- Audit all nine references and every required journey against operation coverage; record any inaccessible asset explicitly.
- This phase is specification work: do not claim browser usability or Vitest runtime evidence from a design document.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- DESIGN.md and complete action/state-focused docs/ui-spec.md.
- Traceable additions/removals, viewports and early-review criteria.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

Do not implement the entire frontend, install whole component catalogs or add features merely because they appear in screenshots.

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

Phase 04 implements representative components and interactions from this concrete specification, making ambiguity visible before broad UI work.

Next numbered prompt: [Phase 04](04-representative-ui-review.md). State the exact verified artifacts it may rely on. Do not execute it in this task.
