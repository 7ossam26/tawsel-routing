**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 07 — Durable synchronization and native mock ERP flows

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03, Phase 04, Phase 05, Phase 06. Master-plan focus: sections 5–6, 10, 12–14, 17–18 groups B/F/H/K/L.

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

Deliver the real server-to-server integration boundary: durable Tawsel event delivery, durable ERP command submission/inbox/projection, replay and native mock ERP receipt screens. Verify Phases 01–06 produce schema-valid durable event intent and scoped APIs. The actual shipping ERP remains a separate future project.

## Read and inspect

Read contracts/openapi.yaml integration/recovery/provisioning operations, contracts/events and examples, docs/integration-guide.md, docs/tracking-and-consistency.md outbox/inbox/ordering and docs/operations.md worker/recovery boundaries. Inspect actual outbox/migrations and transaction tests.

For received-conflict/status presentation and native mock extensions, read DESIGN.md and docs/ui-spec.md Routes and actions / State copy and feedback / Components and overlays. Review stitch-export/screens/03-dispatcher-workspace/code.html, metadata.json, screen.jpg and stitch-export/screens/09-sync-conflicts/code.html, metadata.json, screen.png. Keep mock ERP clearly labelled and use the same simple component conventions; it is not a replacement shared dispatcher app.

## Implementation tasks

1. Implement the Tawsel delivery worker with bounded claims/leases, restart recovery, per-recipient aggregate order, jittered retries and capped backoff, visible retained failures and controlled replay. Send outside database transactions, then record acknowledgement. Preserve event IDs across redelivery and distinguish delivery attempts, durable receipt and projection processing.
2. Sign exact webhook bytes with scoped rotated secrets, key ID and fresh delivery timestamp. Verify signed requests and replay windows in the receiver. Enforce tenant/integration destinations, secret protection and webhook URL/network restrictions without breaking explicit isolated test endpoints.
3. Build apps/mock-erp as an external contract consumer with its own database/credentials/migrations. Its source changes and command outbox commit together; its durable inbox accepts before acknowledging, and its projection plus processed marker commit atomically. Use published/generated clients only, no Tawsel database access or backend-domain imports.
4. Implement native mock surfaces for minimal company user/role/branch provisioning, task preparation/assignment/predeparture removal, per-driver pending return requests, received-piece confirmation and distinct loss/damage disposition. Integrate its own OIDC client and verified actor context. Show pending/rejected/accepted source submissions honestly. Do not create merchant accounting, real inventory valuation, cash settlement or a generic ERP.
5. Handle duplicates, payload mismatch, out-of-order delivery, gaps and expired replay history. Scope ordering to what each recipient can see. A newer progress snapshot may replace an older one, but cannot erase a required business transition. Implement scoped replay/checkpoint/snapshot recovery and processed-status acknowledgement/readback through published APIs; expose limits and incomplete historical recovery.
6. Implement operator retry/reconciliation visibility with correlation IDs, queue age and received-versus-applied status. Driver copy stays concise; put transport diagnostics in an authorized operational view. Failures for one integration must not stall another, and a mixed-source trip must not leak contacts or hidden task details.
7. Make fault injection explicit in development/test harnesses: stop after sender commit/before send, drop response, fail receiver before projection commit, duplicate/reorder messages and simulate outage. Do not expose those controls in production user flows.
8. Update the integration guide, examples, operations worker runbook, contract coverage and implementation status with actual setup and connector obligations, including ERP-side outgoing intent. Record evidence in docs/verification/integration.md.

## Required verification

Create tests/integration/outbox-inbox-recovery.test.ts running actual sender worker and receiver/projection code over a test HTTP boundary with separate real databases. Verify process/lease restart, duplicate acceptance/application, atomic receiver failure, signature/key rotation failures, gap/replay recovery and recipient isolation. Tests must inspect committed outcomes, not only mocked send counts.

Demonstrate at least two tasks from mock preparation/receipt through plan/start/driver outcome, shared authoritative progress and applied mock projection. Demonstrate native subset return receipt and a correction event. Validate all captured messages against schemas. Measure a healthy local commit-to-applied path separately from outage recovery; local evidence is not KVM production capacity.

## Done / excluded

A reproducible durable boundary and native mock workflows exist, with failure evidence and usable integration documentation. No exactly-once network/global ACID claim, commercial ERP or production/public mock exposure. Next: Phase 08.
