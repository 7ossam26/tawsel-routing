# Tawsel two-mode experiment on Dokploy

The owner authorized a fresh experimental deployment on `switch2tech.cloud`. [D-113](phases/decision-map.md) removes bicycle permanently; Tawsel and its Engine support only car/motorcycle. Local application databases contain old experiments and are not transferred. Use native Dokploy Applications and a native Dokploy Database for Tawsel/identity/mock, with `deploy/engine.compose.yaml` for the Engine alone. Root `docker-compose.yml` is local preprocessing and must not be selected on the VPS.

This experiment does not certify production readiness. It can proceed without the full off-host backup/isolated-restore gate used by [production deployment](deployment.md) and [recovery](recovery.md). Those requirements remain applicable before a production release; do not report them as passed. The current [verification record](verification/two-mode-routing-2026-10-03.md) separates checks from pending work.

## Public entry points and deployment control

| DNS name | Application entry point | Internal port |
| --- | --- | ---: |
| `app.switch2tech.cloud` | web | 8080 |
| `auth.switch2tech.cloud` | issuer gateway | 8080 |
| `mock.switch2tech.cloud` | authenticated public-test mock | 3010 |

Keep `admin.switch2tech.cloud` for Dokploy. Set **autoDeploy=false** for the native Applications and Engine Compose during this controlled update. Inspect each application's effective image, environment, mounts, networks and Domains before deploying it explicitly. No public domain or host port belongs on OSRM, VROOM, Nominatim, database, API, workers or raw Keycloak. The issuer gateway permits the reviewed realm/resource/discovery routes and blocks `/admin` and `/realms/master`; verify the actual HTTP responses.

## Inventory, images and private network

Record the current VPS architecture, available RAM/disk, Docker/Dokploy versions, running services and volume/network state before preparing data. The reported VPS inventory has 2 CPUs, 7.8 GiB RAM, about 5.8 GiB available, no swap and about 86 GB free disk; recheck available memory/disk and co-located workloads before each heavy stage. The older three-profile 6.25 GiB Engine sample is historical, not a budget for this two-mode stack. Use current observations and measured headroom. The image workflow targets `linux/amd64`. Keep protected configuration and keys outside a refreshed Git checkout; do not paste populated secret files, tokens or database dumps into chat.

Use immutable image digests built for the final reviewed source commit and the exact pilot origins. Preserve the inspected compatible **OSRM digest** for server preprocessing and runtime; removing bicycle does not require an OSRM upgrade. This target prepares new October datasets while the existing local September files remain unchanged. Rebuild the **configured VROOM image** because its embedded mapping changes to car/motorcycle. `deploy/Vroom.Dockerfile` copies the same configuration to both `/conf/config.yml` and the runtime `/vroom-express/config.yml`, bypasses the upstream startup copy under `read_only`, and sends logs to writable `/tmp`; inspect the built runtime configuration, not only the source file. Verify the target can pull every required image. Use the configured pinned Nominatim image for its independent fresh PG16 import and later runtime.

Engine Compose uses external **`tawsel-engine-swarm`**, a Swarm overlay network with **Internal=true** and **Attachable=true**. Prior read-only inventory verified API and planning attachments; check both again after deployment. Verify `osrm-car`, `osrm-motorcycle`, `vroom` and `nominatim` resolve and respond from the actual API/planning services. Engine HTTP origins are private operator settings; use the existing service aliases and internal ports. Preserve separate data/identity/application/ingress isolation and inspect native Dokploy network attachments rather than assuming a Compose network name applies to a native Application.

## Fresh target assets and provenance

The selected flow downloads and prepares Egypt on the VPS. The raw download is already verified at **`/opt/tawsel/bootstrap/egypt-261002.osm.pbf`**, 178,641,115 bytes, SHA-256 **`b1a14a998c3e2b8c90f4891f4eba53fb68d6f3d7e1da2a5cf22f272ad21aaede`**; its Geofabrik MD5 check also passed. Preserve the dated filename and verified hash, rather than replacing it with a moving `latest` download.

