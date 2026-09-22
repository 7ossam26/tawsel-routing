# Phase 03 evidence — visual system and action specification

Date: 22 September 2026. Starting HEAD: `28d038a50717f2a3b41ec59c4715c54273b9e5f0` (`phase 2`). Working tree initially clean. No applicable AGENTS.md in repository or inspected ancestors. Requested setting: `gpt-6-astra` / `high`; runtime identifies GPT-6, but exact picker model variant and reasoning effort are not exposed. Actual exact setting is **unavailable**, not inferred from the request; consulted `docs/phases/model-selection.md`. No model change claimed.

Scope: specification and read-only document verification. No frontend components/routes, business handler, database, worker, deployment, commit or push. Owner review pending. All business operations remain designed.

## Prerequisites

Inspected actual Phase 01 web/API/shared code, Cairo CSS/imports, package scripts, Phase 02 state vocabulary, canonical schemas/catalog/tooling/examples/client, current phase package/requirements/decision map, master plan, latest discovery amendments through D-112 and repository/UI assessment. Earlier evidence is retained as historical evidence.

- `node --version`: `v24.19.0`; `npm --version`: `11.1.0`; `python --version`: `3.12.6`.
- `npm run test:ci`: PASS, 3 files / 117 tests (Vitest 5.0.1); existing configuration, real ephemeral HTTP and contract checks only. This does not test the new specification or business behavior.
- `npm run contracts:check`: PASS, 4 canonical schema files, 60 valid / 35 invalid examples, 147 owned operations/events/local actions and generated references.
- `npm run contracts:lint`: PASS, OpenAPI valid, no warnings.
- No prerequisite defect required repair. No Engine/import/mount command run.

## Checkpoint A — recorded before design/routes work

Created [ui-reference-audit.md](ui-reference-audit.md) and read-only `scripts/check-ui-spec.py`. Opened all nine original images with the image viewer; parsed all HTML including hidden text/scripts, read metadata and inspected layout affordances. Recorded exact IDs/paths/dimensions, reusable layout roles, clipping and control defects, 105 semantic/scripted controls, additional decorative/click-styled affordances and unsupported claims. No inaccessible original asset. Remote media embedded by prototypes is not adopted or represented as locally available.

`python scripts/check-ui-spec.py A`: **PASS**, nine metadata/source/image sets, 18 original SHA-256 checks and exhaustive 105-control classification. Manual cross-review: each source has a role; every exported control is retained/adapted/removed under requirements, including removals of QR/barcode, fake network states and staff authority. No exported control becomes authority by default.

One exploratory `rg` call using a Windows wildcard directory failed (`os error 123`); corrected to `rg ... stitch-export/screens -g code.html`. This was a search invocation error, not an inaccessible reference or prerequisite defect.

Unresolved dependencies: browser interaction, rendered accessibility and owner review belong to P04+, not this checkpoint. None blocks the specification. Full-capacity branch interruption still requires P22 transaction proof.

## Checkpoint B — recorded before state-acceptance work

Created [DESIGN.md](../DESIGN.md), [ui-spec.md](ui-spec.md), [ui-actions.md](ui-actions.md) and [ui-component-research.md](ui-component-research.md). Formalized existing local Cairo faces/weights as shared typography tokens, navy/blue/light semantic colors, responsive rules, keyboard/focus/RTL/motion/overlay conventions. No component CSS/runtime was applied; P04 owns that implementation. Added exact role/state/surface/input/recovery/phase mappings, including native ERP/background/event responsibilities without new driver controls.

`python scripts/check-ui-spec.py B`: **PASS**, A remains passing; 63 action/effect rows cover all 147 catalog operations and retain designed lifecycle. Manual review matched master-plan §13/§16 families and required extensions, including B2C intake, partial delivery, correction, takeover, source returns and reports. No public interface/schema change needed; canonical operation IDs/capabilities/feature ownership are reused. Schema/example/client output remains unchanged.

