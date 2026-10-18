# `msw-storybook-addon` 2 to 3

Follow [MIGRATION.md](https://github.com/mswjs/msw-storybook-addon/blob/main/MIGRATION.md) and run its codemod first; it owns the API delta, which is not repeated here. The versions everything here was run against are in the skill's Verified line; re-verify before trusting any of it against a later release.

The addon's own 2 to 3 bump below assumes msw 2. MIGRATION.md's custom-setup example writes `worker.start({ onUnhandledRequest: 'bypass' })`, which msw 3 ignores, and the msw maintainer advises against msw 3 with addon 3: read `references/msw-3.md` before bumping msw itself. Addon 3 needs Storybook 9 or later, removes `mswDecorator` (use `mswLoader()`), and drops its built-in Node.js support; stories rendered in Node.js still work through a custom setup function that starts `setupServer` (MIGRATION.md).

## The CSF 3 path is deprecated, and there is a way off it

MIGRATION.md schedules both halves of the CSF 3 path for deletion. It calls the loader API deprecated, still working in addon 3 with the `parameters.msw` you set, and due for removal in the next major release. Under its heading "parameters.msw is deprecated in favor of beforeEach", it says `parameters.msw` keeps working in addon 3 in CSF 3 setups only, preserved to ease migration, and will be removed in the next major release.

The migration guide's answer is CSF Next, which Svelte cannot use: `definePreview` is missing from the Svelte renderer (`code/renderers/svelte` exports only public-types and portable-stories, while react, vue3 and web-components each ship a `preview` entry). Do not run `storybook automigrate csf-factories`, which the codemod suggests on exit.

`msw-storybook-addon/preview` offers a second way off the CSF 3 path, `createPreviewAnnotations`. It returns plain project annotations, a `beforeEach` that assigns `context.msw` and resets handlers after each story. It needs no `definePreview` and no deprecated API, and it spreads straight into a CSF 3 preview default export.

It is no drop-in replacement (measured): baseline handlers, `beforeEach({ msw })` overrides and the per-story reset all work, but it ignores `parameters.msw` without a warning. Only `csf3.ts` reads that parameter; the preview annotations never look at it. Adopting this path without rewriting your stories drops every existing override with no error.

The full non-deprecated combination is three things together:

1. `preview.ts` spreads `createPreviewAnnotations(setup)` instead of registering `mswLoader()`
2. every per-story override becomes `beforeEach={({ msw }) => msw.use(...)}` on `<Story>`
3. `optimizeDeps.include` names `msw-storybook-addon/preview`

Skip step 3 and the suite dies mid-run with `Vitest failed to find the current suite`: Vite discovers the new specifier while importing the preview and restarts the optimizer (measured).

On this path, keep the addon out of `addons` in `.storybook/main.ts`, although the README's CSF 3 setup lists it there and the codemod adds it (`codemod/src/bin.ts` registers it in `addons`; remove it again) (read from the addon's `src/addon.ts` and `src/preview.ts`, not measured). A listed addon brings its own preview annotations, the default export of `msw-storybook-addon/preview`: `createPreviewAnnotations()` with the default setup, a worker without handlers. Its `beforeEach` and yours share one module-level worker and return early once `context.msw` is set, so whichever runs first decides the worker, and your `setup` with the baseline handlers may never run. The `mswLoader()` path is not affected: the loader sets `context.msw` before any `beforeEach` runs, and the addon's annotations then step aside (its source comment says so).