The handoff must use a fresh inventory and explicit source/preprocessing provenance. Its current status is **bootstrap pending**: a verified PBF and map assets do not mean car/motorcycle preprocessing or Nominatim import has completed. Record pending profile groups and import state without fabricated output hashes or a ready claim. Do not reuse or alter `.local/snapshots/20260930T145930Z` as the current manifest. Preserve that dated inventory and the old local assets as history. Record actual source paths, named volumes/mount paths, image digests, profile hashes, stage logs and results for this run.

Set the paired dataset keys explicitly:

| Setting | Retained local default | Fresh target |
| --- | --- | --- |
| `EGYPT_PBF_FILE` | `egypt-260913.osm.pbf` | `egypt-261002.osm.pbf` |
| `OSRM_CAR_DATASET` | `egypt-260913.osrm` | `egypt-261002.osrm` |
| Motorcycle dataset prefix | `egypt-motorcycle.osrm` | `egypt-motorcycle.osrm` |

Prepare car and motorcycle **sequentially**, using `ghcr.io/project-osrm/osrm-backend@sha256:8a1b1bc938412f15f9b5b32d794c4ec6bf4a85dfbbabfa0a014b70b187edb53b`. Each profile runs `osrm-extract`, then `osrm-partition`, then `osrm-customize`, with **`-t 2` at every stage**, **`--memory=4g --memory-swap=4g --cpus=1.5`**. Car uses that image's `/opt/car.lua`; motorcycle uses the reviewed `profiles/motorcycle.lua`. Record the actual Lua hash and any required profile dependencies. Write complete outputs into fresh persistent `engine-data` storage with the prefixes above. Keep routing runtime stopped during preparation; do not overwrite data mounted by another service.

Run one stage at a time and inspect its logs, exit code and `OOMKilled` state before the next. Retain the container/result evidence until inspection; a container disappearing or a partial output group is not a pass. Stop on any nonzero exit, OOM or incomplete result, record the failure and diagnose it before continuing. The limits bound each job; they do not establish that a dataset will fit. Verify both finished groups against their source PBF, profile and image/build identity, then generate their real sizes/hashes.

The map transfer is separate: copy only the reviewed Cairo PMTiles, fonts and sprites, approximately **49 MB**, and verify their own manifest. The visible map covers Cairo; the Egypt PBF does not expand that visual map. Local processed OSRM groups and the local Nominatim database are not transferred in this selected flow. Exclude all `egypt-bicycle.osrm*` files. Populate a fresh `nominatim-pbf` volume with the same verified raw PBF, available inside the import container at `/nominatim/data/egypt-261002.osm.pbf`.

Use the split PBF location and provenance explicitly when verifying the map-only bootstrap manifest:

```sh
node scripts/pilot-asset-verify.mjs /private/bootstrap-pbf-and-maps-assets.json /actual/engine-data /actual/maps --pbf-directory /opt/tawsel/bootstrap --provenance /private/dataset-provenance.json --allow-incomplete
```

After both profiles complete, generate a complete selected asset manifest and verify the real mounted storage:

```sh
node scripts/pilot-asset-verify.mjs /private/complete-assets.json /actual/engine-data /actual/maps --pbf-directory /actual/nominatim-pbf --provenance /private/dataset-provenance.json
```

Use actual mounted target paths. A successful transfer is insufficient: sizes and SHA-256 must match. Map-only verification establishes only the listed map assets and recorded bootstrap input; it cannot mark pending OSRM groups or Nominatim ready. Verify PMTiles range responses separately.

