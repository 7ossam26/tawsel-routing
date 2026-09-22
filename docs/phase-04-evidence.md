# Phase 04 evidence — shared components and early simple-UX review

Date: 22 September 2026. Starting HEAD: `3af79b8` (`phase 3`), initially clean. No applicable `AGENTS.md` found. Requested setting: `gpt-5.6-sol` / `high`; the runtime identifies the GPT-5 family but does not expose the exact picker variant or reasoning effort, so the actual exact setting is **unavailable** and is not inferred from the prompt.

Scope: reusable UI primitives plus a development-only fixture journey and selected-driver desktop view. All business operations remain `designed`; no handler, identity, database, worker, Engine, map provider or ERP boundary was added or called.

## Prerequisite

Inspected the real P01/P02 workspace/contracts and committed P03 `DESIGN.md`, `docs/ui-spec.md`, action map, reference audit, component research and evidence. P03 is present at HEAD and names P04 next. Existing Cairo Arabic/Latin 400/600/700/800 imports and OFL attribution were retained. No Engine data/configuration, Docker, volume or import command ran.

The host default changed from the P03 evidence environment to unsupported Node `v25.2.1` / npm `11.6.2`; a bundled Node `v24.19.0` is available and was used for the final target-runtime check with the pinned npm `11.1.0`. Package installation and then a clean supported-runtime `npm ci` exposed the existing `openapi-typescript@7.13.0` TypeScript-5 peer declaration against the repository’s intentional TypeScript `6.0.2`. Added repository-scoped `.npmrc` with `legacy-peer-deps=true`; repeated plain `npm ci` then uses the same documented resolution without changing either checked pin. This is a small prerequisite setup repair, not a claim that the upstream peer declaration supports TypeScript 6. Zero audit vulnerabilities were reported.

## Checkpoint A — shared visual primitives

Implemented the P03 semantic tokens and responsive RTL layouts plus `ActionButton`, `Field`, `StatusNotice`, contact actions, progress, controlled RTL tabs, stop identity and one Radix-based focused overlay. The selected shadcn Button/Dialog contracts and Smooth progress/tab behavior were adapted rather than copied wholesale. The Smooth basic modal remains rejected. Cairo remains self-hosted; Lucide `1.47.0` and Radix Dialog `1.1.23` are locally packaged with retained ISC/MIT notices.

Strict typecheck first found three new possible-undefined indexing cases; they were corrected. Focused final `npm run build -w @tawsel/shared` plus `npm run typecheck -w @tawsel/web`: **PASS**. No unresolved component dependency blocks the fixture. Physical-device and assistive-technology review remain later evidence.

## Checkpoint B — representative interactions

Added a clearly labelled developer route with login presentation, ready daily work, start → proposed next → explicit heading → explicit arrival → one outcome sheet, and confirmed fixture-only next-stop state. Developer controls expose loading, empty, missing pin, another-device ownership, pending and rejected cases without demo network-success toggles. Desktop selected-driver monitoring names current/next, coherent counts and freshness while explicitly denying postdeparture staff outcome authority.

`apps/web/test/fast/driver-flow.test.tsx`: **PASS, 10 tests**. Tests cover one dominant ready action, stage separation, cancel/no-commit, retained draft, focus restoration, missing-pin recovery, no second start, exact two-of-three-piece partial selection/250 EGP/held remainder, pending/rejected wording, state availability and production-shell isolation. The production Vite branch tree-shakes fixture JavaScript; the post-build marker scan passes.

The first production build invocation correctly failed because `VITE_TAWSEL_API_BASE_URL` was absent. Repeated with the documented local value: Vite build **PASS** and `Production fixture isolation: PASS`. The first scanner implementation passed a URL object to `path.join` and failed; it was corrected with `fileURLToPath` before any pass was claimed.

## Checkpoint C — browser and review artifact

Created [ui-review.md](ui-review.md), Playwright configuration and six browser tests. Chromium evidence covers 360×800, 390×844, 1366×768, 1440×900 and effective 200% reflow, plus RTL direction/arrows, keyboard focus, Escape/return focus, retained input, reduced motion, locally loaded Cairo 400/600/700/800, localhost-only asset requests, long Arabic/LTR rendering, partial/no-answer/ownership/sync variants, list/map selection and absence of staff outcome authority. Eight screenshots are under `output/playwright/phase-04/`.

