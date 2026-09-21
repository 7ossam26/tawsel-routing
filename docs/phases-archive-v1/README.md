**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Tawsel implementation phases

Prepared: 21 September 2026. Baseline: [master-plan.md](../../master-plan.md), incorporating owner decisions through D-108 in [the discovery log](../../TAWSEL-DISCOVERY-LOG.md). The owner's latest instruction authorizes preparing this phase package. No application phase was executed while writing it.

## How to use this package

1. Start with [Phase 01](01-foundation-contracts-design.md). Copy the entire file as the prompt for a Codex task in this same repository.
2. Let that task finish its assigned phase and update [implementation-status.md](../implementation-status.md). Read its concrete result, passed/failed/unrun checks and any material issue.
3. Run the next numbered prompt against the resulting checkout. Keep earlier code, contracts and documentation available; prompts do not depend on this chat. Do not run them concurrently against the shared checkout.
4. If a material prerequisite is broken or a product contradiction is discovered, resolve that specific issue before dependent work. Missing external access should not stop independent local preparation, but an unavailable check is never a pass.
5. Use the interactive Phase 02 preview to give early UX feedback. Record actual comments in docs/ui-review.md. Backend work need not wait for unrelated visual comments; later UI work must address explicit rejected patterns and preserve the approved simple design. Do not invent owner approval if no review happened.
6. Phase 11 produces a truthful readiness/handoff report. No public launch, real ERP, automatic server purchase or data reset follows from the existence of these files.

Each file is a complete prompt: objective, prerequisites, source documents, scope, concrete tasks, affected contracts/schema/config/docs, focused tests, exclusions and handoff. Shared working rules are included inside each prompt so the owner need not concatenate another instruction file.

## Sequence and deliverables

| Phase / copy-paste prompt | Main reviewable result |
| --- | --- |
| [01 — Repository, contracts and design foundation](01-foundation-contracts-design.md) | Valid contracts/examples, state model, design/UI specification and runnable workspace |
| [02 — UI foundations and early driver UX review](02-ui-foundation-review.md) | Reusable components and a simple representative driver/desktop preview with visual evidence |
| [03 — Identity, tenancy and application database](03-identity-tenancy-database.md) | Real sessions, tenant/branch permissions, identity provisioning and isolated PostgreSQL tests |
| [04 — Task intake, locations and route planning](04-intake-maps-planning.md) | Persistent intake, confirmed locations, real map assets and validated route plans |
| [05 — Transactional execution and coherent monitoring](05-execution-monitoring.md) | Atomic outcomes/quantities, online start, workday/device ownership and coherent progress |
| [06 — Source-branch returns and bounded corrections](06-returns-corrections.md) | Actual source-branch receipt/disposition, bounded correction and redispatch invariants |
| [07 — Durable synchronization and native mock ERP flows](07-durable-integration-mock-erp.md) | Reliable sender/receiver workers and native mock ERP with crash/replay evidence |
| [08 — Complete connected driver and dispatcher journeys](08-connected-online-journeys.md) | All required online driver/dispatcher journeys connected to real APIs |
| [09 — Offline PWA, replay and device recovery](09-offline-device-recovery.md) | Durable offline capture/replay, safe updates and ownership conflict recovery |
| [10 — Workday reports, forecast comparison and Excel](10-reports-timing-excel.md) | Authorized timing/results reports and matching real Excel exports |
| [11 — Operational verification, pilot deployment and ERP handoff](11-operations-verification-handoff.md) | Measured recovery/freshness, pilot deployment evidence and as-built ERP handoff |

Execute in numeric order. The code dependencies are cumulative, while feedback can arrive between phases. This division keeps foundation, visual review, identity, planning, execution, returns, durable integration, connected UI, offline recovery, reporting and operational proof independently reviewable; it is not a duration estimate.

## Non-negotiable boundaries

- Requirements/owner decisions define operations and permissions. The nine Stitch exports are visual layout/design-system references, not a fixed product screen count or a button inventory to copy.
- Use React/TypeScript/Vite, shadcn/ui + Smooth UI, Node/Fastify, PostgreSQL, OIDC/Keycloak, MapLibre/PMTiles and the existing Engine. Select exact mutually supported versions during implementation.
- Driver UX must stay very simple: obvious purpose, current requirement, next action, missing input and waiting state. Add/remove/adapt controls; use focused sheets/pages only when they reduce effort. No crowded action panels, nested modals or technical internals in routine copy.
- Vitest files test important connected behavior alongside implementation. PostgreSQL transaction/locking/outbox claims need real isolated PostgreSQL. Playwright/browser/device checks establish the separate UI/PWA evidence.
- Every new round starts online after sync; already-started downloaded work can continue offline. One active round/execution owner, with explicit online same-driver takeover and preserved delayed evidence.
- ERP owns commercial records, preparation/initial assignment and native actual source-branch receipt/disposition. General staff execution edits, including urgency, stop after departure. B2C has no item splitting/custody/billing.
- Preserve atomic state/progress/audit/idempotency/outbound intent. Network delivery is at least once with durable reconciliation, not distributed ACID or exactly-once networking.
- Preserve Engine data and original UI exports. App releases do not trigger OSM import or routing preprocessing. No GPS, call counters, incentives, advanced POD, global fleet allocation or real shipping ERP.

## Status and evidence rules

[implementation-status.md](../implementation-status.md) is the authoritative execution ledger. At package creation all eleven phases are **not started**. The presence of a prompt, schema or screenshot does not imply a feature is implemented.

For each phase record implementation status, verification status, owner feedback, relevant commit/config versions, commands/results, known limits and prerequisites for the next phase. A phase can have implemented code and an unavailable device/target check; report both rather than compressing them into an unqualified “complete.” Required unresolved readiness checks remain visible through Phase 11.

The [coverage matrix](coverage-matrix.md) assigns required business behaviors, API/events, screens, documents, Vitest files and acceptance groups to phases. Update it if actual boundaries change, keeping one canonical definition in the appropriate contract/state/UI document rather than copying divergent rules.

## Artifact availability before Phase 01

Currently available: master plan, discovery log, historical Engine/context files, original Stitch exports, repository/UI assessment, this phase package and the implementation-status ledger.

Phase 01 creates DESIGN.md, docs/ui-spec.md, docs/tracking-and-consistency.md, contracts/openapi.yaml, contracts/events, contracts/examples, generated API/client tooling, docs/contract-coverage.md and initial substantive integration/operations guides. Later prompts deliberately name those prerequisite outputs. Their absence before Phase 01 is expected; do not substitute empty placeholders now.

Phase 02 creates docs/ui-review.md. Later phases create integration verification, reporting and final readiness/handoff documents as real evidence becomes available. This package does not claim those future artifacts exist.

## Baseline choices that require implementation evidence

The baseline includes a visible paused-customer/branch-service interruption treatment at route capacity; one-second active polling and a ten-second stale threshold; thirty-day full retry/replay response targets with longer-lived deduplication identity; and proposed server-data RPO ≤15 minutes/RTO ≤4 hours. These are documented design/operational targets, not measured guarantees. Phase 01 makes their contracts/invariants precise without changing accepted business rules. Phases 04–10 exercise behavior; Phase 11 measures operational fitness. If actual evidence exposes a material contradiction, document it and obtain the specific product decision rather than silently weakening scope or restarting discovery.

Actual host/co-location, domains/TLS, email sender, backup destination, map coverage and physical-device evidence are environment setup needs. Prepare and verify everything possible before requesting missing values. Do not infer a clean server or claim target readiness from local tests.
