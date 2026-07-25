# svelte-skills

Claude Code plugin marketplace for Svelte developers. Disciplined, opinionated workflows for frontend development, Svelte components, and Svelte 4 to Svelte 5 migration.

> This repo is a subset of a wider skills collection. It is focused on providing the minimum viable skill set for migrating Svelte 4 to Svelte 5 codebases.  
>
> It is biased towards:
>
> - pnpm
> - TypeScript 6/7
> - Prettier, Stylelint, Knip
> - a hybrid Oxlint + ESLint setup
> - Vitest (incl llms.txt) / Storybook (incl. MCP) / Playwright (incl. MCP)
> - fff instead of grep/bash etc.
>
> This project has been heavily inspired by [svelte-skills-kit](https://github.com/spences10/svelte-skills-kit).

## Plugins

Three plugins, layered:

```
frontend  <--  svelte-5  <--  svelte-5-migration
```

`frontend` soft-depends on [`agent@ronin-skills`](https://github.com/fubits1/ronin-skills) (separate repo / marketplace — see [Migration from 0.3.x](#migration-from-03x) below).

| Plugin | Skills/Hooks | What it does |
| --- | --- | --- |
| [frontend](plugins/frontend/) | 13 skills | Validation, pixel-perfect, editing, code style, testing, migration, JS/CSS config |
| [svelte-5](plugins/svelte-5/) | 7 skills | Svelte code style, component docs, composition patterns, Storybook, Svelte testing, MSW API mocking |
| [svelte-5-migration](plugins/svelte-5-migration/) | 1 skill | Svelte 3/4 to 5 migration workflow |

## Migration from 0.3.x

In 0.4.0 the `agent` and `bonus` plugins moved out of this marketplace into [fubits1/ronin-skills](https://github.com/fubits1/ronin-skills). Plugin name stays `agent` so existing `agent:research`, `agent:done`, `agent:before-you-act`, etc. cross-references in `frontend:*` and `svelte-5:*` skills continue to resolve — but only if `agent@ronin-skills` is installed. The `frontend`, `svelte-5`, and `svelte-5-migration` plugins all require `agent@ronin-skills` as of 0.4.0. Migration:

```
/plugin marketplace add fubits1/ronin-skills
/plugin install agent@ronin-skills
/plugin uninstall agent@svelte-skills
/plugin uninstall bonus@svelte-skills
/plugin marketplace update svelte-skills
/plugin update frontend@svelte-skills svelte-5@svelte-skills svelte-5-migration@svelte-skills
```

## Installation

### 1. Add the marketplace

```
/plugin marketplace add fubits1/svelte-skills
```

For local development/testing:

```
/plugin marketplace add /path/to/svelte-skills
```

### 2. Install prerequisites

**Superpowers plugin** (required by `agent@ronin-skills`):

```
/plugin install superpowers
```

**ronin-skills marketplace** (required by `frontend` — provides the `agent` plugin):

```
/plugin marketplace add fubits1/ronin-skills
/plugin install agent@ronin-skills
```

**Svelte MCP** (required by `svelte-5` and `svelte-5-migration`). Provides the Svelte autofixer, docs lookup, the `svelte:svelte-code-writer` / `svelte:svelte-core-bestpractices` skills, and the `svelte:svelte-file-editor` subagent. See the [official Svelte AI tools docs](https://svelte.dev/docs/ai/overview):

```
/plugin marketplace add sveltejs/ai-tools
/plugin install svelte
```

Or directly via CLI:

```bash
claude mcp add -t stdio -s project svelte -- npx -y @sveltejs/mcp
```

**Playwright MCP** (required by `frontend`). Provides browser screenshots, navigation, and `browser_evaluate` for measurements:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

See [Playwright MCP docs](https://playwright.dev/docs/getting-started-mcp) for options (headless, scope, etc.).

**Storybook MCP** (optional, used by `svelte-5:storybook`). Provides story instructions and preview tools:

```bash
pnpm add -D @storybook/addon-mcp
```

Then add `@storybook/addon-mcp` to your `.storybook/main.ts` addons. The MCP server runs at `http://localhost:6006/mcp` when Storybook is running. See [@storybook/addon-mcp](https://storybook.js.org/addons/@storybook/addon-mcp).

### 3. Install the plugins (in order)

```
/plugin install frontend
/plugin install svelte-5
/plugin install svelte-5-migration
```

(`agent@ronin-skills` was installed in step 2 above.)

### 4. Set up your project

See [SETUP.md](SETUP.md) for copying template scripts, wiring `package.json` tasks, and installing dev dependencies.

## Updating

The whole marketplace ships as one version. After a new [release](https://github.com/fubits1/svelte-skills/releases), refresh and update:

```
/plugin marketplace update svelte-skills
/plugin update frontend           # repeat per installed plugin
```

Or rely on Claude Code's auto-update.

## Skill behavior

Skills in this marketplace have auto-invocation triggers defined in their descriptions. Claude Code may invoke them automatically when it detects relevant context (e.g., editing a `.svelte` file, declaring a task done, starting a migration). You can also invoke any skill manually at any time via `/skill-name`. To disable auto-invocation for a specific skill, add `disable-model-invocation: true` to that skill's SKILL.md frontmatter.

## Using these skills in OpenCode

See [Using these skills in OpenCode](https://github.com/fubits1/ronin-skills#using-these-skills-in-opencode) in ronin-skills.

## Context budget

> Research as of Opus 4.6 - might need revisiting.

Claude Code allocates 1% of context window (fallback: 8,000 chars) for skill descriptions. Each description is capped at 250 chars. With this marketplace (~21 skills) plus `agent@ronin-skills` (~15), superpowers (~14), and Svelte MCP (~2), you'll have ~52 skill descriptions loaded.

- **Opus 4.6 (1M context)**: budget is ~40,000 chars. 52 skills fit comfortably.
- **Sonnet (200k context)**: budget is ~8,000 chars. Descriptions may get truncated, reducing auto-invocation accuracy.

Run `/context` to check for budget warnings. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET=<chars>`.

Source: [Claude Code skills docs](https://code.claude.com/docs/en/skills)

## Complementary resources

- For forward-looking Svelte 5 or SvelteKit specific skills, see [spences10/skills](https://github.com/spences10/skills).
- [mattpocock/skills](https://github.com/mattpocock/skills) — standalone skills including `grill-me` (get relentlessly interviewed about a plan or design — or use it to grill the agent about its own plan before it starts implementing).
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) — ultra-compressed communication mode (caveman-style speech, fragments, no fluff). Claims to cut token usage ~75% while preserving full technical accuracy. Install as a separate marketplace:

  ```
  /plugin marketplace add JuliusBrussee/caveman
  /plugin install caveman
  ```

## Recommended tooling

These tools are referenced by the skills. Not all are required -- install what your project uses.

| Tool | Repository |
| --- | --- |
| [ESLint](https://eslint.org/) | [eslint/eslint](https://github.com/eslint/eslint) |
| [oxlint](https://oxc.rs/) | [oxc-project/oxc](https://github.com/oxc-project/oxc) |
| [TypeScript](https://npmx.dev/package/typescript) 6.0 | `pnpm add -D typescript` |
| [tsgo](https://npmx.dev/package/@typescript/native-preview) 7.0 preview | `pnpm add -D @typescript/native-preview` |
| [svelte-check](https://svelte.dev/docs/cli/sv-check) | [sveltejs/language-tools](https://github.com/sveltejs/language-tools) |
| [Knip](https://knip.dev/) | [webpro-nl/knip](https://github.com/webpro-nl/knip) |
| [Vitest](https://vitest.dev/) | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |
| [vitest-browser-svelte](https://vitest.dev/api/browser/svelte) | [vitest-community/vitest-browser-svelte](https://github.com/vitest-community/vitest-browser-svelte) |
| [Playwright](https://playwright.dev/) | [microsoft/playwright](https://github.com/microsoft/playwright) |
| [Storybook addon-vitest](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) | [storybookjs/storybook](https://github.com/storybookjs/storybook) (`code/addons/vitest/`) |
| [Storybook addon-svelte-csf](https://storybook.js.org/addons/@storybook/addon-svelte-csf) | [storybookjs/addon-svelte-csf](https://github.com/storybookjs/addon-svelte-csf) |
| [MSW](https://mswjs.io/) | [mswjs/msw](https://github.com/mswjs/msw) |
| [msw-storybook-addon](https://storybook.js.org/addons/msw-storybook-addon) | [mswjs/msw-storybook-addon](https://github.com/mswjs/msw-storybook-addon) |
| [Prettier](https://prettier.io/) | [prettier/prettier](https://github.com/prettier/prettier) |
| [markdownlint-cli](https://npmx.dev/package/markdownlint-cli) | [igorshubovych/markdownlint-cli](https://github.com/igorshubovych/markdownlint-cli) |
| [fff](https://fff.dmtrkovalenko.dev/) | [dmtrKovalenko/fff](https://github.com/dmtrKovalenko/fff) |
| [Socket CLI](https://socket.dev/features/cli) | [SocketDev/socket-cli](https://github.com/SocketDev/socket-cli) |

New - watchlist:

- [dex](https://dex.rip) - local flatfile task management (incl. skills) for agents

## Skill development / Ops

- use `agent:update-skills` (from [fubits1/ronin-skills](https://github.com/fubits1/ronin-skills)) to update skills from a local dir to this plugin dir.

## Releases

Browse release history at [Releases](https://github.com/fubits1/svelte-skills/releases). For the update commands, see [Updating](#updating) above. Maintainer release process: see [RELEASING.md](RELEASING.md).

## License

MIT
