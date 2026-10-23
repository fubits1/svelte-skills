---
name: msw
# prettier-ignore
description: "Mocks HTTP with msw 3 in Svelte, Storybook, Vitest and SvelteKit. Use when writing http.get handlers or parameters.msw, upgrading from msw 2, or debugging blank stories, handler order, query strings, onUnhandledFrame or mockServiceWorker.js."
compatibility: "msw 3 on Node 22.12 or later (on SvelteKit 3: Node 22.17, and TypeScript 6 if you use TypeScript); Vitest 5; SvelteKit 3; msw-storybook-addon 3 with Storybook 9 or later (Storybook 10 on SvelteKit 3 and for the Vitest storybook project on Vitest 5)"
user-invocable: true
---

# MSW (Mock Service Worker)

MSW's API is documented at [mswjs.io/docs](https://mswjs.io/docs), with a [debugging runbook](https://mswjs.io/docs/runbook) and integration guides for [Vitest without Vite](https://mswjs.io/guides/integrations/vitest) and [Vite](https://mswjs.io/guides/integrations/vite); mswjs.io serves no `llms.txt`. The Vitest page sends Vite projects to the Vite page, which has no Vitest setup; follow the Vitest browser steps below. This skill covers where the Svelte, Storybook and Vitest toolchain departs from those pages.

`vi.mock` replaces a module and MSW replaces the network. Use MSW to apply `svelte-5:testing-svelte`'s "Mock at the right seam" to HTTP, so the component, `fetch`, `Request` and `Response` stay real. Not for replacing a module (`vi.mock`, `svelte-5:testing-svelte`) or for a one-off override in a Playwright test (`page.route`, see E2E below).

## Three surfaces, three handler sets

