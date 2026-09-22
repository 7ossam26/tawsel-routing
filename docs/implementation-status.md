# Tawsel implementation status

Updated: 22 September 2026. Package revision 3 under D-109–D-111, with the ERP-agnostic boundary clarified by D-112.
Planning HEAD: `3d6291697fb0baeb69215237bf1d09dbf6d1d9cd`.

## Current state

The owner requested smaller self-contained implementation tasks after reviewing the broad 11-phase package.
The [current package](phases/README.md) contains 42 sequential prompts, a 65-requirement catalog, complete D-01–D-112 traceability, per-phase model/reasoning recommendations, explicit ERP handoff deliverables and a review checklist.
**Phases 01, 02 and 04 are implemented and locally verified within their bounded scope; Phase 03 supplies the verified specification.** Phase 01 provides the web/API/shared workspace, Cairo typography and real-HTTP/configuration harness. Phase 02 adds validated common schemas/envelopes/examples, generated public types/reference, state/integration/ERP planning documents and exhaustive designed operation ownership. Phase 03 supplies the visual/action specification. Phase 04 adds reusable RTL components plus a development-only fixture journey and selected-driver view, verified in Chromium but not owner-approved or connected to business APIs. There are no business handlers, application database, identity, worker, routing adapter, deployed business API or real ERP connector. Phases 05–42 have not started.

The [old package/ledger](phases-archive-v1/implementation-status-at-supersession.md) remains historical. Its earlier structure/link/hash validation does not establish the adequacy of its broad task boundaries, and is not evidence for the replacement's runtime behavior.

## Current planning verification — revision 3

The D-110/D-111 amendment added model/reasoning settings to all 42 prompts and strengthened the ERP planning bundle, ownership mapping, external consumer setup/conformance checks and final release manifest. At the time of that planning verification, all application phases were Not started / Not run; the Phase 01 execution below is later evidence.

Python standard-library documentation validation on 21 September 2026: **PASS**.

- All 42 prompts contain exactly one model/effort block and agree with the consolidated guide: 35 Astra and 7 Sol recommendations, each with its phase-specific reason.
- The 126 checkpoints, 252 scenario rows and 195 earlier-phase dependency edges remain intact; all 65 requirement groups and 111 discovery decisions are mapped.
- All 66 current/archived planning documents were checked; 2,189 local-link occurrences and 562 requirement-fragment links resolve.
- ERP artifact ownership is present in the roadmap, phase prompts and coverage map; P26/P27 require early external conformance and P42 requires a clean consumer run plus release-manifest validation.
- All 46 protected files in the before/after snapshot are unchanged, including the archived package, original Stitch exports and the inspected Engine context/configuration files; all 18 image/HTML manifest hashes match.

This is document consistency and preservation evidence only. No application Vitest, external ERP integration, clean consumer setup or runtime model-performance comparison was executed. Those checks remain deliverables of the implementation phases.

## Earlier planning verification — revision 2

Replacement documentation was reviewed against the current master plan and validated with a Python standard-library check on 21 September 2026: **PASS**.

- 42 sequential prompts, 126 ordered checkpoints and 252 explicit acceptance-scenario rows.
- 195 unique earlier-phase dependency edges; no forward/cyclic dependency in the declared graph.
- 65 current requirement groups with phase links in both directions; all 109 discovery decision IDs mapped, including explicit supersessions.
- All 16 acceptance groups A–P, 8 canonical named Vitest files and 9 visual sources assigned.
- 64 current/archived Markdown documents checked; 2,069 local-link occurrences and 557 requirement-fragment links resolve.
- All 18 original Stitch image/HTML SHA-256 values still match the manifest; the old package is visibly superseded.

These results verify document structure and declared traceability, not that a future implementation already satisfies the business rules. They are not Vitest, browser, Engine, integration, device, load or deployment results. The semantic review separated ordinary execution UI, exception/correction UI and branch/closure UI into distinct tasks and retained early forecast capture, first-write atomic intent and independent received/applied evidence.

## Phase ledger

Each row records implementation, verification and owner review separately. None is completed merely because a prompt is detailed.

