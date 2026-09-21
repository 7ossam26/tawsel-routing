# Phase 16 — Explicit current target, heading and arrival

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Current target, heading, arrival and physical origin must stay distinct across state changes.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Implement the driver's current activity and physical-origin semantics independently from route suggestions and outcome recording.

## Prerequisites to verify before editing

Execute after [Phase 15](15-round-start-departure-lock.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 14](14-route-policy-manual-fallback.md), [Phase 15](15-round-start-departure-lock.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-20](coverage-matrix.md#r-20), [R-26](coverage-matrix.md#r-26), [R-53](coverage-matrix.md#r-53), [R-65](coverage-matrix.md#r-65).
Decision references: D-05, D-18, D-19, D-30, D-82, D-88, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 7, 9–10 and 16; D-05, D-19, D-30, D-41, D-53.
- Phase 15 round/owner constraints and Phase 14 protected-prefix behavior.
- 01-active-driver-trip and 02-stop-details source/images, UI action hierarchy and canonical execution schemas.

## Required behavior and invariants

1. Next planned is a suggestion; heading is an explicit selected current target; arrived is another explicit action.

2. Finishing a task later must clear/resolve current activity, never automatically claim movement to the next suggestion.

3. Opening call, WhatsApp or navigation is not evidence of contact, heading, arrival or completed delivery.

4. Last confirmed physical origin advances on recorded arrival/manual correction, not a phone-only outcome.

5. One current activity per round; replanning preserves it until explicitly changed or resolved.

6. Ownership, eligibility and relevant task revisions matter. A harmless route reorder alone cannot invalidate a compatible command.

## Ordered implementation checkpoints

### Checkpoint A — Current activity contract

- [ ] Finalize select/heading/arrival schemas, allowed states and stable attempt identity; add required constraints/history.
- [ ] Specify explicit reselection behavior without abandoning an already handled customer silently.
- [ ] Check: an ineligible or other-driver task cannot become current.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — State transitions

- [ ] Implement commands through the transaction kernel, updating attempt/current/progress/audit/event intent together.
- [ ] Feed protected current target and physical origin into planning snapshots; retain separate next suggestion.
- [ ] Check: concurrent current selections cannot create two current activities.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Focused integration surface

- [ ] Connect a small existing stop component/API demo for select → heading → arrival using real state.
- [ ] Show concise stage changes and preserve recipient contact shortcuts without triggering commands from external links.
- [ ] Check: read/reload and a delayed planning result preserve authoritative current/next distinction.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Next suggestion changes during replan | Heading/arrived current target stays fixed. |
| Call link opened | No movement/arrival event is emitted. |
| Two current-select commands race | One valid current state; explicit conflict/result for the other. |
| Arrival retried with same action ID | One arrival/time/history result. |
| Phone-only outcome recorded in Phase 17 | Physical origin does not move unless arrival was recorded. |
| Wrong device generation submits heading | Denied/preserved as evidence according to ownership rules. |

## Required verification

- Run current-activity.test.ts through real API/PostgreSQL, including concurrent selection and stale planning fixtures.
- Exercise the focused real component flow in a browser; reserve full execution UI completion for execution UI phases 29–31.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Explicit current/heading/arrival handlers and coherent attempt/history fields.
- Tests and API-connected stage demonstration with honest action-time provenance.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No automatic GPS arrival, call logs, full collection/outcome UI or implicit departure to the following customer.

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

Phase 17 resolves these attempts with outcomes; Phase 18 changes eligibility while preserving current-target rules.

Next numbered prompt: [Phase 17](17-outcomes-quantities-collection.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

