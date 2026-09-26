# Phase 42 — final contract, readiness and ERP handoff

26 September 2026. Starting clean HEAD `0be3520` (Phase 41). No applicable AGENTS.md in the checkout or ancestors. Runtime identifies Codex/GPT-6; the exact picker variant and effort are unavailable. Requested Astra/xhigh is not asserted as observed; the repository model-selection guide was consulted. No dependency upgrades, publication, commit or push are authorized by this phase.

## Prerequisites

Inspected the canonical plan, amendments through D-112, requirement/decision maps, execution ledger and the real P02/P27/P37–41 contracts, implementation, tests and evidence. Phase 41 deliberately leaves physical platforms, elapsed offline observation and owner review open. These block pilot approval but do not prevent an accurate local handoff. Engine/dataset/target recovery evidence remains unavailable; nothing here substitutes for it.

Selected supported Node 24.19.0 and npm 11.1.0. Started only the existing managed PostgreSQL cluster on loopback 55432; no Engine setup/import ran.

```powershell
$env:PATH='C:\Users\jo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/postgres-local.ps1 start
node --env-file=.env.database.local node_modules/vitest/vitest.mjs run packages/shared/test/fast/contract-foundation.test.ts apps/mock-erp/test/integration/mock-source-outbox.test.ts apps/api/test/integration/report-export.test.ts apps/api/test/integration/diagnostics.test.ts apps/api/test/integration/deployment-recovery.test.ts apps/api/test/fast/recovery-store.test.ts apps/web/test/fast/preparation-flow.test.tsx --maxWorkers=1 --testTimeout=30000
```

**PASS: 7 files / 474 tests, 75.55 seconds**, `.local/phase-42-prerequisites.log`. Actual database checks and labelled UI/provider fixtures retain their separate meanings. No prerequisite feature repair was necessary before the audit.

## Checkpoint A — coverage and drift audit

Recorded before B. Added the complete [requirement ledger](verification/requirement-ledger.md), concrete phase/module/test owners and [per-operation audit](verification/contract-audit.json). Reconciled 65 requirements, 112 decisions, 187 catalog operations and 133 public HTTP method/path pairs. The new actual Fastify registration test checks both owning servers and rejects an unowned application API; it uses no database connection and claims surface registration only. Existing PostgreSQL checks supply behavioral proof. Frontend direct calls use the canonical session/intake/location boundary; typed consumers use the same published paths. `/health`, map assets, operator diagnostics and native mock administration retain their distinct scope; no private native endpoint is represented as a Tawsel ERP API.

Removed stale current summaries in the master plan/OpenAPI/generator. Promoted only the two existing local UI actions backed by P28/P32/P36/P41 evidence. The two reserved webhook names remain designed/unavailable: `progress.snapshot` and `integration.applicationReported`; HTTP snapshots/checkpoint reporting implement current requirements. No payload version or business behavior changed.

The audit initially **failed** because `diagnostics.getActionTrace` was absent from the UI/action table. Added it to the existing operator terminal row and corrected that row's obsolete proposed browser route/capability. The P03 checker also needed its allowlist updated for already implemented P37/P38 and the two audited local actions. These are bounded traceability/tooling repairs, not new features.

- `node scripts/contracts.mjs generate`: passed, 31 schemas / 268 valid / 167 invalid examples / 187 entries.
- `node node_modules/vitest/vitest.mjs run --project fast apps/api/test/fast/release-contract.test.ts packages/shared/test/fast/contract-foundation.test.ts apps/web/test/fast/preparation-flow.test.tsx apps/web/test/fast/monitoring-client.test.tsx`: **4 files / 464 passed**, 9.11s, supported Node 24.19.0.
- `node scripts/handoff-audit.mjs`: passed after the missing trace mapping repair; all owner/test/evidence paths resolve.
- `python -X utf8 scripts/check-ui-spec.py check`: passed, 18 unchanged original hashes, 64 rows/187 operations, 33 designed state cases, links/contrast and six negative mutation controls. Document checks do not prove owner usability.

Unresolved dependency: no local feature defect identified in A; target/device/owner conditions remain open. B must still prove the independently installed final artifacts and digest validation.

## Checkpoint B — ERP and operations handoff

Recorded after A and before C. Rewrote the as-built handoff, ERP index/planning/mapping/quickstart, integration/consistency guide and current README/operations/environment. The archived planning pack is explicitly superseded. Added reproducible package builder, standalone manifest verifier, source content identity, canonical-copy checks and pinned standalone consumer lockfile. API/client/reference remain 0.1.0; no runtime business payload or migration changed.

