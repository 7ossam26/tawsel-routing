# Tawsel routing and delivery

Phase 42 · 26 September 2026 · **local handoff candidate; live pilot not approved**.

Tawsel is an Arabic RTL delivery PWA around the retained Nominatim/OSRM/VROOM Engine. It supports independent-driver work and company work supplied through public ERP contracts. Execution, offline capture/replay, branch returns, monitoring and reports/XLSX have local implementation evidence. The reference ERP has separate storage, native source forms, durable source/outgoing/incoming flows and scoped public integration. A commercial ERP connector remains a separate project.

## Read and reproduce the handoff

1. [As-built handoff](docs/ERP-INTEGRATION-HANDOFF.md), [ERP reading order](docs/erp/README.md) and [external quickstart](docs/erp/consumer-quickstart.md).
2. [Exact Phase 42 results](docs/phase-42-evidence.md), [65-requirement ledger](docs/verification/requirement-ledger.md), [A–P readiness and outstanding conditions](docs/verification/pilot-readiness.md).
3. [Operations](docs/operations.md), [identity](docs/identity.md), [deployment](docs/deployment.md), [diagnostics](docs/diagnostics.md) and [recovery](docs/recovery.md).

Use Node `>=24.11.0 <25` and npm `>=11.1.0 <12` (verified 24.19.0 / 11.1.0). From the checkout:

```powershell
npm ci
npm run erp:package
# Existing local PostgreSQL and Keycloak must be configured/running for the demo:
npm run source:demo
npm run erp:package
npm run erp:verify
```

The second package build includes the newly recorded proof. Output is `dist/erp-handoff/`, with canonical contracts/examples, generated public client, reference source/runtime/migrations, pinned consumer lockfile, guides and evidence. The manifest records actual candidate source identity and SHA-256 digests. `source:demo` installs the consumer outside this checkout and gives it only its own database plus scoped public inputs. No publication runs.

## Application development

Follow [operations setup](docs/operations.md) and [identity setup](docs/identity.md), then:

```powershell
.\scripts\setup-app.ps1 -Check
npm run dev
```

Use the registered origin `http://localhost:5173` for login. API liveness is `http://127.0.0.1:3001/health`; it does not establish Engine/database/worker readiness. The development-only `/__fixtures/driver-review` is excluded from production. Stop owned foreground processes with Ctrl+C. Application setup does not import maps or start the Engine.

`npm run contracts:generate` updates public types/reference/coverage after canonical changes; `npm run contracts:check` rejects drift. `npm run erp:audit` checks the complete requirement/operation ledger. `npm run check` runs audit, lint, contracts, types, Vitest and builds; connected tests require the dedicated PostgreSQL cluster. Browser and target tests have separately recorded conditions. Original Stitch hashes and UI/action coverage can be checked with `python -X utf8 scripts/check-ui-spec.py check`.

Required pilot gaps include live Engine/dataset checks, physical Android and iPhone, an actual approximately 24-hour offline interval, owner review, target deployment/capacity and independent recovery. P38's higher-load ERP freshness target was missed. See the readiness report for owners and practical effects.

The retained Engine tutorial below describes provider setup independently. Its VROOM examples are not Tawsel's application contract; Tawsel uses a 600-second default customer service duration and complete route validation.

## Retained Engine

The Engine remains available independently:

- **OSRM** — road routing for **car**, **bicycle**, and **motorcycle** profiles
- **VROOM** — vehicle routing optimization (multi-stop, capacity, time windows) on top of OSRM
- **Nominatim** — geocoding: address ⇄ coordinates, Egypt only

Runs entirely on your machine via Docker. No external APIs, no internet at runtime, no per-request billing.

## How it fits together

