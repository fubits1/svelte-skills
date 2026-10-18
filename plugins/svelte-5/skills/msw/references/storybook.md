# Storybook wiring for Svelte CSF

Two upstream sources mislead a Svelte reader. The addon's README and MIGRATION.md route you to CSF Next, which `@storybook/addon-svelte-csf` does not support. [Storybook's MSW page](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests) can show a different addon or msw major than you run (when read for this skill, it combined the addon 3 loader with `graphql` imported from `msw`, which msw 3 exports only from `msw/graphql`); compare its imports with your installed majors before copying from it.

The snippet targets msw 2 with `msw-storybook-addon` 3, the measured pairing (see the skill's Verified line) and the one a Storybook project keeps while the addon blocker in `references/msw-3.md` holds. Once an addon release supports msw 3, follow its MIGRATION.md for the Storybook setup, and `references/msw-3.md` ("What changes in your code") for the msw side. Storybook on msw 3 is unmeasured here. A setup of your own replaces the addon's default one, which also skips Storybook-internal URLs such as `iframe.html` and `sb-vite` (`isCommonStorybookRequest` in the addon's `src/addon.ts`); your setup may warn about those unless its callback filters them (read from the source, not measured).

```ts
// .storybook/preview.ts
import { setupWorker } from "msw/browser";
import { mswLoader } from "msw-storybook-addon/csf3";
import { storybookHandlers } from "../src/mocks";

export default {
  loaders: [
    mswLoader(async () => {
      const worker = setupWorker(...storybookHandlers); // the baseline resetHandlers() restores to
      await worker.start({ onUnhandledRequest: "warn", quiet: true }); // msw 3: onUnhandledFrame
      return worker;
    }),
  ],
};
```

Around the snippet:

- `.storybook/main.ts` serves the worker script's directory with `staticDirs: ["../public"]` (`["../static"]` on SvelteKit)
- On this `mswLoader()` path, listing the addon in `addons` is harmless, because its own annotations step aside once the loader has set `context.msw`; on the `createPreviewAnnotations` path, listing it can replace your setup (both read from the addon's source, `references/msw-storybook-addon-v3.md`)
- The Vitest storybook project does not use `staticDirs`: it serves the worker script from Vite's `publicDir`, so set `publicDir` when the script lives outside `public/` ([addon-vitest FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory)). On SvelteKit, `sveltekit()` already sets `publicDir` to `kit.files.assets` (`static/` by default), so a storybook project that inherits it needs no setting (read from `@sveltejs/kit`'s `src/exports/vite/index.js`)
- For the types of `parameters.msw`, the addon README's "Types" section asks CSF 3.0 projects to add `msw-storybook-addon/csf3` to `compilerOptions.types`; it is needed when the stories compile without `.storybook/preview.ts`, for example when `tsconfig.json`'s `include` leaves out `.storybook`

This wiring differs from the addon's own example in the `setupWorker(...)` argument: baseline handlers go there, never in `preview.parameters.msw`, where the README's CSF 3 example puts them. The addon's `src/csf3.ts` shows why:

- `mswLoader` runs the setup function once and caches the worker
- Before each story it calls `resetHandlers()`, which restores the `setupWorker` baseline, then `worker.use(...)` with the story's `parameters.msw`, so story handlers sit in front of the baseline
- Storybook's `combineParameters` overwrites arrays, so a project-level `parameters.msw` vanishes for every story that overrides it. Only the addon's named-Record form merges by key (`references/msw-storybook-addon-v3.md`)

Per-story overrides use `parameters={{ msw: { handlers: [...] } }}`. The addon's MIGRATION.md schedules both this and the CSF 3 loader API for removal. `createPreviewAnnotations` from `msw-storybook-addon/preview` is a non-deprecated alternative that works in Svelte CSF, but it ignores `parameters.msw`, so taking it means rewriting every override as `beforeEach={({ msw }) => msw.use(...)}`. `references/msw-storybook-addon-v3.md` covers both paths and what was measured.

## Addon 2, and msw 2 versus msw 3

- `msw-storybook-addon` 2: the baseline goes in `initialize(options, handlers)` at module scope, `loaders: [mswLoader]` takes a bare reference rather than a call, `optimizeDeps.include` names the bare `msw-storybook-addon`, and `beforeEach={({ msw }) => msw.use(...)}` does not work because addon 2's loader never assigns `context.msw`. The baseline rule above applies to both addon majors
- msw 2, which the snippet above targets, differs from msw 3: the option is `onUnhandledRequest` with a `(request, print)` callback (msw 3: `onUnhandledFrame` with `({ frame, defaults })`, WebSocket frames included), `worker.stop()` is synchronous, life-cycle events are `LifeCycleEventsMap` tuples rather than classes, GraphQL uses `graphql.query()` rather than `graphql.link(url).query()`, and page navigations never reach the worker. Details are in `references/msw-3.md`
