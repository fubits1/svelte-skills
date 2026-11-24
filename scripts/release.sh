#!/usr/bin/env bash
set -euo pipefail

# Release the svelte-skills marketplace at the given version.
# Usage: ./scripts/release.sh [--dry-run] <semver>

DRY_RUN=0
VERSION=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) echo "usage: $0 [--dry-run] <semver>"; exit 0 ;;
    *)         VERSION="$arg" ;;
  esac
done

die() { printf 'release.sh: %s\n' "$*" >&2; exit 1; }

[[ -n "$VERSION" ]]                          || die "usage: $0 [--dry-run] <semver>"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "version must match X.Y.Z, got: $VERSION"

cd "$(git rev-parse --show-toplevel)"

[[ -f .claude-plugin/marketplace.json ]]   || die "marketplace.json not found; run from repo root"
[[ -f .github/workflows/release.yml ]]     || die ".github/workflows/release.yml missing"
command -v jq >/dev/null                   || die "jq is required"
command -v claude >/dev/null               || die "claude CLI is required"

TAG="v$VERSION"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" == "main" ]] || die "must be on main, currently on $BRANCH"

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "working tree dirty"
fi

git fetch --quiet origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
[[ "$LOCAL" == "$REMOTE" ]] || die "local main differs from origin/main"

git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && die "tag $TAG already exists"

echo "release.sh: bumping marketplace.json to $VERSION"
tmp="$(mktemp .claude-plugin/marketplace.json.XXXXXX)"
trap 'git checkout -- .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json 2>/dev/null; rm -f "$tmp"' ERR INT TERM EXIT
jq --arg v "$VERSION" \
  '.version = $v | .plugins |= map(.version = $v)' \
  .claude-plugin/marketplace.json > "$tmp"
mv "$tmp" .claude-plugin/marketplace.json

echo "release.sh: bumping each plugin.json to $VERSION"
for pj in plugins/*/.claude-plugin/plugin.json; do
  ptmp="$(mktemp "$(dirname "$pj")/plugin.json.XXXXXX")"
  jq --arg v "$VERSION" '.version = $v' "$pj" > "$ptmp"
  mv "$ptmp" "$pj"
done

echo "release.sh: validating marketplace + plugins"
# the full report (Provides, Hosts, directory notes) is informational on a pass;
# print it only on failure (--strict fails on warnings too)
validate() {
  local report
  report="$(claude plugin validate --strict "$1" 2>&1)" || { printf '%s\n' "$report" >&2; die "validation failed for $1"; }
  echo "release.sh: validated $1"
}
validate .
for d in plugins/*/; do
  validate "$d"
done

if [[ "$DRY_RUN" == "1" ]]; then
  echo "release.sh: --dry-run, reverting bump"
  git checkout -- .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json
  echo
  if command -v git-cliff >/dev/null; then
    echo "release.sh: release notes preview for $TAG"
    echo "---"
    git-cliff --unreleased --tag "$TAG" --strip header 2>/dev/null
    echo "---"
  else
    echo "release.sh: install git-cliff to preview release notes"
  fi
  echo "release.sh: would have tagged $TAG and pushed"
  exit 0
fi

echo "release.sh: committing + tagging"
git add .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json
# --allow-empty: handles the case where marketplace.json is already at the
# target version (e.g. initial release scaffolded at the same version). jq's
# rewrite produces no diff, so the chore commit would be empty — which is fine
# for tagging an already-correct state. Real bumps still produce a normal
# (non-empty) commit.
git commit --allow-empty -m "chore(release): $TAG"
git tag -a "$TAG" -m "$TAG"

echo "release.sh: pushing"
git push --follow-tags origin main

echo "release.sh: $TAG pushed. Watch release.yml at:"
echo "  https://github.com/$(git config --get remote.origin.url | sed -E 's#.*[:/]([^/]+/[^/]+)\.git#\1#')/actions"
