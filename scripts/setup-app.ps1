[CmdletBinding()]
param(
  [switch]$Check
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot

try {
  $nodeVersionText = (& node --version).TrimStart('v')
  $nodeVersion = [version]$nodeVersionText
  if ($nodeVersion.Major -ne 24 -or $nodeVersion -lt [version]'24.11.0') {
    throw "Node 24 LTS (>=24.11.0 and <25) is required; found $nodeVersionText."
  }

  $npmVersionText = (& npm --version).Trim()
  $npmVersion = [version]$npmVersionText
  if ($npmVersion.Major -ne 11) {
    throw "npm 11 is required; found $npmVersionText."
  }

  if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
    Write-Host 'Created .env from safe local example values.' -ForegroundColor Green
  }
  else {
    Write-Host 'Preserved existing .env.' -ForegroundColor DarkGray
  }

  npm ci
  if ($LASTEXITCODE -ne 0) {
    throw "npm ci failed with exit code $LASTEXITCODE."
  }

  if ($Check) {
    npm run check
    if ($LASTEXITCODE -ne 0) {
      throw "Application checks failed with exit code $LASTEXITCODE."
    }
  }

  Write-Host 'Application workspace setup complete. Run: npm run dev' -ForegroundColor Cyan
}
finally {
  Pop-Location
}