```
                    ┌──────────────────────────────┐
             ┌────► │  VROOM      localhost:3000   │  "visit these 40 stops
             │      │  (optimizer)                 │   with 3 vehicles"
             │      └──────────────┬───────────────┘
  your app ──┤                     │ asks for travel times
             │                     │ (internal docker network)
             │      ┌──────────────┼─────────────────────┐
             │      ▼              ▼                     ▼
             │ ┌─────────────┐ ┌─────────────┐    ┌─────────────┐
             │ │  osrm-car   │ │osrm-bicycle │    │osrm-motorcy.│
             │ │   :5000     │ │   :5000     │    │   :5000     │
             │ └─────────────┘ └─────────────┘    └─────────────┘
             │  host :5001      host :5002         host :5003
             │
             │      ┌──────────────────────────────┐
             └────► │  Nominatim  localhost:8080   │  "where is
                    │  (geocoder)                  │   12 Tahrir St?"
                    └──────────────────────────────┘
```

Use **OSRM directly** for a single A→B route. Use **VROOM** when you need to decide the order of many stops or split work across vehicles. Use **Nominatim** to turn an address into coordinates before handing them to either.

Nominatim is a **sibling, not a dependency** — VROOM and OSRM never call it. It's your app's job to geocode first, then route. And when you do, remember Nominatim hands back `lat`/`lon` while OSRM and VROOM want `[lon, lat]`. See [Gotchas](#gotchas).

## Engine prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- ~10 GB free disk space for OSRM, plus **~13 GB** for the Nominatim database
- Use **PowerShell**, not Git Bash — see [Gotchas](#gotchas)

## Engine quick start

### 1. Download the Egypt OSM data

Download from Geofabrik and place it in `data/`:

```
https://download.geofabrik.de/africa/egypt-latest.osm.pbf
```

Rename it to the expected filename:

```
data/egypt-260913.osm.pbf
```

> ~180 MB download, expands to ~6 GB after processing. Not stored in this repo.

### 2. Start OSRM

```powershell
.\setup.ps1
```

**First run** (~20–30 min): pulls the OSRM image, pre-processes all 3 profiles, starts the servers.
**Later runs**: detects existing data, skips straight to starting the servers.

### 3. Start VROOM

```powershell
docker run -d --name vroom -p 3000:3000 `
  --network tawsel-routing_default `
  -v "${PWD}/vroom-conf:/conf" `
  -e VROOM_ROUTER=osrm `
  ghcr.io/vroom-project/vroom-docker:v1.15.0
```

Both flags matter. `--network` puts VROOM on the same network as OSRM so it can resolve the service names; the volume mount supplies [vroom-conf/config.yml](vroom-conf/config.yml), without which VROOM looks for OSRM at `0.0.0.0:5000` and fails on every request.

> Already created it once? Don't re-run this — `docker start vroom` is enough. See [Gotchas](#gotchas).

### 4. Start Nominatim (geocoding)

```powershell
docker compose up -d nominatim
docker compose logs -f nominatim
```

**First run takes about an hour and needs ~13 GB** — measured at 62 min on a 16-core / 11.5 GB-Docker machine. It builds a PostgreSQL database from the same Egypt PBF that OSRM uses. Let it finish; an interrupted import cannot be resumed and leaves a volume you have to delete. The container reports `unhealthy` throughout — that's expected until the import completes.

Unlike OSRM and VROOM, this service is in `docker-compose.yml` with everything it needs (`shm_size`, the Postgres memory limits, the network) already set — there are no flags to remember.

> Already imported? Don't re-run the import — `docker compose start nominatim` is enough, and takes seconds. `setup.ps1` detects this for you.

### 5. Verify

```powershell
docker compose ps                # 3 OSRM + nominatim, all Up
docker ps --filter name=vroom    # vroom, Up (healthy)
Invoke-RestMethod "http://localhost:8080/status?format=json"   # status = 0
```

## API — OSRM (single route)

| Profile | URL |
|---------|-----|
| 🚗 Car | `http://localhost:5001` |
| 🚲 Bicycle | `http://localhost:5002` |
| 🏍️ Motorcycle | `http://localhost:5003` |

```
http://localhost:{port}/route/v1/{profile}/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
```

Coordinates are **lon,lat** — longitude first. This trips up everyone at least once.

Example, car across Cairo — paste straight into a browser:

```
http://localhost:5001/route/v1/driving/31.2357,30.0444;31.3000,30.1000?overview=full&geometries=geojson
```

## API — VROOM (multi-stop optimization)

`POST http://localhost:3000` with a JSON body. Profiles available: `car`, `bike`, `motorcycle`.

```json
{
  "vehicles": [
    {"id": 1, "profile": "car", "start": [31.2357, 30.0444], "end": [31.2357, 30.0444]}
  ],
  "jobs": [
    {"id": 1, "location": [31.2550, 30.0500]},
    {"id": 2, "location": [31.2800, 30.0600]},
    {"id": 3, "location": [31.2600, 30.0750]}
  ]
}
```

VROOM returns the optimal visit order, arrival times, distance, and the route polyline.

### Reading the response

| Field | Meaning |
|---|---|
| `code` | `0` = success. Anything else is an error. |
| `summary.unassigned` | Jobs that couldn't be served. **Should be 0** — non-zero means constraints were too tight. |
| `summary.violations` | Empty array = feasible solution. This is the authoritative feasibility check. |
| `routes[].steps[]` | The visit order, in sequence. |
| `arrival` + `waiting_time` | **Service actually starts at the sum.** A vehicle arriving early waits — don't compare `arrival` alone against a time window. |
| `geometry` | Encoded polyline for drawing on a map. Disable via `geometry: false` in config if it's noisy. |

### Useful constraints

```json
{"id": 1, "location": [31.25, 30.05], "service": 300}                    // 5 min on site
{"id": 2, "location": [31.28, 30.06], "time_windows": [[32400, 43200]]}  // 09:00–12:00
{"id": 3, "location": [31.26, 30.07], "delivery": [2], "priority": 100}  // 2 units, high priority
```

Vehicles take `capacity: [10]`, `time_window: [0, 36000]`, and `skills: [1,2]` to match against job `skills`. Times are **seconds from the start of the vehicle's window**, not clock times.

## API — Nominatim (geocoding)

| Caller | Base URL |
|---|---|
| Your app, browser, Postman on Windows | `http://localhost:8080` |
| Another container on `tawsel-routing_default` | `http://nominatim:8080` |

Same internal-vs-published split as OSRM — see the port gotcha below. Nominatim 5 serves everything at the root, with no `/nominatim` prefix.

| Endpoint | Shape |
|---|---|
| `/status?format=json` | `{"status":0,"message":"OK",...}`. Anything but `0` means the database isn't usable. |
| `/search` | `?q=<free text>&format=jsonv2&countrycodes=eg&limit=5&addressdetails=1` |
| `/search` (structured) | `?street=&city=&postalcode=&format=jsonv2` — **cannot be combined with `q`** |
| `/reverse` | `?lat=30.0444&lon=31.2357&format=jsonv2&zoom=18&addressdetails=1` |

Paste straight into a browser:

```
http://localhost:8080/search?q=Tahrir+Square,+Cairo&format=jsonv2&countrycodes=eg&limit=3
```

**Always pass `countrycodes=eg`.** Without it, "Nasr City" can match outside Egypt or rank badly. For delivery work, narrow it further with `viewbox=<minlon,maxlat,maxlon,minlat>&bounded=1` around your service area.

There's no rate limit here — this is your own instance, so the public Nominatim 1 req/s policy doesn't apply. Batch freely.

### Geocode → route

Nominatim returns `lat` and `lon` as separate **strings**. OSRM and VROOM want `[lon, lat]` as **numbers**. Every handoff needs an explicit flip:

```powershell
$a = Invoke-RestMethod "http://localhost:8080/search?q=Tahrir+Square,+Cairo&format=jsonv2&countrycodes=eg&limit=1"
$b = Invoke-RestMethod "http://localhost:8080/search?q=Cairo+International+Airport&format=jsonv2&countrycodes=eg&limit=1"

Invoke-RestMethod "http://localhost:5001/route/v1/driving/$($a.lon),$($a.lat);$($b.lon),$($b.lat)?overview=false" |
  Select-Object -ExpandProperty routes | Select-Object distance, duration
```

## Engine smoke testing

A sample payload lives at [test-vrp.json](test-vrp.json).

```powershell
curl.exe -s -X POST "http://localhost:3000" -H "Content-Type: application/json" -d "@test-vrp.json"
```

For readable output, use PowerShell natively:

```powershell
$body = @{
  vehicles = @(@{ id=1; profile='car'; start=@(31.2357,30.0444); end=@(31.2357,30.0444) })
  jobs = @(
    @{ id=1; location=@(31.2550,30.0500) },
    @{ id=2; location=@(31.2800,30.0600) },
    @{ id=3; location=@(31.2600,30.0750) }
  )
} | ConvertTo-Json -Depth 10

$r = Invoke-RestMethod -Uri "http://localhost:3000" -Method Post -ContentType "application/json" -Body $body
$r.routes[0].steps | Select-Object type, job, arrival, distance | Format-Table -AutoSize
```

`-Depth 10` is required. `ConvertTo-Json` defaults to depth 2 and silently mangles the nested arrays into type names.

Expected output shape:

```
type  job arrival distance
----  --- ------- --------
start           0        0
job   1       305     2555
job   2       680     6296
job   3      1104    10826
end          1491    15876
```

### Is it actually optimizing?

Feed it jobs in a deliberately bad order — alternating between two distant clusters — and check the returned order regroups them. If VROOM hands back your input order unchanged, something is wrong. A verified-good result on a 6-stop two-cluster test: input `[1,2,3,4,5,6]` (W,E,W,E,W,E) comes back as `[5,1,3,6,2,4]` (W,W,W,E,E,E).

## Gotchas

**Use PowerShell, not Git Bash.** Git Bash rewrites `-v "${PWD}/vroom-conf:/conf"` into a Windows path like `\Program Files\Git\conf`, so the mount silently fails and VROOM falls back to its default config. If you must use Git Bash, prefix with `MSYS_NO_PATHCONV=1`.

**Inline JSON in PowerShell 5.1 doesn't work with curl.** Backslash isn't PowerShell's escape character, so `-d "{\"key\":1}"` reaches curl with literal backslashes and returns `code: 2, Invalid JSON object`. Single quotes fail too. Use `-d "@file.json"` or `Invoke-RestMethod`.

**Port 5000 vs 5001/5002/5003.** All three OSRM containers listen on **5000 internally**; 5001–5003 exist only on the host side to avoid collisions. So [vroom-conf/config.yml](vroom-conf/config.yml) correctly uses `osrm-car:5000` — container-to-container traffic never touches the published host ports. Use 5001–5003 only from your browser, Postman, or PowerShell.

**Never rebuild data while servers are running.** `osrm-routed` memory-maps the `.osrm.*` files. Rewriting them under a live server corrupts its view and the process dies on the next request — while `docker compose ps` still cheerfully reports "Up", because the restart policy keeps reviving it. `setup.ps1` now stops the servers before any rebuild.

**"Container name /vroom is already in use".** Check the state before deleting anything:

```powershell
docker ps -a --filter name=vroom
```

`Up` means it's already running — you're done, don't touch it. `Created` or `Exited` means it's stale; `docker rm vroom` then re-run the create command.

**Egyptian results come back in Arabic, and the PowerShell 5.1 console renders them blank.** `display_name` for Cairo is `القاهرة, مصر`, and `Format-Table` shows an empty column — which looks exactly like "no results". It isn't: the strings are intact, the console just can't draw them. Check the length rather than trusting your eyes:

```powershell
$r = Invoke-RestMethod "http://localhost:8080/search?q=Cairo&format=jsonv2&countrycodes=eg&limit=3"
$r.Count                                    # 3
$r | Select-Object lat, lon, type           # renders fine - no Arabic
$r[0].display_name.Length                   # 13, not 0
```

Use `Out-File -Encoding utf8` or a UTF-8 terminal (Windows Terminal) if you need to read the names. Add `accept-language=en` to get Latin-script names where OSM has them — many Egyptian places only have Arabic.

**Nominatim returns `lat`/`lon`; OSRM and VROOM want `lon,lat`.** The same trap as above, arriving from the other direction. Nominatim's JSON also gives you both as *strings*, so parse before you compute. A route that comes back `NoRoute` right after a successful geocode is almost always this.

**`docker ps` cannot tell you whether the import finished.** The container reports `Up` the moment gunicorn binds to 8080, which happens whether or not the database behind it is complete. The real signal is a marker file the image writes only on success:

```powershell
docker run --rm --entrypoint sh -v nominatim-data:/v mediagis/nominatim:5.3 `
  -c "test -f /v/import-finished && echo IMPORTED || echo INCOMPLETE"
```

That marker is also what makes restarts cheap — on every later start the image sees it and skips straight to serving, so `docker compose start nominatim` takes seconds, not 45 minutes.

**A half-imported Postgres volume can't be repaired or resumed.** If an import is interrupted, Postgres is left with an unreplayable write-ahead log and every subsequent start dies the same way:

```
PANIC:  could not locate a valid checkpoint record
pg_ctl: server did not start in time
```

There is no fix but starting over — `nominatim import` always begins with `createdb`, so it can't pick up where it left off. `docker compose rm -sf nominatim; docker volume rm nominatim-data`, then re-import.

**Nominatim's `restart` policy is `"no"` on purpose.** The OSRM services use `unless-stopped` because `osrm-routed` can genuinely crash and should come back. Nominatim must not: if an import fails under a restart policy, Docker re-runs the *whole import* in a loop, each pass writing gigabytes into the volume until the disk fills. Once `import-finished` exists, switching to `unless-stopped` is safe.

**The image's Postgres defaults assume a much bigger machine.** `mediagis/nominatim:5.3` ships `maintenance_work_mem = 10GB` and `effective_cache_size = 24GB`. Docker Desktop here gets ~11.5 GB total, and the import defaults to `nproc` threads building indexes in parallel — which OOM-kills Postgres, and with the image's `synchronous_commit = off` that's exactly how you get the corrupt volume above. `docker-compose.yml` overrides these via `POSTGRES_*` env vars and pins `THREADS: "8"`. Check `docker info --format "{{.MemTotal}}"` before raising them.

## Project Structure

```
tawsel-routing/
├── apps/
│   ├── api/                # Fastify workspace API
│   └── web/                # React/Vite Arabic RTL shell
├── packages/shared/        # Shared configuration and boundary types
├── scripts/setup-app.ps1   # Non-destructive application setup/check
├── docs/operations.md      # Application runbook
├── data/                   # OSM source + processed OSRM files (not in git)
├── profiles/
│   └── motorcycle.lua      # Custom motorcycle routing profile
├── vroom-conf/
│   └── config.yml          # VROOM → OSRM backend mapping (in git)
├── docker-compose.yml      # Orchestrates the 3 OSRM instances + Nominatim
├── setup.ps1               # One-command OSRM setup & start
├── package.json            # npm workspaces and application commands
├── package-lock.json       # Reproducible application dependency graph
├── test-vrp.json           # Sample VROOM payload
└── README.md
```

The Nominatim database lives in a docker-managed named volume, `nominatim-data` (**~13 GB**) — not in `data/`, and not visible to `du` on the project folder. It survives `docker compose down` but **not** `docker compose down -v`.

Need that space back? `docker exec nominatim-egypt sudo -u nominatim nominatim freeze` drops the osm2pgsql slim tables for a few GB. It's one-way — after freezing, refreshing the data means a full re-import.

## Common tasks

```powershell
# Start everything (after a reboot)
.\setup.ps1              # starts OSRM + Nominatim (skips work already done)
docker start vroom

# Stop everything
docker compose down
docker stop vroom

# Watch VROOM requests
docker logs -f vroom

# Apply a vroom-conf/config.yml change  (edits are inert until restart —
# the entrypoint copies the file into the image on startup)
docker restart vroom

# Is Nominatim actually imported?  ("Up" doesn't answer this)
docker run --rm --entrypoint sh -v nominatim-data:/v mediagis/nominatim:5.3 `
  -c "test -f /v/import-finished && echo IMPORTED || echo INCOMPLETE"
```

### Re-importing Nominatim

Only needed for a newer PBF, or to recover a half-imported volume. Takes ~60 min; there is no incremental path back from a broken import.

```powershell
docker compose rm -sf nominatim
docker volume rm nominatim-data
docker compose up -d nominatim
docker compose logs -f nominatim
```

### Re-processing a profile

After editing `motorcycle.lua`, delete that profile's processed files and re-run setup. Don't run `osrm-partition` or `osrm-customize` by hand — `docker-compose.yml` already chains extract → partition → customize for each profile.

```powershell
Remove-Item data\egypt-motorcycle.osrm* -Force
.\setup.ps1
docker restart vroom
```

`setup.ps1` detects a profile as built by the presence of `data\*.osrm.cell_metrics`, the last artifact `osrm-customize` writes. Note there is no bare `.osrm` file in modern OSRM — only `.osrm.*` parts.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to connect to 0.0.0.0:5000` | VROOM didn't load the config | Confirm the mount: `docker inspect vroom --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{end}}'` — destination must be `/conf` |
| `code: 2, Invalid JSON object` | PowerShell quoting | Use `-d "@file.json"` or `Invoke-RestMethod` |
| OSRM 200s then connection refused | Data rebuilt under a live server | `docker compose restart` |
| `unassigned` > 0 | Constraints too tight, or a stop is unreachable | Relax capacity/time windows; check the point snaps to a road via `/nearest` |
| Route returns `NoRoute` | Coordinate outside Egypt, or lat/lon swapped | Remember: **lon first** |
| Jobs returned in input order | Not optimizing — check VROOM reached OSRM | `docker logs vroom` |
| `PANIC: could not locate a valid checkpoint record` | Postgres volume corrupted by an interrupted import | Not repairable. `docker compose rm -sf nominatim; docker volume rm nominatim-data`, then re-import |
| `/status` returns non-zero, or refuses, while the container is `Up` | gunicorn is serving but the import never finished | Check for the `import-finished` marker — see [Gotchas](#gotchas) |
| Import dies with `No space left on device` | The Docker disk hit the host's free space | `wsl -d docker-desktop -e df -h /mnt/docker-desktop-disk`, free space on C:, re-import |
| Import dies with `Killed` / `Cannot allocate memory` | Postgres OOM — memory settings above what Docker has | Lower `POSTGRES_MAINTENANCE_WORK_MEM` and `THREADS` in `docker-compose.yml` |
| `could not resize shared memory segment` during import | `shm_size` missing or too small | `shm_size: 1gb` on the nominatim service |
| `/search` returns `[]` for a real Egyptian address | Missing `countrycodes=eg`, or the address genuinely isn't in OSM | Add `countrycodes=eg`; try a nearby landmark |
| Geocode succeeds but routing it fails | `lat`/`lon` handed to OSRM unflipped | OSRM wants `lon,lat` — see [Geocode → route](#geocode--route) |
```

### Phase 12 routing adapters

`npm run engine:demo` runs a controlled HTTP demonstration for car/motorcycle/bicycle, `npm run test:engine` verifies provider boundaries, and `npm run engine:live` explicitly probes existing services without startup or import. [Boundary/setup](docs/engine-boundary.md), [dated evidence and live gaps](docs/phase-12-evidence.md). Live Engine is unavailable on this host; P13–14 durable planning and route policy are implemented with controlled-provider evidence.
