# tawsel-routing — Local Stack Context Report

**Purpose of this document.** It is a self-contained handoff brief, written to be pasted into a
chat that has **no access to this repository or machine**. Everything needed to reason about the
system is quoted inline — configs, ports, API contracts, measured numbers. Nothing here requires
looking anything up.

**Status:** the routing/geocoding infrastructure layer is **complete and verified working**.
There is **no application code of any kind** — no frontend, no backend, no database of your own,
no API layer. The next phase is designing those on top of what is described below.

**Captured:** 15 September 2026. All numbers below were measured on the machine, not estimated.

---

## 1. What this system is

A fully offline routing and fleet-optimization stack for **Egypt**, running entirely in Docker on
one Windows machine. No external APIs, no internet at runtime, no per-request billing. It answers
three kinds of question:

| Question | Service |
|---|---|
| "Where is *12 Tahrir Street, Cairo*?" | **Nominatim** (geocoding) |
| "How long from A to B by car/bike/motorcycle?" | **OSRM** (routing) |
| "Best order to visit these 40 stops with 3 vehicles?" | **VROOM** (optimization) |

The intended domain is **delivery / dispatch in Egypt** ("tawsel" / توصيل = delivery).

---

## 2. Host environment

| | |
|---|---|
| OS | Windows 11 Home Single Language, 10.0.26200 |
| CPU | 16 logical cores |
| RAM | 23.6 GB total |
| Docker Engine | 29.7.2, Docker Compose 5.4.0 |
| Docker backend | WSL2 |
| **RAM available to Docker** | **11.5 GB** (`MemTotal: 12348375040`) |
| CPUs available to Docker | 16 |
| Docker disk image | `C:\Users\7OSS\AppData\Local\Docker\wsl\disk\docker_data.vhdx`, ~18.5 GB used of a 1 TB virtual disk |
| Free space on C: | ~15 GB (of 463.7 GB total) |
| Repo path | `C:\Users\7OSS\Desktop\projects\tawsel-routing` |
| Shell | PowerShell 5.1 (Windows PowerShell, *not* PS 7) |

The 11.5 GB Docker memory ceiling is a real constraint and has already caused one failure — see
§9. Disk is also tight in absolute terms: OSRM data (7.7 GB) + Nominatim DB (13.4 GB) ≈ 21 GB
already committed.

---

## 3. Running services

Five containers, all currently `Up`, all on one Docker network.

| Container | Image | Host port | Internal port | Restart policy | Managed by |
|---|---|---|---|---|---|
| `nominatim-egypt` | `mediagis/nominatim:5.3` | **8080** | 8080 | `no` | docker-compose |
| `vroom` | `ghcr.io/vroom-project/vroom-docker:v1.15.0` | **3000** | 3000 | `no` | **hand-run `docker run`** |
| `tawsel-routing-osrm-car-1` | `ghcr.io/project-osrm/osrm-backend:latest` | **5001** | 5000 | `unless-stopped` | docker-compose |
| `tawsel-routing-osrm-bicycle-1` | same | **5002** | 5000 | `unless-stopped` | docker-compose |
| `tawsel-routing-osrm-motorcycle-1` | same | **5003** | 5000 | `unless-stopped` | docker-compose |

Image sizes: OSRM 388 MB, VROOM 634 MB, Nominatim 1.53 GB.

**Operational consequences of the restart policies:** only the three OSRM containers come back
automatically after a reboot or Docker restart. `vroom` and `nominatim-egypt` are `restart=no` and
must be started manually (`docker start vroom`, `docker compose start nominatim`), or via
`.\setup.ps1`. Nominatim's `no` is **deliberate** — a restart policy on a failing import re-runs
the entire import in a loop and fills the disk. VROOM's is incidental.

**`vroom` is not in `docker-compose.yml`.** It is a hand-run container, which is why it does not
appear in `docker compose ps`. Its create command is in §8.

---

## 4. Network topology and how services communicate

All five containers sit on a single Docker bridge network, **`tawsel-routing_default`**
(subnet `172.18.0.0/16`), auto-created by Compose from the project directory name.

| Container | IP |
|---|---|
| `tawsel-routing-osrm-car-1` | 172.18.0.2 |
| `tawsel-routing-osrm-bicycle-1` | 172.18.0.3 |
| `tawsel-routing-osrm-motorcycle-1` | 172.18.0.4 |
| `vroom` | 172.18.0.5 |
| `nominatim-egypt` | 172.18.0.6 |