Added public report/XLSX assertions to the existing portable source checker. The operator now copies only verified release artifacts into a clean temporary directory, installs with its own lockfile and writes a redacted proof tied to candidate source/runtime hashes. The consumer has its own restricted PostgreSQL role and allowlisted OS environment; Tawsel database/operator/worker configuration remains in separate operator processes. Internal `@tawsel/api` and `@tawsel/shared` imports are unavailable in the installed consumer.

Commands (Node 24.19.0 / npm 11.1.0):

```powershell
node .local/runtime/node_modules/npm/bin/npm-cli.js run erp:package
node node_modules/vitest/vitest.mjs run --project fast apps/api/test/fast/release-artifacts.test.ts apps/api/test/fast/release-contract.test.ts
node scripts/erp-release.mjs build
node --env-file=.env.database.local --import tsx scripts/source-demo.ts
```

- Initial package verification passed **717 artifacts**; final documentation/evidence is repackaged in C. Manifest self-digest/secrets are excluded. Actual canonical versions and both generated schema copies agree.
- Focused verifier/actual route tests: **2 files / 13 passed**, 6.36s. Negative tests reject equal-length altered bytes, missing files, bad digest/size, duplicate/self paths and traversal/absolute paths.
- Clean install and two-way proof: **passed**, `2026-09-26T06:48:33.352Z`–`06:49:44.266Z`, actual PostgreSQL 18.4 and Keycloak 26.7.4 (startup log confirms runtime), genuine OIDC browser login, real HTTP and separate processes. [Initial B proof](verification/integration-local-2026-09-26-initial.json), private log `.local/phase-42-source-demo.log`.
- **24 unique signed events / 10 receiver negative checks**, one delivered piece, exact 15000-minor EGP collection, one actual returned piece; separate loss and new one-piece dispatch. Two API/two receiver restarts preserved original action `cc984e3d-17b0-4fb3-b7b0-e2027fbbdb3a`.
- Public report before return/redispatch: two distinct same-address tasks/two processed attempts, one partial/one no-answer/zero full, delivered 1 and held 5. Actual downloaded workbook: **14333 bytes**, matching report snapshot and both task IDs, exact amount/currency/exponent, zero formula cells. Its digest and parsed rows are retained in the proof.
- Build exposed lint issues (unused import/regex spacing) and strict TypeScript initially rejected the new untyped verifier import. Fixed those locally with a declaration file before the successful clean-consumer run; final lint/typecheck is recorded in C.
- Standalone lock/clean install report **2 moderate advisories** in retained dependencies. No automatic dependency upgrade was attempted; the final audit records their scope.

No hidden Tawsel-internal dependency was found in the consumer. Explicit manual planning was used; no live Engine, target host, physical phone or real ERP claim. These are readiness dependencies, not missing consumer setup inputs.

## Checkpoint C — readiness

Recorded after B. Completed the [A–P evidence/readiness map](verification/pilot-readiness.md), with responsible roles, observed failures/unrun conditions and their practical effect. Reconciled all 42 phase rows against actual evidence; older dated entries retain historical scope. No physical or owner acceptance was invented.

Final integrated command:

```powershell
node --env-file=.env.database.local node_modules/vitest/vitest.mjs run --maxWorkers=1 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=.local/phase-42-acceptance.json
```

**PASS: 61 files / 1055 tests; 0 pending, 0 failed**, 1370.43s (tests 93%, import 6%, environment 1%). [Every test name/status and exact timestamps](verification/acceptance-local-2026-09-26.json), private raw report/log `.local/phase-42-acceptance.{json,log}`. This includes real transaction/locking/crash/replay/permission tests across execution, source/inbox/sender, reports, export and deployment recovery, plus labelled fast/component/provider tests. No unrelated browser suite was repeated because application UI/runtime code did not change. P41 browser/device distinctions remain explicit.

Final gates and focused proof:

