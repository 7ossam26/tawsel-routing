# Backup and isolated recovery

Phase 40 implements a reproducible **local** physical backup/WAL recovery rehearsal. [Measured results and gaps](verification/restore.md) determine what has actually passed. The pilot objectives remain **RPO ≤15 minutes and RTO ≤4 hours** for server-stored application data. No off-host destination, operator credentials or deployed topology is available: host-loss recovery and live readiness remain unverified.

## Run the local rehearsal

Use Node 24, PostgreSQL 18 Windows binaries, installed Chromium and the existing pinned Keycloak 26.7.4 / JDK 25.0.4.1 installation under `.local/identity`. The rehearsal never uses `.env.database.local`, never starts the existing issuer and accepts no source database URL. It creates a random directory under `LOCALAPPDATA`, removes inherited ACL access and grants the current Windows SID full control. It uses fresh loopback ports and copies the issuer/JDK into an ASCII path because this Windows JVM/PostgreSQL setup cannot reliably load from the Cyrillic workspace path.

```powershell
$env:Path='C:/Users/ahmed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin;'+$env:Path
$env:TAWSEL_RECOVERY_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run test:backup
npm run backup:rehearse
```

The second command takes several minutes and fails nonzero if any assertion fails. It creates separate application, identity and restricted mock databases within one disposable PostgreSQL cluster, then restores the whole cluster into a new empty sibling directory on another port. This shared physical timeline is a **local fixture topology**, not evidence that separately hosted production databases have a common recovery point. Synthetic business preparation uses the existing real domain transactions and controlled routing/provisioning fixtures. Verification uses actual Keycloak, browser OIDC/PKCE, API sessions/outcomes and signed HTTP to the independent mock process. The mock retains its restricted role and separate database.

The adapter in `scripts/recovery-store.ts` authenticates AES-256-GCM objects, fsyncs temporary output and publishes without overwriting an existing object. Identical archive retries are accepted; differing bytes, wrong/missing keys, corruption or unavailable storage fail. Decryption authenticates before publishing plaintext. It buffers a complete object in memory and is deliberately a small local rehearsal adapter; do not adopt it as a production-scale backup service. Use a supported backup manager/object-store adapter appropriate to observed database size, tested on the actual target.

The real archiver is temporarily pointed at an absent destination. The run must observe `pg_stat_archiver.failed_count` increasing before repairing it. A `pg_basebackup -Ft -X stream` backup is encrypted, restored and checked by `pg_verifybackup`. Application databases and a known round/outcome/action/event checkpoint are created **after** the base backup. A named PostgreSQL restore point is archived; the source cluster is stopped with immediate mode. Recovery uses only the base backup and encrypted archive objects, with `recovery_target_name` and promotion. A table committed after the target must be absent. This establishes that WAL replay recovered the checkpoint and stopped at the intended point.

Issuer database records include credentials, signing material and realm/client configuration. Provider/theme/config files are archived separately and restored into a fresh issuer home alongside the retained pinned binaries. Realm seed files are used only for initial fixture creation; the recovered issuer starts without import. The protected configuration object holds application session/client keys, outbox encryption/signing keys, database endpoints/credentials and mock credentials. Only database ports change for the isolated restore; issuer/client identity remains stable. Recovered application sessions are revoked deliberately, followed by fresh login; an expired session must receive 401.

Evidence is `.local/phase-40-restore.json` plus private `checkpoint-a.json`, `checkpoint-b.json`, `report.json` and process logs in the named directory. A successful backup command alone never sets restore success. All temporary clusters/processes owned by the run are stopped. Files are retained for inspection; there is **no automatic pruning**. Review the exact recorded directory, check its rehearsal marker and confirm both clusters are stopped before manually retiring that specific run. Never use broad computed-path deletion. The key and plaintext working copies inherit the private directory ACL. Encryption does not make the same-host key or backup survive host loss.

## Required production recovery inventory

Maintain a protected inventory outside Git with the following observed facts; no values in this table are deployed defaults.

| Component | Recoverable material and dependency |
| --- | --- |
| Application PostgreSQL | Exact server major/minor, system ID/timeline, migration ledger/checksums, base manifest/hash, complete WAL chain, owner roles/ACLs, TLS trust and private endpoint. Exclude Engine PostgreSQL. |
| Identity PostgreSQL | Its own base/WAL chain and recovery point, realm/client IDs, issuer hostname, user subjects/passwords, signing keys, realm policies and persistent sessions. Database backup is required; realm export alone is insufficient. |
| Identity runtime | Immutable image digest, matching providers/theme/font, proxy/hostname config, SMTP credentials, CA and custom recovery provider revision. External mail delivery must be rechecked. |
| Application/integration secrets | Session encryption key, OIDC client/worker secrets, source credentials, outbox encryption key and active/overlap signing keys scoped to recipient. Preserve exact revisions/key IDs and expiry/rotation history. |
| ERP/connector | Independently owned durable source outbox, inbox and applied checkpoints. Record that operator's recovery point and reconcile through public replay/snapshot/status APIs; no Tawsel cross-database dependency. |
| Web/PWA | Current and previous immutable app/web images, old hashed assets and compatible readers. Server recovery cannot recreate unsent actions from a lost/cleared phone. |
| Engine/maps | Separate artifact inventory below; never run imports as a recovery side effect. |

