**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 06 — Source-branch returns and bounded corrections

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02, Phase 03, Phase 04, Phase 05. Master-plan focus: sections 5, 7–10, 13, 18 groups E/F/G.

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

Complete B2B return/disposition and driver self-correction semantics without inventing a warehouse or finance module. Verify Phase 05 outcome/ledger, workday/device ownership and departure locks, plus the planning/admission model. Native ERP UI/transport is Phase 07; use authenticated API clients for verification here.

## Read and inspect

Read return/disposition/correction/redispatch contracts, event schemas and examples; docs/tracking-and-consistency.md quantities, dependency locks, branch interruption and workday closure; master-plan sections 5, 7–10 and discovery decisions D-42–D-48, D-68, D-79/D-80 and D-95/D-96. Latest decisions supersede intermediate history.

Read DESIGN.md and docs/ui-spec.md Routes and actions / State copy and feedback / Driver simplicity. Inspect stitch-export/screens/01-active-driver-trip and stitch-export/screens/02-stop-details (screen.jpg and sources), and stitch-export/screens/05-driver-daily-trips, stitch-export/screens/08-trip-completion, stitch-export/screens/09-sync-conflicts (screen.png and sources) for required pending/held/conflict views. Do not add a mandatory shared Tawsel staff receipt UI.

## Implementation tasks

1. Add migrations for return requests/items, confirmed receipts, distinct operational dispositions and correction/dependency records, reusing stable dispatch-cycle/line identities. Preserve quantities/history and tenant/source-branch relationships rather than overloading a shipment status.
2. Implement a driver return request grouped by actual originating branch. Multiple origins require distinct source-branch groups. The request is not physical receipt. Authorize native-ERP receiver commands using bound service and verified actor permissions.
3. Confirm only actually received pieces/subsets. A claimed handback must be server-confirmed before that handover/resume completes; unavailable confirmation stays pending. Do not impose settlement of every offered item before continuation or add a quota/whole-batch clearance gate. Keep unreceived goods attributed honestly and expose ERP-owned loss/damage disposition as separate facts, not available stock.
4. Implement branch interruption: heading work can pause; an arrived/handled customer must resolve first. Preserve the paused customer sequence visibly, publish the branch activity within the active-plan capacity model, then resume/replan from confirmed branch arrival. Test the baseline at 50 remaining customer stops without admitting a 51-stop customer/branch plan or secretly assigning overflow. This does not start a second round or change custody by itself.
5. Allow redispatch only after a compatible confirmed return using a new dispatch cycle and source reference, preserving old outcomes/collection/history. No direct driver transfer. Once actual receipt/disposition changes eligibility, racing old retry/outcome/correction commands must not revive incompatible quantities.
6. Implement driver recording corrections within the open workday before dependent receipt/redispatch. Validate current owner, assignment, effective revision and quantity/money invariants. Append correction history and recompute effective progress/ledger/outbound intent atomically. A correction changes a mistaken record, not actual prices, a refund or a completed dependent handover. Staff cannot use it as an outcome override. Preserve the equivalent bounded simple B2C correction.
7. Supply safe conflict/evidence reads and allowed actions for the later UI. Backend rejects forbidden transitions regardless of a user's broad role. Do not require mandatory clerical reasons or dual confirmations for ordinary work.
8. Update contracts/examples, state diagrams, integration guide and UI specification with actual per-item pending/confirmed/disposed states and their concise display consequences. Require events to carry the correct cycle/quantity/correction semantics for Phase 07.

## Required verification

Create partial-return-correction.test.ts with actual API/database transactions. Cover wrong branch/tenant, partial receipt, duplicate receipt, unavailable receipt without fake resume, unresolved remainder without a whole-batch gate, lost versus received goods and source redispatch history.

Race correction, receipt, retry, day closure and redispatch with separate connections; exactly the permitted effective transition commits. Assert ledger conservation, fee deduplication, audit/outbox coherence, frozen original records and coherent monitoring. Test the 50-stop branch interruption and return to the paused sequence. Confirm B2C cannot enter branch or piece-splitting workflows.

## Done / excluded

Return/correction APIs and states are fully tested with concrete accepted and rejected examples. Do not build actual inventory valuation, employee liability, settlement, real ERP screens or a staff delivery-edit bypass. Next: Phase 07.
