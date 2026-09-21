# Phase 25 — Durable outbox sender and signed delivery

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Leases, signed bytes, durable delivery, retries and ordering must recover from process failures.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Deliver committed Tawsel events through a restart-safe worker with scoped signatures, retry/ordering and observable durable states.

## Prerequisites to verify before editing

Execute after [Phase 24](24-coherent-monitoring-api.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 08](08-erp-provisioning-actor-binding.md), [Phase 17](17-outcomes-quantities-collection.md), [Phase 21](21-source-return-receipt.md), [Phase 23](23-bounded-driver-corrections.md), [Phase 24](24-coherent-monitoring-api.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-45](coverage-matrix.md#r-45), [R-46](coverage-matrix.md#r-46), [R-47](coverage-matrix.md#r-47), [R-49](coverage-matrix.md#r-49), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-12, D-13, D-62, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md sections 10, 12, 14 and 17; initial integration requirements and D-13/D-62.
- Actual domain outbox rows/event schemas from intake, outcomes, returns and corrections.
- Integration guide, credential setup and worker/job lifecycle conventions.

## Required behavior and invariants

1. Domain intent already committed in earlier phases; sender must consume it without requiring a new business write.

2. Network delivery is at least once. Stable event ID survives retries; no exactly-once networking or distributed ACID claim.

3. Claim with short leases, send outside transactions and recover expired leases. A failed recipient cannot block another integration.

4. Preserve recipient aggregate ordering/gap semantics; event sequence is not domain revision and cannot leak hidden-source events.

5. Sign exact transmitted bytes with scoped rotated secret/key ID and fresh delivery timestamp. Retry event identity remains stable.

6. Received and projection-applied are different states. Retain unresolved failures; proposed retry backoff is jittered and capped at five minutes.

## Ordered implementation checkpoints

### Checkpoint A — Sender contract and claims

- [ ] Finalize envelope/signature/delivery-state schema details and recipient routing rules.
- [ ] Implement bounded leasing/claims, attempt records and recoverable completion using actual committed outbox.
- [ ] Check: process restart after claim does not lose events or hold a lease forever.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Delivery and failure

- [ ] Implement exact-byte signing, key rotation, HTTP timeout handling, retry scheduling and authorized destination/network controls.
- [ ] Use a controlled receiver harness now; label its acknowledgement level without claiming Phase 26 durable projection.
- [ ] Check: response loss after receiver receipt leads to safe stable-ID redelivery.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Visibility and replay

- [ ] Expose scoped queue/error/delivery reads and controlled retry, with sanitized correlation logs.
- [ ] Preserve failed/unprocessed events and long-lived identity; do not add an automatic business-history purge.
- [ ] Check: one failing tenant endpoint does not starve healthy deliveries.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Crash after business commit before send | Event remains discoverable and is eventually attempted. |
| Crash after send before recording acknowledgement | Same event is redelivered with a fresh signature timestamp. |
| Secret rotated | Documented overlap/key ID validates intended events; wrong secret fails. |
| One recipient repeatedly unavailable | Other recipients continue within bounded resources. |
| Caller configures unauthorized/internal target | Destination policy rejects it except explicit isolated test configuration. |
| Receiver says durably received | Do not label business projection applied without separate evidence. |

## Required verification

- Create outbox-sender.test.ts with real PostgreSQL, real test HTTP boundary, process/lease recovery and signature byte checks.
- Start outbox-inbox-recovery.test.ts sender-side evidence; complete separate durable receiver assertions in Phase 26.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Complete event/status and signature/recovery obligations in docs/integration-guide.md and docs/erp/field-and-status-mapping.md, with validated exact-byte examples, version/rotation rules and received versus applied states.
- Runnable delivery worker, signed protocol, retry/lease/ordering behavior and scoped operational reads.
- Actual sender failure/recovery evidence and updated integration examples.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No real shipping ERP, production-public mock, silent dead-letter deletion or acknowledged-equals-applied shortcut.

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

Phase 26 implements the external durable inbox/projection and full lost-response/crash/replay proof using these emitted events.

Next numbered prompt: [Phase 26](26-mock-inbox-projection-recovery.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