- `node .local/runtime/node_modules/npm/bin/npm-cli.js audit --audit-level=high --json`: passed threshold, **0 high/critical, 2 moderate** (ExcelJS via uuid; GHSA-w5hq-g745-h8pq missing buffer bounds check in v3/v5/v6 when a buffer is provided). The suggested major ExcelJS downgrade was not applied. Dependency remediation needs a separately tested choice.
- `node node_modules/eslint/bin/eslint.js .`: passed. `npm run typecheck` via the pinned CLI: passed all workspaces/operator scripts after the verifier declaration repair.
- `node node_modules/@redocly/cli/bin/cli.js lint contracts/openapi.yaml`: valid, one retained warning for the intentional 302 OIDC callback without a 2xx response.
- `node scripts/contracts.mjs check` and `node scripts/handoff-audit.mjs --check`: passed, **31 schemas, 268 valid/167 invalid examples, 65 requirements, 112 mapped decisions, 187 entries/133 HTTP pairs**. 185 catalog entries verified locally; 2 reserved webhook names designed/unavailable.
- `python -X utf8 scripts/check-ui-spec.py check`: passed original hashes, all action mappings, state/contrast/link checks and six deliberate mutation controls. Final review corrected its historical success-line phase-range wording; the actual allowlist was already fixed in A.
- Final clean consumer rerun after that audit-tool identity change: **passed 2026-09-26T07:07:14.079Z–2026-09-26T07:09:04.971Z**, same compiled consumer hash, **24 events / 10 negatives**, two restarts per side, original action preserved. [Final proof](verification/integration-local-2026-09-26.json). Workbook **14338 bytes**, same-snapshot/task/amount checks and no formulas passed. Initial B proof is retained separately.
- Copied-package corruption checks reject false versions/publication/source/runtime/migration metadata and a changed generated schema even when its new digest is valid: [six actual rejections](verification/package-local-2026-09-26.json). The restored copy reverified successfully.

### Final package and readiness decision

Use `npm run erp:package`, then `npm run erp:verify`; [the index](erp/README.md) includes the optional Windows ZIP command. The final build, manifest/ZIP verification, core links and preservation checks are recorded below after packaging.

**Local handoff complete; live pilot readiness incomplete.** Required physical Android/Chrome and iPhone/Safari, actual elapsed offline day, owner review, live Engine, target release/private network/email, chosen-load capacity and independent recovery conditions remain open. P38's higher-load 6309ms ERP result missed 5000ms; P40's 68.5367s restore was small and same-host. No requirement was waived. Real ERP implementation stays a separate project. No commit, push or publication.

### Final build and package checks

Production build command: `$env:VITE_TAWSEL_API_BASE_URL='http://127.0.0.1:3001'; node .local/runtime/node_modules/npm/bin/npm-cli.js run build` (fixture loopback build URL). **Passed** shared/client/API/web/reference compilation; production fixture isolation passed. PWA shell/static precache contains **17 assets / 2435092 bytes**, without API/map runtime caching. The existing >500 kB chunk warning remains; this is not a physical-phone startup measurement. Chromium queried from the installed Playwright binary is **153.0.8010.12**.

Final packaging uses `node .local/runtime/node_modules/npm/bin/npm-cli.js run erp:package`, then `node .local/runtime/node_modules/npm/bin/npm-cli.js run erp:verify`. This verifies canonical generation, all manifest paths/sizes/SHA-256 values, package/protocol/migration declarations, both generated schema copies and final clean-consumer source/runtime identity. The final index gives standalone extraction/verification and Windows ZIP commands. No release tag, deployed image or publication is asserted.

Preservation checks: the retained Engine README section matches HEAD after normalizing checkout line endings; no Engine Compose/setup/data/mount, SQL migration, root lockfile or original Stitch export changed. Original 18 visual hashes and `git diff --check` pass. Public files are allowlisted, and configured local identity/database/operator secrets were checked for accidental inclusion without logging their values. Only task-started local test services are stopped after verification; the consumer's disposable databases/users/configs were already cleaned up.

Final directory verification **passed for 721 artifacts**, plus the manifest itself (excluded from its own digest). Candidate source SHA-256: `27f8f3d523296485d54a88c51c5544024aabf2202fbafd0703175d61276df60a`; compiled consumer SHA-256: `947e939c5573f8e99fabe75393f65ea2fb62a40bb2837fdd4c62c048789f6f5b`. The clean consumer and complete acceptance records identify this candidate. All **79 local links across the seven core index/handoff guides** resolve inside the package; configured-secret matches: **zero**. Final directory/package logs remain `.local/phase-42-package-final.log` and `.local/phase-42-verify-final.log`. The optional ZIP contains the same manifested files and is checked after extraction with the standalone verifier; archive output is `dist/tawsel-phase42-erp-handoff.zip`.