On this network Docker's embedded DNS resolves **service names** and **container names**, so
container-to-container calls use names, never IPs or host ports.

```
                        ┌──────────────────────────────┐
                 ┌────► │  Nominatim   :8080           │  address ─► coordinates
                 │      │  (geocoder, standalone)      │
                 │      └──────────────────────────────┘
                 │
  YOUR APP ──────┤      ┌──────────────────────────────┐
  (does not      │      │  VROOM       :3000           │  "visit 40 stops
   exist yet)    ├────► │  (optimizer)                 │   with 3 vehicles"
                 │      └──────────────┬───────────────┘
                 │                     │ travel-time matrix
                 │                     │ (internal network, by DNS name)
                 │      ┌──────────────┼─────────────────────┐
                 │      ▼              ▼                     ▼
                 │ ┌──────────┐  ┌──────────────┐   ┌────────────────┐
                 └►│ osrm-car │  │ osrm-bicycle │   │osrm-motorcycle │
                   │  :5000   │  │    :5000     │   │     :5000      │
                   └──────────┘  └──────────────┘   └────────────────┘
                    host 5001      host 5002          host 5003
```

**The single most important structural fact: VROOM does not know Nominatim exists.** The only
wiring between services is VROOM → OSRM. Geocoding is *always* a separate, prior step performed by
the caller. Nominatim is a sibling service, not a dependency of anything.

The VROOM → OSRM wiring is the entire contents of `vroom-conf/config.yml`, mounted into the VROOM
container at `/conf`:

```yaml
cliArgs:
  geometry: true # retrieve route geometry from OSRM (-g)
  planmode: false
  threads: 4
  explore: 5
  limit: '10mb'
  logdir: '/conf'
  logsize: '100M'
  maxlocations: 1000
  maxvehicles: 200
  override: true
  path: ''
  port: 3000
  router: 'osrm'
  timeout: 300000
  baseurl: '/'

# Hosts are the docker-compose SERVICE names on the tawsel-routing_default
# network, so the port is OSRM's internal 5000 - not the host-side 5001/5002/5003.
routingServers:
  osrm:
    car:
      host: 'osrm-car'
      port: '5000'
    bike:
      host: 'osrm-bicycle'
      port: '5000'
    motorcycle:
      host: 'osrm-motorcycle'
      port: '5000'
```

**Hard limits to design around:** `maxlocations: 1000`, `maxvehicles: 200`, `timeout: 300000`
(300 s), request body `limit: '10mb'`.

### Addressing cheat-sheet

| Caller | Nominatim | VROOM | OSRM car / bike / moto |
|---|---|---|---|
| Host (Windows app, browser, Postman) | `http://localhost:8080` | `http://localhost:3000` | `http://localhost:5001` / `:5002` / `:5003` |
| A container on `tawsel-routing_default` | `http://nominatim:8080` | `http://vroom:3000` | `http://osrm-car:5000` / `osrm-bicycle:5000` / `osrm-motorcycle:5000` |

A future backend container joining `tawsel-routing_default` should use the **right-hand column**.
The host ports 5001–5003 exist only to avoid collisions on the host side; internally all three
OSRM servers listen on 5000.

---

## 5. API contracts

All examples below were executed against the live stack; the outputs are real.

### 5.1 Nominatim — geocoding, port 8080

Nominatim 5.3.2 serves everything at the **root** — there is no `/nominatim` path prefix.

| Endpoint | Purpose |
|---|---|
| `GET /status?format=json` | Health. `{"status":0,"message":"OK",...}` — `0` is the only healthy value. |
| `GET /search` | Forward geocode. `?q=<text>&format=jsonv2&countrycodes=eg&limit=5&addressdetails=1` |
| `GET /search` (structured) | `?street=&city=&postalcode=&format=jsonv2` — **mutually exclusive with `q`** |
| `GET /reverse` | `?lat=30.0444&lon=31.2357&format=jsonv2&zoom=18&addressdetails=1` |
| `GET /lookup` | `?osm_ids=R1234,W5678&format=jsonv2` |

Live `/status`:

```json
{"status":0,"message":"OK","data_updated":"2026-09-13T20:19:55+00:00",
 "software_version":"5.3.2","database_version":"5.3.2-0"}
```

Live `/search?q=Tahrir+Square,+Cairo&format=jsonv2&countrycodes=eg&limit=1` (abridged):

