**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 10 — Workday reports, forecast comparison and Excel

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03, Phase 04, Phase 05, Phase 06, Phase 07, Phase 08, Phase 09. Master-plan focus: sections 7–8, 13, 15–16, 18 groups A/E/M/N/P.

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

Complete authorized in-app reports and real Excel export from persisted execution/forecast data, with correct workday, quantity, collection and timing semantics. Verify Phases 01–09, particularly immutable first-start forecasts from Phase 05 and action-time provenance from offline replay. Do not reconstruct missing historical predictions and label them original forecasts.

## Read and inspect

Read master-plan sections 7–8 and 15, reporting/export contracts/examples, actual forecast/outcome/correction schema and docs/tracking-and-consistency.md workday/time rules. Read DESIGN.md and docs/ui-spec.md Driver simplicity / Routes and actions / State copy and feedback / Visual acceptance, plus owner review notes.

Inspect stitch-export/screens/03-dispatcher-workspace (code.html, metadata.json, screen.jpg), stitch-export/screens/05-driver-daily-trips and stitch-export/screens/08-trip-completion (screen.png and source files). Extend their visual language to focused report/detail/export views; do not import incentives, settlement claims or barcode clearance.

## Implementation tasks

1. Implement coherent authorized report queries by workday/round/driver/branch with stable filter/snapshot semantics. Store/use UTC instants and Africa/Cairo for actual local display, including offset changes and workdays crossing midnight. Do not reset held work or original timestamps at midnight.
2. Distinguish shipment full/partial delivery, failed/deferred attempts, processed stops, remaining eligible tasks, held return-required goods, confirmed receipts and dispositions. Repeated attempts do not create new shipments. Branch service has its own unit. Denominators and plan/workload revision must be explicit: six delivered + one failure + eleven remaining is seven processed of eighteen; sixteen delivered + two failures is 100% processed and 88.9% full delivery.
3. Calculate reported goods/shipping collection, prepaid exclusions and explicit unpaid shipping from effective validated outcomes/corrections. Preserve source currency/minor-unit precision and never sum unlike currencies. This is neither cash remittance nor financial settlement. B2C reports stay simple.
4. Compare per-stop matching initial/revised expected arrival/completion to action-derived actuals. Missing arrival, phone-only no-answer, uncertain client clocks and incomplete attempts show unavailable/uncertain values. Never use delayed server receipt as actual arrival. Derive travel/service durations only with appropriate boundaries.
5. Compare whole-round start/end against identified baseline/latest forecasts and workload membership. Label added tasks, branch interruptions, deferrals and early-ended unfinished work so they are not blindly scored as driver lateness. Corrections change the effective report while preserving history; no rankings, incentives or learned ETA model.
6. Build concise summary -> focused detail -> export navigation using existing components. Keep the main result understandable without exposing every metric/table on the driver page. Show held work/pending action information separately from accepted server report totals; explain any sync needed for an authoritative export. Staff reports use their actual scope.
7. Implement a real .xlsx export with the same authorized filters/snapshot, rows, status definitions, units, timezone and missing-value semantics as the accepted report view. Choose and pin a maintained compatible spreadsheet library after checking primary docs. Force user-controlled names/addresses/IDs to text, not formulas or executable links. Authorize creation and download; expire generated files/URLs and scope any export jobs.
8. Add precise report contracts/examples, update API reference/client, UI spec and integration/operations documentation. Record columns/definitions and forecast/correction compatibility in docs/reporting.md without duplicating canonical schema definitions.

## Required verification

Create Vitest report-query and export integration files using real database fixtures for midnight/offset changes, two attempts for one shipment, partial/full/refused/prepaid examples, subset returns, later corrections, missing/uncertain actuals and changed scope. Validate exported workbook structure/content, numeric precision, literal formula-looking user text, exact filtered row equivalence and unauthorized creation/download denial.

Use browser checks for mobile readability, progressive report detail, filters, meaningful empty/unavailable states and actual download. Compare the original reference layout language, not fabricated sample percentages. Verify a connected two-stop flow reaches both the in-app report and matching Excel.

## Done / excluded

All approved report/export behavior is connected, documented and meaningfully tested. Missing historical data is labelled rather than invented. No finance ledger, settlement, billing, cross-company analytics or driver performance scoring. Next: Phase 11.
