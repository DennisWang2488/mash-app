[CmdletBinding()]
param(
    [ValidateSet('all', 'runtime', 'code')][string]$Mode = 'all',
    [string]$Python,
    [switch]$SkipInstall
)
. (Join-Path $PSScriptRoot 'common.ps1')
if ([Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'Run this script on Windows.' }
Push-Location (Join-Path $repoRoot 'sidecar/mash_cv')
try {
    $buildArguments = @('build_sidecar.py')
    if ($Mode -ne 'all') { $buildArguments += "--$Mode-only" }
    if ($Python) {
        Invoke-Native $Python $buildArguments
    } else {
        if (-not $SkipInstall) { Invoke-Native poetry @('install', '--no-root') }
        Invoke-Native poetry (@('run', 'python') + $buildArguments)
    }
} finally { Pop-Location }
