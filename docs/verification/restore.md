# Phase 40 recovery evidence — 26 September 2026

Status: **local rehearsal passed**, with target-host/off-host work still pending. No deployed host, independent backup destination or external alert channel is available. Live RPO ≤15 minutes / RTO ≤4 hours remain unverified. [Runbook and reproduction](../recovery.md), [redacted machine-readable local result](restore-local-2026-09-26.json).

Started from clean `main` at `2c641e7` (Phase 39). User explicitly requested implementation, commit and push; the phase document's default prohibition on unsolicited publication is not treated as cancelling that request. No subsequent numbered phase is executed. Runtime identifies Codex/GPT-6; the exact model suffix/picker reasoning setting is unavailable, so the recommended Astra/high is not asserted as observed.

## Inputs and prerequisite checks

Read Phase 40, master-plan section 17, current discovery decisions including D-86/D-109–D-112, phase README/requirement and decision maps, implementation ledger, actual P05 transaction/migration code, P07 issuer/session configuration, P25/P26 sender/receiver fixtures/processes, and P39 deployment/checks/recovery artifacts. No applicable AGENTS.md was found in the workspace or checked parent paths. Existing Engine datasets, root Compose/setup, original Stitch exports and existing local issuer/database were preserved.

Local Windows; supported Node 24.19.0 and npm 11.6.2 selected by PATH. Native PostgreSQL **18.3** at `C:/Program Files/PostgreSQL/18/bin` (observed binary/server version, not the different candidate container pin). Existing Keycloak **26.7.4**, JDK **25.0.4.1**, actual headless Chromium **153.0.8010.12** (same installed launcher version read immediately after the successful run). No package upgrades or migrations. Temporary rehearsal paths are under the current Windows account's LOCALAPPDATA with inherited ACL access removed. Vault, key and plaintext staging share this host; no primary-host-loss protection is claimed.

Prerequisites passed before editing recovery behavior:

- `T:/scripts/postgres-local.ps1 start`: existing marked test-control cluster available; no Engine database changes.
- `npm run test:deployment`: **4 files / 20 tests passed**, including real database lifecycle, failed release rollback/retry and offline recovery.
- `npm run test:integration -- apps/api/test/integration/session-auth.test.ts apps/api/test/integration/outbox-inbox-recovery.test.ts --maxWorkers=1 --testTimeout=90000`: **2 files / 24 tests passed**. This PowerShell/npm invocation emitted flag-forwarding warnings and did not forward the two flags; its actual suite passed with existing runner settings. Final selected regressions invoke Vitest directly to avoid that ambiguity.

## Checkpoint A — actual local backup configuration

Implemented `scripts/recovery-store.ts`, `scripts/recovery-rehearsal.ts`, encryption/failure tests, npm entry points and the protected inventory/runbook. The local adapter uses AES-256-GCM, fsync/no-overwrite publication and identical-byte retries. Fresh cluster enables replica WAL, archiving and 60-second archive timeout. It uses `pg_basebackup -Ft -X stream`; every base object and WAL object is encrypted. Identity provider/theme/config and app/issuer/integration secret inventory are protected separately.

Focused result: **2 storage tests passed**, exercising exact roundtrip, ciphertext concealment, retry, collision, existing-target refusal, absent/inaccessible destination, missing/wrong key and tamper rejection before plaintext publication. Real PostgreSQL archiver negative control observed `failed_count` increase on an absent destination, then repaired the command and obtained the base backup. `checkpoint-a.json` is written before proceeding to B.

Local storage retention is explicitly indefinite/manual inspection with no pruning or scheduler. Production daily-base/seven-day/WAL-chain policy is a proposal, not a configured claim. No destination/access, independent key escrow or external alert receipt has been supplied. Local structured stderr/nonzero exit and database counters are verified; external notification is not.

## Checkpoint B — timed isolated restore

The rehearsal creates the business databases/checkpoint after the base backup. It captures original command evidence, corrected outcome/return quantities and a received/applied external inbox event while sender acknowledgement is lost. It archives a named restore point, commits a later exclusion marker, stops the source, decrypts into an empty sibling path, verifies the base manifest, replays WAL to the target and promotes. New ports, fresh issuer home and restored configuration isolate recovery. The exclusion marker must be absent and recovered command/inbox bytes must match. Browser login uses actual restored Keycloak credentials/OIDC and real outcome/action APIs.

