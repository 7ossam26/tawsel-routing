param([ValidateSet('start','stop','status')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $taskRoot '.local'
$clusterPath = Join-Path $localRoot 'postgres-18'
$pgBin = Split-Path (Get-Command pg_ctl -ErrorAction Stop).Source
$markerPath = Join-Path $clusterPath 'tawsel-local-cluster'
$passwordPath = Join-Path $localRoot 'postgres-password'
$logPath = Join-Path $localRoot 'postgres.log'

function Invoke-Pg([string]$Program, [string[]]$Arguments) {
  & (Join-Path $pgBin $Program) @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
}

if ($Action -ne 'start') {
  if (!(Test-Path -LiteralPath $markerPath) -or (Get-Content -LiteralPath $markerPath -Raw) -ne 'tawsel-local-postgres-18') { throw 'Not a managed Tawsel local cluster' }
  if ($Action -eq 'stop') { Invoke-Pg 'pg_ctl.exe' @('-D', $clusterPath, 'stop', '-m', 'fast', '-w') }
  else { Invoke-Pg 'pg_ctl.exe' @('-D', $clusterPath, 'status') }
  exit
}

New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
if (!(Test-Path -LiteralPath $clusterPath)) {
  $localPassword = [guid]::NewGuid().ToString('N')
  [IO.File]::WriteAllText($passwordPath, $localPassword)
  Invoke-Pg 'initdb.exe' @('-D', $clusterPath, '-U', 'tawsel_local', '--auth=scram-sha-256', "--pwfile=$passwordPath", '--encoding=UTF8', '--locale=C')
  [IO.File]::WriteAllText($markerPath, 'tawsel-local-postgres-18')
}
if (!(Test-Path -LiteralPath $markerPath) -or !(Test-Path -LiteralPath $passwordPath) -or (Get-Content -LiteralPath $markerPath -Raw) -ne 'tawsel-local-postgres-18') { throw 'Refusing an unmanaged cluster' }
if ((Get-Content -LiteralPath (Join-Path $clusterPath 'PG_VERSION') -Raw).Trim() -ne '18') { throw 'PostgreSQL 18 required' }
& (Join-Path $pgBin 'pg_ctl.exe') -D $clusterPath status *> $null
if ($LASTEXITCODE -ne 0) {
  # pg_ctl detaches postgres; hide the helper window on Windows.
  $pgStart = Start-Process -FilePath (Join-Path $pgBin 'pg_ctl.exe') -ArgumentList @('-D', ('"' + $clusterPath + '"'), '-l', ('"' + $logPath + '"'), '-o', '"-h 127.0.0.1 -p 55432"', '-w', 'start') -WindowStyle Hidden -PassThru
  # Start-Process -Wait waits for the detached postgres tree too; wait only for pg_ctl.
  $pgStart.WaitForExit()
  if ($pgStart.ExitCode -ne 0) { throw "PostgreSQL startup failed; see $logPath" }
}
$previousPassword = $env:PGPASSWORD
try {
  $localPassword = (Get-Content -LiteralPath $passwordPath -Raw).Trim()
  $env:PGPASSWORD = $localPassword
  $psqlArgs = @('-h','127.0.0.1','-p','55432','-U','tawsel_local','-d','postgres','-v','ON_ERROR_STOP=1')
  foreach ($dbName in @('tawsel_app_dev','tawsel_test_control')) {
    $exists = & (Join-Path $pgBin 'psql.exe') @psqlArgs -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect dedicated cluster' }
    if ($exists -ne '1') {
      Invoke-Pg 'psql.exe' ($psqlArgs + @('-c', "CREATE DATABASE $dbName"))
      $dbMarker = if ($dbName -eq 'tawsel_app_dev') { 'tawsel:application:v1' } else { 'tawsel:test-control:v1' }
      Invoke-Pg 'psql.exe' ($psqlArgs + @('-c', "COMMENT ON DATABASE $dbName IS '$dbMarker'"))
    }
  }
  $envText = "TAWSEL_DATABASE_URL=postgresql://tawsel_local:${localPassword}@127.0.0.1:55432/tawsel_app_dev?sslmode=disable`nTAWSEL_TEST_ADMIN_URL=postgresql://tawsel_local:${localPassword}@127.0.0.1:55432/tawsel_test_control?sslmode=disable`n"
  [IO.File]::WriteAllText((Join-Path $taskRoot '.env.database.local'), $envText)
  Write-Output 'Dedicated Tawsel PostgreSQL ready on loopback port 55432; configuration: .env.database.local'
} finally { $env:PGPASSWORD = $previousPassword }