```json
[{"place_id":2668025,"osm_type":"way","osm_id":30925727,
  "lat":"30.0443934","lon":"31.2357457",
  "category":"leisure","type":"park","place_rank":24,"importance":0.08,
  "addresstype":"park","name":"ميدان التحرير",
  "display_name":"ميدان التحرير, باب اللوق, القاهرة, مصر",
  "boundingbox":["30.0441162","30.0447132","31.2353998","31.2360891"]}]
```

Live `/reverse?lat=30.0444&lon=31.2357&format=jsonv2`:

```
display_name = "ميدان التحرير, قصر الدوباره, باب اللوق, القاهرة, 11519, مصر"
```

**Contract notes that matter for implementation:**
- `lat` and `lon` come back as **strings**, in that order. VROOM and OSRM want `[lon, lat]` as
  **numbers**. Every handoff requires a flip *and* a parse.
- Results are **predominantly Arabic**, because that is what Egyptian OSM data carries.
  `accept-language=en` returns Latin script *where OSM has it*; many places have Arabic only.
- Always send `countrycodes=eg`. Without it, common Egyptian names match places abroad.
- For delivery-grade precision, add `viewbox=<minlon,maxlat,maxlon,minlat>&bounded=1`.
- No rate limit — this is a private instance, so the public Nominatim 1 req/s policy does not
  apply. Batch freely.
- Free-text `/search` returns *a* match, not necessarily the intended one. Observed: "Nasr City"
  resolves to the eastern edge (31.367) rather than the centre; "Giza Pyramids" resolves to the
  plateau, not the visitor entrance. Structured search is more reliable for addresses.

### 5.2 OSRM — routing, ports 5001 / 5002 / 5003

```
http://localhost:{port}/route/v1/{profile}/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
```

**Coordinates are `lon,lat` — longitude first.** Other useful endpoints on the same servers:
`/table` (duration/distance matrix), `/nearest` (snap a point to the road network), `/match`
(GPS trace map-matching), `/trip`.

Verified: Tahrir Square → Cairo International Airport by car = **24,668 m, 1,495 s (24.9 min)**.

### 5.3 VROOM — optimization, port 3000

`POST http://localhost:3000` with a JSON body.

**Valid `profile` values are `car`, `bike`, `motorcycle`.** This was tested explicitly:

| `profile` sent | Result |
|---|---|
| `car` | accepted — 542 s |
| `bike` | accepted — 1465 s |
| `bicycle` | **REJECTED** |
| `motorcycle` | accepted — 448 s |

`bicycle` is rejected even though the container is named `osrm-bicycle` and OSM calls the profile
bicycle — VROOM's key comes from `vroom-conf/config.yml`, where it is `bike`. Easy trap.

The speed ordering (motorcycle 448 s < car 542 s < bike 1465 s on the same trip) confirms the
custom motorcycle profile is active and behaving as intended.

Request shape:

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

Response fields that matter:

| Field | Meaning |
|---|---|
| `code` | `0` = success. Anything else is an error. |
| `summary.unassigned` | Jobs that could not be served. **Must be 0**; non-zero means constraints too tight. |
| `summary.violations` | Empty array = feasible. This is the authoritative feasibility check. |
| `routes[].steps[]` | The visit order, in sequence. |
| `arrival` + `waiting_time` | **Service starts at the sum.** A vehicle arriving early waits — never compare `arrival` alone against a time window. |
| `geometry` | Encoded polyline for drawing on a map (`geometry: true` is enabled). |

Constraint syntax:

```json
{"id": 1, "location": [31.25, 30.05], "service": 300}                    // 5 min on site
{"id": 2, "location": [31.28, 30.06], "time_windows": [[32400, 43200]]}  // 09:00-12:00
{"id": 3, "location": [31.26, 30.07], "delivery": [2], "priority": 100}  // 2 units, high priority
```

Vehicles accept `capacity: [10]`, `time_window: [0, 36000]`, and `skills: [1,2]` matched against
job `skills`. **All times are seconds from the start of the vehicle's window, not clock times.**

**Job IDs are integers only.** There is no field for your own order/customer identifiers — mapping
VROOM's integer IDs back to real records is entirely the caller's responsibility.

---

## 6. Verified end-to-end pipeline

This ran successfully against the live stack and is the canonical example of how the three
services combine:

1. Five Cairo addresses as free text → Nominatim `/search` (with `countrycodes=eg`) → coordinates
2. Coordinates flipped to `[lon, lat]` → VROOM `POST /` with 1 vehicle + 4 jobs
3. VROOM internally queried `osrm-car:5000` for the travel-time matrix
4. Result: `code=0`, `unassigned=0`, **110,159 m / 7,418 s**

