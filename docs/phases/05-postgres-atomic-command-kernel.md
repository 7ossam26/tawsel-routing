# Phase 05 — PostgreSQL migrations and atomic command kernel

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Atomic transactions, idempotency, rollback and concurrent commits establish system-wide correctness.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Establish the real database and command transaction infrastructure before any feature accepts authoritative changes. Prove commit, rollback and duplicate behavior using PostgreSQL.

## Prerequisites to verify before editing

Execute after [Phase 04](04-representative-ui-review.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 01](01-workspace-test-harness.md), [Phase 02](02-state-contract-foundation.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-08](coverage-matrix.md#r-08), [R-56](coverage-matrix.md#r-56), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65).
Decision references: D-103, D-104, D-105, D-107, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 5, 7, 10–12, 17–18.
- docs/tracking-and-consistency.md, common action/error/event schemas and Phase 01 environment conventions.
- Inspect existing Engine database/mount settings; the application database must remain separate.

## Required behavior and invariants

1. Use pg and versioned SQL migrations with a single migration runner. Never create application tables inside Nominatim.

2. Scope command identity by tenant, authenticated source and action ID; a payload hash distinguishes retries from collisions.

3. Accepted domain data, progress, audit, durable result and outbound intent commit together. Rejected evidence is distinct from an accepted change.

4. Network work cannot run inside long business transactions; an outbox row is durable intent, not evidence of delivery.

5. Retain full command responses for the proposed 30-day window and compact identity for the business-record lifetime; do not purge unresolved work.

6. Use tenant-compatible relationships and explicit lock ordering. Browser locks or in-memory maps cannot establish authoritative uniqueness.

## Ordered implementation checkpoints

### Checkpoint A — Database lifecycle

- [ ] Create dedicated application/test PostgreSQL configuration, migration tooling, transaction helper and pool lifecycle.
- [ ] Add only foundations needed now: scoped identity keys and reusable audit/action-result/outbox structures; later domain tables belong to feature phases.
- [ ] Check: migrations apply to a fresh isolated database and refuse an unexpected target.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Command transaction

- [ ] Implement reusable idempotency acquisition/result persistence with payload mismatch detection and concurrency handling.
- [ ] Provide transaction hooks for real feature writes, audit/progress and event intent without pretending a synthetic test entity is a shipment.
- [ ] Check: injected failure after each write leaves no partial committed result or event.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Recovery tests

- [ ] Create independent-connection duplicate races and commit-then-lost-response tests with observable barriers.
- [ ] Verify durable results survive API/process restart and old duplicate identities do not become fresh commands after response compaction.
- [ ] Check: no outer rollback transaction hides commit/locking behavior; document test cleanup ownership.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Same scoped ID and payload sent twice | One effective write; both callers recover the same durable result. |
| Same ID with changed payload | Explicit conflict; original result/history preserved. |
| Failure after state write before outbox/result commit | All accepted-change writes roll back. |
| Process dies after commit before response | Retry recovers committed result without a second change. |
| Same textual action ID in another tenant | No result leakage or collision across authorized scopes. |
| Two database connections race | Constraints/locks enforce the invariant; no timing-sleep-only proof. |

## Required verification

- Run command-transaction.test.ts against actual PostgreSQL migrations, including concurrency and fault injection.
- Document test database isolation and startup/shutdown; verify Engine configuration/data remain untouched.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Versioned foundation migrations, transaction/idempotency/audit/outbox primitives and isolated test harness.
- Updated consistency/operations documents with real lock and retention implementation details.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No sender worker, tenant admin UI, shipment state machine, inventory ledger or broad speculative schema.

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

Phase 06 and later commands reuse the proven kernel; they must add real domain assertions rather than assuming generic infrastructure alone proves correctness.

Next numbered prompt: [Phase 06](06-tenant-capabilities-isolation.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

