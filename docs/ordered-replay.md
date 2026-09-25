# Ordered replay and durable conflict recovery

Implemented and locally verified on 25 September 2026, Phase 34. [Ordered checkpoints, commands, failures and limits](phase-34-evidence.md). This extends the [P33 journal](offline-local-capture.md); its original action IDs, bytes and observation metadata remain intact.

## Public protocol

`POST /api/v1/sync/actions?kind=personal|company` uses the normal browser session and CSRF bootstrap. `SyncClient` submits `{actions: [...]}` with 1–50 original device envelopes. A malformed outer protocol rejects the request without acknowledgement. For a valid outer batch each feature command has its own existing handler/transaction; there is no batch-wide business acceptance. See [canonical schema](../contracts/sync.schema.json), [OpenAPI](../contracts/openapi.yaml) and [generated client](../packages/api-client/src/schema.d.ts).

| Entry status | Meaning | Client obligation |
| --- | --- | --- |
| `received` + `ActionResult` | Durable receipt; business status remains accepted, rejected or review-required | Commit the exact matching receipt locally before retiring any pending evidence. Keep received rejection/review separate from accepted progress. |
| `waiting` + dependency IDs | Required predecessor is not durably available; no terminal identity was saved | Retain original action and retry after confirming its predecessor. |
| `not-received` + code/message/retryable | No durable acknowledgement supplied for this entry | Keep original bytes/ID. Resolve the stated authentication/input/version problem; never infer success from another entry. |
| Lost or incomplete response | Receipt may already exist at the server | Retry the same ID/payload, or use scoped `action.getResult`. Omitted entries remain unsent locally. |

Transport retries do not generate a new ID. A changed payload under an existing ID remains an idempotency conflict. Rejected/review receipts are also final for that original action. No client timestamp selects a winner. Receipt time, commit time, original observation and uncertain clock quality remain separate.

The shared execution fence checks ownership/snapshot token before dependencies, allowing former-phone actions to be durably received as stale-device evidence even when their local predecessors are also incompatible. Current-owner commands wait on missing predecessors; failed, wrong-round or inconsistent sequence/version dependencies are retained with an explicit rejection. Existing handlers still check assignment, source, attempt, pin, return receipt and day/round state. A route revision alone does not invalidate an otherwise compatible outcome.

Migration [0026](../db/migrations/0026_replay_dependencies.sql) atomically saves immutable device/sequence/dependency metadata and accepted predecessor result versions alongside each device command. It never rewrites the envelope. Driver guards serialize business mutation; dependency reads do not lock an in-flight command identity while holding the driver guard. Older retained identities still use their existing durable results. Historical upgrade fixtures may execute old-schema commands before 0026; production startup requires every migration.

## Browser coordination and start barrier

[ReplayCoordinator](../apps/web/src/replay.ts) reads the actual scoped IndexedDB journal. Reconnect, mount/reopen, foreground and manual retry trigger it; background execution is not required. It verifies a fresh session for the selected kind/tenant/account/device and only releases a dependent action after the predecessor's acknowledgement is saved locally. Omitted results and failed acknowledgement writes leave descendants pending. Confirmed downloads refresh only after all unacknowledged actions have drained, so a partial replay does not replace the base under local projections.

Native Web Locks serialize capture, replay and connected execution sends under `tawsel:journal:<scope>`. The lock covers the new-start check through fresh plan, server readiness and start response. Tabs coordinate through the browser lock; BroadcastChannel only announces changed receipts. A terminated tab releases the lock; there is no clock lease or forced lock theft. Lock acquisition is bounded to 30 seconds; HTTP batch calls have a 30-second timeout. Without Web Locks, coordinated replay/new starts show a blocker; existing capture remains retained. Server idempotency remains the last duplicate guard.

The barrier checks both the unacknowledged journal and confirmed-but-not-yet-refreshed pending effects. Ended/view-only snapshots retire downloaded execution authority while preserving action/receipt history. Old sessionStorage page guards are only compatibility pointers: they clear or become review records after the corresponding IndexedDB acknowledgement exists. A second phone cannot detect unsent work on the first phone, but it must still pass the real server's active-round/owner/day/readiness checks. Pending day-end never permits a later offline start.

