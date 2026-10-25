# Frontend

Frontend development discipline: validation, pixel-perfect measurement, editing, code style, testing, migration baselines.

Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) plugin marketplace. It is framework-agnostic and sits between `agent@ronin-skills` and the framework-specific plugins, such as `svelte-5`.

## Dependencies

Install these first. As of Claude Code v2.1.275, `/plugin install <name> --marketplace <source>` adds the marketplace if needed and opens the plugin's details, where you install it.

- **`superpowers` plugin**: the `agent` plugin requires it.

  ```
  /plugin install superpowers@claude-plugins-official
  ```

- **`agent` plugin from [fubits1/ronin-skills](https://github.com/fubits1/ronin-skills)**: skills in this plugin reference `agent:research` and `agent:done`.

  ```
  /plugin install agent --marketplace fubits1/ronin-skills
  ```

- **Playwright MCP**: browser verification and screenshot workflows need it. Add it from your shell:

  ```bash
  claude mcp add playwright -- npx @playwright/mcp@latest
  ```

- **`svelte` plugin from sveltejs/ai-tools**: on `.svelte` files, skills in this plugin call its autofixer, the `svelte:svelte-code-writer` skill, and the `svelte:svelte-file-editor` subagent.

  ```
  /plugin install svelte --marketplace sveltejs/ai-tools
  ```

## Install

Then install this plugin:

```
/plugin install frontend --marketplace fubits1/svelte-skills
```

To install from your shell instead, run `claude plugin install frontend --marketplace fubits1/svelte-skills`. For the full setup, see the [root README](https://github.com/fubits1/svelte-skills#readme).

## Skills

| Skill | Purpose |
| --- | --- |
| `validate-file` | Per-file validation loop (lint, test, autofixer) |
| `pixel-perfect` | Mandatory measurement workflow for CSS/HTML changes |
| `editing` | File editing discipline (comments, types, refactoring) |
| `code-style` | Variable naming, brace style, HTML data attributes |
| `code-style-css` | CSS-specific style rules (layout vs decorative) |
| `css-nesting` | CSS nesting with `&` and stylelint compliance |
| `css-subgrid` | Subgrid pattern for card grids (icon/title/CTA alignment) |
| `js-config` | ESLint/Prettier/Stylelint/Svelte+Vite+Astro config decisions |
| `validate` | Validation discipline (testing, baselines, browser checks) |
| `playwright` | Playwright MCP usage (screenshots, measurements) |
| `web-design-guidelines` | UI review for Web Interface Guidelines |
| `migration` | Framework-agnostic migration phases and baseline capture |

## Template Scripts

TypeScript + dax scripts under `scripts/{lib,validate,bin}/`. Parallel execution via dax `$.all`, Windows-safe path chunking, anchored output filtering, and a `lint:staged` workflow. Requires `dax` and `tinyglobby` as dev deps, Node 22.6+ for `--experimental-strip-types` (or use `tsx`); `test-file.ts` runs the project's Vitest (Vitest 5 needs Node 22.12+, 24 or 26+). See [SETUP.md](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md) for full wiring and dependencies.

> **Migration note (0.5.0):** the bash variants (`lint-file.sh`, `lint-tests.sh`, `test-file.sh`) were removed. Swap your `package.json` to the TS script lines in [SETUP.md](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md) §2 and copy the `lib/`, `validate/`, and `bin/` subtrees into your project's `scripts/`.

| Script | `package.json` task | Purpose |
| --- | --- | --- |
| `bin/lint-file.ts` | `pnpm lint:file` | Per-file lint chain: eslint + knip, oxlint for JS and TS files, and svelte-check when the list holds a `.svelte` file, otherwise tsgo for TypeScript files; the type-check and knip steps run in parallel |
| `bin/lint-tests.ts` | `pnpm lint:tests` | Lint test files: oxlint and eslint, then knip and svelte-check in parallel |
| `bin/lint-staged.ts` | `pnpm lint:staged` | Lint the working-tree content of the `.ts`, `.js` and `.svelte` files staged in git inside the directory of the `package.json` that defines the script. Pass `--committed` to also include commits ahead of upstream (with no upstream: commits not on any remote-tracking ref; with no remote-tracking refs either, it skips them with a warning) |
| `bin/test-file.ts` | `pnpm test:file` | Run vitest for specific files (node + browser projects) |
| `lint-summary.ts` | `pnpm lint:summary` | Dashboard view of all lint results as a table |

## License

MIT. The plugin icon is the [Svelte logo](https://github.com/sveltejs/branding), used under the Svelte branding guidelines. This plugin is not affiliated with or endorsed by the Svelte project.
