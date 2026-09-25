# Offline account recovery and update compatibility

Implemented locally on 25 September 2026, Phase 35. [Ordered checks, actual failures and limits](phase-35-evidence.md). This extends the retained [capture](offline-local-capture.md) and [ordered replay](ordered-replay.md) production paths.

## Account recovery and exit

Private screens verify the current session before showing cached work online. Only the selected kind/tenant/account/device can read its downloaded work or replay it. Definite expiry, revocation or account mismatch hides private screen state and keeps the journal. Offline reopening uses the already selected, unblocked partition; offline devices cannot discover a new server revocation. Foreground/reconnect and the visible online check revalidate access. Browser storage is not encryption or protection against someone with developer tools/physical control of an unlocked profile.

An expired session offers **الدخول للحساب نفسه**. `SessionClient.begin` sends `reauthenticate: true` plus optional `expectedAccount: {tenantId, accountId}` from the selected partition. The server resolves those public references to a configured-issuer subject and restricts the one-use OIDC callback. This works after cookie loss or expiry of the old reauthentication record. It reveals no username or token and grants no authorization; PKCE, state, nonce, signed token, verified recovery email and current membership checks remain required. A different subject is refused before session creation. Company/personal identities never merge. Provider-hosted email/password recovery remains P07; no SMS or new unauthenticated evidence-upload endpoint.

Exit checks every unacknowledged action, including an action whose pending overlay is missing. It acquires the journal lock and atomically persists `selection.exiting=true` plus a blocked partition before the remote logout. Capture transactions in other tabs cannot commit after that fence. A late response with the old session expiry cannot reopen the exited partition. Other mounted private screens unmount their data when selection/access changes. The browser ends only the selected account-kind session; ERP sessions remain independent.

An unknown logout response leaves the selection sealed and offers **إكمال تسجيل الخروج**. Retrying the idempotent server logout completes the transition; it never clears action, receipt, download or draft history. The server cannot inspect unsent browser storage, so the queue gate is a browser responsibility; directly calling logout still revokes the server session and never deletes local evidence.

| Local evidence | Exit | Driver explanation |
| --- | --- | --- |
| No durable matching local receipt | Block | Saved on phone; reconnect/reauthenticate and retry synchronization. |
| Server committed, response or local receipt write lost | Block until same-ID result/receipt is saved | Unknown delivery remains pending locally. |
| Durable `received` + `accepted` | Allow | Accepted, even if a covering view refresh is still pending. |
| Durable `received` + `rejected` / `review-required` | Allow | Server retained the evidence; unresolved review survives exit. |
| Revoked/disabled account cannot upload | Block while unreceived | Access is stopped; contact the company administrator. Evidence remains on this phone. |

No business outcome can be applied through revoked authentication. A restored authorized account can retry the same original bytes; incompatible business state produces its ordinary durable result. Received review is never added to accepted progress. Explicit current-owner adoption keeps the existing P23/P34 validation and immutable original receipt.

## Local formats and retained payload readers

Canonical local ownership is [local-work.schema.json](../contracts/local-work.schema.json); HTTP ownership is [session.schema.json](../contracts/session.schema.json), [action-envelope.v1.schema.json](../contracts/action-envelope.v1.schema.json) and [sync.schema.json](../contracts/sync.schema.json). Generated public types are not separately maintained schemas.

| Version | Reader/migration behavior |
| --- | --- |
| Released Dexie 1 / native IndexedDB 10 | Frozen [P34 fixture](../apps/web/test/fixtures/p34-local-v1.json). Original actions, bytes, observations, sequences, dependencies, snapshots and receipts remain valid. |
| Dexie 2 / native IndexedDB 20 | [Atomic additive upgrade](../apps/web/src/local-schema.ts) adds account-scoped form drafts and a health marker. Existing tables/records are not rewritten. Transaction abort leaves v1 intact; reopen can retry. |
| Local schema newer than this application | Fail closed with compatible-version guidance. Never delete/recreate the database to recover from VersionError. |
| Envelope/payload `1.0.0/1.0.0` | Explicit [browser reader](../apps/web/src/action-reader.ts) and [server reader](../apps/api/src/commands/readers.ts). Preserve immutable original bytes; normal feature validation/authorization still applies. |
| Unsupported version pair or changed stored bytes | No default interpretation, new ID or successful receipt. Browser shows attention; server returns `unsupported_schema_version` for an unsupported outer batch, before any entry executes. Keep the original evidence. |

A future version must add an explicit reader/translator and retained-queue fixtures before rollout. Translation may not mutate stored originals/hash inputs, turn an old action into a new action, infer timestamps or silently discard unknown evidence. There is no automatic action purge, including after the roughly 24-hour target. A six-year-old metadata fixture verifies no age-based deletion; it is not six years or 24 hours of elapsed device observation.

