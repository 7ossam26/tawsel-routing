# ERP planning input — as built at Phase 42

26 September 2026 · public API/client/reference **0.1.0**, envelopes/payloads **1.0.0**. [Exact artifact identity](release-manifest.json), [observed proof](../verification/integration.md), [readiness](../verification/pilot-readiness.md).

## Fixed responsibility boundary

Tawsel is the shared Arabic delivery execution application around a private routing Engine. B2C drivers own their simple tasks; a company ERP supplies B2B work. Tawsel implements isolated accounts, location confirmation, durable planning/manual fallback, explicit online round start/current/arrival, outcomes/exact collection, deferral/retry/urgency, return offers, branch continuation, corrections, device evidence/replay, coherent monitoring and authorized reports/XLSX. Public operations and their lifecycle are in [the catalog](../../contracts/operations.json).

The ERP owns orders/customers, authoritative outstanding allocation, company branches/users/roles, initial assignment, native actual receipt/disposition, inventory, taxes/refunds/liability and settlement. The connector must commit its local source change and immutable outgoing intent together, and commit incoming business projection with its processed marker. Neither an HTTP timeout nor a native click proves Tawsel acceptance; receipt is separate from application. No direct cross-database integration is required or offered.

The reference at `apps/mock-erp` is implemented and locally verified: separate PostgreSQL/role, private native OIDC forms, local actor audit, transactional source outbox, signed inbox, projection/recovery and public status. Its single-line EGP form, configured native admin subject list and serial source lane are deliberate reference limits. They are not a proposed commercial ERP schema. [Worked mapping](field-and-status-mapping.md) distinguishes source desired state, Tawsel accepted state and consumer applied state.

## Ordered ERP implementation slices

| Order / owner | Concrete work and dependency | Completion evidence |
| --- | --- | --- |
| 1 — ERP vendor and integration lead | Inventory supported API/webhook/module/import-export surfaces, stable IDs, authentication, transaction hooks and change feed. Name connector and operational owners. | Feasibility record with sample real records and supported access; no promise based solely on the mock. |
| 2 — Identity and Tawsel operators | Reserve tenant/source and issuer subjects; provision restricted integration credentials/grants and separate native/Tawsel OIDC sessions. Decide any existing-user migration explicitly. | Public provisioning conformance; forged actor/wrong scope denied; user disable/issuer status verified. Service `actorId=null` remains distinct from local native actor. |
| 3 — ERP source team | Define stable shipment/line/cycle/branch/user/driver translation and exact outstanding whole-piece allocation. Implement durable source intent, pending status and same-ID recovery. | `source.mjs prepare`, `offline-save`, `resume`; actual source transaction/crash tests and invalid allocation/revision/capacity cases. |
| 4 — ERP execution integration team | Preparation is upcoming; definitive receipt asserts possession. Handle atomic batch rejection, ordinary predeparture changes and postdeparture staff denial. | Two separate same-address tasks; no partial admission on >50; start/removal race and departed edits rejected. Tawsel owns driver execution. |
| 5 — ERP receiver team | Validate raw-byte HMAC/schema/recipient; persist inbox before ACK; atomically apply projection/marker; report application separately; implement gaps/replay/current-state reconciliation. | `receiver.mjs` live duplicate/mismatch/expiry and projection checks; own DB crash/gap/expired-history tests. Snapshot coverage never manufactures past financial transitions. |
| 6 — Native branch team | Show per-driver/source-branch requests; confirm only physically received pieces; retain unresolved/lost/damaged separately; create new dispatch only from actual compatible receipts with explicit new outstanding prices. | `source.mjs execute`: one-piece partial + no-answer, one receipt, one loss, three unresolved pieces, fresh one-piece cycle, old history preserved. |
| 7 — Reporting integration team | Consume authorized human-session reports/export where required; retain exact minor units, missing/uncertain times and effective corrections. ERP service tokens do not acquire report/driver authority. | Two-task public report and parsed XLSX in final source conformance; same IDs/snapshot/amount, no executable formulas. |
| 8 — Named operations owners | Configure approved TLS/callback/keys, scheduling/alerts, explicit retention, independent backups, upgrade/recovery and supported load. Repeat conformance on vendor and target topology. | Real deployment inventory and failures, timed independent restore, vendor-native transaction tests and supported load evidence. Local reference proof cannot finish this slice. |

Tawsel operators bootstrap sources and reserve subjects; consumers receive only their scoped public credential, URLs and signing configuration. Native staff identity is authenticated by the ERP and audited locally. Current Tawsel source commands are delegated service operations, not arbitrary human assertions. Driver actions use a separate genuine driver session/CSRF/device context. Role names grant nothing; direct inherit/allow/deny and branch/lifecycle restrictions remain server-enforced.

## Decisions required from the real ERP project

| Topic | Known Tawsel obligation | Still unknown; owner must choose |
| --- | --- | --- |
| Identity | Immutable issuer+subject, separate company/personal identity and separate app sessions | Actual issuer federation, subject reservation/migration, user lifecycle and credential recovery owner |
| Entity keys | Stable source-scoped external IDs and distinct dispatch/attempt references | Vendor keys, aliases, reuse policy and supported lookup/change-feed interfaces |
| Allocation | Whole pieces, explicit split permission, exact outstanding per-unit/fee money | Vendor deposit/discount/tax allocation source; unsupported fractional or ambiguous models require an explicit adapter decision |
| Native workflows | Prepared/received/actual return/disposed distinct; no departed staff overwrite | Existing ERP screens, staff branch policy and audit integration |
| Durability | Source outbox/inbox/processed marker in local atomic commits; immutable command retry | Database and transaction hooks, worker supervision, ordering partitions and replay storage |
| Network and keys | Scoped expiring credentials, approved callback, exact-byte verification/rotation | DNS/TLS, egress/private routing, secret provisioning/escrow and rotation ownership |
| Recovery and release | Preserved action/event identity, explicit history gaps, old payload readers | Backup failure domain, retention, monitoring/on-call, migration/rollback and real volume tests |
| Business posting | Execution collection is reported money; receipt is a physical assertion | Inventory availability, accounting postings, liability/refund/settlement rules |

These unknowns do not reopen accepted Tawsel custody, departure, subset, idempotency or ownership rules. They are not placeholder Tawsel features. No automatic field/identity migration or compatibility with every ERP is promised.

## Readiness and boundaries

Current local reference evidence is reusable now. Required live pilot evidence remains listed in [A–P readiness](../verification/pilot-readiness.md): Engine/target/device/elapsed-offline/owner/capacity/independent recovery. The final package uses real relative paths and digests; follow the [quickstart](consumer-quickstart.md) without chat history or internal Tawsel access. GPS, native mobile, learning, billing, settlement and real ERP development remain outside this handoff.
