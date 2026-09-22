param([string]$ArchiveSource = 'https://build.protomaps.com/20260922.pmtiles')
$ErrorActionPreference = 'Stop'
# Explicit provisioning command, intentionally absent from ordinary app setup.
$repo = Split-Path $PSScriptRoot -Parent
$toolDir = Join-Path $repo '.local\map-tools'
$mapDir = Join-Path $repo '.local\maps'
New-Item -ItemType Directory -Force $toolDir,$mapDir | Out-Null
$zip = Join-Path $toolDir 'pmtiles.zip'
if (-not (Test-Path -LiteralPath $zip)) {
  Invoke-WebRequest 'https://github.com/protomaps/go-pmtiles/releases/download/v1.31.2/go-pmtiles_1.31.2_Windows_x86_64.zip' -OutFile $zip
}
if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne 'A658BAA4D7E55020AEF6CA17BD9FF9FAA1582671266B36F58C52DB0AC8E785A1') { throw 'PMTiles tool checksum mismatch' }
Expand-Archive -LiteralPath $zip -DestinationPath $toolDir -Force
$archive = Join-Path $mapDir 'cairo.pmtiles'
$cli = Join-Path $toolDir 'pmtiles.exe'
if (-not (Test-Path -LiteralPath $archive)) {
  & $cli extract $ArchiveSource $archive '--bbox=31.0,29.8,31.65,30.3' '--maxzoom=15' '--download-threads=4'
  if ($LASTEXITCODE -ne 0) { throw 'Archive extraction failed; retain the partial file for diagnosis' }
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne 'E3B0DDE005597C52421088F2BB5AA4C13E8ECA4A3756B714848935BC4985F10C') { throw 'Cairo archive checksum mismatch; use the documented retained release' }
& $cli verify $archive
if ($LASTEXITCODE -ne 0) { throw 'Archive verification failed' }
Push-Location $repo
try { node scripts/maps-assets.mjs; if ($LASTEXITCODE -ne 0) { throw 'Supporting asset setup failed' } }
finally { Pop-Location }
