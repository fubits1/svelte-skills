# Browser test flake hygiene

Browser/MSW/storybook suites are flaky on a single run. Before any "green" claim:

1. `lsof -ti :<test-server-port>`: kill any holder
2. `rm -rf node_modules/.vite node_modules/.cache/storybook`
3. Run the test ONCE: capture setup time + counts
4. Run AGAIN: counts must match within ±0 tests, setup time within ±30%
5. Run a THIRD time: same

If any of (3)(4)(5) diverge: the suite is flaky. Investigate the flake itself (missing `optimizeDeps.entries`, race in async teardowns, MSW handler order or a missing `worker.resetHandlers()` in `afterEach`: `svelte-5:msw`) BEFORE claiming any fix works.

A single passing run on this kind of suite tells you nothing about whether your fix worked. It tells you only that ONE possible execution order happened to pass.

## Mid-run dependency optimization

Symptoms: `✨ new dependencies optimized: …` or `Re-optimizing dependencies` in the output, followed by `Vitest failed to find the current suite`, failed dynamic imports, or Svelte errors such as `effect_orphan` in third-party components. Vite discovered a dependency after the run started, re-optimized, and reloaded modules under running tests.

- Vite 8's Rolldown dependency scanner could not read `.svelte` files, so a bare import reachable only through a `.svelte` file was discovered mid-run. Storybook fixed this for its Vitest addon in [PR #34783](https://github.com/storybookjs/storybook/pull/34783); on older addon versions, seed the imports yourself
- `optimizeDeps.entries`: list the files the scanner should start from (for Storybook: `.storybook/preview.ts` plus the `stories` globs from `.storybook/main.ts`, without the leading `../`)
- `optimizeDeps.include`: add each dependency named in the "new dependencies optimized" line, copied verbatim from your own imports. If you build the list at config time (e.g. by scanning source files), sort it: a list whose order changes between runs was observed to trigger `Re-optimizing dependencies because vite config has changed` on every run

## Test-craft patterns that remove flakes

- **Negative assertions need a settle window and a positive precondition.** `expect(spy).not.toHaveBeenCalled()` right after an action passes because it looked too early. First prove the action happened (a request fired, a value rendered), then wait for the window in which the wrong behavior would show, then assert its absence
- **Non-vacuous precondition (canary).** Before asserting on text that comes from a loaded resource (translations, fixtures), assert the resource loaded: e.g. `expect(t('save'), 'translations not loaded').not.toBe('save')`. Otherwise an unloaded bundle turns every later assertion into a comparison of two raw keys
- **Wait for an observable result, not an internal step.** A request handler that records the body runs before the response arrives. Wait for what the user sees after the save completes (a success message, the updated value), not for "the handler saw the body"
- **Assert that the new view mounted, not that the old one left.** On a loaded CI runner out-transitions can run far longer than locally; `not.toBeInTheDocument()` on the old view times out while the new view is already there
- **Pin a known defect with `it.fails`.** The test documents the bug, stays green while the bug exists, and turns red when someone fixes it
- **"Fails in the full run, passes alone" means shared module state.** A module-level value seeded by an un-awaited async call at import time (an auth token, a config fetch) is won by whichever test or story renders first, so the failing test moves between runs. Run the single file, then the full suite, and look for module-level async initialization
- **Sharding is file-granular.** It spreads files across machines; it does not help when failures concentrate in one file
