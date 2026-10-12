[CmdletBinding()]
param([Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version, [string]$Python)
. (Join-Path $PSScriptRoot 'common.ps1')
Push-Location $repoRoot
$previousVersion = $env:MASH_CV_CODE_VERSION
try {
    Assert-CleanWorktree
    Assert-ReleaseEnvironment
    $env:MASH_CV_CODE_VERSION = $Version
    & (Join-Path $PSScriptRoot 'build-cv.ps1') -Mode code -Python $Python
    $artifact = "mash-cv-code-v$Version.zip"
    $file = Join-Path $repoRoot "sidecar/mash_cv/dist/$artifact"
    $sha = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
    $key = "$(Get-ReleasePrefix)/runtime/mash-cv/code/$artifact"
    Publish-Artifact $file $key
    $url = "$($env:RELEASE_BASE_URL.TrimEnd('/'))/$key"
    if ($env:GITHUB_OUTPUT) {
        @("code_version=$Version", "artifact=$artifact", "sha256=$sha", "object_key=$key", "url=$url") |
            Out-File -LiteralPath $env:GITHUB_OUTPUT -Encoding utf8 -Append
    }
    Write-Host "SHA-256: $sha"
} finally {
    $env:MASH_CV_CODE_VERSION = $previousVersion
    Pop-Location
}
