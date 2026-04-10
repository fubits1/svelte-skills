# svelte-5

Claude Code plugin for Svelte-specific development workflows. Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) marketplace.

## Dependencies

- **`frontend` plugin** -- skills reference `frontend:validate`, `frontend:playwright`, and others. Install it first.
- **Svelte MCP plugin** (`svelte/svelte`) -- required for autofixer and docs lookup.

For installation and setup, see the [root README](https://github.com/fubits1/svelte-skills#readme).

## Skills

| Skill | Purpose |
| --- | --- |
| `code-style-svelte` | Svelte component style -- docs, reactivity, Svelte 5 syntax, interop rules |
| `doc-component` | `@component` JSDoc for Svelte components |
| `storybook` | Storybook workflow -- MCP tools, fixtures, CSS imports, wrapper pattern |
| `storybook-vitest` | Svelte CSF + addon-vitest -- `.stories.svelte` as Vitest browser tests |
| `testing-svelte` | Svelte 5 tests with vitest-browser-svelte and Playwright |

## Template script

| Script | `package.json` task | Purpose |
| --- | --- | --- |
| `test-story.sh` | `pnpm test:story` | Run vitest for a specific story file by pattern |

Copy to your project's `scripts/` directory and add to `package.json`:

```json
{
  "scripts": {
    "test:story": "bash scripts/test-story.sh"
  }
}
```

See [SETUP.md](../../SETUP.md) for full setup.

## Dependency chain

```
agent  <--  frontend  <--  svelte-5  <--  svelte-5-migration
```