| Surface | Started in | Handler set |
| --- | --- | --- |
| Storybook | `mswLoader()` in `.storybook/preview.ts` | full: every story must be hermetic |
| Vitest browser | `setupWorker` in a setup file, once per page | narrow: per-test `worker.use()`, plus a guard that fails on unmocked requests |
| Dev app | gated entry import ([Vite integration](https://mswjs.io/guides/integrations/vite)); on SvelteKit, `init` in `hooks.client`/`hooks.server` via `virtual:msw` | narrow: only what the backend lacks |

Keep one handler set per surface; one shared array makes dev stop reaching your backend once a story adds a catch-all ([handlers](references/handlers.md)). On SvelteKit, start from the [`@msw/sveltekit`](https://github.com/mswjs/sveltekit) add-on rather than hand-wiring hooks; read the code `sv` will run before running it (a community add-on): [sveltekit](references/sveltekit.md).

## Vitest browser setup

Before step 1: install msw (`pnpm add -D msw`, or the `@msw/sveltekit` add-on on SvelteKit), serve the worker script (next section), and create the mocks index module the setup files import (handlers, "One handler set per surface").

1. Put the `setupWorker` file in the browser project's `setupFiles`, not the root `test.setupFiles`. Inline projects inherit root `setupFiles` (arrays concatenate), so a root entry also reaches node projects, where `msw/browser` does not resolve (its export map sets the `node` condition to `null`), and in the Vitest storybook project it starts a second worker next to `mswLoader`'s, which fails every story with the `WebSocket` error from step 2. A node project that must not inherit the root needs `extends: false` (`frontend:vitest`)
2. Start one worker per page: keep the promise that `start()` returns in a `globalThis` slot, and let `start()` create and start the worker. msw 3 throws on a second worker (`Failed to replace a global value at "WebSocket": already replaced.`), and a test that imports `worker` from the setup file evaluates it a second time. The full file and the reasons are in [msw-3](references/msw-3.md)

   ```ts
   const page = globalThis as typeof globalThis & {
     __msw?: Promise<SetupWorker>;
   };
   page.__msw ??= start();
   export const worker = await page.__msw;
   afterEach(() => worker.resetHandlers());
   ```

3. Place the rest of the setup file so it survives a second evaluation of the file and `--isolate=false` (reasons in [msw-3](references/msw-3.md)):
   - Vitest hooks at module scope, after the slot
   - `worker.events` listeners inside `start()`
   - no `worker.stop()` in `afterAll`
   - an `onUnhandledFrame` callback rather than plain `'warn'`: the test's own `.svelte` modules load through the worker and would each warn (the callback is in the msw-3 setup file; the step 4 guard file replaces it and skips everything outside your API paths)
   - no `test.extend` fixture from [msw's Vitest page](https://mswjs.io/guides/integrations/vitest) (written for Vitest without Vite): it calls `worker.start()` in every test, which msw 3 rejects from the second test on (`the worker is already started`)
4. Add the unmocked-request guard from [handlers](references/handlers.md). Its example covers steps 2 to 4 in one file

## The worker script

The browser needs the worker script, `mockServiceWorker.js`, served from the app root. Two ways to serve it:

1. `msw/vite` plugin (Vite 6 or later): `import { msw } from "msw/vite"` and add `msw()` to the Vite plugins (the `@msw/sveltekit` add-on does this)
   - it serves the worker script to the dev server and to every Vitest browser project whose config loads the plugin, the Vitest storybook project included; a standalone `vitest.config.ts` loads it by listing `msw()` in its own `plugins`
   - `storybook dev` gets it from the plugin: open `/mockServiceWorker.js` on its origin to confirm, and commit the file (item 2) if it is missing
   - a `storybook build` never contains it, because a Storybook preview does not import `virtual:msw` (next bullet), so a built Storybook needs the committed file (item 2)
   - it emits the script only into client bundles that import `virtual:msw`, so a DEV guard around that import keeps it out of production. Keep the DEV guard, as the plugin's own doc comment says: "Guard mocking setup with `import.meta.env.DEV` to exclude both from production builds" (both: the mocking setup and the worker script) (and the [Vite integration](https://mswjs.io/guides/integrations/vite) page's examples do); a build whose `virtual:msw` block is not DEV-gated ships msw's chunks and the worker script
   - the default mode also serves the script to code that calls `setupWorker` itself, at the Vite `base` (the root by default); with another `base`, pass `serviceWorker: { url }` to that `start()`
   - `msw({ mode: "worker-only" })` drops the virtual modules and writes the script into every client build, production included, although the Vite integration page says the worker script is "neither served nor written to your build output" in production
2. Committed file, for a project without the plugin, for a Vitest config that does not load it (a standalone `vitest.config.ts` with `svelte()` or `sveltekit()` but no `msw()`), for a built Storybook, and for `storybook dev` when the check above fails:
   - run [`pnpm exec msw init <dir> --save`](https://mswjs.io/api/cli/init) into `public/` on Vite and `static/` on SvelteKit, and re-run it after every msw upgrade: msw 3 has no postinstall step that refreshes the file, although the linked page says `--save` copies it on install. A stale file logs "The currently registered Service Worker has been generated by a different version of MSW"
   - `storybook dev`, `storybook build` and the Vitest storybook project all pick it up from Vite's `publicDir` (`static/` on SvelteKit, `public/` by default), so no `staticDirs` entry is needed. For a script outside `publicDir`, add `staticDirs` in `.storybook/main.ts` for `storybook dev` and `storybook build`, and set `publicDir` in the Vitest config for the Vitest storybook project ([addon-vitest FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory))
   - Vite copies `public/` "to the root of the dist directory as-is" ([Vite assets docs](https://vite.dev/guide/assets.html)), and SvelteKit does the same with `static/`, so the committed file ships with every production build; only code that registers it would activate it, which the DEV guard keeps out

## Storybook wiring for Svelte CSF

Baseline handlers go in `setupWorker(...)` inside `mswLoader(...)` from `msw-storybook-addon/csf3`, never in `preview.parameters.msw`: the loader resets to the `setupWorker` set before each story, and a story's own `parameters.msw` (`[...]` or `{ handlers: [...] }`) replaces a project-level one; only the named-Record form merges by key. Write new per-story overrides as `beforeEach={({ msw }) => msw.use(...)}` on `<Story>`; existing `parameters.msw` overrides keep working on the `mswLoader()` path. The `preview.ts` snippet and the override details are in [storybook](references/storybook.md).

## Traps

- msw 3 reads `onUnhandledFrame` and ignores `onUnhandledRequest`, so a leftover `onUnhandledRequest: 'error'` falls back to `'warn'`, with no message about the ignored key. TypeScript flags the old key in an object literal passed to `start()` or `listen()` in a file your tsconfig includes (on an `sv create` SvelteKit project, `.storybook/` and `tests/` are not), while an options object built elsewhere can carry it unflagged; JavaScript and `.svelte` files without type checks do not flag it. A custom callback takes `({ frame, defaults })`: `frame.protocol === 'http'` marks a request frame, `frame.data.request` holds the request, and `defaults.warn()` prints the default warning
- `onUnhandledFrame: 'error'` fails no browser test: MSW logs the request and answers it with a 500 itself, so a component that handles the failure stays green. Record the request in a callback and assert in `afterEach`: [handlers](references/handlers.md)
- The built-in `'warn'` and `'error'` skip every request whose path ends in a common file extension, `.json`, `.txt`, `.csv`, `.xml`, `.md` and `.pdf` included: an unmocked `GET /api/items.json` gets no warning and no 500 and reaches the network. Guard API paths by prefix instead ([handlers](references/handlers.md), list in [msw-3](references/msw-3.md))
- Listing `msw/browser` but not `msw/experimental` in `optimizeDeps.include` loads two copies of msw's classes, so `frame instanceof HttpNetworkFrame` is `false` for every frame: once you list one msw entry point, list every one you import, or check `frame.protocol`. `svelte-5:storybook-vitest` owns `optimizeDeps` for the Vitest storybook project
- A string path ignores the query: `http.get('/api/items', ...)` also answers `/api/items?page=2`, and a `?` in the path (`http.get('/api/items?page=1', ...)`) is dropped with `Found a redundant usage of query parameters`; match the query with a predicate ([handlers](references/handlers.md))
- A matched handler whose resolver returns nothing does not make the request unhandled. MSW falls through to the next matching handler and, if none answers, sends the request to the network; `onUnhandledFrame` never sees it. To leave other queries unhandled, match only the query you answer: [handlers](references/handlers.md) has a predicate handler for that
- msw 3 intercepts navigations, including iframe loads ([msw#2721](https://github.com/mswjs/msw/pull/2721)): a same-origin `<iframe>` load goes through the worker like a `fetch`, so give the framed URL a handler or it is handled as an unmocked request (a warning, or a failure under the guard). A cross-origin frame document never reaches the page's worker; cross-origin `fetch` calls from the page still do
- Handler modules must be import-safe. Warn on a missing fixture, never throw: Vitest tags skip a test body but still import the file (`frontend:vitest`)
- Run the Vitest storybook project with `--silent` (`svelte-5:storybook-vitest`), or console output buries the errors (msw logs every mocked request, plus a start message, when the setup leaves out `quiet: true`). It also hides the console warnings that name each unhandled request, so to find a missing fixture, run the one story file without it (`pnpm exec vitest run --project storybook <file>`; the `test:story` script from `svelte-5:storybook-vitest` always passes `--silent`)
- MSW's Node network never sees server-side `event.fetch` calls to your own `+server.js` routes. With SSR on (the default) the browser worker does not mock them on first load either, and fetches from a server `load` never reach it ([sveltekit](references/sveltekit.md))

## A story renders blank or empty (check in this order)

| Symptom | Cause | Fix |
| --- | --- | --- |
| every story fails, `Failed to fetch`, or `[MSW] Failed to register` | worker script not served: suspect it before the handlers | open `/mockServiceWorker.js` in the browser, or under Vitest look for `GET /mockServiceWorker.js` with a 404 or 500 in the test output; an error status or a MIME-type error means it is not served ([browser integration](https://mswjs.io/guides/integrations/browser)), so serve it (worker script options above) |
| console warns about an unhandled request (hidden by `--silent`) | no handler for that URL; under `storybook dev`, Storybook's own requests can warn too, with the addon's default setup or yours ([storybook](references/storybook.md)) | add one to the set, or filter Storybook's requests in the callback; a relative path only matches the page origin, so a backend on another origin needs `*/` or a full URL |
| request answered with the wrong body: an empty 200, or a 404 with `[mocks] no fixture` naming a route you mocked | a catch-all ordered first, or a string path that ignores the query | catch-alls last; a predicate for the query ([handlers](references/handlers.md)) |
| only stories with their own `parameters.msw` lose shared data | project-level `parameters.msw` replaced by the story's own | baseline in `setupWorker(...)` |
| handlers built by your own loader apply only sometimes, or not at all | loader writes after an `await` (races `mswLoader`), or sits on the component or story level (runs too late) | order and timing in [handlers](references/handlers.md) |

## E2E

E2E is a separate surface: [`@msw/playwright`](https://github.com/mswjs/playwright) binds MSW to Playwright fixtures (use a release whose `msw` peer range names msw 3). For a one-off override in a Playwright test without MSW, Playwright's own `page.route` is enough.

## Verify

One run of a browser or MSW suite can pass by chance, so clear the caches and take three runs before calling it green (`frontend:vitest` flake hygiene). Only a test project that mounts a component or opens a story exercises the mocks, whatever its script is named.

## Reference files and related skills

- [migrate-2-to-3](references/migrate-2-to-3.md): read when upgrading a project from msw 2, together with msw-3: the checklist, what the codemod misses in `.svelte` files, the Vitest setup file, `msw-storybook-addon` 2 to 3, the old `@msw/sveltekit` scaffold
- [msw-3](references/msw-3.md): read for msw 3 specifics: requirements, API facts that break older snippets, one worker per page, the `onUnhandledFrame` callback, `instanceof` and `optimizeDeps`, the worker script, navigations and iframes, companion package support, mocks that stop after about five minutes on a long-lived page (msw#2635, msw#2801)
- [handlers](references/handlers.md): read when writing or debugging handlers: per-surface sets, the catch-all failure signature, the unmocked-request guard for Vitest browser, query matching, import-safety, stateful factories, generated handlers and loaders
- [storybook](references/storybook.md): read when wiring MSW into Storybook with Svelte CSF: the `preview.ts` loader, where the baseline lives, per-story overrides, choosing between `mswLoader()` and `createPreviewAnnotations` (the deprecation path, when to keep the addon out of `main.ts` `addons`), the addon codemod's blind spot for `.stories.svelte`
- [sveltekit](references/sveltekit.md): read on SvelteKit: the `@msw/sveltekit` add-on, what it generates and how to adjust it, HMR in dev, the production build check, the SSR interception blind spot, Storybook and Vitest on SvelteKit
- `svelte-5:storybook-vitest`: owns `optimizeDeps` and the Vitest storybook project
- `svelte-5:storybook`: story authoring, Svelte 4 store wrappers, Playwright verification
- `svelte-5:testing-svelte`: what to mock at the module seam instead
- `frontend:vitest`: browser projects, flake hygiene, test tags (in the `frontend` plugin)
- `frontend:validate`: what counts as verified before declaring done (in the `frontend` plugin)
