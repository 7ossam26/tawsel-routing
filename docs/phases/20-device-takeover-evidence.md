# Phase 20 — Online device takeover and preserved former-device evidence

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Device takeover must reject stale authority while preserving delayed offline evidence.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Let the same driver view a running round on another phone and explicitly transfer execution ownership online while preserving delayed evidence from the old phone.

## Prerequisites to verify before editing

Execute after [Phase 19](19-workday-closure-carryover.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 07](07-oidc-login-recovery-sessions.md), [Phase 15](15-round-start-departure-lock.md), [Phase 16](16-current-heading-arrival.md), [Phase 19](19-workday-closure-carryover.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-27](coverage-matrix.md#r-27), [R-38](coverage-matrix.md#r-38), [R-40](coverage-matrix.md#r-40), [R-65](coverage-matrix.md#r-65).
Decision references: D-10, D-29, D-40, D-61, D-75, D-78, D-81, D-87, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 6, 10–11; D-61, D-75, D-78, D-87.
- Actual round owner/generation, action result, session and workday closure implementations.
- Canonical takeover/action-status/evidence contracts and 09-sync-conflicts UI concepts.

## Required behavior and invariants

1. Multiple phones may view one round; one device generation owns execution. This is not a shipment transfer to another driver.

2. Continue on this phone is explicit, online and idempotent. It does not require approval from an unreachable original phone.

3. Download the latest confirmed snapshot before enabling new-owner commands.

4. Old offline evidence is retained on reconnect, not silently applied by wall-clock time and not erased as inconvenient.

5. Only the current authorized driver may later adopt a compatible received record within open-day/dependency correction rules.

6. Evidence received, business accepted and duplicate/review/rejected are separate results; durable evidence receipt can later allow safe logout.

## Ordered implementation checkpoints

### Checkpoint A — Ownership command

- [ ] Finalize device identity/generation and takeover request/result schemas; verify session/account binding.
- [ ] Implement generation increment under round/driver lock and stable idempotent retry.
- [ ] Check: simultaneous takeovers and lost responses produce one coherent current generation.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Fenced execution and evidence

- [ ] Apply generation checks consistently to every existing execution endpoint.
- [ ] Provide scoped action-status/evidence storage for stale-owner submissions without mutating accepted domain state.
- [ ] Check: old-generation arrival/outcome cannot overwrite a newer valid result.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Recovery boundary

- [ ] Expose current owner/view state and permissible recovery metadata with no hidden resource leakage.
- [ ] Define compatible adoption contract, completed with correction/replay phases, rather than a universal admin overwrite.
- [ ] Check: a closed day or dependent future receipt is represented as a hard business constraint, while evidence remains durable.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Second phone opens the round | Sees the existing active state; cannot start another round. |
| Owner chooses Continue on this phone online | Generation changes and latest snapshot is fetched. |
| Old phone submits delayed outcome | Evidence retained; no silent authoritative overwrite. |
| Duplicate takeover after lost response | Original result returned, not another unintended generation bump. |
| Another driver/account asks to take over | Denied; same-person assumptions from phone/contact are insufficient. |
| Day already closed | No recovery action reopens it through unchecked client timestamps. |

## Required verification

- Run device-ownership.test.ts with real API/database, concurrent takeover and old-generation commands.
- Verify consistent enforcement on heading, arrival, outcome, retry/urgency and closure; full browser queue replay is Phase 34.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Takeover/view/action-status/evidence APIs with consistent fencing.
- Preserved stale-owner evidence and reproducible two-device API scenario.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No automatic client-time conflict winner, old-phone approval requirement, arbitrary staff override or account linking.

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

Phase 23 supplies bounded correction/adoption; Phases 33–35 persist, replay and display former-phone evidence without data loss.

Next numbered prompt: [Phase 21](21-source-return-receipt.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

