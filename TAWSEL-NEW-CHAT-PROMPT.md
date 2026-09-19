# Tawsel — Engine Application Discovery and Codex Planning Prompt

Updated: 19 September 2026. Includes V1 operational tracking, transactional correctness, reliable ERP synchronization, and a deferred V2/V3 live-location extension.

Act as a senior business analyst, software architect, and pragmatic software engineer. I am the product owner and tech lead. Help me turn an agreed architecture into a thoroughly specified application, then into phased implementation prompts for Codex.

Our project is Tawsel. Focus ONLY on extending this existing repository:
https://github.com/7ossam26/tawsel-routing

Build the shared delivery application's backend and frontend around its existing routing/geocoding Engine. The shipping ERP and other business systems will be separate projects later. Design and verify their integration boundary now using a small mock ERP/receiver, without building the actual ERP.

Read this entire prompt and both attached documents before responding:
- STACK-CONTEXT.md: the existing local Engine setup and historical operational report.
- TAWSEL-ENGINE-CONTEXT.md: the agreed architecture and proposed integration design, including the latest tracking/consistency amendment.

Inspect the repository when tools allow, including project instructions, configuration, README and current implementation. Record the inspected commit. Distinguish observed code from historical reports, confirmed decisions from proposals, and implemented behavior from planned behavior. Do not claim inspection or testing you could not perform. If access is unavailable, request only missing source files that materially affect a decision and continue supported discovery. Surface contradictions; my latest explicit decisions govern intended scope.

If this prompt is supplied to an ongoing planning chat, preserve its confirmed answers and completed work. Apply the new tracking requirements, identify the affected decisions/documents, and ask only questions that remain unresolved or need reconsideration. Do not restart discovery automatically.

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

**3. Make operational tracking an explicit V1 feature**

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

**4. Turn ACID and synchronization into concrete guarantees**

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

**5. Prepare the future GPS boundary without building it now**

Keep business execution state separate from future location telemetry. Document how stable tenant, driver, device/session and assignment/trip identities can support authorized location samples later. The future module may initially share the backend; it does not require a separate service or database today.

Record a future contract sketch covering coordinates, accuracy, sample time, server receipt time and deduplication/session sequencing. Consider stale/out-of-order samples, last-known-position age, visibility, permissions, retention and optional history. Treat these as future design decisions, not active V1 endpoints or mandatory empty tables.

A later shared map layer can display authorized driver locations for both Tawsel and ERP users. A location sample is not a delivery outcome; do not automatically derive completion or arrival without an explicitly designed rule.

Do not promise an exact continuously current position or reliable PWA background tracking. Verify operating-system/platform constraints when planning the native/mobile phase. Do not build GPS collection, background tracking, telemetry storage or a live marker in V1. This feature is separate from the learning work deferred to V3 or later.

**6. Complete discovery and produce the master plan**

Cover tenant onboarding and roles; execution driver/vehicle records; task input before any real ERP exists; geocoding and pin confirmation; assignment and planning; publication and execution; current/next-stop rules; attempts/cancellation/retries; concurrent edits; offline behavior; authentication; dispatcher and driver UX; Arabic/RTL; maps; integration recovery; deployment and operations.

Design loading, empty, partial-result, stale, pending-sync, permission and failure states. Clarify ambiguous locations, unassigned optimizer work, dependency outages and source changes after dispatch. Keep task acceptance, optimization completion, publication and execution distinct.

When material questions are resolved, produce master-plan.md with agreed scope/exclusions, architecture/technology decisions and reasons, roles, journeys/screens, ownership/data model, state machines, transactional invariants, API/events, monitoring/freshness, offline/conflict handling, deployment, acceptance criteria and limitations. Trace requirements to deliverables and verification. Include a practical future-GPS extension note, not a premature full implementation plan. Do not fix the number of phases before understanding dependencies.

**7. Require real contracts and documentation in the repository**

The HTTP contract covers operations, schemas, validation, IDs/external references, units/timestamps, authentication/scopes, tenant/integration isolation, errors, idempotency, concurrency, asynchronous status, monitoring snapshots/history, limits and compatibility.

The event contract covers IDs/types/schema versions, resource/route versions, source correlation, authorized recipients, signature verification, progress updates, retries, ordering, replay and reconciliation. A task-completed event alone does not describe a complete trip's current/next stop. Trip completion does not imply every task succeeded. Do not leak another integration's tasks or contacts through a shared trip.

Separate server credentials from user sessions; a deep link is not authorization. Keep raw Engine formats and VROOM integer IDs inside adapters. Verify provider semantics against official documentation before finalizing adapters.

Plan and create these actual deliverables; final paths may follow justified repository conventions:
- master-plan.md and a decision log.
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

**8. After I agree on the master plan, produce executable phases**

Use dependency-driven, reviewable phases; do not attempt a one-shot build. Explicitly assign work for:
- Initial repository assessment and the real contract/documentation foundation.
- Backend identity, data ownership and transactional delivery execution.
- Durable event synchronization and the mock ERP consumer.
- Driver UX and dispatcher progress monitoring with confirmed/pending/stale states.
- Offline/concurrency/reconnect recovery where applicable.
- Integration and operational verification, maintained documentation and the ERP handoff.

These are required coverage areas, not a mandated phase count or rigid order. Create contracts before dependent implementations and update them as behavior evolves. Do not leave API documentation and consistency design until the end.

Every phase must have a complete fresh-session Codex prompt containing objective, prerequisites, decisions/files to read, exact scope and later exclusions, implementation tasks, schema/config/documentation changes, acceptance criteria, focused checks and completion conditions. Require Codex to inspect current code and project instructions, preserve unrelated work and data, and adapt to verified earlier-phase outcomes.

Prompts must identify contradictions rather than invent product behavior, report passed/failed/unrun checks accurately, and update implementation-status.md. Each runs only its assigned phase. It must be executable from repository documents without hidden chat memory. Do not hide real credentials or destructive resets in setup instructions.

**9. Define readiness through evidence**

Require a repeatable demonstration with at least two stops: source tasks enter through the API, a trip is planned/published, the driver records an outcome, shared monitoring shows coherent completed/current/next state, and verified events update the mock ERP.

Also verify relevant failures: transaction rollback without partial progress or an emitted event; concurrent/duplicate actions; commit-before-send worker crash; receiver processing crash; duplicate/out-of-order messages; replay/reconciliation; offline conflicts; route/assignment changes; interrupted monitoring recovery; and tenant/integration isolation. Measure online freshness against the agreed target. Match actual messages to schemas.

Final handoff must list implemented/released versions and configuration needs where available, exact connector obligations, evidence, unverified steps and limitations. Do not claim “100% ready” because files or code exist. The real shipping ERP and future GPS pipeline remain separate work.

For your FIRST response only: summarize confirmed scope and what you actually inspected; identify material conflicts if any; then ask the first focused batch of questions, prioritizing unresolved operational tracking and synchronization behavior. If continuing an existing chat, retain its answers and ask only newly affected or unanswered questions. Do not generate the master plan, phase prompts or application code yet.
