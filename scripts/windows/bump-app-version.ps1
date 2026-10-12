[CmdletBinding()]
param([Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version)
. (Join-Path $PSScriptRoot 'common.ps1')
Push-Location $repoRoot
try {
    Assert-CleanWorktree
    Assert-NewTag "v$Version"
    $current = (Invoke-Native node @($releaseState, 'versions') | ConvertFrom-Json).app
    if ([version]$Version -le [version]$current) { throw 'App version must increase.' }
    Invoke-Native node @($releaseState, 'version', 'app', $Version)
    Invoke-Native git @('add', '--', 'versions.toml', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock')
    Invoke-Native git @('commit', '-m', "chore(release): bump app to $Version")
    Invoke-Native git @('tag', "v$Version")
} finally { Pop-Location }
