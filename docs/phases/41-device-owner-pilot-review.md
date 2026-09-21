# Phase 41 — Real-device and owner pilot walkthrough

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Synthesize real-device behavior, owner findings and incomplete acceptance evidence.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Verify the complete real B2C journey and separate B2B mock scenarios on target browsers/devices, including simple UX and genuine elapsed offline observation where available.

## Prerequisites to verify before editing

Execute after [Phase 40](40-backup-restore-rehearsal.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 27](27-native-mock-erp-source.md), [Phase 28](28-online-preparation-journeys.md), [Phase 29](29-ordinary-driver-delivery-ui.md), [Phase 32](32-monitoring-sync-online-ui.md), [Phase 33](33-offline-local-capture.md), [Phase 34](34-ordered-replay-conflict-recovery.md), [Phase 35](35-offline-auth-updates-ux.md), [Phase 36](36-workday-timing-reports.md), [Phase 37](37-authorized-excel-export.md), [Phase 38](38-diagnostics-freshness-capacity.md), [Phase 39](39-deployment-migration-release.md), [Phase 40](40-backup-restore-rehearsal.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-07](coverage-matrix.md#r-07), [R-21](coverage-matrix.md#r-21), [R-35](coverage-matrix.md#r-35), [R-36](coverage-matrix.md#r-36), [R-39](coverage-matrix.md#r-39), [R-40](coverage-matrix.md#r-40), [R-41](coverage-matrix.md#r-41), [R-42](coverage-matrix.md#r-42), [R-45](coverage-matrix.md#r-45), [R-51](coverage-matrix.md#r-51), [R-54](coverage-matrix.md#r-54), [R-55](coverage-matrix.md#r-55), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-61](coverage-matrix.md#r-61), [R-62](coverage-matrix.md#r-62), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-10, D-12, D-13, D-22, D-27, D-32, D-34, D-41, D-43, D-58, D-60, D-61, D-62, D-63, D-66, D-68, D-70, D-74, D-76, D-81, D-83, D-85, D-86, D-87, D-95, D-100, D-102, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md acceptance A–P, especially I/N/P; D-60, D-76, D-85–D-86, D-102–D-106.
- All current evidence/status, DESIGN.md, UI specification/review and known target/restore limits.
- All nine original visual sources plus requirement-driven extensions; screenshots are design references, not action authority.

Exact reference directories under stitch-export/screens/: 01-active-driver-trip; 02-stop-details; 03-dispatcher-workspace; 04-login-workspace; 05-driver-daily-trips; 06-route-preparation; 07-location-review; 08-trip-completion; 09-sync-conflicts. Use code.html, metadata.json and screen.jpg for 01–03 or screen.png for 04–09.

## Required behavior and invariants

1. B2C pilot uses real persisted tasks, real configured maps/Engine and actual sessions; B2B demonstration is clearly labelled mock.

2. Android/Chrome and iPhone/Safari require actual device/browser evidence. Desktop emulation does not prove physical-device behavior.

3. Record real approximately 24-hour offline observation separately from accelerated clock tests; unavailable long-run evidence remains outstanding.

4. Every page/state must explain purpose, next action, missing input and waiting without an implementer's narration.

5. Compare recognizable reference design language and complete required actions, not exact prototype button parity.

6. Fix defects in the owning modules with meaningful targeted regressions. This is verification of built features, not permission for a late one-shot rewrite.

## Ordered implementation checkpoints

### Checkpoint A — Reproducible walkthrough

- [ ] Prepare scoped test accounts/tasks and a step-by-step B2C create/confirm/plan/start/deliver/end/report/export run.
- [ ] Prepare B2B native assignment/partial/refusal/subset receipt/correction and another-phone takeover scenarios.
- [ ] Check: all setup/actions are safe and use dedicated test data, with actual owner feedback recorded.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Device/offline review

- [ ] Run install/reopen/disconnect/reconnect/update/storage-error/account recovery on target platforms.
- [ ] Begin/complete actual elapsed offline observation when available; preserve dates/device/browser/version/action results.
- [ ] Check: pending work survives supported paths and no unsupported background/storage guarantee is claimed.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Simplicity and defects

- [ ] Review narrow screens, long RTL content, safe areas, touch/focus/reduced motion and contextual action count.
- [ ] Record confusing copy/excess taps as defects even if APIs pass; fix and rerun only relevant checks.
- [ ] Check: unresolved device or owner-review gaps remain separate from implementation completion.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Owner cannot identify next action | UX defect, even if visual reference and API behavior match. |
| Desktop emulation passes | Physical-device check remains separately required. |
| Offline period accelerated by clock fixture | Label accelerated; do not call it a real day. |
| Partial return unresolved remainder exists | Driver sees actual subset/waiting meaning without a whole-batch gate. |
| Engine outage during pilot | Manual route/continued execution behavior is usable and honest. |
| Owner unavailable for review | Provide concrete walkthrough/evidence and mark owner review outstanding, not approved. |

## Required verification

- Run relevant existing Vitest and real browser/device scenarios; retain screenshots/logs with observed platform versions.
- Update docs/ui-review.md and docs/verification/pilot-readiness.md with A–P evidence references, failed/unrun conditions and actual feedback.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Owner-runnable complete walkthrough, real-device/elapsed-offline evidence where performed and resolved focused defects.
- Clear remaining pilot conditions and usability findings.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No fake owner approval, claimed 24-hour result from short testing, universal browser guarantee or launch despite required missing evidence.

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

Phase 42 audits evidence/contract handoff and cannot mark missing required checks passed merely because implementation reached the final number.

Next numbered prompt: [Phase 42](42-final-contract-readiness-handoff.md). State the exact verified artifacts it may rely on. Do not execute it in this task.