| Address | lon | lat |
|---|---|---|
| Tahrir Square, Cairo | 31.2357457 | 30.0443934 |
| Cairo International Airport | 31.4245461 | 30.1140504 |
| Giza Pyramids | 31.1242335 | 29.9707813 |
| Nasr City, Cairo | 31.367484 | 30.0390035 |
| Maadi, Cairo | 31.2581197 | 29.9601415 |

Input job order was Airport → Pyramids → Nasr City → Maadi. VROOM returned **Airport → Nasr City
→ Maadi → Pyramids** — NE, E, S, W, a clean loop instead of crossing the city twice. Genuine
optimization, not input passthrough.

---

## 7. Data layer

### OSM source

One Geofabrik Egypt extract, shared by **all** services:

```
data/egypt-260913.osm.pbf     170 MB     (downloaded from
                                          https://download.geofabrik.de/africa/egypt-latest.osm.pbf
                                          and renamed)
```

OSM data vintage: **2026-09-13**. The filename is hardcoded in six places in
`docker-compose.yml` — do not rename it casually.

### OSRM preprocessed artifacts (on-disk, in `data/`, git-ignored)

| Profile | Files | Size |
|---|---|---|
| car (`egypt-260913.osrm.*`) | 26 | 2.57 GB |
| bicycle (`egypt-bicycle.osrm.*`) | 26 | 2.41 GB |
| motorcycle (`egypt-motorcycle.osrm.*`) | 26 | 2.58 GB |
| **Total `data/`** | | **~7.7 GB** |

Built by an `osrm-extract` → `osrm-partition` → `osrm-customize` chain, ~10–15 min per profile.
`*.osrm.cell_metrics` is the last artifact written and is used as the "profile is built" sentinel.
Note there is **no bare `.osrm` file** in modern OSRM — only `.osrm.*` parts.

### Nominatim database

A Docker **named volume**, not a folder in the repo:

```
nominatim-data     13.39 GB     mounted at /var/lib/postgresql/16/main
```

PostgreSQL 16.14 + PostGIS 3.4, built by a one-time import that took **62 minutes** wall clock.
Survives `docker compose down`; destroyed by `docker compose down -v`.

The image writes a marker file `/var/lib/postgresql/16/main/import-finished` **only on a
successful import**. On every later start it sees the marker and skips straight to serving — which
is why restarts take ~8 seconds instead of an hour. Checking that marker is the only reliable way
to know whether the database is usable:

```powershell
docker run --rm --entrypoint sh -v nominatim-data:/v mediagis/nominatim:5.3 `
  -c "test -f /v/import-finished && echo IMPORTED || echo INCOMPLETE"
