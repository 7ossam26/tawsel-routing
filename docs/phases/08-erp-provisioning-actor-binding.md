# Phase 08 — ERP provisioning and verified actor context

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Provisioning and verified service/actor binding define the trust boundary with an external ERP.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Provide a versioned, authenticated boundary for ERP-owned branches, users, roles and driver references, without allowing a service credential to impersonate arbitrary staff.

## Prerequisites to verify before editing

Execute after [Phase 07](07-oidc-login-recovery-sessions.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 02](02-state-contract-foundation.md), [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 06](06-tenant-capabilities-isolation.md), [Phase 07](07-oidc-login-recovery-sessions.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-01](coverage-matrix.md#r-01), [R-02](coverage-matrix.md#r-02), [R-03](coverage-matrix.md#r-03), [R-04](coverage-matrix.md#r-04), [R-06](coverage-matrix.md#r-06), [R-34](coverage-matrix.md#r-34), [R-43](coverage-matrix.md#r-43), [R-50](coverage-matrix.md#r-50), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-01, D-02, D-03, D-04, D-13, D-14, D-15, D-16, D-17, D-25, D-27, D-44, D-58, D-59, D-84, D-90, D-95, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md sections 5–6, 12–13; D-01, D-14, D-59, D-84, D-90.
- docs/integration-guide.md and Phase 06 capabilities; Phase 07 actual issuer/client setup.
- Canonical provisioning operations and action/idempotency contracts.

## Required behavior and invariants

1. Company administration stays in ERP. Tawsel accepts validated projections/references and enforces its execution rules.

2. A service credential is scoped to a tenant/integration. A raw actor_id string is not verified delegated authority.

3. One role per user, inherit/allow/deny exceptions and branch assignments must preserve the Phase 06 semantics.

4. Provisioning retries are idempotent, versioned and audited; stale source updates cannot resurrect disabled access.

5. Create only minimal execution-driver/vehicle references, not fleet maintenance or commercial customer records.

6. Issuer-side effects are external calls: model pending/retry reconciliation explicitly instead of pretending application and issuer commits are one transaction.

## Ordered implementation checkpoints

### Checkpoint A — Contract and trusted identity

- [ ] Finalize provisioning schemas, source revisions, source-to-subject references and verified actor/service fields.
- [ ] Implement scoped credentials and bound delegated assertions or an explicitly permitted service operation, recording both actor and service.
- [ ] Check: forged actor IDs and credentials from another integration cannot gain authority.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Versioned provisioning

- [ ] Implement branch/user/role/exception/driver-reference commands using the atomic command kernel.
- [ ] Reconcile issuer provisioning/configuration outside business transactions with durable status and retries where needed.
- [ ] Check: duplicate/stale commands and issuer failure leave honest, recoverable state.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Reproducible fixture setup

- [ ] Provide a documented CLI/fixture path for a company, two branches, configurable role, explicit exception and two drivers.
- [ ] Update generated client/examples and integration guide with bootstrap, rotation, disable and recovery semantics.
- [ ] Check: the actual login session reflects a provisioned role change or disabled membership.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Same source revision submitted twice | One effective projection and stable command result. |
| Old revision arrives after disable | User is not silently re-enabled. |
| Caller changes actor_id to a privileged user | Rejected unless the assertion/delegation is genuinely verified. |
| Role permissions change | Inherited access changes; explicit exceptions persist. |
| Issuer call fails after local intent commit | Pending/retry is visible; no false account-ready response. |
| Different company uses the same external reference | Records remain tenant/integration scoped. |

## Required verification

- Run provisioning-actor.test.ts and extend authorization-isolation.test.ts against actual API/database and issuer fixtures.
- Demonstrate provision → login → authorized read → role/disable change → effective denial; record live versus simulated issuer evidence.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Complete the identity/provisioning portion of docs/erp/field-and-status-mapping.md and docs/erp/ERP-PLANNING-INPUT.md: tenant/source/branch/user/actor/driver identifiers, trusted identity setup, role authority, version conflicts and actual valid/denied examples.
- Versioned provisioning APIs, safe setup tooling, actor-binding implementation and client examples.
- Durable provisioning status where external identity actions require it.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No duplicate Tawsel company admin UI or real ERP build. Native mock administration arrives in Phase 27.

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

Intake can trust tenant/source/driver identities; Phase 27 implements an external native UI over this same contract.

Next numbered prompt: [Phase 09](09-b2c-task-intake.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

