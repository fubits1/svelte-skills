---
name: update-skills
description: Reconcile two Claude Code skill collections — backport from a source dir (typically ~/.claude/skills) into a public marketplace (typically a svelte-skills-style plugins/<plugin>/skills/ tree) with zero content loss and proprietary-reference scrubbing. Use when the upstream collection has diverged from the public one and needs syncing, or when promoting local-only skills into a marketplace.
user-invocable: true
---

# Update Skills

Reconcile two Claude Code skill collections — backport from a source dir (typically `~/.claude/skills/`) into a public marketplace (typically `plugins/<plugin>/skills/`) with zero content loss and proprietary-reference scrubbing.

## When to use

- A user's local global skills have diverged from a public plugin marketplace.
- A new local-only skill should be promoted to a marketplace plugin.
- A marketplace plugin needs its READMEs / skill counts updated after promotions.

## Inputs

- **Source dir** — usually `~/.claude/skills/<skill>/` (one dir per skill, may include `references/`, `scripts/`, sibling docs). Skip symlinked skills — they come from other repos and are out of scope.
- **Target marketplace** — usually `<repo>/plugins/<plugin>/skills/<skill>/`. Plugin split typically: `agent` (cross-cutting agent discipline), `frontend` (web/CSS/tests), `svelte-5` (Svelte components), `svelte-5-migration`, `bonus` (hooks + meta-skills).
- **Generalization patterns** — what to strip: project names, internal URLs, absolute home paths, dated personal incidents.

## Hard rules

- **Research before edit.** Read BOTH SKILL.md files fully on both sides — and every sibling file (`references/*`, `scripts/*`). Partial reads cause partial backports.
- **Ask before every Write.** Promotions and large backports go through user review — one skill at a time. Batched Writes feel aggressive when the user wants to evaluate each.
- **Reference style.** Use the marketplace's `plugin:skill` namespacing (e.g. `frontend:editing`, `agent:before-you-act`). NEVER bare `/skill` paths. NEVER `<root-prefix>:<plugin>:<skill>` doubled.
- **Strip dated personal incidents.** Replace `On 2026-04-08 ...` with anonymous `A common failure shape: ...` framing. Keep the lesson, drop the date.
- **Strip proprietary references.** Project names, internal repos, absolute home paths (`/Users/<name>/...`), internal dashboards / URLs (Grafana, Linear, private Slack). When in doubt: anonymize to a generic placeholder.
- **`bonus` is special.** It often holds the enforcement layer (hooks) for a skill that lives elsewhere (e.g. `bonus/hooks/nogrep.sh` paired with `agent:nogrep` skill). Check hooks before promoting a skill that overlaps.

## Workflow

### Phase 1 — Discovery

1. List source dir contents; skip symlinks.
2. List target marketplace skills (per plugin).
3. Classify each source skill as **overlapping** (exists in both) or **source-only** (candidate for promotion).
4. Whitelist dex permissions before starting (saves dozens of prompts):

   ```json
   "Bash(dex create:*)",
   "Bash(dex complete:*)",
   "Bash(dex list:*)",
   "Bash(dex show:*)",
   "Bash(dex edit:*)",
   "Bash(dex delete:*)"
   ```

5. Create a dex epic; one child task per skill. Each task records: source path, target path, preliminary verdict, generalization items, validation criteria.

### Phase 2 — Per-skill reconcile (overlapping)

For each overlapping skill, **read both files fully**, then assign one verdict:

| Verdict | Meaning | Action |
| --- | --- | --- |
| `EQUIVALENT` | Substantively identical | No-op; close dex task |
| `REPO_WINS` | Target has improvements source lacks (cleaner namespacing, broader file-type coverage, generalized already) | No backport |
| `BACKPORT` | Source has rules/examples/sections target lacks | Backport the missing content, generalized |
| `MERGE` | Both have unique value | Combine; document which came from which |

Sibling files (`references/*.md`, `scripts/*`) need the same diff. The SKILL.md may say EQUIVALENT while a reference file has divergent content.

**Description budget:** keep frontmatter `description` ≤ 250 chars where possible. Existing marketplace skills sometimes exceed this (`vitest`, `storybook-vitest`). Don't trim below source unless source is itself bloated.

### Phase 3 — Promotions (source-only)

For each source-only skill, **ask the user one at a time** before writing.

Per skill:

1. **Check for redundancy first.** Grep the marketplace for skills covering the same ground (e.g. a renamed `discipline` skill in `bonus` may already cover a local `communication` skill — verify line-by-line, don't just claim "redundant"). If redundant, SKIP with a clear justification.
2. **Pick the plugin.** Match the skill's domain — cross-cutting → `agent`, Svelte-specific → `svelte-5`, etc. Cross-reference with hooks (skill paired with an enforcement hook in `bonus` should usually live in `agent` and reference the hook).
3. **Generalize content.** Strip dated incidents, project names, absolute paths. Replace bare `/skill` references with `plugin:skill`.
4. **Ask before write.** Present the *proposed* content (or just the generalization diff if it's small) and wait for approval.
5. **Frontmatter name field** must match the directory name. If source has `name: skills` but the dir is `skills-reference`, fix it on write.

### Phase 4 — README updates

After promotions:

- **Plugin README** (`plugins/<plugin>/README.md`): update the skill count in the intro, append new rows to the skills table.
- **Root README** (`README.md`): update the plugin table's skill-count column; update the context-budget calculation (each new skill adds ~250 chars; bump the "~N skills" number).

### Phase 5 — Validation

- **Proprietary-string scan** across all changed files. Multi-grep patterns (adjust to the user's environment):

  ```text
  mineralminds | zedela | <project-names> | /Users/<name> | grafana.internal | <internal-tools>
  ```

  Must return 0 matches.

- **Cross-reference check.** Any `agent:<skill>` / `frontend:<skill>` / `svelte-5:<skill>` references must point to skills that actually exist after the changes. Common breakage: a backported "see X" line pointing to a skill that was SKIPPED rather than ADDED.

- **Description char count.** Spot-check that no description is wildly over budget. Soft cap 250.

- **Markdown lint.** Pre-existing warnings (MD041 first-line-h1, MD060 table-column-style) are fine — don't try to fix repo-wide style issues that predate the work. Only fix warnings introduced by the current edits.

## What NOT to do

- Don't print proposed file contents in chat when the user said write — chat dumps are zero-value, just edit the file.
- Don't claim "fully redundant" / "matches verbatim" without an actual line-by-line comparison.
- Don't batch many Write calls when the user wants per-skill review.
- Don't add features, helpers, or new conventions outside what the source had. Generalization removes specificity; it doesn't invent abstractions.
- Don't keep dated personal incidents in the public version even if the lesson is good. Anonymize the example, keep the rule.
- Don't downgrade the marketplace's existing namespacing to bare `/skill` paths, even if source uses bare paths.

## Triggers

- User says "update skills", "sync skills", "backport skills".
- Marketplace + local skill collection has diverged.
- New skill in local that's worth publishing.
- After upstream marketplace change — pull improvements down to local with the same workflow but reversed direction.
