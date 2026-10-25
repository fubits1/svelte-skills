# Project Setup

After installing the plugins (see [README.md](README.md#installation)), set up your project's tooling.

Validation scripts ship as a TypeScript + dax toolkit: parallel execution via dax's `$.all`, Windows-safe path chunking, anchored output filtering, and a `lint:staged` workflow. `lint:staged` lints the working-tree content of the `.ts`, `.js` and `.svelte` files staged in git inside the directory of the `package.json` that defines the script. With `--committed` it also lints those in commits ahead of upstream, or, with no upstream, in commits not on any remote-tracking ref; with no upstream and no remote-tracking refs (e.g. a remote never fetched), it skips the committed scan with a warning.

> **Migration note (0.5.0):** the bash variants (`lint-file.sh`, `lint-tests.sh`, `test-file.sh`, `test-story.sh`) were removed. Replace any `"bash scripts/X.sh"` entries in your `package.json` with the TS equivalents shown below and copy over the `lib/`, `validate/`, and `bin/` subtrees.

## 1. Copy template scripts

Copy these subtrees into your project's `scripts/` folder:

From `frontend/scripts/` (`plugins/frontend/scripts/` in this repo):

- `lib/` (`dax-helpers.ts`, `filter-output.ts`, `grouped.ts`, `paths.ts`): shared utilities
- `validate/` (`lint-file.ts`, `lint-tests.ts`, `test-file.ts`): core implementations
- `bin/` (`lint-file.ts`, `lint-tests.ts`, `lint-staged.ts`, `test-file.ts`): thin wrappers wired to `package.json`
- `lint-summary.ts`: lint dashboard

From `svelte-5/scripts/` (`plugins/svelte-5/scripts/` in this repo):

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

`lint:tests` reads `knip.tests.jsonc` and `tsconfig.tests.json`. Create both before the first run, or point `KNIP_TESTS_CONFIG` and `TSCONFIG_TESTS` (table below) at files you already have:

1. Create `knip.tests.jsonc`: a knip config whose `entry` and `project` globs cover your test files, by default:

   ```jsonc
   {
     "entry": ["src/**/*.test.ts", "tests/**/*.test.ts"],
     "project": ["src/**/*.test.ts", "tests/**/*.test.ts"]
   }
   ```

2. Create `tsconfig.tests.json`: it extends your base tsconfig, and its `include` lists your declaration files plus every `TEST_GLOBS` pattern. An `include` here replaces the base one, so without `src/**/*.d.ts` your `src/app.d.ts` types are missing in tests. By default:

   ```json
   {
     "extends": "./tsconfig.json",
     "include": ["src/**/*.d.ts", "src/**/*.test.ts", "tests/**/*.test.ts"]
   }
   ```

   On the create-vite Svelte template, use `"extends": "./tsconfig.app.json"`: its `tsconfig.json` has no compiler options. If the base tsconfig's `exclude` matches your test files, set `exclude` again (`svelte-5:testing-svelte` troubleshooting, Error 6). On Astro, set `types` as Error 6 shows; which declaration files to include there is not covered here.

Cases where `lint:tests` passes without checking:

- Its svelte-check step ignores svelte-check's exit code and fails only on output lines that mention `.test.ts`, so an error that names no test file does not fail it
- Without `tsconfig.tests.json`, the svelte-check step reports `✓` on a type error: create the tsconfig first
- A type error in a test file whose name lacks `.test.ts` (a `TEST_GLOBS` pattern such as `src/**/*.spec.ts`; `sv add vitest` names its example tests `*.spec.ts`) never fails the svelte-check step; oxlint and eslint still lint it
- When no file matches `TEST_GLOBS`, `lint:tests` prints `no test files matched TEST_GLOBS=…` for every step and exits 0

Lint test files the globs miss (for example `*.spec.ts`) with `pnpm lint:file`.

`lint-summary.ts` runs `lint:knip`, `check`, `lint:oxlint`, `lint:eslint` and `lint:styles`; define those scripts too (`lint:styles` needs `stylelint`, which the install step below leaves out), or edit its task list. It prints a pass/fail table and exits 0 even when a task fails, so read the table: `pnpm validate` passing does not prove lint passed.

The skills assume these scripts, project names and versions:

- `test:unit` runs the node and browser Vitest projects, `test:storybook` the storybook project. `sv add vitest` writes `test:unit` as `vitest`, which watches in an interactive terminal and runs every project; replace it with the line in the block above, using your project names (next bullet)
- Name the Vitest projects `node`, `browser` and `storybook` (`sv add vitest` names them `server` and `client`), or edit the `--project` names in `test:unit` and `test:storybook` and set `VITEST_PROJECTS` and `VITEST_STORYBOOK_PROJECT` for `test:file` and `test:story`. When the config's `test.projects` name neither `node` nor `browser`, `test:unit` exits with `No projects were found … The filter matched no projects: node, browser`; with only one of them, it runs that one. A config without `test.projects` is not covered here. Creating the `node` and `browser` projects in a project without them is not covered here (inheritance rules: `svelte-5:vitest` skill, `references/config-projects.md`)
- `test` may chain more than Vitest (`sv add playwright` makes it call `test:e2e`); for Vitest alone, the skills run `test:unit` and `test:storybook`
- The skills target Vitest 5; if `package.json` lists Vitest 4, upgrade first (`svelte-5:vitest` skill, `references/vitest-5-upgrade.md`)

`--experimental-strip-types` requires Node 22.6+. If you're on an older Node, swap to `tsx` (`pnpm add -D tsx`, then `tsx scripts/bin/lint-file.ts`). `tsx` lifts only that floor: the tools the scripts call keep their own Node ranges (`pnpm view <tool> engines.node`), and `test:file` and `test:story` run the project's Vitest, which needs Node 22.12+, 24 or 26+ (Vitest 5).

## 3. Install dev dependencies

The template scripts and skills expect these tools. Install what your project uses:

```bash
pnpm add -D eslint oxlint svelte-check typescript@6 knip vitest concurrently
```

tsgo is the type checker that `lint:file` calls for a list with a TypeScript file and no `.svelte` file, and the one svelte-check uses (with the default `SVELTE_CHECK_FLAGS`) in `lint:file` and `lint:tests`. Keep `typescript@6` from the line above: TypeScript 7 is outside svelte-check's `typescript` peer range and is not covered here. Install tsgo:

```bash
pnpm add -D @typescript/native-preview
```

- `SVELTE_CHECK_FLAGS` defaults to `--tsgo --threshold error`; without tsgo, set `SVELTE_CHECK_FLAGS="--threshold error"` (quote it in a shell: the value holds a space, and the scripts split it into flags). `lint:file`'s tsgo step still needs tsgo
- `lint:file`'s tsgo step runs `tsgo --noEmit` against the root `tsconfig.json`. A root tsconfig with `"files": []` and `references` (the create-vite Svelte template) gives tsgo no file to check and gives svelte-check only errors that name no linted file, so both type-check steps report `✓`:
  - svelte-check: set `TSCONFIG_PATH=./tsconfig.app.json` (table below)
  - tsgo does not read `TSCONFIG_PATH`: type-check those TypeScript files with `pnpm exec tsgo --noEmit -p tsconfig.app.json` (`vite.config.ts`: `-p tsconfig.node.json`)
- The tsgo, svelte-check and knip steps of `lint:file` fail only on output lines that name the linted files, and the svelte-check step of `lint:tests` only on lines that mention `.test.ts`; all four ignore the exit code. Without tsgo installed, the tsgo step of `lint:file` and the svelte-check steps of `lint:file` and `lint:tests` (with the default `--tsgo` flag) report `✓` while a type error goes unreported. Install every tool the scripts call before you trust a green run

For Storybook testing, pick the case that fits (details: `svelte-5:storybook-vitest`, `references/config.md`, Setup):

- SvelteKit project without Storybook and without a Vitest config (no `vitest.config.*` and no `test` block in `vite.config.ts`): `pnpm dlx sv@latest add storybook` runs Storybook's interactive installer; what it adds depends on the answers given there. Follow the four Setup A steps there (decide where `test` lives; run the command and check the addon, the storybook project and the peers; move `test` if agreed; finish as Setup B step 5: remove `extends: true`, install the browser packages if missing, check the Svelte CSF addon and run the storybook project)
- Storybook already installed, an existing Vitest config, or outside SvelteKit, and not the `sv add vitest` layout below: follow the Setup B steps there (Gate question, Storybook install if missing via the [Storybook install docs](https://storybook.js.org/docs/get-started/install), peer check and the storybook project by hand, or, if you agree to it, `pnpm exec storybook add @storybook/addon-vitest` then the peer check; remove `extends: true`, install the browser packages if missing, check the Svelte CSF addon and run the storybook project)
- An existing Storybook, when you would rather review each change than let `storybook add` edit the config: wire it by hand, below

The `sv add vitest` layout is a `test` block in `vite.config.ts` with any project whose `extends` is that file's path (e.g. `extends: './vite.config.ts'`, as `sv add vitest` writes its `client` and/or `server` projects, unless renamed per the project-name bullet above). Adding Storybook to that layout is not covered here; the Isolation rule in `svelte-5:storybook-vitest` `references/config.md` warns about a `test` block in `vite.config.ts`.

Wiring by hand needs two preconditions: an existing `vitest.config.*` with `test.projects`, and no `test` block in `vite.config.ts`. If either fails, wiring by hand is not covered here; a project outside the `sv add vitest` layout above that does not list the addon yet can follow Setup B instead (bullet 2 above), whose step 3 asks whether `storybook add` may edit the config. If both preconditions hold, install the addons:

```bash
pnpm ls storybook    # the installed Storybook version
# each @storybook/addon-vitest release's storybook peer range starts at its own version
pnpm add -D @storybook/addon-vitest@<that version> @storybook/addon-svelte-csf
```

Then run the peer check (`svelte-5:storybook-vitest`, `references/config.md`, Setup B step 4).

Register `@storybook/addon-vitest` and `@storybook/addon-svelte-csf` in `.storybook/main.ts` `addons` if they are not listed, and, if the stories entry in `stories` lacks `svelte`, add it to its extensions, keeping the other entries (the `@storybook/addon-svelte-csf` README uses `'../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)'`). Then install the browser-testing packages below. To add the storybook project (`storybookTest()` with browser mode) to `vitest.config.*`, open `svelte-5:storybook-vitest`, `references/config.md`, Setup B step 3, second case. Follow it from sub-step 2, which adds the project; sub-step 3 checks that the root loads the Svelte plugin.

For browser testing (Vitest 5 needs Node 22.12+, 24 or 26+ and Vite >=6.4; SvelteKit 3 needs Node 22.17+; keep every `@vitest/*` package on the same version as `vitest`; `playwright` is a peer of `@vitest/browser-playwright`):

```bash
pnpm ls vitest    # the installed Vitest version; empty output: install vitest first
pnpm add -D @vitest/browser-playwright@<that version> vitest-browser-svelte playwright
pnpm exec playwright install chromium    # CI on Linux: pnpm exec playwright install --with-deps chromium
```

For API mocking, see the `svelte-5:msw` skill: msw 3, plus `msw-storybook-addon` 3 when the project runs Storybook. To upgrade from msw 2 or addon 2, follow the skill's migration reference. msw 3 needs Node 22.12+ (SvelteKit 3: 22.17+). The `msw/vite` plugin (`msw()` in the Vite config) serves the worker script to the dev server, to Vitest projects whose config loads the plugin, and to `storybook dev` (check `/mockServiceWorker.js` on its origin; if it is missing, commit the worker script as below). On SvelteKit, the `@msw/sveltekit` add-on adds the plugin. It is a community `sv` add-on: read its source before `sv` runs it, as the `svelte-5:msw` SvelteKit reference ("Start with the `@msw/sveltekit` add-on") describes. If `sv` warns that the add-on's `sv` peer range does not match, ignore it when the add-on applies cleanly, and otherwise wire msw by hand (same reference).

```bash
pnpm add -D msw msw-storybook-addon    # without Storybook: pnpm add -D msw
# a committed worker script, for what the plugin does not serve (a Vite project or Vitest browser project without msw(), a built Storybook, `storybook dev` when the check above fails)
pnpm exec msw init public --save    # SvelteKit: pnpm exec msw init static --save
```

`msw init` writes `mockServiceWorker.js` into that directory and records it under `msw.workerDirectory` in `package.json`; commit the file. `storybook dev`, `storybook build` and Vitest browser projects without `msw()` (the storybook project included) pick it up from Vite's `publicDir`, so no `staticDirs` entry is needed (a worker script outside `publicDir`: `svelte-5:msw` skill). Vite's `publicDir` defaults to `public/`; `sveltekit()` sets it to `static/`. Re-run `msw init` after every msw upgrade: msw 3 does not refresh the file on install.

After any of the three Storybook setups above (and the msw setup, if your stories use msw), run `pnpm test:storybook` as the `svelte-5:vitest` flake-hygiene reference describes.

For markdown linting:

```bash
pnpm add -D markdownlint-cli
```

The scripts depend on `dax` and `tinyglobby`:

```bash
pnpm add -D dax tinyglobby
```

For an experimental oxlint + eslint setup (rules split, overlap elimination), see [this config gist](https://gist.github.com/fubits1/63385040dff3faca5306479d021e74f1). Oxlint features to combine with it: [JS plugins for eslint plugins](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha), [type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware), and e18e's [eslint plugin](https://npmx.dev/package/@e18e/eslint-plugin#user-content-usage-with-oxlint), which Oxlint can load as a JS plugin.

## 4. Adapt configurable values

The TS scripts read environment variables from `process.env`, so you do not edit the source; they do not load `.env` themselves. Set what you need in your shell, via `cross-env` (`pnpm add -D cross-env`), or with `node --env-file-if-exists=.env` (Node 22.9+; `--env-file` fails when the file is missing) in the script command. Add the flag to every `node --experimental-strip-types` line from §2 whose script reads a variable below. For example, with `TSCONFIG_PATH=./tsconfig.app.json` in `.env`:

```json
"lint:file": "node --env-file-if-exists=.env --experimental-strip-types scripts/bin/lint-file.ts"
```

Variables:

| Variable | Default | Used by |
| --- | --- | --- |
| `TSCONFIG_PATH` | `./tsconfig.json` | `lint-file.ts` (passed to `svelte-check --tsconfig`), so `lint:file` and `lint:staged` |
| `SVELTE_CHECK_FLAGS` | `--tsgo --threshold error` | `lint-file.ts` (`lint:file`, `lint:staged`), `lint-tests.ts` (`lint:tests`) |
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
