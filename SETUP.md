# Project Setup

After installing the plugins (see [README.md](README.md#installation)), set up your project's tooling.

## 1. Copy template scripts

Copy from the plugin directories into your project's `scripts/` folder:

From `frontend`:

- `lint-file.sh` -- per-file lint chain
- `lint-tests.sh` -- lint test files
- `lint-summary.ts` -- lint dashboard
- `test-file.sh` -- run vitest for specific files

From `svelte-5`:

- `test-story.sh` -- run vitest for specific stories

## 2. Wire `package.json` scripts

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

For a experimental oxlint + eslint setup (rules split, overlap elimination), see [this config gist](https://gist.github.com/fubits1/63385040dff3faca5306479d021e74f1). HINT: it needs updating. Oxlint launched [alpha support for eslint plugins](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha), added [type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware), and e18e released a dedicated [eslint plugin](https://npmx.dev/package/@e18e/eslint-plugin#user-content-usage-with-oxlint) usable with Oxlint via JS plugins.

## 4. Adapt configurable values

The template scripts have sensible defaults but may need adjusting:

- **`lint-file.sh`**: tsconfig path (`./tsconfig.json` by default)
- **`lint-tests.sh`**: test tsconfig path, knip config file name (`knip.tests.jsonc`)
- **`test-file.sh`**: vitest project names (`node`, `browser` by default)
- **`test-story.sh`**: vitest project name (`storybook` by default)

Comments in each script explain what to change.

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
