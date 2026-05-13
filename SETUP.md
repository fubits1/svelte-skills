# Project Setup

After installing the plugins (see [README.md](README.md#installation)), set up your project's tooling.

Two flavours of validation scripts ship with this marketplace:

- **Bash** (default) -- simple, zero extra deps, good for projects already using a typical shell + pnpm setup.
- **TypeScript + dax** (recommended for advanced workflows) -- parallel execution, Windows-safe path chunking, anchored output filtering, and the bonus `lint:staged` workflow that lints only the files staged (or staged + ahead of upstream) in git.

Pick one path and stick to it -- they share the same `package.json` script names.

## 1. Copy template scripts

Copy from the plugin directories into your project's `scripts/` folder:

### Bash variant

From `frontend/scripts/`:

- `lint-file.sh` -- per-file lint chain
- `lint-tests.sh` -- lint test files
- `lint-summary.ts` -- lint dashboard (always TS, no bash equivalent)
- `test-file.sh` -- run vitest for specific files

From `svelte-5/scripts/`:

- `test-story.sh` -- run vitest for specific stories

### TypeScript + dax variant

Copy these three subtrees into `scripts/`:

From `frontend/scripts/`:

- `lib/` (`dax-helpers.ts`, `filter-output.ts`, `grouped.ts`, `paths.ts`) -- shared utilities
- `validate/` (`lint-file.ts`, `lint-tests.ts`, `test-file.ts`) -- core implementations
- `bin/` (`lint-file.ts`, `lint-tests.ts`, `lint-staged.ts`, `test-file.ts`) -- thin wrappers wired to `package.json`
- `lint-summary.ts` -- lint dashboard

From `svelte-5/scripts/`:

- `validate/test-story.ts`
- `bin/test-story.ts`

## 2. Wire `package.json` scripts

### Bash variant

```json
{
  "scripts": {
    "lint:file": "bash scripts/lint-file.sh",
    "lint:tests": "bash scripts/lint-tests.sh",
    "lint:summary": "node --experimental-strip-types scripts/lint-summary.ts",
    "test:file": "bash scripts/test-file.sh",
    "test:story": "bash scripts/test-story.sh"
  }
}
```

### TypeScript variant

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

For markdown linting:

```bash
pnpm add -D markdownlint-cli
```

### TypeScript variant only

The TS scripts depend on `dax` and `tinyglobby`:

```bash
pnpm add -D dax tinyglobby
```

For a experimental oxlint + eslint setup (rules split, overlap elimination), see [this config gist](https://gist.github.com/fubits1/63385040dff3faca5306479d021e74f1). HINT: it needs updating. Oxlint launched [alpha support for eslint plugins](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha), added [type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware), and e18e released a dedicated [eslint plugin](https://npmx.dev/package/@e18e/eslint-plugin#user-content-usage-with-oxlint) usable with Oxlint via JS plugins.

## 4. Adapt configurable values

### Bash variant

The template scripts have sensible defaults but may need adjusting:

- **`lint-file.sh`**: tsconfig path (`./tsconfig.json` by default)
- **`lint-tests.sh`**: test tsconfig path, knip config file name (`knip.tests.jsonc`)
- **`test-file.sh`**: vitest project names (`node`, `browser` by default)
- **`test-story.sh`**: vitest project name (`storybook` by default)

Comments in each script explain what to change.

### TypeScript variant

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
