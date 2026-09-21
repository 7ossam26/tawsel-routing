**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 11 — Operational verification, pilot deployment and ERP handoff

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03, Phase 04, Phase 05, Phase 06, Phase 07, Phase 08, Phase 09, Phase 10. Master-plan focus: sections 3–4, 12, 14, 17–20; acceptance A–P.

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

Verify the complete implemented application, prepare a recoverable KVM 2/Dokploy pilot and deliver accurate owner/ERP handoff documentation. Verify evidence and known gaps from Phases 01–10; do not assume code presence means readiness. This is hardening/recovery verification, not a late rewrite or the first time integration tests are added.

## Read and inspect

Read master-plan.md in full, DESIGN.md, docs/ui-spec.md including Driver simplicity/Visual acceptance, docs/ui-review.md, docs/contract-coverage.md, all implementation status/evidence, docs/tracking-and-consistency.md, docs/integration-guide.md, docs/reporting.md, docs/operations.md, and actual CI/deploy/migration/worker configuration. Inspect the current Engine mounts/datasets/versions before any deployment change.

For final visual/interaction coverage, use code.html, metadata.json and original images in stitch-export/screens/01-active-driver-trip, stitch-export/screens/02-stop-details, stitch-export/screens/03-dispatcher-workspace (screen.jpg), and stitch-export/screens/04-login-workspace, stitch-export/screens/05-driver-daily-trips, stitch-export/screens/06-route-preparation, stitch-export/screens/07-location-review, stitch-export/screens/08-trip-completion, stitch-export/screens/09-sync-conflicts (screen.png). Include requirement-driven extensions; do not demand exact prototype action parity.

## Implementation tasks

1. Close material defects revealed by the acceptance matrix, with targeted Vitest/browser regression tests. Re-run relevant checks after changes, then the integrated acceptance suite. Retain fixture/live-service/device distinctions and actual versions. Check every operation/event/UI action's implemented and verified status; expose incomplete required work rather than marking the whole plan done.
2. Build reproducible production images and Dokploy/Compose configuration with private Engine/database networking, HTTPS for app/API/issuer, safe secrets, migration runner and service health. Resolve the existing VROOM/Dokploy host-port risk without exposing Engine ports or changing volumes blindly. Ordinary app deploy must not import OSM/rebuild data. Keep the mock private/test-only.
3. Complete database and PWA-compatible migration/release rollback or forward-recovery procedures, including old queued actions, issuer config and separate Engine dataset compatibility. Verify restart of API/worker/receiver after committed work; no lost outbox or stale-device bypass.
4. Inventory actual KVM resources/co-located workloads, domains/TLS, recovery-email sender, map archive coverage/storage, identity/provisioning configuration, backup destination and access. Use authorized read-only inventory where available. Prepare all local config and checks before requesting genuinely missing access/values. Do not invent credentials, infer a clean server or require a resource upgrade.
5. Implement structured diagnostics/metrics for request latency, database pressure, worker/queue age, integration application lag, Engine failures, storage growth and backups. Expose a small authorized operator diagnostic surface/runbook. Driver UI stays simple.
6. Run healthy-path freshness measurements with commit/application/render timestamps and clock uncertainty. Target p95 ≤3 seconds for visible Tawsel monitoring and ≤5 seconds for healthy mock ERP application; publish p50/p95/p99, errors and exact conditions. Start with five drivers/two observers and ramp realistic load to find bottlenecks; do not interpret this starting load as a product cap. Measure outage recovery separately.
7. Implement application database backups/WAL archiving to an identified separate failure domain and a timed isolated restore rehearsal for the proposed RPO ≤15 minutes/RTO ≤4 hours targets. Include identity/secret/config recovery and distinct Engine/map artifact restoration. Verify a known trip/action/event checkpoint, not just backup-job exit. If targets cannot be demonstrated, report the actual result and required remedy; never hide a changed recovery objective.
8. Run the owner demonstration: B2C real intake/plan/start/delivery/offline reconnect/report/export; B2B mock assignment/progress/native subset return; another-device takeover; manual route on Engine outage; diagnosis of delayed ERP updates. Check Android/Chrome and iPhone/Safari PWA, storage/reopen/update, Arabic/RTL/focus/reduced motion and clear purpose/next action/blocker/waiting on each state. Record real elapsed offline observation separately from accelerated tests.
9. Deploy to a live target only when the owner has identified that target and authorization/access are actually available. Complete all preparation first. Use a nondestructive release with verified backups/rollback; preserve unrelated server workloads. If target access is missing, finish local/staging evidence and mark target-specific checks unrun with concrete instructions. Do not label an untested target pilot-ready.
10. Finish docs/ERP-INTEGRATION-HANDOFF.md as an as-built guide to released contracts, verification, provisioning/actor scope, exact source/command/event mapping, received/applied statuses, native receipt/disposition, retry/gap/replay/reconciliation and authorized shared UI entry. Reference generated canonical definitions and validated examples; do not copy raw Engine schemas or promise a ready real shipping ERP connector.
11. Finish README/.env.example, docs/operations.md and docs/verification/pilot-readiness.md with actual release/config versions, commands, demonstrations, failed/unrun checks, recovery evidence, remaining limits and owner-facing troubleshooting. Keep future GPS/native/learning/billing boundaries documented without implementing them.

## Required verification

Evidence must cover master-plan acceptance A–P and docs/phases/coverage-matrix.md: schema/authorization, transaction rollback/concurrency, receiver/sender crashes, duplicates/gaps, online/offline/device recovery, routing failure, timing/export, all visual sources/extensions and driver simplicity. Run existing Vitest suites plus targeted new regression tests. No broad tests that only mirror implementation or invented pass counts.

Demonstrate restore, restart/replay and fresh snapshots after monitoring interruption. No production destructive resets or test-data cleanup outside verified dedicated test resources. Clearly distinguish implemented, verified locally, verified on target, owner-observed and outstanding.

## Done / excluded

Deliver a concrete release and accurate handoff/readiness report. Claim pilot readiness only for demonstrated conditions, with remaining required blockers explicit. Do not declare complete while known required features/checks remain merely because this is the last prompt. No real ERP build, unauthorized public launch, automatic purchase/upgrade, telemetry or monetization. Stop and hand the result to the owner.
