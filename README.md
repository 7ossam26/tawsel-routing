# tawsel-routing

Offline routing + fleet optimization stack for Egypt.

- **OSRM** — road routing for **car**, **bicycle**, and **motorcycle** profiles
- **VROOM** — vehicle routing optimization (multi-stop, capacity, time windows) on top of OSRM

Runs entirely on your machine via Docker. No external APIs, no internet at runtime, no per-request billing.

## How it fits together

```
                    ┌──────────────────────────────┐
  your app ───────► │  VROOM      localhost:3000   │  "visit these 40 stops
                    │  (optimizer)                 │   with 3 vehicles"
                    └──────────────┬───────────────┘
                                   │ asks for travel times
                                   │ (internal docker network)
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
      ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
      │  osrm-car   │       │osrm-bicycle │       │osrm-motorcy.│
      │   :5000     │       │   :5000     │       │   :5000     │
      └─────────────┘       └─────────────┘       └─────────────┘
       host :5001            host :5002            host :5003
```

Use **OSRM directly** for a single A→B route. Use **VROOM** when you need to decide the order of many stops or split work across vehicles.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- ~10 GB free disk space
- Use **PowerShell**, not Git Bash — see [Gotchas](#gotchas)

## Quick Start

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

### 4. Verify

```powershell
docker compose ps          # 3 OSRM containers, all Up
docker ps --filter name=vroom   # vroom, Up (healthy)
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

## Testing

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

## Project Structure

```
tawsel-routing/
├── data/                   # OSM source + processed OSRM files (not in git)
├── profiles/
│   └── motorcycle.lua      # Custom motorcycle routing profile
├── vroom-conf/
│   └── config.yml          # VROOM → OSRM backend mapping (in git)
├── docker-compose.yml      # Orchestrates the 3 OSRM instances
├── setup.ps1               # One-command OSRM setup & start
├── test-vrp.json           # Sample VROOM payload
└── README.md
```

## Common tasks

```powershell
# Start everything (after a reboot)
.\setup.ps1
docker start vroom

# Stop everything
docker compose down
docker stop vroom

# Watch VROOM requests
docker logs -f vroom

# Apply a vroom-conf/config.yml change  (edits are inert until restart —
# the entrypoint copies the file into the image on startup)
docker restart vroom
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
```
