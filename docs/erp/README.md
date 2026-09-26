# ERP handoff — start here

**Phase 42 local candidate, 26 September 2026. Live pilot and real ERP connector are not approved or implemented by this package.** See [as-built handoff](../ERP-INTEGRATION-HANDOFF.md), [exact verification](../verification/integration.md) and [remaining readiness conditions](../verification/pilot-readiness.md).

## Reading order

1. [ERP-PLANNING-INPUT.md](ERP-PLANNING-INPUT.md): ownership, implemented behavior, ordered ERP work and remaining choices.
2. [field-and-status-mapping.md](field-and-status-mapping.md): actual reference identifiers, fields, states, events and worked results. Real vendor mappings remain explicitly unknown.
3. [consumer-quickstart.md](consumer-quickstart.md): clean install and two-way public conformance, including the report/export journey.
4. [source-protocol.md](source-protocol.md), [receiver-protocol.md](receiver-protocol.md), [integration guide](../integration-guide.md), [provisioning](../provisioning.md), [sender](../outbox-delivery.md) and [state/consistency](../tracking-and-consistency.md).
5. [Canonical HTTP](../../contracts/openapi.yaml), [schemas](../../contracts/common.schema.json), [sender events](../../contracts/events/sender-event.v1.schema.json), [examples](../../contracts/examples/README.md), [generated client](../../packages/api-client/README.md), [operation coverage](../contract-coverage.md).
6. [Release manifest](release-manifest.json), [execution ledger](../verification/requirement-ledger.md), [phase evidence](../phase-42-evidence.md) and [A–P readiness](../verification/pilot-readiness.md).

## Package and inspect

```powershell
npm run erp:package
npm run erp:verify
```

Output: `dist/erp-handoff/`. Its root `README.md` links this index; canonical paths retain repository layout. The installable reference consumer is `dist/erp-reference/` inside that package. It contains compiled `api-client/`, `mock-erp/`, migrations, native UI and portable `conformance/{source.mjs,source-driver.js,source-report.js,receiver.mjs}`. Use its pinned `package-lock.json` with `npm ci --ignore-scripts`. No publishing step runs. [Build/verification tooling](../../scripts/erp-release.mjs) also rejects missing/changed artifacts and unsafe manifest paths.

To make a portable ZIP on Windows after successful final verification:

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path dist/erp-handoff).Path, (Join-Path (Get-Location) 'dist/tawsel-phase42-erp-handoff.zip'))
```

Use a new archive filename if it already exists. Extract the ZIP, then run `node scripts/verify-erp-release.mjs .` at its root before installation. The archive contains exactly the manifested files plus the manifest itself.

`docs/erp/release-manifest.json` hashes the packaged files and records exact source/package/protocol/migration identity. Canonical `contracts/` owns definitions; client and consumer schema copies are generated and checked for equality. Manifest self-digest and secrets are excluded. Historical evidence links to private logs or server code explain provenance; they are not prerequisites for the external consumer. Public evidence/results are included.

The older [planning-pack](planning-pack/README.md) is a pre-P42 planning snapshot, superseded for this candidate. Do not send its old ZIP as the final handoff.

## What is demonstrated

| Capability | Current evidence | Still separate |
| --- | --- | --- |
| Scoped provisioning and intake | Real PostgreSQL/API and local OIDC checks; prepared/received and departure/revision rules | Vendor identity/field translation |
| Execution, returns, corrections and reporting/export | Public handlers/client, atomic domain tests, connected desktop browser/PWA checks | Physical devices and owner review |
| Durable sender/receiver/source | Separate databases/processes, public-only clean consumer, original-ID recovery and received/applied distinction | Production network/secret/backup operations and vendor conformance |
| Canonical contracts and package | Generated types/examples; route registration and manifest/digest checks | No deployed or public npm release |
| Pilot readiness | Conditions documented across A–P | Live Engine, target deployment/capacity/recovery, phones, elapsed offline interval and owner acceptance |

ERP owns commercial records and native administration; Tawsel owns execution. The connector translates public contracts using vendor-supported interfaces. No Tawsel database credentials, internal domain imports, operator token or universal compatibility promise belongs in the consumer.
