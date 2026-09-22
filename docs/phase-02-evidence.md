# Phase 02 evidence — 22 September 2026

Starting HEAD: `3aec78ff91b27fdf17e34405eebdf5d62394986c`; working tree clean. No applicable `AGENTS.md` found in the repository or workspace ancestors. Engine data/configuration and original Stitch exports are outside the edit scope.

Requested setting: `gpt-6-astra` / `xhigh`. Runtime instructions identify GPT-6, but do not expose the exact picker variant or reasoning setting; those actual picker values are **unavailable**, not asserted from the prompt. Consulted the existing [model selection guide](phases/model-selection.md); no setting change claimed.

## Prerequisite

Read real root/package workspace configuration, API handler, shared configuration and Vitest projects, Phase 01 prompt/evidence, current phase README, requirements R-63–R-65, decision map, master plan and discovery synthesis/D-64–D-112, and ERP handoff deliverables. `node --version` = `v24.19.0`; `npm --version` = `11.1.0`. `npm run test:ci`: **PASS, 2 files / 9 tests**, including real ephemeral HTTP and configuration validation. No prerequisite repair required.

## Checkpoint A — recorded before schema work

Created [tracking-and-consistency.md](tracking-and-consistency.md): record/actor/state/action tables, independent IDs/revisions/time, departure/current/branch rules, bounded correction and old-device evidence, atomicity obligations and exclusions.

Focused manual walk of its two-of-three example: **PASS as design review**. Three EGP 100 pieces + EGP 50 shipping produces EGP 250 (25,000 minor units) for two pieces. Optional correction to one piece gives 15,000; return request leaves two held and zero received; subset receipt leaves one held/one received; separate loss gives `1 + 0 + 1 + 1 = 3`. Fresh dispatch uses a new cycle/assignment/attempt without changing the old cycle. Checked the no-correction path `2 + 0 + 1 + 0 = 3`, same-address independence, route-only change compatibility and distinct transition events. This is not database or collection execution evidence.

Unresolved dependency: full-capacity branch interruption is the master-plan engineering proposal; P22 must prove the retained-sequence/active-segment rules with real concurrency. No concrete canonical decision contradiction found; historical staff correction D-73 is superseded by D-91/D-95/D-96. Stable naming choices are not new authority. No dependency blocks the foundation.

## Checkpoint B — recorded before operation ownership work

Added OpenAPI 3.1.1 with deliberately empty public paths; canonical JSON Schema 2020-12 common types, v1 action/event/evidence envelopes; valid/invalid fixtures; offline reference resolution; deterministic public type/reference generation; portable client example; Vitest contract foundation suite and root check integration. The `.invalid` schema namespace is deliberately not a live service. Action/event payloads remain feature-owned, explicitly not complete operation schemas.

