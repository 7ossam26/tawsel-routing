# Tawsel — Engine Application Discovery and Codex Planning Prompt

Updated: 19 September 2026 — repository Stitch export incorporated. Includes the nine existing UI references, continued discovery, V1 operational tracking, transactional correctness, reliable ERP synchronization, and a deferred V2/V3 live-location extension.

Act as a senior business analyst, software architect, and pragmatic software engineer. I am the product owner and tech lead. Help me turn an agreed architecture into a thoroughly specified application, then into phased implementation prompts for Codex.

Our project is Tawsel. Focus ONLY on extending this existing repository:
https://github.com/7ossam26/tawsel-routing

Build the shared delivery application's backend and frontend around its existing routing/geocoding Engine. The shipping ERP and other business systems will be separate projects later. Design and verify their integration boundary now using a small mock ERP/receiver, without building the actual ERP.

Read this entire prompt and both context documents before responding, using the repository copies or attached copies with their provenance made clear:
- STACK-CONTEXT.md: the existing local Engine setup and historical operational report.
- TAWSEL-ENGINE-CONTEXT.md: the agreed architecture and proposed integration design, including the latest tracking/consistency amendment.
- Also inspect stitch-export/README.md, stitch-export/manifest.json, and the screenshot, code.html and metadata.json for every exported screen. The existing designs are an explicit input to this project, not optional inspiration. The exact inventory and handling rules are below.

Inspect the repository when tools allow, including project instructions, configuration, README and current implementation. Record the inspected commit. Distinguish observed code from historical reports, confirmed decisions from proposals, and implemented behavior from planned behavior. Do not claim inspection or testing you could not perform. If access is unavailable, request only missing source files that materially affect a decision and continue supported discovery. Surface contradictions; my latest explicit decisions govern intended scope.

If this prompt is supplied to an ongoing planning chat, preserve its confirmed answers and completed work. Incorporate the repository UI references and all tracking requirements, identify the affected decisions/documents, and ask only questions that remain unresolved or need reconsideration. Do not restart discovery automatically. If this is a new chat and I supply an existing plan, decision log or answered questionnaire, read those first and continue from their actual stage. Where a newer decision changes an earlier one, record the change explicitly.

**1. Follow my workflow**

I describe ideas, then answer questions across several rounds. We develop master-plan.md from the clarified requirements. Only after I agree on that plan do we divide implementation into phases and create a separate, complete prompt for each phase. I will copy the prompts into Codex and execute them sequentially.

Start with discovery; do not immediately produce a finished master plan, phase prompts or application code. Ask necessary questions in manageable batches, usually 6–10 focused questions. Prioritize decisions that affect later work, avoid repeating answers, and do not present an enormous questionnaire at once. Explain technical choices simply, recommend a practical option, and state the tradeoff. Ask me to decide material product behavior; recommend routine implementation details yourself.

Track confirmed decisions, open questions, recommendations and deferred work. Resolve contradictions without inventing business rules. Be candid about complexity and limits. Discuss questions with me in Egyptian Arabic using English technical terms where useful; write technical documents and Codex prompts in clear English.

**2. Preserve the agreed architecture and scope**

- Engine means Nominatim + OSRM + VROOM and their core configuration/integration. The frontend/backend we are building form a delivery application around these services. Do not rebuild them or use VROOM as the application database.
- Keep the Engine, shared frontend, delivery backend, contracts and deployment configuration in tawsel-routing with clear internal boundaries. Preserve working setup, persistent data and volumes. Deliberate restructuring must update existing paths/scripts.
- Build one centrally maintained, tenant-aware application with isolated organizational data and permissions. Use configuration for supported branding/options instead of customer UI forks.
- Drivers use the delivery application directly. Start with a PWA for the small pilot. React Native + Expo remains a later direction.
- Planning, trip maps and dispatcher monitoring belong to the shared application. ERP staff open authorized views; embedding is optional when justified. Driver execution must not depend on an ERP iframe.
- Each future ERP has its own backend/database and server-side connector. It submits work through the published API and receives execution events through webhooks. No cross-database access or dependency on an ERP schema.
- ERP owns commercial orders, customer master, finance and business rules. Tawsel owns tasks, trips, assignments, route revisions, stop attempts and execution progress. ERP can request changes; Tawsel validates permitted transitions. Delivery success is not proof of payment.
- Remain self-hosted/open-source first. Include the map renderer and tile/style source; the Engine does not provide a visible basemap. Ordinary UI/API releases must not trigger Engine data imports/rebuilds.
- Initial constraints: preassigned driver areas/tasks, up to 50 stops per route, no initial global fleet assignment, external next-stop navigation, no initial full in-app turn-by-turn navigation. Define downloaded-trip access and queued offline actions; re-optimization needs server connectivity.
- Cross-company learning, pooled address intelligence, historical ETA models and traffic inference remain deferred to V3 or later.
- V1 includes operational tracking and dependable synchronization. Live driver GPS, background location and the telemetry pipeline are deferred separately to V2 or V3.

