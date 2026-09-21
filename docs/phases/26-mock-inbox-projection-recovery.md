# Phase 26 — External mock inbox, projection and reconciliation

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Independent inbox/projection transactions, gaps and public-boundary conformance prove external integration.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Prove the receiving side behaves as a real external ERP consumer with its own storage, durable receipt, atomic projection and recovery from gaps or expired replay history.

## Prerequisites to verify before editing

Execute after [Phase 25](25-outbox-signed-delivery.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 02](02-state-contract-foundation.md), [Phase 08](08-erp-provisioning-actor-binding.md), [Phase 25](25-outbox-signed-delivery.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-43](coverage-matrix.md#r-43), [R-45](coverage-matrix.md#r-45), [R-46](coverage-matrix.md#r-46), [R-47](coverage-matrix.md#r-47), [R-48](coverage-matrix.md#r-48), [R-49](coverage-matrix.md#r-49), [R-51](coverage-matrix.md#r-51), [R-58](coverage-matrix.md#r-58), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-02, D-12, D-13, D-25, D-62, D-85, D-90, D-105, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md section 12 and acceptance H/L; D-13, D-62, D-85.
- Released/designed event contracts, sender signature protocol, replay/checkpoint operation inventory.
- Actual Phase 25 worker and domain event examples; no imports of Tawsel domain repositories.

## Required behavior and invariants

1. Mock ERP uses separate database, credentials and migrations. It consumes published/generated contracts, never Tawsel tables or domain modules.

2. Verify signature, timestamp, schema, recipient and payload identity before acknowledging.

3. Durably insert inbox before received acknowledgement; projection and processed marker commit together. Duplicate delivery returns durable prior state.

4. Required quantity/receipt/correction transitions cannot be dropped just because a newer replacement progress snapshot arrived.

5. Detect per-recipient ordering gaps and recover through retained replay or scoped authoritative snapshot/checkpoint with explicit limits.

6. A snapshot beyond retained history restores current projection; it cannot invent missing historical financial transitions.

## Ordered implementation checkpoints

### Checkpoint A — Durable receiver

- [ ] Create runnable external receiver and isolated database migrations for inbox/projection/processed state. Its runtime has no Tawsel database credentials or internal domain imports; consume only published schemas/client artifacts and HTTP.
- [ ] Implement exact-byte signature validation, supported schema checks and stable duplicate/payload-mismatch handling.
- [ ] Check: crash before durable receipt never returns a false accepted acknowledgement.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Atomic projection

- [ ] Apply real intake/execution/receipt/correction events through one local transaction with processed marker.
- [ ] Expose received-versus-applied checkpoint/status over the published protocol.
- [ ] Check: injected projection failure does not leave half-applied quantities or a processed marker.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Gap recovery

- [ ] Implement out-of-order buffering/rejection semantics, scoped replay/checkpoint reconciliation and visible unresolved history limits.
- [ ] Complete two-sided sender/receiver restart and response-loss demonstrations. Create reusable receiver conformance checks in tests/erp-conformance/ configured by public API/callback URLs and scoped test credentials. Write docs/erp/consumer-quickstart.md with actual install/start/check commands, versions, example configuration and expected received/applied observations; Phase 27 extends this to source commands.
- [ ] Check: older snapshots may be ignored safely, required business transitions may not be discarded.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Receiver crashes after inbox commit before projection | Event remains received and is processed after restart. |
| Projection write fails before marker commit | Both roll back; retry applies once. |
| Same event ID, same bytes redelivered | No duplicate projected quantities/collection. |
| Same event ID with changed payload | Mismatch recorded/rejected, not a second application. |
| Sequence gap or expired replay window | Explicit recovery path and honest historical limitation. |
| Tenant/source not authorized for event | No receipt or projection leakage into another recipient. |

## Required verification

- Complete outbox-inbox-recovery.test.ts using actual sender/receiver code, separate real databases and HTTP; include crash-before/after commits.
- Validate all captured payloads and projection checkpoints; document evidence in docs/verification/integration.md. Run the receiver conformance checks against separate real processes/databases over HTTP. Prove the consumer cannot access Tawsel internal tables/modules; identify boundary fixtures versus real network evidence.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- External durable mock receiver, projection worker and received/applied protocol.
- Replay/reconciliation APIs and complete cross-boundary failure evidence.
- Runnable tests/erp-conformance/ receiver checks, consumer configuration example and docs/erp/consumer-quickstart.md. Record actual reference-consumer/client build paths so another project can use the public artifacts.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No native source/admin forms yet, direct database coupling, commercial accounting or invented historical recovery.

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

Phase 27 adds native mock source operations/outbox and minimal ERP screens; its incoming projection already uses this durable receiver.

Next numbered prompt: [Phase 27](27-native-mock-erp-source.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

