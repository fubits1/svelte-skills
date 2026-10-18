---
name: msw
# prettier-ignore
description: "MSW (Mock Service Worker, msw 3 and 2) in Svelte: Storybook, Vitest browser, SvelteKit. Use for any msw question and whenever you mock an API or fetch in stories, browser tests or the dev app: http.get handlers, mockServiceWorker.js, onUnhandledRequest or onUnhandledFrame, msw-storybook-addon and parameters.msw, fixtures, query strings, empty or blank stories, 'Failed to fetch', unmocked requests passing tests, 'Failed to replace a global value', upgrading msw 2 to 3."
compatibility: "msw 3 on Node 22.12 or later; msw 2 in a project that runs Storybook, until an msw-storybook-addon release supports msw 3"
user-invocable: true
---

# MSW (Mock Service Worker)

MSW's API is documented at [mswjs.io/docs](https://mswjs.io/docs): [intercepting requests](https://mswjs.io/docs/http/intercepting-requests/), [mocking responses](https://mswjs.io/docs/http/mocking-responses/), [browser](https://mswjs.io/guides/integrations/browser), [node](https://mswjs.io/guides/integrations/node) and [Vite](https://mswjs.io/guides/integrations/vite) integration, [`msw init`](https://mswjs.io/api/cli/init), [structuring handlers](https://mswjs.io/guides/best-practices/structuring-handlers), [runtime overrides](https://mswjs.io/guides/best-practices/network-behavior-overrides), [WebSockets](https://mswjs.io/docs/websocket/), [debugging runbook](https://mswjs.io/docs/runbook), [2.x to 3.x migration](https://mswjs.io/docs/migrations/2.x-to-3.x), [Vitest browser mode](https://mswjs.io/guides/integrations/vitest). mswjs.io serves no `llms.txt`. This skill covers where the Svelte, Storybook and Vitest toolchain departs from those pages.

Verified line: a "(measured)" mark means a minimal probe project reproduced the behaviour. The msw 3 measurements ran on msw 3, Vitest 5 browser mode with `@vitest/browser-playwright`, Vite 8 and Chromium, the Vitest setup file with two test files under default isolation and under `--isolate=false --no-file-parallelism` (one shared page); the msw 2 variant of the unmocked-request guard ran on msw 2 with the same tooling. The Storybook and addon measurements ran on a four-story Svelte CSF probe, two consecutive runs, with msw 2, `msw-storybook-addon` 2 and 3, Storybook 10, `@storybook/addon-svelte-csf` 5, `@storybook/addon-vitest` 10, Vitest 4, Vite 8 and Svelte 5; Storybook on msw 3 is not measured here. SvelteKit guidance is read from the docs and `@msw/sveltekit`'s source, not run.

`vi.mock` replaces a module and MSW replaces the network. MSW applies `svelte-5:testing-svelte`'s "Mock at the right seam" to HTTP, so the component, `fetch`, `Request` and `Response` stay real. Not for replacing a module (`vi.mock`, `svelte-5:testing-svelte`) or for a one-off override in a Playwright test (`page.route`, see E2E below).

## Before upgrading to msw 3