Before live use, identify a destination that survives loss of the primary host/storage/account under the agreed threat model, plus independent key escrow/access. OneDrive workspace placement, a local directory, a second database or a same-host volume does not establish this. Record provider/bucket/account/region, encryption/key custody, access roles, delete protection, network/TLS, tested read/write access and recovery operator access when the primary is unavailable. Never put credentials in commands, URLs printed to logs or committed examples.

Proposed policy for owner approval on the actual target: daily base backups, continuous WAL shipping, `archive_timeout=60s`, at least seven daily usable bases with every required WAL segment retained through the oldest base, and versioned encrypted configuration on every change. These are **not configured production retention guarantees**. Pruning must be backup-manager-aware, preserve the continuous chain and holds, and occur only after an independently verified newer restore. Size WAL/disk headroom using actual write load; an archive timeout alone does not guarantee an RPO.

Monitor job failure, destination read/write failure, latest recoverable checkpoint age, archive backlog, `pg_stat_archiver` failure changes, and primary/archive disk space. Proposed polling is one minute, warning at five minutes lag, critical before fifteen minutes, and immediate on a failed job or inaccessible destination. Deliver these alerts through the owner's identified channel and test receipt. Phase 40 verifies local stderr/nonzero exit and the database failure counter; external alert delivery, scheduling and production access are pending. A historical nonzero failure count is not a current outage; compare counter changes and last successful archival.

## Operator recovery order

1. Record incident time and last independently verified recoverable point. Fence the failed primary and pause app/provisioning/planning/outbox and connector workers. Preserve phone queues and original IDs. Confirm the recovery directory/volume and databases are new, isolated, empty and outside Engine/live mounts. Keep egress blocked until callback destinations and scope are verified.
2. Obtain the immutable release manifest and protected inventory/key escrow. Check key decryptability, exact database major/extension compatibility, backup manifest and complete WAL chain. Missing identity data, credentials, config or key means **recovery incomplete**. Do not substitute new secrets and assume old ciphertext remains usable.
3. Restore application and identity into isolated storage with explicit endpoint/port, disabled outbound workers and a named/time recovery target. Use the matching server tools to verify the base, replay through the intended point and confirm promotion/timeline. Never copy restored files over live data. Reconcile separately hosted DB checkpoints; the local common-cluster fixture does not prove distributed atomic recovery.
4. Restore issuer runtime/config and exact hostname/client identity using a private DNS/TLS route appropriate to rehearsal. Do not import seed realms. Conservatively revoke recovered application sessions and require same-account reauthentication. Confirm real login, issuer subject/account mapping, token checks, a known authoritative outcome/action receipt and unchanged command bytes. Verify recovery email separately.
5. Restore integration key material and review credential revocations/rotations since the recovery point. Resolve newer real-world revocations before enabling egress. Let legitimate leases expire or perform a documented operator recovery; the local test deliberately advances a lease to avoid a timing-only wait. Resume signed delivery and independently verify received versus applied checkpoints, public snapshots and original-ID replay without duplicate effects. An external ERP may be ahead; reconcile rather than resetting its inbox.
6. Start application/worker/web services with the pinned release, run readiness, old-queue and current API checks, then measure total service restoration time. Publish actual checkpoint age/data loss, RTO, fixture size, gaps and mitigation. Do not replace the proposed targets with observed numbers to create a pass. Switch traffic only under the existing deployment procedure once the actual target checks pass.

## Engine and map recovery is separate

The retained root `docker-compose.yml` contains setup/import services. Do not run it. Record actual Nominatim database/image/import-completion state, three OSRM datasets/profiles and compatible images, VROOM configuration, raw source PBF provenance, PMTiles region/license/checksum/size, and read-only mounts/private network aliases. Back up processed immutable artifacts and an appropriate Nominatim database backup to protected independent storage; retain exact image digests and configuration. Restore onto new verified paths and validate profile routing, geocoding and PMTiles range responses before rebinding read-only mounts. Never reimport into an active Nominatim/OSRM path.

No live Engine inventory, dataset sizes, independent archive or download throughput is available. **Engine/map restore time is unknown and unmeasured**, separate from the small application rehearsal. Estimate transfer time from measured bytes/throughput, add extraction/database recovery and health validation, then rehearse it. Existing PBF URLs or a successful tiny range fixture are not a verified processed-artifact recovery source. This remains a pilot dependency.

## Release gate and Phase 41 handoff

The [release procedure](deployment.md) requires recent, target-bound, independent-domain backup and an actual protected restore report. The local Phase 40 report has `separateFailureDomain=false` and cannot satisfy that gate. Measured RPO/RTO, healthy WAL shipping and verified business checkpoints must be recorded too. Do not attest app/identity/secrets recovery from backup-job completion alone.

Phase 41 may rely on the executable local rehearsal, negative controls, recovered API/identity/receiver evidence and explicit limitations in the [verification record](verification/restore.md). It still needs real target inventory/off-host/key-escrow/alert tests, realistic-volume recovery, Engine/maps, external email, physical phones and owner acceptance. Phase 41 is not executed here.

Primary references checked for this phase: [PostgreSQL continuous archiving](https://www.postgresql.org/docs/18/continuous-archiving.html), [base verification](https://www.postgresql.org/docs/18/app-pgverifybackup.html), [Keycloak database configuration](https://www.keycloak.org/server/db), [realm-export backup limitations](https://www.keycloak.org/server/importExport), and [Keycloak recovery considerations](https://www.keycloak.org/high-availability/single-cluster/deploy-cnpg-recovery).
