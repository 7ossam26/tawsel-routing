# Phase 33 — PWA downloads and atomic local action capture

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Atomic browser storage, downloaded scope and local actions must survive reopen and storage failure.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Persist authorized started work and local action evidence so a driver can reopen and record allowed work without falsely claiming server acceptance.

## Prerequisites to verify before editing

Execute after [Phase 32](32-monitoring-sync-online-ui.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 07](07-oidc-login-recovery-sessions.md), [Phase 20](20-device-takeover-evidence.md), [Phase 28](28-online-preparation-journeys.md), [Phase 29](29-ordinary-driver-delivery-ui.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-01](coverage-matrix.md#r-01), [R-39](coverage-matrix.md#r-39), [R-41](coverage-matrix.md#r-41), [R-42](coverage-matrix.md#r-42), [R-43](coverage-matrix.md#r-43), [R-53](coverage-matrix.md#r-53), [R-59](coverage-matrix.md#r-59), [R-65](coverage-matrix.md#r-65).
Decision references: D-02, D-10, D-15, D-25, D-27, D-60, D-61, D-76, D-81, D-82, D-83, D-88, D-90, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 6, 10–11 and 16; D-10, D-27, D-60–D-61, D-76, D-81.
- Actual execution/action/owner schemas and online driver components.
- Workbox/Dexie current primary docs for pinned versions; account/session and update compatibility design.

## Required behavior and invariants

1. Offline continuation applies to already-started downloaded work. Login/first download/new round start need connectivity and server acceptance.

2. A query cache is not the durable action record. Use account/tenant/device-scoped Dexie stores and separate confirmed/pending projections.

3. Write immutable action envelope and pending local projection in one IndexedDB transaction before saying saved on phone.

4. Include stable ID, resource/base revisions, generation, dependency/sequence, schema version and observed-time quality.

5. Failed storage writes must show failure and preserve unsaved input; no animation or in-memory state can claim durable success.

6. Maps are best effort; downloaded task details/route geometry and self-hosted shell/fonts remain useful without a full basemap.

## Ordered implementation checkpoints

### Checkpoint A — PWA and account stores

- [ ] Configure Workbox shell/static precache and versioned Dexie stores for authorized snapshot/action/ack data.
- [ ] Request persistent storage and expose honest readiness; never cache another account's work under shared generic keys.
- [ ] Check: offline reopen of downloaded started work succeeds, while an unstarted plan cannot start.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Atomic capture

- [ ] Connect actual driver commands to local action-plus-pending writes before network send.
- [ ] Keep last confirmed state intact and show saved-on-phone distinctly from confirmed; record capture clock metadata.
- [ ] Check: injected quota/transaction abort never produces saved success.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Durability and evidence

- [ ] Implement snapshot download/version checks, local queue inspection for diagnostics and safe account partition selection.
- [ ] Create local-capture tests using real queue modules and labelled browser-storage fixtures.
- [ ] Check: browser refresh/reopen retains saved evidence, and unsent actions remain invisible to server-only monitoring.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Already-started downloaded round reopened offline | Allowed cached details/actions appear within supported capabilities. |
| Stored draft plan opened offline | No new round start is fabricated. |
| Local write fails | Visible failure and retained input; no saved-on-phone acknowledgement. |
| Action saved locally, server unavailable | Pending effect separated from confirmed state. |
| Account switch attempted while pending | Guard exposes pending work; full recovery/exit behavior is completed in Phase 35. |
| Basemap unavailable | List/details/stored route context remain useful without fake tile coverage. |

## Required verification

- Run local-action-capture.test.ts for atomic writes, IDs/dependencies/account keys and storage failure; label simulated IndexedDB.
- Use a real browser/PWA to download, disconnect, record, close/reopen and inspect retained evidence; no claimed 24-hour observation from a short test.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Real local persistence, downloaded-work cache and truthful pending action UI.
- Storage failure/reopen evidence and documented schema/version boundaries.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No universal background sync guarantee, offline optimizer/new start, GPS or promise against phone loss/storage clearing.

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

Phase 34 replays these exact durable envelopes with original IDs; Phase 35 makes auth, logout and updates safe around pending evidence.

Next numbered prompt: [Phase 34](34-ordered-replay-conflict-recovery.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