Final `npm run backup:rehearse` passed all three ordered checkpoints. Source/restore `pg_ctl status` both subsequently returned **no server running**. Exact observations (UTC, 26 September 2026):

| Observation | Recorded result |
| --- | --- |
| Run start / encrypted base completed | 04:26:49.453 / 04:28:01.144 |
| Named checkpoint / archived / simulated incident | 04:28:08.872 / 04:28:09.163 / 04:28:09.551 |
| Restored login and checkpoint verified | 04:29:14.540 |
| Replay/restart/conformance complete | 04:29:18.088 |
| Forced archive lag / checkpoint age at incident | **0.291 s / 0.679 s** |
| Restore plus exercised-service verification | **68.5367 s** |
| Known committed command identities | **22**, exact hashes/receipts/results preserved |
| Known lost actions / duplicate business effects | **0 / 0** |
| Durable consumer transitions | **19**, still 19 after replay and restart |

Known round `f5628591-ffbb-46fa-919c-371812247480`, original action `6f40c679-9fc8-472e-a614-82ef2dde598a`, initially received/applied event `e846e5cd-3bc6-40ee-9c78-09f5c284ca60`. Restore point `tawsel_recovery_checkpoint`, LSN `0/4DCB8D0`, archived WAL `000000010000000000000004`. The later exclusion marker's WAL `000000010000000000000005` was also archived and available, yet the marker is absent after targeted restore. `pg_verifybackup` passed before editing restored configuration. Promotion completed on a new timeline. Expected archive probes for absent timeline-history files produce nonzero restore-command logs; required WAL and target promotion still must succeed.

Fixture sizes: application database **14,628,543 bytes**, identity **14,620,351**, mock **8,804,031**, test control **8,206,015**. Encrypted base tar **48,250,412 bytes**, included WAL tar **16,778,796**, base manifest **297,289**, issuer config/providers/theme tar **38,956**, protected runtime/integration inventory **2,004**. Business DB creation is after the base, so its contents depend on actual archived WAL. Runtime binaries are retained local copies, not downloads timed during recovery.

These numbers describe one deliberately forced archive boundary on small fixture data. The recovery timer starts before source shutdown and includes decrypt/extract/base verification/WAL promotion, issuer binary/config restoration/startup, API login, original action replay, signed delivery, public conformance and sender/receiver restarts. It excludes provisioning a replacement host, off-host downloads, full web/Engine/map restoration and external mail. It is **not** a continuous-archive RPO or full pilot RTO guarantee. Earlier failed/partial runs are not passing restore evidence.

## Checkpoint C — replay and release gate

Existing sender/receiver process adapters exercise original signed event replay. The existing public-only `checkReceiver` conformance function compares recovered sender snapshots and independently applied state, repeats deliveries and rejects changed bytes/expired signatures. Sender and receiver restart again and must produce no extra transitions. Same-ID action replay must return the original result; expired application sessions must return 401. Source and receiver use separate databases/roles but a common physical cluster in this fixture.

Actual result: **19 unique events / 10 public negative checks**, delivered pieces **2**, reported minor units **25000**, received return pieces **1**. Fresh restored login, recovered outcome equality, original action-result lookup and exact-request retry passed. Forced expired-session access returned **401**. The initially applied event was delivered again after sender lease recovery and still had exactly one transition. Final sender/receiver restart returned no pending work, with all 22 original command identities unchanged. The lease clock is deliberately advanced for the local sender fault; elapsed production lease recovery is not measured separately.

Release preflight now refuses missing/nonfinite/negative/over-target RPO/RTO, unhealthy WAL or an unverified business checkpoint. Local tests also reject absent identity/secrets and same-host failure-domain attestations. The sample starts with null measurements and false flags. This validates operator evidence fields, not remote truth; the local rehearsal can never authorize a live release by itself.

## Failed attempts and repairs