Fetched complete Smooth documentation with Python urllib (705,721 bytes, hash recorded in component review) and inspected live registry source for tabs, progress, basic-modal, tokens, shadcn Button and Dialog. Checked upstream MIT licenses and existing Cairo OFL. Tabs/progress are adaptation candidates; basic-modal rejected as the shared modal foundation. Raw research files are ignored under `output/phase-03-research/`; no catalog install. Source hashes, actual props/dependencies and focus/RTL/reduced-motion defects are in the review.

Unresolved dependency: P04 must re-fetch/pin actual component dependencies and verify adapted behavior in the browser. The basic-modal source concerns do not block the specification because the selected overlay foundation is shadcn/Radix. Owner approval remains pending; full-capacity branch proof remains P22. No material prerequisite gap found.

## Checkpoint C — state acceptance

Added 33 designed Arabic cases to `ui-spec.md`, including ready/missing/empty/waiting/pending/rejected/stale, normal explicit start/heading/arrival/result, pending versus received/accepted, missing-pin recovery, branch subset, correction rejection and session/storage/export recovery. Defined four CSS viewports, 200%/400% zoom, long mixed text, safe areas, keyboard/assistive-tech/reduced-motion review and future fixture/API/device evidence distinctions. Added `demo` and negative-check modes to the document checker.

`python -X utf8 scripts/check-ui-spec.py C`: **PASS**, A/B plus 33 state cases, required categories, four viewports/zoom and local file-link resolution. `python -X utf8 scripts/check-ui-spec.py demo`: **PASS**, prints the normal paper path and exception branches directly from the specification, with no server or browser calls. Manual walkthrough: login → daily ready → explicit heading → explicit arrival → result sheet → one save → next suggestion. Each stage names the primary action and missing/waiting fact; cancellation and unsupported shortcuts cannot imply a result in the specification. This is implementer document review, **not owner comprehension or usability evidence**.

Final semantic review found and corrected a draft example that began with independent login but used B2B line amounts: J01–J07 now consistently use B2B, with a separate B2C variation omitting pieces/custody. Verified screen 03 script target IDs directly and corrected the audit to list only the three actually missing targets. Aligned own-driver authorization wording with the existing canonical `execution.own` alternative for scoped reads/planning/location; no new grants or interface change.

Read-only Python contrast arithmetic for specified pairs: white/navy 18.43:1, body/white 16.01:1, muted text/muted surface 5.62:1, blue/white 5.54:1, error 7.24:1, waiting 7.37:1, success 6.42:1; input outline/muted surface 4.06:1. These values check token combinations only, not rendered controls/focus/disabled states. P04 still measures actual rendering.

Six in-memory negative checks deliberately remove a control disposition, remove correction coverage, invent an operation, remove missing-pin cause, remove pending waiting text and omit a viewport. Each must fail for the stated document invariant. They do not prove runtime business invariants or human clarity. No database/worker/real-ERP/device test is substituted by these checks.

Owner feedback: none received for this specification; **review pending**. Browser/Playwright/screenshots/component Vitest not run for P03 because no UI implementation is added. No live issuer/Engine/maps/storage/ERP/phone inspection; these gaps do not block this specification but prevent claims of connected behavior, device durability and approved usability. Full-capacity branch interruption remains P22's concrete proof obligation.

## Final verification and changed artifacts

| Exact command | Actual result / boundary |
| --- | --- |
| `python -X utf8 scripts/check-ui-spec.py check` | PASS A/B/C, 105 classified controls, 147 covered operations in 63 rows, 33 copy cases, four viewports/zoom, local file links, eight contrast pairs and six expected negative rejections. Read-only document/token checks, not application tests. |
| `python -X utf8 scripts/check-ui-spec.py demo` | PASS; reproducible paper walkthrough with action/blocker/waiting/expected effect from the actual spec. No API call or UI simulation. |
| `npm run contracts:generate` | PASS; generated public reference/coverage cross-link the designed UI map. Four schemas, 60 valid/35 invalid examples and 147 operations retained. Client type output byte-unchanged. |
| `npm run check` | PASS, exit 0: npm audit zero vulnerabilities, ESLint, OpenAPI lint, generated contract check, all workspace typechecks, Vitest 3 files/117 tests, shared/API/web builds. Existing tests cover foundation only; no new browser/DB evidence. |
| `git diff --check` | PASS; only repository CRLF conversion notices, no whitespace errors. |
| `git diff --name-only -- stitch-export contracts packages/api-client/src/schema.d.ts packages/api-client/examples/consumer.ts apps docker-compose.yml setup.ps1 profiles vroom-conf` | Empty: original exports, canonical wire schemas/examples/catalog, generated client/example, runtime app and Engine configuration unchanged. No dataset/volume/import commands used. |

