# Phase 41 owner walkthrough

This is a rehearsal with dedicated test work. [Readiness and evidence](pilot-readiness.md) decides what remains outstanding. A local desktop run does not approve a live pilot.

## Start the local B2C rehearsal

Use the repository's supported Node 24/npm 11 and installed dependencies. On this Windows host, put `C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin` first on PATH and invoke npm through `node .local/runtime/node_modules/npm/bin/npm-cli.js` if the system npm shim selects Node 25.

1. Start the existing managed services: `npm run db:local:start`, then `npm run identity:start` in a separate terminal. Do not import maps or recreate issuer realms. The local issuer must already have the repository's control/client setup.
2. Run `npm run build:foundation`, then `npm run pilot:serve`. It creates a fresh synthetic, preverified personal account and an isolated marked PostgreSQL database. No existing business account or task is used. Routing defaults to a controlled HTTP provider; choose **bicycle** for this fixture.
3. In another PowerShell terminal set `$env:VITE_TAWSEL_API_BASE_URL="http://127.0.0.1:3041"` and run `npm run dev -w @tawsel/web -- --host localhost --port 5173`. Open `http://localhost:5173/login/independent`. Read the generated username/password privately from `.local/phase-41-credentials.json`; never share/commit it. Port conflicts fail rather than reuse another API. These credential/fixture routes must remain loopback-only.
4. Keep both terminals running during review. Stop the rehearsal by writing `stop` to `.local/phase-41-browser.stop`; wait for exit. The harness closes its API, removes its synthetic user, drops only its own database and deletes its credentials. A forced process kill may require inspecting those owned resources; never delete unrelated test databases.

Automated equivalent: `npm run test:browser:pilot`. It performs the same UI path below and inspects the actual downloaded XLSX. It automatically tears down. For configured Engine testing, set `TAWSEL_PILOT_ENGINE=live` before starting; all provider errors stay real and there is no automatic fixture fallback. Live mode does not create/configure routing services. Record actual Engine versions, profiles and dataset identity first. Target phones require the separately configured HTTPS deployment/issuer; localhost on a phone is not this PC, and the credential-bearing harness must not be exposed to a LAN.

## B2C: one complete day

Use two synthetic recipients (`تجربة ٤١ — منى عبد الرحمن`, `تجربة ٤١ — أحمد`) and a test contact number, not a customer. Enter both at `١٢ شارع التحرير، القاهرة` to prove separate task identity. Do not call/message the test number. These are observed software actions; no physical delivery is inferred.

| Step | Owner action | Required result / retain |
| --- | --- | --- |
| 1 | Sign in as an independent driver. On the target pilot, separately register and recover through an email you control. | Correct account; verified recovery email. Local preverified setup proves login only, not registration, SMTP or password recovery. |
| 2 | `/tasks/new`: enter name, number and written address. Leave collection blank for one; enter 125.50 EGP for the other. Save each. Reload `/tasks`. | Two persisted cards, same address but separate IDs; each missing pin explains the blocker. No B2B item/branch controls. |
| 3 | Each card → «مراجعة الموقع». Inspect the Cairo basemap, use the map or «اختيار وسط الخريطة», then «تأكيد نقطة التوصيل». Try manual coordinates by keyboard separately. | Unsaved choice is distinct from confirmed pin. Original address remains. Search-service outage must offer manual selection. Capture confirmed pin and map attribution. |
| 4 | `/day?kind=personal` → «جهّز الجولة». Choose vehicle, origin 30.0444 / 31.2357, last-customer endpoint and current planned time. «احفظ وجهّز المعاينة». | Pending then ready with exactly two stops; stale/partial/failed state never claims ready. Live target: repeat car/motorcycle/bicycle on suitable actual services. |
| 5 | «ابدأ الجولة». For each recipient: «اتجه للعميل» → «وصلت» → the delivery confirmation. | Each action is explicit. One result at a time, correct optional collection, next customer remains a suggestion. Reload and verify accepted progress. |
| 6 | «ملخص العمل وإنهاء الجولة أو اليوم» → day scope → «إنهاء يوم العمل». | Explicit closed day; processed versus delivered counts meaningful. Closing unfinished work must disclose retained work. |
| 7 | `/reports?kind=personal`: inspect day, results, collection and timing; «إنشاء ملف Excel» → download. | Two matching rows, 125.50 EGP recorded collection, same filter/snapshot/units/timezone; no remittance claim. Missing/uncertain actual time stays explicit. |
| 8 | In a fresh test day, disconnect only the controlled routing provider (never stop shared Engine services). Save preparation, then manually order and start when allowed. | Honest unavailable state, saved inputs, usable manual order with unknown road estimates. Existing execution continues. Retain failed-provider and accepted-action evidence separately. |

## B2B — explicitly MOCK, separate installation/storage

Use the existing native mock ERP; never describe it as the shipping ERP. It authenticates staff separately and uses the public source/webhook boundary. Repeatable automated setup/actions: `npm run test:browser:source`, `npm run test:browser:exceptions`, `npm run test:browser:branch-closure` (sequentially; all require the local issuer/database and shared port 5173). Inspect the respective `scripts/*-browser-server.ts` and `tests/*-browser/*.spec.ts` for deterministic IDs and cleanup. `apps/mock-erp/README.md` and `docs/erp/consumer-quickstart.md` explain standalone setup. A source browser harness writes private credentials to `.local/phase-27-browser.json`; never commit it.

