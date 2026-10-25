# Storybook wiring for Svelte CSF

This page covers `msw-storybook-addon` 3, which needs Storybook 9 or later, with msw 3 and `@storybook/addon-svelte-csf`. SvelteKit 3 runs on Vite 8, which no 9.x `@storybook/sveltekit` accepts: use Storybook 10 with a release whose Vite peer includes 8 (`pnpm view @storybook/sveltekit@10 peerDependencies.vite`). On Vitest 5, the Vitest storybook project needs Storybook 10, the first major whose `@storybook/addon-vitest` peers on Vitest 5; pick a release whose peer range includes it (`pnpm view @storybook/addon-vitest@10 peerDependencies.vitest` lists every 10.x release).

## Contents

- Setup order
- Upstream sources that mislead a Svelte reader
- The `preview.ts` loader
- Where the baseline lives
- Per-story overrides
- Leaving the deprecated CSF 3 path
- What the addon's codemod will not do for `.stories.svelte`

## Setup order

1. Install both packages: `pnpm add -D msw msw-storybook-addon`
2. Register `mswLoader(setup)` in `.storybook/preview.ts`, with the baseline handlers in its `setupWorker(...)` (the `preview.ts` loader, where the baseline lives). The Storybook handler set comes from your mocks index (handlers reference, one handler set per surface). Add `".storybook/**/*.ts"` to the tsconfig `include` that your `check` script uses, or nothing in `preview.ts` is type-checked; a plain `".storybook"` entry matches no file
3. Serve the worker script to Storybook: `msw()` in the Vite config serves `storybook dev` (open `/mockServiceWorker.js` on its origin to confirm); a built Storybook needs a committed file in Vite's `publicDir` (the worker-script bullets under the `preview.ts` loader)
4. Override per story with `beforeEach={({ msw }) => msw.use(...)}` on `<Story>` (per-story overrides)
5. Run `pnpm exec vitest run --project storybook --silent=false` (`storybook` being your storybook project's name; append a story file `<file>` to narrow it) and fix every unhandled-request warning, then take the three runs from the skill's Verify section

## Upstream sources that mislead a Svelte reader

- The addon's README and MIGRATION.md route you to CSF Next, which `@storybook/addon-svelte-csf` does not support: `definePreview` is missing from the Svelte renderer (`pnpm view @storybook/svelte exports` lists no `./preview`). Do not run `storybook automigrate csf-factories`, which the addon's codemod suggests on exit
- The custom-setup examples in the addon's README and MIGRATION.md write `worker.start({ onUnhandledRequest: 'bypass' })` on a `setupWorker()` without handlers; msw 3 ignores that key, so write `onUnhandledFrame` and pass your baseline to `setupWorker(...)`
- MIGRATION.md says the default setup "ignores common asset and Storybook-internal requests, so custom `onUnhandledRequest` functions written to silence those warnings are likely not needed anymore". On msw 3 that filter sits in the ignored `onUnhandledRequest` callback, so keep your own `onUnhandledFrame` filter (the `preview.ts` loader)
- The README's "Global handlers" section puts shared handlers in a preview-level `beforeEach({ msw })`. On the `mswLoader()` path that `beforeEach` runs after the loader applies each story's `parameters.msw` and shadows every such override, so keep the baseline in `setupWorker(...)` (where the baseline lives)
- The README asks for `msw@2.x` (Install) and `npx msw init ./public --save` (Generate the worker script): the addon's peer range is `msw >=2`, so msw 3 installs; on SvelteKit a committed worker script goes in `static/`, and with the `msw/vite` plugin `storybook dev` needs none (worker-script bullets under the `preview.ts` loader)
- [Storybook's MSW page](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests) can show a different addon or msw major than you run, for example `graphql` imported from `msw`, which msw 3 exports only from `msw/graphql`; compare its imports with your installed majors before copying from it
- Storybook's MSW page runs the addon codemod as `npx msw-storybook-migrate`. Do not run that: current 3.x releases ship the codemod as the `msw-storybook-addon` bin (the first 3.x releases named it `msw-storybook-migrate`, with no `migrate` subcommand), and without a local bin of that name `npx` fetches the npm package `msw-storybook-migrate`, which belongs to an unrelated publisher. Run `pnpm exec msw-storybook-addon migrate --dry-run` instead, which fails rather than fetching when the bin is missing
- [msw's Storybook page](https://mswjs.io/guides/integrations/storybook) shows `addons: ['msw-storybook-addon']`, a bare `mswLoader()` (the default setup, no baseline), `npx msw init ./public --save` and `parameters.msw` overrides. Apply the same corrections as for the README: your own setup with the baseline and `onUnhandledFrame`, `static/` on SvelteKit, and `beforeEach` for new overrides

## The `preview.ts` loader

```ts
// .storybook/preview.ts
import { setupWorker } from "msw/browser";
import { mswLoader } from "msw-storybook-addon/csf3";
import { storybookHandlers } from "../src/mocks";

async function setup() {
  const worker = setupWorker(...storybookHandlers); // the baseline resetHandlers() restores to
  await worker.start({ onUnhandledFrame: "warn", quiet: true });
  return worker;
}

export default {
  loaders: [mswLoader(setup)],
};
```

Wire the loader like this:

- Pass a setup function like this one: the addon's built-in default setup passes `onUnhandledRequest`, which msw 3 ignores
- Keep `quiet: true` in it for the same console output: your setup replaces the default, which starts the worker with `quiet: true`
- Filter Storybook's own requests in your own `onUnhandledFrame` callback (below). Under `storybook dev`, switching to a story in another file imports its `.stories.svelte` and `.svelte` modules after the worker has started, and they warn: msw's built-in strategy skips only common assets, which covers `.js` and `.html` paths but not `.svelte`. The default setup's filter lived in its ignored `onUnhandledRequest` callback, and the addon does not export it (`isCommonStorybookRequest`). In the Vitest storybook project none of Storybook's requests reach the callback

```ts
import { isCommonAssetRequest } from "msw";

// the addon's Storybook-request pattern from its src/addon.ts, plus .svelte modules
const storybookRequest =
  /\.eot$|\.mdx$|sb-common-assets|__webpack_hmr|iframe.html|sb-vite|@vite|@react-refresh|\/virtual:|\.stories\.|\.svelte$/;

// inside the setup function passed to mswLoader(...)
await worker.start({
  quiet: true,
  onUnhandledFrame({ frame, defaults }) {
    // a WebSocket a story opened: Storybook's and Vite's own sockets open before the worker starts
    if (frame.protocol !== "http") return defaults.warn();
    const { request } = frame.data as { request: Request };
    // a custom callback replaces msw's built-in asset skip
    if (isCommonAssetRequest(request)) return;
    // the pathname, so ?svelte&type=style&lang.css and ?t= queries still match
    if (storybookRequest.test(new URL(request.url).pathname)) return;
    defaults.warn();
  },
});
```

The addon's own pattern ends at `\.stories\.`, so component modules such as `/src/stories/Button.svelte` still warn; `|\.svelte$` covers them. Test it against the pathname: a component's `<style>` block loads as `/src/lib/Thing.svelte?svelte&type=style&lang.css`, which `\.svelte$` misses on the full URL. The `isCommonAssetRequest` check also silences API paths ending in `.json` and other common extensions (msw-3 reference, unhandled-frame item 4), so an unmocked `/api/items.json` does not warn here.

The callback warns on every unhandled WebSocket frame, with no URL filter. Under `storybook dev`, Storybook's and Vite's own sockets open before `mswLoader` starts the worker, so they never reach the callback, and after a dev-server restart Vite reloads the page rather than reconnecting through the worker. An unmocked socket a story opens does reach it, and an early `return` for non-HTTP frames would let it connect with no warning.

Around the `preview.ts` loader:

- The worker script:
  - a Vite config that loads the `msw/vite` plugin (as the `@msw/sveltekit` add-on sets up) serves it to a Vitest storybook project whose config loads or inherits that plugin
  - the plugin also serves it to `storybook dev`: open `/mockServiceWorker.js` on its origin to confirm
  - a `storybook build` never contains it from the plugin, which emits it only next to bundles that import `virtual:msw`
  - for a built Storybook, when `storybook dev` does not serve it, or without the plugin, commit it (`pnpm exec msw init static --save` on SvelteKit, `public` on Vite). Storybook's Vite builder copies Vite's `publicDir`, so `storybook dev` serves the committed file and `storybook build` contains it without a `staticDirs` entry; add `staticDirs` in `.storybook/main.ts` only for a script outside `publicDir`
- The Vitest storybook project serves a committed worker script from Vite's `publicDir` too, so set `publicDir` when the script lives outside `public/` ([addon-vitest FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory)). On SvelteKit, `sveltekit()` already sets `publicDir` to its `files.assets` option (`static/` by default), so a Vitest storybook project that inherits it needs no setting
- Listing the addon in `.storybook/main.ts` `addons` is harmless on this `mswLoader()` path: the loader sets `context.msw` before any `beforeEach` runs, and the addon's own annotations then step aside
- Types: `msw-storybook-addon/csf3` types `parameters.msw`; every entry point types `context.msw` for `beforeEach({ msw })`, and `msw-storybook-addon/types` carries that alone. The addon README's "Types" section asks CSF 3.0 projects to add `msw-storybook-addon/csf3` to `compilerOptions.types`; a `.storybook/preview.ts` that imports `/csf3` already brings the `parameters.msw` types into the compilation, so the entry is needed only when the stories compile without it, for example when `tsconfig.json`'s `include` leaves out `.storybook/**/*.ts`, which SvelteKit's default `include` does (Setup order step 2 adds it). Without that `include` entry on SvelteKit, add `/csf3` next to `$app/types`, which SvelteKit requires in that array: `"types": ["$app/types", "msw-storybook-addon/csf3"]`
- `svelte-5:storybook-vitest` owns `optimizeDeps` for the Vitest storybook project
- Stories rendered in Node.js work through a setup function that starts `setupServer` instead (MIGRATION.md); the addon has no built-in Node.js support, and "The setup function is typed to return a browser worker, so the Node.js branch needs a type cast" (MIGRATION.md)
- msw 3 intercepts navigations, so under `storybook dev` a tab showing a worker-controlled `iframe.html` that navigates to the manager URL warns `GET /?path=...`, and the manager's stories can stay on "loading". Open the manager URL in a new page, for example a new Playwright page, instead of navigating the preview tab to it

## Where the baseline lives

Baseline handlers go in `setupWorker(...)`, never in `preview.parameters.msw`, where the README's CSF 3 example puts them:

- `mswLoader` runs the setup function once and caches the worker
- Before each story it calls `resetHandlers()`, which restores the `setupWorker` baseline, then `worker.use(...)` with the story's `parameters.msw`, so story handlers sit in front of the baseline
- Storybook's `combineParameters` overwrites arrays and deep-merges only plain objects. A story that declares `msw: [...]` or `msw: { handlers: [...] }` drops a project-level `parameters.msw` with no warning, and only for the stories that override something. The exception is the addon's named-Record form, `msw: { handlers: { auth: [...], feed: [...] } }`, a plain object that merges by key, so project-level groups survive unless a key collides

## Per-story overrides

Write new overrides with `beforeEach({ msw })`: MIGRATION.md deprecates `parameters.msw` in its favour, and `createPreviewAnnotations` reads only `beforeEach`. Existing `parameters.msw` overrides keep working on the `mswLoader()` path, so leave them until you switch paths.

- `parameters={{ msw: { handlers: [...] } }}` on `<Story>`: the addon's MIGRATION.md calls both this and the CSF 3 loader API deprecated, and says `parameters.msw` "keeps working in v3 in CSF 3.0 setups only"; it keeps working on the `mswLoader()` path, which Svelte CSF uses. Nothing warns at runtime about `parameters.msw`; the loader's deprecation warning fires only when `parameters.csfFactory === true`, and its text is about `mswLoader`
- `beforeEach={({ msw }) => msw.use(...)}` on `<Story>`: `mswLoader()` runs during `loaders`, before meta and story `beforeEach`, so `context.msw` is set there

## Leaving the deprecated CSF 3 path

MIGRATION.md: "The loader API is deprecated and will be removed in the next major release." The addon's own `mswLoader` JSDoc is narrower: "This is the supported integration for CSF 3.0 projects", deprecated "when using CSF Next", and its runtime warning fires only for CSF Next. `createPreviewAnnotations` is the path off the loader either way. `createPreviewAnnotations` from `msw-storybook-addon/preview` returns plain project annotations: a `beforeEach` that assigns `context.msw` and resets handlers after each story. It needs no `definePreview` and no deprecated API, and it spreads straight into a CSF 3 preview default export.

Baseline handlers, `beforeEach({ msw })` overrides and the per-story reset all work on it. It ignores `parameters.msw` without a warning, so adopting it without rewriting your stories drops every existing override with no error, and a loader that generates handlers into `parameters.msw` stops applying them (handlers reference). The full switch:

1. `preview.ts` spreads `createPreviewAnnotations(setup)` instead of registering `mswLoader()`. The spread brings a `beforeEach`, so a preview that already defines `beforeEach` loses one of the two, depending on which comes later. Pass both as an array instead, the addon's first, so yours sees `context.msw`. `createPreviewAnnotations` types its `beforeEach` as a hook, an array or `undefined`, so flatten it into the array:

   ```ts
   // @storybook/sveltekit on SvelteKit, @storybook/svelte-vite otherwise
   import type { Preview, StoryContext } from "@storybook/sveltekit";
   import { createPreviewAnnotations } from "msw-storybook-addon/preview";

   // setup: the function from the preview.ts loader snippet
   const msw = createPreviewAnnotations(setup);

   function yourBeforeEach(context: StoryContext) {
     // context.msw is set here
   }

   const preview: Preview = {
     beforeEach: [msw.beforeEach ?? [], yourBeforeEach].flat(),
   };

   export default preview;
   ```

2. every per-story override becomes `beforeEach={({ msw }) => msw.use(...)}` on `<Story>`
3. Add `msw-storybook-addon/preview` to `optimizeDeps.include` (`svelte-5:storybook-vitest` owns `optimizeDeps`). The Vitest storybook project pre-bundles `/csf3` itself but not `/preview`: without the entry, a cold run optimizes it mid-run, reloads, and every story file fails with `Vitest failed to find the current suite` (see also the [addon-vitest docs](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) on dependency optimization)
4. remove the addon from `addons` in `.storybook/main.ts`, although the README's CSF 3 setup lists it there and the addon's codemod adds it

Step 4 matters on this path: a listed addon brings its own preview annotations, `createPreviewAnnotations()` with the default setup and a worker without handlers. Its `beforeEach` and yours share one module-level worker and return early once `context.msw` is set, so whichever runs first decides the worker, and your setup with the baseline handlers may never run.

Staying on `mswLoader()` with `parameters.msw` is the smaller diff and works on addon 3; switch before the addon's next major.

## What the addon's codemod will not do for `.stories.svelte`

The addon's codemod (`pnpm exec msw-storybook-addon migrate`) keeps `mswLoader()` in the preview but rewrites `parameters.msw` in JS/TS stories, and at preview level, to `beforeEach({ msw })`. Its default glob is `**/*.{stories,story}.{js,jsx,ts,tsx,mjs,mjsx,mts,mtsx}`, with no `.svelte`; `--help` prints it, and `--dry-run` previews a run.

On a Svelte-only project it migrates the config and reports `No story files matched glob`. Adding `.svelte` to `--glob` hides the failure: the file matches, the JS/TS AST pass cannot parse Svelte markup, and the transform swallows the failure and returns no change, so the run counts the file as `already up to date` with no error and no entry in the skipped-stories report. A silent run there means the file was not migrated, and the `.stories.svelte` files stay on `parameters.msw`.
