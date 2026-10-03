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

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Invoke-Docker {
  & docker @args
  if ($LASTEXITCODE -ne 0) { throw "Docker failed (exit $LASTEXITCODE); preparation stopped." }
}

# Resolve exactly what Compose will use, including values supplied in .env.
$composeText = Invoke-Docker @('compose', 'config', '--format', 'json')
$composeConfig = ($composeText -join "`n") | ConvertFrom-Json
$carCommand = @($composeConfig.services.'osrm-car'.command)
if ($carCommand.Count -ne 8 -or ($carCommand[0..6] -join '|') -ne 'osrm-routed|--algorithm|mld|--max-table-size|10000|--max-matching-size|1000') {
  throw 'Unexpected osrm-car command; refusing to operate on these assets.'
}
if ([string]$carCommand[-1] -notmatch '^/data/([A-Za-z0-9][A-Za-z0-9._-]*\.osrm)$') { throw 'OSRM_CAR_DATASET must be a safe basename.' }
$carDataset = $Matches[1]
if ([string]$composeConfig.services.nominatim.environment.PBF_PATH -notmatch '^/nominatim/data/([A-Za-z0-9][A-Za-z0-9._-]*\.osm\.pbf)$') { throw 'EGYPT_PBF_FILE must be a safe basename.' }
$pbfFile = $Matches[1]
$osrmImage = [string]$composeConfig.services.'osrm-car'.image
if ($osrmImage -notmatch '^ghcr\.io/project-osrm/osrm-backend@sha256:[a-f0-9]{64}$') {
  throw 'OSRM_IMAGE must be pinned to the digest compatible with these datasets.'
}

# Compose derives the same project name for checkouts with the same folder
# basename. Never let a worktree operate on another checkout's containers.
$projectContainers = @(Invoke-Docker @('ps', '-aq', '--filter', "label=com.docker.compose.project=$($composeConfig.name)"))
if ($projectContainers.Count -gt 0) {
  $containerText = Invoke-Docker (@('inspect') + $projectContainers)
  $containers = ($containerText -join "`n") | ConvertFrom-Json
  foreach ($existing in $containers) {
    $ownerDirectory = $existing.Config.Labels.'com.docker.compose.project.working_dir'
    if (!$ownerDirectory -or ![string]::Equals([IO.Path]::GetFullPath($ownerDirectory), [IO.Path]::GetFullPath($PSScriptRoot), [StringComparison]::OrdinalIgnoreCase)) {
      throw 'Compose project belongs to another checkout. Set a unique COMPOSE_PROJECT_NAME before running setup in this worktree.'
    }
  }
}

# Only retire the former bicycle service belonging to this Compose project.
# Its files/volumes are retained; never remove unrelated containers/orphans.
$retiredContainers = @(Invoke-Docker @('ps', '-aq', '--filter', "label=com.docker.compose.project=$($composeConfig.name)", '--filter', 'label=com.docker.compose.service=osrm-bicycle'))

Write-Host "=== OSRM Egypt Routing Stack ===" -ForegroundColor Cyan

# Modern OSRM writes no bare ".osrm" file - only ".osrm.*" parts.
# Require the common runtime parts and all MLD parts, not a lone marker file.
function Test-PreparedDataset([string]$Dataset) {
  $requiredParts = @('datasource_names','ebg_nodes','edges','fileIndex','geometry','icd','maneuver_overrides','names','nbg_nodes','properties','ramIndex','timestamp','tld','tls','turn_duration_penalties','turn_weight_penalties','cells','cell_metrics','mldgr','partition')
  foreach ($part in $requiredParts) {
    $partPath = Join-Path 'data' "$Dataset.$part"
    if (!(Test-Path -LiteralPath $partPath -PathType Leaf) -or (Get-Item -LiteralPath $partPath).Length -le 0) { return $false }
  }
  return $true
}
$carReady        = Test-PreparedDataset $carDataset
$motorcycleReady = Test-PreparedDataset 'egypt-motorcycle.osrm'

# A new input must not silently reuse the fixed motorcycle dataset or the
# existing local Nominatim import. Server bootstrap uses separate empty volumes
# and records source identity; this local helper preserves the legacy defaults.
$existingNominatimVolume = [bool](Invoke-Docker @('volume', 'ls', '--quiet', '--filter', 'name=^nominatim-data$'))
if ($pbfFile -ne 'egypt-260913.osm.pbf' -and ($carReady -or $motorcycleReady -or $existingNominatimVolume)) {
  throw 'A source override requires fresh isolated assets/import volumes; retained local data was not prepared from this new source. Use the documented server bootstrap rather than relabeling existing files.'
}
if ((-not $carReady -or -not $motorcycleReady) -and !(Test-Path -LiteralPath (Join-Path 'data' $pbfFile) -PathType Leaf)) { throw "Missing source data/$pbfFile. Download and verify it before preprocessing." }
foreach ($container in $retiredContainers) {
  if ($container) { Invoke-Docker @('rm', '-f', $container) | Out-Null }
}

# ── Pre-process only if needed ──────────────────────────────────

if (-not $carReady -or -not $motorcycleReady) {
  if (!(Test-Path -LiteralPath (Join-Path 'data' $pbfFile) -PathType Leaf)) { throw "Missing source data/$pbfFile. Download and verify it before preprocessing." }
  Write-Host "`nFirst-time setup detected. Pulling OSRM image..." -ForegroundColor Yellow
  Invoke-Docker @('pull', $osrmImage)

  # osrm-routed memory-maps the .osrm.* files. Rewriting them under a live
  # server corrupts its view and the process dies on the next request.
  Write-Host "Stopping any running servers before rebuilding data..." -ForegroundColor Yellow
  Invoke-Docker @('compose', 'stop', 'osrm-car', 'osrm-motorcycle')
}

if (-not $carReady) {
  Write-Host "`n[1/2] Pre-processing Car profile..." -ForegroundColor Yellow
  Invoke-Docker @('compose', 'run', '--rm', 'osrm-preprocess-car')
  if (!(Test-PreparedDataset $carDataset)) { throw 'Car preprocessing produced incomplete runtime files.' }
} else {
  Write-Host "`n[1/2] Car profile already built. Skipping." -ForegroundColor DarkGray
}

if (-not $motorcycleReady) {
  Write-Host "`n[2/2] Pre-processing Motorcycle profile..." -ForegroundColor Yellow
  Invoke-Docker @('compose', 'run', '--rm', 'osrm-preprocess-motorcycle')
  if (!(Test-PreparedDataset 'egypt-motorcycle.osrm')) { throw 'Motorcycle preprocessing produced incomplete runtime files.' }
} else {
  Write-Host "`n[2/2] Motorcycle profile already built. Skipping." -ForegroundColor DarkGray
}

# ── Start routing servers ───────────────────────────────────────

Write-Host "`nStarting routing servers..." -ForegroundColor Yellow
Invoke-Docker @('compose', 'up', '-d', 'osrm-car', 'osrm-motorcycle')

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
Write-Host "  Motorcycle: http://localhost:5003" -ForegroundColor Cyan
if ($nominatimReady) {
  Write-Host "  Geocoding:  http://localhost:8080" -ForegroundColor Cyan
}
