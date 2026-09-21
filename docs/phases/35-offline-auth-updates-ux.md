# Phase 35 — Safe offline account recovery and application updates

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `xhigh`
- **Why this choice:** Offline account recovery and service-worker updates must preserve queued actions and isolation.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Keep pending work safe through session expiry, deliberate account exit, service-worker updates and local schema upgrades, with understandable driver feedback.

## Prerequisites to verify before editing

Execute after [Phase 34](34-ordered-replay-conflict-recovery.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 07](07-oidc-login-recovery-sessions.md), [Phase 20](20-device-takeover-evidence.md), [Phase 23](23-bounded-driver-corrections.md), [Phase 33](33-offline-local-capture.md), [Phase 34](34-ordered-replay-conflict-recovery.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-05](coverage-matrix.md#r-05), [R-07](coverage-matrix.md#r-07), [R-39](coverage-matrix.md#r-39), [R-40](coverage-matrix.md#r-40), [R-41](coverage-matrix.md#r-41), [R-42](coverage-matrix.md#r-42), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-60](coverage-matrix.md#r-60), [R-65](coverage-matrix.md#r-65).
Decision references: D-10, D-15, D-26, D-27, D-41, D-58, D-60, D-61, D-74, D-76, D-77, D-81, D-83, D-86, D-87, D-106, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md sections 6 and 11; D-27, D-60–D-61, D-76, D-87, D-106.
- Actual Dexie/action/ack schemas, replay coordinator and Keycloak/session behavior.
- 04-login-workspace, 09-sync-conflicts and current driver UI; operations payload compatibility policy.

## Required behavior and invariants

1. Session expiry prompts same-account reauthentication and preserves evidence. Different accounts cannot see or replay each other's cached work.

2. Block deliberate logout/switch while actions are unsynchronized; explain the blocker and recovery path.

3. Once the server durably acknowledges a rejected/review record, account exit may proceed without deleting the unresolved server evidence.

4. Revoked authentication cannot bypass authorization to apply outcomes. If evidence cannot be uploaded, keep it locally with an honest explanation.

5. No forced reload/store clearing with pending actions. Versioned local migrations and server readers must preserve older queued payloads.

6. Roughly 24-hour support is a verification target, not an action deletion timer or guarantee against eviction/device loss.

## Ordered implementation checkpoints

### Checkpoint A — Authentication and exit

- [ ] Connect session expiry/reauth with account-bound replay and safe logout/switch guards.
- [ ] Implement the durable-evidence-received exit path separately from business acceptance.
- [ ] Check: permanently rejected business evidence does not trap the user after safe server retention.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Update compatibility

- [ ] Implement safe service-worker update prompts/activation and Dexie migration strategy with pending-action fixtures.
- [ ] Keep old envelope readers/translation explicitly versioned; never reinterpret an unsupported payload as a new successful action.
- [ ] Check: interrupt an upgrade and reopen with pending actions intact.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Recovery UX

- [ ] Keep normal driver feedback short: saved locally, waiting, confirmed, retryable issue or needs attention.
- [ ] Provide focused review details without technical IDs/revisions in routine copy; preserve form input on navigation.
- [ ] Check: explain phone/storage loss limits and show real available server recovery, not invented reconstruction.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Session expires with pending outcomes | Same-account reauth; no evidence cleared. |
| User switches to another account | Pending gate applies; once allowed, previous account data is not exposed. |
| Server retained a rejected record | Clear permitted exit despite business review still outstanding. |
| New service worker becomes available mid-round | No forced reload or store reset while pending. |
| Old action payload remains after upgrade | Compatible reader/rejection preserves evidence and visible status. |
| Storage is cleared or phone lost | Recover server-received state only; no claim to restore unsent evidence. |

## Required verification

- Run offline-session-update.test.ts with actual auth/queue modules and labelled migration fixtures.
- Run browser install/reopen/update/pending/logout flows; retain Android/Chrome and iPhone/Safari real-device follow-up for Phase 41.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Safe session/account exit, local/schema update behavior and concise recovery UI.
- Compatibility documentation and browser evidence around pending work.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No unauthenticated write bypass, infinite retention promise, raw-request-only Workbox queue or automatic action purge after 24 hours.

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

Reporting distinguishes accepted totals from pending overlays; real-device pilot verifies these same production paths rather than separate demo code.

Next numbered prompt: [Phase 36](36-workday-timing-reports.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

