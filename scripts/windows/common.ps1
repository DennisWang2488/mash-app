$ErrorActionPreference = 'Stop'
# Use this PowerShell edition's modules even when launched by pnpm under pwsh 7.
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility') -ErrorAction Stop
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$releaseState = Join-Path $repoRoot 'scripts/shared/release-state.mjs'

function Invoke-Native {
    param([string]$Command, [string[]]$Arguments)
    $previousEncoding = [Console]::OutputEncoding
    try {
        # Node emits UTF-8 paths; PowerShell 5.1 otherwise decodes them as OEM text.
        [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
    } finally { [Console]::OutputEncoding = $previousEncoding }
}
function Assert-CleanWorktree {
    $status = Invoke-Native git @('status', '--porcelain')
    if ($status) { throw 'Worktree must be clean before publishing or bumping versions.' }
}
function Assert-NewTag([string]$Tag) {
    $existing = Invoke-Native git @('tag', '--list', $Tag)
    if ($existing) { throw "Tag already exists: $Tag" }
}
function Get-WindowsPlatform {
    if ([Environment]::OSVersion.Platform -ne 'Win32NT') { throw 'Run this script on Windows.' }
    $hostInfo = Invoke-Native rustc @('-vV')
    if ($hostInfo -match 'host: x86_64-pc-windows-msvc') { return 'windows-x86_64' }
    if ($hostInfo -match 'host: aarch64-pc-windows-msvc') { return 'windows-aarch64' }
    throw 'Unsupported native Windows Rust target; use an MSVC toolchain.'
}
function Assert-ReleaseEnvironment([switch]$Signing) {
    $names = @('R2_ENDPOINT', 'R2_BUCKET', 'RELEASE_BASE_URL')
    if ($Signing) { $names += 'TAURI_SIGNING_PRIVATE_KEY' }
    foreach ($name in $names) {
        if (-not [Environment]::GetEnvironmentVariable($name)) { throw "$name is required." }
    }
    Get-Command aws -ErrorAction Stop | Out-Null
}
function Get-ReleasePrefix {
    if ($env:R2_PREFIX) { return $env:R2_PREFIX.Trim('/') }
    return 'mash'
}
function Invoke-ReleaseAws {
    param([string[]]$Arguments)
    $awsArguments = $Arguments + @('--endpoint-url', $env:R2_ENDPOINT,
        '--cli-connect-timeout', '300', '--cli-read-timeout', '300')
    if ($env:AWS_PROFILE) { $awsArguments += @('--profile', $env:AWS_PROFILE) }
    Invoke-Native aws $awsArguments
}
function Publish-Artifact([string]$File, [string]$Key, [string]$Cache = 'public, max-age=31536000, immutable') {
    Invoke-ReleaseAws @('s3', 'cp', $File, "s3://$env:R2_BUCKET/$Key", '--cache-control', $Cache)
    Invoke-ReleaseAws @('s3api', 'head-object', '--bucket', $env:R2_BUCKET, '--key', $Key) | Out-Null
    $url = "$($env:RELEASE_BASE_URL.TrimEnd('/'))/$Key"
    Invoke-WebRequest -UseBasicParsing -Uri $url -Method Head | Out-Null
    Write-Host "Published: $url"
}
function Assert-AppRelease {
    Assert-CleanWorktree
    $config = Get-Content (Join-Path $repoRoot 'src-tauri/tauri.conf.json') -Raw -Encoding utf8 | ConvertFrom-Json
    $expected = "v$($config.version)"
    $tag = Invoke-Native git @('tag', '--points-at', 'HEAD', '--list', $expected)
    if (-not $tag -or $config.version -notmatch '^\d+\.\d+\.\d+$') { throw "HEAD must be tagged $expected." }
    return $config
}
