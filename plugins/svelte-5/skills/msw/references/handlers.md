# Handler patterns MSW's docs don't cover

Read the upstream pages first: [structuring handlers](https://mswjs.io/guides/best-practices/structuring-handlers), [network behavior overrides](https://mswjs.io/guides/best-practices/network-behavior-overrides), [`worker.use()`](https://mswjs.io/api/setup-worker/use), [dynamic mock scenarios](https://mswjs.io/guides/best-practices/dynamic-mock-scenarios). This page covers what fails only in a Svelte, Storybook and Vitest setup.

## Contents

- One handler set per surface
- A silent catch-all ordered first renders a blank story with no error
- Fail a Vitest browser test on an unmocked request
- Answer one query, leave the rest unhandled
- Handler modules must be import-safe
- Fixtures
- Stateful mocks: a fresh store per story or test
- A loader that generates handlers must write before `mswLoader` reads
- Reset discipline
- WebSockets

## One handler set per surface

Exporting one array to all three surfaces means dev stops talking to your backend the moment someone adds a catch-all for a story. The three surfaces' needs conflict:

- Storybook: total coverage, because every story must be hermetic (no request leaves the page). That takes a handler for every request a story makes. One catch-all at the end of the set does not replace them: it covers its own pattern, such as your API paths, and a request outside it reaches the network, reported at most by the `onUnhandledFrame` warning (next section). Make the catch-all loud: log the request and answer 404, so a missing fixture shows up as a console warning and a failed request rather than as an empty 200. Ordered first by mistake, it then names the specific route it swallowed
- Vitest browser: a narrow set (whatever every component needs to mount, such as auth and i18n), with each test adding its own via `worker.use()`. Starting the Storybook set here couples every test to every mock
- Dev app: only the endpoints the backend cannot serve yet, with `onUnhandledFrame: 'bypass'` so everything else reaches the real API

Compose the sets in one index module, and have each surface import its own set from it, never the individual files, so "which handlers does this surface run" stays answerable. `./auth`, `./catalog` and `./i18n` stand for your own handler modules, each exporting an array:

```ts
// src/mocks/index.ts
import { http, HttpResponse } from "msw";
import { authHandlers } from "./auth";
import { catalogHandlers } from "./catalog";
import { i18nHandlers } from "./i18n";

// last in the Storybook set only: a missing fixture fails loudly instead of rendering empty
const catchAll = http.all("*/api/*", ({ request }) => {
  console.warn(`[mocks] no fixture for ${request.method} ${request.url}`);
  return new HttpResponse(null, { status: 404 });
});

export const storybookHandlers = [
  ...authHandlers,
  ...i18nHandlers,
  ...catalogHandlers,
  catchAll,
];
export const vitestHandlers = [...authHandlers, ...i18nHandlers];
export const devHandlers = [...catalogHandlers];
```

Until you split your handlers, a minimal index re-exports the add-on's seeded `src/mocks/handlers` for every surface:

```ts
// src/mocks/index.ts
export {
  handlers as vitestHandlers,
  handlers as storybookHandlers,
  handlers as devHandlers,
} from "./handlers";
```

A relative path such as `/api/items` resolves against the page origin in the browser and does not resolve at all in Node. Handlers that `msw/node` also serves, such as a SvelteKit server's, need a `*/` prefix (`*/api/items`) or an absolute URL, and so does any browser request to a backend on another origin.

## A silent catch-all ordered first renders a blank story with no error

A silent catch-all (a wildcard handler such as `http.get('/api/*', ...)` that answers 200 with an empty body) placed before a specific route answers first; nothing throws, and the component renders empty. Keep catch-alls last.

The built-in detector is [`onUnhandledFrame`](https://mswjs.io/api/setup-worker/start). It defaults to `'warn'`. `msw-storybook-addon` 3's built-in default setup passes the option under its old name, which msw 3 ignores, so the plain `'warn'` default applies there. The loud catch-all reports missing fixtures under its own pattern, and only those requests, because a matched handler never reaches `onUnhandledFrame`; `'warn'` reports everything outside the pattern except paths ending in a common file extension, such as `/data/items.json`, which it skips (msw-3 reference). Keep warnings on in Storybook: `'warn'`, as the storybook reference's `preview.ts` does, or its filtering callback that ends in `defaults.warn()`. `'bypass'` switches the detector off, and requests outside the catch-all's pattern then reach the network without a message.

## Fail a Vitest browser test on an unmocked request

`onUnhandledFrame: 'error'` does not fail a browser test: MSW logs `intercepted a request without a matching request handler`, answers the request with a 500 itself, and a component that handles the failed response leaves the test green. An unhandled request ends one of two ways:

- a 500 from MSW: with `onUnhandledFrame: 'error'`, or from a callback that throws (the guard below throws)
- the network: with `'warn'` (the default) or `'bypass'`, from a callback that returns without throwing, including one that calls `defaults.error()`, which prints without blocking, and with `'error'` for a path ending in a common file extension such as `/api/items.json`, which the built-in strategies skip without a message

To fail the test, record the request in a callback and assert in `afterEach`:

```ts
// tests/setup-msw.ts, in the browser project's setupFiles
import { setupWorker, type SetupWorker } from "msw/browser";
import { afterEach, expect } from "vitest";
import { vitestHandlers } from "../src/mocks";

/**
 * what your backend serves: add the origin of a separate API
 * (VITE_API_URL), or the guard records nothing
 */
const apiOrigins = [location.origin];
const apiPrefixes = ["/api/"];

const page = globalThis as typeof globalThis & {
  __msw?: Promise<SetupWorker>;
  __mswUnmocked?: string[];
};
const unmocked = (page.__mswUnmocked ??= []);

async function start() {
  const worker = setupWorker(...vitestHandlers);
  await worker.start({
    quiet: true,
    onUnhandledFrame({ frame }) {
      if (frame.protocol !== "http") return;
      const { request } = frame.data as { request: Request };
      const url = new URL(request.url);
      // skip Vite modules, assets and every origin that is not the backend
      if (
        !apiOrigins.includes(url.origin) ||
        !apiPrefixes.some((prefix) => url.pathname.startsWith(prefix))
      ) {
        return;
      }
      unmocked.push(`${request.method} ${url.pathname}`);
      /**
       * a callback that throws makes MSW answer with a 500,
       * so the request never reaches the network
       */
      throw new Error(`${request.method} ${url.pathname} has no handler`);
    },
  });
  return worker;
}

page.__msw ??= start();
export const worker = await page.__msw;

afterEach(() => {
  worker.resetHandlers();
  expect(unmocked.splice(0), "requests without an MSW handler").toEqual([]);
});
```

The `globalThis` slot keeps one worker, and one list of recorded requests, per page: a test that imports `worker` evaluates the setup file a second time, which would otherwise start a second worker. That second evaluation registers the `afterEach` again; the extra run resets handlers that are already reset and finds the list already emptied. The `afterEach` sits at module scope and there is no `worker.stop()`, so the guard keeps working under default isolation and when `--isolate=false` puts several files in one page. A test whose request has no handler fails with `requests without an MSW handler: expected [ 'GET /api/orders' ] to deeply equal []`.

Add `tests` to the `include` of the tsconfig your `check` script type-checks, or the type checker never reads this file: `tsconfig.json` on SvelteKit (an `sv create` project includes only `src` and `vite.config.ts`), `tsconfig.app.json` on the Vite svelte-ts template.

A test adds its own handlers on the shared worker: `import { worker } from "../tests/setup-msw"` (the path from the test file), then `worker.use(http.get(...))` before it renders; the `afterEach` above removes them again.

Adapt `apiOrigins` and `apiPrefixes` to your API:

1. Export the prefixes (for example `export const apiPrefixes = ["/api/"]`) from one module
2. Import that module in the guard and in the Vite `server.proxy` config, or in the module your API client takes its base URL from, so the two cannot drift
3. Add the origin of a backend the app calls directly on another origin to `apiOrigins`

The guard has blind spots:

- A handler that matches and returns nothing, or returns `passthrough()`, never reaches the callback, so a wildcard catch-all switches the guard off for everything it covers. Keep the catch-all out of the Vitest set
- A request the test fires without awaiting can arrive after the hook has run: MSW still blocks it with a 500, but the test passes, and its entry fails the next test whose `afterEach` runs in that page. Await what the component sends, or wait for its result, before the test ends
- The callback returns on every frame that is not `http`, so a WebSocket connection without a handler goes to the network unrecorded. If components open sockets to your backend, record those before the `http` check, so the `afterEach` check fails the test; the origin and prefix filter keeps other sockets out:

  ```ts
  if (frame.protocol === "ws") {
    const { connection } = frame.data as { connection: { client: { url: URL } } };
    const url = connection.client.url;
    // ws: and wss: map to the http: and https: entries in apiOrigins
    const origin = url.origin.replace(/^ws/, "http");
    if (
      apiOrigins.includes(origin) &&
      apiPrefixes.some((prefix) => url.pathname.startsWith(prefix))
    ) {
      unmocked.push(`WS ${url.pathname}`);
    }
    return;
  }
  ```

- If you add the test name to each recorded entry, do not take it from `expect.getState().currentTestName`: it stays set after a test ends, so it names the last test that ran, not always the test that sent a late request

Register the file in the browser project only (`svelte-5:storybook-vitest` and `svelte-5:vitest` own the rest of the config). A standalone `vitest.config.ts` replaces `vite.config.ts` for Vitest, so it needs the Svelte plugin itself; a config that merges `vite.config.ts` (the storybook-vitest pattern) inherits it and must not add it again, which would compile components twice. On SvelteKit the project configuration (adapter, `compilerOptions`, `files`) lives in the `sveltekit({...})` options in `vite.config.ts`, so a standalone config that calls `sveltekit()` bare compiles with defaults: merge `vite.config.ts` instead, or import one shared options object into both configs:

```ts
// vitest.config.ts
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()], // sveltekit(sharedOptions) on SvelteKit
  test: {
    projects: [
      // your node project here, named "node"
      {
        // inherits the root plugins
        test: {
          name: "browser",
          // your browser test files, kept out of the node project's include
          include: ["src/**/*.svelte.test.ts"],
          setupFiles: ["./tests/setup-msw.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
```

To type-check `vitest.config.ts`, add it to `tsconfig.json` `include` on SvelteKit (the `sv create` `include` lists only `src` and `vite.config.ts`), or to `tsconfig.node.json` on the Vite svelte-ts template.

How this standalone config gets the worker script:

- with `msw()` in its `plugins` (`import { msw } from "msw/vite"`): served by the plugin, no committed file, like any Vitest config that loads the plugin directly or by extending `vite.config.ts`
- with a committed file: `public/mockServiceWorker.js` (`pnpm exec msw init public --save`; `static/` and `pnpm exec msw init static --save` on SvelteKit). On SvelteKit it is served before the server hook runs
- with neither, on a SvelteKit project with the `@msw/sveltekit` hooks: when the server hook's msw block runs (the generated DEV guard, or `VITE_MSW=true` with the flag from the sveltekit reference), it fails with `Cannot find module 'virtual:msw'`, then `500 GET /mockServiceWorker.js`

## Answer one query, leave the rest unhandled

A string path ignores the query: `http.get('/api/items', ...)` also answers `/api/items?page=2`, and a path written with a query (`http.get('/api/items?page=1', ...)`) drops it and logs `Found a redundant usage of query parameters in the request handler URL`. Read `new URL(request.url).searchParams` inside the resolver to vary the answer. To leave other queries unhandled, so the guard above or `onUnhandledFrame` sees them, do not match them at all; returning nothing from a resolver falls through to the next matching handler and, if none answers, sends the request to the network. A handler whose predicate checks the query does that:

```ts
import { http, HttpResponse } from "msw";
import pageOneFixture from "./fixtures/items-page-1.json";

const pageOne = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  return url.pathname === "/api/items" && url.searchParams.get("page") === "1";
};

export const itemsPageOne = http.get(pageOne, () =>
  HttpResponse.json(pageOneFixture),
);
```

Replace the string-path handler with one such handler per query you answer (page 2 gets its own predicate); a remaining `http.get('/api/items', ...)` would still answer every other page. The predicate checks the pathname only, so it answers that path on every origin; compare `url.origin` too when a backend on another origin serves the same path.

## Handler modules must be import-safe

Warn on a missing fixture; never throw at module scope. Vitest tags skip a test's body but still import the file, so a handler module that throws takes down suites that were supposed to be skipped (`svelte-5:vitest`).

## Fixtures

Generating handlers from an [OpenAPI document or HAR](https://github.com/mswjs/source) replaces hand-written fixture lookups for recorded APIs; use an `@msw/source` release whose `msw` peer range names msw 3.

Gitignore any fixture that carries credentials or tokens, whatever produced it, and build synthetic tokens in the handler at runtime rather than recording a real one. Recorded traffic captures whatever the backend sent, tokens and personal data included, and a fixture directory is easy to commit without looking.

If your backend wraps every payload in an envelope, store only the inner object and wrap it in the handler, so fixtures stay small and diffable. Mark each endpoint that returns an unwrapped payload, so its handler does not wrap it.

## Stateful mocks: a fresh store per story or test

[Dynamic mock scenarios](https://mswjs.io/guides/best-practices/dynamic-mock-scenarios) covers switching between predefined scenarios by query parameter. A story that mutates data needs a store that each story or test starts fresh.

Module-level `let store = [...]` is shared by every story and every test in the run, so one story's mutation leaks into the next. Export a factory:

```ts
import { http, HttpResponse } from "msw";

type Item = { id: string; title: string; done: boolean };
const seed: Item[] = [{ id: "1", title: "First", done: false }];

export function createFeedMock(initial: Item[] = seed) {
  // clone, so one test cannot mutate the seed for the tests after it
  let store = initial.map((item) => ({ ...item }));

  const handlers = [
    http.get("/api/items", () => HttpResponse.json(store)),
    http.patch("/api/items/:id", async ({ params, request }) => {
      const patch = (await request.json()) as Partial<Item>;
      store = store.map((item) =>
        item.id === params.id ? { ...item, ...patch } : item,
      );
      return HttpResponse.json({ ok: true });
    }),
  ];

  return {
    handlers,
    controller: { list: () => store, clear: () => (store = []) },
  };
}
```

Each call gets its own store, so call the factory where a fresh store should start:

- per test: `worker.use(...createFeedMock().handlers)`
- per story, surviving re-renders of that story: one store per story in the story file's `<script module>` (`const feedEmpty = createFeedMock([])`, `const feedFull = createFeedMock()`), each applied only in its own story with `beforeEach={({ msw }) => msw.use(...feedFull.handlers)}`, because stories that share one store share its mutations. An existing `parameters.msw` literal behaves the same way, because it is evaluated once when the story file loads
- fresh on every render: call the factory inside `beforeEach`, `msw.use(...createFeedMock().handlers)`

Passing `createFeedMock().handlers` to `setupWorker(...)` brings the shared store back, because the worker starts once per page in Vitest and `mswLoader` caches it in Storybook. To drive the store during manual QA, wire the `controller` into a dev-only debug pane: requests keep the production path, and the app needs no test-only branch.

For relational data, [`@msw/data`](https://github.com/mswjs/data) offers a Standard Schema-based `Collection` API with relations, documented at [mswjs.io/ecosystem/data](https://mswjs.io/ecosystem/data/). It stores and queries data and generates no handlers, so write the handlers on top of it. The older `@mswjs/data` (`factory()`, `toHandlers()`) declares an msw 2 range and reads `graphql` from the `msw` root, which msw 3 does not export; use `@msw/data` with msw 3.

## A loader that generates handlers must write before `mswLoader` reads

If you add a loader that builds handlers from your own data and writes them into `parameters.msw`, put it at project level next to `mswLoader()` in `preview.loaders`, and make it write before its first `await`. Storybook runs the loader levels in turn (project, component, story) and starts the loaders within a level together, calling them in declaration order; the "run in parallel" of the [loaders docs](https://storybook.js.org/docs/writing-stories/loaders) holds within a level. `mswLoader` awaits before it reads `parameters.msw`, so a synchronous write from any project-level loader lands in time. A write after an `await` can race it, and a component- or story-level loader runs only after the project level has finished, so its write always comes too late. Nothing warns you, and the story renders against the baseline. This works on the `mswLoader()` path only: `createPreviewAnnotations` ignores `parameters.msw`, so stay on `mswLoader()` while a loader generates handlers.

Write what generated handlers cannot express, such as non-200 statuses or synthetic responses with no source data, as a `beforeEach={({ msw }) => msw.use(...)}` override on that `<Story>`: it runs after `mswLoader` has applied the generated set, so its handlers take precedence.

## Reset discipline

Vitest needs [`worker.resetHandlers()`](https://mswjs.io/api/setup-worker/reset-handlers) in every `afterEach`, or one test's `worker.use()` rewrites the network for every test after it and the failure surfaces in an unrelated file. Call it without arguments: `resetHandlers(...next)` makes `next` the baseline that every later reset restores.

In Storybook the addon's loader resets to the `setupWorker` set before every story, and a story's own `parameters.msw` replaces a project-level one, so the baseline lives in `setupWorker(...)`.

## WebSockets

`ws` handlers go in the same arrays and the same `setupWorker`/`setupServer` as HTTP handlers. The mock-first default is documented at [/docs/websocket/](https://mswjs.io/docs/websocket/), the API, `.broadcast(data)` included, at [/api/ws](https://mswjs.io/api/ws). The life-cycle event for a new connection on `worker.events` is `websocket:connection`; a `ws.link(...)` handler listens for `connection`. For Socket.IO, run `pnpm view @mswjs/socket.io-binding peerDependencies`: use [the binding](https://github.com/mswjs/socket.io-binding) only when its `msw` range names msw 3; otherwise mock the Socket.IO client module instead (`vi.mock`, `svelte-5:testing-svelte`).
