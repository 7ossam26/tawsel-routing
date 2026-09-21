# Phase 42 — Final contract, readiness and ERP handoff

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Audit cross-phase contract drift and assemble a reproducible, evidence-backed ERP planning handoff.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Deliver an accurate as-built application/ERP handoff and readiness report showing exactly what is implemented, verified, owner-reviewed and still outstanding.

## Prerequisites to verify before editing

Execute after [Phase 41](41-device-owner-pilot-review.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 02](02-state-contract-foundation.md), [Phase 27](27-native-mock-erp-source.md), [Phase 37](37-authorized-excel-export.md), [Phase 38](38-diagnostics-freshness-capacity.md), [Phase 39](39-deployment-migration-release.md), [Phase 40](40-backup-restore-rehearsal.md), [Phase 41](41-device-owner-pilot-review.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-01](coverage-matrix.md#r-01), [R-02](coverage-matrix.md#r-02), [R-03](coverage-matrix.md#r-03), [R-11](coverage-matrix.md#r-11), [R-20](coverage-matrix.md#r-20), [R-30](coverage-matrix.md#r-30), [R-34](coverage-matrix.md#r-34), [R-47](coverage-matrix.md#r-47), [R-49](coverage-matrix.md#r-49), [R-50](coverage-matrix.md#r-50), [R-51](coverage-matrix.md#r-51), [R-58](coverage-matrix.md#r-58), [R-62](coverage-matrix.md#r-62), [R-63](coverage-matrix.md#r-63), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-01, D-02, D-03, D-11, D-13, D-14, D-15, D-16, D-18, D-20, D-22, D-27, D-28, D-30, D-31, D-33, D-38, D-40, D-44, D-50, D-54, D-59, D-64, D-65, D-76, D-84, D-85, D-90, D-95, D-105, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md in full, decision-map.md, coverage-matrix.md and every phase's actual execution/evidence entry.
- Canonical HTTP/event/examples/client, docs/contract-coverage.md, tracking/consistency, integration, reporting and operations documents.
- Pilot/performance/restore/UI evidence and actual release/config/schema/Engine versions.
- docs/erp/README.md, ERP-PLANNING-INPUT.md, field-and-status-mapping.md and consumer-quickstart.md; Phase 26–27 conformance scripts, public client build and two-way evidence.

## Required behavior and invariants

1. Every accepted requirement must have a concrete implementation owner and evidence reference; a prompt or schema is not runtime completion.

2. Distinguish designed, implemented, verified locally, verified on target and owner-reviewed. Unrun required checks remain visible.

3. Real shipping ERP implementation is separate; hand off released contracts and obligations demonstrated by the mock without promising automatic field/identity migration.

4. Retain source ownership, verified actor context, native actual receipt, durable source outbox/inbox and received/applied/replay semantics.

5. Future GPS/native/learning/billing are boundary notes only, not speculative tables/endpoints or launch gates.

6. A required missing feature/test is not waived by reaching Phase 42 or by elapsed effort.

7. The final ERP bundle must be usable without chat history or Tawsel-internal access. Keep canonical artifacts as the source; record their real versions/paths and digests, and separate proven reference-ERP mapping from unknown choices for the future real ERP.

## Ordered implementation checkpoints

### Checkpoint A — Coverage and drift audit

- [ ] Reconcile every requirement/decision mapping, operation/event schema, generated client, UI action and applicable test.
- [ ] Remove stale as-built claims and identify any actual missing behavior; make only bounded fixes with regression evidence.
- [ ] Check: no remaining private frontend endpoint or mock-only success is represented as the released contract.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — ERP and operations handoff

- [ ] Write docs/ERP-INTEGRATION-HANDOFF.md from actual released versions, validated messages, actor/provisioning setup and native source/receipt flows. Finalize docs/erp/README.md, ERP-PLANNING-INPUT.md and field-and-status-mapping.md: ownership, IDs, command/event/state mappings, revisions, quantities/money/timestamps, recovery obligations, ERP implementation slices and remaining ERP-specific choices.
- [ ] Complete README/environment/operations with real deployment, diagnostics, release/recovery and connector obligations. Create docs/erp/release-manifest.json with actual code/release identity, supported API/event/client versions, relative artifact paths and SHA-256 digests. Include canonical schemas/examples/client output, reference consumer, quickstart and evidence; exclude the manifest's own digest and all secrets.
- [ ] Check: run the documented quickstart from a clean consumer directory/environment using only published contracts/client/reference artifacts, scoped credentials and public URLs. Complete the two-task journey and relevant tests/erp-conformance/ checks without Tawsel database access or domain imports. Record exact commands, versions and outcomes in docs/verification/integration.md; missing input or a hidden internal dependency is a failed handoff condition.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Readiness decision

- [ ] Assemble A–P results with exact evidence and list failed/unrun conditions, owner findings and practical effect.
- [ ] Run the relevant integrated acceptance suite for the final release; do not repeat unrelated passing tests without changes.
- [ ] Check: state pilot-ready only for demonstrated required conditions, or provide a precise incomplete-readiness handoff.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Feature has code but no required test/device evidence | Implementation and verification statuses remain distinct. |
| Contract example differs from actual handler | Fix canonical drift and validate actual payload before release claim. |
| Mock consumer passed but real ERP absent | Report verified boundary and separate real-connector work. |
| Backup/freshness/device target not demonstrated | Required gap stays visible in readiness report. |
| Old decision was superseded | Final behavior follows latest recorded amendment, not archived prompt. |
| Owner receives handoff | Bundle index/manifest resolve; clean public-only consumer setup and conformance run succeed; ERP planning input identifies ownership, mappings, remaining choices and ordered next work without this chat. |

## Required verification

- Audit all A–P groups and run meaningful existing suites against final code/config; report exact commands and actual pass/fail/unrun results.
- Validate released schemas/examples/generated client and reproducible two-stop API/event/report journey; no fabricated universal completion statement.
- Validate every release-manifest path, declared version and digest against final artifacts. Run the clean consumer quickstart and relevant conformance checks against the final code/config; preserve actual failed/unrun cases instead of treating document presence as proof.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- As-built docs/ERP-INTEGRATION-HANDOFF.md, final current documentation and accurate release/readiness evidence.
- Final docs/erp/README.md, ERP-PLANNING-INPUT.md, field-and-status-mapping.md, consumer-quickstart.md and release-manifest.json, referencing the real released schemas/examples/public client/reference consumer and conformance suite. Provide the concrete packaging/build command and reading order; do not leave placeholder mapping or setup sections.
- Complete execution ledger with unresolved requirements plainly retained.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No real ERP build, public launch/purchase by implication, speculative features, automatic archive of defects or pretend all-green status.

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

Stop after presenting the completed handoff and actual remaining conditions. The owner controls any later rollout or separate ERP project.

This is the final numbered phase. Stop with the truthful readiness/handoff result; missing requirements remain outstanding.

