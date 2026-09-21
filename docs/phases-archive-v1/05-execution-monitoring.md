**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 05 — Transactional execution and coherent monitoring

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03, Phase 04. Master-plan focus: sections 5–11, 13–15, 18 groups C/D/E/G/K/L.

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

Implement the authoritative online delivery state machine, collection/quantity outcomes, round/workday lifecycle, execution ownership and coherent progress reads. Verify intake/planning, identity and transaction foundations from Phases 01–04. Persistent outbox intent is required now; network delivery is Phase 07.

## Read and inspect

Read canonical execution/device/action-status/monitoring contracts and examples, docs/tracking-and-consistency.md transition/locking/current-next/quantity rules, docs/ui-spec.md Routes and actions / State copy and feedback and docs/contract-coverage.md. Read master-plan sections 5–11 and 14–15 closely.

Use stitch-export/screens/01-active-driver-trip, stitch-export/screens/02-stop-details and stitch-export/screens/03-dispatcher-workspace (code.html, metadata.json, screen.jpg), plus stitch-export/screens/05-driver-daily-trips and stitch-export/screens/08-trip-completion (screen.png and source files) to understand consumers of these APIs. This backend phase must support their agreed controls/states without copying prototype behavior.

## Implementation tasks

1. Add migrations/constraints for workdays, rounds, device generations, current activity, attempts, effective outcome history, quantity/collection ledger, action receipts/results and initial/revised forecast references. One open workday and active round per tenant/driver across branches; one current activity and execution owner. Use consistent locks and scoped foreign keys.
2. Implement online start: relevant pending actions synchronized, current authorized assignments validated, selected optimized/manual plan published and ownership established atomically. Lock departed snapshots against general staff edits, including urgency. Treat a lost successful start response idempotently; another phone sees the existing round. No per-stop internet requirement is introduced.
3. Implement explicit heading/current selection and arrival. Next planned is a suggestion; outcomes clear/resolve the current attempt without inventing movement to the following stop. Protect heading/arrived targets during automatic replanning. Last confirmed physical origin changes only with an actual recorded arrival/manual correction, not a phone outcome.
4. Implement full/partial/refused/no-answer/deferred outcomes. B2B partial pieces require source permission and exact frozen arithmetic: three at 100 plus 50 shipping means 350 full, 250 for two, 50 on full refusal, or explicit zero-collected/unpaid-50 refusal exception. No answer implies neither fee refusal nor arrival. Prepaid amounts are not recollected; accepted goods cannot have arbitrary underpayment. Rejected partial remainders are return-required and never scheduled for customer revisit.
5. Implement explicit bounded whole-shipment retry before branch receipt, earliest-time deferral, eligible urgency and automatic replanning triggers. Preserve attempts and already reported fees; no counters/limits. B2C remains simple outcomes/optional collection. Capacity and source/departure rules still apply.
6. Implement end round and explicit End day, including workdays crossing midnight and held unfinished work carrying forward without source resubmission. Closure is not delivery, warehouse receipt or financial settlement. Establish immutable dependency checks needed for later correction/receipt commands.
7. Implement idempotent online takeover by the same driver, incrementing device generation without old-phone approval. Record stale-owner/rejected evidence distinctly from acceptance; provide command status and durable evidence receipts. Do not auto-apply old-device actions by client time. Complete the core ownership/revision rules now; offline batch replay/client UI arrive in Phase 09.
8. In one transaction per accepted change, validate auth/ownership/versions, persist task/attempt/round/ledger state, coherent progress, audit/idempotency and outbound events. No HTTP/Engine work inside long transactions. Preserve first-start forecasts and later workload/route revisions now, rather than reconstructing them in Phase 10.
9. Implement scoped coherent monitoring/history snapshots and conditional revisions/ETags, including held/prepared groups and current/next. Define recipient-filtered mixed-integration views without hidden-data leakage. Supply commit/freshness timestamps; do not claim idle means offline. Polling UI is completed in Phase 08.

## Required verification

Create outcome-progress-outbox.test.ts and start-assignment-race.test.ts using real PostgreSQL and independent connections. Cover rollback at injected points, duplicate/payload-mismatch action IDs, simultaneous starts, stale device, withdrawal/start race, incompatible revisions, quantity/fee examples, protected current work and nonregressing monitoring. Validate emitted schemas and initial forecast persistence. Include permitted whole retry and rejected partial-remainder retry, cross-tenant/integration reads and End day with held work.

Demonstrate two accepted tasks through plan/start/outcomes and coherent reads using API commands. Clearly state that outbox rows are durable but delivery is not yet implemented. Do not claim fake frontend fixture interactions prove backend execution.

## Done / excluded

The online state machine and reads are transactionally tested, with usable command/status contracts and persisted event intent. Physical branch receipt, driver correction commands and native ERP handling are Phase 06/07. Full production UI, offline queue and Excel are later. Next: Phase 06.
