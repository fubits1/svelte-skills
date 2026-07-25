# msw-storybook-addon 2.x to 3.x

Run [MIGRATION.md](https://github.com/mswjs/msw-storybook-addon/blob/main/MIGRATION.md) and its codemod first; it owns the API delta and this page does not repeat it. What follows is only what a Svelte CSF project needs on top. The versions everything here was run against are in the skill's `compatibility` field; re-verify before trusting any of it against a later release.

## The CSF 3 path is deprecated, and there is a way off it

Upstream schedules both halves of the CSF 3 path for deletion. MIGRATION.md: _"The loader API is deprecated and will be removed in the next major release. It keeps working in v3, respecting the `parameters.msw` you set."_ And, under a heading reading "parameters.msw is deprecated in favor of beforeEach": _"`parameters.msw` keeps working in v3 in CSF 3.0 setups only — it is preserved to make migration easier and will be removed in the next major release."_

The migration guide's answer is CSF Next, which Svelte cannot use: `definePreview` is missing from the Svelte **renderer** (`code/renderers/svelte` exports only public-types and portable-stories, while react, vue3 and web-components each ship a `preview` entry). Do not run `storybook automigrate csf-factories`, which the codemod suggests on exit.

But CSF Next is not the only escape. `msw-storybook-addon/preview` exports `createPreviewAnnotations`, which returns plain project annotations: a `beforeEach` that assigns `context.msw` and resets handlers after each story. No `definePreview`, nothing deprecated, and it spreads straight into a CSF 3 preview default export.

**It is not a drop-in.** Measured on a four-story Svelte CSF probe, two consecutive runs: baseline handlers, `beforeEach({ msw })` overrides and the per-story reset all work, while **`parameters.msw` is silently ignored**. Only `csf3.ts` reads that parameter; the preview annotations never look at it. Adopting this path without rewriting your stories drops every existing override with no error.

The full non-deprecated combination is three things together:

1. `preview.ts` spreads `createPreviewAnnotations(setup)` instead of registering `mswLoader()`
2. every per-story override becomes `beforeEach={({ msw }) => msw.use(...)}` on `<Story>`
3. `optimizeDeps.include` names `msw-storybook-addon/preview`

Skip step 3 and the suite dies at import with `Vitest failed to find the current suite`, because the new specifier is discovered mid-run and restarts the optimizer. That is measured, not inferred.

Staying on `mswLoader()` with `parameters.msw` remains valid until the next major; it is the smaller diff and the thing the codemod produces.

One detail is source-only, not in any doc: the deprecation **warning** fires only when `parameters.csfFactory === true` (`src/csf3.ts`), and its text is about `mswLoader`, not `parameters.msw`. There is no runtime warning for `parameters.msw` at all, so silence says nothing about either.

## What the codemod will not do for `.stories.svelte`

Its default glob is `**/*.{stories,story}.{js,jsx,ts,tsx,mjs,mjsx,mts,mtsx}`, with no `.svelte`. Confirm with `npx msw-storybook-migrate --help`, which prints the glob, and preview any run with `--dry-run` rather than trusting the value copied here.

On a Svelte-only project it migrates the config and reports `No story files matched glob`. Adding `.svelte` to `--glob` is worse than useless: the file matches, the JS/TS AST pass cannot parse Svelte markup, and the transform swallows the failure and returns no change, so the run counts the file as _"already up to date"_ with no error and no entry in the skipped-stories report. A silent run there means the file was not migrated.

## Where the baseline lives, and the trap upstream gets wrong

The README already tells you handlers passed to `setupWorker()` survive the automatic reset between stories. What no document says is the other half: **project-level `preview.parameters.msw` usually does not survive**, because Storybook's `combineParameters` overwrites arrays and only deep-merges plain objects. A story declaring `msw: [...]` or `msw: { handlers: [...] }` drops the project-level set, with no warning, and only for the stories that override something. The exception is the addon's named-Record form, `msw: { handlers: { auth: [...], feed: [...] } }`, which is a plain object and therefore merges by key, so project-level groups survive unless a key collides.

That contradicts the addon README's own CSF 3.0 example, which puts `parameters: { msw: [...initialHandlers] }` at project level. Put baseline handlers in `setupWorker(...)` instead.

Storybook's [parameters doc](https://storybook.js.org/docs/writing-stories/parameters) says only that parameters are merged and "never dropped", which is what makes the array case surprising.

## Version-keyed values the codemod does not touch

- `optimizeDeps.include`: name whichever entry point your `preview.ts` imports, `msw-storybook-addon/csf3` on the loader path or `msw-storybook-addon/preview` on the annotations path. Measured on Vite 8.1.5, the three outcomes differ sharply. A specifier that does not resolve (the 3.x path on a 2.x install) aborts the run before any test executes (`"./csf3" is not exported under the conditions [...]`, `Test Files no tests`). A stale-but-resolvable one (the bare 2.x specifier on 3.x) passes with no warning while pre-bundling a module nothing imports. A **missing** one lets Vite discover the dependency mid-run, restart the optimizer and kill the suite with `Vitest failed to find the current suite`, which is the failure the whole entry exists to prevent. `svelte-5:storybook-vitest` owns this trap, alongside [Storybook's own FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) on dependency optimization.
- `tsconfig` `types`: `msw-storybook-addon/csf3`.
- The `package.json` version bump itself.

## Which override form works on which major

`parameters.msw` works on both. `beforeEach({ msw })` is 3.x only: v2.0.7's loader is three statements and never assigns `context.msw`, so the argument is `undefined` there. Verified by running both majors against the same four stories.

Both majors reset handlers before each story, so the baseline rule above is not new in 3.x. Only its location moved, from the second argument of `initialize()` to `setupWorker(...)`.

`mswLoader()` runs during `loaders`, before meta and story `beforeEach`, which is why the `beforeEach` form can reach `context.msw` at all on 3.x.

## Staged migration

Bump the dependency, fix `preview.*` (mandatory: `initialize` is gone and a bare `mswLoader` is no longer a loader), then update the `optimizeDeps` and `tsconfig` specifiers. Stories can stay on `parameters.msw` while it lasts, knowing it is scheduled for removal.