Staying on `mswLoader()` with `parameters.msw` remains valid until the next major, and it is the smaller diff. The codemod keeps `mswLoader()` in the preview but rewrites `parameters.msw` in JS/TS stories, and at preview level, to `beforeEach({ msw })` (the addon's `codemod/src/bin.ts`). It never matches `.stories.svelte` files (next section), so in a Svelte CSF project those stay on `parameters.msw`.

The README leaves out that the deprecation warning fires only when `parameters.csfFactory === true` (`src/csf3.ts`), and its text is about `mswLoader`, not `parameters.msw`. Nothing warns at runtime about `parameters.msw`, so silence says nothing about either.

## What the codemod will not do for `.stories.svelte`

Its default glob is `**/*.{stories,story}.{js,jsx,ts,tsx,mjs,mjsx,mts,mtsx}`, with no `.svelte`. Confirm with `npx msw-storybook-addon migrate --help` (older addon 3 releases referenced a `msw-storybook-migrate` bin, fixed in a [patch release](https://github.com/mswjs/msw-storybook-addon/releases)), which prints the glob, and preview any run with `--dry-run` rather than trusting the value copied here.

On a Svelte-only project it migrates the config and reports `No story files matched glob`. Adding `.svelte` to `--glob` hides the failure: the file matches, the JS/TS AST pass cannot parse Svelte markup, and the transform swallows the failure and returns no change, so the run counts the file as _"already up to date"_ with no error and no entry in the skipped-stories report. A silent run there means the file was not migrated.

## Where the baseline lives, and the trap upstream gets wrong

The README says handlers passed to `setupWorker()` survive the automatic reset between stories. Project-level `preview.parameters.msw` in its array and `handlers: [...]` forms does not survive a story that sets its own, because Storybook's `combineParameters` overwrites arrays and only deep-merges plain objects. A story declaring `msw: [...]` or `msw: { handlers: [...] }` drops the project-level set, with no warning, and only for the stories that override something. The exception is the addon's named-Record form, `msw: { handlers: { auth: [...], feed: [...] } }`, which is a plain object and therefore merges by key, so project-level groups survive unless a key collides.

That contradicts the addon README's own CSF 3 example, which puts `parameters: { msw: [...initialHandlers] }` at project level. Put baseline handlers in `setupWorker(...)` instead.

Storybook's [parameters doc](https://storybook.js.org/docs/writing-stories/parameters) says only that parameters are merged and "never dropped", so the array case surprises readers of that page.

## Version-keyed values the codemod does not touch

- `optimizeDeps.include`: name whichever entry point your `preview.ts` imports, `msw-storybook-addon/csf3` on the loader path or `msw-storybook-addon/preview` on the annotations path. The three outcomes differ (measured). An unexported subpath of an installed package (the addon 3 path on an addon 2 install) aborts the run before any test executes (`"./csf3" is not exported under the conditions [...]`, `Test Files no tests`). A stale-but-resolvable one (the bare addon 2 specifier on addon 3) passes with no warning while pre-bundling a module nothing imports; `/csf3` is not listed in that case either, and why it then passed while the missing case failed was not investigated. A missing one lets Vite discover the dependency mid-run, restart the optimizer and kill the suite with `Vitest failed to find the current suite`, the failure this entry prevents. `svelte-5:storybook-vitest` owns this trap, alongside [Storybook's own FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) on dependency optimization
- `tsconfig` `types`: `msw-storybook-addon/csf3`, which the addon README's "Types" section asks for on "CSF 3.0, or any setup where the stories are compiled without `.storybook/preview.ts`"; the same section says the augmentation ships with every entry point, so a program that already includes `.storybook/preview.ts` gets the types without it
- the `package.json` version bump itself

## Which override form works on which major

`parameters.msw` works on both. `beforeEach({ msw })` is addon 3 only: addon 2's loader is three statements and never assigns `context.msw`, so the argument is `undefined` there (measured on both majors with the same stories).

Both majors reset handlers before each story; addon 3 moved the baseline from the second argument of `initialize()` to `setupWorker(...)`.

`mswLoader()` runs during `loaders`, before meta and story `beforeEach`, so on addon 3 the `beforeEach` form can read `context.msw`.

## Staged migration

The same steps by hand, for a project that skips the codemod or to check what it changed:

1. Bump the dependency
2. Fix `preview.*`, which is required: `initialize` and `mswDecorator` are gone, and a bare `mswLoader` is no longer a loader
3. Update the `optimizeDeps` and `tsconfig` specifiers

Between steps 2 and 3, `preview.ts` imports `msw-storybook-addon/csf3` while `optimizeDeps.include` does not list it, which is the "missing" outcome above, so run the suite only after step 3. The preview change in step 2:

```diff
-import { initialize, mswLoader } from "msw-storybook-addon";
-initialize({ onUnhandledRequest: "warn" }, handlers);
+import { setupWorker } from "msw/browser";
+import { mswLoader } from "msw-storybook-addon/csf3";

 export default {
-  loaders: [mswLoader],
+  loaders: [
+    mswLoader(async () => {
+      const worker = setupWorker(...handlers);
+      await worker.start({ onUnhandledRequest: "warn" });
+      return worker;
+    }),
+  ],
 };
```

A setup function of your own replaces addon 3's default setup, which starts the worker with `quiet: true` and skips asset and Storybook-internal requests (`src/addon.ts`); add `quiet: true` and that filter if you want the same behaviour (the addon's filter is `isCommonStorybookRequest` in `src/addon.ts`; `references/storybook.md` names the URLs it skips).
