# Frontend

Frontend development discipline -- validation, pixel-perfect measurement, editing, code style, testing, migration baselines.

Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) plugin marketplace. This is a framework-agnostic plugin that sits between `agent` (required dependency) and the framework-specific plugins (e.g. `svelte-5`).

For installation and setup, see the [root README](https://github.com/fubits1/svelte-skills#readme).

## Dependencies

- **`agent` plugin** -- skills in this plugin reference `agent:research`, `agent:done`, and others. Install it first.
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
| `validate` | Validation discipline (testing, baselines, browser checks) |
| `playwright` | Playwright MCP usage (screenshots, measurements) |
| `vitest` | Vitest config (projects, browser mode, flake hygiene) |
| `web-design-guidelines` | UI review for Web Interface Guidelines |
| `migration` | Framework-agnostic migration phases and baseline capture |

## Template Scripts

Two flavours ship under `scripts/` -- pick one. Both expose the same `package.json` script names. See [SETUP.md](../../SETUP.md) for full wiring and dependencies.

### Bash (default, zero extra deps)

| Script | `package.json` task | Purpose |
| --- | --- | --- |
| `lint-file.sh` | `pnpm lint:file` | Per-file lint chain (eslint + oxlint + tsgo + svelte-check + knip) |
| `lint-tests.sh` | `pnpm lint:tests` | Lint test files (oxlint + eslint + knip + svelte-check) |
| `lint-summary.ts` | `pnpm lint:summary` | Dashboard view of all lint results as a table |
| `test-file.sh` | `pnpm test:file` | Run vitest for specific files (node + browser projects) |

### TypeScript + dax (recommended)

Adds parallel execution via dax `$.all`, Windows-safe path chunking, anchored output filtering, and an extra `lint:staged` workflow. Subtree under `scripts/{lib,validate,bin}/`. Requires `dax` and `tinyglobby` as dev deps and Node 22.6+ for `--experimental-strip-types` (or use `tsx`).

| Script | `package.json` task | Purpose |
| --- | --- | --- |
| `bin/lint-file.ts` | `pnpm lint:file` | Same as bash variant, parallelised |
| `bin/lint-tests.ts` | `pnpm lint:tests` | Same as bash variant, parallelised |
| `bin/lint-staged.ts` | `pnpm lint:staged` | Lint only files staged in git. Pass `--committed` to also include commits ahead of upstream |
| `bin/test-file.ts` | `pnpm test:file` | Run vitest for specific files |
| `lint-summary.ts` | `pnpm lint:summary` | Dashboard view of all lint results as a table |
