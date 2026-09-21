**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 01 — Repository, contracts and design foundation

Copy this entire file as the implementation prompt. Prerequisites: none; existing repository only. Master-plan focus: sections 1–20, especially 5–13, 16, 18–19.

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

Turn the planning baseline into a runnable workspace and real canonical contracts/state/design specifications before dependent feature code. No prior application phase is required. Existing context reports are historical evidence, not proof of working local services.

## Read and inspect

Read STACK-CONTEXT.md, TAWSEL-ENGINE-CONTEXT.md, TAWSEL-NEW-CHAT-PROMPT.md, docs/planning/repository-and-ui-assessment.md, README.md, docker-compose.yml, setup.ps1, profiles/motorcycle.lua and vroom-conf/config.yml. Later owner decisions supersede older proposals.

Read stitch-export/README.md and manifest.json. Inspect code.html, metadata.json and the image in every directory: stitch-export/screens/01-active-driver-trip, 02-stop-details, 03-dispatcher-workspace, 04-login-workspace, 05-driver-daily-trips, 06-route-preparation, 07-location-review, 08-trip-completion and 09-sync-conflicts. The shared prefix applies to each name. Screens 1–3 use screen.jpg; 4–9 use screen.png. Record actual visual/source access and any gaps, without repeating an inaccessible-image claim as evidence.

## Implementation tasks

1. Establish a minimal coherent TypeScript workspace: runnable web/API shells, shared schema/client tooling, package scripts, lockfile and Vitest configuration. Create worker/mock packages only when they have real runnable responsibility; do not fill the tree with unused placeholders. Separate local/test environment configuration from Engine production settings. Document supported Node/package-manager versions, setup and commands in README/.env.example. Add useful CI checks for the artifacts created here.
2. Create contracts/openapi.yaml as valid OpenAPI 3.1 with the complete V1 operation families from master-plan section 13, explicit security, tenant/source scope, IDs, integer quantities/minor-unit money, timestamps, pagination, errors, async results and compatibility. Include action/evidence status, device takeover, actual branch receipt/disposition, monitoring, forecast/report/export and provisioning—not just CRUD or a task-completed endpoint. Mark implementation availability in a separate operation coverage table so documenting a future endpoint does not claim it works.
3. Create versioned contracts/events schemas and schema-valid contracts/examples. Cover envelope/signature metadata, per-recipient ordering, progress snapshots versus business transitions, source correlation and received/applied acknowledgements. Generate usable API reference and typed client/schema artifacts reproducibly. Configure the JSON Schema validator dialect explicitly; do not hand-copy drifting schemas.
4. Write docs/tracking-and-consistency.md with explicit actor/state/action tables, locks/invariants, quantity conservation, command/evidence transactions, current versus next, workday/round/cycle boundaries, device generation, offline dependencies, queue retention, polling freshness and ERP recovery. Resolve routine engineering details from the baseline; record a material unresolved business contradiction rather than silently relaxing it. Document the visible branch-interruption treatment at capacity and that it never admits an over-limit incoming batch.
5. Create DESIGN.md from the visual references: typography/tokens, surfaces/spacing, components, map/stop styling, RTL/LTR isolation, responsive behavior and motion. Specify one shadcn/Smooth UI theme and component conventions, not a generic library template. Consult https://smoothui.dev/llms-full.txt and actual chosen registry APIs. Avoid claiming all components have identical props or importing the whole catalog.
6. Create docs/ui-spec.md with stable subsections: Reference inventory; Driver simplicity; Routes and actions; State copy and feedback; Components and overlays; Screen coverage; Visual acceptance. Map every required action to its contract/permission/states and implementation phase. Classify prototype controls as retained/adapted/removed, and document new controls/screens derived from requirements. State each page's purpose, main action, missing-input/waiting explanation and focused modal/page boundary.
7. Start substantive docs/integration-guide.md and docs/operations.md: implementer obligations, version/status conventions, native ERP ownership, proposed local service topology, Engine preservation and operational evidence still required. Keep as-built claims distinct from contract design. Add docs/contract-coverage.md mapping operation/event families to phases and later implementation evidence.

## Required verification

Use real Vitest files to validate OpenAPI/schema references and good/bad examples, including wrong integer/money formats, invalid action envelopes and incompatible states representable by schemas. Domain-only rules belong to later runtime tests and must be identified. Verify deterministic generated outputs, typecheck/build of the runnable shells and no accidental dependence on external prototype CDNs. Do not call empty health shells a delivery application.

## Done / excluded

Done means working workspace commands, machine-valid contracts/examples/reference, substantive state/design/UI specifications and a truthful operation/phase coverage map. Record all nine references and accessibility gaps. This phase does not implement full identity, business migrations, live routing, outcomes, ERP workers, offline replay or production deployment. Next: Phase 02.
