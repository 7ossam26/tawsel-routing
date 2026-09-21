# Phase 32 — Dispatcher monitoring and online synchronization feedback

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Why this choice:** Connect monitoring and synchronization feedback to established coherent read models.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Make authorized shared monitoring coherent and fresh, and distinguish actual Tawsel acceptance from ERP receipt/application without exposing backend internals to drivers.

## Prerequisites to verify before editing

Execute after [Phase 31](31-driver-branch-closure-ui.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 24](24-coherent-monitoring-api.md), [Phase 25](25-outbox-signed-delivery.md), [Phase 26](26-mock-inbox-projection-recovery.md), [Phase 27](27-native-mock-erp-source.md), [Phase 28](28-online-preparation-journeys.md), [Phase 29](29-ordinary-driver-delivery-ui.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-04](coverage-matrix.md#r-04), [R-12](coverage-matrix.md#r-12), [R-43](coverage-matrix.md#r-43), [R-44](coverage-matrix.md#r-44), [R-45](coverage-matrix.md#r-45), [R-55](coverage-matrix.md#r-55), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-02, D-04, D-12, D-17, D-24, D-25, D-35, D-41, D-52, D-62, D-73, D-76, D-90, D-91, D-95, D-101, D-102, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 5, 12, 14 and 16; D-62, D-91, D-95, D-106.
- Original 03-dispatcher-workspace and 09-sync-conflicts assets; DESIGN.md and UI state copy.
- Actual conditional snapshots, evidence/action status and recipient delivery/application APIs.

## Required behavior and invariants

1. Staff may prepare/review locations before departure where authorized; departed execution is read-only except native ERP receipt/disposition.

2. Poll visible active views initially every second, one in-flight request, conditional versions/ETags and bounded failure backoff.

3. Never apply a response older than the displayed confirmed revision. Foreground/reconnect performs a complete refresh.

4. Proposed stale threshold is ten seconds since a successful refresh; last action time and transport freshness are different.

5. Unsent offline actions are unknown to the server. Show only received evidence and real delivery/application status.

6. Driver copy stays brief; detailed correlation/retry/queue diagnostics belong to an authorized operational view.

## Ordered implementation checkpoints

### Checkpoint A — Shared workspace

- [ ] Connect selected-driver map/list/progress/history and authorized branch/source filters.
- [ ] Remove broken prototype script dependencies and unsupported postdeparture buttons.
- [ ] Check: mixed-integration/redacted snapshots cannot re-expose hidden contacts through UI tooltips or totals.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Refresh controller

- [ ] Implement conditional polling, cancellation, one in-flight request, revision comparison and reconnect/visibility handling.
- [ ] Display refresh age, pending/error/stale states without calling an idle driver offline.
- [ ] Check: deliberately delayed old responses cannot roll back current/next or counts.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Evidence/status views

- [ ] Connect server-received accepted/rejected/review action filters and genuine ERP received/applied/failed states.
- [ ] Offer permitted recovery/retry context without implying that a transport retry changes business acceptance.
- [ ] Check: loading/empty/denied/lagging states remain clear and operational details stay out of normal delivery flow.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Out-of-order polling responses | Older revision ignored; coherent state does not regress. |
| No driver activity but successful polling | Fresh view, not false offline. |
| Browser returns from background | Full snapshot refresh before claiming current information. |
| ERP durably received but has not applied | Two states remain distinct. |
| Staff clicks departed task | Read-only execution detail; no hidden mutation affordance. |
| Another integration's current stop is redacted | No accidental name/pin/count leakage through layout or export links. |

## Required verification

- Run monitoring-client.test.tsx with controlled delay/reconnect responses plus actual API browser scenarios.
- Measure a small local commit-to-render path as diagnostic evidence; target p95/load verification is Phase 38, not a claim from one fast refresh.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Real shared monitoring and online status UI with nonregressing refresh behavior.
- Browser evidence, scoped access checks and concise status copy.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No GPS presence, stream infrastructure by default, unsent-action visibility promise or staff execution override.

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

Offline phases extend local pending/review feedback; Phase 38 uses the implemented render/application timestamps to measure actual freshness.

Next numbered prompt: [Phase 33](33-offline-local-capture.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

