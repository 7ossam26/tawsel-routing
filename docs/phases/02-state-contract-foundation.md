# Phase 02 — State vocabulary and canonical contract foundation

Package revision 3 · D-109–D-111, amended by D-112 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Shared identities, state transitions and compatibility affect every later API and ERP integration.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Define the shared state and protocol language before feature implementation. Establish validated common schemas and an exhaustive operation inventory; each later feature phase completes its own operation schemas before implementing them.

## Prerequisites to verify before editing

Execute after [Phase 01](01-workspace-test-harness.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 01](01-workspace-test-harness.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-63](coverage-matrix.md#r-63), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-11, D-13, D-28, D-38, D-54, D-64, D-76, D-108, D-109, D-110, D-111, D-112.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md sections 5–15 and 18–20, including quantities, revisions and evidence states.
- TAWSEL-DISCOVERY-LOG.md current synthesis and D-64–D-112, especially the later overrides.
- Phase 01 workspace/config/test commands; existing docs/phases/coverage-matrix.md and decision-map.md.

## Required behavior and invariants

1. A task, dispatch cycle, workday, round, plan revision and attempt are different identities. One shipment at the same address as another is still independent.

2. Prepared is not received. Next planned is not heading. Arrival is explicit. Return-required is not branch-received; evidence-received is not business-accepted or ERP-applied.

3. Keep route revision, assignment generation, device generation, schema version and recipient event sequence distinct.

4. Each accepted command must commit state, progress, audit, idempotency result and required outbound intent together. Provider HTTP calls stay outside that transaction.

5. Use UUIDs, scoped source references, whole-piece quantities, integer minor-unit money/currency and separate observed/received/committed timestamps.

6. Do not publish invented working endpoints. Unimplemented operation families must be marked designed, with an assigned future owner phase.

7. Make the public integration boundary ERP-agnostic. Model generic delivery concepts—stable external task/order references, customer/contact and location snapshots, delivery requirements, optional time windows/service duration/priority, and Tawsel task/trip/assignment/execution resources—with explicit versions, revisions, idempotency and webhook events. Do not copy a specific ERP schema into Tawsel core or require ERP source/database access.

## Ordered implementation checkpoints

### Checkpoint A — State model

- [ ] Write docs/tracking-and-consistency.md with actor/state/action tables and explicit invariants for all domain records.
- [ ] Describe departure locking, current protection, branch interruption, dependency-bound corrections and old-device evidence without inventing new authority.
- [ ] Check: walk the two-of-three-piece example from intake through correction/return using distinct identities.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Schema tooling

- [ ] Create valid OpenAPI 3.1/common JSON Schemas for IDs, money, action envelopes, errors, versions and evidence statuses.
- [ ] Create versioned event envelope schemas and valid/invalid examples; configure the correct validator dialect and generated client/reference tooling.
- [ ] Check: Vitest validates real references/examples and rejects bad quantities, money formats and envelope versions.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Operation ownership

- [ ] Inventory every HTTP/event family in docs/contract-coverage.md with stable operation identifiers, lifecycle and the owning phase.
- [ ] Document source provisioning, signed delivery, compatibility, replay retention and old queued-payload obligations in the initial integration guide. Create docs/erp/README.md, docs/erp/ERP-PLANNING-INPUT.md and docs/erp/field-and-status-mapping.md with meaningful designed responsibilities, identities/state ownership, known constraints, explicit unknown real-ERP choices and phase owners. Record that connector ownership may be the ERP vendor/agency, Tawsel or both, and that integration feasibility begins with discovery of the ERP's supported API/webhook/authentication/stable-ID/import-export mechanisms. Mark all unimplemented contracts honestly.
- [ ] Check: every required action maps to an operation/event or explicit local-only UI action; no family is hidden as generic CRUD.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Same action ID with different payload | Contract describes conflict, never a second accepted business change. |
| Route changes but assignment/attempt remains compatible | Model permits validation of the outcome without blanket route-version rejection. |
| Return request created | No schema example claims receipt or available stock. |
| A newer progress snapshot exists | Required business transitions still have separate event identities. |
| An API is only specified | Coverage marks it designed; generated documentation must not imply availability. |
| A future payload field evolves | Compatibility/version policy explains old offline actions rather than discarding them. |

## Required verification

- Create and run contract-foundation.test.ts for schema/reference/example validation and deterministic generated output.
- Review every master-plan operation family against the catalog; record unresolved concrete contradictions separately from routine naming choices.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Canonical common schemas, envelopes, examples, client/reference tooling and operation inventory.
- Substantive state/consistency and integration documents; exact feature schemas are completed in their owning phases.
- The ERP start-here index, planning input and field/status mapping foundation described in the handoff deliverables plan. These reference canonical contracts and do not pretend to specify the full future ERP.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

Do not implement business handlers, a giant database schema or all UI routes here. Do not turn every future operation into a stub returning success. Do not introduce ERP-specific domain models, direct ERP database access or a claim of automatic compatibility with every ERP.

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

Phase 03 gets stable terminology; feature phases must replace their designed operations with validated schemas and real implementations in place.

Next numbered prompt: [Phase 03](03-design-action-specification.md). State the exact verified artifacts it may rely on. Do not execute it in this task.