| Phase | Implementation | Verification | Owner review / evidence |
| --- | --- | --- | --- |
| [01 — Runnable workspace and test harness](phases/01-workspace-test-harness.md) | Implemented 22 Sep 2026 | Local checks pass; Engine runtime unavailable and not required | Awaiting owner review; [evidence](phase-01-evidence.md) |
| [02 — State vocabulary and canonical contract foundation](phases/02-state-contract-foundation.md) | Implemented 22 Sep 2026 | A/B/C passed; schemas/tooling verified, business operations designed | Awaiting owner review; [evidence](phase-02-evidence.md) |
| [03 — Visual system and requirement-driven action specification](phases/03-design-action-specification.md) | Specified 22 Sep 2026 | A/B/C document checks and paper demo pass; no runtime UI | Awaiting owner review; [evidence](phase-03-evidence.md) |
| [04 — Shared components and early simple-UX review](phases/04-representative-ui-review.md) | Implemented 22 Sep 2026 | 10 component tests + 6 Chromium tests pass; fixture only | Awaiting owner review; [review](ui-review.md), [evidence](phase-04-evidence.md) |
| [05 — PostgreSQL migrations and atomic command kernel](phases/05-postgres-atomic-command-kernel.md) | Not started | Not run | No implementation result yet |
| [06 — Tenant, branch and capability enforcement](phases/06-tenant-capabilities-isolation.md) | Not started | Not run | No implementation result yet |
| [07 — Real login, recovery and separate sessions](phases/07-oidc-login-recovery-sessions.md) | Not started | Not run | No implementation result yet |
| [08 — ERP provisioning and verified actor context](phases/08-erp-provisioning-actor-binding.md) | Not started | Not run | No implementation result yet |
| [09 — Independent-driver task intake](phases/09-b2c-task-intake.md) | Not started | Not run | No implementation result yet |
| [10 — ERP task snapshots, receipt and atomic admission](phases/10-b2b-intake-admission.md) | Not started | Not run | No implementation result yet |
| [11 — Confirmed locations and real map assets](phases/11-locations-map-assets.md) | Not started | Not run | No implementation result yet |
| [12 — Routing Engine adapters and vehicle profiles](phases/12-engine-profile-adapters.md) | Not started | Not run | No implementation result yet |
| [13 — Durable planning jobs and forecast revisions](phases/13-planning-jobs-forecast-storage.md) | Not started | Not run | No implementation result yet |
| [14 — Urgent-first route policy and manual fallback](phases/14-route-policy-manual-fallback.md) | Not started | Not run | No implementation result yet |
| [15 — Online round start and departure authority](phases/15-round-start-departure-lock.md) | Not started | Not run | No implementation result yet |
| [16 — Explicit current target, heading and arrival](phases/16-current-heading-arrival.md) | Not started | Not run | No implementation result yet |
| [17 — Delivery outcomes, whole pieces and exact collection](phases/17-outcomes-quantities-collection.md) | Not started | Not run | No implementation result yet |
| [18 — Deferral, whole-shipment retry and driver urgency](phases/18-deferral-retry-driver-urgency.md) | Not started | Not run | No implementation result yet |
| [19 — Round closure, workday closure and carry-forward](phases/19-workday-closure-carryover.md) | Not started | Not run | No implementation result yet |
| [20 — Online device takeover and preserved former-device evidence](phases/20-device-takeover-evidence.md) | Not started | Not run | No implementation result yet |
| [21 — Source-branch return requests and actual subset receipt](phases/21-source-return-receipt.md) | Not started | Not run | No implementation result yet |
| [22 — Branch interruption, resume and new dispatch cycles](phases/22-branch-interruption-redispatch.md) | Not started | Not run | No implementation result yet |
| [23 — Driver corrections and compatible evidence adoption](phases/23-bounded-driver-corrections.md) | Not started | Not run | No implementation result yet |
| [24 — Coherent monitoring snapshots and scoped history](phases/24-coherent-monitoring-api.md) | Not started | Not run | No implementation result yet |
| [25 — Durable outbox sender and signed delivery](phases/25-outbox-signed-delivery.md) | Not started | Not run | No implementation result yet |
| [26 — External mock inbox, projection and reconciliation](phases/26-mock-inbox-projection-recovery.md) | Not started | Not run | No implementation result yet |
| [27 — Native mock ERP commands and source outbox](phases/27-native-mock-erp-source.md) | Not started | Not run | No implementation result yet |
| [28 — Connected daily work, preparation and route start UI](phases/28-online-preparation-journeys.md) | Not started | Not run | No implementation result yet |
| [29 — Connected ordinary driver delivery UI](phases/29-ordinary-driver-delivery-ui.md) | Not started | Not run | No implementation result yet |
| [30 — Focused driver exception and correction UI](phases/30-driver-exception-correction-ui.md) | Not started | Not run | No implementation result yet |
| [31 — Driver branch handover, resume and workday closure UI](phases/31-driver-branch-closure-ui.md) | Not started | Not run | No implementation result yet |
| [32 — Dispatcher monitoring and online synchronization feedback](phases/32-monitoring-sync-online-ui.md) | Not started | Not run | No implementation result yet |
| [33 — PWA downloads and atomic local action capture](phases/33-offline-local-capture.md) | Not started | Not run | No implementation result yet |
| [34 — Ordered replay and durable conflict recovery](phases/34-ordered-replay-conflict-recovery.md) | Not started | Not run | No implementation result yet |
| [35 — Safe offline account recovery and application updates](phases/35-offline-auth-updates-ux.md) | Not started | Not run | No implementation result yet |
| [36 — Effective workday reports and forecast comparison](phases/36-workday-timing-reports.md) | Not started | Not run | No implementation result yet |
| [37 — Equivalent authorized Excel exports](phases/37-authorized-excel-export.md) | Not started | Not run | No implementation result yet |
| [38 — Owner diagnostics and measured freshness/capacity](phases/38-diagnostics-freshness-capacity.md) | Not started | Not run | No implementation result yet |
| [39 — Recoverable deployment and migration release procedure](phases/39-deployment-migration-release.md) | Not started | Not run | No implementation result yet |
| [40 — Backup, isolated restore and recovery proof](phases/40-backup-restore-rehearsal.md) | Not started | Not run | No implementation result yet |
| [41 — Real-device and owner pilot walkthrough](phases/41-device-owner-pilot-review.md) | Not started | Not run | No implementation result yet |
| [42 — Final contract, readiness and ERP handoff](phases/42-final-contract-readiness-handoff.md) | Not started | Not run | No implementation result yet |

