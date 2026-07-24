# msw-storybook-addon 2.x → 3.x

The addon's [MIGRATION.md](https://github.com/mswjs/msw-storybook-addon/blob/main/MIGRATION.md) is the reference for the API delta — run `msw-storybook-migrate` and follow it. This page carries only what that guide gets wrong or omits **for Svelte CSF**, measured 2026-07 against `msw-storybook-addon@3.0.0`, `msw@2.15.0`, `storybook@10.5`, `@storybook/addon-svelte-csf@5.1`, `@storybook/addon-vitest@10.5.3`, Vitest 4.1 — in a four-story Svelte CSF probe, three clean-cache runs, 4/4 passing each. Re-verify against any later release.

## Three corrections to the migration guide

**1. `parameters.msw` is not dead.** MIGRATION.md presents `beforeEach({ msw })` as its replacement. The v3 loader still resolves `parameters.msw`; the deprecation warning fires only when `parameters.csfFactory === true`, i.e. CSF Next. The codemod says so itself when it cannot finish a file: _"the addon still supports `parameters.msw`, so everything keeps working until you migrate."_ Existing Svelte stories need no rewrite.

**2. CSF Next is not available to you.** `@storybook/addon-svelte-csf` has no `definePreview` support, so the `addonMsw()` recipe in the addon README does not apply, and the codemod's closing suggestion to run `storybook automigrate csf-factories` should not be followed in a Svelte CSF project. Stay on the `/csf3` entry point.

**3. The codemod does nothing for `.stories.svelte`.** Its default glob is `**/*.{stories,story}.{js,jsx,ts,tsx,mjs,mjsx,mts,mtsx}` — no `.svelte`. On a Svelte-only project it migrates the config and reports `No story files matched glob`. Adding `.svelte` to `--glob` is worse than useless: the file matches, a JS/TS AST pass runs over Svelte markup, and the run reports it _"already up to date"_ — no error, and no entry in the skipped-stories report. Silence means "not migrated", not "nothing to migrate".

What the codemod _does_ cover — `preview.*` and `main.*` — it does correctly, including carrying the old `initialize()` options through into `worker.start()`.

## Beyond the codemod's reach

| Thing | Change |
| --- | --- |
| `vitest.config` `optimizeDeps.include` | `msw-storybook-addon` → `msw-storybook-addon/csf3`. Outside the codemod's scope; a stale entry only ever shows up as intermittent `Vitest failed to find the current suite` |
| `tsconfig` `types` | `msw-storybook-addon/csf3` for CSF 3 (`/types` for CSF Next) |
| `package.json` | the version bump itself |

[Storybook's own MSW page](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests) still documents the 2.x API. If a sample calls `initialize()`, it is 2.x.

## Where baseline handlers must live

The loader calls `worker.resetHandlers()` before every story, then applies that story's `parameters.msw`. Handlers passed to `setupWorker(...)` inside the setup function are what the reset restores to, so they survive. Handlers put in project-level `preview.parameters.msw` do not: Storybook's [`combineParameters`](https://github.com/storybookjs/storybook/blob/next/code/core/src/preview-api/modules/store/parameters.ts) overwrites arrays rather than merging, so any story declaring its own `parameters.msw` drops the project-level set entirely — silently, and only for the stories that override something.

Passing no setup function is valid: `mswLoader()` then starts a handler-less worker with `quiet: true` and an `onUnhandledRequest` that ignores common asset and Storybook-internal requests. Use it only when you have no baseline handlers, since there is nowhere else to put them.

## Hook order

| # | Phase |
| --- | --- |
| 1 | `loaders` — `mswLoader()` starts/reuses the worker, resets handlers, applies `parameters.msw`, sets `context.msw` |
| 2 | meta `beforeEach` |
| 3 | story `beforeEach` — `context.msw` is available here |
| 4 | `play` |
| 5 | decorators |
| 6 | story `afterEach`, then meta `afterEach` |

Storybook pins this in its own `order-of-hooks` template story, so it is safe to rely on — and it is why both `parameters.msw` and `beforeEach({ msw })` work on CSF 3.

## Staged migration

`parameters.msw` surviving means the version bump and the API rewrite are separable:

1. Bump the dependency.
2. Fix `preview.*` — mandatory, since `initialize` no longer exists and a bare `mswLoader` is no longer a loader.
3. Update the `optimizeDeps` and `tsconfig` specifiers.
4. Leave stories alone; move individual ones to `beforeEach({ msw })` when you touch them for other reasons.
