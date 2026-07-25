# Handler patterns MSW's docs don't cover

Read the upstream pages first: [structuring handlers](https://mswjs.io/docs/best-practices/structuring-handlers), [network behavior overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides), [`worker.use()`](https://mswjs.io/docs/api/setup-worker/use), [dynamic mock scenarios](https://mswjs.io/docs/best-practices/dynamic-mock-scenarios). They own layout, composition, ordering and per-test overrides.

What follows is what they leave out, or what only bites in a Svelte, Storybook and Vitest setup.

## One handler set per surface, not one shared array

**Exporting one array to all three surfaces means dev stops talking to your backend the moment someone adds a catch-all for a story.** That consequence is the point of this section; the upstream pages document grouping and subsetting as a mechanism but never contrast the environments, which want opposite things:

- **Storybook** wants total coverage, because every story must be hermetic, so a catch-all belongs at the end of the set.
- **Vitest browser** wants a narrow set (usually auth and i18n, whatever every component needs to mount), with each test adding its own via `worker.use()`. Starting the Storybook set here couples every test to every mock.
- **The dev app** wants only the endpoints the backend cannot serve yet, with `onUnhandledRequest: 'bypass'` so everything else reaches the real API.

## A catch-all ordered first renders a blank story with no error

Ordering is documented. The failure signature is not: a catch-all placed before a specific route answers first, nothing throws, and the component simply renders empty. Keep catch-alls last.

For detecting the missing fixture in the first place, prefer [`onUnhandledRequest`](https://mswjs.io/docs/api/setup-worker/start) over a hand-rolled logging catch-all. It defaults to `"warn"`, and `msw-storybook-addon@3` ships a version that stays quiet for asset and Storybook-internal requests while warning on everything else. Note that setting `onUnhandledRequest: 'bypass'` in Storybook, as the wiring in the main skill does, switches that detector off; keep the default while developing new stories and reach for `'bypass'` once the set is stable.

## Handler modules must be import-safe

Warn on a missing fixture; never throw at module scope. Vitest tags skip a test's _body_ but still **import** the file, so a handler module that throws takes down suites that were supposed to be skipped (`frontend:vitest`). Neither project's docs mention this seam.

Generating handlers from an [OpenAPI document or HAR](https://github.com/mswjs/source) avoids the problem for recorded APIs.

**Whatever produces your fixtures, gitignore any that carry credentials or tokens**, and build synthetic tokens in the handler at runtime rather than recording a real one. Recorded traffic is the one MSW artefact that routinely captures secrets, and a fixture directory is easy to commit without looking.

If your backend wraps every payload in an envelope, store only the inner object and wrap it in the handler, so fixtures stay small and diffable. Mark the endpoints that _don't_ follow the envelope explicitly; they are what confuses the next reader.

Compose the per-surface sets in one index module and have consumers import the set they need, never the individual files. That is what keeps "which handlers is this surface running" answerable.

## Stateful mocks: factories, not module state

[Dynamic mock scenarios](https://mswjs.io/docs/best-practices/dynamic-mock-scenarios) covers switching between _predefined_ scenarios by query parameter. It does not cover factory functions, stateful stores or per-test seeding, which is what you need when a story mutates data.

Module-level `let store = […]` is shared by every story and every test in the run, so one story's mutation leaks into the next. Export a factory:

```ts
export function createFeedMock(initial: Item[] = seed) {
  // Clone: handing the array in directly lets one test mutate the seed
  // for everyone after it.
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

Each call gets its own store. The `controller` is what a dev-only debug pane drives, so manual QA exercises the same request path production uses instead of a test-only branch.

[`@mswjs/data`](https://github.com/mswjs/data) does the same job with less code: on 0.16.x, `factory()` gives per-call isolated instances, `toHandlers('rest')` generates the CRUD handlers, and the model API (`getAll`, `deleteMany`, plus the package's `drop`) covers what a `list`/`clear` controller does. Prefer it when your data is relational, and hand-roll only when you need behaviour its generated routes will not produce, such as a deliberate 500, a delay, or a route shape that is not conventional REST. Check which API you actually have before committing: the published 0.16.x README documents `factory()`/`toHandlers()`, while the repository's current README documents a different Zod-based `Collection` API.

## A loader that generates handlers must run before the one that applies them

If you add a preview loader that builds handlers from your own data and writes them into `parameters.msw`, it **must be listed before `mswLoader()`** in `preview.loaders`. Loaders run in declaration order and `mswLoader` is what reads `parameters.msw`, so anything registered after it is never applied. Nothing warns you; the story just renders against the baseline.

Keep raw `parameters.msw` for what generated handlers cannot express, such as non-200 statuses or entirely synthetic responses.

## Reset discipline

Vitest needs [`worker.resetHandlers()`](https://mswjs.io/docs/api/setup-worker/reset-handlers) in `afterEach`, always, or one test's `worker.use()` rewrites the network for every test after it and the failure surfaces in an unrelated file. That page also covers what happens when you pass handlers to it.

In Storybook the addon's loader already resets before every story, which is exactly why your baseline must live in `setupWorker(...)` rather than in project-level parameters.

## WebSockets

`ws` handlers go in the same arrays and the same `setupWorker`/`setupServer` as HTTP handlers. The API, the mock-first default and `broadcast` are documented at [/docs/websocket/](https://mswjs.io/docs/websocket/). Socket.IO needs [`@mswjs/socket.io-binding`](https://github.com/mswjs/socket.io-binding).
