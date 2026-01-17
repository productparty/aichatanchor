#!/bin/bash
# Auto-increment version, update manifest, create tag, and push to trigger release

set -e

# Read current version from manifest.json
CURRENT_VERSION=$(node -p "require('../manifest.json').version")
echo "Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Increment patch version by default (can be overridden with MAJOR or MINOR env var)
if [ "$RELEASE_TYPE" = "major" ]; then
  MAJOR=$((MAJOR + 1))
  MINOR=0
  PATCH=0
elif [ "$RELEASE_TYPE" = "minor" ]; then
  MINOR=$((MINOR + 1))
  PATCH=0
else
  PATCH=$((PATCH + 1))
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW_VERSION"

# Update manifest.json
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
manifest.version = '$NEW_VERSION';
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
"

echo "Updated manifest.json to version $NEW_VERSION"

# Commit the version change
git add manifest.json
git commit -m "Bump version to $NEW_VERSION" || echo "No changes to commit or already committed"

# Create and push tag
TAG="v$NEW_VERSION"
git tag "$TAG"
echo "Created tag: $TAG"

# Push commits and tag
git push origin HEAD
git push origin "$TAG"

echo "✅ Pushed tag $TAG - GitHub Actions will create release automatically"
