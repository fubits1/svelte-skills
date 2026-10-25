# svelte-5

Claude Code plugin for Svelte-specific development workflows. Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) marketplace.

## Dependencies

Install these first. As of Claude Code v2.1.275, `/plugin install <name> --marketplace <source>` adds the marketplace if needed and opens the plugin's details, where you install it.

- **`superpowers` plugin**: the `agent` plugin requires it.

  ```
  /plugin install superpowers@claude-plugins-official
  ```

- **`agent` plugin from [fubits1/ronin-skills](https://github.com/fubits1/ronin-skills)**: skills in this plugin reference `agent:done`, `agent:before-you-act`, and others.

  ```
  /plugin install agent --marketplace fubits1/ronin-skills
  ```

- **`svelte` plugin from sveltejs/ai-tools**: it provides the autofixer, docs lookup, the `svelte:svelte-code-writer` and `svelte:svelte-core-bestpractices` skills, and the `svelte:svelte-file-editor` subagent. See the [official Svelte AI tools docs](https://svelte.dev/docs/ai/overview).

  ```
  /plugin install svelte --marketplace sveltejs/ai-tools
  ```

- **`frontend` plugin**: skills in this plugin reference `frontend:validate`, `frontend:code-style`, and others. `frontend` needs the Playwright MCP server. Add it from your shell, then install `frontend`:

  ```bash
  claude mcp add playwright -- npx @playwright/mcp@latest
  ```

  ```
  /plugin install frontend --marketplace fubits1/svelte-skills
  ```

- **Storybook MCP** (optional): `svelte-5:storybook` uses it when configured. See the [root README](https://github.com/fubits1/svelte-skills#1-install-prerequisites) for setup.

## Install

Then install this plugin:

```
/plugin install svelte-5 --marketplace fubits1/svelte-skills
```

To install from your shell instead, run `claude plugin install svelte-5 --marketplace fubits1/svelte-skills`. For the full setup, see the [root README](https://github.com/fubits1/svelte-skills#readme).

## Skills

| Skill | Purpose |
| --- | --- |
| `code-style-svelte` | Svelte component style: docs, reactivity, Svelte 5 syntax, interop rules |
| `composition-svelte` | Composing Svelte 5 features by role: Composition shape and Non-Svelte Host (Provider is a behaviour within Composition), snippet API, state location, third-party DOM bridging, overlay a11y |
| `doc-component` | `@component` JSDoc for Svelte components |
| `msw` | Mock Service Worker (msw 3) in Storybook, Vitest browser tests and SvelteKit: handler sets, unmocked-request guard, msw 2 to 3 migration |
| `storybook` | Storybook workflow: MCP tools, CSS imports, wrapper pattern |
| `storybook-vitest` | Svelte CSF + addon-vitest: `.stories.svelte` as Vitest browser tests |
| `testing-svelte` | Svelte 5 tests with vitest-browser-svelte and Playwright |
| `vitest` | Vitest config (projects, browser mode, flake hygiene) |

## Template scripts

TypeScript + dax script under `scripts/`. Runs the project's Vitest (Vitest 5 needs Node 22.12+, 24 or 26+) for a specific story file by pattern. Reads `VITEST_STORYBOOK_PROJECT` env var (default `storybook`) for the project name.

> **Migration note (0.5.0):** the bash variant (`test-story.sh`) was removed. Swap `"test:story": "bash scripts/test-story.sh"` for the TS line below and copy `bin/test-story.ts` + `validate/test-story.ts` into your project's `scripts/`.

| File | `package.json` task |
| --- | --- |
| `bin/test-story.ts` (calls `validate/test-story.ts`) | `"test:story": "node --experimental-strip-types scripts/bin/test-story.ts"` |

See [SETUP.md](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md) for full setup.

## License

MIT. The plugin icon is the [Svelte logo](https://github.com/sveltejs/branding), used under the Svelte branding guidelines. This plugin is not affiliated with or endorsed by the Svelte project.
