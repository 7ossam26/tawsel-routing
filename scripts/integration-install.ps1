param(
  [Parameter(Mandatory=$true)][string]$OperatorDirectory,
  [ValidateSet('prepare','apply')][string]$Mode='prepare'
)
$ErrorActionPreference='Stop'
$workspacePath=[IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$privatePath=[IO.Path]::GetFullPath($OperatorDirectory).TrimEnd('\')
if ($privatePath.Equals($workspacePath,[StringComparison]::OrdinalIgnoreCase) -or $privatePath.StartsWith($workspacePath+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Operator directory must be outside Git and build context' }
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
if (!(Test-Path -LiteralPath $privatePath)) {
  New-Item -ItemType Directory -Path $privatePath | Out-Null
  $privateAcl=New-Object Security.AccessControl.DirectorySecurity
  $privateAcl.SetAccessRuleProtection($true,$false)
  foreach ($sid in @($identity.User.Value,'S-1-5-18','S-1-5-32-544')) {
    $rule=New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($sid)),'FullControl','ContainerInherit,ObjectInherit','None','Allow')
    $privateAcl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $privatePath -AclObject $privateAcl
}
if ((Get-Item -LiteralPath $privatePath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Operator directory must not be a link' }
$allowedSids=@($identity.User.Value,'S-1-5-18','S-1-5-32-544')
foreach ($entry in Get-ChildItem -LiteralPath $privatePath -Force -Recurse) {
  if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Private configuration contains a link' }
}
foreach ($entryPath in @($privatePath)+(Get-ChildItem -LiteralPath $privatePath -Force -Recurse | ForEach-Object FullName)) {
  $entryAcl=Get-Acl -LiteralPath $entryPath
  foreach ($rule in $entryAcl.Access) {
    $ruleSid=$rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
    if ($rule.AccessControlType -eq 'Allow' -and $allowedSids -notcontains $ruleSid) { throw 'Operator path ACL grants access outside the operator, SYSTEM and local administrators' }
  }
}
& node (Join-Path $PSScriptRoot 'integration-install.mjs') $Mode $privatePath
if ($LASTEXITCODE -ne 0) { throw 'Installation is pending or rejected; inspect the protected journal. No secrets are printed.' }
