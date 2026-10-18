# Handler patterns MSW's docs don't cover

Read the upstream pages first: [structuring handlers](https://mswjs.io/guides/best-practices/structuring-handlers), [network behavior overrides](https://mswjs.io/guides/best-practices/network-behavior-overrides), [`worker.use()`](https://mswjs.io/api/setup-worker/use), [dynamic mock scenarios](https://mswjs.io/guides/best-practices/dynamic-mock-scenarios). This page covers what fails only in a Svelte, Storybook and Vitest setup.

## Contents

- One handler set per surface, not one shared array
- A silent catch-all ordered first renders a blank story with no error
- Fail a Vitest browser test on an unmocked request
- Answer one query, leave the rest unhandled
- Handler modules must be import-safe
- Fixtures
- Stateful mocks: factories, not module state
- A loader that generates handlers must write before `mswLoader` reads
- Reset discipline
- WebSockets

## One handler set per surface, not one shared array

Exporting one array to all three surfaces means dev stops talking to your backend the moment someone adds a catch-all for a story. The upstream pages document grouping and subsetting as a mechanism but never contrast the three environments, whose needs conflict:

- Storybook: total coverage, because every story must be hermetic (no request leaves the page), so a catch-all belongs at the end of the set. Make it loud: log the request and answer 404, so a missing fixture shows up as a console warning and a failed request rather than as an empty 200. Ordered first by mistake, it then names the specific route it swallowed (both measured)
- Vitest browser: a narrow set (whatever every component needs to mount, such as auth and i18n), with each test adding its own via `worker.use()`. Starting the Storybook set here couples every test to every mock
- Dev app: only the endpoints the backend cannot serve yet, with `onUnhandledFrame: 'bypass'` (`onUnhandledRequest` on msw 2) so everything else reaches the real API

Compose the sets in one index module, and have each surface import its own set from it, never the individual files, so "which handlers does this surface run" stays answerable:

```ts
// src/mocks/index.ts; ./auth, ./catalog and ./i18n are your own handler modules, each exporting an array
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

A relative path such as `/api/items` resolves against the page origin in the browser and does not resolve at all in Node. Handlers that `msw/node` also serves, such as a SvelteKit server's, need a `*/` prefix (`*/api/items`) or an absolute URL, and so does any browser request to a backend on another origin.

## A silent catch-all ordered first renders a blank story with no error

The docs cover ordering but not its failure signature: a silent catch-all (a wildcard handler such as `http.get('/api/*', ...)` that answers 200 with an empty body) placed before a specific route answers first, nothing throws, and the component renders empty. Keep catch-alls last.

The built-in detector is [`onUnhandledFrame`](https://mswjs.io/api/setup-worker/start) (`onUnhandledRequest` on msw 2). It defaults to `'warn'`. On msw 2, the built-in default setup of `msw-storybook-addon` 3 stays quiet for asset and Storybook-internal requests while warning on everything else; on msw 3 that setup's option is ignored and the plain `'warn'` default applies (`references/msw-3.md`). The two work together: the loud catch-all reports missing fixtures under its own pattern, and only those requests, because a matched handler never reaches `onUnhandledFrame`; `'warn'` reports everything outside the pattern. Keep `'warn'` in Storybook, as the `preview.ts` in `references/storybook.md` does. `'bypass'` switches the detector off, and requests outside the catch-all's pattern then reach the network without a message.

## Fail a Vitest browser test on an unmocked request

`onUnhandledFrame: 'error'` does not fail a browser test: MSW logs `intercepted a request without a matching request handler`, answers the request with a 500 itself, and a component that handles the failed response leaves the test green (measured on msw 3 with Vitest 5). On msw 3, an unhandled request ends one of two ways:

- a 500 from MSW: with `onUnhandledFrame: 'error'`, or from a callback that throws (both measured; the guard below throws)
- the network: with `'warn'` (the default) or `'bypass'`, or from a callback that returns without throwing, including one that calls `defaults.error()`, which only prints (`references/msw-3.md`; read from msw's `on-unhandled-frame.ts`)

To fail the test, record the request in a callback and assert in `afterEach`:

```ts
// tests/setup-msw.ts, in the browser project's setupFiles
import { setupWorker, type SetupWorker } from "msw/browser";
import { afterEach, expect } from "vitest";
import { vitestHandlers } from "../src/mocks";

// what your backend serves; add the origin of a separate API (VITE_API_URL) or the guard records nothing
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
      // a callback that throws makes MSW answer with a 500, so the request never reaches the network
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

The `globalThis` slot keeps one worker, and one list of recorded requests, per page: a test that imports `worker` evaluates the setup file a second time, which would otherwise start a second worker. That second evaluation registers the `afterEach` again; the extra run resets handlers that are already reset and finds the list already emptied (read from the code). The `afterEach` sits at module scope and there is no `worker.stop()`, so the guard keeps working when `--isolate=false` puts several files in one page (`references/msw-3.md`, "One worker per page"). Measured on msw 3 with Vitest 5:

- a test that swallows the 500 fails with `requests without an MSW handler: expected [ 'GET /api/orders' ] to deeply equal []`
- a test whose requests all have handlers passes
- with two test files, under default isolation and under `--isolate=false --no-file-parallelism`, each file's unmocked request failed its test
- with the recording switched off, both tests passed

A test adds its own handlers on the shared worker: `import { worker } from "../tests/setup-msw"` (the path from the test file), then `worker.use(http.get(...))` before it renders; the `afterEach` above removes them again.

Adapt `apiOrigins` and `apiPrefixes` to your API, and build them from what your dev proxy or API client uses: export the prefixes (for example `export const apiPrefixes = ["/api/"]`) from one module and import it in both the Vite `server.proxy` config and the guard, so the two cannot drift. An app that calls a backend on another origin directly needs that origin in `apiOrigins`. The guard has blind spots (measured):

- A handler that matches and returns nothing, or returns `passthrough()`, never reaches the callback, so a wildcard catch-all switches the guard off for everything it covers. Keep the catch-all out of the Vitest set
- A request the test fires without awaiting can arrive after the hook has run: MSW still blocks it with a 500, but the test passes, and its entry fails the next test whose `afterEach` runs in that page (read from the guard's code). Await what the component sends, or wait for its result, before the test ends
- `expect.getState().currentTestName` stays set after a test ends, so a label built from it names the last test that ran, not always the test that sent a late request

On msw 2, the same file works with this option in place of `onUnhandledFrame` (measured on msw 2 with the same Vitest, Vite and Chromium versions, 3 of 3 runs, same failure message; that run had the hooks inside `start()` and default isolation). The request is the callback's argument, so there is no frame or protocol check, and no throw is needed for the `afterEach` assertion to fail the test. The unhandled request still reaches the network unless the callback throws: msw 2 releases since the network-source rewrite ([msw#2650](https://github.com/mswjs/msw/pull/2650)) pass it through after the callback in `src/core/experimental/frames/http-frame.ts` and error it when the callback throws; earlier ones passed it through in `src/core/utils/handleRequest.ts` (read from the source). Add the same `throw` if it must not; what the throw does on msw 2 was not measured.

```ts
onUnhandledRequest(request) {
  const url = new URL(request.url);
  if (!apiOrigins.includes(url.origin) || !apiPrefixes.some((prefix) => url.pathname.startsWith(prefix))) return;
  unmocked.push(`${request.method} ${url.pathname}`);
},
```

msw 2 does not throw on a second worker in the same page: it logs `Found a redundant "worker.start()" call` instead (measured on msw 2). Keep the `globalThis` slot anyway: whether a test's `worker.use()` on the second instance takes effect was not measured.

Register the file in the browser project only (`svelte-5:storybook-vitest` and `frontend:vitest` own the rest of the config). A standalone `vitest.config.ts` replaces `vite.config.ts` for Vitest, so it needs the Svelte plugin itself; a config that merges `vite.config.ts` (the storybook-vitest pattern) inherits it and must not add it again, which would compile components twice:

```ts
// vitest.config.ts
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()], // sveltekit() on SvelteKit
  test: {
    projects: [
      // your node project here, named "node" for SETUP.md's test:unit script
      {
        // inherits the root plugins on Vitest 5; Vitest 4 needs extends: true here
        test: {
          name: "browser",
          include: ["src/**/*.svelte.test.ts"], // your browser test files, kept out of the node project's include
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

The measurement served a committed `public/mockServiceWorker.js` from `npx msw init public`. msw's Vitest page sends Vite users to the `msw/vite` integration, which it says "automatically covers Vitest"; that path was not measured here.

## Answer one query, leave the rest unhandled

A string path ignores the query: `http.get('/api/items', ...)` also answers `/api/items?page=2` (measured). Read `new URL(request.url).searchParams` inside the resolver to vary the answer. To leave other queries unhandled, so the guard above or `onUnhandledFrame` sees them, do not match them at all; returning nothing from a resolver passes the request through instead. A handler whose predicate checks the query does that (measured on msw 3):

```ts
import { HttpHandler, HttpResponse } from "msw";
import pageOneFixture from "./fixtures/items-page-1.json";

const pageOne = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  return url.pathname === "/api/items" && url.searchParams.get("page") === "1";
};

export const itemsPageOne = new HttpHandler("GET", pageOne, () =>
  HttpResponse.json(pageOneFixture),
);
```

Replace the string-path handler with one such handler per query you answer (page 2 gets its own predicate); a remaining `http.get('/api/items', ...)` would still answer every other page. The predicate checks the pathname only, so it answers that path on every origin; compare `url.origin` too when a backend on another origin serves the same path. `HttpHandler` is a root export of `msw` on both majors.

## Handler modules must be import-safe

Warn on a missing fixture; never throw at module scope. Vitest tags skip a test's body but still import the file, so a handler module that throws takes down suites that were supposed to be skipped (`frontend:vitest`).

Generating handlers from an [OpenAPI document or HAR](https://github.com/mswjs/source) avoids the problem for recorded APIs; which `@msw/source` releases match your msw major is in the companion table of `references/msw-3.md`.

## Fixtures

Gitignore any fixture that carries credentials or tokens, whatever produced it, and build synthetic tokens in the handler at runtime rather than recording a real one. Recorded traffic captures whatever the backend sent, tokens and personal data included, and a fixture directory is easy to commit without looking.

If your backend wraps every payload in an envelope, store only the inner object and wrap it in the handler, so fixtures stay small and diffable. Mark each endpoint that does not follow the envelope; those endpoints confuse the next reader.

## Stateful mocks: factories, not module state

[Dynamic mock scenarios](https://mswjs.io/guides/best-practices/dynamic-mock-scenarios) covers switching between predefined scenarios by query parameter. A story that mutates data needs factory functions, stateful stores or per-test seeding, and that page covers none of them.

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

Each call gets its own store, so call the factory where a fresh store should start: per test with `worker.use(...createFeedMock().handlers)`, or per story in its `parameters.msw`. Passing it to `setupWorker(...)` brings the shared store back, because the worker starts once per page in Vitest and `mswLoader` caches it in Storybook. A dev-only debug pane drives the `controller`, so manual QA exercises the request path production uses, with no test-only branch.

[`@mswjs/data`](https://github.com/mswjs/data) does the same job with less code: `factory()` gives per-call isolated instances, `toHandlers('rest')` generates the CRUD handlers, and the model API (`getAll`, `deleteMany`, plus the package's `drop`) covers what a `list`/`clear` controller does. On msw 2, prefer it when your data is relational, and hand-roll only when you need behaviour its generated routes will not produce, such as a deliberate 500, a delay, or a route shape that is not conventional REST. Check which API your installed version has before committing: the README of the published `@mswjs/data` documents `factory()`/`toHandlers()`, while the repository publishes `@msw/data`, a Standard Schema-based `Collection` API documented on mswjs.io. `@mswjs/data` is built for msw 2: it imports `graphql` from the `msw` root, which msw 3 no longer exports.

## A loader that generates handlers must write before `mswLoader` reads

If you add a loader that builds handlers from your own data and writes them into `parameters.msw`, put it at project level next to `mswLoader()` in `preview.loaders`, and make it write before its first `await`. Storybook runs the loader levels in turn (project, component, story) and starts the loaders within a level together, calling them in declaration order (`Promise.all(loaders.map((loader) => loader(context)))` in `prepareStory.ts`; the [loaders docs](https://storybook.js.org/docs/writing-stories/loaders) say they "run in parallel"). `mswLoader` awaits before it reads `parameters.msw` (`src/csf3.ts` in addon 3; addon 2's loader awaits the worker first too), so a synchronous write from any project-level loader lands in time. A write after an `await` races it, and a component- or story-level loader runs only after the project level has finished, so its write always comes too late (read from the sources, not measured). Nothing warns you, and the story renders against the baseline.

Keep raw `parameters.msw` for what generated handlers cannot express, such as non-200 statuses or synthetic responses with no source data.

## Reset discipline

Vitest needs [`worker.resetHandlers()`](https://mswjs.io/api/setup-worker/reset-handlers) in every `afterEach`, or one test's `worker.use()` rewrites the network for every test after it and the failure surfaces in an unrelated file. That page also covers what happens when you pass handlers to it.

In Storybook the addon's loader resets before every story, so your baseline must live in `setupWorker(...)`, not in project-level parameters.

## WebSockets

`ws` handlers go in the same arrays and the same `setupWorker`/`setupServer` as HTTP handlers. The API, the mock-first default and `broadcast` are documented at [/docs/websocket/](https://mswjs.io/docs/websocket/). On msw 3 the life-cycle event for a new connection is `websocket:connection` (`connection` on msw 2). Socket.IO needs [`@mswjs/socket.io-binding`](https://github.com/mswjs/socket.io-binding), which supports msw 2 only.