Proposed endpoint/state names, folder layouts and schemas in the context file are starting points, not finalized or implemented specifications.

**3. Use the existing Stitch screens and build upon them**

UI quality is a major product requirement. I have already chosen the Tawsel screens in stitch-export/ as the starting visual direction. Preserve their recognizable layouts, Arabic typography, map/list relationships, information hierarchy and interaction patterns, and extend them into a coherent application. Avoid replacing them with a generic dashboard, unrelated template, dated forms or a new visual identity. Correct actual usability defects and scope conflicts while preserving the design direction.

Reference repository: https://github.com/7ossam26/tawsel-routing/tree/main/stitch-export

Initial inventory verified at commit 62d9d4610c38446818e2abc715095c218d9c2f51, dated 19 September 2026. Stitch project: Tawsel Delivery Route Workspace, ID 16661174340563199513. Recheck the current branch and record the commit you actually inspect; this snapshot is evidence, not a requirement to ignore later approved updates.

All directories below are relative to stitch-export/screens/. Each contains code.html and metadata.json as well as the listed image. Use manifest.json for the original screen IDs and provenance.

| Screen | Existing reference | Directory | Image | Intended use |
| --- | --- | --- | --- | --- |
| 1 | Active driver trip / رحلة السائق النشطة | 01-active-driver-trip | screen.jpg | Driver mobile: route map, stop list, progress and next planned stop |
| 2 | Stop details and execution / تفاصيل الوقفة والتنفيذ | 02-stop-details | screen.jpg | Driver mobile: recipient, address, navigation, explicit actions and outcomes |
| 3 | Dispatcher workspace / مساحة عمل الموزع المكتبي | 03-dispatcher-workspace | screen.jpg | Desktop: shared planning and operational monitoring |
| 4 | Login and workspace / تسجيل الدخول ومساحة العمل | 04-login-workspace | screen.png | Authentication and authorized workspace selection |
| 5 | Driver daily trips / رحلات اليوم للمندوب | 05-driver-daily-trips | screen.png | Driver mobile: active, upcoming and completed trips |
| 6 | Route preparation / تجهيز وتعديل خط السير | 06-route-preparation | screen.png | Desktop: draft route, assigned driver, stops and readiness |
| 7 | Location review / مراجعة وتأكيد اللوكيشن | 07-location-review | screen.png | Desktop: ambiguous address, candidate locations and explicit pin confirmation |
| 8 | Trip completion / ملخص إتمام الرحلة | 08-trip-completion | screen.png | Driver mobile: outcome review and trip completion |
| 9 | Sync and conflicts / سجل المزامنة وحل التعارضات | 09-sync-conflicts | screen.png | Driver mobile: pending actions, confirmations and review-required conflicts |

Read the images visually and inspect the HTML, including hidden states and simulated interactions. Merely listing filenames is insufficient. Record which images/code were actually inspected. If an image cannot be accessed, use its HTML and metadata for supported analysis, state the visual-review gap and request only the missing asset if necessary; do not claim to have seen it. A local checkout or export ZIP is enough: access to Stitch MCP is not required once these files are available.

The export README reports that screens 1 and 2 are 1647 x 1107 JPEGs and screen 3 is a 1647 x 580 JPEG, despite larger reported canvases. Screens 1 and 2 depict mobile layouts even though their metadata says DESKTOP. Treat these as export/capture details, not product viewport requirements. Inspect the complete HTML where a screenshot omits content. Do not copy device frames, cropped content, overlapping text or fixed screenshot dimensions into the application.

