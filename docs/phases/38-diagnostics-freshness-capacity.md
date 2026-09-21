# Phase 38 — Owner diagnostics and measured freshness/capacity

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Design meaningful measurements and interpret freshness, errors and capacity without overclaiming.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Give the owner a reproducible way to locate bottlenecks and measure monitoring/integration freshness under stated conditions, without inventing supported capacity.

## Prerequisites to verify before editing

Execute after [Phase 37](37-authorized-excel-export.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 24](24-coherent-monitoring-api.md), [Phase 25](25-outbox-signed-delivery.md), [Phase 26](26-mock-inbox-projection-recovery.md), [Phase 27](27-native-mock-erp-source.md), [Phase 32](32-monitoring-sync-online-ui.md), [Phase 34](34-ordered-replay-conflict-recovery.md), [Phase 37](37-authorized-excel-export.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-44](coverage-matrix.md#r-44), [R-45](coverage-matrix.md#r-45), [R-46](coverage-matrix.md#r-46), [R-47](coverage-matrix.md#r-47), [R-48](coverage-matrix.md#r-48), [R-61](coverage-matrix.md#r-61), [R-65](coverage-matrix.md#r-65).
Decision references: D-12, D-13, D-24, D-62, D-63, D-86, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 14 and 17; D-12, D-62–D-63, D-77, D-86.
- Actual API/query/worker/render/application timing, outbox/inbox and export implementations.
- Operations runbook and observed Engine/resource versions; historical benchmarks are not new measurements.

## Required behavior and invariants

1. Healthy-path targets are p95 ≤3 seconds Tawsel commit-to-visible view and ≤5 seconds commit-to-mock-ERP projection application.

2. Report p50/p95/p99, errors, sample counts, environment and clock uncertainty. Averages alone do not establish targets.

3. Unsent offline time and receiver outages are separate lag/recovery conditions; do not remove failed samples silently.

4. Start with five drivers/two observers, then ramp actions/observers/Engine jobs to find bottlenecks. This is not a hard product account limit.

5. Track database pressure, locks/pool, worker lease/queue age, Engine errors, projection lag, disk/memory/CPU and backup readiness.

6. Use a small authorized diagnostic surface and actionable runbook; normal driver screens do not become technical consoles.

## Ordered implementation checkpoints

### Checkpoint A — Observability

- [ ] Implement structured correlation logs and scoped metrics/status endpoints, excluding secrets/recipient payloads by default.
- [ ] Separate API liveness, database readiness, worker health, Engine availability and integration lag.
- [ ] Check: Engine outage does not falsely label committed outcomes lost or prevent valid stored execution.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Measurement harness

- [ ] Build repeatable seeded workload and commit/render/applied timing capture using actual application paths.
- [ ] Run baseline and ramp load; record clock synchronization/uncertainty and error/timeout accounting.
- [ ] Check: delayed receiver and browser backgrounding are classified honestly, not hidden in healthy averages.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Owner diagnosis

- [ ] Provide scripts/runbook and a concise operations view to reproduce slowness, inspect queue age and locate resource saturation.
- [ ] Record actual bottleneck, changes attempted and measured effect; justify any optimization with evidence.
- [ ] Check: owner can follow a slow ERP example from action correlation to sender/receiver status.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| One fast local sample | Diagnostic observation only, not a p95 target pass. |
| Receiver outage | Visible queue/application lag and separate recovery measurement. |
| Driver idle | Fresh polling remains distinct from action inactivity. |
| Concurrency increased | Find/report saturation and errors; no invented universal capacity. |
| Sensitive payload in exception | Sanitized logs retain useful correlation without leaking contents. |
| Target host unavailable | Local measurements labelled local; target capacity remains unrun. |

## Required verification

- Run focused diagnostics authorization/redaction and measurement-accounting tests plus actual documented load runs.
- Record environment/config/versions, workload, percentile calculations and failed/unrun target conditions in docs/verification/performance.md.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Owner-usable diagnostic surface/runbook and repeatable load/freshness harness.
- Measured performance report with limits and actionable bottlenecks.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No forced server upgrade/purchase, hard pilot user cap, blanket capacity claim or large monitoring platform without need.

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

Phase 39 inventories/deploys the real target; repeat only target-specific measurements or checks justified by actual configuration changes.

Next numbered prompt: [Phase 39](39-deployment-migration-release.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

