# Phase 29 — Connected ordinary driver delivery UI

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Why this choice:** Connect the ordinary driver journey using established outcome contracts and focused UI patterns.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Complete the ordinary online driver path from an active round through heading, arrival and a full result. Keep this phase small enough to inspect the common path before adding exception workflows.

## Prerequisites to verify before editing

Execute after [Phase 28](28-online-preparation-journeys.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 04](04-representative-ui-review.md), [Phase 16](16-current-heading-arrival.md), [Phase 17](17-outcomes-quantities-collection.md), [Phase 19](19-workday-closure-carryover.md), [Phase 20](20-device-takeover-evidence.md), [Phase 28](28-online-preparation-journeys.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-15](coverage-matrix.md#r-15), [R-17](coverage-matrix.md#r-17), [R-26](coverage-matrix.md#r-26), [R-30](coverage-matrix.md#r-30), [R-55](coverage-matrix.md#r-55), [R-57](coverage-matrix.md#r-57), [R-58](coverage-matrix.md#r-58), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-05, D-11, D-15, D-19, D-20, D-23, D-24, D-26, D-31, D-36, D-41, D-47, D-50, D-51, D-53, D-54, D-64, D-65, D-76, D-89, D-99, D-102, D-105, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- DESIGN.md, docs/ui-spec.md state/action map and actual early feedback in docs/ui-review.md.
- Original 01-active-driver-trip and 02-stop-details HTML/metadata/images, plus daily/completion visual continuity.
- Actual current/arrival/full-outcome/no-answer/session/ownership contracts and generated client.

## Required behavior and invariants

1. Recipient name/phone and call/WhatsApp/navigation shortcuts stay discoverable; opening external apps never records movement or contact success.

2. One dominant action follows the current stage: select/heading, arrive, then record the appropriate result.

3. Full delivery shows exact due amount and uses the agreed delivery-plus-collection confirmation. No repeated routine confirmation or arbitrary underpayment.

4. A result resolves current activity and returns to a next suggestion; it does not automatically claim heading to the following customer.

5. No-answer remains simple and does not invent arrival, unpaid-shipping refusal or call counters.

6. This is connected online behavior. A timeout uses original action ID/status recovery; do not claim local durable save before the offline phase.

## Ordered implementation checkpoints

### Checkpoint A — Active trip and contact

- [ ] Connect the real active map/list, selected stop and current-versus-next read model.
- [ ] Wire actual call/WhatsApp/navigation destinations with accessible names, LTR phone isolation and handler feedback.
- [ ] Check: external app links never emit heading/arrival/outcome commands.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Ordinary delivery

- [ ] Connect explicit heading/arrival and focused full result/collection using actual allowed-action state.
- [ ] Handle B2C simple outcome/optional amount independently from B2B exact goods/shipping calculation.
- [ ] Check: a connected two-stop journey preserves IDs and reloads accepted state correctly.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Failure and simplicity

- [ ] Implement empty/loading/permission/ownership change/uncertain response states with retained input.
- [ ] Extend driver-flow.test.tsx and record actual browser/tap-flow findings before adding rarer actions.
- [ ] Check: duplicate taps/timeouts recover one accepted result; purpose and next action are clear at narrow mobile widths.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Full B2B delivery | Exact amount and one clear confirmation; accepted feedback comes from server. |
| Next suggestion shown after outcome | No implied movement until explicit heading. |
| No-answer without arrival | No fabricated arrival, fee refusal or call count. |
| Call/navigation link opened | Correct destination and zero business command side effects. |
| Response lost after commit | Query/retry same action ID; no second outcome. |
| Ownership changes on another phone | Read-only/continue context is clear; forbidden writes cannot masquerade as success. |

## Required verification

- Extend driver-flow.test.tsx for stage, collection, input retention and stable action identity using actual client mappings.
- Run real-API Playwright for two-stop B2C and ordinary mock B2B delivery, plus timeout/ownership denial; capture mobile RTL/focus/reduced-motion evidence.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Production ordinary delivery journey connected to actual APIs.
- Focused component/browser evidence and resolved common-path UX defects.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

Do not implement every exception screen here. Partial/refusal/deferral/retry/correction and branch handover/closure have separate following phases; no fake buttons to those unfinished routes.

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

The next two execution UI phases reuse this verified common path for exceptions and branch/day completion without redesigning basic delivery.

Next numbered prompt: [Phase 30](30-driver-exception-correction-ui.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

