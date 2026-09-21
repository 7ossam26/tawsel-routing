# Phase 39 — Recoverable deployment and migration release procedure

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Application releases and migration recovery must preserve the live Engine and user data.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Prepare and verify a nondestructive KVM 2/Dokploy deployment path with safe networking, pinned services and compatible migration/update procedures.

## Prerequisites to verify before editing

Execute after [Phase 38](38-diagnostics-freshness-capacity.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 07](07-oidc-login-recovery-sessions.md), [Phase 11](11-locations-map-assets.md), [Phase 25](25-outbox-signed-delivery.md), [Phase 26](26-mock-inbox-projection-recovery.md), [Phase 35](35-offline-auth-updates-ux.md), [Phase 38](38-diagnostics-freshness-capacity.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-06](coverage-matrix.md#r-06), [R-42](coverage-matrix.md#r-42), [R-56](coverage-matrix.md#r-56), [R-60](coverage-matrix.md#r-60), [R-61](coverage-matrix.md#r-61), [R-62](coverage-matrix.md#r-62), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-01, D-13, D-58, D-60, D-63, D-76, D-77, D-84, D-86, D-103, D-104, D-107, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 4 and 17; D-76–D-77, D-85–D-86.
- Actual deploy/runtime/issuer/map/worker requirements and docs/operations.md.
- Existing Engine Compose/setup/mounts and the actual target inventory when authorized access exists.

## Required behavior and invariants

1. Inventory co-located workloads, Engine versions/datasets/volumes, ports, resources and disk before changing the target.

2. Preserve Engine paths/data; ordinary app deploy never imports OSM or rebuilds routing datasets. Resolve VROOM/Dokploy port risks deliberately.

3. Expose app/API/issuer through HTTPS; PostgreSQL and raw Engine stay internal. Mock ERP is private and labelled.

4. Use reproducible pinned images, external secrets, one migration runner and expand/contract compatibility for old queued actions.

5. A deployment path needs rollback or forward recovery and verified backup prerequisites before live mutation.

6. Use actual authorized target/access when available; otherwise complete local/staging preparation and name missing target facts without inventing values.

## Ordered implementation checkpoints

### Checkpoint A — Inventory and configuration

- [ ] Read actual target topology/resources or document unavailable access precisely; prepare a concrete configuration with safe placeholders.
- [ ] Build reproducible web/API/worker/issuer/mock deployment and range-capable map serving with health/readiness.
- [ ] Check: network/port/mount diff preserves existing Engine and other workloads.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Migration/release procedure

- [ ] Implement and document one-runner migrations, pre-release backup checks and application/PWA compatibility.
- [ ] Verify a failed deployment/migration can follow a tested rollback or forward-fix path without erasing pending actions.
- [ ] Check: old client payloads remain interpretable after the release.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Staging/authorized target

- [ ] Exercise clean application install and upgrade in isolated staging; deploy to identified authorized target only with necessary safeguards available.
- [ ] Verify TLS/issuer redirects/email/map ranges, restart/replay and private service exposure.
- [ ] Check: record actual target results separately from locally validated config; no pilot-ready claim yet.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Target hosts existing Engine/workloads | New configuration preserves mounts and avoids blind port replacement. |
| Ordinary application update | No map import/preprocessing command runs. |
| Migration fails halfway | Documented safe recovery; no casual destructive database reset. |
| Old PWA has queued actions | Release remains compatible or safely rejects while retaining evidence. |
| TLS/email/domain values absent | Preparation complete; target-specific validation is unrun with concrete missing setup. |
| Mock deployment exists | Private/test-only, visibly labelled and separately credentialed. |

## Required verification

- Validate/build deployment configuration and run clean/upgrade/restart scenarios in isolated resources.
- Record target inventory, commands, versions, secret handling and failed/unrun checks in operations/deployment evidence; do not expose secrets in logs.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Reproducible deployment config, migration/release/recovery instructions and actual environment evidence.
- Record actual staging/target commands, release/config versions and failed/unrun results in docs/verification/deployment.md.
- Explicit target prerequisites and safe deployment status.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No unauthorized public launch, automatic resource purchase, Engine reset, guessed DNS/credentials or readiness claim from a Compose parse.

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

Phase 40 completes independent backup/restore proof; live rollout that lacked verified backup prerequisites remains pending until those are satisfied.

Next numbered prompt: [Phase 40](40-backup-restore-rehearsal.md). State the exact verified artifacts it may rely on. Do not execute it in this task.