Run an **independent fresh Nominatim import** into an empty target `nominatim-db` PG16 volume, using the same verified PBF and the configured pinned Nominatim image with its protected password file. Keep both OSRM services and VROOM stopped throughout import, recheck available memory/disk, and choose import tuning from the current inventory. Record its image, PBF hash, mount paths, tuning, logs and completion result; verify `PG_VERSION=16`, `import-finished` and private `/status` afterward. Only then start the runtime Engine Compose, whose `nominatim-import-check` deliberately requires the finished import marker. There is no local cold export/restore requirement in this server-import flow. Keep secrets out of logs and chat.

## Native database and Applications

Create empty native Dokploy application/identity/mock stores; do not restore old workstation app/identity/mock databases or migrate bicycle records from experiments. Nominatim PG16 is a separate Engine database imported freshly on the server. Configure native database networking and scoped roles, then verify connectivity from the intended services. Use protected file-backed configuration where supported and check the effective mounts and environment of each native Application. The production PostgreSQL/pgBackRest Compose remains a separate documented option; it is not the mandatory database topology for this experiment.

Use the current image/environment templates and identity provisioning inputs as configuration references, applying them to the native Applications. Keep public web, issuer gateway and authenticated mock routes separate from private API and workers. Verify the application's actual migration/schema readiness before starting its workers. Keep exact app/mock redirect origins and separate human/service secrets; generating an issuer import does not verify login or SMTP.

## Controlled update and observable checks

Advance **one manual stage at a time**, returning its sanitized evidence and diagnosing a failure before the next step:

1. Confirm current inventory, verified October PBF, bootstrap-pending provenance, fresh storage/native database emptiness and effective `autoDeploy=false`. Verify image pull access and private network/storage settings without starting the heavy services.
2. Prepare car: extract, inspect, partition, inspect, customize, inspect. Then perform the same stages for motorcycle. Apply the per-job limits above; record logs/exit/OOM results and hashes of each complete group. Transfer and verify the separate Cairo maps; retain bootstrap-pending status for any unfinished stage.
3. With OSRM/VROOM still stopped, import Nominatim independently into its empty server volume. Verify source identity, PG16/import marker and private status. Complete asset/provenance verification before reporting the bootstrap ready.
4. Deploy the two-mode Engine Compose using the retained OSRM digest and rebuilt configured VROOM digest; confirm runtime datasets/configuration, private service access and absence of a bicycle service/profile dependency.
5. Deploy the native database/identity/application services in dependency order; run application migrations/assets, then API and planning/outbox/provisioning workers. Confirm actual API/planning access to `tawsel-engine-swarm`.
6. Record **six** independent target live results: route, table and optimization for **car** and **motorcycle**. Check latitude/longitude conversion and profile/dataset identity. Reject `bicycle`, `bike` and unknown modes through public metadata/provisioning/planning validation without provider calls or conversion. Verify private Nominatim and PMTiles range/map access separately; local passes do not satisfy these target checks.
7. Complete the authenticated mock-to-driver order journey, outcome/signed callback/applied projection, profile UI choices and blocked issuer-admin paths. Record test conditions, digests and failures; container health alone does not prove success.

For later production go-live, complete the independent recovery, SMTP, device/owner, capacity and release evidence in the production guides. Keep the experimental result explicitly classified.

## Handoff artifacts for the final commit

After the source commit is clean and pushed, generate a new handoff with the current inventory, selected assets, provenance and same-commit image report. Before server preparation completes, use the actual map/bootstrap inputs and explicitly pending profile/import results; regenerate with verified complete assets/provenance after preparation. Neither the handoff's existence nor a verified raw PBF is a ready claim:

```sh
node scripts/pilot-handoff.mjs --inventory /private/current-inventory.json --assets /private/two-mode-assets.json --provenance /private/dataset-provenance.json --images /private/release-images.json
```

The handoff's source URL and image report must identify the same final commit. Its inventories describe observed state, not a backup. For the ERP candidate package, use a separate checkout at that SHA: package, fresh public-consumer proof, stage only the new proof, package again and verify; leave its generated manifest/proof uncommitted. Keep the source checkout clean for the Dokploy handoff.
