# msw 2 to 3 in a Svelte project

The [2.x to 3.x migration guide](https://mswjs.io/docs/migrations/2.x-to-3.x) and the [msw 3 release notes](https://github.com/mswjs/msw/releases) own the API delta. A "(measured)" mark means a minimal Vite + Vitest browser probe project reproduced the behaviour, with the versions in the skill's Verified line.

## Contents

- Upgrade checklist
- Check the Storybook addon first
- What changes in your code
- One worker per page in Vitest browser mode
- `instanceof HttpNetworkFrame` and `optimizeDeps`
- msw 3 does not refresh the worker script on install
- Requests msw 3 intercepts that msw 2 did not
- Companion packages
- msw#2801: interception stops after about five minutes

## Upgrade checklist

Copy this into your response and tick it off:

```text
- [ ] Storybook in the project? If no msw-storybook-addon release contains PR #199, stay on msw 2
- [ ] Node 22.12 or later (msw's engines), TypeScript 5.9 or later (v3.0.0 release notes); msw 3 is ESM-only
- [ ] Bump msw, then run `npx codemod @mswjs/v3` for .js/.ts files
- [ ] Using msw/graphql? Install graphql: msw 3 declares it an optional peer dependency
- [ ] Search .svelte and .stories.svelte files by hand: onUnhandledRequest, (request, print), graphql imported from 'msw', graphql.query()/mutation()/operation() (msw 3: graphql.link(url).query() and so on), GraphQLLinkHandlers (msw 3: GraphQLLink), cleanUrl (msw 3: getCleanUrlString), msw/core/* deep imports, the 'connection' event (msw 3: 'websocket:connection'), worker.stop() without await
- [ ] Search every file, .ts included, for what the codemod's README leaves to manual migration: handleRequest() (msw 3: getResponse(handlers, request), or the experimental defineNetwork() for a custom interception layer), the onUnhandledRequest() export, LifeCycleEventsMap, UnhandledRequestStrategy and UnhandledRequestCallback (msw 3: UnhandledFrameStrategy and UnhandledFrameHandle), SetupApi and StrictResponse, which msw 3 no longer exports
- [ ] Search for what the codemod skips: worker.stop() calls on a worker the codemod cannot trace to setupWorker() (a factory, re-export or globalThis slot) or that sits in a generator, constructor or accessor, which it leaves unawaited, and a callback passed by reference that is also called elsewhere, which it leaves on the old signature
- [ ] Release-notes behaviour: cookie mocks read the cookies argument, Node keeps no cookies, bypass() drops Content-Length, delay() under fake timers needs the timers advanced, 'warn' and 'error' also report unmocked WebSocket connections (list below)
- [ ] Rename onUnhandledRequest to onUnhandledFrame everywhere; rewrite custom callbacks to ({ frame, defaults }); where print.error() blocked a request, throw instead (defaults.error() only prints)
- [ ] Handler paths with RegExp tokens in a string, such as '/user/:id(\\d+)': msw 3 no longer supports them (msw#2678, the move to @msw/url); pass a RegExp instance or a predicate
- [ ] Vitest browser: one worker per page (globalThis slot), Vitest hooks at module scope, worker.events listeners inside start(), no worker.stop() in afterAll
- [ ] optimizeDeps.include: list every msw entry point you import, or narrow frames with frame.protocol
- [ ] Re-run `npx msw init <dir> --save` (Vitest browser and Storybook keep the committed file); the dev app defaults to the msw/vite plugin
- [ ] Tests that render iframes: add handlers for the framed URLs
- [ ] Companion packages: check the table below
```

The calls that change in a Vitest browser setup file (the msw 3 lines were measured):

```diff
-import type { LifeCycleEventsMap } from "msw";
-await worker.start({ onUnhandledRequest: "bypass" });
+await worker.start({ onUnhandledFrame: "bypass" }); // renamed; the old key is ignored
-afterAll(() => worker.stop());
```

The setup file drops `worker.stop()` instead of awaiting it: with `--isolate=false`, stopping the worker after the first file leaves every later file unmocked. A `worker.events.on("request:unhandled", ({ request }) => …)` listener keeps its callback but goes inside `start()`, next to `worker.start()`; left at module scope, it fires twice per request once a test imports `worker` ("One worker per page" below).

The `LifeCycleEventsMap` type is gone; import `HttpNetworkFrameEventMap` (or `WebSocketNetworkFrameEventMap`) from `msw/experimental` if you need the event types. Their values are event classes rather than argument tuples, so a type such as `LifeCycleEventsMap['request:start'][0]` has no msw 3 form; the classes keep a `request` property, so a `({ request })` listener keeps working, and `request:unhandled` fires before the `onUnhandledFrame` strategy runs (msw's `src/core/experimental/frames/http-frame.ts`).

## Check the Storybook addon first

The msw maintainer [warned](https://github.com/mswjs/msw-storybook-addon/issues/200) not to use msw 3 with this addon until its PR #199 is released. `msw-storybook-addon` 3 declares `msw >=2`, and its built-in default setup passes the msw 2 option `onUnhandledRequest`, which msw 3 ignores. [PR #199](https://github.com/mswjs/msw-storybook-addon/pull/199) requires msw 3 and recommends the `msw/vite` plugin. If the project uses Storybook, check whether that PR has shipped before you bump msw (`gh pr view 199 -R mswjs/msw-storybook-addon --json state,mergedAt`, then the addon's releases). msw is one dependency per project, so Storybook and Vitest browser tests move to msw 3 together; there is no split where only Vitest upgrades. When an addon release contains the PR, follow the addon's MIGRATION.md for its msw 3 setup and re-check the Storybook items in this skill, which were measured on msw 2. Storybook on msw 3 is unmeasured here, including whether Storybook serves the worker script through a project's `msw()` plugin, so keep a committed worker script and `staticDirs` for Storybook.

## What changes in your code

1. Rename `onUnhandledRequest` to `onUnhandledFrame`. msw 3's `start()` reads only `onUnhandledFrame`, so the old name is a type error in TypeScript and ignored without a message in JavaScript, which leaves the default `'warn'` in charge ([addon#200](https://github.com/mswjs/msw-storybook-addon/issues/200), msw's `src/browser/setup-worker.ts`). The string values are the same
2. Rewrite custom callbacks to `({ frame, defaults })`. Check `frame.protocol === 'http'` before reading `frame.data.request`, because WebSocket frames reach the callback too. msw 2 handed the callback a synthetic `Request` for an unhandled WebSocket connection (codemod README), so a callback that reported those needs a branch for `frame.protocol === 'ws'`; the early return skips them. Use `defaults.warn()` where msw 2 called `print.warning()`. `print.error()` blocked the request only in msw 2 releases from before the network-source rewrite ([msw#2650](https://github.com/mswjs/msw/pull/2650)). Later msw 2 releases route the callback through the same frame code as msw 3 (`src/core/experimental/compat.ts`), where `print.error()` and `defaults.error()` only print and the request continues to the network (msw's `src/core/experimental/on-unhandled-frame.ts`: the defaults "do not affect the frame resolution (e.g. do not error the frame)"). A callback that must block the request throws instead, as the guard in `references/handlers.md` does. A custom callback replaces the built-in strategy, including its skip for common asset requests (msw's `src/core/experimental/on-unhandled-frame.ts`: "When using a custom function, you need to check for common assets manually"). The protocol check leaves `frame.data` typed `unknown` ([msw#2797](https://github.com/mswjs/msw/issues/2797))

   ```diff
   -onUnhandledRequest(request, print) {
   -  print.warning();
   -},
   +onUnhandledFrame({ frame, defaults }) {
   +  if (frame.protocol !== "http") return;
   +  const { request } = frame.data as { request: Request };
   +  if (isCommonAssetRequest(request)) return; // `import { isCommonAssetRequest } from "msw"`
   +  defaults.warn();
   +},
   ```

   Measured: this callback warns for an unhandled `/api/...` request and stays quiet for `/logo.png`; without the asset check it warns for both.

3. Await `worker.stop()` where you keep it, because it returns a Promise; in a Vitest browser setup file, delete it
4. Fix the imports the codemod cannot see. `npx codemod @mswjs/v3` only globs JavaScript and TypeScript files ([workflow.yaml](https://github.com/mswjs/codemods/blob/HEAD/codemods/v3/workflow.yaml)), so `.svelte` and `.stories.svelte` files keep their msw 2 code. The migration guide and the codemod move `http`, `HttpResponse`, `ws`, `sse`, `delay`, `bypass`, `passthrough` and `isCommonAssetRequest` to subpaths such as `msw/http`, `msw/ws`, `msw/sse` and `msw/utils/*`, but msw 3's `src/core/index.ts` still exports them from the root, so root imports keep working (`getResponse` stays on the root in the guide too); `graphql` moved to `msw/graphql` and is not on the root, and `graphql.query()` became `graphql.link(url).query()`
5. Delete an unused `LifeCycleEventsMap` import; where the code uses the type, switch to `HttpNetworkFrameEventMap` from `msw/experimental`

From the release notes and the migration guide, for a Svelte project:

- cookie mocks read the `cookies` resolver argument, because `request.headers.get('cookie')` returns `null` on msw 3
- msw 3 does not manage cookies in Node.js and leaves them to the environment's default behaviour, which matters for `setupServer` in a SvelteKit server hook or Vitest node tests: Node's `fetch` keeps no cookie jar, so do not expect a mocked `Set-Cookie` on a later server-side request
- `bypass()` removes the `Content-Length` request header
- in Node.js (`setupServer`), `file://` requests and HTTP-to-WebSocket upgrades through `fetch()` throw, as they do without msw
- `delay()` under fake timers needs the timers advanced
- the unhandled strategy applies to every network frame, "which includes both requests and WebSocket connections" (migration guide), so `'warn'` and `'error'` also report an unmocked WebSocket connection

## One worker per page in Vitest browser mode

msw 3 throws in both of these cases (measured); msw 2 logs `Found a redundant "worker.start()" call` in both instead (same worker: read from msw 2's `src/browser/setup-worker.ts`; second worker: measured):

- starting the same worker twice: `[MSW] Failed to call "worker.start()": the worker is already started. Remove the redundant "worker.start()" call.`
- starting a second worker in the page: `Failed to replace a global value at "WebSocket": already replaced.`

A shared setup file causes the second error: a file listed in `setupFiles` evaluates twice in the same page when a test also imports it to reach `worker`, once under its file-system URL and once under its root URL (measured), so its module-scope `setupWorker(...).start()` runs twice. Start the worker once per page and reuse it:

```ts
// tests/setup-msw.ts, in the browser project's setupFiles
import { setupWorker, type SetupWorker } from "msw/browser";
import { afterEach } from "vitest";
import { vitestHandlers } from "../src/mocks";

async function start() {
  const worker = setupWorker(...vitestHandlers);
  await worker.start({ quiet: true, onUnhandledFrame: "warn" });
  return worker;
}

const page = globalThis as typeof globalThis & {
  __msw?: Promise<SetupWorker>;
};
page.__msw ??= start();

export const worker = await page.__msw;

afterEach(() => worker.resetHandlers());
```

`start()` runs once per page; the code after it runs on every evaluation of the file. What goes where (each measured; the first three in 3 of 3 runs):

- Vitest hooks at module scope. With `--isolate=false` the test files share one page and Vitest runs the setup file again before each file, so a hook registered inside `start()` exists only for the first file. With two files and `--isolate=false --no-file-parallelism`, the second file got no reset and no unmocked-request guard (the `references/handlers.md` version of this file); with the hooks at module scope, both files reset and that guard failed the unmocked test in each, also under default isolation
- No `worker.stop()`. With the old `afterAll(() => worker.stop())` inside `start()`, the second file got real 404s from the dev server once the first file had stopped the worker. [msw's Vitest page](https://mswjs.io/guides/integrations/vitest) also recommends skipping `worker.stop()`, because the page context isolates the network
- `worker.events.on(...)` listeners inside `start()`, next to `worker.start()`. A listener attaches to the worker itself, so at module scope each evaluation adds one more: a test that imports `worker` saw two calls per unhandled request from a module-scope listener and one from a listener inside `start()`
- The `??=`. Without it, a test that imports `worker` fails at import with the `WebSocket` error

The unmocked-request guard in `references/handlers.md` is this file plus the guard; use that version if you want unmocked requests to fail tests.

msw's Vitest page has its own example: a `test.extend` fixture that calls `worker.start()` before every test. It fails from the second test on msw 3 with `[MSW] Failed to call "worker.start()": the worker is already started` (measured, 3 of 3 runs). Start the worker once, as above.

## `instanceof HttpNetworkFrame` and `optimizeDeps`

The narrowing the maintainer recommends in [msw#2797](https://github.com/mswjs/msw/issues/2797), `frame instanceof HttpNetworkFrame` with the class from `msw/experimental`, is `false` for every frame when Vite pre-bundles one msw entry point but not the other, because the page then holds two copies of msw's classes (measured: `optimizeDeps.include: ['msw/browser']` gives `false`, adding `'msw/experimental'` gives `true`, no entry gives `true`). A config that lists `msw/browser` alone in `optimizeDeps.include`, for example to stop a mid-run optimizer restart, hits this. Either list every msw entry point the code imports, next to `msw/browser` in whichever config lists it (a root-level list reaches every inline project, `frontend:vitest`; a project's own list only that project), or narrow with `frame.protocol === 'http'`, which works in all three cases (measured) but leaves `frame.data` typed `unknown`. The codemod writes the `instanceof` form into every migrated callback that reads the request ([v3 codemod README](https://github.com/mswjs/codemods/blob/HEAD/codemods/v3/README.md)), so check `optimizeDeps` after running it.

## msw 3 does not refresh the worker script on install

msw 3 has no `postinstall` script ([msw's `package.json`](https://github.com/mswjs/msw/blob/main/package.json); msw 2 ran one), so `"msw": { "workerDirectory": ... }` in `package.json` does not update `mockServiceWorker.js` on install. Re-run `npx msw init <dir> --save` after every msw upgrade and commit the result. In the dev app the `msw/vite` plugin can serve the worker instead; with no test or Storybook setup sharing that directory, there is then no file to keep current. msw's Vitest page sends Vite users to the Vite integration, which it says "automatically covers Vitest", but this skill measured Vitest browser tests and Storybook only with the committed file ([Vite integration](https://mswjs.io/guides/integrations/vite)). `msw init` reads `package.json` from the current directory and fails with `ENOENT` where there is none (measured), so run it from the project root. msw 3 releases without the fix for [msw#2799](https://github.com/mswjs/msw/issues/2799) fail on `virtual:msw` imports in Vitest; the issue names the fixed release.

## Requests msw 3 intercepts that msw 2 did not

msw 3 intercepts page navigations and form submissions, including iframe navigations ([msw#2721](https://github.com/mswjs/msw/pull/2721)). A test that renders an `<iframe>` pointing at a same-origin backend URL sends that load through the worker, so the framed URL needs a handler, for example one returning `HttpResponse.html(...)`. The PR states: "Service Workers cannot intercept cross-origin requests, which includes form submissions", so a frame document on another host or port stays outside MSW. Cross-origin `fetch` calls from the page are unaffected and still reach the worker.

## Companion packages

| Package | msw 3 support |
| --- | --- |
| `@msw/sveltekit` | its `msw/vite`-based releases require msw 3 (`references/sveltekit.md`) |
| `@msw/source` | releases whose `msw` peer range names msw 3; older releases are the msw 2 line |
| `@msw/playwright` | releases whose `msw` peer range names msw 3; older releases are the msw 2 line |
| `@mswjs/data` | msw 2 only: it imports `graphql` from the `msw` root; the repository publishes `@msw/data`, with a different API and no msw dependency |
| `@mswjs/socket.io-binding` | msw 2 only; check its releases for msw 3 support |
| `msw-storybook-addon` 3 | see "Check the Storybook addon first" |

Sources: each package's GitHub releases and the msw entry in its `package.json` (a peer range, or an optional dependency for `@mswjs/data`); `@msw/sveltekit` declares no msw peer, and its README states the msw 3 requirement.

## msw#2801: interception stops after about five minutes

[msw#2801](https://github.com/mswjs/msw/issues/2801): in Chromium on msw 3 (attributed to msw#2724, which shipped with msw 3), the worker can stop intercepting a visible page after about five minutes, and requests then reach the real network without a warning. The issue reports it for a dev app mocked for a whole working session and for browser test runs that keep one page alive; a long Storybook session on msw 3 keeps one page alive the same way, but none is reported there. The symptom: requests that were mocked start reaching the backend, or failing, after a few minutes with no MSW message. The maintainer links it to [msw#2635](https://github.com/mswjs/msw/issues/2635), the same stop on msw 2 for a page in the hidden state; the visible-page case is the msw 3 part, and the reporter's table shows msw 2 passing it. One commenter works around it with a pnpm patch. Check the issue's state for a released fix before you rely on long-lived pages.
