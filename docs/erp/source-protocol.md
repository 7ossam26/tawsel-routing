# Native reference ERP source — Phase 27

This is a small, private test reference, not commercial ERP, stock valuation or accounting. The reference consumes the same published provisioning, intake, receipt and event contracts as a future vendor connector. Native source records, OIDC sessions, outgoing commands and the P26 inbox/projection live only in the separate `mock_erp_*` database. No Tawsel tables or internal modules are imported by its runtime.

## Source commit and authoritative acceptance

`apps/mock-erp/src/source.ts` and migration `0003_source.sql` commit local desired source changes, append-only local revision history, the exact public command envelope and the native actor subject together. `source_records.revision` is a local edit counter. It is separate from provisioning `sourceRevision`, shipment `expectedSourceRevision`, assignment revision, item revision, dispatch cycle and recipient event sequence.

The `source-worker` claims only committed commands, records its attempt and a 20-second lease, commits, then calls the generated public client. It completes the local status in a second transaction, fenced by that lease ID. An expired attempt is retried with the **same action ID, operation, payload and expected versions**. Retry delays double from two seconds to at most 256 seconds. One ordered source lane deliberately keeps the reference small; a pending earlier command blocks later sends. History and failures are retained indefinitely. This is not an exactly-once network claim.

Only a schema-valid durable `ActionResult` matching the action and operation establishes accepted/rejected/review-required. An HTTP exception, 503, malformed/mismatched reply or bare 401/403 leaves acceptance unknown and the command pending. In particular, revoked credentials after an earlier accepted-but-lost response cannot turn that acceptance into a local rejection. Fix credentials/connectivity and retry the original command; do not replace it with a new ID. Terminal rejected commands are retained; a reviewed correction is a new source change/command using current authoritative versions.

Local `desired` data never makes a shipment accepted or physically received. Native shipment reads use Tawsel's source-scoped intake API; the latest source command status is shown independently. A 51-item proposal may be saved locally and then rejected as a whole by Tawsel, leaving all 51 unassigned there. No source SQL updates can change Tawsel custody.

## Identity and native workflows

Optional `native` configuration enables the built React UI. It requires `privateTestOnly:true`, a loopback listener, a configured separate confidential OIDC client/redirect, an encryption key and an explicit list of permitted issuer subjects. `NODE_ENV=production` refuses native mode. The local client is `erp-reference`, redirect `http://localhost:5191/callback`; Tawsel uses its own client and cookies. Code/PKCE, nonce, one-use browser-bound state, encrypted token storage, refresh serialization, online introspection, origin/CSRF and separate entry/read/write rate limits are implemented. Missing/revoked authority fails closed. Configured native administrators are trusted to administer this one test source; a login role chooser grants nothing.

The native user is audited in the source database. Public command identity remains the explicitly delegated source service with `actorId=null`, matching P08/P21. The mock does not invent a human impersonation assertion. Native staff grants are deployment configuration; projected Tawsel role/branch grants and inherit/allow/deny exceptions are enforced by Tawsel's server on the resulting company user's actions. Provisioning acceptance and issuer readiness are displayed separately.

Views are `/` with sections for administration, shipments, per-driver/source-branch returns and integration status. Snapshot editing is intentionally a **single line of whole pieces**, EGP integer minor units, explicitly confirmed coordinates and a source splitting flag. Full public contracts still support their documented multi-line records through the connector CLI. Preparation is upcoming only. Received assignment requires the native explicit physical-receipt assertion. Predeparture removal requires no reason. Departed work is read-only for staff; Tawsel independently enforces that restriction if a stale client submits anyway. The source adapter also supports the public reassignment/urgency commands; this minimal UI does not duplicate a full dispatcher workspace.

Receipt starts at the selected driver and original branch. Staff enter only the actually received subset, with every item's current expected revision; zero/unselected items are omitted. Lost/damaged disposition is separate and requires its own explicit assertion. Refresh shows actual received, unresolved, lost and damaged counts. Previously confirmed requests can be read again from the public request endpoint, including fully received ones. New dispatch requires a new source cycle and a complete explicit outstanding-price snapshot funded only by actual compatible receipts. Unreceived/disposed pieces and old attempts are retained. No cash settlement or inventory availability is inferred.

## Public source status and local CLI

`GET /api/v1/source/status` lives at the **consumer** base URL with its separate bearer status credential. `contracts/source.schema.json#/$defs/Status`, generated `SourceStatus` and `sourceStatusClient` own its public shape. It lists the latest 200 commands and first 200 local record identities/statuses, with `truncated:true` if more exist; it is not a complete export. It exposes no OIDC/service secrets. The native UI reads its own history and public Tawsel sender queue alongside receiver received/applied checkpoints. Source acceptance, outbound event transport and receiver application remain distinct.

From the independently installed bundle:

```powershell
$env:MOCK_ERP_CONFIG=(Resolve-Path receiver.json).Path
$env:MOCK_ERP_DATABASE_URL='postgresql://OWN_RESTRICTED_ROLE:SECRET@127.0.0.1:55432/mock_erp_reference?sslmode=disable'
node mock-erp/dist/main.js migrate
node mock-erp/dist/main.js source-submit command.json
node mock-erp/dist/main.js source-status
node mock-erp/dist/main.js source-worker
```

`command.json` has `{command,records}`. `command` is the unchanged canonical provisioning/intake/return envelope with integration scope. Each local record is `{kind,externalId,expectedRevision,desired}`; kind is branch/role/user/driver/shipment/return, expectedRevision is the local counter (zero for a new record), and desired is the ERP-owned proposed change. All batch records commit with one command. The CLI is an explicitly trusted local connector operator with access to its own database/configuration; browsers never receive that credential. `source-worker --once` performs one due attempt, not an implicit queue drain. `worker` is the independent incoming projection/report worker.

Native form requests retain the same action ID in session storage until the source acknowledges its local commit. A lost browser response can be recovered with “استعادة الطلب المحفوظ”; an uncertain response never creates another ID. Durable pending source commands survive browser logout and process restarts. Protocol fault injection exists only in test harnesses, with no production/user fault toggle.

See [two-way quickstart](consumer-quickstart.md), [worked mappings](field-and-status-mapping.md), [planning slices](ERP-PLANNING-INPUT.md) and [ordered evidence](../phase-27-evidence.md). No owner/physical-device, production TLS, vendor ERP interoperability, live Engine or measured freshness/load claim is made by the local reference.
