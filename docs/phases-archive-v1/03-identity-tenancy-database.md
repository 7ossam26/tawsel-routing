**SUPERSEDED — historical 11-phase package. Do not execute these prompts. Use the [current 42-phase package](../phases/README.md) under D-109.**

# Phase 03 — Identity, tenancy and application database

Copy this entire file as the implementation prompt. Prerequisites: Phase 01, Phase 02. Master-plan focus: sections 4–6, 10, 13, 17–18 group L.

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

Implement real company/independent identity, sessions, tenant/resource authorization and the PostgreSQL foundations needed by later domain transactions. Verify Phases 01–02 outputs; do not treat UI role selectors as access grants.

## Read and inspect

Read contracts/openapi.yaml and relevant examples, docs/tracking-and-consistency.md identity/authorization and transaction sections, docs/integration-guide.md provisioning, docs/operations.md topology, DESIGN.md, docs/ui-spec.md Routes and actions / State copy and feedback / Driver simplicity, and docs/ui-review.md when present. Inspect stitch-export/screens/04-login-workspace/code.html, metadata.json and screen.png; adapt the shared shell and simple UX already built.

## Implementation tasks

1. Create versioned SQL migrations for application tenancy, identity subjects, users, branch membership, execution driver references, one-role inheritance, direct inherit/allow/deny exceptions, sessions and scoped integration credentials. Establish shared idempotency, audit and transactional outbox persistence needed by these first authoritative changes; the network sender comes in Phase 07. Use tenant-compatible keys/constraints and least-privilege database access. Do not put application tables in Nominatim. Create a real isolated PostgreSQL test harness with reproducible migration setup.
2. Configure a local Keycloak issuer and separate ERP/Tawsel clients through reproducible non-secret configuration. Support separate B2C/company policy and stable issuer+subject identities. Implement authorization-code/PKCE login with backend-managed refresh and secure HttpOnly session cookies, state/nonce/redirect validation, CSRF and rate limits. Do not implement password grant, copy ERP hashes or store browser bearer tokens for normal sessions.
3. Connect the two approved login paths: company code then its authorized identity login; B2C phone/password with verified recovery email, registration/recovery UX and a local email test sink. Email is not the login identifier; no SMS/billing flow. Local email capture is test evidence, not proof of production delivery.
4. Implement versioned provisioning endpoints for branches/users/roles/user exceptions and minimal execution driver/mode records. ERP remains their company administration authority. Use authenticated service scope and verified delegated actor context, not arbitrary actor IDs. Provide fixtures/CLI setup for a tenant, two branches and separate independent accounts; the native mock ERP administration UI comes in Phase 07.
5. Implement effective capabilities and resource filtering: explicit user exceptions override role inheritance, identical capabilities across assigned branches, no cross-tenant or unassigned-driver access. Create reusable guards usable by requests, jobs and exports. Do not rely on a tenant ID from the body or role names.
6. Connect real session/membership feedback to the Phase 02 login/account shell, including disabled/denied membership and session expiration. Establish the same-account reauthentication boundary needed for future pending queues; never clear account-local evidence on auth errors. Domain-aware logout blocking is completed with offline storage in Phase 09.
7. Update contracts, examples, generated client, integration guide and operations instructions with actual issuer/provisioning/session settings and secret rotation/bootstrap boundaries. Keep credentials out of Git and logs.

## Required verification

Create authorization-isolation.test.ts and focused session tests in the API's Vitest integration project. Exercise real authentication/session handlers and PostgreSQL permission queries, one-role overrides, multiple branches, forged actor/body scope, cross-tenant IDs, disabled users, replayed callbacks/invalid CSRF and allowed recovery identity. Verify duplicate provisioning and injected transaction failure against real audit/idempotency/outbox persistence wherever the contract requires outbound intent. External issuer fixtures are labelled; also verify one actual local OIDC round trip.

Run browser login, logout, recovery-email and branch-context paths with the themed RTL UI; verify focus and concise errors. Identify unavailable issuer/email/browser checks honestly. Check that local setup leaves Engine volumes untouched.

## Done / excluded

Real scoped sessions/provisioning and meaningful authorization/database tests exist, with reproducible local identity setup and connected login. This phase does not add commercial ERP administration, billing, shipment execution or fake offline authentication. Next: Phase 04.
