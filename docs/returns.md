# Source-branch returns — Phase 21

Locally verified API/PostgreSQL boundary; [ordered evidence](phase-21-evidence.md). Native ERP screens/source outbox are P27, branch interruption/resume/new dispatch P22, corrections P23 and signed delivery P25–26. No new UI/browser/device or real ERP claim.

## Reproduce

Use the existing workspace and marked local PostgreSQL (`npm run db:local:start` if stopped), then:

```powershell
npm run test:returns
npm run returns:demo
npm run test:erp:returns
npm run test:erp:returns -- .local/phase-21-demo.json
```

The demo creates/drops its own isolated database. It uses real public ERP provisioning/intake and manual round start; driver authentication/bootstrap are explicit fixtures. Actual listening HTTP records no-answer, offers three pieces and waits through an API outage/restart. A separate process copied into `.local/phase-21-consumer-*` receives only URL, scoped ERP token and request/report IDs. It reads pending requests, receives two, recovers the same action, rejects wrong-branch/excess/stale commands and records one lost. The parent verifies persisted event intent and state after restart. `.local/phase-21-demo.json` contains no credential. It is a generated demonstration report, not the canonical example owner.

## Public operations

Canonical [schemas](../contracts/returns.schema.json), [OpenAPI](../contracts/openapi.yaml), [generated reference](reference/public-contract.md), [public client](../packages/api-client/src/returns.ts) and `p21-*` [validated examples](../contracts/examples/README.md).

| Operation | HTTP path | Authority |
| --- | --- | --- |
| return.listSourceBranchGroups | GET `/api/v1/returns/groups?kind=company` | Own company driver; only visible held return-required lines |
| return.requestHandover | POST `/api/v1/returns/request?kind=company` | Own company driver, session + CSRF + current logical device generation/snapshot |
| return.getRequest | GET `/api/v1/returns/requests/{requestId}?kind=company` | Own driver/request and live branch grants |
| return.getResult | GET `/api/v1/returns/actions/{actionId}?kind=company` | Own scoped action, including durable rejection/review |
| return.checkConfirmation | POST `/api/v1/returns/requests/{requestId}/confirmation?kind=company` | Own driver/session + CSRF; read-only claimed-subset check |
| return.listPending | GET `/api/v1/erp/returns/pending?driverId=…&sourceBranchId=…` | Bound source service, return.receive or return.dispose |
| return.getNativeRequest | GET `/api/v1/erp/returns/requests/{requestId}` | Same live source/branch authority |
| return.confirmSubsetReceipt | POST `/api/v1/erp/returns/commands/return.confirmSubsetReceipt` | Bound source with return.receive |
| return.recordDisposition | POST `/api/v1/erp/returns/commands/return.recordDisposition` | Bound source with return.dispose |
| return.getNativeResult | GET `/api/v1/erp/returns/actions/{actionId}` | Same source with a live return grant and request visibility |

ERP uses P08 expiring bearer credentials over HTTPS (HTTP loopback only in the client). Operator `integration.bindSource` accepts optional `returnCapabilities`: omission preserves existing grants; `[]` clears; a supplied array replaces. These grants are separate from intakeCapabilities and are never obtained by self-provisioning a role. Commands are explicitly delegated **service operations**, with verified tenant/integration/credential and `actorId:null`. A native ERP must authorize its staff before sending; an asserted human UUID is rejected, not authenticated. No human-delegation token protocol is claimed.

Native pending reads require both a driver UUID and real originating branch UUID, return at most 100 requests and expose `nextCursor` (pass it as `cursor`). This is pagination, not a returns quota. Driver group output is keyed by actual source branch **and integration**. Each request belongs to one group; multiple groups use separate commands and independent results.

## Quantities and command sequence

