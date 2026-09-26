# Tawsel → ERP integration handoff

26 September 2026 · Phase 42 · **local handoff candidate, live pilot not approved**.

The application and private reference ERP have implemented public boundaries for identity projection, intake, execution, signed delivery, independent application, source receipt and reporting. The real shipping ERP is a separate project. Its fields, identities and commercial workflows do not migrate automatically.

## Start here

1. [ERP index](erp/README.md) and [planning input](erp/ERP-PLANNING-INPUT.md): ownership, known capabilities, ordered connector work and decisions still required.
2. [Field/status mapping](erp/field-and-status-mapping.md): proven reference mapping, independent identities/revisions, exact quantities/money and recovery obligations.
3. [Consumer quickstart](erp/consumer-quickstart.md): package, install in a clean directory, scoped inputs and complete two-task conformance.
4. [Canonical OpenAPI](../contracts/openapi.yaml), [operations](../contracts/operations.json), [examples](../contracts/examples/README.md), [generated reference](reference/public-contract.md) and [public client](../packages/api-client/README.md).
5. [Actual final integration evidence](verification/integration.md), [phase checkpoints](phase-42-evidence.md), [all 65 requirements](verification/requirement-ledger.md) and [A–P readiness](verification/pilot-readiness.md).
6. [Release manifest](erp/release-manifest.json): exact base commit, uncommitted candidate identity, supported versions, artifact paths and SHA-256 digests. Its existence is not deployment evidence.

## As-built boundary

| Owner | Implemented responsibility | Proof and limits |
| --- | --- | --- |
| ERP / connector | Commercial/source records; branches, roles, users and driver references; preparation/received assignment; actual native subset receipt/disposition; own transactional source outbox | [Native source protocol](erp/source-protocol.md). Reference OIDC staff identity is audited locally; public service commands have verified service identity and `actorId=null`. No human impersonation. |
| Tawsel | Isolated personal/company execution, locations, plans/forecasts, explicit online start, current/arrival/outcomes, bounded correction, returns/branch continuation, offline evidence/replay, monitoring and reports/XLSX | [State/consistency](tracking-and-consistency.md), [operation audit](verification/contract-audit.json), connected PostgreSQL and browser evidence. Engine results are controlled fixtures/manual routes where stated. |
| Tawsel sender | Atomic committed event intent, exact signed bytes, recipient sequences, durable leases/retry/status/replay | [Sender protocol](outbox-delivery.md). A received acknowledgement is transport evidence. |
| ERP receiver | Signature/schema/scope validation; durable inbox before acknowledgement; atomic projection + processed marker; gaps, replay and current-state reconciliation | [Receiver protocol](erp/receiver-protocol.md). Application is a separate authenticated checkpoint report. Missing history stays visible; no financial transition is invented. |
| Identity operator | Shared company issuer, reserved immutable subjects, separate ERP/Tawsel clients/sessions, credential administration/recovery | [Provisioning](provisioning.md), [identity](identity.md). Production issuer/TLS/recovery mail and future ERP identity migration are unverified. |
| Deployment operator | Migration runner, API/web/worker configuration, private Engine access, diagnostics, backups and release/recovery | [Deployment](deployment.md), [diagnostics](diagnostics.md), [recovery](recovery.md), [operations](operations.md). Target execution and independent restore remain open. |

## Versions and release identity

API/client/reference package version is **0.1.0**. OpenAPI is **3.1.1**, JSON Schema **2020-12**, action/payload/event versions **1.0.0**; the report definition is **1.0.0**. Application migrations are **0001–0028**; reference ERP migrations **0001–0004**. The browser uses Dexie schema version **2** with retained v1 action readers. These are separate version axes.

The build retains Node **24.19.0**, npm **11.1.0**, Fastify **5.12.5**, pg **8.23.0**, TypeScript **6.0.2**, Vitest **5.0.1**, Playwright **1.63.0**, PostgreSQL **18.4** and local Keycloak **26.7.4**. Container pins in [base-images.json](../deploy/base-images.json) are configured inputs; no application image/tag, deployed build or live Engine image/dataset was verified. The manifest derives package/protocol versions from actual artifacts. It records the base Git commit plus a content hash of the candidate source files because this phase does not commit or publish.

The catalog contains **187 entries**, including **133 published HTTP method/path pairs**, internal operations, local actions and events. `progress.snapshot` and `integration.applicationReported` are reserved, unavailable webhook names. Their current use cases use coherent HTTP snapshots and authenticated applied-checkpoint reports. Account evidence notifications are not ERP-recipient business events. `/health` is workspace liveness; `/internal/diagnostics/*` is operator-only. The consumer's `/api/v1/consumer/*` and `/api/v1/source/status` run at its own base URL. Native `/native/*` forms are private reference implementation details.

## Reproduce the package and proof

From the checkout, supported Node/npm and installed locked dependencies:

```powershell
npm run source:demo
npm run erp:package
npm run erp:verify
```

`erp:package` checks canonical generation, builds the public client/reference runtime, and creates `dist/erp-handoff/` plus the tracked manifest. The distribution contains canonical contracts/examples, generated client, reference source/build/migrations, portable checkers and documentation/evidence. `source:demo` orchestrates disposable local systems and installs a clean copied consumer with `npm ci --ignore-scripts`; it keeps operator setup outside the consumer. Required local PostgreSQL/Keycloak setup and manual external commands are in the quickstart. Missing credentials/services fail the proof.

The clean public journey provisions one driver and two separate same-address shipments, prepares then explicitly receives them, performs manual planning/start, partial delivery and no-answer, validates the report/XLSX, receives one returned piece, records a separate lost piece and creates a fresh one-piece dispatch. API outage and process restarts preserve the original source action. Signed replay/duplicate/mismatch/expiry checks compare independent application with public authoritative snapshots. Exact results, failures and command versions belong to [integration evidence](verification/integration.md), not an inferred success from these instructions.

## Readiness and remaining conditions

Local verification does not establish a live pilot. Required conditions remain: live Nominatim/OSRM/VROOM profiles and datasets; physical Android/Chrome and iPhone/Safari; actual approximately 24 elapsed offline hours; owner comprehension/accessibility review; target container/Dokploy/TLS/email/network and map verification; chosen pilot-load capacity; independent backup/key/alert recovery with measured RPO/RTO. P38's higher-load ERP p95 upper bound **6309ms** missed **5000ms**. P40's **68.5367s** small same-host restore is local evidence only. Shared-IP context polling encountered 429 in P41 and needs target measurement.

[Readiness](verification/pilot-readiness.md) names the evidence, practical effects and owners. No requirement is waived. GPS, native mobile, learning, billing, direct driver transfer and financial settlement remain future boundaries, without speculative endpoints or launch gates. The owner controls any rollout and the separate real ERP project.
