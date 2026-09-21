# Phase 31 — Driver branch handover, resume and workday closure UI

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Branch handover, resume and day closure UI combine several custody and closure states.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Complete the driver-facing branch return and end-round/day journeys with honest subset confirmation, held-work carryover and clear ownership feedback.

## Prerequisites to verify before editing

Execute after [Phase 30](30-driver-exception-correction-ui.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 19](19-workday-closure-carryover.md), [Phase 20](20-device-takeover-evidence.md), [Phase 21](21-source-return-receipt.md), [Phase 22](22-branch-interruption-redispatch.md), [Phase 29](29-ordinary-driver-delivery-ui.md), [Phase 30](30-driver-exception-correction-ui.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-29](coverage-matrix.md#r-29), [R-32](coverage-matrix.md#r-32), [R-33](coverage-matrix.md#r-33), [R-34](coverage-matrix.md#r-34), [R-35](coverage-matrix.md#r-35), [R-38](coverage-matrix.md#r-38), [R-55](coverage-matrix.md#r-55), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-08, D-21, D-32, D-41, D-42, D-43, D-44, D-45, D-66, D-67, D-68, D-75, D-76, D-78, D-80, D-84, D-87, D-95, D-102, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- Actual branch interruption/receipt/closure/takeover contracts and allowed actions.
- DESIGN.md, docs/ui-spec.md branch/waiting/summary action map and preceding execution UI evidence.
- 01-active-driver-trip, 05-driver-daily-trips, 08-trip-completion and 09-sync-conflicts original sources/images.

## Required behavior and invariants

1. Branch return applies only to B2B and groups by originating branch. Request, branch arrival and actual receipt are different states.

2. A heading customer can pause; an arrived/handled one must resolve first. Preserve the paused sequence visibly.

3. Claimed handback waits for server-confirmed actual subset. Do not require every offered item to be settled or silently clear unresolved goods.

4. Native staff confirmation remains in ERP; the driver UI cannot manufacture it.

5. End round and End day show actual unfinished/held consequences without implying successful delivery, receipt or settlement.

6. Another-device round/takeover uses real ownership status. Full timing comparison and Excel are added by their report phases.

## Ordered implementation checkpoints

### Checkpoint A — Return and branch activity

- [ ] Connect source-group/item selection, return request and branch interrupt/arrival to real APIs.
- [ ] Show the paused customer sequence and only relevant next action; preserve full-capacity branch behavior.
- [ ] Check: arrived-customer blocker is actionable and no second round is started.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Receipt and resume

- [ ] Display requested/confirmed/unresolved/disposed portions with concise waiting/status updates.
- [ ] Enable the permitted resume path after relevant actual confirmation without whole-batch gating.
- [ ] Check: network failure remains pending and does not become a fake completed handover.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Closure and daily continuation

- [ ] Connect distinct end-round/end-day flows, basic accepted outcome/collection summary and held-work carryover.
- [ ] Complete second-phone viewing/explicit takeover UI and reload recovery, reusing actual owner generation logic.
- [ ] Check: a new day's list retains appropriate tasks and does not demand ERP resubmission.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Request offers several items, subset confirmed | Confirmed subset finalizes; other real statuses remain visible. |
| Branch confirmation unavailable | Explain waiting; no false resume or physical receipt. |
| Full-capacity branch interruption | Paused customer work is visible and retained. |
| End day with unfinished work | Clear held/carry-forward consequence, no all-delivered claim. |
| Another phone opens ongoing round | Existing round is visible with explicit authorized takeover. |
| B2C opens daily/end flow | No branch/receiver/custody procedure appears. |

## Required verification

- Run branch-closure-flow.test.tsx for real pending/subset/allowed-action/summary mappings.
- Run actual-API browser B2B request → native mock subset confirmation → resume, plus unfinished day closure/carryover and second-phone takeover.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Connected branch/resume/closure/ownership UI and complete basic online driver journey.
- Concrete browser evidence and documented waiting/carryover copy.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No staff receipt editor in Tawsel, whole-batch clearance gate, cash settlement, invented server confirmation or offline-save promise.

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

Shared monitoring and offline phases build on these actual states; full forecast reports/export remain separately owned.

Next numbered prompt: [Phase 32](32-monitoring-sync-online-ui.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