- Storybook: the msw maintainer [advises against](https://github.com/mswjs/msw-storybook-addon/issues/200) msw 3 with `msw-storybook-addon` 3 until [addon PR #199](https://github.com/mswjs/msw-storybook-addon/pull/199) ships. Before bumping a project that runs Storybook, check whether an addon release contains that PR; if none does, keep msw 2
- Node: msw 3 needs Node 22.12 or later (`engines` in [msw's `package.json`](https://github.com/mswjs/msw/blob/main/package.json); the migration guide names Node 22, which `engines` narrows)
- msw 3 renames `onUnhandledRequest` to `onUnhandledFrame` and ignores the old name at runtime, so a missed rename falls back to `'warn'` with no message; TypeScript flags it, JavaScript and `.svelte` files without type checks do not. A custom callback changes shape too: `(request, print)` becomes `({ frame, defaults })`, where `frame.protocol === 'http'` marks a request frame, `frame.data.request` holds the request, and `defaults.warn()` replaces `print.warning()`
- The codemod skips `.svelte` files. `@mswjs/data` and `@mswjs/socket.io-binding` work with msw 2 only; the data library's successor, `@msw/data`, declares no msw dependency

Everything else for the upgrade: [msw-3](references/msw-3.md).

## Three surfaces, three handler sets

| Surface | Started in | Handler set |
| --- | --- | --- |
| Storybook | `mswLoader()` in `.storybook/preview.ts` | full: every story must be hermetic |
| Vitest browser | `setupWorker` in a setup file, once per page | narrow: per-test `worker.use()`, plus a guard that fails on unmocked requests |
| Dev app | gated entry import; on SvelteKit with msw 3, `init` in `hooks.client`/`hooks.server` via `virtual:msw` | narrow: only what the backend lacks |

Vitest browser setup, in order, once msw is installed and the worker script is served (below):

1. Put the `setupWorker` file in the browser project's `setupFiles`, not the root `test.setupFiles`. Inline projects inherit root `setupFiles` (arrays concatenate; measured on Vitest 5 with a generic setup file), so a root entry also loads `msw/browser` in node projects. A node project that must not inherit the root needs `extends: false` (`frontend:vitest`)
2. Start one worker per page. msw 3 allows one started worker per page and throws on a second one (measured). A test that imports `worker` from the setup file makes the page evaluate it twice, once as a setup file under its file-system URL and once as an import under its root URL, so module-scope code creates and starts a second worker. Keep the promise that `start()` returns in a `globalThis` slot, and let `start()` create and start the worker; the full file is in [msw-3](references/msw-3.md)

   ```ts
   const page = globalThis as typeof globalThis & {
     __msw?: Promise<SetupWorker>;
   };
   page.__msw ??= start();
   export const worker = await page.__msw;
   afterEach(() => worker.resetHandlers());
   ```

3. Register Vitest hooks at module scope, after the slot, and do not stop the worker in `afterAll`. With `--isolate=false` the files share one page and the setup file runs again before each file, so hooks registered inside `start()` exist for the first file only, and its `worker.stop()` leaves every later file unmocked (measured). `worker.events` listeners go inside `start()`: they attach to the one worker, and at module scope every evaluation adds another (measured: two calls per request). [msw's Vitest page](https://mswjs.io/guides/integrations/vitest) also skips `worker.stop()`, but its `test.extend` fixture calls `worker.start()` in every test, which msw 3 rejects from the second test on (`the worker is already started`, measured)
4. Add the unmocked-request guard from [handlers](references/handlers.md). Its example covers steps 2 to 4 in one file

Keep one handler set per surface; one shared array makes dev stop reaching your backend once a story adds a catch-all ([handlers](references/handlers.md)). On SvelteKit, start from [`@msw/sveltekit`](https://github.com/mswjs/sveltekit) (`npx sv add @msw/sveltekit`) rather than hand-wiring hooks, unless the project runs Storybook and stays on msw 2 while the addon blocker above holds: [sveltekit](references/sveltekit.md).

The browser needs the worker script, `mockServiceWorker.js`. The dev app defaults to the `msw/vite` plugin on msw 3. Vitest browser tests and Storybook use the committed file, which every measurement here ran on. Two ways to serve the script:

1. `msw/vite` plugin (msw 3): `import { msw } from "msw/vite"` and add `msw()` to the Vite plugins. It serves the worker script in dev and emits it only into client bundles that import `virtual:msw`, so a DEV guard around that import keeps it out of production ([Vite integration](https://mswjs.io/guides/integrations/vite)). `msw({ mode: "worker-only" })` serves the script without the virtual modules, for code that calls `setupWorker` itself; its `generateBundle` writes the worker script into every client build, production included (msw's `src/vite/plugin.ts`), although the Vite integration page says no mode writes it in production
2. Committed file: [`npx msw init <dir> --save`](https://mswjs.io/api/cli/init) into `public/` on Vite and `static/` on SvelteKit, with Storybook serving that directory through `staticDirs: ["../public"]` (`["../static"]` on SvelteKit) in `.storybook/main.ts`; the Vitest storybook project serves it through Vite's `publicDir` instead ([addon-vitest FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory)). Re-run it after every msw upgrade: msw 3 has no postinstall step that refreshes the file. Vite copies `public/` "to the root of the dist directory as-is" ([Vite assets docs](https://vite.dev/guide/assets.html)), and SvelteKit does the same with `static/`, so the committed file ships with every production build; only code that registers it would activate it, which the DEV guard keeps out

## Storybook wiring for Svelte CSF

Baseline handlers go in `setupWorker(...)` inside `mswLoader(...)`, never in `preview.parameters.msw`: the loader resets to the `setupWorker` set before each story, and a story's own `parameters.msw` (`[...]` or `{ handlers: [...] }`) replaces a project-level one; only the named-Record form merges by key. The `preview.ts` snippet, the per-story override forms and the addon 2 and msw 2 patterns are in [storybook](references/storybook.md).

## Traps

- `optimizeDeps.include` must name the specifier you import (`msw-storybook-addon/csf3` on the loader path, `/preview` on the annotations path); a missing entry kills the suite mid-run with `Vitest failed to find the current suite` (measured). The three outcomes are in [msw-storybook-addon-v3](references/msw-storybook-addon-v3.md), and `svelte-5:storybook-vitest` owns the trap. Listing `msw/browser` but not `msw/experimental` loads two copies of msw's classes, so `frame instanceof HttpNetworkFrame` is `false` for every frame (measured): once you list one msw entry point, list every one you import, or check `frame.protocol`
- `onUnhandledFrame: 'error'` fails no browser test: MSW logs the request and answers it with a 500 itself, so a component that handles the failure stays green (measured). Record the request in a callback and assert in `afterEach`: [handlers](references/handlers.md)
- A string path ignores the query: `http.get('/api/items', ...)` also answers `/api/items?page=2` (measured)
- A matched handler whose resolver returns nothing does not make the request unhandled. MSW falls through to the next matching handler and, if none answers, sends the request to the network; `onUnhandledFrame` never sees it (measured). To leave other queries unhandled, match only the query you answer: [handlers](references/handlers.md) has a predicate handler for that
- msw 3 intercepts navigations, including iframe loads ([msw#2721](https://github.com/mswjs/msw/pull/2721)): a test that renders a same-origin `<iframe>` needs a handler for the framed URL. A cross-origin frame document never reaches the page's worker; cross-origin `fetch` calls from the page still do
- Handler modules must be import-safe. Warn on a missing fixture, never throw: Vitest tags skip a test body but still import the file (`frontend:vitest`)
- Run storybook tests with `--silent` (`svelte-5:storybook-vitest`), or console output buries the errors (msw logs every request when the setup leaves out `quiet: true`). It also hides the console warnings that name each unhandled request, so to find a missing fixture, run the one story file without it (`pnpm exec vitest run --project storybook <file>`; `test:story` always passes `--silent`)
- SvelteKit SSR cannot intercept your own `+server.js` routes, and the browser worker does not mock them on first load either ([sveltekit](references/sveltekit.md))

## A story renders blank or empty (check in this order)

| Symptom | Cause | Fix |
| --- | --- | --- |
| every story fails, or `Failed to fetch` | worker script not served: suspect it before the handlers | open `/mockServiceWorker.js` in the browser; a 404 or a MIME-type error means it is not served ([browser integration](https://mswjs.io/guides/integrations/browser)), so serve it (worker script options above) |
| console warns about an unhandled request (hidden by `--silent`) | no handler for that URL; with a setup of your own, Storybook's own requests warn too ([storybook](references/storybook.md)) | add one to the set, or filter Storybook's requests in the callback; a relative path only matches the page origin, so a backend on another origin needs `*/` or a full URL |
| request answered with the wrong body: an empty 200, or a 404 with `[mocks] no fixture` naming a route you mocked | a catch-all ordered first, or a string path that ignores the query | catch-alls last; a predicate for the query ([handlers](references/handlers.md)) |
| only stories with their own `parameters.msw` lose shared data | project-level `parameters.msw` replaced by the story's own | baseline in `setupWorker(...)` |
| handlers built by your own loader apply only sometimes, or not at all | loader writes after an `await` (races `mswLoader`), or sits on the component or story level (runs too late) | order and timing in [handlers](references/handlers.md) |

E2E is a separate surface: [`@msw/playwright`](https://github.com/mswjs/playwright) binds MSW to Playwright fixtures (check its `msw` peer range against your msw major). For a one-off override in a Playwright test without MSW, Playwright's own `page.route` is enough.

Verify: one run of a browser or MSW suite can pass by chance, so clear the caches and take three runs before calling it green (`frontend:vitest` flake hygiene). Only a test project that mounts a component or opens a story exercises the mocks, whatever its script is named.

## Reference files and related skills

- [msw-3](references/msw-3.md): read before and during an msw 2 to 3 upgrade: the Storybook addon blocker, code changes the codemod misses, one worker per page, `instanceof` and `optimizeDeps`, the worker script refresh, companion package support
- [handlers](references/handlers.md): read when writing or debugging handlers: per-surface sets, the catch-all failure signature, the unmocked-request guard for Vitest browser, query matching, import-safety, stateful factories, generated handlers and loaders
- [storybook](references/storybook.md): read when wiring MSW into Storybook with Svelte CSF: the `preview.ts` loader, where the baseline lives, per-story overrides, addon 2 and msw 2 patterns
- [msw-storybook-addon-v3](references/msw-storybook-addon-v3.md): read when moving `msw-storybook-addon` from 2 to 3, or when choosing between `mswLoader()` and `createPreviewAnnotations`: the deprecation path, the codemod's blind spot for `.stories.svelte`, when to keep the addon out of `main.ts` `addons`
- [sveltekit](references/sveltekit.md): read on SvelteKit: the official add-on and what it generates, and the SSR interception blind spot
- `svelte-5:storybook-vitest`: owns `optimizeDeps` and the storybook test project
- `svelte-5:storybook`: story authoring, Svelte 4 store wrappers, Playwright verification
- `svelte-5:testing-svelte`: what to mock at the module seam instead
- `frontend:vitest`: browser projects, flake hygiene, test tags (in the `frontend` plugin)
- `frontend:validate`: what counts as verified before declaring done (in the `frontend` plugin)
