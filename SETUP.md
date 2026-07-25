# Project Setup

After installing the plugins (see [README.md](README.md#installation)), set up your project's tooling.

Validation scripts ship as a TypeScript + dax toolkit: parallel execution via `dax.$all`, Windows-safe path chunking, anchored output filtering, and a `lint:staged` workflow that lints only files staged (or staged + ahead of upstream) in git.

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
    "test:story": "node --experimental-strip-types scripts/bin/test-story.ts"
  }
}
```

`--experimental-strip-types` requires Node 22.6+. If you're on an older Node, swap to `tsx` (`pnpm add -D tsx`, then `tsx scripts/bin/lint-file.ts`).

## 3. Install dev dependencies

The template scripts and skills expect these tools. Install what your project uses:

```bash
pnpm add -D eslint oxlint svelte-check knip vitest concurrently
```

For TypeScript type checking with tsgo:

```bash
pnpm add -D @typescript/native-preview
```

For Storybook testing:

```bash
pnpm add -D @storybook/addon-vitest @storybook/addon-svelte-csf
```

For browser testing:

```bash
pnpm add -D @vitest/browser-playwright vitest-browser-svelte
npx playwright install chromium
```

For API mocking (see the `svelte-5:msw` skill). `msw-storybook-addon@3` (2026-07) reworked the entry points and deprecated the CSF 3 loader API; on v2, or before upgrading, read the v2-to-v3 notes in that skill:

```bash
pnpm add -D msw msw-storybook-addon
pnpm exec msw init public --save    # SvelteKit: pnpm exec msw init static --save
```

`msw init` writes `mockServiceWorker.js` into that directory and records it under `msw.workerDirectory` in `package.json`. Commit the worker file, and make sure Storybook serves it via `staticDirs`.

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

The `done` skill expects these compound scripts. Adapt to your project:

```json
{
  "scripts": {
    "validate": "concurrently \"pnpm test\" \"pnpm lint:summary\" && pnpm test:storybook",
    "validate:build": "concurrently \"pnpm validate\" \"pnpm build\" \"pnpm build-storybook\""
  }
}
```
