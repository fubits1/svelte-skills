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

The skill calls 13 companion skills from the other plugins. The companion skills table in [`SKILL.md`](skills/migration-svelte-5/SKILL.md) lists when to invoke each one.

## Dependencies

This plugin needs the Playwright MCP server for baseline screenshots and post-migration verification. Add it from your shell:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

This plugin also needs the plugins below, installed in this order. `superpowers` is required by `agent`. The `svelte` plugin from sveltejs/ai-tools provides the Svelte MCP server with the autofixer and docs lookup, the `svelte:svelte-code-writer` and `svelte:svelte-core-bestpractices` skills, and the `svelte:svelte-file-editor` subagent. See the [official Svelte AI tools docs](https://svelte.dev/docs/ai/overview). As of Claude Code v2.1.275, `/plugin install <name> --marketplace <source>` adds the marketplace if needed and opens the plugin's details, where you install it.

```
/plugin install superpowers@claude-plugins-official
/plugin install agent --marketplace fubits1/ronin-skills
/plugin install svelte --marketplace sveltejs/ai-tools
/plugin install frontend --marketplace fubits1/svelte-skills
/plugin install svelte-5 --marketplace fubits1/svelte-skills
```

## Install

Then install this plugin:

```
/plugin install svelte-5-migration --marketplace fubits1/svelte-skills
```

To install from your shell instead, run `claude plugin install svelte-5-migration --marketplace fubits1/svelte-skills`. For the full setup, see the [svelte-skills root README](https://github.com/fubits1/svelte-skills).

## License

MIT. The plugin icon is the [Svelte logo](https://github.com/sveltejs/branding), used under the Svelte branding guidelines. This plugin is not affiliated with or endorsed by the Svelte project.
