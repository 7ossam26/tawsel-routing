**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 09 — Offline PWA, replay and device recovery

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03, Phase 04, Phase 05, Phase 06, Phase 07, Phase 08. Master-plan focus: sections 6–7, 10–14, 16, 18 groups H/I/L/N/P.

## Working rules for this phase

Execute only this phase in the existing tawsel-routing repository. Read applicable AGENTS.md files, inspect the current checkout/working tree and record HEAD before editing. Preserve unrelated work, original stitch-export assets, Engine datasets/volumes and working paths. Earlier implementation may differ from proposed paths: follow verified repository conventions and update references coherently. Do not restart the project or run OSM imports/preprocessing as application setup.

Read master-plan.md, the current summaries and latest decisions in TAWSEL-DISCOVERY-LOG.md, docs/phases/README.md, docs/phases/coverage-matrix.md, and docs/implementation-status.md. Read the phase-specific sources below. Repository documents are the complete handoff; do not rely on chat memory. Prerequisites mean verified earlier outputs, not merely a completed checkbox. Repair small prerequisite defects needed here and record them; identify material scope contradictions instead of inventing business rules.

The selected stack is React/TypeScript/Vite, shadcn/ui + Smooth UI, Node/Fastify, PostgreSQL, OIDC/Keycloak and MapLibre/PMTiles. Use Vitest for meaningful connected tests and Playwright for browser/PWA/visual evidence. Pin mutually supported versions using current primary documentation when necessary; do not treat a documentation minimum or latest tag as deployment verification.

Business authority comes from the agreed requirements. Stitch screens supply visual layout/design-system references only. Add/remove/adapt controls accordingly. Driver pages must clearly explain purpose, next action, missing input and waiting state, with one dominant stage action and discoverable relevant supporting controls. Use focused pages/sheets without nested modals or repeated routine confirmations. Keep Arabic RTL, Cairo, the chosen visual language, accessibility and reduced motion coherent.

Preserve the scope: separate B2C/company accounts; B2C has no item splitting, branch custody or billing. ERP owns commercial data and initial assignment; general staff edits stop after departure, including urgency. Driver execution and narrow actual source-branch receipt/disposition exceptions remain. One active round/device execution owner; every new round starts online after sync. Already-started work supports the offline target. No GPS, call counters, global fleet allocation, incentives, advanced POD or real shipping ERP.

Every accepted business change must preserve authorization, relevant revisions, idempotency, coherent progress, audit and outbound intent transactionally. External calls stay outside long transactions. Never report simulated success as a real commit, event application or device result. Do not erase unresolved evidence or bypass isolation to make a demo pass.

## Completion and handoff

Complete the concrete deliverables and focused checks below; do not create empty placeholders or pass-only tests. Update affected canonical contracts/examples/docs as behavior evolves and detect drift. Record exact commands, versions and passed/failed/unrun checks in docs/implementation-status.md, with the reason and practical impact of unavailable checks. Keep designed, implemented, verified and owner-reviewed states distinct.

Present the concrete result, a reproducible verification/demo path, known limitations and the next numbered phase. For UI work, include browser screenshots/interaction findings and recorded additions/removals from the visual references; a successful build is not visual or simplicity evidence. Do not claim deployment or owner approval that did not occur. Stop after this assigned phase; do not launch another phase, publish, commit or push merely because this prompt exists.

## Objective and prerequisites

Make the already connected application a dependable offline-capable PWA for previously started downloaded work, with durable evidence/replay and explicit ownership conflict recovery. Verify Phases 01–08 and actual action/device/idempotency APIs; do not implement a separate competing state machine.

## Read and inspect

Read master-plan sections 6, 10–12, docs/tracking-and-consistency.md offline/ownership/action dependency rules, canonical sync/evidence/correction contracts, and operations update/compatibility boundaries. Read DESIGN.md and docs/ui-spec.md Driver simplicity / State copy and feedback / Routes and actions / Components and overlays / Visual acceptance.

