# Phase 15 — Online round start and departure authority

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Round start races with assignment changes and another device at the authority boundary.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Start exactly one authoritative round online, preserve its first forecast and close the race between starting, ERP edits and another device.

## Prerequisites to verify before editing

Execute after [Phase 14](14-route-policy-manual-fallback.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 06](06-tenant-capabilities-isolation.md), [Phase 08](08-erp-provisioning-actor-binding.md), [Phase 10](10-b2b-intake-admission.md), [Phase 14](14-route-policy-manual-fallback.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-08](coverage-matrix.md#r-08), [R-11](coverage-matrix.md#r-11), [R-12](coverage-matrix.md#r-12), [R-13](coverage-matrix.md#r-13), [R-19](coverage-matrix.md#r-19), [R-25](coverage-matrix.md#r-25), [R-27](coverage-matrix.md#r-27), [R-28](coverage-matrix.md#r-28), [R-53](coverage-matrix.md#r-53), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65).
Decision references: D-09, D-19, D-22, D-29, D-30, D-33, D-35, D-39, D-40, D-52, D-55, D-57, D-66, D-69, D-73, D-78, D-81, D-82, D-88, D-91, D-94, D-95, D-97, D-98, D-99, D-101, D-105, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 5–7, 10–11; D-29, D-40, D-78, D-81, D-87, D-91, D-101.
- Actual intake capacity/source locks, ready/manual planning revisions, authorization and command kernel.
- Canonical workday/round/start/action-status contracts.

## Required behavior and invariants

1. Every new round requires successful relevant sync, fresh authorized assignments and server acceptance before departure to the first stop. Connectivity alone is insufficient.

2. One open workday and active round per tenant/driver across branches. Another phone sees that round; it cannot create a second one.

3. Start atomically publishes the selected valid ready/manual plan, assigns device generation and retains immutable first-start forecast/workload references.

4. Accepted departure freezes source content, prices, recipient details, assignment and ERP urgency against general staff edits.

5. New received work admitted to active execution gains the same departure lock at its admission boundary, not only at the first round start.

6. No extra dispatcher approval or pickup checklist is added. A lost successful response is recovered by stable action ID.

## Ordered implementation checkpoints

### Checkpoint A — Lifecycle data and contract

- [ ] Add workday/round/device-owner references and database uniqueness constraints with explicit start request/result schemas.
- [ ] Define the sync-readiness evidence expected from later queue integration; no production trust in a caller's arbitrary alreadySynced flag.
- [ ] Check: no unverified local-only draft can masquerade as an active server round.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Atomic start

- [ ] Lock driver/workday/assignments consistently, revalidate capacity/eligibility/revisions and commit publication/ownership/forecast/audit/outbox.
- [ ] Open the workday when needed and preserve no-hard-shift policy; do not fabricate arrivals.
- [ ] Check: simultaneous starts and start-versus-withdrawal have one valid serialized outcome.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Departure guards

- [ ] Apply the boundary to all source edit/assignment/urgency and pin handlers; retain allowed assigned-driver execution pin actions.
- [ ] Enforce the active-admission lock for newly received work; expose current round and action status for another device.
- [ ] Check: staff can neither use a broad role nor alternate endpoint to edit departed execution.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Start response lost after commit | Retry returns the same round/ownership, not a second start. |
| ERP withdrawal races with start | Either valid removal precedes start or departed lock denies it; no stale task starts. |
| Two phones start together | One active round exists and both can observe it. |
| No internet or synchronization incomplete | No new round becomes active. |
| Staff changes urgency after departure | Denied; assigned-driver urgency is implemented later. |
| New task admitted during an active round | Its dispatched snapshot locks at active admission. |

## Required verification

- Create start-assignment-race.test.ts using independent real PostgreSQL connections, duplicate start and capacity/admission races.
- Verify first forecast persistence, atomic outbox and all affected departed-edit endpoints; later Phase 34 tests the full queue-to-start gate.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Real workday/round/start APIs, constraints, ownership baseline and departure guards.
- Race tests and exact start/action-status examples for the UI.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No offline start, per-stop connectivity requirement, final takeover command or full outcome state machine.

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

Phase 16 adds explicit current/arrival to the started round; Phase 20 completes online takeover and former-device fencing.

Next numbered prompt: [Phase 16](16-current-heading-arrival.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

