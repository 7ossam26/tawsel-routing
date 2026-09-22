# Phase 09 evidence — independent-driver task intake

Date: 2026-09-22 (Africa/Cairo)

Actual agent setting visible to this run: Codex GPT-5 family. The repository agent cannot inspect the UI picker’s exact model suffix or reasoning-effort value, so the requested `gpt-5.6-sol` / `high` setting is not claimed as verified.

## Prerequisite verification

- `npm run db:local:start` — PASS; dedicated marked PostgreSQL ready on loopback port 55432.
- `npm run test:provisioning` — PASS; 2 files, 33 tests. This re-exercised Phase 08 provisioning/actor binding and Phase 06 isolation against isolated real PostgreSQL databases.
- Small prerequisite repair: Phase 07 kept the browser CSRF/session cookie guard inside `auth/routes.ts`. `auth/guards.ts` now exposes the same-origin guard and stable cookie names for authenticated feature routes; existing imports remain compatible. No identity semantics changed.

Provider/runtime classification: PostgreSQL is real local infrastructure. Phase 08 issuer behavior in the prerequisite suite remains its documented fixture/local-provider mix. No Engine/map service was invoked.

## Checkpoint A — contract and task data

Changed:

- Added canonical `b2c-intake.schema.json`, OpenAPI create/list/get/revise paths, valid/invalid examples, generated TypeScript client/reference material, and promoted the six owned P09 operations/events to `verified-local`.
- Added migration `0006_b2c_intake.sql`: personal tasks, immutable original destination input, optional EGP minor-unit collection, append-only intake events, driver-scoped listing index, and explicit nullable departure lock field.
- Added personal-tenant intake service/routes using verified account principals, P06 resource predicates, P05 command identities, stable action retries, invariant locks and revision guards.
- Original address/pin input is stored outside the task row. Address-only tasks expose `needs-resolution` and `executionReady=false`; a confirmed coordinate contract is supported without inventing a map picker.
- `requirePredepartureEditable` is the reusable domain guard. The command path also enforces the same condition while holding the task lock so later departure work cannot race a revision.

Focused results:

- `node ... vitest.mjs run --project integration apps/api/test/integration/b2c-intake.test.ts` — PASS; 1 file, 4 tests.
- `npm run test:contracts` — PASS; 1 file, 165 tests.
- `npm run typecheck -w @tawsel/api` — PASS.
- Test evidence includes invalid/missing phones, fractional/unsupported amount rejection, company account denial, address-only readiness, same-action replay producing one row/event, same-address independence, revision conflict, departure lock, and guessed-ID denial from a second personal tenant.

Unresolved dependency: P11 owns address resolution and the real map picker. P09 accepts an explicitly confirmed coordinate contract but does not present a simulated map or resolve written addresses.

## Checkpoint B — simple entry UI

Changed:

- `/tasks`, `/tasks/new` and `/tasks/:taskId/edit` now use the personal browser session and the real P09 API paths.
- The Arabic RTL form keeps essential recipient name, phone and written address first; collection amount and instructions are optional. There are no item, quantity, branch, warehouse or commercial fields.
- Contextual errors remain beside their fields. The draft is retained in session storage across failed responses and back/list navigation. A pending action ID is retained and reused after an uncertain/lost response.
- List cards show actual API task data and an explicit `الموقع يحتاج تحديد` blocker. The UI states that the real map/pin picker belongs to P11 and does not simulate map success. The API contract already supports an explicitly confirmed coordinate supplied by that future picker.

Focused results:

- `npx vitest run --project fast apps/web/test/fast/b2c-intake.test.tsx` — PASS; 1 file, 3 tests. This is a labelled client fetch fixture, not database evidence. It covers missing-field placement/no submit, draft retention, stable action retry, save/list reload projection, unresolved label and edit prefill.
- `npm run typecheck -w @tawsel/web` — PASS.
- `npm run build -w @tawsel/web` — initially FAILED because `VITE_TAWSEL_API_BASE_URL` is a required build input and was absent from the shell. Re-run with `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'` — PASS; Vite production build and fixture-isolation check passed.

Unresolved dependency: visual pin selection remains unavailable until P11. No fixture or coordinate text field is presented to drivers as a substitute.

## Checkpoint C — integration verification

Changed:

- Added `b2c-intake.test.ts` through real Fastify handlers and isolated PostgreSQL, including lost-response replay, same-address independence and guessed cross-account read/mutation denial.
- Added `playwright.b2c.config.ts` and a real Chromium demo using the local Keycloak/Mailpit provider, personal session, API and application PostgreSQL.
- Promoted and regenerated operation coverage/client/reference, updated A05/E02 UI coverage, documented the personal-versus-ERP boundary, and added `docs/b2c-intake.md` as the reproducible handoff.

Focused results:

- `npm run db:migrate` — PASS; applied `0006_b2c_intake.sql` to the local application database.
- `npm run test:browser:b2c` — first attempt FAILED because an existing repository API owned port 3001. The dedicated P09 browser configuration was moved to API port 3002; rerun PASS, 1 Chromium test in 17.6s.
- Browser journey: real personal registration/verified-email activation, two same-address task creates, page reload, two explicit unresolved labels, independent correction and screenshot `output/playwright/phase-09-two-tasks.png`.
- Visual inspection at 390×844: Cairo RTL hierarchy, navy single primary action, two distinct task cards, phone/amount and amber location blocker are readable with no observed horizontal clipping. This is implementer inspection, not owner or physical-device approval.

Provider/runtime classification: Keycloak 26.7.4 and Mailpit are real local provider fixtures; Chromium is real desktop Playwright; PostgreSQL is the real dedicated application database. The initial `identity:start` invocation reported an H2 lock because those identity processes were already running; direct well-known and Mailpit checks returned 200, so no second identity instance was started and the existing healthy fixture was used.

Final verification:

- `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; npm run check` — PASS after corrections: zero audit findings; lint; OpenAPI/reference drift; all typechecks; **15 files / 300 Vitest tests**; API/shared/web builds; production fixture isolation.
- The first full-check attempt failed all database setup with `ECONNREFUSED 127.0.0.1:55432` after the local PostgreSQL process had stopped. After `npm run db:local:start`, the next run exposed two expected-migration inventory assertions still ending at 0005. They were updated for 0006; the focused lifecycle suite passed 6/6 and the complete check then passed. Neither failed run is counted as success.
- A post-check browser rerun first reported the deliberately safe identity-unavailable page after Keycloak had stopped, then Mailpit was separately found stopped. After starting `identity:start` and `identity:mail` in separate local sessions, the final `npm run test:browser:b2c` passed 1/1 in 15.7s.
- OpenAPI lint retains the pre-existing redirect-only callback warning (302 without a 2xx response); the description is otherwise valid.

Remaining limits: no real map assets/address resolution (P11), planning/routing/departure (P13–P15), offline queue/device test, Android/iPhone physical-device run, production TLS/email, owner review or real ERP connector. The screenshot proves render state, while the browser assertions plus database/API tests prove the stated local behavior.
