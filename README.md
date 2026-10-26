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

For Svelte work, `frontend:code-style` also needs `svelte-5` (`svelte-5:code-style-svelte`).

| Plugin | Skills/Hooks | What it does |
| --- | --- | --- |
| [frontend](plugins/frontend/) | 13 skills | Validation, pixel-perfect, editing, comments, code style, testing, migration, JS/CSS config |
| [svelte-5](plugins/svelte-5/) | 8 skills | Svelte code style, component docs, composition patterns, Storybook, Vitest config, Svelte testing, `msw` API mocking |
| [svelte-5-migration](plugins/svelte-5-migration/) | 1 skill | Svelte 3/4 to 5 migration workflow |

## Installation

As of Claude Code v2.1.275, `/plugin install <name> --marketplace <source>` adds the marketplace if needed and opens the plugin's details, where you install it.

### 1. Install prerequisites

**`superpowers` plugin** (required by the `agent` plugin):

```
/plugin install superpowers@claude-plugins-official
```

**`agent` plugin from ronin-skills** (required by all three plugins):

```
/plugin install agent --marketplace fubits1/ronin-skills
```

**`svelte` plugin from sveltejs/ai-tools** (required by `svelte-5` and `svelte-5-migration`, and by `frontend` for `.svelte` files). It provides the Svelte MCP server with the autofixer and docs lookup, the `svelte:svelte-code-writer` and `svelte:svelte-core-bestpractices` skills, and the `svelte:svelte-file-editor` subagent. See the [official Svelte AI tools docs](https://svelte.dev/docs/ai/overview).

```
/plugin install svelte --marketplace sveltejs/ai-tools
```

**`deslop` skill from [stephenturner/skill-deslop](https://github.com/stephenturner/skill-deslop)** (required by `frontend:comments`). It is not a plugin; clone it into your skills directory:

```bash
git clone https://github.com/stephenturner/skill-deslop.git ~/.claude/skills/deslop
```

**Playwright MCP** (required by `frontend`). It provides browser screenshots, navigation, and `browser_evaluate` for measurements. Add it from your shell:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

See [Playwright MCP docs](https://playwright.dev/docs/getting-started-mcp) for options (headless, scope, etc.).

**Storybook MCP** (optional, used by `svelte-5:storybook`). It provides story instructions and preview tools:

1. If `pnpm ls storybook` lists no `storybook`, set Storybook up first ([SETUP.md](SETUP.md), "For Storybook testing"), then come back here
2. Compare the installed versions with the latest addon-mcp release's peer ranges:

   ```bash
   pnpm ls storybook @storybook/addon-vitest    # the installed versions
   pnpm view @storybook/addon-mcp peerDependencies    # the latest release's peer ranges
   ```

3. If the printed `storybook` range includes your installed `storybook`, and the optional `@storybook/addon-vitest` range includes your installed addon-vitest (when installed), run `pnpm add -D @storybook/addon-mcp` and add `@storybook/addon-mcp` to your `.storybook/main.ts` addons. Otherwise, picking a matching addon-mcp release is not covered here

The MCP server runs at `/mcp` by default (addon option `endpoint`) on the running Storybook's URL (`http://127.0.0.1:6006/mcp` with the `storybook dev -p 6006` script that `sv add storybook` leaves in `package.json`). Registering the server with Claude Code is not covered here: see the [Storybook MCP docs](https://storybook.js.org/docs/ai/mcp/overview) and [@storybook/addon-mcp](https://storybook.js.org/addons/@storybook/addon-mcp).

### 2. Install the plugins (in order)

```
/plugin install frontend --marketplace fubits1/svelte-skills
/plugin install svelte-5 --marketplace fubits1/svelte-skills
/plugin install svelte-5-migration --marketplace fubits1/svelte-skills
```

### 3. Set up your project

See [SETUP.md](SETUP.md) for copying template scripts, wiring `package.json` tasks, and installing dev dependencies.

## Updating

The whole marketplace ships as one version. After a new [release](https://github.com/fubits1/svelte-skills/releases), run `/plugin`, open the **Marketplaces** tab, select `svelte-skills`, and choose **Update marketplace**. Updating the marketplace also updates the plugins you installed from it.

To update from your shell, run:

```bash
claude plugin update frontend@svelte-skills
claude plugin update svelte-5@svelte-skills
claude plugin update svelte-5-migration@svelte-skills
```

Then run `/reload-plugins` in open sessions.

Auto-update is off by default for third-party marketplaces. To turn it on, run `/plugin`, open the **Marketplaces** tab, select `svelte-skills`, and choose **Enable auto-update**.

## Migration from 0.10.x

Version 0.11.0 moved the comment rules from `frontend:editing` into the new `frontend:comments` skill. `frontend:editing` requires it, and `frontend:comments` requires the `deslop` skill. Install `deslop` (see [Installation](#installation)), then update all three plugins as described in [Updating](#updating), since `svelte-5` and `svelte-5-migration` now name `frontend:comments` too.

Where your own CLAUDE.md files, skills and prompts name `frontend:editing` for comment rules, name `frontend:comments` instead. Links to `references/comments.md` no longer resolve.

Behavior changes:

- Only comments the agent adds default to DELETE; existing comments near an edit are no longer judged.
- Unless you ask for a specific change, the agent may change an existing comment in four ways only: fix the part its change made false, append a fact the change requires, fix what the project's linter reports on it without losing information, or delete the comment together with the code it describes.
- A comment that is a full sentence now starts with a capital letter and ends with a period; only fragments stay lowercase.
- New rules from past corrections: a comment states only checked facts, carries no commit hashes, spec numbers or dates, reads clearly without the chat, exists in one place, and keeps the `/** */`, docstring or `<!-- -->` form it needs. Hedges such as "likely" are banned.
- The agent reports one line per comment it added, changed or deleted.
- `frontend:editing` now requires `frontend:code-style`, which requires `frontend:code-style-css` when CSS is involved and `svelte-5:code-style-svelte` when Svelte is. `svelte-5:code-style-svelte` requires `svelte-5:composition-svelte` for complex features. For a `.svelte` file over 300 lines, not counting its `<style>` block, or a component that should be split into several files, it has the agent ask whether to refactor with `svelte-5:composition-svelte`.
- `frontend:editing` treats lint and TypeScript directives (`eslint-disable`, `oxlint-disable`, `svelte-ignore`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`) alike. A directive needs a reason and is allowed only when you ask for it, when a specific constraint keeps the code as written, or when a known defect can't be fixed in this change (with a FIXME or TODO).

Version 0.10.1 changed `frontend:web-design-guidelines`: it no longer carries its own copy of Vercel's guidelines. It routes to maintained sources, and its Svelte rules moved to `svelte-5:code-style-svelte`, its markup and CSS rules to `frontend:code-style` and `frontend:code-style-css`.

## Migration from 0.8.x

Version 0.10.0 moved the `vitest` skill from `frontend` to `svelte-5`, so `/frontend:vitest` is now `/svelte-5:vitest`. If you have `svelte-5`, update `frontend` and `svelte-5` as described in [Updating](#updating). Otherwise, install it after its prerequisites (see [Installation](#installation)):

```
/plugin install svelte-5 --marketplace fubits1/svelte-skills
```

Replace `frontend:vitest` with `svelte-5:vitest` in your own CLAUDE.md files, skills and prompts.

## Migration from 0.3.x

Version 0.4.0 moved the `agent` plugin to [fubits1/ronin-skills](https://github.com/fubits1/ronin-skills). The hooks from `bonus` now live in the optional `hooks` plugin there. If you installed `agent` or `bonus` from this marketplace, uninstall them and install `agent` from ronin-skills:

```
/plugin uninstall agent@svelte-skills
/plugin uninstall bonus@svelte-skills
/plugin install agent --marketplace fubits1/ronin-skills
```

If you used the `bonus` hooks, also install `hooks`:

```
/plugin install hooks --marketplace fubits1/ronin-skills
```

Then update `frontend`, `svelte-5`, and `svelte-5-migration` as described in [Updating](#updating) above.

## Skill behavior

Skills in this marketplace have auto-invocation triggers defined in their descriptions. Claude Code may invoke them automatically when it detects relevant context (e.g., editing a `.svelte` file, declaring a task done, starting a migration). You can also run a skill yourself with `/<plugin>:<skill>`, for example `/frontend:validate`. The exception is `svelte-5:storybook-vitest`, which sets `user-invocable: false`. To turn off a plugin's skills, disable the plugin in `/plugin`.

## Using these skills in OpenCode

See [Using these skills in OpenCode](https://github.com/fubits1/ronin-skills#using-these-skills-in-opencode) in ronin-skills.

## Context budget

Claude Code loads the name and description of every auto-invocable skill into context. Once the listing exceeds its budget, it drops descriptions, starting with the skills you invoke least; every listed name stays. The budget scales at 1% of the model's context window. Each skill's combined `description` and `when_to_use` text is truncated at 1,536 characters by default, configurable with `skillListingMaxDescChars` ([skills docs](https://code.claude.com/docs/en/skills#skill-descriptions-are-cut-short)). This marketplace's skills share that budget with every other skill Claude Code lists (other plugins, personal and project skills), so with a smaller context window, and its smaller budget, Claude Code drops descriptions sooner, which lowers auto-invocation accuracy.

Run `/doctor` for the listing's context cost, or `/context` for its size after the budget. Raise the budget with the `skillListingBudgetFraction` setting (for example `0.02`) or `SLASH_COMMAND_TOOL_CHAR_BUDGET=<chars>`.

Source: [Claude Code skills docs](https://code.claude.com/docs/en/skills)

## Complementary resources

- For forward-looking Svelte 5 or SvelteKit specific skills, see [spences10/skills](https://github.com/spences10/skills).
- [mattpocock/skills](https://github.com/mattpocock/skills): standalone skills including `grill-me` (get relentlessly interviewed about a plan or design, or use it to grill the agent about its own plan before it starts implementing).
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman): ultra-compressed communication mode (caveman-style speech, fragments, no fluff). Claims to cut token usage ~75% while preserving full technical accuracy. To install it, run:

  ```
  /plugin install caveman --marketplace JuliusBrussee/caveman
  ```

## Recommended tooling

These tools are referenced by the skills. Not all are required: install what your project uses.

| Tool | Repository |
| --- | --- |
| [ESLint](https://eslint.org/) | [eslint/eslint](https://github.com/eslint/eslint) |
| [oxlint](https://oxc.rs/) | [oxc-project/oxc](https://github.com/oxc-project/oxc) |
| [TypeScript](https://npmx.dev/package/typescript) 6 (inside svelte-check's peer range) | `pnpm add -D typescript@6` |
| [tsgo](https://npmx.dev/package/@typescript/native-preview) (the `tsgo` bin that `lint:file` calls and `svelte-check --tsgo` needs) | `pnpm add -D @typescript/native-preview` |
| [svelte-check](https://svelte.dev/docs/cli/sv-check) | [sveltejs/language-tools](https://github.com/sveltejs/language-tools) |
| [Knip](https://knip.dev/) | [webpro-nl/knip](https://github.com/webpro-nl/knip) |
| [Vitest](https://vitest.dev/) | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |
| [vitest-browser-svelte](https://vitest.dev/api/browser/svelte) | [vitest-community/vitest-browser-svelte](https://github.com/vitest-community/vitest-browser-svelte) |
| [Playwright](https://playwright.dev/) | [microsoft/playwright](https://github.com/microsoft/playwright) |
| [Storybook addon-vitest](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) | [storybookjs/storybook](https://github.com/storybookjs/storybook) (`code/addons/vitest/`) |
| [Storybook addon-svelte-csf](https://storybook.js.org/addons/@storybook/addon-svelte-csf) | [storybookjs/addon-svelte-csf](https://github.com/storybookjs/addon-svelte-csf) |
| [`msw`](https://mswjs.io/) | [mswjs/msw](https://github.com/mswjs/msw) |
| [msw-storybook-addon](https://storybook.js.org/addons/msw-storybook-addon) | [mswjs/msw-storybook-addon](https://github.com/mswjs/msw-storybook-addon) |
| [Prettier](https://prettier.io/) | [prettier/prettier](https://github.com/prettier/prettier) |
| [markdownlint-cli](https://npmx.dev/package/markdownlint-cli) | [igorshubovych/markdownlint-cli](https://github.com/igorshubovych/markdownlint-cli) |
| [fff](https://fff.dmtrkovalenko.dev/) | [dmtrKovalenko/fff](https://github.com/dmtrKovalenko/fff) |
| [Socket CLI](https://socket.dev/features/cli) | [SocketDev/socket-cli](https://github.com/SocketDev/socket-cli) |

Watchlist (not referenced by the skills in this marketplace):

- [dex](https://dex.rip): local flatfile task management (incl. skills) for agents

## Skill development / Ops

- use `agent:update-skills` (from [fubits1/ronin-skills](https://github.com/fubits1/ronin-skills)) to update skills from a local dir to this plugin dir.
- To test local changes, start Claude Code with `claude --plugin-dir /path/to/svelte-skills/plugins`. This loads all three plugins.

## Releases

Browse release history at [Releases](https://github.com/fubits1/svelte-skills/releases). For the update commands, see [Updating](#updating) above. Maintainer release process: see [RELEASING.md](RELEASING.md).

## License

MIT

The plugin icons are the [Svelte logo](https://github.com/sveltejs/branding), used under the Svelte branding guidelines. This marketplace is not affiliated with or endorsed by the Svelte project.