Distinguish visual authority from business authority. The selected screens establish the visual baseline; confirmed requirements and decisions establish behavior, ownership, permissions and scope. A label, button or simulated success in a generated prototype does not approve a feature or prove its implementation. Record and resolve contradictions without silently copying them or restarting the design process.

In particular, reconcile these concrete issues present in this export:
- Screens 7 and 9 contain driver GPS references, including a last GPS capture and GPS Breadcrumbs. Keep them outside V1. Screen 7 also contains precise accuracy, match-percentage and StreetView claims; retain only capabilities and wording supported by the agreed geocoding/map solution. A manually positioned pin does not establish measured GPS accuracy.
- Screens 5, 6, 8 and 9 include COD amounts, custody/warehouse handover, barcode or proof-of-delivery details, and screen 5 adds performance rewards. These are generated proposals. Clarify any delivery-execution subset actually needed; commercial finance, settlement, inventory and incentive logic remain owned by the future ERP. Screen 8 must support trip completion without pretending to settle financial or warehouse custody. Failed delivery is not automatically a physical warehouse return.
- Screen 4 shows role/workspace selection and offline session continuation. Roles and workspaces must come from server-authorized membership, never from an unchecked role selector. Decide the authentication flow and permitted cached-session behavior during discovery. Prototype claims about end-to-end encryption, secure device memory, automatic background sync or release version V4.8.2 are not evidence and must be replaced with verified, accurate copy.
- Screens 1–3 use some amber accents and a different shell from the blue/navy token set in screens 4–9. Extract a shared system from the actual exports: Cairo typography, light surfaces, dark navy actions, suitable blue accents, and distinct semantic status colors. Recommend the smallest reconciliation of branding, navigation, spacing and components. Ask a focused preference question only where the visual choice is material; do not reopen the entire design brief.
- Progress fixtures and labels need consistent semantics. The 18-stop example with 6 delivered, 1 failed and 11 remaining has 7 processed stops, not 7 successful deliveries. Screen 5 mixes current/next and highlights stop 7 while screens 1–2 use stop 8 as next. Derive these from the approved state model. For 16 delivered, 2 failed and 0 remaining, distinguish processing completion from delivery success rate.
- The HTML uses sample data, static map visuals, browser alerts, demo switches and timers that can announce optimization, synchronization or completion. These are prototype behavior. Replace them with actual contract-backed results; online connectivity alone never confirms a saved action. Keep state simulators in development fixtures, not production user flows. Do not expose labels such as “Screen 7” or technical implementation claims in ordinary product copy.

Turn the separate screens into connected journeys: authorized login/workspace selection; today's trips to active trip to stop execution; relevant sync/conflict review; completion back to today's trips. For dispatchers, connect the workspace to draft preparation, location review, optimization preview, publication and monitoring. Clarify publication/re-optimization rules rather than assuming that saving or optimizing automatically publishes a route. Keep driver navigation and dispatcher navigation appropriate to each role.

Identify missing screens, dialogs and states required by the agreed journeys and extend the same design system to them. Candidates may include account/session handling, task intake, driver/vehicle administration, optimization results, publication confirmation or dispatcher conflict review; assess their necessity before adding V1 scope. Include loading, empty, validation, permission, dependency failure, partial results, stale data, pending sync, rejected actions and concurrent changes for relevant existing screens. The dispatcher can only review conflicts or evidence already received by the server.

Use the export as reference material and reuse sound markup/styles where helpful, then adapt it to the agreed frontend stack, reusable components, accessibility, routing, authentication and data layer. Preserve the original export as provenance. Replace static maps with the agreed renderer, tiles and route data; do not imply live GPS or guaranteed offline map coverage. Resolve external fonts/icons/assets and runtime styling dependencies as part of production/PWA preparation. Support responsive Arabic RTL, long names/addresses, correct LTR isolation for IDs/phone numbers/coordinates, browser zoom, keyboard focus and accessible action controls.

Plan an early UI foundation and representative-screen implementation before duplicating patterns across the app. Show a driver flow and a desktop dispatcher view for focused visual review, using the references and coherent fixtures. During later UI phases, compare browser renders with the relevant exports at agreed mobile/desktop viewports, recording intentional corrections. A passing build alone does not verify visual fidelity. Do not turn the entire project into static HTML mockups or stop after reproducing the nine screenshots; complete the approved functional application and its missing states.

