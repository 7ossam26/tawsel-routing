# Phase 07 — Real login, recovery and separate sessions

Package revision 3 · D-109–D-111 · Implementation not started at preparation time.
Copy this entire file as the task prompt in the Tawsel repository.

## Codex model for this phase

- **Model:** `gpt-6-astra`
- **Reasoning effort:** `high`
- **Why this choice:** Real OIDC recovery and separate sessions must agree with application authorization.

Set the model/effort in the Codex picker before running this prompt; text in a prompt does not switch the active model. This is a workload recommendation under D-110, not a correctness guarantee. Record the actual setting used; if unavailable, consult the [model selection guide](model-selection.md). Tests and acceptance evidence remain required.

## Concrete outcome

Connect the themed login/account shell to a real local identity issuer and application sessions for separate company and independent accounts.

## Prerequisites to verify before editing

Execute after [Phase 06](06-tenant-capabilities-isolation.md). All earlier completed work stays available; do not start from an empty scaffold.

Direct technical inputs: [Phase 04](04-representative-ui-review.md), [Phase 05](05-postgres-atomic-command-kernel.md), [Phase 06](06-tenant-capabilities-isolation.md).
Inspect their real artifacts and run the relevant prerequisite check. Do not infer availability from a document title or checked status row.
Repair a small prerequisite defect needed here and record it. A material missing prerequisite prevents dependent work; continue independent work without inventing success.

Requirements assigned here: [R-05](coverage-matrix.md#r-05), [R-06](coverage-matrix.md#r-06), [R-07](coverage-matrix.md#r-07), [R-41](coverage-matrix.md#r-41), [R-56](coverage-matrix.md#r-56), [R-57](coverage-matrix.md#r-57), [R-59](coverage-matrix.md#r-59), [R-60](coverage-matrix.md#r-60), [R-65](coverage-matrix.md#r-65).
Decision references: D-01, D-15, D-26, D-27, D-41, D-58, D-61, D-74, D-76, D-77, D-83, D-84, D-86, D-103, D-104, D-106, D-107, D-108, D-109, D-110.
Use the [decision map](decision-map.md) for later amendments; older answers may have been explicitly replaced.

## Sources to read

- master-plan.md section 6; D-27, D-58, D-61, D-74, D-83, D-84.
- DESIGN.md, docs/ui-spec.md login/account states, original 04-login-workspace source/image.
- Phase 06 membership guards and Phase 05 database; actual supported Keycloak/OIDC documentation when configuring.

## Required behavior and invariants

1. Company entry is company code then username/password through the shared credential authority. Company selection is not an access grant.

2. B2C login is normalized phone/password; verified email is for recovery, not the login identifier or proof of SMS phone ownership.

3. Company and personal accounts/sessions remain separate even when contact details match. Do not silently link them.

4. Use authorization code with PKCE, state/nonce validation, restricted redirects, secure HttpOnly cookies and server-side refresh.

5. ERP and Tawsel use distinct clients/sessions. Normal driver commands must not depend on a live ERP request or copied password hashes.

6. A session error must not erase future local evidence. Actual queue-aware logout blocking is completed in Phase 35.

## Ordered implementation checkpoints

### Checkpoint A — Issuer and protocol

- [ ] Configure reproducible local issuer/client setup with non-secret checked-in configuration and a local email sink.
- [ ] Implement callback/session/context/logout endpoints with CSRF, rate limits and safe error handling; never use password grant.
- [ ] Check: one actual local OIDC round trip creates a session bound to Phase 06 access.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint B — Account journeys

- [ ] Connect company-code entry and B2C registration/phone login/recovery using the existing simple themed components.
- [ ] Apply the documented verified-email activation baseline; label local captured email as local evidence.
- [ ] Check: separate identities do not inherit each other's membership or account-local state.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

### Checkpoint C — Expiry and denial

- [ ] Implement refresh/expiry/revocation behavior, disabled membership feedback and same-account reauthentication intent.
- [ ] Write clear user-facing recovery errors without exposing whether unrelated private accounts exist.
- [ ] Check: callback replay, wrong nonce/redirect and invalid CSRF fail; a revoked online user cannot act.

Before continuing, record what changed, the focused result and any unresolved dependency in the phase evidence.

## Acceptance scenarios

Implement and verify these concrete behaviors, plus the relevant canonical invariants. This table is not a substitute for real tests.

| Given / when | Required observable result |
| --- | --- |
| Company code exists, user lacks membership | No company access granted. |
| B2C recovery email used | Recovery succeeds under issuer policy; it does not change login to email. |
| Session expires | Reauthentication path preserves account context rather than clearing future pending data. |
| ERP is unavailable after login | Session-authorized Tawsel operations do not call ERP for each action. |
| Callback replay or redirect manipulation | Rejected without creating a second unauthorized session. |
| Recovery tested only through local sink | Report local success and production-email verification as outstanding. |

## Required verification

- Run session/auth-handler Vitest integration tests with real application database; identify issuer fixtures separately.
- Run real browser login, logout, recovery and denied-account flows; check RTL/focus/error clarity and one real local issuer round trip.

A test must fail if its stated invariant is broken. Database/worker guarantees cannot be established by mocking away the transaction.
For UI work, capture actual interaction/render findings and identify fixture versus real API evidence.
If an external service/device check is unavailable, report the exact gap and its effect; do not substitute a passing stub.

## Required deliverables

- Real identity/session implementation, connected account UI, issuer config and safe environment documentation.
- Schema-valid session/account endpoints and recorded local login/recovery evidence.
- Updated canonical operation/schema/example/client references affected by this work.
- A dated entry in docs/implementation-status.md with checkpoint evidence, focused commands/results and actual remaining limits.
- A reproducible demonstration of this phase's concrete outcome.

## Scope boundary

No SMS provider, billing activation, password-hash copying, real ERP identity migration or claimed production email delivery.

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

Phase 08 can authenticate provisioning actors; later PWA work adds durable queue-aware account exit without redesigning identity.

Next numbered prompt: [Phase 08](08-erp-provisioning-actor-binding.md). State the exact verified artifacts it may rely on. Do not execute it in this task.

