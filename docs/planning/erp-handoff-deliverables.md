# ERP handoff deliverables and proof plan

Package revision 3 · D-111, amended by D-112 · Planning only; the integration deliverables below remain future phase work.

This document makes the future ERP handoff explicit. It is an implementation obligation, not an as-built integration certificate. The files below are future deliverables until their owner phase creates substantive, tested content. The final bundle must let an implementer plan and build the real shipping ERP without this chat.

## Connection boundary

The real ERP connects to Tawsel through the released, versioned authenticated HTTP API and signed webhook/event protocol. That public boundary—not Tawsel source code, domain modules, database tables or any ERP's internal implementation—is the compatibility target. Tawsel uses the existing Nominatim/OSRM/VROOM Engine internally. The consumer must use public URLs, credentials, stable external IDs and the documented idempotency, revision and recovery semantics; it does not import Tawsel internals, share either application's database, use cross-database joins, know Tawsel routing payloads or rebuild its driver/map application.

An ERP-side connector/adapter translates its ERP-specific records, statuses and workflows into the public delivery contract. It may be owned by the ERP vendor/agency, Tawsel or both. Before planning that connector, assess available REST/API, webhooks, integration modules, authentication, stable external IDs, import/export interfaces and other vendor-supported mechanisms. An ERP with no suitable surface may need vendor cooperation or an ERP-side adapter and may not be feasible automatically.

The public contract is technology-neutral. A TypeScript client and the mock/reference ERP are conformance aids, not requirements that a real ERP use the same language, schema or workflow. Compatibility with a specific ERP is verified when its connector is mapped, built and tested; the reference implementation proves the released boundary and recovery obligations, not that every real ERP integrates identically.

## Phase responsibilities

| Phase | Concrete responsibility | Evidence before calling it complete |
| --- | --- | --- |
| [02](../phases/02-state-contract-foundation.md) | Establish public contract/state vocabulary, operation ownership, versioning and the ERP planning/mapping document structure. | Valid common schemas/examples and explicit designed versus implemented status. No invented working endpoints. |
| [08](../phases/08-erp-provisioning-actor-binding.md) | Publish company/branch/user/driver identity mapping, trusted service/actor binding and provisioning setup. | Real authorized calls and denied forged/wrong-scope context. |
| [10](../phases/10-b2b-intake-admission.md) | Specify source shipment/dispatch references, required fields, preparation/receipt and atomic admission. | Valid source examples, duplicate/conflict responses and concurrent admission checks. |
| [21](../phases/21-source-return-receipt.md) / [22](../phases/22-branch-interruption-redispatch.md) | Complete actual subset receipt, separate disposition and new-dispatch mapping. | No inferred stock receipt, lost pieces or accidental reopening of the old dispatch cycle. |
| [25](../phases/25-outbox-signed-delivery.md) | Complete event catalog, exact signature input, rotation, retries, delivery statuses and replay rules. | Actual sender restart/response-loss/signature checks; received remains distinct from applied. |
| [26](../phases/26-mock-inbox-projection-recovery.md) | Build a separate external receiver and reusable public-boundary conformance checks. Start the consumer quickstart. | Separate database and restricted credentials; real HTTP, durable inbox, atomic projection, duplicates, gaps and recovery. |
| [27](../phases/27-native-mock-erp-source.md) | Complete the reference ERP source, native forms, source outbox, two-way quickstart and worked field/status mapping. | Repeatable two-task journey and failure recovery using only released public interfaces. This is the first complete two-way reference for real ERP planning. |
| [28–41](../phases/README.md) | Keep the public contract and handoff inputs current when UI, offline, reporting or deployment exposes a change. | Updated schemas/examples/client/mapping and focused regression evidence in the phase making the change. |
| [42](../phases/42-final-contract-readiness-handoff.md) | Audit and assemble the final versioned handoff with clean consumer setup and truthful limits. | Another implementer can follow the quickstart with published artifacts and scoped credentials, and run the relevant conformance checks without Tawsel internals. |

Do not postpone discovery of an unusable external API to Phase 42. Phases 26–27 must already prove the boundary; Phase 42 audits final drift, repeats the relevant final-release checks and packages the result.

## Files to take into the real ERP planning project