**4. Make operational tracking an explicit V1 feature**

A shipping dispatcher must be able to see which shipments a driver completed, which attempts failed or were skipped, the current trip, what stop is being handled, the next planned stop, and remaining work. Build the common monitoring UI and the contracts that let a future ERP show authorized summaries or open/embed the common view. Do not rebuild this trip/map interface in every ERP.

Clarify during discovery:
- What action starts a trip or makes a stop current; whether heading-to and arrived are explicit driver actions; and how these differ from a planned next stop.
- What happens after success, failure, skip, cancellation, reassignment, route reordering or re-optimization.
- How a driver with no active trip, several daily trips or unfinished work appears.
- Which roles can view/act on which drivers, branches and integrations; do not assume tenant membership grants every permission.
- Which counters, stop history, filters and timestamps the dispatcher needs.
- The online update/freshness target for Tawsel and ERP views, expected pilot concurrency, stale thresholds and recovery expectations.

Never infer actual movement or arrival merely from route order. Completing a stop does not prove the driver has started travelling to the next one. Show last confirmed state and its timestamp. Pending offline actions are not server-confirmed updates; dispatch cannot see actions that have not synchronized.

Distinguish last activity from last device contact and data freshness. Do not label an idle driver offline without evidence. An ERP projection can lag behind the common Tawsel view; expose relevant confirmation/synchronization state on each side.

Design coherent driver/trip monitoring snapshots, relevant execution history, resource/route revisions and recovery reads. Choose bounded polling, SSE or WebSocket according to the agreed freshness target and pilot size. If incremental streaming is selected, specify snapshot/subscription ordering, cursor/resume or equivalent catch-up, gap detection and expired-history recovery. If polling is selected, prevent stale responses from regressing the display and refresh after interruption. An ephemeral socket cannot be the only source of truth.

**5. Turn ACID and synchronization into concrete guarantees**

Use ACID transactions inside each application's own database. Independent Tawsel and ERP databases are not one global ACID transaction. Their projections are eventually consistent with reliable delivery, recovery and visible lag. Do not promise instantaneous cross-system updates during network loss or exactly-once network delivery.

Use a transactional outbox/inbox as the default recommendation, or justify an equally dependable, simpler alternative:
- A Tawsel action transaction validates authorization, assignment, state and expected revision; updates affected task/stop/trip state and stored progress indicators; records audit and idempotency results; and inserts outbound event intent. All commit together or roll back. Derived monitoring fields must come from a coherent committed snapshot.
- Define constraints, locking/conditional writes and isolation appropriate to actual invariants. Concurrent retries or edits must not double-complete work or leave contradictory current/next-stop indicators.
- Send webhooks and UI notifications from committed state. Durable workers recover after crashes, retry with bounded backoff, retain failed work and support controlled replay. A crash between commit and send must not lose a change.
- A receiver acknowledges only after durable acceptance. If processing asynchronously, distinguish received from processed. Update the ERP projection and its processed inbox marker in one local transaction so a crash cannot mark unapplied work as completed.
- Scope command/action idempotency and event deduplication correctly. Keep event schema version, resource revision, route revision and stream cursor distinct.
- Define ordering per aggregate, duplicate handling and gaps. Specify snapshot versus delta semantics: discarding an older replacement snapshot is different from losing a required business transition. Use replay or authoritative reads to reconcile.
- Distinguish device capture time, server receipt/commit time and ERP application time where needed. Handle clock skew; server revisions determine authoritative ordering.
- Queue offline actions with stable IDs and clear acceptance/conflict rules when the route or assignment changed. Decide deduplication/replay retention compatible with the expected offline window.
- Record outgoing ERP intent atomically with the relevant ERP source change when both must happen together. Perform HTTP calls and Engine work outside long database transactions; validate source revisions when committing asynchronous results.

Describe both sides in the integration guide and demonstrate the ERP side in the mock harness. Do not introduce a broker, service mesh, distributed two-phase commit or large microservice design merely to claim scalability.

**6. Prepare the future GPS boundary without building it now**

Keep business execution state separate from future location telemetry. Document how stable tenant, driver, device/session and assignment/trip identities can support authorized location samples later. The future module may initially share the backend; it does not require a separate service or database today.

