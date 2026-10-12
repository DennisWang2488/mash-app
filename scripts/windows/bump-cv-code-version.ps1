[CmdletBinding()]
param([Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version)
. (Join-Path $PSScriptRoot 'common.ps1')
Push-Location $repoRoot
try {
    Assert-CleanWorktree
    Assert-NewTag "cv-code/$Version"
    $current = (Invoke-Native node @($releaseState, 'versions') | ConvertFrom-Json).code
    if ([version]$Version -le [version]$current) { throw 'CV code version must increase.' }
    Invoke-Native node @($releaseState, 'version', 'code', $Version)
    Invoke-Native git @('add', '--', 'versions.toml')
    Invoke-Native git @('commit', '-m', "chore(release): bump mash-cv code to $Version")
    Invoke-Native git @('tag', "cv-code/$Version")
} finally { Pop-Location }
