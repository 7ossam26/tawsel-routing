# OSRM Egypt - Startup Script
# - First run: pre-processes OSM data then starts servers (~20-30 min)
# - After that: just starts the servers instantly
#
# Nominatim (geocoding) is handled at the bottom. Its one-time import is NOT run
# automatically - pass -ImportNominatim to opt in. See the Gotchas in README.md.

param(
  # Opt in to the ~60 min Nominatim import. Without this the script only
  # reports what state Nominatim is in and prints the command to run.
  [switch]$ImportNominatim
)

Write-Host "=== OSRM Egypt Routing Stack ===" -ForegroundColor Cyan

# Modern OSRM writes no bare ".osrm" file - only ".osrm.*" parts.
# .osrm.cell_metrics is the last artifact osrm-customize produces, so its
# presence means the full extract -> partition -> customize chain finished.
$carReady        = Test-Path "data\egypt-260913.osrm.cell_metrics"
$bicycleReady    = Test-Path "data\egypt-bicycle.osrm.cell_metrics"
$motorcycleReady = Test-Path "data\egypt-motorcycle.osrm.cell_metrics"

# ── Pre-process only if needed ──────────────────────────────────

if (-not $carReady -or -not $bicycleReady -or -not $motorcycleReady) {
  Write-Host "`nFirst-time setup detected. Pulling OSRM image..." -ForegroundColor Yellow
  docker pull ghcr.io/project-osrm/osrm-backend:latest

  # osrm-routed memory-maps the .osrm.* files. Rewriting them under a live
  # server corrupts its view and the process dies on the next request.
  Write-Host "Stopping any running servers before rebuilding data..." -ForegroundColor Yellow
  docker compose stop osrm-car osrm-bicycle osrm-motorcycle
}

if (-not $carReady) {
  Write-Host "`n[1/3] Pre-processing Car profile (10-15 min)..." -ForegroundColor Yellow
  docker compose run --rm osrm-preprocess-car
} else {
  Write-Host "`n[1/3] Car profile already built. Skipping." -ForegroundColor DarkGray
}

if (-not $bicycleReady) {
  Write-Host "`n[2/3] Pre-processing Bicycle profile (10-15 min)..." -ForegroundColor Yellow
  docker compose run --rm osrm-preprocess-bicycle
} else {
  Write-Host "`n[2/3] Bicycle profile already built. Skipping." -ForegroundColor DarkGray
}

if (-not $motorcycleReady) {
  Write-Host "`n[3/3] Pre-processing Motorcycle profile (10-15 min)..." -ForegroundColor Yellow
  docker compose run --rm osrm-preprocess-motorcycle
} else {
  Write-Host "`n[3/3] Motorcycle profile already built. Skipping." -ForegroundColor DarkGray
}

# ── Start routing servers ───────────────────────────────────────

Write-Host "`nStarting routing servers..." -ForegroundColor Yellow
docker compose up -d osrm-car osrm-bicycle osrm-motorcycle

# ── Nominatim (geocoding) ───────────────────────────────────────
#
# Same idea as the .osrm.cell_metrics checks above: detect the completion
# artifact and skip the expensive step if it's there. The image writes
# /var/lib/postgresql/16/main/import-finished into the named volume only after
# a successful import, so it - not "docker ps says Up" - is the real signal.

$volumeExists   = [bool](docker volume ls --quiet --filter "name=^nominatim-data$")
$nominatimReady = $false

if ($volumeExists) {
  $probe = docker run --rm --entrypoint sh -v nominatim-data:/v mediagis/nominatim:5.3 `
    -c "test -f /v/import-finished && echo yes" 2>$null
  $nominatimReady = ($probe -eq "yes")
}

$nominatimRunning = [bool](docker ps --quiet --filter "name=^nominatim-egypt$")

if ($nominatimReady) {
  Write-Host "`nNominatim already imported. Starting." -ForegroundColor DarkGray
  docker compose start nominatim | Out-Null
}
elseif ($nominatimRunning) {
  # Running with no marker yet: an import is in flight. Don't touch it - the
  # half-imported warning below would be actively harmful advice here.
  Write-Host "`nNominatim: import IN PROGRESS. Leave it alone (~60 min total)." -ForegroundColor Yellow
  Write-Host "  Watch it with: docker compose logs -f nominatim" -ForegroundColor DarkGray
}
elseif ($volumeExists) {
  # A volume with no marker means an import died partway. It cannot be resumed -
  # `nominatim import` always starts with createdb - and an interrupted Postgres
  # usually leaves an unreplayable WAL ("PANIC: could not locate a valid
  # checkpoint record"). Starting it again just loops on that forever.
  Write-Host "`nNominatim: found a HALF-IMPORTED volume. It cannot be repaired or resumed." -ForegroundColor Red
  Write-Host "  Destroy it and start over:" -ForegroundColor Yellow
  Write-Host "    docker compose rm -sf nominatim" -ForegroundColor White
  Write-Host "    docker volume rm nominatim-data" -ForegroundColor White
  Write-Host "    .\setup.ps1 -ImportNominatim" -ForegroundColor White
}
elseif ($ImportNominatim) {
  Write-Host "`nNominatim: starting the Egypt import (~60 min). Do not interrupt." -ForegroundColor Yellow
  Write-Host "  Watch it with: docker compose logs -f nominatim" -ForegroundColor DarkGray
  docker compose up -d nominatim
}
else {
  Write-Host "`nNominatim: not imported yet." -ForegroundColor Yellow
  Write-Host "  The one-time Egypt import takes ~60 min and needs ~13 GB free." -ForegroundColor DarkGray
  Write-Host "  Check space, then run:" -ForegroundColor DarkGray
  Write-Host "    wsl -d docker-desktop -e df -h /mnt/docker-desktop-disk" -ForegroundColor White
  Write-Host "    .\setup.ps1 -ImportNominatim" -ForegroundColor White
}

Write-Host "`n=== All servers running! ===" -ForegroundColor Green
Write-Host "  Car:        http://localhost:5001" -ForegroundColor Cyan
Write-Host "  Bicycle:    http://localhost:5002" -ForegroundColor Cyan
Write-Host "  Motorcycle: http://localhost:5003" -ForegroundColor Cyan
if ($nominatimReady) {
  Write-Host "  Geocoding:  http://localhost:8080" -ForegroundColor Cyan
}
