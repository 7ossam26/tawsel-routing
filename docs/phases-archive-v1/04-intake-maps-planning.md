**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 04 — Task intake, locations and route planning

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03. Master-plan focus: sections 5, 7–10, 13, 18 groups C/J/L.

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

Implement persistent independent-driver intake and ERP task/assignment APIs, location confirmation, real map assets and the planning pipeline. Verify identity/scoping, canonical contracts and the shared UI foundation from Phases 01–03.

## Read and inspect

Read contracts/openapi.yaml intake/location/planning operations, related event schemas/examples, docs/tracking-and-consistency.md eligibility/admission and async publication sections, docs/contract-coverage.md and the Engine configuration/report/assessment. Verify provider semantics against the pinned VROOM/OSRM/Nominatim documentation before coding adapters.

For map/pin/preparation components, read DESIGN.md and docs/ui-spec.md Driver simplicity / Components and overlays / Routes and actions / Visual acceptance. Inspect stitch-export/screens/06-route-preparation and stitch-export/screens/07-location-review (code.html, metadata.json, screen.png), and the map/list relationships in stitch-export/screens/01-active-driver-trip and stitch-export/screens/03-dispatcher-workspace (screen.jpg and source files).

## Implementation tasks

1. Add real SQL migrations and scoped domain operations for source task snapshots, stable external references, source branches, integer piece/price policy where B2B, confirmed pin/provenance, prepared/received assignments and draft plans. B2C requires recipient name/phone/location with optional simple collection; do not create B2C line splitting or custody. Reuse the transaction/idempotency/audit/outbox foundation or complete it here before accepting domain changes.
2. Implement atomic batch admission with a 50-remaining-stop limit including planned branch visits. Reject the entire over-limit incoming batch; no partial assignment or hidden rejected backlog. Prepared work remains separate from received/on-board work. Normal predeparture withdrawal/reassignment needs no extra reason/receipt ceremony. Serialize capacity changes and design the departure lock consumed by Phase 05.
3. Reject ambiguous financial allocations and nonintegral quantities using source contracts. Preserve original address and content/price revision; no cross-database reads. Definitive ERP assignment asserts receipt, commits before asynchronous optimization and is not rolled back by an Engine outage.
4. Build private Nominatim/OSRM/VROOM adapters with explicit ID/profile/coordinate/unit/time conversion, timeouts and bounded caching/concurrency. Nominatim candidates require honest provenance/confirmation, not invented match percentages. Public contracts do not expose raw provider IDs/formats. Use last confirmed physical stop/manual origin; no GPS. Implement three vehicle modes, 600-second customer service, explicit endpoint options and earliest availability.
5. Implement durable planning jobs, immutable input fingerprints, draft/ready/manual/partial/error statuses and versioned forecasts. Protect the explicit current prefix when supplied by the execution model. Eligible urgent stops precede ordinary stops after that prefix; VROOM priority alone is insufficient. Validate the complete stitched route, task IDs, unassigned work, endpoint/timing and admission count. A stale async result cannot publish over newer input.
6. Plan persistence is distinct from active-round start/publication, implemented in Phase 05. Provide a validated manual-order fallback and keep the last valid route if the Engine fails. Never label straight-line geometry as verified road routing or silently ignore urgent/unassigned jobs.
7. Implement reusable MapLibre rendering/pin-selection and self-hosted range-capable PMTiles/style/glyph/sprite configuration. Verify Arabic rendering, attribution, coverage and asset licensing. Keep a usable list fallback. Connect a focused location/preparation development surface to real APIs for validation; the complete driver/dispatcher production journeys arrive in Phase 08.
8. Update canonical contracts/examples/generated client, state docs and Engine setup guidance. Document actual running versions/dataset compatibility separately from historical reports. Do not automatically import data, expose raw Engine services publicly or overwrite existing mounts.

## Required verification

Vitest integration tests use real PostgreSQL/API handlers for duplicate intake, source revision checks, tenant isolation, preparation/receipt distinction and concurrent atomic capacity admission. Add planning-publication.test.ts for invalid/unassigned/stale results, urgent ordering/current-prefix/earliest/endpoint protection and durable job restart. Use controlled provider fixtures for failures plus separately recorded live calls against the actual local Engine for all three profiles.

Exercise actual map/pin UI with keyboard/touch, long Arabic source text and tile/geocoder failure. A missing basemap or unavailable Engine is recorded as a limitation, not replaced with an unlabelled successful fixture.

## Done / excluded

Persisted intake and validated plans, real adapters/assets, meaningful tests and a clear API-driven demo exist. Planned/stored work is not yet driver-executed. No full outcome workflow, financial settlement, production ERP, offline optimizer or fleet allocator. Next: Phase 05.
