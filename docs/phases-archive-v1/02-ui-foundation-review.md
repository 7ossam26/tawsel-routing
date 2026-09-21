**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 02 — UI foundations and early driver UX review

Copy this entire file as the implementation prompt. Prerequisites: Phase 01. Master-plan focus: sections 2, 4, 16, 18 groups N/P.

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

Build an interactive, explicitly fixture-backed representative driver journey and desktop monitoring view to validate layout, components and simplicity early. Phase 01 contracts, runnable web shell, DESIGN.md and docs/ui-spec.md must exist and pass their checks.

## Read and inspect

Read DESIGN.md and docs/ui-spec.md sections Reference inventory, Driver simplicity, Routes and actions, Components and overlays, Screen coverage and Visual acceptance. Read the phase-01 contract coverage and fixture schemas.

Inspect all assets in stitch-export/screens/01-active-driver-trip, stitch-export/screens/02-stop-details, stitch-export/screens/03-dispatcher-workspace, stitch-export/screens/04-login-workspace and stitch-export/screens/05-driver-daily-trips. Consult stitch-export/screens/08-trip-completion and stitch-export/screens/09-sync-conflicts for status/summary continuity. Inspect images as well as HTML; their controls are not feature requirements.

## Implementation tasks

1. Build shared Cairo/RTL app shells, navigation, typography, form/status/stop components and design tokens using selected shadcn/ui and Smooth UI sources. Inspect copied component dependencies and interaction APIs, theme both consistently, preserve license notices and self-host production font/icon assets. Keep approved navy/blue/light-surface hierarchy with semantic state colors.
2. Implement a representative fixture journey: separate company/independent login presentation, daily work, active map/list, selected customer and stage-specific heading/arrival/outcome presentation. Required recipient contact shortcuts remain accessible. Use one dominant action per stage and contextual secondary actions; do not display every feature on the active card. Include a focused outcome sheet and missing-input/waiting explanations.
3. Build a desktop selected-driver monitoring view with current versus next, processed versus delivered counts, prepared/held groups and freshness. Staff cannot manipulate departed outcomes. Remove the original missing-element script assumptions and avoid replacing the reference with an unrelated dashboard template.
4. Build development fixtures from canonical contracts for ready/empty/loading, long Arabic content, current heading/arrived, no answer, another-device round, partial outcome, offline-pending, rejected and stale states. Clearly label the fixture route/story environment. Keep its state simulator out of production routing/builds; fixture success must not look like a real backend acknowledgement.
5. Define a map component boundary and usable accessible list fallback. A local schematic/fixture map is acceptable for this phase when clearly identified; do not present it as a live Engine or licensed production basemap. Real tiles/adapters arrive in Phase 04.
6. Maintain a component/state matrix in docs/ui-spec.md and record review findings in docs/ui-review.md: viewports, screenshots, intentional visual corrections, action inventory changes, tap/navigation observations and unresolved defects. Present a concrete preview for the owner. Record actual feedback separately; absence of feedback is not approval. Backend phases may proceed, but explicitly rejected shared patterns must be corrected before broad UI expansion.

## Required verification

Create driver-flow.test.tsx with meaningful Vitest component/state tests for stage-dependent actions, focused modal open/back behavior, retained form input, visible blockers, correct counter semantics and fixture isolation. Test observed behavior rather than Tailwind classes.

Run browser interactions and screenshots at 360×800/390×844 mobile and 1366×768/1440×900 desktop, plus zoom, long RTL text, LTR phone/IDs, keyboard focus and reduced motion. Verify no clipped critical actions or accidental horizontal scrolling. Review whether purpose/next action/missing input/waiting is obvious without narration. If browser tooling is unavailable, record the gap and provide a reproducible preview; do not report visual checks as passed.

## Done / excluded

Deliver reusable components, connected representative fixture flows, browser evidence, a reviewable preview and documented corrections. This phase validates presentation and interaction, not real login, task persistence, Engine routes, offline durability or server synchronization. No fake service-worker success. Next: Phase 03.