- Java could not load `java.dll` from the Cyrillic workspace path. Rehearsal now copies the pinned JDK into its private ASCII directory, alongside isolated Keycloak binaries.
- Initial cleanup stopped the disposable cluster before all fixture pools closed, masking a setup error with an idle-pool error. Added a fixture `detach()` path and close-before-stop cleanup; no drop of recovered data.
- A fixture tried to update an immutable issuer/subject binding. The real database rejected it. Added optional issuer/subject parameters to existing fixture creation and create the correct identity from the outset; no production invariant was relaxed.
- The initial minimal realm omitted the API audience mapper; introspection returned 401. Matched the existing application client mapper configuration. A following assertion used `access.accountId` instead of the public `access.sourceId`; corrected the assertion, retaining exact account comparison.
- PostgreSQL `pg_ctl -w` returned while hot standby was readable, before target promotion. The rehearsal now waits for `pg_is_in_recovery()=false` before querying recovered business databases.
- Accepted commands live in `command_identities`; `command_evidence` contains rejected/review envelopes. An initial accepted-action lookup failed rather than accepting an empty comparison. The final harness requires more than ten actual identities, compares their hashes/receipts/results and replays the exact saved original request. It compares the duplicate response against the action-status wrapper's `result`. These are harness repairs, not public schema changes.
- Initial lint found an unused import; removed it. The first documentation helper had a shell-quoting error before any writes; subsequent edits use an exact saved script.

## Limits and handoff

Final verification:

- `npm run test:backup`: **2 files / 6 tests passed** (storage and release negative controls).
- `node node_modules/vitest/vitest.mjs run --project fast --maxWorkers=1`: **22 files / 604 tests passed**.
- `node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --project integration apps/api/test/integration/database-lifecycle.test.ts apps/api/test/integration/command-transaction.test.ts apps/api/test/integration/outcome-progress-outbox.test.ts apps/api/test/integration/outbox-inbox-recovery.test.ts apps/api/test/integration/deployment-recovery.test.ts --maxWorkers=1 --testTimeout=90000`: **5 files / 47 tests passed**.
- After the fixture began returning the exact original action, direct Vitest rerun of `outbox-inbox-recovery.test.ts`: **4/4 passed**. Script typecheck and focused ESLint also passed after the final executable changes.
- `npm run contracts:generate`, `contracts:lint`, `contracts:check`: passed; **31 schemas / 268 valid / 167 invalid examples / 187 operations** unchanged. Existing callback-only-302 lint warning remains.
- `npm run lint`, `npm run typecheck`, `npm run audit`, `npm run build`: passed. Build uses explicit fixture `VITE_TAWSEL_API_BASE_URL=http://localhost:5173`; it is not a deployment URL. Audit retains **two moderate transitive uuid/ExcelJS findings**, below the configured high-severity gate; large web chunks remain. No forced dependency downgrade.
- `npm run backup:rehearse`: **all A/B/C passed** with real PostgreSQL, Keycloak, Chromium, public HTTP and restart/conformance. This Windows/private-runtime rehearsal is not included in generic Linux CI and no remote CI pass is claimed. No full integration-suite run is claimed beyond the selected connected regressions.

Changed paths: new `scripts/recovery-store.ts`, `scripts/recovery-rehearsal.ts`, `apps/api/test/fast/recovery-store.test.ts`, this evidence/result and `docs/recovery.md`; extended deployment validator/example/tests and fixture helpers; npm commands; canonical operation-coverage generator/narrative; operations/deployment/ERP references and phase/status ledgers. No application schema, migration, public request/response, generated client or Engine artifact changed. No independent review feedback was received; local review repairs and failures are listed above.

No production topology, off-host restore, realistic write load/data volume, sustained archive cadence/retention, independent key escrow, external alert delivery, real SMTP recovery, Engine/map inventory/source/timing, separate-host distributed recovery, physical device or owner pilot acceptance is established. Realm/user/business inputs are labelled fixtures; Keycloak/PostgreSQL/Chromium/HTTP paths are real. Unsent phone actions are outside server backup coverage. The local adapter buffers full objects and is not a production backup service.

Changed public interface: none. No schema/example/client regeneration is needed beyond the operation coverage narrative. ERP planning/mapping/quickstart references explain recovery semantics without granting cross-database access. Phase 41 may rely only on the final recorded local artifacts and explicit runbook; remaining target dependencies must stay visible.