Exception inputs use v2 scoped drafts keyed by account, task/attempt, source revision and outcome choice. Navigation and reopen preserve the choices; draft read failures never overwrite an unread stored draft. Drafts are not submitted actions or accepted outcomes. A changed account cannot read them. Retained source revisions prevent applying old inputs to a different snapshot.

## Service worker and release behavior

The production Workbox shell self-hosts assets and never caches session/API responses. `/sync` is included in the offline shell fallback. `UpdateNotice` reports a waiting release; it offers an explicit update on account/review pages, keeping form screens focused. There is no controller-change automatic reload. API/session/source schemas do not depend on the currently active worker.

Activation takes an exclusive `tawsel:lifecycle` Web Lock; capture/replay/new-start/exit take it shared before their per-scope journal lock. The page checks all retained partitions for unreceived actions and pending overlays. The actual waiting worker independently reads IndexedDB and requires one app page. It refuses pending work, an unfinished exit, unreadable/missing storage and extra app tabs. The generic Workbox `SKIP_WAITING` message is intercepted; only the checked `TAWSEL_SAFE_UPDATE` path permits explicit activation. After success, only the initiating page reloads. A refused update leaves the page and journal intact.

After all controlled app pages close or navigate to the issuer, the browser can naturally activate a waiting worker even with a queue present. That is why preserving old local schemas and server readers is mandatory. The application does not force this lifecycle or promise background execution. Old pages receiving `versionchange` may close their IDB connection; the application does not respond by reloading or clearing it.

Release obligations for P39: deploy compatible server readers first; retain old hashed static assets while old pages can exist; test retained queues before changing/removing a reader; use forward-compatible server migrations. If a web rollback encounters newer local storage, retain it and show the compatible-version path. Do not publish an older destructive migration, unregister workers, clear site data or use a cache purge as a queue repair. Physical installed-PWA behavior and deployment rollout are not proven by these local tests.

## Phone and storage loss

The focused **الهاتف والتخزين** details explain loss limits. The actual links open current round state and authorized server-received evidence. A storage-empty second Chromium context reads zero local actions and the unprocessed server state until evidence arrives; it cannot recover unsent actions on the first context. Received evidence remains queryable after logout, subject to current authorization. No fabricated reconstruction, retention guarantee, GPS, background guarantee or financial settlement is added.

## Reproduce

Use the existing PostgreSQL and local Keycloak installations; do not import maps or reimport realms. Use Node 24 (here `24.19.0`) first on PATH. If needed, start existing services with `npm run db:local:start` and `npm run identity:start`.

```text
npm run test:offline-session-update
npm run test:local-capture
npm run recovery:demo
npm run test:erp:recovery
npm run test:erp:recovery -- .local/phase-35-recovery-browser.json .local/phase-35-retained-review.json
```

The integration file uses actual Sessions/OIDC/public clients/feature handlers and real isolated PostgreSQL, with a labelled signed issuer fixture and fake-indexeddb. `recovery:demo` builds the production PWA plus a separate migration-test module under `.local`; the production app never imports the test module. It starts a disposable real API/database and uses actual local Keycloak and Chromium. Controlled routing providers, forced expiry, blocked network replies and a changed worker script identify fault/release fixtures. The temporary worker bytes are restored after the tests.

Browser artifacts: `.local/phase-35-native-migration.json`, `.local/phase-35-recovery-browser.json`, `.local/phase-35-retained-review.json` and [review captures](phase-35-evidence.md). The consumer checker reads public envelopes/receipts only, not internal database tables. Private raw reports/traces may contain fixture identities; they are not production logs.

## Exact Phase 36 handoff

Phase 36 may rely on the P34 ordered replay/history contracts plus:

1. `LocalWork` v2 with atomic retained-v1 migration, immutable original actions and distinct acknowledgements/pending overlays; unknown formats fail closed.
2. `SessionClient`, server-bound `expectedAccount` callback restriction, `bindSession`, durable `exitAccount`, and production account boundary. Durable evidence receipt permits exit without business acceptance.
3. Actual waiting-worker gate, native Web Locks and native IndexedDB upgrade-abort/reopen evidence. No generated HTTP acceptance or observation time comes from worker activation or queue migration.
4. Scoped durable exception drafts and concise local/server recovery views. Phone-local work remains excluded from server reporting until received and accepted.
5. Named connected Vitest tests, two real-service Chromium scenarios, canonical/generated schemas/examples/client and public-only consumer checks listed in the evidence ledger.

Reporting must distinguish accepted outcomes from pending overlays, rejected/review evidence and separate later adoption. Original device observations and clock quality remain separate from server receipt/commit timestamps. Phase 36 is not executed here. Phase 41 retains real Android/Chrome and iPhone/Safari installation/home-screen, power loss/eviction, actual elapsed offline observation, accessibility and owner usability review. Commercial ERP, live Engine, production TLS/deployment and performance remain their separate checks.