Record a future contract sketch covering coordinates, accuracy, sample time, server receipt time and deduplication/session sequencing. Consider stale/out-of-order samples, last-known-position age, visibility, permissions, retention and optional history. Treat these as future design decisions, not active V1 endpoints or mandatory empty tables.

A later shared map layer can display authorized driver locations for both Tawsel and ERP users. A location sample is not a delivery outcome; do not automatically derive completion or arrival without an explicitly designed rule.

Do not promise an exact continuously current position or reliable PWA background tracking. Verify operating-system/platform constraints when planning the native/mobile phase. Do not build GPS collection, background tracking, telemetry storage or a live marker in V1. This feature is separate from the learning work deferred to V3 or later.

**7. Complete discovery and produce the master plan**

Cover tenant onboarding and roles; execution driver/vehicle records; task input before any real ERP exists; geocoding and pin confirmation; assignment and planning; publication and execution; current/next-stop rules; attempts/cancellation/retries; concurrent edits; offline behavior; authentication; dispatcher and driver UX; Arabic/RTL; maps; integration recovery; deployment and operations. Use the actual Stitch screens to make UX questions concrete. Ask about unresolved behavior or genuine gaps, not about layouts already provided.

Design loading, empty, partial-result, stale, pending-sync, permission and failure states. Clarify ambiguous locations, unassigned optimizer work, dependency outages and source changes after dispatch. Keep task acceptance, optimization completion, publication and execution distinct.

When material questions are resolved, produce master-plan.md with agreed scope/exclusions, architecture/technology decisions and reasons, roles, journeys/screens, ownership/data model, state machines, transactional invariants, API/events, monitoring/freshness, offline/conflict handling, deployment, acceptance criteria and limitations. Include the nine-screen mapping, the necessary extensions, resolved design/prototype conflicts and planned visual review. Trace requirements to deliverables and verification. Include a practical future-GPS extension note, not a premature full implementation plan. Do not fix the number of phases before understanding dependencies.

**8. Require real contracts and documentation in the repository**

The HTTP contract covers operations, schemas, validation, IDs/external references, units/timestamps, authentication/scopes, tenant/integration isolation, errors, idempotency, concurrency, asynchronous status, monitoring snapshots/history, limits and compatibility.

The event contract covers IDs/types/schema versions, resource/route versions, source correlation, authorized recipients, signature verification, progress updates, retries, ordering, replay and reconciliation. A task-completed event alone does not describe a complete trip's current/next stop. Trip completion does not imply every task succeeded. Do not leak another integration's tasks or contacts through a shared trip.

Separate server credentials from user sessions; a deep link is not authorization. Keep raw Engine formats and VROOM integer IDs inside adapters. Verify provider semantics against official documentation before finalizing adapters.

Plan and create these actual deliverables; final paths may follow justified repository conventions:
- master-plan.md and a decision log.
- DESIGN.md: the shared visual system extracted from stitch-export, including typography, semantic tokens, spacing, components, map/stop styles, responsive/RTL rules and justified reconciliations. At the inspected snapshot no DESIGN.md was present; create it in the planned foundation phase, or update the existing authoritative equivalent if one has since been added.
- docs/ui-spec.md: source screen IDs/paths and inspected commit; role-aware routes/journeys; existing and required new screens; each action's intended behavior, API/event dependencies and states; prototype conflicts and their disposition; and visual acceptance criteria. Distinguish selected visuals, approved behavior and unresolved proposals. Every approved screen and action must map to an implementation phase; every deviation must have a reason.
- contracts/openapi.yaml: valid machine-readable HTTP contract, plus a usable rendered API reference.
- contracts/events/: versioned schemas with documented verification and delivery semantics.
- contracts/examples/: schema-valid requests, responses, progress events, snapshots and failure examples.
- docs/tracking-and-consistency.md: V1 state/current-next rules, transaction boundaries, invariants, freshness, offline behavior, outbox/inbox processing, recovery and the deferred GPS seam.
- docs/integration-guide.md: setup, credentials, reference mapping, submission, monitoring, webhooks, recovery and authorized UI entry.
- A small mock ERP/webhook receiver with durable inbox/projection behavior and repeatable integration scenarios.
- README updates, a safe .env.example, and docs/operations.md covering setup, deployment, migrations, backups/restoration, health, workers, event lag, failed work and replay/reconciliation.
- docs/implementation-status.md: completed phases, evidence, known limitations and next phase.
- docs/ERP-INTEGRATION-HANDOFF.md: final as-built connection guide referencing released contracts, verified examples, required connector behavior, progress monitoring and the future location boundary.
- docs/phases/: phase plan and a complete copy-paste Codex prompt for each phase.