## Required dated entry after each phase

Record the following from actual work:

- Phase number/title, code commit and relevant dependency/schema/config/Engine versions.
- Checkpoint A, B and C: concrete changes, focused check/result and any unresolved prerequisite.
- Changed artifacts and operations now implemented versus merely designed.
- Every acceptance scenario: test/demo evidence or precise failed/unrun reason.
- Exact meaningful Vitest and browser/device commands/results, identifying mocked boundaries versus actual services.
- UI additions/removals, screenshots/interaction findings and actual owner feedback, when applicable.
- Migration/config/setup/recovery notes and preserved Engine/user-data boundaries.
- Remaining required gaps, their practical effect and the exact artifacts the next phase may rely on.

No owner approval may be inferred from silence. Do not erase failed/unrun checks by advancing the phase number.
A later focused task may resolve a gap; cross-link its evidence instead of rewriting history as an earlier pass.
If actual implementation proves a phase too broad, preserve the remaining scope in named bounded subphases and update dependencies/coverage coherently.

## Outstanding environment evidence

No new live host inventory, deployed Engine/profile/dataset verification, production identity/email/TLS, map-coverage/resource, physical-device/PWA-duration, freshness/capacity or isolated backup restore was performed in this planning rewrite.
Operational targets remain unverified, and the detailed numerical defaults remain engineering proposals where the master plan labels them as such.

