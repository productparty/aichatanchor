# Auto-increment version, update manifest, create tag, and push to trigger release

# Read current version from manifest.json
$manifest = Get-Content manifest.json | ConvertFrom-Json
$currentVersion = $manifest.version
Write-Host "Current version: $currentVersion"

# Parse version components
$versionParts = $currentVersion -split '\.'
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# Increment patch version by default (can be overridden with $env:RELEASE_TYPE)
if ($env:RELEASE_TYPE -eq "major") {
    $major++
    $minor = 0
    $patch = 0
} elseif ($env:RELEASE_TYPE -eq "minor") {
    $minor++
    $patch = 0
} else {
    $patch++
}

$newVersion = "$major.$minor.$patch"
Write-Host "New version: $newVersion"

# Update manifest.json
$manifest.version = $newVersion
$manifest | ConvertTo-Json -Depth 10 | Set-Content manifest.json
Write-Host "Updated manifest.json to version $newVersion"

# Commit the version change
git add manifest.json
git commit -m "Bump version to $newVersion" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit or already committed"
}

# Create and push tag
$tag = "v$newVersion"
git tag $tag
Write-Host "Created tag: $tag"

# Push commits and tag
git push origin HEAD
git push origin $tag

Write-Host "✅ Pushed tag $tag - GitHub Actions will create release automatically"
