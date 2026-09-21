# Phase 27 — Native mock ERP commands and source outbox

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** The native ERP source outbox and real two-way journey cross identity, custody and synchronization.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Complete the labelled mock ERP as a real source of provisioning, assignments and branch receipt, with durable pending/accepted/rejected command status.

## Prerequisites to verify before editing

Execute after [Phase 26](26-mock-inbox-projection-recovery.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 08](08-erp-provisioning-actor-binding.md), [Phase 10](10-b2b-intake-admission.md), [Phase 21](21-source-return-receipt.md), [Phase 22](22-branch-interruption-redispatch.md), [Phase 26](26-mock-inbox-projection-recovery.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-02](coverage-matrix.md#r-02), [R-03](coverage-matrix.md#r-03), [R-06](coverage-matrix.md#r-06), [R-09](coverage-matrix.md#r-09), [R-10](coverage-matrix.md#r-10), [R-11](coverage-matrix.md#r-11), [R-32](coverage-matrix.md#r-32), [R-33](coverage-matrix.md#r-33), [R-34](coverage-matrix.md#r-34), [R-36](coverage-matrix.md#r-36), [R-48](coverage-matrix.md#r-48), [R-50](coverage-matrix.md#r-50), [R-51](coverage-matrix.md#r-51), [R-63](coverage-matrix.md#r-63), [R-64](coverage-matrix.md#r-64), [R-65](coverage-matrix.md#r-65).
Decision references: D-01, D-02, D-03, D-07, D-11, D-13, D-14, D-16, D-18, D-21, D-22, D-28, D-32, D-33, D-34, D-38, D-39, D-40, D-42, D-44, D-45, D-52, D-54, D-58, D-59, D-64, D-68, D-76, D-80, D-84, D-85, D-90, D-92, D-95, D-108, D-109, D-110, D-111.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- [ERP handoff deliverables and proof plan](../planning/erp-handoff-deliverables.md); implement this phase's assigned artifacts and public-consumer proof, not the later real ERP.
- master-plan.md sections 5, 6, 12 and 16; D-13, D-14, D-44–D-45, D-84–D-85, D-95.
- Actual provisioning, intake, return/redispatch contracts and generated client.
- Phase 26 separate mock database and Phase 07 separate OIDC client/session setup.

## Required behavior and invariants

1. ERP source changes and outgoing command intent commit together in its own database. Network calls occur afterward.

2. Tawsel acceptance is authoritative for execution; a locally saved source change may still be pending/rejected.

3. Native ERP staff open driver X, see pending return items and confirm actual received subset or separate disposition. No duplicate Tawsel staff receipt screen.

4. Minimal users/roles/branches are administered here using trusted provisioning and inherit/allow/deny; never an unchecked role selector.

5. Preparation, definitive receipt assignment, normal predeparture removal and redispatch use the public APIs and preserve source revisions.

6. The mock is conspicuously labelled, private/test-only and deliberately small. It is not merchant accounting or a real inventory product.

## Ordered implementation checkpoints

### Checkpoint A — Source command durability

- [ ] Add source records, outgoing command outbox, stable IDs/revisions and retry/status persistence to the mock database.
- [ ] Use generated clients and verified service/actor context; recover commit-before-send and lost responses.
- [ ] Check: rejected over-limit assignment does not appear accepted merely because the ERP row saved.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Minimal native screens

- [ ] Implement focused provisioning and task preparation/assignment views with actual OIDC sessions.
- [ ] Implement per-driver pending return list and received-piece/disposition confirmation using real commands.
- [ ] Check: no UI pretends physical return or bypasses departed staff restrictions.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Complete two-way demo

- [ ] Run mock provisioning → prepared → received assignment → Tawsel plan/start/outcome → signed applied projection. Extend tests/erp-conformance/ and docs/erp/consumer-quickstart.md with the actual two-task source-to-receiver setup using portable public client/contract artifacts and separate mock credentials.
- [ ] Exercise subset receipt and a new compatible dispatch cycle, with source/outbound/receiver statuses visible. Complete worked reference-ERP field/status mappings and the integration responsibilities/ordered future ERP implementation slices in docs/erp/ERP-PLANNING-INPUT.md. Leave the unknown real ERP schema/identity choices explicit.
- [ ] Check: disconnect/restart both sides and recover without direct database fixes. Run the documented external-consumer setup independently of Tawsel internal module/database access; record exact commands and outcomes so this is already usable ERP planning input before Phase 42.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Source commits but HTTP is unavailable | Pending command survives process restart and retries with the same ID. |
| Tawsel rejects over-capacity batch | Mock shows rejection; no phantom accepted assignment. |
| Staff tries editing departed shipment | Clear denial; no alternate direct-database path. |
| Only some return pieces physically received | Submit that subset and retain other real statuses. |
| User role exception changes | Native editor sends trusted versioned provisioning; effective access follows server rules. |
| Fault injection used | Development-only controls are labelled and excluded from production user flows. |

## Required verification

- Run mock-source-outbox.test.ts with separate actual databases/API boundary and stable-ID recovery.
- Use browser flows for native administration/assignment/receipt; record a two-task integration demo and schema-valid messages.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Minimal native mock ERP, durable source outbox and accurate command/projection status.
- Reproducible B2B demonstration and concrete integration guide examples.
- Completed two-way consumer quickstart/conformance checks, worked field/status mapping and substantive ERP planning input. Update docs/erp/README.md with actual artifact paths and evidence; do not build the commercial ERP.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No real shipping ERP, warehouse valuation, settlement, arbitrary staff outcome correction or public demo with production data.

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

Online journey phases can use genuine mock-supplied work; final ERP handoff describes this verified contract rather than promising a drop-in production connector.

Next numbered prompt: [Phase 28](28-online-preparation-journeys.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

