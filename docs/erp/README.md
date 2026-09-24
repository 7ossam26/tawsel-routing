# ERP integration planning — start here

## P22 available slice

Branch interruption/arrival/resume and actual-receipt new cycles are locally implemented. Start with the [public runbook and full-capacity/subset cases](../branch-interruption.md), [field mapping](field-and-status-mapping.md), [consumer quickstart](consumer-quickstart.md) and [evidence](../phase-22-evidence.md). Stable shipment IDs and new execution IDs are explicitly mapped. The copied HTTP-only consumer proves this slice; a real ERP/native source outbox and signed event delivery remain later work.

P21 now supplies [source-branch offers, actual subset receipt and separate disposition](../returns.md), [ordered PostgreSQL/HTTP evidence](../phase-21-evidence.md), native pending/request/result reads and a copied public-only consumer demo. Use the current [field mapping](field-and-status-mapping.md) and [quickstart](consumer-quickstart.md). This supersedes older future-receipt statements below. P22 resume/redispatch, P23 correction, P25–26 transport and P27 native ERP screens/source outbox remain separate.

P18 adds [explicit deferral, whole retry and driver urgency](../eligibility.md), [ordered evidence](../phase-18-evidence.md), typed client and public conformance/demo. Source events retain external identity and prior collection; actual signed transport, receipt dependencies and full driver UI remain their later phases.

P16 now supplies [explicit current/arrival and physical origin](../current-activity.md), [browser/API/PostgreSQL evidence](../phase-16-evidence.md), the typed current client and public-only conformance. P17 now supplies [exact whole-piece outcomes and reported collection](../outcomes.md), [real PostgreSQL/HTTP evidence](../phase-17-evidence.md), typed outcome client and portable consumer checks. Signed delivery/receiver application remains P25–27.

P15 now supplies the [online start/departure contract and demo](../round-start.md), [ordered evidence](../phase-15-evidence.md) and `npm run test:erp:rounds`. Current mapping/quickstart includes active-admission locks and source-scoped start intent. Real ERP and signed delivery remain later phases.

P07 sessions, P08 ERP provisioning, P09 independent intake and P10 ERP snapshot/receipt/admission are implemented and verified locally. See the [P10 contract/demo](../b2b-intake.md) and [P10 evidence](../phase-10-evidence.md). Read [public consumer quickstart](consumer-quickstart.md), [provisioning trust/recovery contract](../provisioning.md) and [P08 evidence](../phase-08-evidence.md). Full receiver/source two-way conformance remains P26–P27; final released handoff remains P42. No real vendor connector or production release is claimed.

Read in this order:

1. [ERP-PLANNING-INPUT.md](ERP-PLANNING-INPUT.md): implemented capability, responsibilities, ordered connector slices and ERP-specific unknowns.
2. [field-and-status-mapping.md](field-and-status-mapping.md): verified identity/source/shipment/intake and actual subset receipt/disposition mapping, canonical fields and separately designed redispatch/correction mappings.
3. [Consumer quickstart](consumer-quickstart.md) and [provisioning](../provisioning.md): working public HTTP setup, scoped identity, versions, rotation/disable, durable issuer status and reproducible proof.
4. [Integration guide](../integration-guide.md), [state model](../tracking-and-consistency.md), [permission contract](../authorization.md) and [identity sessions](../identity.md): authority, transaction boundaries and later delivery obligations.
5. [Operation ownership](../contract-coverage.md), [OpenAPI](../../contracts/openapi.yaml), [provisioning schema](../../contracts/provisioning.schema.json), [common schema](../../contracts/common.schema.json), [event envelope](../../contracts/events/envelope.v1.schema.json), [examples](../../contracts/examples/README.md), [generated reference](../reference/public-contract.md) and [public client](../../packages/api-client/README.md): canonical artifacts, never divergent ERP-owned copies.
6. [Implementation ledger](../implementation-status.md): actual commands, versions, passed/failed/unrun checks and limits.

| Artifact / capability | Status now | Remaining owner |
| --- | --- | --- |
| Common schema/envelopes and generated types | Locally validated, unreleased draft | Each feature completes exact payload semantics |
| P05 command kernel and full/compacted ActionResult | Real PostgreSQL/process/race verification | General action.getResult HTTP remains later; P08 uses authenticated POST replay |
| P06/P07 access guards and real sessions | Locally verified, separate company/personal identity | Production/device verification P39/P41 |
| P08 source/branch/role/user/driver provisioning | 12 commands, two reads, explicit service authentication, source revisions and issuer reconciliation verified locally | Deployment issuer ownership/permissions and native ERP administration |
| Public client and consumer quickstart/conformance | P08 provisioning and P10 intake verified in independent copied consumer processes; no DB imports/credentials | P26 receiver, P27 transactional native source/two-way proof |
| Independent/source intake and atomic receipt admission | P09/P10 implemented and locally verified | P11 locations, P13 planning, P15 departure |
| Execution and reports | Designed only | P15 onward |
| Branch receipt/disposition/redispatch | Designed only | P21/P22/P27 |
| provisioning.changed event | Durable own-source intent produced atomically | P25 signed/sequenced transport; P26 receiver |
| Full signed delivery/independent receiver and docs/verification/integration.md | Not implemented/created | P25/P26/P27 |
| Final docs/ERP-INTEGRATION-HANDOFF.md and release-manifest.json | Not created; no release identity/digests invented | P42 |

Use npm run contracts:check, npm run test:contracts and the public client typecheck for canonical conformance; npm run test:provisioning for actual isolated PostgreSQL/provider-fixture proof; npm run test:erp:provisioning for running public HTTP; npm run test:browser:provisioning for actual local Keycloak/Chromium. Their setup and effects are in the quickstart. The CLI journal is not a transactional ERP outbox, and local email/localhost is not production SMTP/TLS evidence.

ERP owns commercial records, company users/roles/branches and credential administration. Tawsel accepts execution projections. P08 service credentials cannot impersonate staff; human assertions are rejected. Connector ownership may be vendor/agency, Tawsel or joint. Discover supported APIs/webhooks/authentication/stable IDs/import-export before promising compatibility. No ERP source-code/database access or universal compatibility is implied by the reference consumer.