For the long automated exception and branch walkthroughs set `TAWSEL_BROWSER_SLOW_MO=1500` for exceptions and `3000` for branch closure to pace browser actions. The unpaced and 500ms-paced runs reached the actual 120/minute session-read limit; the 1500ms exception and 3000ms branch runs passed with production throttling enabled. If a reviewer sees 429, keep the inputs and wait the indicated minute before retrying; retain that observation as a usability/capacity finding.

For interactive review, start the appropriate `scripts/source-browser-server.ts`, `scripts/exceptions-browser-server.ts` or `scripts/branch-closure-browser-server.ts` with `node --env-file=.env.database.local --import tsx`; start Vite with its config's API URL (3001, 3030 or 3031). Use local `/__fixture/info` only where the harness defines it to read the synthetic login details. Stop via that harness's `.local/phase-27-browser.stop`, `phase-30-browser.stop` or `phase-31-browser.stop` file. Review separate scenarios with fresh harnesses; do not combine their isolated databases.

| Scenario | Steps and pass condition |
| --- | --- |
| Native assignment | Staff signs into labelled native mock at localhost:5191, creates source shipment, chooses driver, prepares, then confirms actual receipt. Prepared work remains upcoming until receipt; accepted assignment becomes driver work. Verify native sent/accepted/applied statuses separately. |
| Partial/refusal/correction | On exceptions harness, start the company round. Deliver only permitted whole pieces; verify exact remaining pieces/amounts. Refuse a separate task with an explicit fee choice. Correct an eligible outcome before downstream receipt/day close; original and effective values remain visible. No decimal pieces or B2C splitting. |
| Subset receipt | Branch harness: no-answer `عميل المرتجع` (3 pieces); finish the arrived current customer. Offer 3 for return, request confirmation of 2, explicitly head/arrive at source branch. In native ERP confirm actual receipt of **2**, leaving **1 pending**. |
| Resume with remainder | Driver refreshes: «أكد الفرع القطع المحددة», «المتبقي معك: 1 قطعة». Resume must be enabled for the confirmed requested subset. The leftover piece does not impose a whole-batch gate or become delivered. |
| Another phone | Separate browser/device logs into the same driver, sees another owner and explicitly takes over. Old phone cannot apply new execution. In replay scenario, old queued evidence is received for review, not silently applied; current driver explicitly adopts only eligible evidence. Browser contexts are logical phones, not physical devices. |
| Redispatch | Native source scenario selects only genuinely returned compatible pieces for a new cycle. Old history/IDs remain; old-cycle actions cannot restore quantities. No direct driver transfer. |

## Physical device and real elapsed offline sheet

Run on **both physical Android/Chrome and physical iPhone/Safari**, including home-screen PWA mode where supported. Record model, OS/build, browser version, install mode, app commit/build, HTTPS origin, network, battery/power events, free storage, reviewer and UTC times. Do not paste tokens, customer data or passwords. Copy this sheet per device/run; blank is unrun.

| Observation | UTC start/end | Action IDs / pending counts before → after | Result and screenshot/log |
| --- | --- | --- | --- |
| Install and reopen, portrait/landscape/keyboard/safe areas | — | — | Unrun |
| Start and download while online, disconnect, explicit heading/arrival/result | — | — | Unrun |
| Close app/browser; reopen still offline; inspect retained same-account work | — | — | Unrun |
| Approximately 24 **elapsed** hours later, reopen before reconnecting | — | — | Not started; duration unknown |
| Reconnect/foreground/manual sync, compare original IDs and server results | — | — | Unrun |
| Same-account expired-session recovery, pending logout/account-switch block | — | — | Unrun |
| Compatible update with pending actions and another tab, reopen after update | — | — | Unrun |
| Controlled storage write failure in dedicated test profile | — | — | Unrun; no saved claim, input retained |
| Separate disposable profile storage loss | — | — | Unrun; unsent lost data cannot be restored by server |

Use real wall-clock dates and an independent clock reference for elapsed observation; leave clocks unchanged and record every reconnect/interruption. Accelerated clock fixtures get their own row labelled **accelerated**, never a real day. Server session expiry during the day is expected to require same-account login before replay. Do not clear storage, uninstall or reset the only copy of pending work. Fault injection is a controlled test, not proof of physical eviction/power-loss durability. No universal background synchronization, retention deadline or browser-storage guarantee is promised.

## Owner simplicity review (no implementer narration)

For login, empty day, missing pin, ready, heading, arrived, partial/refusal, branch waiting/subset, locally saved, rejected/review, expired session, storage failure, closure and report/export: ask the owner to state the page purpose, next action, missing input and awaited party. Observe their first action before explaining. Record exact words, competing actions, taps/backtracks, screen/state, device/build and severity. Failure to find the next action is a UX defect even when APIs pass.

| Reviewer/date/device | State and intended task | Owner's exact words/first action | Taps/backtracks | Defect/fix/retest |
| --- | --- | --- | --- | --- |
| Not provided | All requested states | No feedback received; not approved | Not measured | Owner review outstanding |

Test keyboard/focus, reduced motion, long Arabic names and LTR number isolation, 200%/400% zoom and OS enlarged text, real safe areas and touch targets. Keep screenshots and feedback tied to the exact build. Readiness remains blocked where required device, Engine, owner or operational evidence is missing.
