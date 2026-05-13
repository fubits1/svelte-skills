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
| `composition-svelte` | Composing Svelte 5 features by role -- Composition shape and Non-Svelte Host (Provider is a behaviour within Composition), snippet API, state location, third-party DOM bridging, overlay a11y |
| `doc-component` | `@component` JSDoc for Svelte components |
| `storybook` | Storybook workflow -- MCP tools, fixtures, CSS imports, wrapper pattern |
| `storybook-vitest` | Svelte CSF + addon-vitest -- `.stories.svelte` as Vitest browser tests |
| `testing-svelte` | Svelte 5 tests with vitest-browser-svelte and Playwright |

## Template scripts

Two flavours ship under `scripts/` -- pick one. Same `package.json` task name.

| Variant | File | `package.json` task |
| --- | --- | --- |
| Bash | `test-story.sh` | `"test:story": "bash scripts/test-story.sh"` |
| TypeScript + dax | `bin/test-story.ts` (calls `validate/test-story.ts`) | `"test:story": "node --experimental-strip-types scripts/bin/test-story.ts"` |

Both run vitest for a specific story file by pattern. The TS variant reads `VITEST_STORYBOOK_PROJECT` env var (default `storybook`) for the project name.

See [SETUP.md](../../SETUP.md) for full setup.

## Dependency chain

```
agent  <--  frontend  <--  svelte-5  <--  svelte-5-migration
```
