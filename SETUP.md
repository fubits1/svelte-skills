# Project Setup

After installing the plugins (see [README.md](README.md#installation)), set up your project's tooling.

Validation scripts ship as a TypeScript + dax toolkit: parallel execution via dax's `$.all`, Windows-safe path chunking, anchored output filtering, and a `lint:staged` workflow that lints only files staged (or staged + ahead of upstream) in git.

> **Migration note (0.5.0):** the bash variants (`lint-file.sh`, `lint-tests.sh`, `test-file.sh`, `test-story.sh`) were removed. Replace any `"bash scripts/X.sh"` entries in your `package.json` with the TS equivalents shown below and copy over the `lib/`, `validate/`, and `bin/` subtrees.

## 1. Copy template scripts

Copy these subtrees into your project's `scripts/` folder:

From `frontend/scripts/`:

- `lib/` (`dax-helpers.ts`, `filter-output.ts`, `grouped.ts`, `paths.ts`) -- shared utilities
- `validate/` (`lint-file.ts`, `lint-tests.ts`, `test-file.ts`) -- core implementations
- `bin/` (`lint-file.ts`, `lint-tests.ts`, `lint-staged.ts`, `test-file.ts`) -- thin wrappers wired to `package.json`
- `lint-summary.ts` -- lint dashboard

From `svelte-5/scripts/`:

- `validate/test-story.ts`
- `bin/test-story.ts`

## 2. Wire `package.json` scripts

```json
{
  "scripts": {
    "lint:file": "node --experimental-strip-types scripts/bin/lint-file.ts",
    "lint:tests": "node --experimental-strip-types scripts/bin/lint-tests.ts",
    "lint:staged": "node --experimental-strip-types scripts/bin/lint-staged.ts",
    "lint:summary": "node --experimental-strip-types scripts/lint-summary.ts",
    "test:file": "node --experimental-strip-types scripts/bin/test-file.ts",
    "test:story": "node --experimental-strip-types scripts/bin/test-story.ts",
    "test:unit": "vitest run --project node --project browser",
    "test:storybook": "vitest run --project storybook --silent"
  }
}
```

`lint:tests` reads `knip.tests.jsonc` and `tsconfig.tests.json`: create both, or point `KNIP_TESTS_CONFIG` and `TSCONFIG_TESTS` (table below) at your files. Without the tsconfig, svelte-check's error does not match the script's `.test.ts` output filter, so that step can report a pass (read from `lint-tests.ts`, not run).

`lint-summary.ts` runs `lint:knip`, `check`, `lint:oxlint`, `lint:eslint` and `lint:styles`; define those scripts too (`lint:styles` needs `stylelint`, which the install step below leaves out), or edit its task list. It prints a pass/fail table and exits 0 even when a task fails, so read the table: `pnpm validate` passing does not prove lint passed.

The skills assume these names: `test:unit` for the node and browser Vitest projects and `test:storybook` for the storybook project. A project with Playwright e2e tests adds its own `test:e2e`, and `test` then runs Vitest plus e2e.

`--experimental-strip-types` requires Node 22.6+. If you're on an older Node, swap to `tsx` (`pnpm add -D tsx`, then `tsx scripts/bin/lint-file.ts`). That covers the lint scripts only: `test:file` and `test:story` run Vitest 5, which needs Node 22.12 or later.

## 3. Install dev dependencies

The template scripts and skills expect these tools. Install what your project uses:

```bash
pnpm add -D eslint oxlint svelte-check knip vitest concurrently
```

For TypeScript type checking with tsgo, which `lint:file` and `lint:tests` need as configured (`SVELTE_CHECK_FLAGS` defaults to `--tsgo`, and `lint:file` runs `tsgo --noEmit` on `.ts` files; without it, set `SVELTE_CHECK_FLAGS` to `--threshold error`, and `.ts`-only runs still fail):

```bash
pnpm add -D @typescript/native-preview
```

For Storybook testing, in a project that already runs Storybook (`pnpm create storybook@latest` sets one up):

```bash
pnpm add -D @storybook/addon-vitest @storybook/addon-svelte-csf
```

Register both in `.storybook/main.ts` `addons`, and add `svelte` to the `stories` glob (`'../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)'`, from the `@storybook/addon-svelte-csf` README). `pnpm exec storybook add @storybook/addon-vitest` installs and registers the Vitest addon in one step (`svelte-5:storybook-vitest`).

For browser testing (Vitest 5 needs Node >=22.12 and Vite >=6.4; keep every `@vitest/*` package on the same version as `vitest`):

```bash
pnpm add -D @vitest/browser-playwright vitest-browser-svelte
pnpm exec playwright install chromium    # CI on Linux: pnpm exec playwright install --with-deps chromium
```

For API mocking (see the `svelte-5:msw` skill). A project that runs Storybook keeps `msw` on major 2 with `msw-storybook-addon` 3 until the addon supports msw 3 (the skill says how to check); without Storybook, install msw 3. `msw-storybook-addon` 3 reworked the entry points and deprecated the CSF 3 loader API; on addon 2, or before upgrading, read the addon 2 to 3 notes in that skill. A SvelteKit dev app on msw 3 can use the `@msw/sveltekit` add-on instead, which serves the worker through the `msw/vite` plugin; Vitest browser tests and Storybook use the committed worker file below, the only path the skill measured.

```bash
# with Storybook: then set "msw" to "^2" in package.json and run pnpm install
pnpm add -D msw msw-storybook-addon
# without Storybook (msw 3)
pnpm add -D msw
# either way, for Vitest browser tests and Storybook: the committed worker script
pnpm exec msw init public --save    # SvelteKit: pnpm exec msw init static --save
```

`msw init` writes `mockServiceWorker.js` into that directory and records it under `msw.workerDirectory` in `package.json`. For Vitest browser tests and Storybook, commit the worker file, make sure Storybook serves it via `staticDirs`, and re-run `msw init` after every msw upgrade: msw 3 does not refresh the file on install.

For markdown linting:

```bash
pnpm add -D markdownlint-cli
```

The scripts depend on `dax` and `tinyglobby`:

```bash
pnpm add -D dax tinyglobby
```

For an experimental oxlint + eslint setup (rules split, overlap elimination), see [this config gist](https://gist.github.com/fubits1/63385040dff3faca5306479d021e74f1). HINT: it needs updating. Oxlint launched [alpha support for eslint plugins](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha), added [type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware), and e18e released a dedicated [eslint plugin](https://npmx.dev/package/@e18e/eslint-plugin#user-content-usage-with-oxlint) usable with Oxlint via JS plugins.

## 4. Adapt configurable values

The TS scripts read environment variables so you do not edit the source. Set what you need (e.g. in `.env`, your shell, or via `cross-env`):

| Variable | Default | Used by |
| --- | --- | --- |
| `TSCONFIG_PATH` | `./tsconfig.json` | `lint-file.ts` (passed to `svelte-check --tsconfig`) |
| `SVELTE_CHECK_FLAGS` | `--tsgo --threshold error` | `lint-file.ts`, `lint-tests.ts` |
| `TEST_GLOBS` | `src/**/*.test.ts,tests/**/*.test.ts` | `lint-tests.ts`, `collectTestFiles` |
| `KNIP_TESTS_CONFIG` | `knip.tests.jsonc` | `lint-tests.ts` |
| `TSCONFIG_TESTS` | `tsconfig.tests.json` | `lint-tests.ts` |
| `VITEST_PROJECTS` | `node,browser` | `test-file.ts` (comma-separated) |
| `VITEST_STORYBOOK_PROJECT` | `storybook` | `test-story.ts` |

## 5. Optional: validation and build scripts

The `frontend:validate` skill expects these compound scripts. Adapt to your project:

```json
{
  "scripts": {
    "validate": "concurrently \"pnpm test:unit\" \"pnpm lint:summary\" && pnpm test:storybook",
    "validate:build": "concurrently \"pnpm validate\" \"pnpm build\" \"pnpm build-storybook\""
  }
}
```
