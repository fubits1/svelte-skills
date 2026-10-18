# Frontend

Frontend development discipline -- validation, pixel-perfect measurement, editing, code style, testing, migration baselines.

Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) plugin marketplace. This is a framework-agnostic plugin that sits between `agent@ronin-skills` (cross-marketplace required dependency) and the framework-specific plugins (e.g. `svelte-5`).

For installation and setup, see the [root README](https://github.com/fubits1/svelte-skills#readme).

## Dependencies

- **`agent` plugin from [fubits1/ronin-skills](https://github.com/fubits1/ronin-skills)** -- skills in this plugin reference `agent:research`, `agent:done`, and others. Add the marketplace and install the plugin before installing `frontend`:

  ```
  /plugin marketplace add fubits1/ronin-skills
  /plugin install agent@ronin-skills
  ```

- **Playwright MCP** -- required for browser verification and screenshot workflows.

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
| `vitest` | Vitest config (projects, browser mode, flake hygiene) |
| `web-design-guidelines` | UI review for Web Interface Guidelines |
| `migration` | Framework-agnostic migration phases and baseline capture |

## Template Scripts

TypeScript + dax scripts under `scripts/{lib,validate,bin}/`. Parallel execution via dax `$.all`, Windows-safe path chunking, anchored output filtering, and a `lint:staged` workflow. Requires `dax` and `tinyglobby` as dev deps, Node 22.6+ for `--experimental-strip-types` (or use `tsx`); `test-file.ts` runs Vitest 5, which needs Node 22.12+. See [SETUP.md](../../SETUP.md) for full wiring and dependencies.

> **Migration note (0.5.0):** the bash variants (`lint-file.sh`, `lint-tests.sh`, `test-file.sh`) were removed. Swap your `package.json` to the TS lines below and copy the `lib/`, `validate/`, and `bin/` subtrees into your project's `scripts/`.

| Script | `package.json` task | Purpose |
| --- | --- | --- |
| `bin/lint-file.ts` | `pnpm lint:file` | Per-file lint chain: eslint + knip, oxlint for script files, and svelte-check (with `.svelte` files) or tsgo (with `.ts` files), parallelised |
| `bin/lint-tests.ts` | `pnpm lint:tests` | Lint test files (oxlint + eslint + knip + svelte-check), parallelised |
| `bin/lint-staged.ts` | `pnpm lint:staged` | Lint only files staged in git. Pass `--committed` to also include commits ahead of upstream |
| `bin/test-file.ts` | `pnpm test:file` | Run vitest for specific files (node + browser projects) |
| `lint-summary.ts` | `pnpm lint:summary` | Dashboard view of all lint results as a table |
