# Two-mode routing verification — 3 October 2026

[D-113](../phases/decision-map.md) permanently removes bicycle, retaining car/motorcycle. This is the current change record; dated Phase 12–42 records and the September consumer proof retain their original results. [Experiment procedure](../dokploy-pilot.md), [routing boundary](../engine-boundary.md).

## Read-only observations before the change

The prior workstation inventory verified **351 assets / 8,349,932,967 bytes** against the existing manifest, which still included three OSRM profiles. It is not a current two-mode transfer manifest. `nominatim-egypt` was running with volume `nominatim-data` at `/var/lib/postgresql/16/main`; read-only checks observed `PG_VERSION=16` and the `import-finished` marker. No cold export, transfer or container stop was performed by those checks.

Prior target inventory identified the external internal/attachable Swarm overlay `tawsel-engine-swarm` and API/planning attachments. Recheck the actual attachments after redeployment. Dataset filenames selected for the new target are `egypt-261002.osm.pbf`, `egypt-261002.osrm*` and `egypt-motorcycle.osrm*`; current hash/build-provenance verification remains a separate task.

## Results required for this change

| Check | Current recorded result |
| --- | --- |
| Canonical modes/metadata/provisioning/planning and public client | Generated/check passed: 31 schemas, 268 valid/171 invalid examples, 187 operations. ERP routing conformance passed. |
| Bicycle and bike rejected without provider calls or conversion | Ten retirement integration cases passed: invalid writes, saved-state preview/replan/manual, optimized/manual readiness/start, explicit replacement and terminal worker failure. |
| Controlled car/motorcycle route/table/optimization | Six fixture results passed. Six actual local results also passed against retained September datasets and the rebuilt VROOM candidate; see [compact evidence](engine-two-mode-2026-10-03.json). These are not October VPS results. |
| Fresh local PostgreSQL integration and preparation/pilot browser flows | Full suite: 62 files/1083 tests passed. Preparation and pilot browser flows: 1/1 each; UI/port helper: 32 fast tests passed. Task-only PostgreSQL 18.6 (56433) and Keycloak 26.7.4 (8085), browser origin 5189. Original 5173 listener retained. |
| Root/target Compose, VROOM mapping and environment checks | Rendered with only car/motorcycle and correct September default/October target names, external tawsel-engine-swarm. setup.ps1 parsed; prevents cross-checkout operations and unsafe/mixed-source assets. New VROOM image passed read_only/tmpfs live probes. |
| Fresh selected asset manifest and target hashes/build provenance | 27 manifest/verifier tests passed: exact pin and modes, path/duplicate/PBF-hash checks, nonempty 20-part MLD completeness per profile, explicit pending state, secret metadata removal and legacy verification. Target output hashes remain pending; old 351-file manifest includes bicycle. |
| Target car/motorcycle route/table/optimization | Pending six live results and actual dataset/service identity. |
| Private Nominatim, PMTiles, actual API/planning network access | Pending checks after deployment. |
| New clean public ERP consumer proof | Pending the final source SHA; generate in a separate checkout: `integration-local-2026-10-03.json`, stage this proof alone and rebuild/verify, leaving generated artifacts uncommitted. Preserve the September proof. |
| Final same-commit handoff/images/native deployment | Pending; no deploy or go-live result is implied by documentation changes. |

Record actual commands, conditions and failures when each check runs. The nine original Stitch references and historical nine failed Engine probes remain unchanged. Production backup/restore/device/owner requirements remain outstanding where recorded; the owner-authorized disposable experiment does not establish production readiness.

Dependency high/critical audit, ESLint, OpenAPI lint, generated-contract checks, all typechecks and application builds passed. Build used `VITE_TAWSEL_API_BASE_URL=https://app.switch2tech.cloud`. The existing OpenAPI callback warning remains. `erp:audit` passed with 65 requirements, 113 decisions and 42 phase owners. Browser artifacts were retained under ignored `.local/two-mode-browser-evidence`; tracked historical screenshots were restored.

Eight `node --test scripts/pilot-handoff.test.mjs` checks passed for explicit inputs, safe inventory/provenance, pending/complete readiness limits, role-matched image digests, clean/pushed source gates and actual output hashes. The fresh Cairo map manifest verified 271 files/51792614 bytes. The current bootstrap list adds the verified target PBF, with no processed target outputs and both profiles pending. The published unchanged motorcycle Lua blob has SHA-256 `557239b72bed78fc5f92461d590f9254058c86cc42d31ae4aca6bbbca8277d20`; record/compare the actual server bytes, as a Windows CRLF checkout has a different byte hash.

The initial live VROOM attempt exposed its upstream entrypoint trying to copy configuration on a read-only filesystem and inherited `/conf` logging. The corrected image embeds config in both `/conf/config.yml` and the actual `/vroom-express/config.yml`, starts Node directly and uses `VROOM_LOG=/tmp`. Subsequent six probes passed using OSRM v26.9.0 and VROOM 1.15.0. Local sampled memory was 1.852 GiB/car, 1.877 GiB/motorcycle and 16.6 MiB/VROOM; these samples do not establish VPS limits or nationwide performance. Retained local Nominatim returned OK, one Cairo search result and a reverse place.

The verified target PBF is `/opt/tawsel/bootstrap/egypt-261002.osm.pbf`, 178641115 bytes, SHA-256 `b1a14a998c3e2b8c90f4891f4eba53fb68d6f3d7e1da2a5cf22f272ad21aaede`. Both target profile builds start pending; source download does not establish preprocessing. Fresh application/identity/mock stores remain required: historical bicycle reads are deliberately not migrated, and discovery of old target business data stops deployment without deletion. Target commands stay one step per user reply: sequential pinned OSRM processing with `-t 2`, initial 4 GiB/1.5 CPU caps and log/exit/OOM evidence; independent Nominatim import while routing is stopped; manifest/runtime checks; then application and deployed Mock ERP integration.

## Document checks completed in the isolated checkout

`python -X utf8 scripts/check-ui-spec.py check` passed after the current prose/action-map updates: nine original metadata/source/image sets, 18 original hashes, 105 control dispositions, 64 action/effect rows covering all 187 operations, 33 designed Arabic state cases and 95 local links. Contrast and six in-memory rejection checks passed. This verifies document structure/original-reference preservation; it is not browser or live routing proof.
