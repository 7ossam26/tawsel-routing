# Phase 40 — Backup, isolated restore and recovery proof

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** An isolated restore must prove data, identity and synchronization recovery with measured evidence.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Prove server-stored application state can be recovered, including the integration checkpoint and identity/configuration needed to use it.

## Prerequisites to verify before editing

Execute after [Phase 39](39-deployment-migration-release.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 07](07-oidc-login-recovery-sessions.md), [Phase 25](25-outbox-signed-delivery.md), [Phase 26](26-mock-inbox-projection-recovery.md), [Phase 39](39-deployment-migration-release.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-46](coverage-matrix.md#r-46), [R-48](coverage-matrix.md#r-48), [R-60](coverage-matrix.md#r-60), [R-62](coverage-matrix.md#r-62), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-13, D-77, D-86, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md section 17; operational baseline proposals and D-86.
- Actual PostgreSQL/issuer/integration storage, deployment mounts and release procedure.
- Operations backup/restore requirements; identified backup destination/access and failure-domain assumptions.

## Required behavior and invariants

1. Proposed application-data targets are RPO ≤15 minutes and RTO ≤4 hours; they are not measured guarantees until demonstrated.

2. Use PostgreSQL base backups/WAL archiving to a genuinely separate failure domain or record why targets remain unmet.

3. Identity configuration/storage and integration secrets need protected recovery; app rows alone do not restore login or event delivery.

4. Engine/map artifacts have separate size/restore characteristics. Do not accidentally rerun imports against live data.

5. A successful backup job is not restore evidence. Restore into isolated verified paths/databases and check a known trip/action/event checkpoint.

6. Server backups cannot recover unsent actions from a lost/cleared phone. Keep this limitation explicit.

## Ordered implementation checkpoints

### Checkpoint A — Backup configuration

- [ ] Configure actual application/issuer backup and WAL/archive retention/access with encryption/protected secrets as appropriate.
- [ ] Document destinations, failure domains, retention and restore dependencies using real environment facts.
- [ ] Check: backup failure is observable; inaccessible destination is not treated as success.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Timed isolated restore

- [ ] Prepare verified isolated restore targets and a known committed task/outcome/outbox/inbox checkpoint.
- [ ] Restore application/identity/config and measure recoverable point plus total service restoration time.
- [ ] Check: recovered login, authoritative outcome and integration processing state match the checkpoint.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Recovery runbook

- [ ] Verify restart/replay after restore without duplicating business effects or using expired credentials silently.
- [ ] Document Engine/map restore source and its separate expected time; update release backup prerequisites.
- [ ] Check: publish achieved results, gaps and remedy rather than quietly changing the proposed targets.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Backup command exits successfully | Still require an isolated restore and business checkpoint verification. |
| Primary host lost | Destination must survive the stated failure assumption. |
| Outbox event was committed near failure | Recovery point and replay behavior are measured explicitly. |
| Identity secret/config absent | Recovery remains incomplete, even if app tables restored. |
| Phone had unsent work | Server restore does not claim to recreate it. |
| Targets not achieved | Actual RPO/RTO and required fix stay visible before live pilot readiness. |

## Required verification

- Run a real timed restore rehearsal and verify known task/action/event records through actual API/identity/receiver paths.
- Test backup failure alerts and record exact versions, timestamps, destination class and recovery limitations in docs/verification/restore.md.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Working backup/restore configuration, protected recovery inventory and timed evidence.
- Owner-readable recovery runbook and explicit achieved/unmet targets.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No destructive restore onto active data, broad computed-path deletes, fake backup evidence or automatic Engine rebuild.

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

Phase 41 uses the verified release/recovery conditions for the owner pilot; Phase 42 carries unresolved operational gaps into truthful readiness status.

Next numbered prompt: [Phase 41](41-device-owner-pilot-review.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

