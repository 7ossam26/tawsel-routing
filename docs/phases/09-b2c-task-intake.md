# Phase 09 — Independent-driver task intake

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Why this choice:** A focused B2C intake flow with established persistence, validation and access primitives.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

An independent driver can create, inspect and correct their own simple tasks through real persistence and a small usable entry form.

## Prerequisites to verify before editing

Execute after [Phase 08](08-erp-provisioning-actor-binding.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 06](06-tenant-capabilities-isolation.md), [Phase 07](07-oidc-login-recovery-sessions.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-05](coverage-matrix.md#r-05), [R-14](coverage-matrix.md#r-14), [R-15](coverage-matrix.md#r-15), [R-57](coverage-matrix.md#r-57), [R-63](coverage-matrix.md#r-63), [R-65](coverage-matrix.md#r-65).
Decision references: D-11, D-15, D-26, D-27, D-28, D-38, D-41, D-53, D-54, D-56, D-58, D-64, D-76, D-89, D-99, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 2, 5, 7–9 and 16; D-15, D-26, D-53, D-54, D-56, D-89, D-99.
- DESIGN.md and docs/ui-spec.md B2C entry/action map; adapt 06-route-preparation and 07-location-review visual language.
- Phase 06 access guards, Phase 07 session and Phase 05 command kernel.

## Required behavior and invariants

1. Require recipient name and phone; collect a written address or explicitly confirmed pin. Preserve original input independently from later execution location.

2. Allow the simple optional collection amount, with currency/minor-unit validation. No item prices, pieces, split delivery or branch custody for B2C.

3. Two shipments to the same person/place remain separate tasks with independent outcomes.

4. A written address awaiting resolution may be stored visibly, but does not become an executable route stop until a usable destination is confirmed.

5. The driver owns only their personal tenant's work. Switching from a company account does not import company tasks.

6. Keep entry fast: essential fields first, contextual error near the field, no mandatory commercial/warehouse information.

## Ordered implementation checkpoints

### Checkpoint A — Contract and task data

- [ ] Finalize B2C create/read/update schemas and add task/source-address/optional-amount migrations.
- [ ] Use scoped IDs and the command kernel; define editable predeparture fields and a reusable guard for later departure locking.
- [ ] Check: invalid phones/amounts and company-scoped IDs cannot produce a valid independent task.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Simple entry UI

- [ ] Connect a focused Arabic form/list to real APIs, preserving input during error/back navigation.
- [ ] Support address input and a confirmed-coordinate contract; use the real map picker from Phase 11 when available rather than a fake map now.
- [ ] Check: save, reload and edit show actual persisted data; unresolved location is clearly labelled.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Integration verification

- [ ] Create b2c-intake.test.ts through real handlers/database, covering duplicate retries and same-address independence.
- [ ] Update UI/operation coverage and provide a reproducible two-task creation demo.
- [ ] Check: another account cannot read or mutate the tasks, including guessed IDs.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Phone missing or invalid | Clear validation; no accepted incomplete task. |
| Optional amount omitted | No invented B2B fee/item model; accepted simple task. |
| Two tasks share one address | Both retain separate IDs and independent data. |
| Address unresolved | Task remains visible with a location requirement; not execution-ready. |
| Save response lost | Same action ID recovers one task instead of creating a duplicate. |
| Company account attempts personal task endpoint | Product/tenant boundary is enforced by the server. |

## Required verification

- Run real API/PostgreSQL intake tests and component/client tests for retained input and missing fields.
- Use a browser to create/reload two real tasks; label map selection unavailable until Phase 11 rather than simulating success.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Persisted B2C intake APIs and focused entry/list UI with schema-valid examples.
- Meaningful tests and explicit location-readiness state.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No B2C partial delivery, inventory, returns, billing, map-link importer or route optimization in this phase.

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

Phase 11 resolves/confirms locations; Phases 13–15 plan and start these exact persisted tasks.

Next numbered prompt: [Phase 10](10-b2b-intake-admission.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

