# Config, projects, reporters

## Projects inherit the root (Vitest 5)

- **`test.projects`** for mixed node/browser and Storybook. Inline projects **inherit the root config by default** (`extends: true`), including `plugins`, `resolve`, `optimizeDeps`, and `setupFiles`. Arrays such as `setupFiles` concatenate: a project's own `setupFiles` run after the root's. Never inherited: `name`, `projects`, and the root `globalSetup` (it runs once per test run; listed in each project's own `globalSetup` instead, it runs once per project); a `globalSetup` in a non-root config file that `extends` points to is inherited ([projects guide](https://vitest.dev/guide/projects#configuration)). **`extends: false`** opts a project out; **`extends: './vite.config.ts'`** inherits that file instead of the root. Projects referenced as config files or directories inherit nothing (the root's `tags` still reach them: Test tags below). Storybook: [Storybook Vitest example](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) with `mergeConfig(viteConfig, …)`; put `test` + project-specific `plugins` on each project (`svelte-5:storybook-vitest`)
- In `test.projects`, put only what differs on each inline project. **NEVER repeat an inherited root plugin inside an inline project**: a second `svelte()` compiles each component twice and fails with a `vite-plugin-svelte:compile` error such as `'new.target' can only be used in functions and class static block`. Vitest warns "applies the same plugin multiple times", but an explicit `extends: true` on the project hides that warning. A project with **`extends: false`** inherits nothing (the root's `tags` still reach it) and lists its own plugins (e.g. an SSR node project that needs `svelte()` but not the browser setup). Keep browser-only setup files such as an MSW `setupWorker` file on the browser project, not in root `setupFiles` (`svelte-5:msw`)
- **`sharedViteServer`** (default `true`): inline projects that don't change the Vite config share the Vite server of the config that declares them (the root, or a nested-projects config) and its transform cache. Vitest then executes that declaring config file once, so its plugins are instantiated once and their `config` hooks run once, not per project; `sharedViteServer: false` restores per-project servers. A project gets its own server when it sets Vite-level options that change the server (e.g. `plugins`, `resolve`; an empty `plugins` list and `define` do not count), sets a test option that affects the Vite config (`alias`, `browser`, `css`, `deps.moduleDirectories`, `deps.optimizer`, `mode`, `root`), or has an `extends` that does not point to the declaring config (`extends: false` included). `env`, `setupFiles`, `server.deps` and `environment` do not prevent sharing ([docs](https://vitest.dev/config/sharedviteserver)). `DEBUG=vitest:projects` logs which project shares and which creates a server
- When `vitest.config.ts` merges a function-form `vite.config` (`defineConfig(({ mode }) => …)`), resolve it first and pass the env through: `defineConfig(async (env) => mergeConfig(await resolveViteConfig(env), testConfig))` (full shape in `svelte-5:storybook-vitest`, `references/config.md`)
- Dev-only Vite settings (a dev-server proxy to a backend, for example) can branch on `process.env.VITEST`, which Vitest sets for every run

## Test tags (CI exclusion)

Tags filter tests at runtime. Define each tag in the config before you use it: an undefined tag throws.

**Config:** define tags in the root `test` block. Vitest adds the root's tags to every project, including one with its own `tags`, one with `extends: false` and one referenced as a config file. A tag that only one project defines reaches the other projects in a full run, but throws there when `--project` leaves the defining project out.

```ts
test: {
  tags: [
    { name: 'ci-skip', description: 'needs recorded fixtures or live backend' }
  ],
}
```

**Test file:**

```ts
describe('my suite', { tags: ['ci-skip'] }, () => { /* … */ })
// or on individual tests:
it('needs backend', { tags: ['ci-skip'] }, () => { /* … */ })
```

**CLI filter:**

```bash
vitest --tags-filter='!ci-skip'          # exclude
vitest --tags-filter='unit || e2e'       # include
vitest --tags-filter='(unit || e2e) && !slow'  # combine
```

**Critical:** tags only skip the test _body_, the file is still **imported**. If the import itself throws (e.g. MSW handlers throwing on missing fixtures: `svelte-5:msw`), the tag won't help. Module-level code must be import-safe (warn, don't throw).

**Critical:** `pnpm test -- --tags-filter='!ci-skip'` does NOT work. pnpm passes the `--` itself on to vitest, which then ignores the filter and runs the tagged tests too (for a file with one tagged and one untagged test: `Tests 2 passed (2)` instead of `1 passed | 1 skipped`). Use a dedicated script: `"test:ci": "vitest --run --tags-filter='!ci-skip'"`, or pass the flag without `--`.

## Reporters and report files

- Put report paths in `test.outputFile`, not in the reporter's options. A path in the options wins over `--outputFile.<reporter>=…` on the CLI, so a script cannot redirect it; a path in `test.outputFile` can be overridden. The HTML reporter is the exception: it writes `<outputDir>/index.html`, with `outputDir` in the reporter's options (default `.vitest`)
- Two `vitest` invocations in one pipeline (e.g. `node`+`browser`, then `storybook`) overwrite each other's reports unless the second script passes its own `--outputFile.junit=…`
- `['junit', { includeConsoleOutput: false }]` keeps console traffic out of the XML. Storybook and browser projects log a lot, and with console output included the XML grows with every log line

```ts
test: {
  reporters: ['default', ['junit', { includeConsoleOutput: false }]],
  outputFile: { junit: './reports/junit.xml' },
}
```

```json
{ "test:storybook": "vitest run --project storybook --silent --outputFile.junit=./reports/junit-storybook.xml" }
```

## Coverage thresholds

`coverage.thresholds` accepts `lines`, `functions`, `branches`, `statements`, `perFile`, `autoUpdate`, `100`, and glob patterns as keys ([docs](https://vitest.dev/config/coverage#coverage-thresholds)). Any other key is read as a glob. The Jest shape `thresholds: { global: { lines: 80 } }` therefore matches a directory named `global/` and enforces nothing: write the metrics flat.

```ts
coverage: {
  thresholds: { statements: 55, branches: 42, functions: 50, lines: 55 },
}
```