```

`docker ps` reporting `Up` does **not** mean the import finished — gunicorn binds to 8080 the
moment it starts, regardless of the state of the database behind it.

---

## 8. Repository contents

Git repo, branch `main`, working tree clean. Recent history:

```
8a0a3ca setup nominatim
d3a3bb2 setup vroom
c6ca003 update setup
961509e first setup
1844766 first commit
```

**Eight tracked files** (this report is a ninth, untracked at time of writing).
**There is no application source code, no package.json, no .env, no src/.**

| Path | Role |
|---|---|
| `docker-compose.yml` | Orchestrates 3 OSRM servers + 3 preprocessing jobs (behind Compose profiles) + Nominatim. ~185 lines, heavily commented. |
| `setup.ps1` | Idempotent startup. Detects already-built OSRM profiles and an already-imported Nominatim, skips both. Takes `-ImportNominatim` to opt into the ~60 min import. |
| `vroom-conf/config.yml` | VROOM → OSRM mapping (quoted in full in §4). Mounted into the VROOM container at `/conf`. |
| `profiles/motorcycle.lua` | Custom OSRM motorcycle profile, 13 KB. See below. |
| `profiles/_car_reference.lua` | Stock `car.lua`, kept for diffing. Git-ignored, not tracked. |
| `test-vrp.json` | Sample VROOM payload — 1 car, 3 Cairo jobs. |
| `README.md` | Full operating manual: quick start, API reference, Gotchas, Troubleshooting. |
| `data/.gitkeep` | Keeps `data/` in git; the contents are ignored. |
| `.gitignore` | Excludes the generated payload: `data/*.osrm`, `data/*.osrm.*`, `data/*.pbf`, `data/*.osm.pbf`, plus `profiles/_car_reference.lua` and `vroom-conf/access.log`. |
| `STACK-CONTEXT.md` | This document. |

Consequence worth flagging: **the repo carries no map data at all.** A fresh clone needs the
170 MB Geofabrik PBF downloaded and renamed to `data/egypt-260913.osm.pbf`, then ~40 min of OSRM
preprocessing and ~60 min of Nominatim import before anything works.

### The custom motorcycle profile

`profiles/motorcycle.lua` is derived from OSRM's official `car.lua` (api_version 4). Its
self-documented deltas:

- `access_tags_hierarchy` prioritises `motorcycle` over `motorcar`
- turn restrictions evaluate `motorcycle` first
- higher open-road speeds: motorway 110, trunk 100, primary 80 km/h (vs car defaults)
- smaller vehicle dimensions: height 1.5 m, width 0.9 m, length 2.4 m
- `vehicle_max_speed = 130` km/h

Full speed table (km/h): motorway 110, motorway_link 65, trunk 100, trunk_link 55, primary 80,
primary_link 40, secondary 65, secondary_link 30, tertiary 50, tertiary_link 25, unclassified 35,
residential 30, living_street 10, service 20.

This matters for Egypt specifically: motorcycles are a dominant last-mile delivery vehicle, and
the profile lets them exceed car speeds on open roads while using the same road network.

### How VROOM is started (not in Compose)

```powershell
docker run -d --name vroom -p 3000:3000 `
  --network tawsel-routing_default `
  -v "${PWD}/vroom-conf:/conf" `
  -e VROOM_ROUTER=osrm `
  ghcr.io/vroom-project/vroom-docker:v1.15.0
```

Both flags are load-bearing. `--network` puts it where it can resolve `osrm-car` by name; without
the volume mount VROOM looks for OSRM at `0.0.0.0:5000` and fails every request.

Editing `vroom-conf/config.yml` has **no effect until `docker restart vroom`** — the entrypoint
copies the file into the image at startup.

---

## 9. Known traps and hard-won lessons

These cost real debugging time. Anything built on this stack will hit them.

**Coordinate order.** OSRM and VROOM take `[lon, lat]`. Nominatim returns `lat`/`lon` as separate
strings. A geocode that succeeds followed by a route that returns `NoRoute` is almost always this.

**VROOM profile is `bike`, not `bicycle`.** See §5.3.

**Arabic renders blank in the PowerShell 5.1 console.** `Format-Table` on a `display_name` column
shows empty cells that look exactly like "no results returned". The strings are intact — verify
with `.Length`, not with your eyes. Use Windows Terminal or `Out-File -Encoding utf8` to read them.

**Nominatim's Postgres defaults exceed this machine.** `mediagis/nominatim:5.3` ships
`maintenance_work_mem = 10GB` and `effective_cache_size = 24GB`, and the import defaults to `nproc`
(16) parallel index builds — against Docker's 11.5 GB. That OOM-kills Postgres, and because the
image also sets `synchronous_commit = off`, the kill leaves an unreplayable write-ahead log. This
destroyed a first import attempt. `docker-compose.yml` now overrides:

```yaml
POSTGRES_SHARED_BUFFERS: 2GB
POSTGRES_MAINTENANCE_WORK_MEM: 1GB     # was 10GB
POSTGRES_AUTOVACUUM_WORK_MEM: 256MB    # was 2GB
POSTGRES_EFFECTIVE_CACHE_SIZE: 7GB     # was 24GB
THREADS: "8"                           # was nproc = 16
```

Peak memory during the successful import was 3.9 GB of 11.5 GB.

**A half-imported Nominatim volume cannot be repaired or resumed.** `nominatim import` always
begins with `createdb`. Symptom: `PANIC: could not locate a valid checkpoint record`. The only fix
is `docker compose rm -sf nominatim; docker volume rm nominatim-data` and a fresh 60-minute import.

**Never rebuild OSRM data while its server is running.** `osrm-routed` memory-maps the `.osrm.*`
files; rewriting them under a live server corrupts its view and the process dies on the next
request — while `docker compose ps` still reports "Up", because the restart policy keeps reviving
it. `setup.ps1` stops the servers before any rebuild.

**Use PowerShell, not Git Bash.** Git Bash rewrites `-v "${PWD}/vroom-conf:/conf"` into a Windows
path, so the mount silently fails. Prefix with `MSYS_NO_PATHCONV=1` if unavoidable.

**Inline JSON with curl fails in PowerShell 5.1.** Backslash is not PowerShell's escape character,
so `-d "{\"key\":1}"` reaches curl with literal backslashes → `code: 2, Invalid JSON object`. Use
`-d "@file.json"` or `Invoke-RestMethod`.

**`ConvertTo-Json` defaults to `-Depth 2`** and silently mangles nested arrays into type names.
Always pass `-Depth 10` for VROOM payloads.

---

## 10. What does NOT exist yet

This is the gap the next phase has to fill. Nothing in the list below is started.

- **No backend / API layer.** Nothing orchestrates the three services. The geocode → optimize →
  route chain currently exists only as ad-hoc PowerShell commands.
- **No frontend.** No map, no dispatcher view, no address entry.
- **No application database.** Nothing stores orders, customers, drivers, vehicles, or completed
  routes. The Nominatim Postgres instance is Nominatim's private store and must not be reused as
  an application database.
- **No identity mapping.** VROOM speaks integer job IDs; there is no layer translating those to
  real orders or customers.
- **No geocode cache.** Delivery addresses repeat heavily; re-geocoding identical strings on every
  run is pure waste. A cache belongs in the application database.
- **No authentication or authorization anywhere.** All five services are bound to `0.0.0.0` with
  **no auth of any kind**. Anyone who can reach this machine on ports 8080, 3000, or 5001–5003 can
  query them freely. **These ports must never be exposed to the internet** — a backend should be
  the only thing that talks to them, and the only thing exposed.
- **No error/fallback handling.** `/search` returns `[]` for addresses absent from OSM (common for
  new Egyptian compounds and informal areas). A production flow needs a fallback: map pin-drop,
  nearest-landmark search, or manual coordinate entry.
- **No persistence or scheduling for optimization runs.** VROOM is stateless — it answers one
  request and forgets.
- **Single machine, no redundancy.** Everything runs on one Windows box. Two of the five
  containers do not even restart automatically.

---

## 11. Questions the next phase should answer

Design decisions this report deliberately leaves open:

1. **Backend language/framework?** No constraint is imposed by this stack — every service speaks
   plain HTTP + JSON.
2. **Should the backend run as a container on `tawsel-routing_default`** (so it can use
   `nominatim:8080`, `vroom:3000`, `osrm-car:5000` by DNS name, and the host ports can be closed),
   **or on the host**? The container option is meaningfully more secure.
3. **Application database choice**, and whether the geocode cache lives there.
4. **How addresses are captured.** Egyptian addressing is landmark-heavy and frequently not in
   OSM. Free-text geocoding alone will not be sufficient — expect to need map pin-drop.
5. **Arabic-first UI?** All geocoding results are Arabic by default. RTL layout and Arabic
   rendering are likely requirements, not nice-to-haves.
6. **Batch vs. real-time optimization** — nightly route planning, or dispatch-on-demand?
7. **Data refresh policy.** The OSM extract is from 2026-09-13. Refreshing means re-running OSRM
   preprocessing (~40 min for 3 profiles) *and* re-importing Nominatim (~60 min). `FREEZE=false`
   is currently set, which preserves the option of incremental `nominatim replication` updates
   instead of a full re-import.
8. **Should `vroom` move into `docker-compose.yml`** for consistency, and should `vroom` and
   `nominatim` get `restart: unless-stopped` now that the import is proven?

---

## 12. Quick reference

```powershell
# Start everything after a reboot
.\setup.ps1
docker start vroom

# Health checks
Invoke-RestMethod "http://localhost:8080/status?format=json"     # Nominatim: status = 0
curl.exe -s -X POST "http://localhost:3000" -H "Content-Type: application/json" -d "@test-vrp.json"
http://localhost:5001/route/v1/driving/31.2357,30.0444;31.4245,30.1140?overview=false

# Geocode
http://localhost:8080/search?q=Maadi,+Cairo&format=jsonv2&countrycodes=eg

# State
docker compose ps                    # OSRM + Nominatim
docker ps --filter name=vroom        # VROOM (not in compose)

# Stop
docker compose down                  # NEVER add -v: that destroys the 13 GB Nominatim DB
docker stop vroom
```

**Bottom line:** infrastructure is done, verified, and reproducible from the repo. Every service
is reachable both from the host and container-to-container, the full geocode → optimize → route
chain has been executed successfully end to end, and the remaining work is entirely application
layer.
