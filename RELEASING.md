# Releasing

The whole marketplace ships as **one version**. All 5 plugins bump together. One tag per release. One GitHub Release per release.

## Quick start

From a clean `main` that's up to date with `origin`:

```bash
./scripts/release.sh 0.1.0
```

That's it. The script:

1. Checks preconditions (on `main`, clean tree, in sync with origin, tag doesn't exist, version matches `X.Y.Z`).
2. Bumps `marketplace.json` top-level `version` and every `plugins[].version` to the given value.
3. Runs `claude plugin validate` against each `plugins/*/` locally. (Marketplace-level validation is skipped — the validator in Claude Code 2.1.119 rejects `$schema` and `description` at the marketplace root even though both are accepted by the loader.)
4. Commits `chore(release): v$VERSION`.
5. Tags `v$VERSION`.
6. Pushes with `git push --follow-tags origin main`.

`release.yml` then publishes the GitHub Release with auto-generated notes.

## Versioning

Semver, pre-1.0. Same number applies to every plugin.

- `0.MINOR.x` — breaking change in any plugin's skill rule, hook contract, or required dependency.
- `0.x.PATCH` — additive or non-breaking change anywhere.
- Promote to `1.0.0` when the marketplace as a whole is considered stable.

## Commit convention

Conventional Commits with plugin scope so `gh release create --generate-notes` produces grouped, scoped notes.

```
feat(agent): new self-check skill
fix(frontend): vitest assertion table
chore(release): v0.1.0
docs: clarify install order
```

## Hotfix

Fix-forward on `main`:

```bash
# commit the fix on main
git commit -am "fix(agent): X"
git push origin main
./scripts/release.sh 0.1.1
```

No release branches.

## Manual fallback

If `release.sh` can't run (e.g. Windows without bash):

```bash
# 1. edit .claude-plugin/marketplace.json — bump top-level + all 5 plugins[].version
# 2. validate each plugin (stop on first failure)
for d in plugins/*/; do claude plugin validate "$d" || exit 1; done
# 3. commit + tag + push
git commit -am "chore(release): v0.1.0"
git tag v0.1.0
git push --follow-tags origin main
```

## Rollback

A bad release stays in users' caches for ~7 days per Claude Code's orphan policy. Fix forward: ship the next patch.

To remove an erroneous Release before any user has pulled it:

```bash
gh release delete v0.1.0 --yes --cleanup-tag   # deletes the Release AND the tag
git revert <release-commit-sha>                 # then re-release with a new patch
```