Pinned from current registry and primary documentation: Ajv `8.20.0`, ajv-formats `3.0.1`, openapi-typescript `7.13.0`, Redocly CLI `2.54.0`, YAML `2.9.1`; existing Node `24.19.0`, npm `11.1.0`, TypeScript `6.0.2`, Vitest `5.0.1` retained. References: [Ajv dialect support](https://ajv.js.org/json-schema.html), [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html), [openapi-typescript](https://openapi-ts.dev/introduction), [Redocly lint](https://redocly.com/docs/cli/commands/lint). Installation audit reported zero vulnerabilities.

First `npm run contracts:generate` failed strictRequired checks for conditionally required properties in subschemas. Added local presence declarations without duplicating canonical field definitions; strict validation stayed enabled. The first Redocly run also reported seven related warnings and a Windows libuv shutdown assertion; after the schema fix, repeated lint completed exit 0 without warnings/assertion. Neither initial failure is counted as a pass.

Focused final commands at checkpoint B:

- `npm run contracts:generate`: PASS, 4 canonical schema files, 60 valid / 35 invalid fixtures, generated client/reference written.
- `npm run contracts:lint`: PASS, valid OpenAPI with no warnings.
- `npm run test:contracts`: PASS, 1 file / 105 tests. Includes real refs, broken-ref detection, correct dialect, invalid formats/bounds/version rejection, no silent coercion/removal, wire round trips, unavailable API status and byte-identical generation twice plus checked-file drift comparison.
- `npm run typecheck -w @tawsel/api-client`: PASS, public-type-only consumer compiles.
- `npm run lint`: PASS before the final error-example expansion; repeated in final checks below.

No unresolved tooling dependency. Serializer evidence is the JSON wire round trip, not a configured business Fastify serializer: no such routes exist. P05/feature owners must wire these schemas into an explicit 2020-12 validator and verify their actual request/response serialization. Transactions, authorization and worker delivery remain unimplemented, untested here and not inferred from schema success.

## Checkpoint C — operation ownership and ERP foundation

Created canonical `contracts/operations.json` and generated `docs/contract-coverage.md`: 147 individually identified operations/events/local actions, including 31 event types. Each has boundary, lifecycle, phase owner and capability/scope. Only the existing P01 workspace health operation is `verified-local`; all domain operations/events are `designed`. Reviewed every master-plan §13 family, plus private routing, maps, diagnostics, local UI/offline actions and native mock boundaries against §§5–15/18–20. Catalog checks reject duplicate IDs, missing owners/families, unowned examples and exposing designed operations as public paths. Urgency event ownership was corrected during review to its first producer P10; P18 extends it for driver changes, so first-write intent does not depend on a later phase.

Created substantive integration guide and ERP start-here/planning/mapping documents. These identify generic public snapshots/resources, source provisioning/actor binding, ownership and known constraints, signed receipt versus applied evidence, scoped sequences/replay retention, old queued-version obligations, connector ownership and unknown real-ERP mechanisms. No vendor schema, live URL, fake authentication configuration, final release manifest or stubbed receiver was added. Consumer quickstart/conformance remain P26–27 deliverables; current portable type/schema checks are explicitly weaker evidence.

Focused commands: `npm run contracts:generate`, `npm run test:contracts` (**108 tests**), `npm run contracts:demo`: **PASS**. The first complete `npm run check` then passed audit (zero vulnerabilities), lint, OpenAPI lint, generated drift/examples, all workspace/public-consumer typechecks, **117 tests in 3 files**, and shared/API/web production builds.

Final review found two tooling integration gaps and repaired them here: Git `core.autocrlf=true` required LF attributes for the three byte-compared generated artifacts; CI path filters required contracts/tooling/generated-doc inputs so a contract-only edit triggers checks. No original P01 business/runtime repair was needed.

### Concrete discrepancy review versus routine naming

- Historical staff correction authority D-73 conflicts with later D-91; resolved by D-91/D-95/D-96 in all new documents. No general staff correction operation exists.
- D-68 receipt-before-resume and D-80 no whole-batch gate are compatible: claimed handed-back subsets need accepted receipt, while unresolved other pieces remain explicit.
- Legacy README provider examples call empty VROOM violations authoritative and show 300 seconds; application master-plan rules require full ID/constraint validation and a 600-second default. Added an explicit application precedence note without modifying Engine configuration/tutorial commands. P12/P14 own actual adapter/policy proof.
- `trip`/`round` synonym, dotted operation IDs and separate generation/revision field names are routine vocabulary choices. They create no permissions.
- Full-capacity branch interruption remains a concrete proposed design awaiting P22 concurrency proof, not a proven behavior or new business exception. No other unresolved canonical product contradiction blocks P02.

### Acceptance mapping

| Phase scenario | Actual Phase 02 evidence | Remaining runtime proof |
| --- | --- | --- |
| Same action ID, different payload | Guide specifies scoped 409 and no second change; valid conflict fixture and invalid wrong-status fixture tested | P05 real concurrent idempotency/rollback |
| Route changes, compatible assignment/attempt | Independent version schema test plus state validation policy/walkthrough | P17/P34 actual compatibility against state |
| Return request created | Canonical requested-only event example, explicit fixture review test and three-piece walkthrough | P21 actual request/subset receipt transaction |
| Newer progress snapshot | Separate event IDs/kinds, required snapshot revision and illustrative event test; transition retention policy | P25/P26 durable ordered replay/inbox |
| API only specified | Empty public OpenAPI paths, designed catalog/reference, test rejects invented availability | Feature owner schemas/handlers and evidence |
| Future payload evolves | Version rejection tests; immutable versions, retained v1 reader/upcasting/queued-ID policy and concrete optional-note/allocation examples | P34/P35 real old queue/storage/update behavior |

### Not run / practical limits

No business PostgreSQL schema, worker or external mock receiver exists, so transaction, lock, durability, signatures and ERP interoperability tests are not runnable and are not claimed. No UI changes were made; no new browser/physical-device evidence is needed or claimed here. Engine runtime, deployment, target capacity, identity/email, real vendor interfaces and restore remain unverified. No owner review feedback received. Actual picker variant/effort remains unavailable. No commit, push, release, deployment or Phase 03 execution.

## Final verification and changed paths

- Clean `npm ci`: PASS, locked dependencies installed in 8 seconds; zero vulnerabilities. Repeated `npm run check` after clean install: PASS, 117 tests in 3 files, all audit/lint/OpenAPI/drift/typecheck/build steps passed. CI workflow itself was inspected and updated; no remote GitHub Actions run claimed.
- Final example review gave return/correction transitions their own action correlations and advanced correction outcome/resource revisions. Added fixture assertions to protect that provenance. Focused `npm run contracts:check`, `npm run test:contracts` (108 tests) and `npm run lint`: PASS after this change. No schema/generated output change was needed, and unrelated runtime suites were not repeated for it.
- Public consumer example imports `@tawsel/api-client` only; `npm run typecheck -w @tawsel/api-client` checks the package boundary. There is no backend/domain dependency or network client method to invoke.
- One-time Node filesystem link check over 16 current/changed Markdown documents: PASS, 1,023 local-link occurrences resolve. This checks file destinations, not website availability or document semantics.
- `git diff --check`: PASS. `git check-attr text eol -- docs/contract-coverage.md docs/reference/public-contract.md packages/api-client/src/schema.d.ts`: all three `text=set`, `eol=lf`.
- `git diff HEAD --exit-code -- docker-compose.yml setup.ps1 profiles vroom-conf stitch-export apps/api apps/web packages/shared/src .env.example STACK-CONTEXT.md TAWSEL-ENGINE-CONTEXT.md`: PASS, no changes. No Engine import, volume, dataset, mount or service command ran.

| Changed paths | Purpose |
| --- | --- |
| `contracts/openapi.yaml`, `common.schema.json`, `action-envelope.v1.schema.json`, `evidence-receipt.v1.schema.json`, `events/envelope.v1.schema.json` | Canonical designed common protocol, explicit 2020-12 dialect and no invented HTTP paths |
| `contracts/examples/valid.json`, `invalid.json`, `README.md`; `contracts/operations.json` | 60 valid/35 invalid fixtures; 147 owned action/event/read/local/internal entries |
| `scripts/contracts.mjs`; `redocly.yaml`; `packages/shared/test/fast/contract-foundation.test.ts` | Real validation/ref/catalog checks, deterministic generation and 108 focused Vitest tests |
| `packages/api-client/package.json`, `tsconfig.json`, `README.md`, `src/schema.d.ts`, `examples/consumer.ts` | Version 0.1.0 portable public types and typechecked consumer |
| `docs/tracking-and-consistency.md`, `integration-guide.md`, `contract-coverage.md`, `reference/public-contract.md` | State/transaction/compatibility obligations, generated ownership/reference |
| `docs/erp/README.md`, `ERP-PLANNING-INPUT.md`, `field-and-status-mapping.md` | Substantive ERP-agnostic planning foundation with explicit real-ERP unknowns |
| `package.json`, `package-lock.json`, `eslint.config.js`, `.gitattributes`, `.github/workflows/application-checks.yml` | Pinned tooling, integrated checks, deterministic line endings and CI triggers |
| `README.md`, `master-plan.md`, `TAWSEL-DISCOVERY-LOG.md`, `docs/implementation-status.md`, `docs/phases/README.md`, `docs/phases/coverage-matrix.md`, `docs/planning/erp-handoff-deliverables.md`, this evidence file | Current foundation status, artifact ownership, reproducible demonstration and truthful handoff; historical decisions preserved |

## Reproduce and hand off to Phase 03

From repository root: `npm ci`, `npm run contracts:demo`, `npm run test:contracts`, `npm run check`. To edit canonical definitions/catalog/examples, run `npm run contracts:generate` and review all three generated artifacts; CI fails stale output. The demo validates real JSON fixtures and displays the designed two-piece calculation; it does not send or accept a business command.

Phase 03 may rely on the preserved Phase 01 Cairo/RTL shell and commands, the state/action/authority tables, independent IDs/revisions/timestamps, canonical common/envelope schemas and tested examples, 147-entry owned operation catalog, generated portable public types/reference, and the initial integration/ERP planning/mapping obligations. It must use these to specify UI actions without implying those APIs already work. Feature phases finish operation schemas and runtime proof in place. P05 owns real transaction/locking guarantees, P08 trusted source identity, P10 intake, P21/P22 actual receipt/interruption, P25–27 signed external interoperability and P34/P35 real queued-payload compatibility. **Phase 03 was not executed in this task.**