1. Read groups. Each candidate retains task/cycle/outcome/line and external shipment/dispatch identity. `availableToRequest` excludes unresolved offers on that same outcome/line. Submit positive whole-piece `quantity`, `outcomeId`, `taskId`, `dispatchCycleId`, `sourceLineId`, originating `sourceBranchId` and the latest `roundId` as an ownership anchor. An ended latest round can anchor returning carried goods; this does not reopen its day/round. Duplicate keys are rejected. Personal B2C is rejected by domain rules.
2. Accepted offer creates request/items with zero receipt and disposition. It does not move goods, set stock availability, alter an outcome/collection/current activity or block a still-compatible whole retry. No new quota, mandatory loss resolution or whole-batch clearance is introduced.
3. Native ERP reads the request and confirms **actual incremental received quantities**. Each selected item supplies `itemId`, `expectedRevision` and `quantity`; the command supplies `requestId` and `receivingBranchId`. That branch must equal origin even when the service/user can access both A and B. Unselected items need no revision or confirmation. Each selected item's revision advances once.
4. Request reads expose `requested`, cumulative `received`, `lost`, `damaged`, `unresolved`, item revision and current cycle `custody`. `requested = received + lost + damaged + unresolved`. Cycle conservation is `sourceQuantity = delivered + held + received + lost + damaged`. Delivered/collection history remains unchanged. Outstanding held pieces may exceed the pieces offered in this particular request.
5. Disposition uses the same subset structure plus `disposition: lost|damaged`, under its separate grant. These quantities leave unresolved custody but do not increase physical receipt. No available-stock or commercial liability/valuation/settlement field is supplied. Already received pieces cannot also be disposed from this held-goods ledger; ERP owns later warehouse/commercial handling.
6. The driver claims a **cumulative subset** for confirmation: `{claims:[{itemId,quantity:2}]}`. The server compares it only with committed physical receipt. State is `confirmed` for those two even if other offered pieces remain unresolved, or `waiting` with “بانتظار تأكيد الفرع للقطع التي سلّمتها.” Disposition cannot satisfy a physical-receipt claim. Empty/duplicate/excess/foreign claims are rejected. This read grants no standalone resume authorization/token; P22 must run the same locked predicate in its resume transaction, using its actual claimed subset.

Example: offered 3 → actually received 2 gives requested 3 / received 2 / unresolved 1 and custody held 1. Recording the remaining one lost gives received 2 / lost 1 / unresolved 0, held 0. A claim for 2 confirms; a claim for 3 still waits. There is no requirement to claim every offered piece.

Whole retry before receipt supersedes the old attempt's offers. Those request items retain their offered/unresolved history and `eligibility:superseded`; they cannot receive against the new attempt. Current custody reflects the new attempt's real outcome. `pending` means unresolved and still eligible for native processing; `settled` means that item's requested quantities were received/disposed, not all physically received. Group reads expose newly available return work after a later outcome without reusing an old offer.

## Persistence, races and unknown results

Migration `0019_source_returns.sql` retains old data and adds requests, items, monotone cycle balances, immutable transitions and the `cycle_custody` view. Composite FKs bind request→source branch/integration/driver and item→actual frozen outcome/cycle/line. SQL checks bound whole quantities and prohibit reversing confirmed totals. Request, receipt and disposition share driver → workday → assignment → task guards with outcomes/retry/closure/device writers and re-read after waiting.

Receipt/disposition atomically commits balances, item revision, append-only transition, `retry_dependencies`, current-custody projection, planning invalidation/job, audit, action result and source-only event intent. The original outcome is never rewritten. `OutcomeSnapshot.custody` exposes the new current per-line read; `progress.heldReturnRequiredPieces` and workday carry-forward use it, while historical outcome lines retain their original return-required facts. Future correction must observe the same dependencies and locks.

Use the **exact same envelope/action ID** for uncertain retries. Same action/payload returns the original immutable result even after later subsets change the current request; use GET for current state. Same ID/different envelope conflicts. A new ID repeating a stale item revision also rejects. Independent items may use their unchanged revisions. Any multi-item command failure rolls back its entire selected subset, with a durable business rejection when appropriate; it never clears denied goods.

HTTP 503, an unavailable service, a dropped response or action lookup `202 pending` is not receipt. Keep the native source command pending, recover its result or retry that same command. `EvidenceReceipt.evidenceStatus=received` refers to command evidence, not physical goods. The future ERP must atomically persist its own business intent/envelope and retry state in its own transactional outbox; this phase's CLI fixture does not establish that future guarantee.

Events are `return.requested` (offer snapshot), `return.subsetReceived` (one actual received transition) and `return.dispositionRecorded` (one lost/damaged transition). Each transition retains action/transition/item/outcome/cycle/source IDs, server recording time and original observed time, verified service identity, quantity and resulting item revision. Separate event examples prohibit treating loss as receipt. Outbox rows are committed intent; signed transport, recipient sequence/replay and ERP application remain P25–26.

## Handoff

P22 may rely on migration 0019, `returns/state.ts` locked confirmation/request reads, native receipt/disposition API/client, immutable per-item transitions, dependency facts and accurate current custody. It must still implement branch interruption/resume and new dispatch provenance without reopening a prior cycle. P23 owns correction/adoption races. P27 implements native pending/receipt/disposition screens and source outbox using these public APIs, with no required Tawsel staff receiver screen. No next phase is executed here.