Keep one authoritative source per definition; generate API reference where practical, validate examples, and detect contract/implementation drift. Empty placeholders or filenames in a plan are not finished artifacts.

**9. After I agree on the master plan, produce executable phases**

Use dependency-driven, reviewable phases; do not attempt a one-shot build. Explicitly assign work for:
- Initial repository assessment and the real contract/documentation foundation.
- Stitch audit, DESIGN.md and UI specification, reusable UI foundations and representative-screen visual review.
- Backend identity, data ownership and transactional delivery execution.
- Durable event synchronization and the mock ERP consumer.
- Connected driver and dispatcher flows built from screens 1–9, plus agreed extensions and confirmed/pending/stale states.
- Offline/concurrency/reconnect recovery where applicable.
- Integration and operational verification, maintained documentation and the ERP handoff.

These are required coverage areas, not a mandated phase count or rigid order. Create contracts before dependent implementations and update them as behavior evolves. Do not leave API documentation and consistency design until the end.

Every phase must have a complete fresh-session Codex prompt containing objective, prerequisites, decisions/files to read, exact scope and later exclusions, implementation tasks, schema/config/documentation changes, acceptance criteria, focused checks and completion conditions. Require Codex to inspect current code and project instructions, preserve unrelated work and data, and adapt to verified earlier-phase outcomes.

Every UI-related phase must name its exact stitch-export/screens/... reference paths and the relevant DESIGN.md and docs/ui-spec.md sections, identify which approved screens/states it implements, and include visual/interaction checks. Relevant backend/contract phases must cover the reads, commands, permissions, errors and synchronization states those screens require. Preserve this mapping in repository documents so a fresh Codex session does not invent a different interface or omit required API operations. Schedule browser screenshots and review where they can correct shared patterns early; record unavailable checks honestly.

Prompts must identify contradictions rather than invent product behavior, report passed/failed/unrun checks accurately, and update implementation-status.md. Each runs only its assigned phase. It must be executable from repository documents without hidden chat memory. Do not hide real credentials or destructive resets in setup instructions.

**10. Define readiness through evidence**

Require a repeatable demonstration with at least two stops: source tasks enter through the API, a trip is planned/published, the driver records an outcome, shared monitoring shows coherent completed/current/next state, and verified events update the mock ERP.

Also verify relevant failures: transaction rollback without partial progress or an emitted event; concurrent/duplicate actions; commit-before-send worker crash; receiver processing crash; duplicate/out-of-order messages; replay/reconciliation; offline conflicts; route/assignment changes; interrupted monitoring recovery; and tenant/integration isolation. Measure online freshness against the agreed target. Match actual messages to schemas.

Verify the connected UI at the agreed mobile/desktop sizes with representative Arabic content: no overlapping/clipped critical text, unintended horizontal scrolling, dead primary actions, fabricated success or misleading current/next/GPS indicators. Check pending-to-confirmed and conflict transitions against real responses, and inspect the implemented screens against the selected references with documented corrections. Keep fixture-based visual checks distinct from integration evidence. List any remaining visual-review or asset-access gaps.

Final handoff must list implemented/released versions and configuration needs where available, exact connector obligations, evidence, unverified steps and limitations. Do not claim “100% ready” because files or code exist. The real shipping ERP and future GPS pipeline remain separate work.

For your FIRST response only: briefly summarize confirmed scope, repository state and the Stitch assets you actually inspected; identify material prototype/scope conflicts and missing information; then ask the next focused batch of questions. Prioritize unanswered product decisions, operational tracking/synchronization behavior and the design conflicts that materially affect scope. If continuing an existing chat, retain its answers and completed work, state what this UI update changes, and continue from that stage. Do not generate the master plan, phase prompts or application code before the applicable discovery and plan-agreement steps. If the plan was already approved, propose only the necessary amendment and continue the existing phase workflow after that amendment is agreed.
