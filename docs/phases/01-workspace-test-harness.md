# Phase 01 — Runnable workspace and test harness

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-5.6-sol`
- **Reasoning effort:** `high`
- **Why this choice:** Bounded workspace, package scripts and test setup with a concrete runnable result.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

A new agent can install, start and check the web/API workspace without touching the existing Engine. This phase establishes reliable commands, not a delivery application.

## Prerequisites to verify before editing

No earlier application phase. Inspect the existing repository and historical context first.

Direct technical inputs: existing Engine repository and planning documents.
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-56](coverage-matrix.md#r-56), [R-58](coverage-matrix.md#r-58), [R-60](coverage-matrix.md#r-60), [R-65](coverage-matrix.md#r-65).
Decision references: D-77, D-86, D-103, D-104, D-105, D-107, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 1–4, 17–19; current repository README and .gitignore.
- STACK-CONTEXT.md, TAWSEL-ENGINE-CONTEXT.md and docs/planning/repository-and-ui-assessment.md: distinguish historical runtime results from this checkout.
- docker-compose.yml, setup.ps1, profiles/motorcycle.lua and vroom-conf/config.yml; inspect existing paths and ports before adding local services.

## Required behavior and invariants

1. Keep the existing Engine tree and its normal workflow intact. A new local application configuration must not silently reuse or reset Engine databases/volumes.

2. Use one TypeScript workspace with clear web/API/shared boundaries. Add worker/mock packages only when they gain a runnable responsibility.

3. The frontend shell is RTL and Arabic-ready, but the final theme is Phase 03. No prototype timers or fake domain endpoints in production.

4. Vitest needs separate fast and integration selections plus documented watch/CI commands. A configuration file with no meaningful exercised boundary is insufficient.

5. Choose supported compatible Node, package manager and package versions; commit a reproducible lockfile and record why those versions work together.

## Ordered implementation checkpoints

### Checkpoint A — Workspace boot

- [ ] Create runnable web and Fastify API entry points, shared TypeScript configuration and minimal environment parsing.
- [ ] Reject missing or malformed required configuration with a clear startup error; provide safe example values.
- [ ] Check: clean install and both processes start through documented commands.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Testing and build

- [ ] Add real Vitest tests for API startup/config validation and the HTTP health response using actual handlers.
- [ ] Configure typecheck/build/lint and test commands without making external Engine availability a unit-test prerequisite.
- [ ] Check: a deliberately invalid configuration fails for the intended reason; the valid startup test passes.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Reproducible setup

- [ ] Add CI for the checks available now, local setup/stop instructions and a substantive initial docs/operations.md.
- [ ] Document database/identity/worker services as future additions, not running capabilities; no empty business modules.
- [ ] Check: rerun setup from a clean dependency state in an isolated checkout/environment without deleting user files.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Required configuration absent | Startup fails clearly; no fallback to a production secret or unrelated database. |
| Web and API started | The shell and real health route respond; no delivery capability is claimed. |
| Engine unavailable | Workspace checks still run; they do not report a routing success. |
| Developer runs tests | Fast suite and CI run are discoverable and return meaningful exit status. |
| Application setup repeated | Existing Engine paths, data and unrelated work remain unchanged. |
| Invalid request to health/server boundary | Stable validation/error behavior is exercised without a fake repository. |

## Required verification

- Run installation, typecheck, build and the focused Vitest suite; record exact runtime/package versions and commands.
- Inspect diffs for accidental Engine configuration, export or secret changes. Git checks do not cover untracked file content automatically.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Runnable workspace, lockfile, safe environment example and CI/check scripts.
- README and initial operations instructions with observed setup results.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

Do not add full identity, application migrations, routing adapters, domain APIs, complete contracts or production deployment.

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

Phase 02 receives verified workspace commands and actual module paths, so its schema tooling can run immediately.

Next numbered prompt: [Phase 02](02-state-contract-foundation.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

