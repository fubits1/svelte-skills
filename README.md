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

> This project has been heavily inspired by [svelte-skills-kit](https://github.com/spences10/svelte-skills-kit).

## Plugins

Five plugins. Four with layered dependencies, one standalone:

```
agent  <--  frontend  <--  svelte-5  <--  svelte-5-migration
standalone: bonus (optional)
```

| Plugin | Skills/Hooks | What it does |
| --- | --- | --- |
| [agent](plugins/agent/) | 12 skills | Research, planning, self-checks, completion verification, git/dev-server/pnpm/socket/nogrep/obey discipline |
| [frontend](plugins/frontend/) | 11 skills | Validation, pixel-perfect, editing, code style, testing, migration |
| [svelte-5](plugins/svelte-5/) | 6 skills | Svelte code style, component docs, composition patterns, Storybook, Svelte testing |
| [svelte-5-migration](plugins/svelte-5-migration/) | 1 skill | Svelte 3/4 to 5 migration workflow |
| [bonus](plugins/bonus/) | 2 hooks | nogrep (force dedicated tools), formatter (auto-format after edits) |

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

**Superpowers plugin** (required by `agent`):

```
/plugin install superpowers
```

**Svelte MCP** (required by `svelte-5` and `svelte-5-migration`). Provides `svelte:svelte-code-writer`, `svelte:svelte-core-bestpractices`, and the Svelte autofixer (`mcp__svelte__svelte-autofixer`):

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
/plugin install agent
/plugin install frontend
/plugin install svelte-5
/plugin install svelte-5-migration
```

Optionally - `bonus` is standalone and optional — install it independently of the others:

```
/plugin install bonus
```

### 4. Set up your project

See [SETUP.md](SETUP.md) for copying template scripts, wiring `package.json` tasks, and installing dev dependencies.

## Updating

The whole marketplace ships as one version. After a new [release](https://github.com/fubits1/svelte-skills/releases), refresh and update:

```
/plugin marketplace update svelte-skills
/plugin update agent              # repeat per installed plugin
```

Or rely on Claude Code's auto-update.

## Skill behavior

Skills in this marketplace have auto-invocation triggers defined in their descriptions. Claude Code may invoke them automatically when it detects relevant context (e.g., editing a `.svelte` file, declaring a task done, starting a migration). You can also invoke any skill manually at any time via `/skill-name`. To disable auto-invocation for a specific skill, add `disable-model-invocation: true` to that skill's SKILL.md frontmatter.

## Context budget

> Research as of Opus 4.6 - might need revisiting.

Claude Code allocates 1% of context window (fallback: 8,000 chars) for skill descriptions. Each description is capped at 250 chars. With this marketplace (~29 skills) plus superpowers (~14) and Svelte MCP (~2), you'll have ~45 skill descriptions loaded.

- **Opus 4.6 (1M context)**: budget is ~40,000 chars. 45 skills fit comfortably.
- **Sonnet (200k context)**: budget is ~8,000 chars. Descriptions may get truncated, reducing auto-invocation accuracy.

Run `/context` to check for budget warnings. Override with `SLASH_COMMAND_TOOL_CHAR_BUDGET=<chars>`.

Source: [Claude Code skills docs](https://code.claude.com/docs/en/skills)

## Complementary resources

- For forward-looking Svelte 5 or SvelteKit specific skills, see [spences10/svelte-skills-kit](https://github.com/spences10/svelte-skills-kit).
- [mattpocock/skills](https://github.com/mattpocock/skills) — standalone skills including `grill-me` (get relentlessly interviewed about a plan or design — or use it to grill the agent about its own plan before it starts implementing).

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
| [Prettier](https://prettier.io/) | [prettier/prettier](https://github.com/prettier/prettier) |
| [markdownlint-cli](https://npmx.dev/package/markdownlint-cli) | [igorshubovych/markdownlint-cli](https://github.com/igorshubovych/markdownlint-cli) |
| [fff](https://fff.dmtrkovalenko.dev/) | [dmtrKovalenko/fff](https://github.com/dmtrKovalenko/fff) |
| [Socket CLI](https://socket.dev/features/cli) | [SocketDev/socket-cli](https://github.com/SocketDev/socket-cli) |

New - watchlist:

- [dex](https://dex.rip) - local flatfile task management (incl. skills) for agents

## Skill development / Ops

- use [agent:update-skills](plugins/agent/skills/update-skills/) to update skills from a local dir to this plugin dir.

## Releases

Browse release history at [Releases](https://github.com/fubits1/svelte-skills/releases). For the update commands, see [Updating](#updating) above. Maintainer release process: see [RELEASING.md](RELEASING.md).

## License

MIT