## Evidence and explicit adoption

`GET /api/v1/sync/conflicts?kind=...&deviceId=...` returns up to 50 authorized own-driver evidence records and `nextActionId`; continue using `afterActionId`. UUID cursor order is stable, not chronological. A fresh scan sees new records that sort before an old cursor. `taskLabel` is optional display context, not authority. `GET` evidence and `POST` adoption revalidate current permissions and state separately. Staff/integration credentials gain no recovery bypass.

`/local-work` shows phone-saved, received-rejected and received-review states separately. `/sync` lets the current driver inspect one retained outcome, then explicitly adopt it through the existing `evidence.adoptCompatible` command. It obtains a fresh owner snapshot and uses the original task/source/assignment/pin references. Server validation may still refuse. An eligible former-phone heading/arrival chain may support outcome evidence, with same task/attempt/versions/device/generation and increasing sequence, bounded to 1000 inspected records. Supporting movements never execute and never fabricate an arrival/physical origin. Prior rejected outcomes require their own accepted/adopted resolution. Actual receipt, redispatch, changed assignment or closed workday cannot be overridden. Adoption creates separate immutable history; the original review receipt remains unchanged.

## Reproduce

Use the supported Node 24 runtime and existing local PostgreSQL/Keycloak setup. On this workspace the runtime is `C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`; put its directory first on PATH. Start existing services if stopped (`npm run db:local:start`, `npm run identity:start`). Do not reimport realms or map datasets as ordinary setup.

```text
npm run test:replay
npm run test:local-capture
npm run replay:demo
npm run test:erp:sync
npm run test:erp:sync -- .local/phase-34-reconnect-evidence.json .local/phase-34-two-device-evidence.json
```

`test:replay` creates disposable isolated PostgreSQL databases and connects the real Dexie journal/replay/public client to listening Fastify HTTP. Identity and IndexedDB/lock mechanics are labelled test fixtures there. `replay:demo` builds the actual production PWA, starts an isolated fixture API, uses local Keycloak and real Chromium, and saves:

- `.local/phase-34-reconnect-evidence.json`: full browser process close/reopen, offline capture, deliberately lost first committed response, original-ID retry before descendants.
- `.local/phase-34-two-device-evidence.json`: separate two-tab native-lock and two-context simulated-phone takeover, durable review, explicit adoption and public evidence after reload.
- `output/playwright/phase-34-*.png`: actual mobile recovery/review captures.

The demo uses controlled OSRM/VROOM HTTP providers and network faults. It does not need map imports. It does not claim physical-phone, 24-hour, live Engine, production TLS or commercial ERP verification. `test:browser:offline` retains the P33 capture/abort/logout-guard regression using an explicit temporary replay-network fault, then releases it and verifies P34 recovery. Raw ignored reports may contain test identities/envelopes; screenshots and the redacted evidence document are the review artifacts.

## Exact Phase 35 handoff

Run only [Phase 35](phases/35-offline-auth-updates-ux.md) in the next task. It may rely on:

1. Local schema/IndexedDB version 1: immutable `actions`, separate `pending` and durable `acknowledgements`, account partitions and confirmed `downloads`; no schema upgrade or queue deletion was introduced here.
2. `ReplayCoordinator.run`/`beforeStart`, native journal lock, production lifecycle triggers and `synchronizedStart`; these preserve evidence on wrong/expired fresh authentication, interrupted HTTP and acknowledgement failure.
3. Canonical SyncBatch/Entry/BatchResult/Conflicts, typed `SyncClient`, the existing action/evidence/adoption APIs, immutable migration 0026 and checkpoint A–C integration tests.
4. Real browser process-reopen, two-tab and two-context recovery scripts and the explicit network/identity/provider limitations above.
5. Fresh server readiness and current-owner snapshot validation; received-review evidence is not unsent work and is not an accepted business effect.

Phase 35 still owns complete account-expiry/reauthentication UX, explicit logout/switch recovery across tabs, safe service-worker/application upgrades with pending/received states, and unsupported/newer stored-version user journeys. This phase deliberately does not solve these by clearing storage, expiring queued evidence, changing account identity or forcing service-worker activation. Physical-device/elapsed observation, commercial ERP and live Engine remain separate checks.
