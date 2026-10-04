# Vitest 4 to 5 upgrade checklist

Source: [Migrating to Vitest 5.0](https://vitest.dev/guide/migration) unless an item says otherwise. Items 0a-0f are the changes most likely to break a Svelte browser suite; details in [config-projects.md](config-projects.md) (0a, 0b), [browser-mode.md](browser-mode.md) (0c, 0f), [assertions.md](assertions.md) (0d), and [visual-regression.md](visual-regression.md) (0e).

- 0a. Inline `test.projects` inherit the root config by default (`extends` defaults to `true`); `extends: false` opts out. Do not repeat root plugins in a project
- 0b. `sharedViteServer` defaults to `true`: inline projects that don't change the Vite config share one server, and the root config's plugin `config` hooks run once
- 0c. Browser locators match text exactly by default; `{ exact: false }` per call or `browser.locators.exact: false`
- 0d. `toHaveTextContent` is strict equality without `RegExp`; partial and regex matching moved to `toMatchTextContent`
- 0e. `toMatchScreenshot` references use `browser.expect.toMatchScreenshot.screenshotDirectory` (default `__screenshots__`); set it if you set `browser.screenshotDirectory`
- 0f. `render` from `vitest-browser-svelte` (and `vitest-browser-vue`) returns a promise: `await render(...)`

1. Runtime floor: Node `>=22.12` and Vite `>=6.4`. Check `pnpm view vitest engines peerDependencies` for the exact ranges of the version you install. `vite` is now a peer dependency; Yarn users must add it to `package.json` themselves
2. Bump every `@vitest/*` package to the same version as `vitest`: `@vitest/browser-playwright` declares an exact-version peer on `vitest` (check with `pnpm view @vitest/browser-playwright peerDependencies`)
3. `clearMocks` is `true` by default. Mock call history is cleared before every test. Calls recorded in a setup file, at module scope, or in `beforeAll` are gone when the test asserts on them. A `beforeEach(() => vi.clearAllMocks())` is now redundant unless the config sets `clearMocks: false`
4. `vi.mock`, `vi.unmock`, `vi.hoisted` must be at the top level. Inside `describe`, `test`, a function, or a block they now throw (`was defined outside of the module's top level scope`). `vi.doMock` / `vi.doUnmock` are not hoisted and may stay anywhere
5. Browser automocks return `undefined`. A `vi.mock(path)` with no factory in browser mode no longer calls the real implementation. Use `vi.mock(path, { spy: true })` to keep the real code while tracking calls
6. Class mocks keep prototype methods. Instances of `vi.fn(MyClass)` now have the class's methods and pass `instanceof MyClass`. Tests that relied on those methods being `undefined` change behavior
7. `-t` / `testNamePattern` matches the `' > '`-joined full name. `-t 'math adds'` no longer matches `describe('math') > test('adds')`; use `-t 'math > adds'`, a single segment, or `-t 'math.*adds'`
8. `expect.poll` rejects on timeout. A callback or assertion that settles after `timeout` now fails with `expect.poll() function didn't resolve in time.` (callback) or `expect.poll() assertion didn't resolve in time.` (assertion). Raise `timeout` where the wait is legitimate. The callback receives `{ signal }` to cancel in-flight work
9. Unawaited async assertions fail the test. `expect(p).resolves…`, `.rejects…`, and `toMatchFileSnapshot` must be awaited
10. `test.sequential`, `describe.sequential`, and `{ sequential: true }` are removed. Use `{ concurrent: false }`
11. `toThrow('')` matches any message. To assert an empty message use `toThrow(/^$/)`
12. Assertion types take two parameters. `Assertion<string>` becomes `Assertion<void, string>` (sync) or `Assertion<Promise<void>, string>` (async). Custom matchers augment `Matchers<R, T>`; `jest.Matchers` is no longer read
13. Vitest formats values with `pretty-format` instead of `loupe` when it inspects them. Snapshots or assertions that capture inspected output may need updating. In `test.each` / `test.for` titles, string values in `$` placeholders lose their quotes (`case 'a1'` becomes `case a1`), and the new `taskTitleValueFormatTruncate` option (default `40`) sets the length limit
14. Custom browser commands get a `SerializedLocator`. Destructure `{ selector }` instead of taking a string
15. `browser.api` is ignored. Move it to the top-level `api` option. `browser.isolate` now warns; use top-level `isolate`
16. Artifacts live in `.vitest/`. Attachments `.vitest/attachments/`, failure screenshots `.vitest/attachments/failure-screenshots/`, blob reports `.vitest/blob/`, HTML reporter `.vitest/index.html` (option `outputDir`, not `outputFile`). The `json` and `junit` reporters now write `.vitest/json/output.json` and `.vitest/junit/output.xml` instead of stdout; a script that pipes `--reporter=json` into `jq` breaks. Use the artifact file or `reporters: [['json', { stdout: true }]]`. Add `.vitest` to `.gitignore`
17. Config files are not looked up in parent directories. Running `vitest` from a subdirectory needs `--config ../vitest.config.ts`, plus `--dir` to scope test discovery to that subdirectory
18. A referenced project config that declares `projects` now becomes a container of nested projects (`app (unit)`, `app (e2e)`). Vitest 4 ignored that field. The usual trap is a package config built with `mergeConfig(rootConfig, …)` where the root defines `test.projects`: it usually fails at startup with `Projects definition references a non-existing file or a directory`, `No projects were found in "..."`, or a circular `projects` error. Merge a shared config without `projects` instead
19. Fake timers and `vi.setSystemTime()` now also mock `Temporal.Now` when `Temporal` exists on the global object (native or a global polyfill). Keep it real with `vi.useFakeTimers({ toNotFake: ['Temporal'] })`
20. In `jsdom` / `happy-dom`, assignments to `globalThis` or `window` now reach the DOM implementation (e.g. `innerWidth` affects happy-dom's `matchMedia`). Custom environments: `populateGlobal`'s `originals` now holds property descriptors; restore with `Object.defineProperty`
21. `VITEST_POOL_ID` and `VITEST_WORKER_ID` start at `1`. Custom reporters: `testModule.diagnostic()` exposes the 1-based `workerId` and a new `concurrencyId`
22. Coverage. `coverage.include` / `exclude` match project-root-relative paths without `contains` (`'src'` means `src/**`). Glob thresholds no longer inherit `perFile`
23. Benchmarks. `bench` is a test-context fixture: `test('sort', async ({ bench }) => { await bench('sort', fn).run() })`. `bench.skip/only/todo`, `benchmark.reporters`, `benchmark.outputFile`, `benchmark.compare` / `--compare`, `benchmark.outputJson` / `--outputJson` are removed. The `Vitest` instance `mode` is always `'test'`
24. Packages. `vitest` bundles its assertions and no longer shares state with `@vitest/expect`: register matchers through `expect.extend` from `vitest`. `@vitest/runner` and `@vitest/ws-client` are deprecated. `@vitest/browser-webdriverio` moved to the vitest-community organization
25. Removed entry points. `vitest/coverage`, `vitest/reporters` (use `vitest/node`); `vitest/environments`, `vitest/snapshot` (use `vitest/runtime`); `vitest/runners`, `vitest/suite` (use `TestRunner` from `vitest`); `vitest/mocker` (use `@vitest/mocker`); `vitest/internal/module-runner`
26. Programmatic API. `resolveConfig` from `vitest/node` returns the resolved Vite config; the Vitest config is on its `test` property
27. Vitest UI and the browser orchestrator need the printed URL. The UI requires the `?token=` URL Vitest prints; `/__vitest_test__/` requires its `sessionId`

## Post-upgrade cleanup

Leftovers that still pass on Vitest 5 but are redundant or misleading:

- Explicit `extends: true` on inline projects: it is the default now, and setting it hides the duplicate-plugin warning
- `beforeEach(() => vi.clearAllMocks())` in setup files and tests, a manual `mockClear()` as the first line of a test (a `mockClear()` between two steps inside one test is not redundant), and `vi.clearAllMocks()` right after `vi.restoreAllMocks()`: `clearMocks: true` already does this
- `{ exact: true }` on locators: exact is the default
- Comments and workarounds that name a Vitest 4.x condition ("remove once we are off Vitest 4"): re-check each one, the condition may be met
- An empty `.vitest-attachments/` directory (the migration guide spells the old default `.vitest-attachements/`; check for both) and its `.gitignore` entry: artifacts now go to `.vitest/`
- Old failure screenshots inside `__screenshots__/`: Vitest 4 wrote them there, Vitest 5 writes them to `.vitest/attachments/failure-screenshots/` (migration guide), so anything left in `__screenshots__/` that is not a reference image is stale
