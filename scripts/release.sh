#!/usr/bin/env bash
set -euo pipefail

# Release the svelte-skills marketplace at the given version.
# Usage: ./scripts/release.sh 0.1.0

VERSION="${1:-}"

die() { printf 'release.sh: %s\n' "$*" >&2; exit 1; }

[[ -n "$VERSION" ]]                          || die "usage: $0 <semver>"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "version must match X.Y.Z, got: $VERSION"

cd "$(git rev-parse --show-toplevel)"

[[ -f .claude-plugin/marketplace.json ]] || die "marketplace.json not found; run from repo root"
command -v jq >/dev/null                 || die "jq is required"
command -v claude >/dev/null             || die "claude CLI is required"

TAG="v$VERSION"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" == "main" ]] || die "must be on main, currently on $BRANCH"

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "working tree dirty"
fi

git fetch --quiet origin main
LOCAL="$(git rev-parse @)"
REMOTE="$(git rev-parse '@{u}')"
[[ "$LOCAL" == "$REMOTE" ]] || die "local main differs from origin/main"

git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && die "tag $TAG already exists"

echo "release.sh: bumping marketplace.json to $VERSION"
tmp="$(mktemp .claude-plugin/marketplace.json.XXXXXX)"
trap 'git checkout -- .claude-plugin/marketplace.json 2>/dev/null; rm -f "$tmp"' ERR
jq --arg v "$VERSION" \
  '.version = $v | .plugins |= map(.version = $v)' \
  .claude-plugin/marketplace.json > "$tmp"
mv "$tmp" .claude-plugin/marketplace.json

echo "release.sh: validating plugins"
# Note: `claude plugin validate .` (v2.1.119) rejects $schema/description at
# the root of marketplace.json even though both are accepted by the loader.
# Validate each plugin individually until the marketplace schema catches up.
for d in plugins/*/; do
  claude plugin validate "$d" || die "validation failed for $d"
done

echo "release.sh: committing + tagging"
git add .claude-plugin/marketplace.json
git commit -m "chore(release): $TAG"
git tag -a "$TAG" -m "$TAG"

echo "release.sh: pushing"
git push --follow-tags origin main

echo "release.sh: $TAG pushed. Watch release.yml at:"
echo "  https://github.com/$(git config --get remote.origin.url | sed -E 's#.*[:/]([^/]+/[^/]+)\.git#\1#')/actions"
