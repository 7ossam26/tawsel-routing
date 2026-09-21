# Phase 28 — Connected daily work, preparation and route start UI

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Why this choice:** Connect a bounded preparation journey to already verified intake, planning and start APIs.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Connect the driver from real account/daily work through intake/location readiness and plan preview to a server-confirmed round start.

## Prerequisites to verify before editing

Execute after [Phase 27](27-native-mock-erp-source.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 04](04-representative-ui-review.md), [Phase 07](07-oidc-login-recovery-sessions.md), [Phase 09](09-b2c-task-intake.md), [Phase 10](10-b2b-intake-admission.md), [Phase 11](11-locations-map-assets.md), [Phase 14](14-route-policy-manual-fallback.md), [Phase 15](15-round-start-departure-lock.md), [Phase 19](19-workday-closure-carryover.md), [Phase 20](20-device-takeover-evidence.md), [Phase 27](27-native-mock-erp-source.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-02](coverage-matrix.md#r-02), [R-05](coverage-matrix.md#r-05), [R-10](coverage-matrix.md#r-10), [R-15](coverage-matrix.md#r-15), [R-19](coverage-matrix.md#r-19), [R-20](coverage-matrix.md#r-20), [R-21](coverage-matrix.md#r-21), [R-23](coverage-matrix.md#r-23), [R-27](coverage-matrix.md#r-27), [R-28](coverage-matrix.md#r-28), [R-38](coverage-matrix.md#r-38), [R-55](coverage-matrix.md#r-55), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-01, D-07, D-09, D-14, D-15, D-18, D-19, D-26, D-27, D-29, D-30, D-33, D-39, D-40, D-41, D-53, D-54, D-55, D-58, D-69, D-70, D-71, D-75, D-76, D-78, D-81, D-82, D-84, D-87, D-89, D-98, D-99, D-102, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- DESIGN.md and docs/ui-spec.md Driver simplicity, Routes and actions, State copy and feedback.
- Original 04-login-workspace, 05-driver-daily-trips, 06-route-preparation and 07-location-review source/image/metadata.
- Actual session, task/assignment, pin, plan-job, start and ownership client contracts.

## Required behavior and invariants

1. Company users see ERP-assigned prepared/held work; Tawsel does not duplicate ERP assignment administration.

2. B2C entry stays name/phone/address-or-pin plus optional amount. No item-splitting/branch custody fields.

3. Distinguish prepared, held, unresolved, future-deferred, ready/manual/partial/error and active states without placing every status explanation on one page.

4. A valid route preview may exist without a started round. Start needs current sync/auth/server acceptance, no extra dispatcher approval.

5. A second phone shows the existing active round and an explicit eligible continue/takeover path, not a second start.

6. Real failures, partial results and manual fallback retain user choices/input and never use timed fake success.

## Ordered implementation checkpoints

### Checkpoint A — Daily work and readiness

- [ ] Connect daily groups/active round to real scoped reads, with obvious continue/start and concise blockers.
- [ ] Finish fast entry and mobile pin review using previously implemented APIs/components.
- [ ] Check: valid tasks can proceed while affected unresolved tasks remain visibly excluded.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Plan preparation

- [ ] Connect vehicle/origin/endpoint choices, async optimization status, partial/unassigned review and explicit manual ordering.
- [ ] Keep the current input revision and disable obsolete start choices with an actionable explanation.
- [ ] Check: Engine failure leads to honest manual/pending behavior, not a spinner that silently succeeds.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Online start and recovery

- [ ] Connect server-confirmed start, active-round navigation, lost-response status query/retry and second-phone view.
- [ ] Use stable action IDs for uncertain mutations; show server-confirmed states only.
- [ ] Check: browser reload after accepted start recovers the same round and never duplicates tasks.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Prepared ERP work listed | Clearly upcoming, not on board or automatically executable. |
| One task has unresolved pin | Explain the affected blocker; valid work remains usable. |
| Optimization returns partial result | Identify unassigned work without claiming complete success. |
| Engine down, API up | User can prepare an honest eligible manual route. |
| Start response times out | Query/retry same ID; do not automatically submit a new start. |
| Round already owned by another phone | Existing state and permitted takeover are clear. |

## Required verification

- Run preparation-flow.test.tsx for real response mappings, input retention, blockers and action identity behavior.
- Run Playwright against actual local API/issuer/database for B2C and mock B2B prepare → start, including stale plan and Engine failure.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Connected preparation journey with real APIs and intentional design-reference adaptations.
- Browser evidence and updated UI/action coverage for daily/prepare/location/start states.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No production fixture switches, offline-save promise before Phase 33, staff assignment editor or full execution/return UI in this phase.

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

execution UI phases 29–31 continues the actual active round with the existing task/attempt IDs; preparation stays recoverable across reload and ownership change.

Next numbered prompt: [Phase 29](29-ordinary-driver-delivery-ui.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

