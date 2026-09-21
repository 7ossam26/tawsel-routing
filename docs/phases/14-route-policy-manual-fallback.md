# Phase 14 — Urgent-first route policy and manual fallback

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Urgent ordering, current-stop protection and manual fallback must preserve all route constraints.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Validate complete routes against product rules and provide honest manual operation when optimization is unavailable or incomplete.

## Prerequisites to verify before editing

Execute after [Phase 13](13-planning-jobs-forecast-storage.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 10](10-b2b-intake-admission.md), [Phase 12](12-engine-profile-adapters.md), [Phase 13](13-planning-jobs-forecast-storage.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-13](coverage-matrix.md#r-13), [R-14](coverage-matrix.md#r-14), [R-21](coverage-matrix.md#r-21), [R-23](coverage-matrix.md#r-23), [R-24](coverage-matrix.md#r-24), [R-25](coverage-matrix.md#r-25), [R-26](coverage-matrix.md#r-26), [R-28](coverage-matrix.md#r-28), [R-58](coverage-matrix.md#r-58), [R-65](coverage-matrix.md#r-65).
Decision references: D-05, D-06, D-09, D-19, D-20, D-29, D-37, D-39, D-49, D-56, D-57, D-66, D-69, D-70, D-71, D-82, D-94, D-97, D-98, D-101, D-105, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 7 and 9; D-19, D-37, D-66, D-69–D-72, D-94, D-98, D-101.
- Phase 13 job/forecast/input-revision implementation and Phase 12 provider conversion.
- State specification for protected current prefix, future eligibility and full-capacity branch interruption.

## Required behavior and invariants

1. Finish the explicitly current target, then eligible urgent work before ordinary work; optimize within groups. VROOM priority alone does not meet this requirement.

2. Honor earliest date/time; urgency cannot activate prepared, unresolved, future-deferred or return-required partial remnants.

3. Reconcile every requested task ID and validate the stitched route's endpoints, timing, capacity and unassigned list.

4. Default endpoint is last customer; explicit branch visits and B2C fixed endpoint are inputs. Completion is an estimate without a hard shift-end cutoff.

5. If Engine fails, retain a valid remaining order or allow an explicit eligible manual first route. Do not claim optimized distance/road geometry that was not computed.

6. A later explicit manual decision supersedes older optimizer results; current selection remains protected.

## Ordered implementation checkpoints

### Checkpoint A — Ordering algorithm

- [ ] Implement current-prefix and urgent/ordinary grouping with a common time origin and propagated segment location/time.
- [ ] Validate the complete assembled route, not each segment in isolation; preserve forecast waiting/service distinctions.
- [ ] Check: a future urgent task stays ineligible and an unreachable urgent task is an explicit exception.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Complete result validator

- [ ] Validate requested/returned/unassigned IDs, coordinate/profile units, endpoints, earliest availability and remaining-stop limit.
- [ ] Represent full, partial, invalid and dependency-failed results distinctly; valid tasks are not silently dropped.
- [ ] Check: intentionally malformed, duplicated or omitted provider jobs cannot become a ready complete plan.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Manual behavior

- [ ] Implement revisioned manual plan/order/select contracts and persistence using the same eligibility/capacity constraints.
- [ ] Retain last valid sequence on failure and mark planning pending/manual; do not invent a road route.
- [ ] Check: stale optimizer completion cannot erase a newer manual decision.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Current ordinary stop plus eligible urgent stops | Current stays first; eligible urgents follow before other ordinary stops. |
| Urgent task has a future earliest time | It does not jump into an executable present sequence. |
| Provider omits one task without explanation | Validation fails rather than declaring full success. |
| Engine offline before first route | Manual eligible plan can be prepared; online server-confirmed start is still required later. |
| Explicit fixed endpoint selected | Whole route validates that endpoint and timing. |
| Route contains two same-address shipments | Both remain distinct stops/tasks in business accounting. |

## Required verification

- Extend planning-publication.test.ts with group ordering, earliest/current/end protection, malformed results and manual-vs-async races.
- Run a small live profile scenario separately where available; label the policy a heuristic rather than a global-optimality guarantee.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Validated route policy, explicit partial/error models and usable manual plan APIs.
- Concrete ordering/failure examples and complete route-validation tests.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No hard shift cutoff, automatic over-limit split, GPS, fleet allocation or artificial optimized-success state.

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

Phase 15 can start only a currently valid ready/manual plan; later execution actions trigger replanning through this same policy.

Next numbered prompt: [Phase 15](15-round-start-departure-lock.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

