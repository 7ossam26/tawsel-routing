$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$identityDir=Join-Path $workspace '.local/identity'
$jdk=Join-Path $identityDir 'jdk-25.0.4.1+1/bin'
$keycloak=Join-Path $identityDir 'keycloak-26.7.4'
$classes=Join-Path $identityDir 'provider-classes'
New-Item -ItemType Directory -Force (Join-Path $classes 'META-INF/services') | Out-Null
$source=Join-Path $workspace 'identity/provider/src/com/tawsel/VerifiedEmailRecovery.java'
& (Join-Path $jdk 'javac.exe') --release 21 -encoding UTF-8 -cp (Join-Path $keycloak 'lib/lib/main/*') -d $classes $source
if($LASTEXITCODE -ne 0){throw 'Recovery provider compilation failed'}
Copy-Item -LiteralPath (Join-Path $workspace 'identity/provider/resources/META-INF/services/org.keycloak.authentication.AuthenticatorFactory') -Destination (Join-Path $classes 'META-INF/services')
New-Item -ItemType Directory -Force (Join-Path $keycloak 'providers') | Out-Null
& (Join-Path $jdk 'jar.exe') --create --file (Join-Path $keycloak 'providers/tawsel-recovery.jar') -C $classes .
if($LASTEXITCODE -ne 0){throw 'Recovery provider packaging failed'}
Write-Output 'Recovery-only email provider compiled against pinned Keycloak 26.7.4 libraries.'
