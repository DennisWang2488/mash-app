[CmdletBinding()]
param([switch]$SkipBuild, [switch]$Unsigned)
. (Join-Path $PSScriptRoot 'common.ps1')
Push-Location $repoRoot
try {
    Assert-ReleaseEnvironment -Signing:(-not $Unsigned)
    $config = Assert-AppRelease
    $platform = Get-WindowsPlatform
    if (-not $SkipBuild) { & (Join-Path $PSScriptRoot 'build-windows.ps1') -Unsigned:$Unsigned }
    $bundle = Join-Path $repoRoot 'src-tauri/target/release/bundle'
    $artifactArguments = @('scripts/shared/updater-artifact.mjs', $bundle, 'src-tauri/tauri.conf.json', $platform)
    if ($Unsigned) { $artifactArguments += '--unsigned' }
    $file = Invoke-Native node $artifactArguments
    $name = Split-Path -Leaf $file
    $latestName = $name.Replace("_$($config.version)_", '_')
    if ($latestName -eq $name) { throw 'Cannot derive latest installer filename.' }
    $prefix = Get-ReleasePrefix
    $sha = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
    # Validate the immutable download before exposing the mutable latest link.
    Publish-Artifact $file "$prefix/downloads/versions/$name"
    Publish-Artifact $file "$prefix/downloads/latest/$latestName" 'no-cache'
    Write-Host "SHA-256: $sha"
} finally { Pop-Location }