Runtime versions used: Node 24.19.0, npm 11.1.0, Python 3.12.6, Vitest 5.0.1, TypeScript 6.0.2, Vite 8.3.0, React 19.3.0, Fastify 5.12.5, Cairo 5.3.0. No dependency/lockfile upgrade. Library registry observations are identified by URL/byte length/hash in the component review, not presented as installed versions. Exact picker model/effort remains unavailable as recorded above.

New deliverables: `DESIGN.md`; `docs/ui-spec.md`; `docs/ui-actions.md`; `docs/ui-reference-audit.md`; `docs/ui-component-research.md`; this evidence; `scripts/check-ui-spec.py`.

Updated references: `scripts/contracts.mjs`, generated `docs/contract-coverage.md` and `docs/reference/public-contract.md`; `packages/api-client/README.md`; all three existing `docs/erp/` planning/index/mapping documents; root README, master-plan/discovery current status, phase index/coverage matrix and implementation ledger. `.gitignore` excludes only local downloaded Phase 03 research. No new ERP quickstart/conformance suite is claimed: those do not exist yet and remain P26/P27; the available public-client/foundation checks still pass. Schema/example/client payload updates are unnecessary because this phase changes no public interface.

## Reproduce and hand off to Phase 04

From repository root with Python 3.12 and the existing Node/npm workspace:

```powershell
python -X utf8 scripts/check-ui-spec.py check
python -X utf8 scripts/check-ui-spec.py demo
python -X utf8 scripts/check-ui-spec.py controls
npm run contracts:check
```

The `controls` command locates all 105 original semantic/scripted controls by screen ordinal and source line; image inspection and additional affordance decisions remain the recorded manual audit. The checks do not require network access or raw downloaded research. The paper demo reads the checked specification directly.

P04 may rely on these verified artifacts:

1. `DESIGN.md`: normative token names/values, eight local Cairo imports/real weights, RTL layouts, contact/stop/status/overlay contracts and motion/focus rules. P04 must apply and render them; P01 shell still uses its original CSS.
2. `docs/ui-reference-audit.md` and unchanged `stitch-export/manifest.json` plus all nine original sets: source roles, exact provenance and traceable additions/removals.
3. `docs/ui-actions.md`: complete designed operation-to-role/state/surface/UI-phase map, preserving the canonical own-driver authorization alternative and external ERP boundaries.
4. `docs/ui-spec.md`: normal J01–J07 path, S01–S26 exceptions, components/overlay/back rules, four viewports, zoom/long-text/safe-area criteria and six P03 acceptance scenarios.
5. `docs/ui-component-research.md`: inspected APIs/licenses/hashes and required adaptations. Re-fetch selected actual source at implementation time and pin compatible dependencies; do not install the catalog.
6. Existing P01 workspace/Cairo/test commands and P02 common/envelope/examples/client/state catalog remain verified by the current full check. They do not supply business handlers.

P04's bounded work is representative shared components, clearly labelled development fixtures and real browser review. Implement login presentation, day → heading → arrival → result with missing/pending/rejected/another-device states and selected-driver desktop view; create its meaningful driver-flow tests and future `docs/ui-review.md` with actual screenshots, focus/tap findings and owner feedback. Keep schematic map and fixture acceptance explicitly labelled and out of production navigation. Do not treat this document as owner approval. P04 was not executed in this task. No publication, commit or push.