Inspect stitch-export/screens/01-active-driver-trip and stitch-export/screens/02-stop-details (screen.jpg and source files), plus stitch-export/screens/04-login-workspace, stitch-export/screens/05-driver-daily-trips, stitch-export/screens/08-trip-completion and stitch-export/screens/09-sync-conflicts (screen.png, code.html, metadata.json). Remove their simulated sync/security/GPS assumptions.

## Implementation tasks

1. Implement Workbox shell/static asset precaching and Dexie versioned stores partitioned by account/tenant/device ownership. Cache only authorized required work, maps/geometry with explicit coverage limits and self-hosted assets. Request persistence, detect quota/write failure and provide usable data/list fallback without claiming guaranteed eviction resistance.
2. Write each stable action envelope and pending local projection atomically before showing saved-on-phone. Preserve IDs, device generation, relevant resource versions, action dependencies, schema version and capture-time quality. Keep confirmed server state separate from local pending effects. A local write failure must not display saved success.
3. Replay in dependency order on reconnect/foreground/reopen/manual retry, with controlled optional background assistance. Coordinate same-device tabs; server idempotency remains authoritative. Durably save acknowledgement before dropping a pending action. Resolve predecessor results/version bindings without rewriting history or assigning a new ID to a retry.
4. Complete server batch/evidence/status endpoints with per-action outcomes. Compatible route reorder does not by itself reject a task outcome. Incompatible owner/assignment/receipt/closure changes cannot be ignored. Persist received rejected/review evidence separately from business acceptance; no blanket client-time last-write-wins.
5. Enforce synchronized online start for every new round and reopen/continue only downloaded already-started work offline. Preserve pending day-end and require synchronization before a later round. Online second-phone takeover increments ownership; former-phone evidence survives but needs explicit current-driver validated adoption/correction within the approved dependency bounds.
6. Implement same-account reauthentication without clearing queues, deliberate logout/switch blocking while unsynchronized, and a clear exit after server-durable evidence acknowledgement even when a business rejection remains. If authentication is unavailable/revoked, preserve evidence without an unauthenticated state-change bypass. Never reveal another account's cache after switching.
7. Make sync/conflict UI concise: saved locally, server confirmed, waiting, retryable problem or action needing attention. Driver pages do not force opening technical diagnostics after each delivery. Explain the current blocker and permitted action; prevent duplicate taps without hiding recovery. ERP application lag remains distinct from Tawsel acceptance.
8. Implement safe service-worker updates and Dexie migrations with old queued-payload compatibility. No forced reload/store clearing while pending. Preserve input during modal navigation, refresh and update interruption. Document storage loss/phone loss limitations and recovery.
9. Extend integration/operations/UI docs with actual queue schema versions, replay semantics, conflict examples, upgrade paths and a reproducible offline test script. No GPS queue, signatures/POD or universal background-sync claims.

## Required verification

Create tests/integration/offline-device-takeover.test.ts connecting actual queue/replay logic, API ownership rules and database state. Exercise duplicate/lost acknowledgement, dependencies, route reorder, stale generation, receipt/correction conflicts, logout/isolation and session expiry. Label simulated IndexedDB/time/network tests; they do not prove actual browser durability.

Use Playwright and target Android/Chrome plus iPhone/Safari follow-up for install/reopen, network loss, online-start refusal, local save -> server acceptance, takeover and former-device reconnect, quota failure and safe update with pending actions. Run an accelerated deterministic long-offline test and record a separate real approximately 24-hour device observation when performed; never relabel time advancement as elapsed-day evidence. Preserve unavailable device/long-run checks as explicit pilot conditions.

## Done / excluded

Offline capture/replay is integrated and tested with honest evidence receipts, device fencing and simple recovery. No offline optimizer/new-round start, GPS, indefinite-device-retention promise or real-data reset. Next: Phase 10.
