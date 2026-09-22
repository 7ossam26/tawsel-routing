# Tawsel implementation status

Updated: 22 September 2026. Package revision 3 under D-109–D-111.
Planning HEAD: `3d6291697fb0baeb69215237bf1d09dbf6d1d9cd`.

## Current state

The owner requested smaller self-contained implementation tasks after reviewing the broad 11-phase package.
The [current package](phases/README.md) contains 42 sequential prompts, a 65-requirement catalog, complete D-01–D-111 traceability, per-phase model/reasoning recommendations, explicit ERP handoff deliverables and a review checklist.
**Phase 01 is implemented and locally verified.** It adds the bounded web/API/shared workspace, locally bundled Cairo typography, meaningful configuration and real-HTTP tests, locked dependencies, CI, non-destructive setup, and operations evidence. It does not add delivery behavior, an application database, identity, worker, routing adapter, public ERP contract, or deployment. Phases 02–42 have not started.

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
| [02 — State vocabulary and canonical contract foundation](phases/02-state-contract-foundation.md) | Not started | Not run | No implementation result yet |
| [03 — Visual system and requirement-driven action specification](phases/03-design-action-specification.md) | Not started | Not run | No implementation result yet |
| [04 — Shared components and early simple-UX review](phases/04-representative-ui-review.md) | Not started | Not run | No implementation result yet |
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
The next execution prompt is [Phase 02 — state vocabulary and canonical contract foundation](phases/02-state-contract-foundation.md). It may rely only on the paths and commands listed in the Phase 01 handoff below.

## 22 September 2026 — Phase 01 execution

Starting HEAD: `eacf6b3fa596a845b4290c6f3ad471b39551e8d8`. Full checkpoint logs and acceptance mapping are in [docs/phase-01-evidence.md](phase-01-evidence.md).

- Checkpoint A: added `apps/web`, `apps/api`, and `packages/shared`; safe required environment parsing; Node 24/npm 11 pinning and lockfile. `npm run dev` served the RTL shell on 5173 and actual workspace health on 3001. Docker Desktop was stopped, so Engine runtime state remains unverified and health truthfully reports `engine=not-checked`.
- Checkpoint B: fast selection passed 6 configuration assertions; integration selection passed 3 tests over a real ephemeral Fastify listener. An initial invalid-query test exposed silent additional-field stripping; validation was corrected and the unchanged test then passed. Missing API configuration exited 1 with the named key. Lint, typecheck, and build passed.
- Checkpoint C: added read-only CI, `scripts/setup-app.ps1`, lockfile-based setup, and operations documentation. The first isolated run exposed a hidden dependency on prior shared build output; command ordering was corrected. The repeated isolated `npm ci`/`npm run check` passed, preserved `.env` and an unrelated sentinel, and had no Engine data directory. A transient critical advisory in `concurrently@9.2.1` was removed by pinning `9.2.4`; final audit reports zero vulnerabilities.
- Browser evidence: a headed Chromium render at 390×844 with reduced motion showed the concise Arabic RTL shell. A first pass found a favicon 404; after adding the local SVG, console errors/warnings were zero. The typography follow-up verified computed Cairo weights 400/600/700/800, all four font loads, and localhost-only font requests. The current screenshot is `output/playwright/phase-01-cairo-rtl-mobile.png`; the OFL text is retained under `docs/licenses/`. P03 must formalize this baseline as shared typography tokens and P04 must reuse/verify it in representative components. The shell is static foundation content; the API evidence is from the real local handler, and no Engine call occurred.
- Actual runtime: Node `v24.19.0`, npm `11.1.0`, TypeScript `6.0.2`, Vite `8.3.0`, React `19.3.0`, `@fontsource/cairo 5.3.0`, Fastify `5.12.5`, Vitest `5.0.1`. Recommended model/effort was `gpt-5.6-sol`/`high`; the agent runtime exposed only GPT-5, not the exact picker variant or effort, so the latter are not asserted.
- Preserved boundaries: Engine Compose/startup/profile/VROOM config and Stitch exports were unchanged. No database/volume/import command ran. No ERP planning interface exists yet, so ERP mapping/consumer documents are unaffected and remain Phase 02+ deliverables.
- Handoff to Phase 02: rely on root `npm ci`, `npm run dev`, `npm run test:fast`, `npm run test:integration`, `npm run check`; workspace paths `apps/web`, `apps/api`, `packages/shared`; required `.env.example`; API port 3001; and the stable non-domain `GET /health` behavior. Do not treat workspace health as routing readiness or as a released public contract.
