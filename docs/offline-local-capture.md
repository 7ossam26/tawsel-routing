# Downloaded started work and local action capture

Implemented in Phase 33; [ordered verification](phase-33-evidence.md). Phase 34 now connects this unchanged journal format to [ordered replay/conflict recovery and sync-before-start](ordered-replay.md), with [separate real-browser evidence](phase-34-evidence.md). The Phase 33 scope/handoff below is historical wherever it calls replay future work. P35 still owns complete reauthentication, safe exit and update UX. The capture browser regression explicitly blocks replay transport while checking unsent/account-guard states, then releases it and verifies recovery.

## Driver behavior

Open `/rounds/current?kind=personal` or `kind=company` online on the execution owner phone. The page downloads the authorized active round, frozen delivery inputs, confirmed progress and available plan/road context. It brackets reads with the existing locked device/current snapshot, checks ownership/revisions and commits the download before enabling capture. First download, login, takeover and a new round require the server. New start also requires a successful local write probe and no local pending work.

After download, the same selected account/device can reopen offline and record explicit heading, arrival, full delivery, no-answer, permitted whole-piece partial delivery and refusal. These commands use the actual production components and contracts. A pending overlay supports the next local action while the separate confirmed progress remains unchanged. “محفوظ على الهاتف” means the IndexedDB transaction committed; it does not mean Tawsel accepted the outcome or ERP received/applied it. Failure leaves entered quantities visible and makes no command POST. External call/navigation links record no business action.

P41 review repaired the local refusal gate: a permitted refusal reported by phone does not require or invent arrival. It still cannot resolve another current customer, bypass the downloaded allowed actions or claim server acceptance before acknowledgement. [Pilot regression and limits](phase-41-evidence.md).

The additional connected execution hook journals scheduling, retry, correction, return/branch and closure commands before sending them, but these screens still require connectivity. Preparation, new starts and pin editing retain their connected protocols and are not downloaded continuation features. An unknown online result retains its original ID/body; manual resend is available. There is no automatic queue replay, background-sync promise, offline optimizer or offline new-round start.

`/local-work?kind=…` exposes only the selected account's stored actions, receipt status, capture time and a collapsed diagnostic view (IDs, dependencies, generation, versions). Deliberate login/account switch and logout expose pending work and link back to its actual account kind; full recovery/exit behavior remains P35. A known server rejection of access must not become an offline authorization fallback. Physical access to an unlocked browser profile is not a separate authentication boundary.

## Storage and compatibility

Dexie **4.4.6**, IndexedDB database `tawsel-local-work`, database version **1**, download format **1**. Canonical local records live in [`contracts/local-work.schema.json`](../contracts/local-work.schema.json); this is a browser format, not an ERP endpoint.

| Store | Purpose and identity |
| --- | --- |
| `partitions`, `selection` | Server-resolved context by `JSON.stringify([kind, tenantId, accountId, deviceId])`; one selected partition pointer, no work under a generic cache key. |
| `downloads` | `[scope, roundId]`: authorized confirmed current/outcome/owner/plan snapshot, generation token and download time. |
| `actions` | `[scope, actionId]`, unique `[scope, sequence]`: immutable original envelope/serialized bytes, local capture time and return route. |
| `pending` | Same action key: pending effect and local sequence, committed atomically with `actions` and `counters`. |
| `acknowledgements` | Same action key: complete matched server receipt/result and local receipt-save time. |
| `counters` | Per-partition sequence; transaction failure rolls it back. Local dependencies name the preceding unconfirmed action. |
| `health` | Temporary non-business write probe; does not promise space for future records. |

Action schema/payload stay **1.0.0**. Existing scope/resource/base revisions, expected activity/source/assignment/pin values, owner generation, sequence/dependencies and uncertain device-clock evidence are retained. Device observation, local capture, server receipt and server commit timestamps are separate; client clock never orders server authority. Pending UI projections are never saved over confirmed snapshots or used as reports of actual server commit time.

Actions are append-only through the application module; receipts are persisted before pending cleanup. Accepted ordinary overlays remain until a confirmed download covers the receipt's activity revision. Rejected/review receipts remain inspectable. The module never expires actions after 24 hours, purges another account, recreates an incompatible database, or changes bytes on retry. Active-round legacy session commands are imported with their exact previously sent bytes before status lookup; other legacy session guards remain in place. P35 must test real version upgrades and old-client/server compatibility before shipping a format change. Unknown action payload/download versions stop execution and preserve evidence.

`navigator.storage.persist()` is requested and its actual result shown. Chromium transactions request strict durability; browser/platform behavior and eviction still apply. A completed write is not a promise against device loss, storage clearing, power failure on every platform or 24-hour retention.

## Shell and route context

Workbox build **7.4.1** generates `sw.js` from production output. It precaches the self-hosted HTML, JavaScript, CSS, fonts, icon and manifest. It caches no session/API responses, bearer material, map tiles or generic user-work responses. It neither forces `skipWaiting`/reload nor supplies a Workbox business queue. The worker covers application navigation while API/map paths stay network-only. The Vite development server is not PWA evidence; the demo builds and serves the production output.

Optional `PlanningRoutePolicy.roadRoute` is a validated OSRM `RouteResult` for the immutable plan order. The existing worker requests it outside PostgreSQL transactions with a bounded deadline and stores it in the existing `route_policy` JSON; no migration or new endpoint. Road failure leaves a valid plan usable with `null`. Older/manual plans can omit it. Download stores the exact available geometry and its plan; no straight-line road is invented. Without basemap coverage the screen keeps a destination list, recipient/contact/collection detail and a clearly labelled standalone stored-road drawing. The controlled provider's test geometry is not evidence of live Egypt routing coverage.

## Reproduce

Prerequisites: Node 24, installed dependencies, the existing local PostgreSQL setup and Keycloak on 8085 (see [identity](identity.md)). Do not import map datasets. Run:

```powershell
npm run test:local-capture
npm run test:browser:offline
npm run test:erp:planning
```

`test:browser:offline` builds foundation/client and the production PWA, starts the existing isolated real-API delivery harness and uses a fresh persistent Chromium profile. It verifies an offline draft cannot start, downloads a real accepted round, disconnects, records actions, aborts a native IndexedDB transaction, closes the entire browser and reopens offline, then checks retained bytes, account exit guard, cache isolation and absent unsent IDs in server monitoring. Routing/identity seed data are labelled fixtures. `.local/phase-33-browser-evidence.json` records results and the profile path; reviewed PNGs are under `output/playwright/phase-33-*.png`.

On this Windows host npm's installed PowerShell launcher selects Node 25 even when Node 24 is first on PATH. The executed supported-runtime demonstration was `& 'C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts/offline-demo.mjs`. Use the same explicit Node 24 executable with `node_modules/vitest/vitest.mjs` if needed.

## Exact Phase 34 handoff

Use `LocalWork.capture`, stored `actions.bytes/envelope`, `pending`, `acknowledgements`, account selection and version checks directly. Replay must preserve action IDs, original payloads/base revisions, observations and dependencies. P33 deliberately provides no queue coordinator, cross-tab replay lease, dependency scheduler, automatic reconnect replay or conflict adoption UI. Persist receipt before acknowledging evidence; resolve rejected predecessor/changed-owner chains without replacing original snapshots/envelopes. `/monitoring` continues to read only server-received facts.

No physical Android/Chrome or iPhone/Safari run, installed home-screen review, power-loss test, storage-clearing recovery, 24-hour observation, commercial ERP, live Engine verification or owner approval is claimed.
