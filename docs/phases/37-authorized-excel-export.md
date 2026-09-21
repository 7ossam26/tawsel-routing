# Phase 37 — Equivalent authorized Excel exports

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Why this choice:** Produce an authorized Excel export equivalent to the existing verified report snapshot.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Download a real Excel workbook matching the authorized report view, with stable snapshot/filter semantics and safe user-controlled text.

## Prerequisites to verify before editing

Execute after [Phase 36](36-workday-timing-reports.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 06](06-tenant-capabilities-isolation.md), [Phase 36](36-workday-timing-reports.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-01](coverage-matrix.md#r-01), [R-43](coverage-matrix.md#r-43), [R-52](coverage-matrix.md#r-52), [R-53](coverage-matrix.md#r-53), [R-54](coverage-matrix.md#r-54), [R-58](coverage-matrix.md#r-58), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-02, D-08, D-15, D-24, D-25, D-26, D-27, D-67, D-76, D-82, D-88, D-89, D-90, D-100, D-105, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 13 and 15; D-100.
- docs/reporting.md, actual report queries/schema and export operation inventory.
- Current primary documentation for the selected compatible maintained workbook library.

## Required behavior and invariants

1. The workbook uses the same authorized rows, filters, snapshot, units, status definitions, timezone and missing-value semantics as the report.

2. Authorize both export creation and download. A saved file or job ID is not a bearer permission to another tenant's data.

3. Use real .xlsx format, numeric precision appropriate to stored minor units and explicit currency/quantity units.

4. Write names/addresses/IDs and formula-looking user text as literal text; do not create executable formulas or links from it.

5. Generated artifacts/jobs have bounded resource usage and expiry with scoped storage; errors cannot expose internal files or credentials.

6. Keep the UI simple: export from the selected report context, with genuine pending/failure/download states and sync requirements.

## Ordered implementation checkpoints

### Checkpoint A — Export contract and snapshot

- [ ] Finalize synchronous/async result/download/error schemas based on actual workload needs without inventing fake download endpoints.
- [ ] Bind the export to an authorized report snapshot and make creation/download scope checks explicit.
- [ ] Check: changed permissions or guessed export IDs cannot reveal another scope.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Workbook generation

- [ ] Implement real workbook generation using the shared report result, with readable Arabic headers and documented units/timezone.
- [ ] Handle missing/uncertain values and literal user text deliberately; use bounded storage/expiry.
- [ ] Check: parse the generated workbook in tests and compare its rows/values to the report.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Connected download

- [ ] Connect actual export action to report UI with concise ready/pending/failure feedback.
- [ ] Document artifact cleanup and retry/status behavior without duplicate costly jobs.
- [ ] Check: a browser downloads a usable workbook for the connected two-stop journey.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Formula-looking recipient name begins with = | Cell is literal text, not executable formula. |
| User requests another branch/tenant's report | Creation denied; filters cannot expand scope. |
| Authorized creation but unauthorized download | Download denied under current policy. |
| Workbook generated from a snapshot | Rows and totals match that snapshot, not a later drifting query. |
| Missing arrival/uncertain clock | Same explicit missing/uncertain meaning as in-app report. |
| Generation fails or output expires | Real error/retry state; no dead download button or public file leak. |

## Required verification

- Run report-export.test.ts with actual database report fixtures and workbook parsing: row equivalence, formats, text safety and download authorization.
- Run browser filtering/export/download and inspect the actual workbook content; do not claim a renamed CSV is Excel.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Real authorized .xlsx endpoint/job/download, connected UI and artifact lifecycle.
- Tests proving report equivalence and safe scoped content.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No independent finance calculation, cross-company report, settlement worksheet, arbitrary formula execution or fake sample export.

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

Operational phases measure export resource usage and final pilot demonstrates both accepted report and matching downloaded workbook.

Next numbered prompt: [Phase 38](38-diagnostics-freshness-capacity.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

