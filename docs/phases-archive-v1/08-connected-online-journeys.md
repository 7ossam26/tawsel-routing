**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 08 — Complete connected driver and dispatcher journeys

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03, Phase 04, Phase 05, Phase 06, Phase 07. Master-plan focus: sections 5–9, 13–16, 18 groups A/B/D/N/P.

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

Connect the approved requirement-driven UI to real identity, planning, execution, return and integration-status APIs. Complete simple online B2C and B2B journeys, using the visual/component foundation reviewed early. Verify Phases 01–07; read owner feedback in docs/ui-review.md and fix explicit rejected patterns before expanding them.

## Read and inspect

Read DESIGN.md and all relevant docs/ui-spec.md subsections: Driver simplicity, Routes and actions, State copy and feedback, Components and overlays, Screen coverage, Visual acceptance. Read actual contract/client coverage, state/authority docs and backend verification evidence.

Inspect code.html, metadata.json and images in all nine exact reference directories:
- stitch-export/screens/01-active-driver-trip (screen.jpg)
- stitch-export/screens/02-stop-details (screen.jpg)
- stitch-export/screens/03-dispatcher-workspace (screen.jpg)
- stitch-export/screens/04-login-workspace (screen.png)
- stitch-export/screens/05-driver-daily-trips (screen.png)
- stitch-export/screens/06-route-preparation (screen.png)
- stitch-export/screens/07-location-review (screen.png)
- stitch-export/screens/08-trip-completion (screen.png)
- stitch-export/screens/09-sync-conflicts (screen.png)

These are visual sources, not a demand for nine identical production routes. Required new UI follows the plan and the same layout system.

## Implementation tasks

1. Connect separate company/independent account flows, authorized branches, daily prepared/held/active/ended work and a clearly visible existing round on another device. User roles come from server access, never a selectable privilege.
2. Complete fast B2C name/phone/address-or-pin intake, optional amount, three vehicle modes, origin/endpoint, readiness and preview. B2B consumes ERP assignments without duplicating staff assignment administration. Unresolved locations block only affected tasks; over-limit additions and unassigned optimization results remain explicit.
3. Connect the real map/list, protected current target, next suggestion, contact/navigation controls and stage-specific actions. Phone/WhatsApp/nav links do not record completed calls, heading or arrival. Verify actual destination links and handler behavior. Keep frequent full-delivery interaction short and show exact required collection.
4. Implement focused authorized partial-piece, refusal/shipping exception, no-answer, earliest deferral, whole retry, urgency, pin correction and recording-correction flows. Exclude B2C partial/return controls and unrelated business features. Keep source details immutable after departure except allowed driver fields/actions.
5. Implement the driver source-branch request/interrupt/resume journey with pending/confirmed subset/disposition clarity. Native staff receipt stays in the mock ERP. Never label requested or failed delivery goods as physically returned, or day completion as cash settlement.
6. Connect predeparture shared planning/location views and departed read-only monitoring. Poll visible operational views with conditional versions, one in-flight request and stale/reconnect behavior. Apply only nonregressing coherent snapshots. Display idle separately from disconnected/stale data, scoped integration visibility and actual received evidence only.
7. Connect round/day end and basic effective outcome/collection summaries using available APIs. The full expected/actual comparison and Excel extension belongs to Phase 10; do not show fake report/download buttons. Provide real server action-status and integration-status views; durable offline capture/replay is Phase 09.
8. Handle loading/empty/validation/permission/dependency/partial/stale/rejected states and action timeouts explicitly. Retry an uncertain submitted command with its original stable ID or query its status. At this stage, do not promise a result was saved offline when persistent capture is not implemented. Remove production fixture switches, timed success and dead links.
9. Apply one dominant stage action, concise Arabic explanations and discoverable contextual options. Use short sheets/modals for focused choices, full pages where longer work is clearer; avoid nested dialogs and repeated confirmations. Preserve draft input on back/cancel and make blockers/waiting visible without technical jargon.
10. Update UI specification/state/action/API coverage and docs/ui-review.md with real screenshots, tap-flow observations and intentional changes from the references. No required action is complete solely because its icon is visible.

## Required verification

Extend driver-flow.test.tsx and relevant Vitest component/client tests for real response mappings, input retention, contextual actions, forbidden controls and nonregressing polling. Keep mock-response component evidence separate from end-to-end evidence.

Run Playwright against real local APIs/identity/databases: two-stop B2C delivery, mock B2B assigned work/partial outcome/return, second-device view, owner takeover, permission denial, Engine failure/manual fallback and known timeout recovery. Compare mobile/desktop renders with the reference language at agreed viewports, long Arabic content, zoom, focus and reduced motion. Record unsupported real-device checks honestly.

## Done / excluded

All approved online journeys and states are connected and simple, with no placeholder successes. Detailed reports/export and genuine offline durability are explicitly tracked for Phases 09–10, not represented as complete. No new global fleet, billing, GPS or staff override. Next: Phase 09.