There is no released application, finalized implemented contract boundary or real shipping ERP connector yet.
The next execution prompt is [Phase 05 — PostgreSQL migrations and atomic command kernel](phases/05-postgres-atomic-command-kernel.md). It may rely on the verified workspace/Phase 02 foundation. Phase 04 provides UI fixtures only and establishes no transaction or business-operation guarantee. Business operations remain designed; Phase 05 has not started.

## 22 September 2026 — Phase 01 execution

Starting HEAD: `eacf6b3fa596a845b4290c6f3ad471b39551e8d8`. Full checkpoint logs and acceptance mapping are in [docs/phase-01-evidence.md](phase-01-evidence.md).

- Checkpoint A: added `apps/web`, `apps/api`, and `packages/shared`; safe required environment parsing; Node 24/npm 11 pinning and lockfile. `npm run dev` served the RTL shell on 5173 and actual workspace health on 3001. Docker Desktop was stopped, so Engine runtime state remains unverified and health truthfully reports `engine=not-checked`.
- Checkpoint B: fast selection passed 6 configuration assertions; integration selection passed 3 tests over a real ephemeral Fastify listener. An initial invalid-query test exposed silent additional-field stripping; validation was corrected and the unchanged test then passed. Missing API configuration exited 1 with the named key. Lint, typecheck, and build passed.
- Checkpoint C: added read-only CI, `scripts/setup-app.ps1`, lockfile-based setup, and operations documentation. The first isolated run exposed a hidden dependency on prior shared build output; command ordering was corrected. The repeated isolated `npm ci`/`npm run check` passed, preserved `.env` and an unrelated sentinel, and had no Engine data directory. A transient critical advisory in `concurrently@9.2.1` was removed by pinning `9.2.4`; final audit reports zero vulnerabilities.
- Browser evidence: a headed Chromium render at 390×844 with reduced motion showed the concise Arabic RTL shell. A first pass found a favicon 404; after adding the local SVG, console errors/warnings were zero. The typography follow-up verified computed Cairo weights 400/600/700/800, all four font loads, and localhost-only font requests. The current screenshot is `output/playwright/phase-01-cairo-rtl-mobile.png`; the OFL text is retained under `docs/licenses/`. P03 must formalize this baseline as shared typography tokens and P04 must reuse/verify it in representative components. The shell is static foundation content; the API evidence is from the real local handler, and no Engine call occurred.
- Actual runtime: Node `v24.19.0`, npm `11.1.0`, TypeScript `6.0.2`, Vite `8.3.0`, React `19.3.0`, `@fontsource/cairo 5.3.0`, Fastify `5.12.5`, Vitest `5.0.1`. Recommended model/effort was `gpt-5.6-sol`/`high`; the agent runtime exposed only GPT-5, not the exact picker variant or effort, so the latter are not asserted.
- Preserved boundaries: Engine Compose/startup/profile/VROOM config and Stitch exports were unchanged. No database/volume/import command ran. No ERP planning interface exists yet, so ERP mapping/consumer documents are unaffected and remain Phase 02+ deliverables.
- Handoff to Phase 02: rely on root `npm ci`, `npm run dev`, `npm run test:fast`, `npm run test:integration`, `npm run check`; workspace paths `apps/web`, `apps/api`, `packages/shared`; required `.env.example`; API port 3001; and the stable non-domain `GET /health` behavior. Do not treat workspace health as routing readiness or as a released public contract.

## 22 September 2026 — Phase 02 execution

Starting HEAD `3aec78ff91b27fdf17e34405eebdf5d62394986c`. Ordered evidence is in [phase-02-evidence.md](phase-02-evidence.md). Requested model/effort `gpt-6-astra`/`xhigh`; runtime exposes GPT-6 but exact picker variant/effort are unavailable and not inferred.

