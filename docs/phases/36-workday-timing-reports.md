# Phase 36 — Effective workday reports and forecast comparison

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Forecast baselines, late actuals, corrections and workday boundaries must yield truthful reports.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Show authorized results, reported collection and expected-versus-actual timing using forecasts captured when work happened and actual action-time provenance.

## Prerequisites to verify before editing

Execute after [Phase 35](35-offline-auth-updates-ux.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 13](13-planning-jobs-forecast-storage.md), [Phase 15](15-round-start-departure-lock.md), [Phase 17](17-outcomes-quantities-collection.md), [Phase 19](19-workday-closure-carryover.md), [Phase 21](21-source-return-receipt.md), [Phase 23](23-bounded-driver-corrections.md), [Phase 33](33-offline-local-capture.md), [Phase 34](34-ordered-replay-conflict-recovery.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-14](coverage-matrix.md#r-14), [R-15](coverage-matrix.md#r-15), [R-17](coverage-matrix.md#r-17), [R-18](coverage-matrix.md#r-18), [R-22](coverage-matrix.md#r-22), [R-23](coverage-matrix.md#r-23), [R-29](coverage-matrix.md#r-29), [R-37](coverage-matrix.md#r-37), [R-52](coverage-matrix.md#r-52), [R-53](coverage-matrix.md#r-53), [R-54](coverage-matrix.md#r-54), [R-55](coverage-matrix.md#r-55), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-08, D-11, D-13, D-15, D-21, D-23, D-24, D-26, D-36, D-41, D-47, D-51, D-52, D-53, D-54, D-56, D-67, D-71, D-72, D-73, D-76, D-82, D-88, D-89, D-91, D-92, D-96, D-99, D-100, D-102, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md section 15; D-24, D-67, D-82, D-88–D-89, D-100.
- Stored plan/start/revised forecasts, outcome/correction/receipt history and device clock-quality fields.
- 03-dispatcher-workspace, 05-driver-daily-trips and 08-trip-completion visual references; simple report action map.

## Required behavior and invariants

1. Report by explicit workday, with round/driver/authorized branch filters. Workday can cross midnight; UTC storage and Africa/Cairo display handle real offset changes.

2. Processed stops, full/partial shipments, failed/deferred attempts and branch service have different units/denominators.

3. Six full deliveries + one failure + eleven remaining means seven processed of eighteen, not seven delivered. Sixteen full + two failed means 88.9% full delivery.

4. Goods/shipping collections and unpaid fees come from effective accepted results; prepaid is not double counted and unlike currencies are not summed.

5. Match initial/revised forecast and actuals by stop/attempt/workload identity. Missing arrival, phone-only no-answer and uncertain clocks remain unavailable/uncertain.

6. Changed workload, interruptions and unfinished early closure must not be presented as simple lateness or driver ranking.

## Ordered implementation checkpoints

### Checkpoint A — Report query contract

- [ ] Finalize filter/snapshot/units/denominator and missing-time semantics with scoped real PostgreSQL queries.
- [ ] Use effective corrections while retaining access to original history; distinguish pending local actions from accepted report totals.
- [ ] Check: retries do not create extra shipments and returned/disposed pieces are not counted twice.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Timing comparisons

- [ ] Calculate per-stop arrival/completion and whole-round baseline/latest/actual comparisons from existing stored references.
- [ ] Derive travel/service durations only where matching trustworthy action boundaries exist.
- [ ] Check: delayed server receipt never replaces a claimed physical arrival time.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Focused report UI

- [ ] Build summary → detail navigation using existing components and brief Arabic explanations for missing/changed scope.
- [ ] Show held work/unfinished scope distinctly; keep the driver summary readable before expanding tables.
- [ ] Check: user can identify which forecast and workload are compared without a technical explanation.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Workday spans midnight/offset change | Same workday identity with correct local dates/times. |
| No-answer by phone lacks arrival | No invented travel/service/arrival measurement. |
| New tasks added after first start | Original and revised scope/forecast remain distinguishable. |
| Outcome corrected later | Effective totals change; original history retained. |
| Round ends early with work remaining | Not labelled successful completion of the original forecast. |
| Two currencies or pending local actions | No mixed-currency total or pending-as-confirmed amount. |

## Required verification

- Run reporting-query.test.ts against real fixtures covering counts, retries, partial/refusal/prepaid, subset returns and corrections.
- Run browser mobile/desktop report flows and authorization checks; validate actual source forecast capture rather than fabricating historical fixtures as production data.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Real report/timing APIs, focused report UI and docs/reporting.md definitions.
- Meaningful timing/quantity/money/isolation evidence and explicit missing-data behavior.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No rankings, incentives, GPS dwell estimates, learned ETA, remittance ledger or Excel generation yet.

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

Phase 37 exports this exact authorized report snapshot and definitions, avoiding a second divergent reporting query.

Next numbered prompt: [Phase 37](37-authorized-excel-export.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

