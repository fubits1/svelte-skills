---
name: migration
description: Use when upgrading a framework version, migrating APIs, bumping major dependencies, or any task where "before" and "after" states must be compared. Auto-invoke when user mentions migration, upgrade, breaking changes, or version bumps.
user-invocable: true
---

# Migration

Framework upgrades, major dep bumps, config migrations. The core challenge is proving zero regressions — which requires baselines captured on the TRUE pre-change state.

## Rule Zero: Check Working Tree FIRST

Before planning, researching, or writing anything:

```bash
git status
git diff package.json
```

**If `package.json` is already modified** — deps may already be upgraded. Baselines taken now reflect post-upgrade state and are WORTHLESS for comparison. You must restore old deps before capturing baselines (see Phase 3a).

**If `package.json` is clean** — capture all baselines before touching it.

This is non-negotiable. Baselines on upgraded deps cannot prove zero regressions. Ask yourself: "What state was the code in BEFORE any migration work started?" That is the state you baseline against.

## Phase 1: Research

**REQUIRED:** Use `agent:research` skill. All four channels — local investigation, docs/MCPs, online research, verify and synthesize.

For each breaking change found in the migration guide, grep the codebase to check if it applies. Don't assume — verify.

**Output:** A list of concrete changes needed, with file paths and line numbers.

## Phase 2: Ask Before Assuming

Do NOT assume version numbers (.nvmrc, TypeScript, etc.), which config blocks to keep or remove, or whether a deprecated pattern should be cleaned up. ASK.

## Phase 3: Baseline Capture

### 3a: Restore Pre-Upgrade State (if deps already changed)

```bash
git stash
pnpm install
# verify project builds with OLD deps
```

### 3b: Capture Baselines

1. **Build output** — full log, page count
2. **Sitemap** — copy XML files, extract every `<loc>` URL to flat list
3. **Screenshot every route** — Playwright MCP, every sitemap URL, assert no console errors
4. **Measure page sections** — per `frontend:pixel-perfect`: `getBoundingClientRect()` on every visible section, save as JSON
5. **Run existing tests** — save output, record pass/fail counts

### 3c: Restore Upgraded State

```bash
git stash pop
pnpm install
```

## Phase 4: Write Regression Tests BEFORE Code Changes

Existing tests probably don't cover all routes. Write new tests that:

1. **Route coverage** — read sitemap dynamically, navigate every URL, assert each loads with content
2. **Section coverage** — assert each page section exists and is visible
3. **i18n coverage** — test both language variants

Run new tests — they must pass on current state BEFORE any migration edits.

## Phase 5: Make Changes

Per `frontend:validate`: edit ONE file, validate (build + lint + type-check), confirm 0 new errors, then next file. Never batch edits without validating between them.

## Phase 6: Post-Migration Verification

Per `agent:done`:

1. **Build** — page count must match baseline
2. **Sitemap diff** — must be identical to baseline URLs
3. **Run ALL tests** — old + new regression tests
4. **Screenshot every route** — compare to baseline
5. **Measure sections** — per `frontend:pixel-perfect`, report diff table, 0px diff required
6. **Full validation** — lint, type-check, svelte-check, exit 0
7. **Report with proof** — exit codes, page counts, sitemap diff, test results, measurement table

## Referenced Skills

Not optional during migration:

- `agent:research` — Phase 1
- `frontend:pixel-perfect` — Phase 3b and 6 measurements
- `frontend:validate` — Phase 5 per-file validation
- `agent:done` — Phase 6 completion checklist
- `frontend:playwright` — all browser verification

## Anti-Patterns

These are real failures from an actual migration attempt:

| Failure                                        | Why It's Wrong                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Taking "before" baselines after deps upgraded  | Baselines reflect post-upgrade state — comparison is meaningless      |
| Assuming version numbers instead of asking     | User wanted Node 24, not 22. ASK.                                     |
| "Run build and check browser" as verification  | Proves nothing about regressions without baselines to compare against |
| Not using sitemap as route source of truth     | Guessing at routes misses pages                                       |
| Not writing new tests before migration         | If existing tests don't cover all routes, regressions slip through    |
| Batch-editing files without validating between | Impossible to tell which change broke what                            |
| Skipping section measurements                  | Screenshots alone prove nothing per pixel-perfect                     |
| Not checking `git status` first                | Led to worthless baselines                                            |

## Reference: Example Plan (Astro 5 → 6)

```markdown
# Astro 6 Migration Plan

**Current state (from `git diff package.json`):**

- package.json is MODIFIED but NOT committed
- Old (committed): Astro 5.17.3, TS 5.9.3, Svelte 5.53, vite-plugin-svelte 6.2.4
- New (working tree): Astro 6.1.2, TS 6.0.2, Svelte 5.55.1, vite-plugin-svelte 7.0.0
- pnpm-lock.yaml also modified

**Implication:** Baselines MUST be captured after git stash restores old deps.

### Task 0: Restore old deps for baseline capture

- [ ] git stash (save upgraded package.json + lockfile)
- [ ] pnpm install (restore old lockfile)
- [ ] pnpm astro build — verify project builds with old deps

### Task 1: Capture baselines on OLD deps

- [ ] Build: save full log, record exact page count
- [ ] Sitemap: copy all XML files, extract every <loc> URL to flat list
- [ ] Screenshots: every sitemap URL via Playwright, assert no console errors
- [ ] Sections: measure every visible section via getBoundingClientRect(), save JSON
- [ ] Tests: run existing tests, save output, record pass/fail counts

### Task 2: Restore upgraded deps

- [ ] git stash pop
- [ ] pnpm install
- [ ] pnpm astro build (verify still works)

### Task 3: Write regression tests BEFORE code changes

- [ ] tests/routes.spec.ts — sitemap-driven, every URL, assert loads with content
- [ ] tests/sections.spec.ts — homepage sections + detail pages (DE+EN)
- [ ] Run all tests — must pass before any migration edits

### Task 4-7: Code changes (one file, validate after each)

- .nvmrc: update version (ASK which — don't assume)
- content.config.ts: z import from astro:content → astro/zod
- content.config.ts: deprecated Zod validators → Zod 4 equivalents
- astro.config.mjs: remove stale config blocks (ASK which — don't assume)

### Task 8: Post-migration verification

- [ ] Build: page count matches baseline exactly
- [ ] Sitemap diff: identical to baseline URL list
- [ ] All tests pass (old + new)
- [ ] Screenshot every route, compare to baseline
- [ ] Measure sections, compare to baseline (0px diff required)
- [ ] Full validation (lint, type-check, svelte-check) exits 0
- [ ] Report with proof: exit codes, page counts, sitemap diff, test results, measurement table
```
