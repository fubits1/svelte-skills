# Browser test flake hygiene

Browser/`msw`/storybook suites are flaky on a single run. Before any "green" claim:

1. `lsof -ti :<test-server-port>`: kill a holder left over from an earlier run of this suite, never another project's live run ([which port](#test-server-port))
2. `rm -rf node_modules/.vite node_modules/.cache/storybook`
3. Run the test ONCE: capture setup time + counts
4. Run AGAIN: counts must match within ±0 tests, setup time within ±30%
5. Run a THIRD time: same

If any of (3)(4)(5) diverge: the suite is flaky. Investigate the flake itself (missing `optimizeDeps.entries`, race in async teardowns, `msw` handler order or a missing `worker.resetHandlers()` in `afterEach`: `svelte-5:msw`) BEFORE claiming any fix works.

A single passing run on this kind of suite tells you nothing about whether your fix worked. It tells you only that ONE possible execution order happened to pass.

## Partial reruns

- Fix loop: `vitest run --last-failed` reruns the failures, `vitest run --since-last-run` (experimental) the tests whose files changed; both need `cache`, and neither run is one of the three ([docs](https://vitest.dev/guide/recipes/affected-tests))
- `--since-last-run` never narrows a browser project and misses new `.env`/`__mocks__` files; `vitest --clearCache` resets both records

## Test-server port

- Ports come from the top-level `api` option, not `browser.api`: `23315` and up, no stable project-to-port mapping; a taken port shifts to the next, `api.strictPort` exits instead ([docs](https://vitest.dev/config/api))
- `Failed to run the test <file path>.` means the file could not reach the server within 60 seconds

## Mid-run dependency optimization

Symptoms: any of the lines below, usually followed by `Vitest failed to find the current suite`, failed dynamic imports, or Svelte errors such as `effect_orphan` in third-party components:

- `dependency optimized: …` or `dependencies optimized: …`, then `optimized dependencies changed. reloading`
- in earlier Vite releases: `✨ new dependencies optimized: …`, then `✨ optimized dependencies changed. reloading`
- Vitest's `Vite unexpectedly reloaded a test`

Vite discovered a dependency after the run started, re-optimized, and reloaded modules under running tests.

1. If the output shows `Failed to run dependency scan. Skipping dependency pre-bundling.`, Vite skipped the scan; dependencies outside `optimizeDeps.include` may then be found while tests run. Read the error printed with it and fix its cause; when it points into a dependency, report it to that package
2. Apply the `optimizeDeps` settings below

Settings:

- `optimizeDeps.entries`: list the files the scanner should start from (for Storybook: `.storybook/preview.ts` plus the `stories` globs from `.storybook/main.ts`, without the leading `../`)
- `optimizeDeps.include`: add each dependency named in the `dependency optimized:` or `dependencies optimized:` line (earlier Vite releases: the `✨ new dependencies optimized:` line), copied verbatim from your own imports
- msw entry points in `optimizeDeps.include`: once the list names one, name every one your code imports, or narrow frames with `frame.protocol` instead of `instanceof`: `msw/browser` without `msw/experimental` loads two copies of msw's classes (`svelte-5:msw`)

## Startup dependency re-optimization

`Re-optimizing dependencies because vite config has changed` at startup, on a run that keeps the deps cache (`node_modules/.vite`, or `node_modules/.cache/storybook` for the storybook project), with no config file edited since the run that wrote that cache, means a hashed config value changes between runs. Compare `optimizeDeps.include` and `exclude` between runs and, on Vite 7 and 8, the rest of the hashed config (Vite plugin names, `resolve`, `root`, `assetsInclude`, `NODE_ENV` or `mode`, and the pre-bundler options with their plugin names: `optimizeDeps.esbuildOptions` on Vite 7, `optimizeDeps.rolldownOptions` on Vite 8; `entries` is not hashed). A list built at config time, e.g. by scanning source files, can change; Vite sorts `include` before hashing it, so the order alone does not trigger the re-optimization. Which other fields Vite 6.4 hashes is not covered here. A command that shows which value changed, and making a changing field stable, are not covered here.

## Test-craft patterns that remove flakes

- **Negative assertions need a settle window and a positive precondition.** `expect(spy).not.toHaveBeenCalled()` right after an action passes because it looked too early. First prove the action happened (a request fired, a value rendered), then wait for the window in which the wrong behavior would show, then assert its absence
- **Non-vacuous precondition (canary).** Before asserting on text that comes from a loaded resource (translations, fixtures), assert the resource loaded: e.g. `expect(t('save'), 'translations not loaded').not.toBe('save')`. Otherwise an unloaded bundle turns every later assertion into a comparison of two raw keys
- **Wait for an observable result, not an internal step.** A request handler that records the body runs before the response arrives. Wait for what the user sees after the save completes (a success message, the updated value), not for "the handler saw the body"
- **Assert that the new view mounted, not that the old one left.** On a loaded CI runner out-transitions can run far longer than locally; `not.toBeInTheDocument()` on the old view times out while the new view is already there
- **Pin a known defect with `it.fails`.** The test documents the bug, stays green while the bug exists, and turns red when someone fixes it
- **"Fails in the full run, passes alone" means shared module state.** A module-level value seeded by an un-awaited async call at import time (an auth token, a config fetch) is won by whichever test or story renders first, so the failing test moves between runs. Run the single file, then the full suite, and look for module-level async initialization
- **Sharding is file-granular.** It spreads files across machines; it does not help when failures concentrate in one file
