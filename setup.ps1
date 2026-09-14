# OSRM Egypt - Startup Script
# - First run: pre-processes OSM data then starts servers (~20-30 min)
# - After that: just starts the servers instantly

Write-Host "=== OSRM Egypt Routing Stack ===" -ForegroundColor Cyan

$carReady        = Test-Path "data\egypt-260913.osrm"
$bicycleReady    = Test-Path "data\egypt-bicycle.osrm"
$motorcycleReady = Test-Path "data\egypt-motorcycle.osrm"

# ── Pre-process only if needed ──────────────────────────────────

if (-not $carReady -or -not $bicycleReady -or -not $motorcycleReady) {
  Write-Host "`nFirst-time setup detected. Pulling OSRM image..." -ForegroundColor Yellow
  docker pull ghcr.io/project-osrm/osrm-backend:latest
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
