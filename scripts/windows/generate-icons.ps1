[CmdletBinding()]
param([string]$Source = 'icon.png')
. (Join-Path $PSScriptRoot 'common.ps1')
# Resolve the caller's image path before changing the working directory.
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
Push-Location $repoRoot
try { Invoke-Native pnpm @('tauri', 'icon', $sourcePath, '--output', 'src-tauri/icons') }
finally { Pop-Location }