The first browser run failed all five then-existing tests before navigation because the headless executable download was incomplete. After installing it, four passed and one failed only on equivalent CSS duration serialization. The assertion was made numeric; that suite passed. A sixth test was added when the final requirements audit made partial/no-answer/ownership/sync variants explicit; the final repeated suite then **PASS, 6 tests**. Visual inspection found the narrow ready action initially below the fixed navigation; it was moved above secondary facts and the browser suite now asserts it is in the initial viewport. It also found and corrected separate tab/stop selection semantics. Full findings and limits are in the review record.

Owner feedback: **none received**. Automated/implementer review is not owner approval. The preview is reproducible with `npm run dev`, then `/__fixtures/driver-review`; it is intentionally unavailable in the production build.

## Acceptance mapping

| Scenario | Evidence | Limit |
| --- | --- | --- |
| Ready daily work | Component test + 360 screenshot; start is the only primary action and now initially visible | Fixture, not `round.start` acceptance |
| Heading versus arrived | Component/browser tests show `اتجه للعميل` then `وصلت` then `سجّل النتيجة`; saved fixture returns to an unheaded proposed next | No domain command/API |
| Outcome cancelled | Component and browser checks prove no confirmation, retained selection/amount and focus return | In-memory draft only; no durable local journal |
| Another device owns round | Component test proves ownership copy, transfer entry and no second-start control | No real online takeover |
| Reduced motion | Chromium reports animation duration ≤1 ms; actions/focus remain immediate | No OS setting or assistive-tech device |
| Production build | Vite output scan rejects fixture markers; production shell has no fixture link/data | Inert shared CSS remains bundled; no fixture simulator JavaScript |

## Versions and changed artifacts

Pinned additions: `@radix-ui/react-dialog 1.1.23`, `lucide-react 1.47.0`, `@testing-library/react 16.3.3`, `@testing-library/dom 10.4.2`, `@testing-library/user-event 14.6.7`, `jsdom 30.1.1`, `@playwright/test 1.63.0`. Existing React 19.3.0, Vite 8.3.0, TypeScript 6.0.2, Vitest 5.0.1 and Cairo 5.3.0 remain pinned.

Runtime/components live under `apps/web/src`, behavior tests under `apps/web/test/fast`, browser tests in `tests/browser`, the production isolation gate under `apps/web/scripts`, and licenses under `docs/licenses`. `README.md`, `docs/operations.md`, `DESIGN.md`, `docs/ui-spec.md`, the package status and this evidence describe the preview and limits.

No canonical schema, operation catalog, examples, generated client or ERP public interface changed: fixture actions deliberately do not claim implementation lifecycle. Therefore `contracts/`, `packages/api-client/`, `docs/erp/ERP-PLANNING-INPUT.md` and `docs/erp/field-and-status-mapping.md` remain byte-unchanged.

## Final verification

Using bundled Node `v24.19.0` and pinned npm `11.1.0`, plain `npm ci`: **PASS**, 311 packages installed, zero vulnerabilities. `npm run check`: **PASS** — audit, ESLint, OpenAPI lint, generated contract drift/examples/catalog, all workspace typechecks, **4 Vitest files / 127 tests**, shared/API/web builds and production fixture-isolation scan. Repeated `npm run test:browser:ui` after the clean install and requirements audit: **PASS, 6 tests**. `git diff --check`: **PASS**.

The clean install first failed before `.npmrc` with the known upstream peer mismatch; only the repeated plain command after the repository-scoped repair is the final pass. The host-default Node 25 runs are exploratory and are not the supported-runtime claim.

## Handoff and limits

Phase 05 may rely on the unchanged P02 state/envelope/catalog foundation and P01 commands. It may also rely on the verified fact that the P04 fixture does not publish a business route or transaction guarantee; none of these UI interactions is database evidence. Later UI phases may reuse the token/component contracts and `driver-flow.test.tsx` invariants, but must replace fixtures with their owned schemas/handlers and repeat connected browser evidence.

No real authentication, route calculation, map assets, offline durability, domain persistence, device takeover, outcome authority or ERP receipt/application was implemented. No owner approval, physical-device result, deployment, commit, push or Phase 05 work is claimed.
