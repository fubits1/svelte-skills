# msw 3 specifics in a Svelte project

The [msw docs](https://mswjs.io/docs) and the [msw 3 release notes](https://github.com/mswjs/msw/releases) own the API. This page covers the msw 3 behaviour that trips up Svelte, Storybook and Vitest setups and code copied from older examples.

## Contents

- Requirements
- The unhandled-frame option and callback
- API facts that break older snippets
- One worker per page in Vitest browser mode
- `instanceof HttpNetworkFrame` and `optimizeDeps`
- The worker script is not refreshed on install
- Navigations and iframes reach the worker
- Companion packages
- Interception stops on long-lived pages

## Requirements

- Node 22.12 or later (the migration guide says 22.0.0; `engines` in msw's `package.json` requires 22.12); SvelteKit 3 itself requires Node 22.17, and TypeScript 6 where the project uses TypeScript, an optional peer (`pnpm view @sveltejs/kit@3 engines peerDependencies peerDependenciesMeta`); msw 3 is ESM-only
- the latest msw 3 where Vitest loads code that imports `virtual:msw`, such as the `@msw/sveltekit` hooks: the first 3.0 releases fail on that import in Vitest ([msw#2799](https://github.com/mswjs/msw/issues/2799))
- optional peer dependencies, each needed only when you use it: TypeScript 5.9 or later, Vite 6 or later for `msw/vite`, and `graphql` for `msw/graphql`

## The unhandled-frame option and callback

1. `start()` and `listen()` read only `onUnhandledFrame`. A leftover `onUnhandledRequest` is a type error in an object literal passed to `start()` or `listen()` (an options object built elsewhere can carry it unflagged), and ignored without a message in JavaScript and unchecked `.svelte` files, which leaves the default `'warn'` in charge. The string values (`'bypass'`, `'warn'`, `'error'`) are the same
2. A custom callback takes `({ frame, defaults })`. WebSocket frames reach it too, so check `frame.protocol === 'http'` before reading `frame.data.request`, and branch on `frame.protocol === 'ws'` if you report unmocked WebSocket connections. `frame.data` is typed `unknown`, so cast it
3. A callback that must block the request throws, as the guard in the handlers reference does. Do not rely on `defaults.error()` for that: `defaults.warn()` and `defaults.error()` print and the request continues to the network, which msw's source keeps "for backward compatibility reasons"
4. The built-in `'warn'` and `'error'` return early, with no message, for every request `isCommonAssetRequest` matches:
   - a path ending (case-insensitive) in css, scss, less, js, jsx, mjs, mjsx, ts, tsx, mts, mtsx, html, ttf, otf, woff, woff2, eot, gif, jpg, jpeg, png, avif, webp, svg, mp4, webm, ogg, mov, mp3, wav, flac, aac, pdf, txt, csv, json, xml, md, zip, tar, gz, rar or 7z
   - a path containing `node_modules` or `@vite`, a `fonts.googleapis.com` request, and a `file:` URL

   An unmocked `GET /api/items.json` therefore gets neither the warning nor the 500 from `'error'` and reaches the network. To catch unmocked API calls whatever their extension, match API paths by prefix, as the guard in the handlers reference does
5. A custom callback replaces the built-in strategy, including its skip for common asset requests, so it also reports assets. To keep asset warnings out, add the `isCommonAssetRequest` check below; a callback that must report API paths with an item-4 extension skips non-API requests by path prefix instead:

   ```ts
   import { isCommonAssetRequest } from "msw";

   await worker.start({
     onUnhandledFrame({ frame, defaults }) {
       if (frame.protocol !== "http") return;
       const { request } = frame.data as { request: Request };
       if (isCommonAssetRequest(request)) return;
       defaults.warn();
     },
   });
   ```

   This warns for an unhandled `/api/...` request and stays quiet for `/logo.png`; without the asset check it warns for both. With the check it also stays quiet for `/api/items.json` (item 4). The `http` check also drops the WebSocket warnings `'warn'` gave (item 6); to keep them, call `defaults.warn()` for `ws` frames, which prints msw's WebSocket message

6. The unhandled strategy applies to every network frame, "which includes both requests and WebSocket connections" (migration guide), so `'warn'` and `'error'` also report an unmocked WebSocket connection

## API facts that break older snippets

- `http`, `HttpResponse`, `ws`, `sse`, `delay`, `bypass`, `passthrough` and `isCommonAssetRequest` import from the `msw` root or from subpaths (`msw/http`, `msw/ws`, `msw/sse`, and kebab-case `msw/utils/*` files such as `msw/utils/is-common-asset-request`); `getResponse` and `getCleanUrlString` import from the root or from `msw/utils/get-response` and `msw/utils/get-clean-url-string`; `graphql` imports only from `msw/graphql`, and its handlers hang off a link: `graphql.link(url).query()`, `.mutation()`, `.operation()`, typed `GraphQLLink`
- `worker.stop()` returns a Promise: await it where you keep it; in a Vitest browser setup file, leave it out (next section)
- event types are `HttpNetworkFrameEventMap` and `WebSocketNetworkFrameEventMap` from `msw/experimental`. Their values are event objects (class instances), not argument tuples: `HttpNetworkFrameEventMap['request:start']` carries `request` and `requestId`, so a `({ request })` listener works, and `request:unhandled` fires before the `onUnhandledFrame` strategy runs
- resolve a request against handlers with `getResponse(handlers, request)`; type the option with `UnhandledFrameHandle` (a strategy string or a callback; msw exports no separate callback type), or `UnhandledFrameStrategy` for the string values only; clean URLs with `getCleanUrlString`; the life-cycle event for a new WebSocket connection on `worker.events` and `server.events` is `'websocket:connection'`, while a `ws.link(...)` handler listens for `'connection'`
- string paths with RegExp tokens, such as `'/user/:id(\\d+)'`, are not supported ([msw#2678](https://github.com/mswjs/msw/pull/2678)); pass a RegExp instance or a predicate
- cookie mocks read the `cookies` resolver argument: `request.headers.get('cookie')` returns `null`
- in Node.js msw leaves cookies to the environment, and Node's `fetch` keeps no cookie jar, so a mocked `Set-Cookie` does not reach a later server-side request (a SvelteKit server hook, Vitest node tests)
- `bypass()` removes the `Content-Length` request header
- in Node.js (`setupServer`), `file://` requests and HTTP-to-WebSocket upgrades through `fetch()` throw
- `delay()` under fake timers needs the timers advanced

## One worker per page in Vitest browser mode

msw 3 throws in both of these cases:

- starting the same worker twice: `[MSW] Failed to call "worker.start()": the worker is already started. Remove the redundant "worker.start()" call.`
- starting a second worker in the page: `Failed to replace a global value at "WebSocket": already replaced.`

A shared setup file causes the second error: a file listed in `setupFiles` evaluates twice in the same page when a test also imports it to reach `worker`, once under its file-system URL and once under its root URL, so its module-scope `setupWorker(...).start()` runs twice. Start the worker once per page and reuse it. `../src/mocks` is the index module from the handlers reference ("One handler set per surface"); add `tests` to the `include` of the tsconfig your `check` script type-checks so the file is type-checked (`tsconfig.json` on SvelteKit, whose `sv create` `include` lists only `src` and `vite.config.ts`; `tsconfig.app.json` on the Vite svelte-ts template):

```ts
// tests/setup-msw.ts, in the browser project's setupFiles
import { isCommonAssetRequest } from "msw";
import { setupWorker, type SetupWorker } from "msw/browser";
import { afterEach } from "vitest";
import { vitestHandlers } from "../src/mocks";

async function start() {
  const worker = setupWorker(...vitestHandlers);
  await worker.start({
    quiet: true,
    onUnhandledFrame({ frame, defaults }) {
      if (frame.protocol !== "http") return;
      const { request } = frame.data as { request: Request };
      if (isCommonAssetRequest(request)) return;
      // the test's own .svelte modules load through the worker
      if (new URL(request.url).pathname.endsWith(".svelte")) return;
      defaults.warn();
    },
  });
  return worker;
}

const page = globalThis as typeof globalThis & {
  __msw?: Promise<SetupWorker>;
};
page.__msw ??= start();

export const worker = await page.__msw;

afterEach(() => worker.resetHandlers());
```

`start()` runs once per page; the code after it runs on every evaluation of the file. What goes where:

- Vitest hooks at module scope. When `--isolate=false` runs several test files in one page (with `--no-file-parallelism`, all of them), Vitest runs the setup file again before each file, so a hook registered inside `start()` exists only for the first file, and later files get no reset and no unmocked-request guard
- No `worker.stop()`. Stopping the worker after the first file leaves every later file unmocked, so its requests reach the dev server. [msw's Vitest page](https://mswjs.io/guides/integrations/vitest), written for Vitest without Vite, also recommends skipping `worker.stop()`, "because there's no practical reason for it"
- `worker.events.on(...)` listeners inside `start()`, next to `worker.start()`. A listener attaches to the worker itself, so at module scope each evaluation adds one more, and a test that imports `worker` sees two calls per unhandled request
- The `??=`. Without it, a test that imports `worker` fails at import with the `WebSocket` error
- The callback instead of `onUnhandledFrame: "warn"`. The worker starts before Vitest imports the test file, so the components a test imports (`GET /src/lib/Thing.svelte`, `?svelte&type=style&lang.css`) reach the strategy, and plain `'warn'` prints an unhandled-request warning for each. The pathname check skips them; the asset check keeps `.js` and `.ts` modules quiet and also skips API paths ending in `.json` (unhandled-frame item 4)

The unmocked-request guard in the handlers reference is this file with the callback replaced by the guard's callback, which skips everything outside your API paths, and an `afterEach` that also asserts no request went unrecorded; use that version if you want unmocked requests to fail tests.

## `instanceof HttpNetworkFrame` and `optimizeDeps`

`frame instanceof HttpNetworkFrame`, with the class from `msw/experimental` (the narrowing [msw#2797](https://github.com/mswjs/msw/issues/2797) recommends), is `false` for every frame when Vite pre-bundles one msw entry point but not the other: the page then holds two copies of msw's classes. `optimizeDeps.include: ['msw/browser']` alone breaks it; listing `'msw/experimental'` too, or listing neither, keeps it working. Configs list msw entry points there so Vite does not optimize them mid-run: a mid-run optimization reloads the page and fails every test file, as the storybook reference shows for `msw-storybook-addon/preview`. Two fixes:

- list every msw entry point the code imports (for example `msw/browser` and `msw/experimental`), next to `msw/browser` in whichever config lists it (a root-level list reaches every inline project, `svelte-5:vitest`; a project's own list only that project)
- narrow with `frame.protocol === 'http'`, which works in every case but leaves `frame.data` typed `unknown`

## The worker script is not refreshed on install

msw 3 has no `postinstall` script, so `"msw": { "workerDirectory": ... }` in `package.json` does not update a committed `mockServiceWorker.js` on install. After every msw upgrade:

1. Run `pnpm exec msw init <dir> --save` from the project root: `msw init` reads `package.json` from the current directory and fails with `ENOENT` where there is none
2. Commit the result

A project whose Vite config loads the `msw/vite` plugin needs no committed file for the dev app or for any Vitest browser project whose config loads the plugin: the plugin serves the worker script to them. Before deleting a committed file:

1. Move it out of the served directory
2. Check what still needs it: a Vitest config that does not load the plugin (run its browser project; `GET /mockServiceWorker.js` with a 404 or 500 in the test output means it still needs the file), and Storybook (open `/mockServiceWorker.js` on the `storybook dev` origin; a project that builds Storybook keeps the file, because the plugin never puts it in a `storybook build`; storybook reference)
3. Restore the file if any check fails; otherwise delete it and remove its directory from `msw.workerDirectory` in `package.json`, because a bare `pnpm exec msw init` copies the script into every directory listed there

## Navigations and iframes reach the worker

msw 3 intercepts page navigations and form submissions, including iframe navigations ([msw#2721](https://github.com/mswjs/msw/pull/2721)). A test that renders an `<iframe>` pointing at a same-origin backend URL sends that load through the worker, where it is handled like any request: give the framed URL a handler, for example one returning `HttpResponse.html(...)`, or it goes through the unhandled strategy. The PR states: "Service Workers cannot intercept cross-origin requests, which includes form submissions", so a frame document on another host or port stays outside MSW. Cross-origin `fetch` calls from the page still reach the worker.

## Companion packages

Check a package's msw range with `pnpm view <package> peerDependencies optionalDependencies`; `@msw/sveltekit` declares no msw range, and its README states the msw 3 requirement.

| Package | With msw 3 |
| --- | --- |
| `@msw/sveltekit` | releases built on the `msw/vite` plugin require msw 3 (sveltekit reference) |
| `@msw/source` | use a release whose `msw` peer range names msw 3 |
| `@msw/playwright` | use a release whose `msw` peer range names msw 3 |
| `@msw/data` | the data library for msw 3; `@mswjs/data` declares an msw 2 range and reads `graphql` from the `msw` root, which msw 3 does not export. `@msw/data` has a different API and no msw dependency |
| `@mswjs/socket.io-binding` | check `pnpm view @mswjs/socket.io-binding peerDependencies`; while its `msw` range names no msw 3, mock the Socket.IO client module instead (handlers reference) |
| `msw-storybook-addon` 3 | runs on msw 3; its built-in default setup passes `onUnhandledRequest`, which msw 3 ignores, and starts a worker without handlers, so pass your own setup function (`mswLoader(setup)`, or `createPreviewAnnotations(setup)`) for `onUnhandledFrame` and the baseline (storybook reference) |

## Interception stops on long-lived pages

In Chromium the worker can stop intercepting after about five minutes on a page in the hidden state, such as a background tab or a minimised window ([msw#2635](https://github.com/mswjs/msw/issues/2635)), and also on a visible page ([msw#2801](https://github.com/mswjs/msw/issues/2801)). Requests that were mocked then reach the real network, or fail, without a warning. A Vitest browser run that keeps one page alive, a dev app mocked for a whole working session and a long Storybook session all keep one page open that long. Before relying on such a page, check both issues for a released fix.
