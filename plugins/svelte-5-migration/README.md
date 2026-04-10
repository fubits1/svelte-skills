# svelte-5-migration

The headline plugin of the [svelte-skills](https://github.com/fubits1/svelte-skills) marketplace. A structured, phased workflow for migrating Svelte 3/4 codebases to Svelte 5 runes.

## Skill

| Skill | Purpose |
| --- | --- |
| `migration-svelte-5` | Svelte 3/4 to Svelte 5 migration -- phased workflow, pattern conversions, interop rules, known traps |

## What it does

The skill drives migration through seven phases:

1. **Baseline capture** -- lint counts, Playwright screenshots, console errors, test results -- all recorded before any code is touched.
2. **Pre-migration audit** -- component tree, store analysis, third-party wrapper inventory.
3. **Migration order** -- leaf components first, `createEventDispatcher` handling, dependency-aware sequencing.
4. **Pattern conversion** -- `$:` to `$derived`/`$effect`, `export let` to `$props()`, slots to snippets, events to callbacks.
5. **Interop rules** -- Svelte 5 parent with Svelte 4 child, Svelte 4 parent with Svelte 5 child, and the constraints of each direction.
6. **Storybook stories** -- wrapper pattern for stores, `fn()` spies for callback props.
7. **Per-file checklist** -- lint, autofixer, tests, screenshots, console error check after every file.

A dedicated section covers known traps: third-party component wrappers, snippets passed to unmigrated Svelte 4 children, nested store reactivity, and noop callback defaults.

## Dependencies

This plugin depends on **all three** other plugins in the marketplace:

- `agent`
- `frontend`
- `svelte-5`

It also requires two MCP servers:

- **Svelte MCP** (`svelte/svelte`) -- for the autofixer and official docs lookup.
- **Playwright MCP** -- for baseline screenshots and post-migration verification.

The skill orchestrates all 13 companion skills from the other plugins. The companion skills table in [`SKILL.md`](skills/migration-svelte-5/SKILL.md) maps each skill to the point in the migration where it should be invoked.

## Installation

See the [svelte-skills root README](https://github.com/fubits1/svelte-skills) for installation instructions. Installing the full marketplace is recommended -- this plugin will not function without its three sibling plugins.
