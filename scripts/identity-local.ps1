param([ValidateSet('install','start','mail','stop')][string]$Action='start')
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$identityDir=Join-Path $workspace '.local/identity'
New-Item -ItemType Directory -Force $identityDir | Out-Null
if ($Action -eq 'install') {
  $artifacts=@(
    @{Name='keycloak';Url='https://github.com/keycloak/keycloak/releases/download/26.7.4/keycloak-26.7.4.zip';Hash='a286e98b4296d4e75ee88d8527c7cd463b307caa022f088c9f22cffccc741fa1';Target=$identityDir},
    @{Name='jdk';Url='https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25.0.4.1%2B1/OpenJDK25U-jdk_x64_windows_hotspot_25.0.4.1_1.zip';Hash='00c847d804f4a78e9f04f2683faf14fed898535b177b7fc704486cb0284e9283';Target=$identityDir},
    @{Name='mailpit';Url='https://github.com/axllent/mailpit/releases/download/v1.31.2/mailpit-windows-amd64.zip';Hash='42c20e5c3254125ea7489847811f10d70e39de573fe41d03a61412c87913e995';Target=(Join-Path $identityDir 'mailpit')}
  )
  foreach($artifact in $artifacts) {
    $archive=Join-Path $identityDir ($artifact.Name+'.zip')
    if (!(Test-Path -LiteralPath $archive)) { Invoke-WebRequest $artifact.Url -OutFile $archive }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $artifact.Hash) { throw ('Checksum mismatch: '+$artifact.Name) }
    Expand-Archive -LiteralPath $archive -DestinationPath $artifact.Target -Force
  }
  & node (Join-Path $PSScriptRoot 'identity-config.mjs')
  if($LASTEXITCODE -ne 0){throw 'Identity configuration failed'}
  & (Join-Path $PSScriptRoot 'identity-provider.ps1')
  exit
}
if ($Action -eq 'stop') {
  foreach($port in @(8085,8025)) {
    $listener=Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if($listener) {
      $owned=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
      if($owned.CommandLine -notlike ('*'+$identityDir+'*')) { throw "Refusing to stop an unrecognized process on $port" }
      Stop-Process -Id $owned.ProcessId
    }
  }
  exit
}
if ($Action -eq 'mail') {
  & (Join-Path $identityDir 'mailpit/mailpit.exe') --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025 --database (Join-Path $identityDir 'mailpit.db') --disable-version-check
  exit
}
$env:JAVA_HOME=Join-Path $identityDir 'jdk-25.0.4.1+1'
$secrets=Get-Content -Raw -LiteralPath (Join-Path $identityDir 'secrets.json') | ConvertFrom-Json
$env:KC_BOOTSTRAP_ADMIN_USERNAME='local-admin'
$env:KC_BOOTSTRAP_ADMIN_PASSWORD=$secrets.admin
& (Join-Path $identityDir 'keycloak-26.7.4/bin/kc.bat') start-dev --http-host=127.0.0.1 --http-port=8085 --hostname=http://localhost:8085 --import-realm --spi-theme--static-max-age=-1 --spi-theme--cache-themes=false --spi-theme--cache-templates=false