| Future artifact | First owner / completion | What the ERP implementer gets |
| --- | --- | --- |
| `docs/erp/README.md` | 02 / 42 | Start-here index and reading order, with designed/implemented/verified status and links to actual bundle contents. |
| `docs/erp/ERP-PLANNING-INPUT.md` | 02 / 27 / 42 | Existing Tawsel capabilities, ERP responsibilities, workflows to implement, known constraints and a concrete checklist of ERP-specific choices still required. |
| `docs/erp/field-and-status-mapping.md` | 02; maintained by 08, 10, 21–27 / 42 | Entity/field/state/command/event ownership and worked mappings to the reference ERP. Unknown real-ERP fields stay clearly unchosen. |
| `contracts/openapi.yaml`, `contracts/events/`, `contracts/examples/` | 02 foundation; each feature / 42 | Versioned HTTP and event schemas with validated requests, errors, events and replay/receipt examples. |
| Generated public client and API reference | 02 tooling; each feature / 42 | Reproducible generation and pinned package/build instructions; a portable public artifact with no domain/database dependency. Record its actual output path and version. |
| `docs/integration-guide.md` | 02; extended 08, 10, 21, 25–27 / 42 | Provisioning/auth, actor binding, operation sequence, idempotency/revisions, signatures, compatibility and failure recovery. |
| `docs/tracking-and-consistency.md` | 02; every affected feature / 42 | State transitions and authority, pieces/money conservation, timestamps, device evidence and consistency obligations. |
| `docs/erp/consumer-quickstart.md` | 26 receiver / 27 two-way / 42 final run | Exact install/build/start/test commands, required versions, example configuration and expected observations for an external consumer. |
| `tests/erp-conformance/` and reference mock ERP source | 26 / 27 / 42 | Reusable checks configurable by API/callback URLs and scoped test credentials, plus an identifiable reference connector. Document real implementation paths and how to run outside a Tawsel-internal development setup. |
| `docs/verification/integration.md` | 26 / 27 / 42 | Actual commands, versions, messages, pass/fail/unrun results, failure injection and remaining interoperability limits. |
| `docs/ERP-INTEGRATION-HANDOFF.md` | 42 | Final as-built handoff, supported public versions, links to the bundle, proven boundaries and remaining real-connector work. |
| `docs/erp/release-manifest.json` | 42 | Actual code/release identity, contract/client/schema versions, relative artifact paths and SHA-256 digests for the released bundle inputs. No secrets or claims based on intended versions. |

The manifest is created from the final real artifacts; exclude its own digest and keep referenced artifacts stable during validation. Avoid conflicting copies of schemas or examples: the handoff indexes the canonical versions and explains how to package them with the generated public client/reference connector.

## Mandatory substance of the planning and mapping files

The planning input must distinguish Tawsel's implemented execution/progress/route/report responsibilities from ERP-owned commercial records, native administration, prepared/received assignment, actual branch receipt/disposition and connector reliability. Include the smallest ordered implementation slices needed on the ERP side, their dependencies and how each is verified against the conformance suite. This is integration input for the later ERP plan; do not invent the ERP's accounting, inventory valuation or full business schema.

The mapping must include, for every relevant entity/operation:

- Source ERP identifier versus Tawsel identifier and scope: company/tenant, integration/source, branch, user/actor, driver, shipment, dispatch cycle, round/workday and attempt when exposed.
- Authority to create/change fields and states, required/optional/null semantics, revision/concurrency rules and duplicate/conflict treatment.
- Whole pieces, minor-unit money/currency and timestamp provenance; separate delivered, held, return-requested, actually branch-received and lost/damaged facts.
- The public command/event or authoritative read that carries each change; prepared/received/accepted/applied/pending/rejected must not collapse into one generic ERP status.
- Worked valid and rejected reference-ERP examples, and an explicit unfilled real-ERP mapping column where its schema is not yet known.

List genuine decisions for the future ERP: its identifiers/schema/status model, trusted identity deployment, native role/branch administration, durable outbox/inbox storage, scheduling/reconciliation workers, endpoints/network/TLS and secret provisioning, operational ownership and tested upgrade procedure. Preserve existing product decisions; unknown ERP choices do not reopen accepted Tawsel behavior.

## Reproducible external proof

The external consumer runs in its own process with its own database/credentials. Its only Tawsel inputs are published schemas/client artifacts, API URLs, integration credentials and the defined signature/provisioning configuration. It cannot read the Tawsel database or import internal domain/repository modules. Test tooling can start the systems independently, but the consumer integration itself must remain public-only.

The quickstart must reproduce provisioning → task preparation → definitive received assignment → planning/start → driver outcome → signed event receipt → durable ERP projection, then subset return receipt and fresh dispatch. Show source-command pending/accepted/rejected and receiver received/applied separately. Include duplicate requests/events, lost responses, sender/receiver restart, wrong scope/actor, stale revisions, sequence gaps and expired-history recovery. Use safe dedicated test data and redacted evidence, not live credentials.

Phase 26 implements the receiver cases and harness; Phase 27 adds the source and two-way cases. Reuse meaningful existing tests where they exercise the same boundary; do not add empty or implementation-mirroring copies. Phase 42 records a final setup from a clean consumer directory/environment using only documented released inputs. It must fail clearly when required setup is missing rather than silently using internal development access.

## Honest completion rule

A collection of Markdown files, a passing schema validator or a polished mock UI is insufficient. Implementation, local integration proof, target verification and owner review remain separate statuses in the ledger. A required missing test or artifact remains outstanding; Phase 42 cannot label the handoff complete until its required evidence exists.

After Phase 27 the owner has a concrete, tested reference for ERP planning. After successful Phase 42 the owner receives the final as-built planning bundle for that release. Building and testing the actual ERP connector against its real identity/data/workflows is the later ERP project's work; no automatic integration or future ERP compatibility is promised.
