# Phase 06 — Tenant, branch and capability enforcement

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Tenant, branch, driver and integration isolation require reasoning across reads and writes.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Enforce access as a server rule with real database tests. Establish the reusable authorization model before identity provisioning and resource APIs depend on it.

## Prerequisites to verify before editing

Execute after [Phase 05](05-postgres-atomic-command-kernel.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 02](02-state-contract-foundation.md), [Phase 05](05-postgres-atomic-command-kernel.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-01](coverage-matrix.md#r-01), [R-03](coverage-matrix.md#r-03), [R-04](coverage-matrix.md#r-04), [R-43](coverage-matrix.md#r-43), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65).
Decision references: D-02, D-03, D-04, D-15, D-16, D-17, D-25, D-27, D-59, D-90, D-105, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md section 5 and discovery D-01–D-04, D-16, D-25, D-59, D-90, D-91, D-95.
- Phase 02 capability/state specification and Phase 05 schema/transaction primitives.
- contracts operation inventory; distinguish authentication subjects from business membership.

## Required behavior and invariants

1. Each company is a tenant; an independent account has a separate personal tenant. Body/query tenant IDs cannot expand authenticated scope.

2. One configurable role per company user. Direct inherit/allow/deny overrides the inherited role value.

3. A user's effective capabilities are identical across their assigned branches; branch/resource membership still limits which records they can use.

4. Role names confer no special powers. A broad capability cannot bypass a forbidden lifecycle transition or cross-tenant relation.

5. Own-driver restrictions, tenant scope, branch scope and integration visibility are separate predicates, all enforced where applicable.

6. ERP remains the company administration surface. This phase supplies the model, not a duplicate role editor.

## Ordered implementation checkpoints

### Checkpoint A — Membership schema

- [ ] Add tenants, stable identity-subject links, branches, membership, roles/capabilities and explicit user exceptions.
- [ ] Use scoped keys/foreign keys so an authorized row cannot accidentally reference another tenant's branch or driver.
- [ ] Check: invalid cross-tenant relationships fail at the database boundary.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Effective access

- [ ] Implement capability resolution and reusable resource guards for handlers, reads, workers and future export jobs.
- [ ] Use labelled authenticated-principal test fixtures until real OIDC arrives; do not ship a production header that lets callers pick identities.
- [ ] Check: changing a role updates inherited access, while direct deny/allow remains explicit.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Isolation evidence

- [ ] Create authorization-isolation.test.ts with two tenants, two branches, separate drivers and separate integrations.
- [ ] Test operation denial as well as read filtering, including forged body scope and disabled membership.
- [ ] Check: explain the denial without leaking the hidden resource; document the guard inputs for later phases.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Role grants, user explicitly denies | Operation denied within all assigned branches. |
| Role denies, user explicitly allows | Capability allowed only within permitted resources and lifecycle. |
| User has two branches | Same effective capabilities; no access to a third branch. |
| Role label is Admin but lacks capability | Label alone grants nothing. |
| Integration requests another source's record | Denied even if both tasks are in a shared driver trip. |
| Background job or export receives forged scope | Guard derives trusted scope and rejects expansion. |

## Required verification

- Run real PostgreSQL authorization tests and migration checks; no in-memory substitute for relationship constraints.
- Document how every later handler/query will apply capability and resource/lifecycle predicates together.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Membership/capability schema, effective-access service and reusable guards.
- Runnable authorization-isolation.test.ts and updated permission contract table.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No password system, OIDC login, company admin UI or shipment command implementation. Do not restore postdeparture staff overrides.

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

Phase 07 binds actual authenticated subjects to this model; Phase 08 exposes trusted ERP provisioning.

Next numbered prompt: [Phase 07](07-oidc-login-recovery-sessions.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

