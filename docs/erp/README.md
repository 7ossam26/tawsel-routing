# ERP integration planning — start here

**Phase 02 foundation is schema-verified locally; all business integration behavior is designed and unavailable.** There is no released API, real ERP connector, mock receiver, consumer quickstart or final release manifest yet. These files are planning inputs for an ERP implementer, not an integration certificate.

Read in this order:

1. [ERP-PLANNING-INPUT.md](ERP-PLANNING-INPUT.md): responsibilities, supported generic concepts, ordered future connector work, constraints and ERP-specific unknowns.
2. [field-and-status-mapping.md](field-and-status-mapping.md): source versus Tawsel identities, field authority, meaningful state distinctions and designed worked mappings.
3. [Integration guide](../integration-guide.md): provisioning, authentication/actor obligations, source commands, signed events, versions, retention and old queues.
4. [State and consistency model](../tracking-and-consistency.md): actors, records, quantities, authority, transaction boundaries and the two-of-three correction/return walkthrough.
5. [Operation ownership](../contract-coverage.md), [OpenAPI](../../contracts/openapi.yaml), [common schema](../../contracts/common.schema.json), [event envelope](../../contracts/events/envelope.v1.schema.json), [examples](../../contracts/examples/README.md), [generated reference](../reference/public-contract.md) and [public client types](../../packages/api-client/README.md): canonical artifacts; do not copy them into divergent ERP-owned schema definitions.
6. [Phase evidence](../phase-02-evidence.md) and [implementation ledger](../implementation-status.md): actual commands, versions, passed/failed/unrun checks and limits.

| Artifact / capability | Status now | Next owner |
| --- | --- | --- |
| Common IDs/money/versions/envelopes/error schemas; example validation | Implemented tooling, verified locally; protocol draft | Each feature completes exact payload schemas before handlers |
| Generated public client `packages/api-client/src/schema.d.ts`, version 0.1.0 | Verified portable types; no business methods | Each feature adds real operations, then regenerates |
| P05 ActionResult full/compacted recovery shape and internal command kernel | PostgreSQL-local verified; HTTP retrieval unavailable | P06–P08 trusted bindings, each feature's payload/record semantics |
| State model, operation catalog, planning/mapping/guide | Designed obligations with local consistency checks | P08/P10/P21/P22/P25–27 maintain alongside implementation |
| Identity/source provisioning and task admission | Designed only | P08/P10 |
| Native branch receipt, disposition and redispatch | Designed only | P21/P22; native mock source P27 |
| Signed durable delivery / independent receiver | Designed only | P25/P26 |
| External consumer quickstart `docs/erp/consumer-quickstart.md`, conformance `tests/erp-conformance/`, verification `docs/verification/integration.md` | Not created; no working consumer setup to follow yet | P26 receiver; P27 two-way proof |
| Final `docs/ERP-INTEGRATION-HANDOFF.md` and `docs/erp/release-manifest.json` | Not created; no release identity/digests invented | P42 |

Today’s repeatable check is `npm ci` then `npm run contracts:demo`, `npm run test:contracts`, and `npm run typecheck -w @tawsel/api-client`. These use published-shape artifacts locally, without Tawsel database/domain imports. They establish schema/client consistency, **not external HTTP interoperability or transaction durability**. The [handoff deliverables plan](../planning/erp-handoff-deliverables.md) defines the later proof.

P05 separately proves internal transaction durability across application-process restart, duplicate races, rollback and response compaction with `npm run test:database` against isolated PostgreSQL. [P05 evidence](../phase-05-evidence.md) and [database setup/demo](../operations.md#dedicated-postgresql-lifecycle) reproduce it. This is not a consumer HTTP quickstart or a released endpoint.

P03 adds [designed UI action coverage](../ui-actions.md), including explicit external/native ERP surfaces and distinct waiting/receipt/acceptance/application labels. It changes no public payloads. `python -X utf8 scripts/check-ui-spec.py check` verifies document coverage from the repository root (Python 3.12 used); it is not the missing external consumer conformance suite. P26/P27 still own that quickstart and proof; none is fabricated here.

Connector ownership may be the ERP vendor/agency, Tawsel or both. Begin with discovery of the ERP’s supported API/webhook/authentication/stable-ID/import-export mechanisms. Source-code/database access is not required; a vendor with no suitable interface may need cooperation or an adapter. Compatibility targets Tawsel’s released protocol, not any ERP’s internal schema or an automatic promise to support every ERP.
