# OSRM Egypt - Startup Script
# - First run: pre-processes OSM data then starts servers (~20-30 min)
# - After that: just starts the servers instantly

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

Write-Host "`n=== All servers running! ===" -ForegroundColor Green
Write-Host "  Car:        http://localhost:5001" -ForegroundColor Cyan
Write-Host "  Bicycle:    http://localhost:5002" -ForegroundColor Cyan
Write-Host "  Motorcycle: http://localhost:5003" -ForegroundColor Cyan