- Prerequisite: real Phase 01 `npm run test:ci` passed 2 files / 9 tests; no repair.
- Checkpoint A: canonical state/authority/invariant tables and two-of-three-piece manual design walk passed. No business handler or database guarantee is claimed. Full-capacity interruption proof remains P22.
- Checkpoint B: OpenAPI/common/envelope schemas, 60 valid and 35 invalid examples, portable generated client/reference and explicit Ajv 2020-12 tooling. Contract suite passed 105 tests; OpenAPI lint and consumer typecheck passed. Initial strictRequired error was fixed; no database/worker guarantee inferred.
- Checkpoint C: 147 explicit owned operations/events/local actions (31 event types); all master-plan families reviewed, only workspace health verified as a route. ERP start-here/planning/mapping and integration guide distinguish designed behavior, connector responsibilities and unknown real-ERP choices. `npm run test:contracts` passed 108 tests; `npm run contracts:demo` passed. Complete `npm run check` passed audit, lint, OpenAPI/generated checks, typechecks, 117 tests in 3 files and all builds. Final review added LF generation attributes and CI contract path coverage; clean `npm ci` passed with zero vulnerabilities.
- Exact versions, initial failures/fixes, acceptance mapping, changed paths and final verification are recorded in the [phase evidence](phase-02-evidence.md). Model picker variant/effort remain unavailable; no setting is inferred from the prompt. No UI/DB/worker/Engine/device/real-ERP verification is claimed.
- Phase 03 may rely on `docs/tracking-and-consistency.md`, `contracts/common.schema.json`, versioned envelopes/examples, `contracts/operations.json`, `docs/contract-coverage.md`, `docs/reference/public-contract.md`, generated `packages/api-client/src/schema.d.ts`, `docs/integration-guide.md` and the three `docs/erp/` foundation documents. Reproduce with `npm ci`, `npm run contracts:demo`, `npm run test:contracts`, `npm run check`. Preserve Cairo/RTL baseline and use the catalog's explicit actions and exclusions; complete feature schemas in their owning phases before handlers. No Phase 03 work executed, owner approval inferred, commit/push or publication performed.

## 22 September 2026 — Phase 03 specification

Starting HEAD `28d038a50717f2a3b41ec59c4715c54273b9e5f0`; initially clean. [Full ordered evidence and handoff](phase-03-evidence.md). Requested `gpt-6-astra` / `high`; runtime identifies GPT-6 but exact picker variant/effort unavailable. Consulted model-selection guide and did not infer the actual setting from the prompt.

- Prerequisite: actual Phase 01/02 code/artifacts inspected; `npm run test:ci` passed 117 tests, `npm run contracts:check` and `npm run contracts:lint` passed. No prerequisite repair needed.
- Checkpoint A: visually inspected all nine original image/HTML/metadata sets; recorded exact IDs/paths, layout roles/defects and retained/adapted/removed controls. `python scripts/check-ui-spec.py A` passed nine sets, 18 original hashes and all 105 control dispositions; extra decorative/click-styled affordances also reviewed. None inaccessible.
- Checkpoint B: created `DESIGN.md`, complete `docs/ui-spec.md`, `docs/ui-actions.md` and actual component registry/license review. `python scripts/check-ui-spec.py B` passed 63 action/effect rows covering 147 operations with role/state/surface/phase/requirements. Formalized existing self-hosted Cairo 400/600/700/800; no runtime component changes or dependency installation.
- Checkpoint C: 33 Arabic state cases and normal B2B login → daily → heading → arrival → result paper walkthrough, with B2C variation and clear blockers/receipt boundaries. Specified 360×800, 390×844, 1366×768, 1440×900, zoom, long Arabic/LTR text, safe areas and focus/reduced motion. `python -X utf8 scripts/check-ui-spec.py check` and `demo` passed; six deliberate omission/invented-operation mutations fail as required. These are document/token checks and an implementer paper review, not browser usability or owner approval.
- Canonical references: generated coverage/public reference cross-link action map; schemas/catalog/examples/client types unchanged because no wire contract changed. Existing ERP planning/mapping/index and client guidance now trace native ERP actions and honest waiting/receipt/application labels. External quickstart/conformance remains uncreated P26/P27 work.
- Final `npm run check` passed audit (zero vulnerabilities), lint, OpenAPI/generation, typechecks, 3 files/117 existing Vitest tests and all builds. `git diff --check` passed. Node 24.19.0 / npm 11.1.0 / Python 3.12.6; existing React 19.3.0, TypeScript 6.0.2, Vite 8.3.0, Fastify 5.12.5, Vitest 5.0.1, Cairo 5.3.0 retained. Full changed-path list, source hashes, corrected draft findings and failed exploratory search are in the phase evidence.
- Limits: no new UI runtime/browser/Playwright/DB/worker/Engine/issuer/map/device/ERP proof; no owner review received. P22 full-capacity branch interruption still needs transaction proof. Originals, Engine config/data/mounts, runtime application and dependency lockfile remain untouched. No publish/commit/push.
- Phase 04 may rely on `DESIGN.md`, `docs/ui-spec.md`, `docs/ui-actions.md`, `docs/ui-reference-audit.md`, `docs/ui-component-research.md`, the read-only checker/demo, unchanged original exports and verified P01/P02 foundation. It must implement and render representative fixtures, inspect current component APIs/pins, test interaction/focus/RTL and collect actual review findings. **Phase 04 has not started; design status is specified, owner review pending.**

