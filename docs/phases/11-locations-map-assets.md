# Phase 11 — Confirmed locations and real map assets

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Location provenance, explicit pin confirmation and real map assets span providers and UI.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Provide real address candidates, explicit pin confirmation and usable self-hosted maps for B2C and authorized B2B location review.

## Prerequisites to verify before editing

Execute after [Phase 10](10-b2b-intake-admission.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 03](03-design-action-specification.md), [Phase 04](04-representative-ui-review.md), [Phase 06](06-tenant-capabilities-isolation.md), [Phase 09](09-b2c-task-intake.md), [Phase 10](10-b2b-intake-admission.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-15](coverage-matrix.md#r-15), [R-19](coverage-matrix.md#r-19), [R-20](coverage-matrix.md#r-20), [R-55](coverage-matrix.md#r-55), [R-56](coverage-matrix.md#r-56), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-60](coverage-matrix.md#r-60), [R-65](coverage-matrix.md#r-65).
Decision references: D-15, D-18, D-26, D-30, D-41, D-53, D-54, D-55, D-76, D-77, D-86, D-89, D-99, D-102, D-103, D-104, D-106, D-107, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 9 and 16; D-30, D-53, D-55, D-99.
- Original 07-location-review and 06-route-preparation HTML/metadata/screen.png, plus 01-active-driver-trip map language.
- DESIGN.md, UI state specification, task/source revision contracts and intake implementations.

## Required behavior and invariants

1. Preserve original address/source text separately from the confirmed execution pin and its provenance/revision.

2. Nominatim returns candidates, not guaranteed matches or measured accuracy percentages. A usable pin needs explicit confirmation.

3. No GPS request, one-time geolocation, shared-map-link expansion or customer-master overwrite.

4. Authorized staff can review B2B pins before departure; assigned drivers can correct their execution pin afterward. Phase 15 enforces the actual departure boundary.

5. MapLibre needs regional PMTiles plus style, glyphs, sprites, Arabic rendering, licensing and attribution; route geometry is a different layer.

6. Location problems block affected tasks, not unrelated valid work. Address/list details remain usable during tile/geocoder failures.

## Ordered implementation checkpoints

### Checkpoint A — Location API

- [ ] Finalize scoped search/candidate/pin schemas and implement a private Nominatim adapter with bounds, timeouts and bounded cache.
- [ ] Store original input, selected candidate/manual coordinates and explicit location revision; reject invalid/out-of-range coordinates.
- [ ] Check: another tenant's task cannot be located or updated by guessed ID.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Map assets and picker

- [ ] Configure a real self-hosted PMTiles archive/style/glyph/sprite stack with range serving and documented coverage.
- [ ] Implement keyboard/touch-friendly pin confirmation in the shared component; connect B2C entry and a focused location-review surface.
- [ ] Check: real tiles and Arabic labels render at relevant zooms; license/coverage gaps are explicit.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Correction and failure

- [ ] Preserve input and current pin through search error, empty results and tile failure; show concise recovery actions.
- [ ] Invalidate planning input revision when a confirmed pin changes without pretending planning already succeeded.
- [ ] Check: manual confirmation works without a precise drag gesture or any location-permission prompt.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Search returns several candidates | User sees source/context and confirms one; no invented match percentage. |
| No candidate found | Manual pin path remains usable; original address retained. |
| Coordinates outside valid range | Rejected before publication to planning. |
| Tile service fails | Task details/list and failure message remain available. |
| Authorized execution pin changes | Location revision changes and replan is required; commercial address stays intact. |
| Staff attempts a departed edit later | The handler uses lifecycle guard completed/tested in Phase 15, not UI visibility alone. |

## Required verification

- Run location-provenance.test.ts for API validation, authorization, revision invalidation and controlled geocoder failures.
- Run actual browser pin selection, range requests, Arabic/RTL labels, touch/keyboard behavior and failed tiles; separate live Nominatim evidence from fixtures.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Real location APIs, reusable map/picker, asset-serving config and connected focused location flow.
- Documented archive/source/license/coverage and actual failure behavior.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No GPS, online commercial map dependency by default, fake basemap success or complete route-preparation journey.

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

Engine/planning phases consume confirmed coordinates and location revisions; Phase 28 integrates preparation and mobile location review end to end.

Next numbered prompt: [Phase 12](12-engine-profile-adapters.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