## 22 September 2026 — Phase 04 representative UI review

Starting HEAD `3af79b8` (`phase 3`), initially clean. [Full ordered evidence](phase-04-evidence.md) and [actual review record](ui-review.md). Requested `gpt-5.6-sol` / `high`; runtime identifies the GPT-5 family but exact picker variant/effort are unavailable and not inferred.

- Checkpoint A: applied the P03 tokens and RTL/responsive rules; added shared button, field, status, contact, progress, tabs, stop and single Radix-overlay primitives. Cairo 400/600/700/800 remains self-hosted; Radix Dialog 1.1.23 and Lucide 1.47.0 are pinned with local license notices. Focused shared/web build and typecheck pass after correcting three strict-index findings.
- Checkpoint B: added a yellow-labelled, development-only `/__fixtures/driver-review` with login presentation, ready daily work, explicit start/heading/arrival/outcome stages, long Arabic/LTR data, loading/empty/missing-pin/another-device/no-answer/whole-piece partial-selection/pending/rejected states and selected-driver desktop monitoring. `driver-flow.test.tsx`: **PASS, 10 tests**. Production build tree-shakes fixture JavaScript and its marker scan passes; no business API/status was promoted from designed.
- Checkpoint C: Playwright Chromium covered 360×800, 390×844, 1366×768, 1440×900 and effective 200% reflow. Final `npm run test:browser:ui`: **PASS, 6 tests** for RTL, local Cairo weights/assets, long Arabic/LTR content, partial/no-answer/ownership/sync variants, reduced motion, focus/escape, draft retention, list/map correspondence and staff read-only authority. Visual inspection corrected the narrow initial start-action position and a desktop tab/panel-state mismatch before the final pass. Eight captures live under `output/playwright/phase-04/`.
- Initial/fixed failures: npm install/clean install exposed the existing OpenAPI-generator TypeScript-5 peer declaration while the checked workspace pins TypeScript 6; repository-scoped `.npmrc` now makes the deliberate legacy peer resolution reproducible for plain `npm ci`. The first production build lacked the intentionally required API-base environment; the first isolation script mishandled a URL path; the first browser launch lacked a completed headless-shell download; one reduced-motion check compared equivalent string formats. None is counted as a pass before correction.
- Boundaries: fixture-only UI; no identity, API, database, Engine, maps, worker, offline durability, device transfer or ERP call. No canonical contract/schema/example/client/ERP interface changed. No physical-device, browser-chrome zoom, OS-text, screen-reader or owner review evidence. Owner feedback remains **not received**.
- Final supported-runtime verification: bundled Node 24.19.0 + pinned npm 11.1.0; clean `npm ci` passed with zero vulnerabilities after the scoped peer-resolution repair; `npm run check` passed 4 files/127 Vitest tests and every audit/lint/contract/type/build/isolation gate; clean-install/final-audit browser rerun passed 6 tests. `git diff --check` passed.
- Handoff to Phase 05: reuse P01/P02 workspace and contract foundations. The new UI component/fixture artifacts may be reused only by later UI phases and do not establish transaction, lock or persistence behavior. No Phase 05 work, commit, push or publication was performed.
