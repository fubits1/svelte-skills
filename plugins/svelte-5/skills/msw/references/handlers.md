# Handler patterns MSW's docs don't cover

Structure, composition and runtime overrides are documented — [structuring handlers](https://mswjs.io/docs/best-practices/structuring-handlers) for directory layout and the composed index, [network behavior overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides) and [`worker.use()`](https://mswjs.io/docs/api/setup-worker/use) for per-test overrides, [dynamic mock scenarios](https://mswjs.io/docs/best-practices/dynamic-mock-scenarios) for ordering (_"the left-most handlers take precedence during request resolution"_). Read those first.

What follows is the part those pages leave out, or that only bites in a Svelte + Storybook + Vitest setup.

## One handler set per surface, not one shared array

The docs recommend a happy-path base plus overrides; they say nothing about running the same base in different environments, and the environments want opposite things:

- **Storybook** wants total coverage. Every story must be hermetic, so a catch-all belongs at the end of the set.
- **Vitest browser** wants a narrow set — usually auth and i18n, whatever every component needs to mount — with each test adding its own via `worker.use()`. Starting the Storybook set here couples every test to every mock.
- **The dev app** wants only the endpoints the backend cannot serve yet, with `onUnhandledRequest: 'bypass'` so everything else reaches the real API.

Exporting one array to all three means dev silently stops talking to your backend the moment someone adds a catch-all for a story.

## The catch-all is your missing-fixture detector

Ordering is documented; the failure signature is not. A catch-all placed before a specific route answers first, and in Storybook that surfaces as **a blank story with no error** — nothing throws, the component just renders empty. Keep catch-alls last, and make them talk:

```ts
http.get("/api/*", ({ request }) => {
  console.warn(`[MSW] Unmocked: GET ${new URL(request.url).pathname}`);
  return HttpResponse.json(null);
});
```

Treat `[MSW] Unmocked:` in the console as a failing signal while developing stories, not noise. A silent catch-all hides a missing fixture until someone notices a story rendering nothing.

## Handler modules must be import-safe

Warn on a missing fixture; never throw at module scope. Vitest tags skip a test's _body_ but still **import** the file, so a handler module that throws takes down suites that were supposed to be skipped (`frontend:vitest`). This is a seam between two tools that neither project's docs mention.

Generating handlers from an [OpenAPI document or HAR](https://github.com/mswjs/source) avoids the problem entirely for recorded APIs.

## Stateful mocks: factories, not module state

[Dynamic mock scenarios](https://mswjs.io/docs/best-practices/dynamic-mock-scenarios) covers switching between _predefined_ scenarios by query parameter. It does not cover factory functions, stateful stores, or per-test seeding — which is what you need when a story mutates data.

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

For anything relational, [`@mswjs/data`](https://github.com/mswjs/data) gives you a typed in-memory database with generated CRUD handlers rather than a hand-grown store.

## Declarative fixture overrides need loader ordering

If you add a loader that turns a plain object into handlers — so stories can say `parameters={{ fixtures: { 'api/orders/42': { status: 'OPEN' } } }}` without importing `msw` — it **must be listed before `mswLoader()`** in `preview.loaders`. Loaders run in declaration order, and `mswLoader` is what reads `parameters.msw`; register yours after it and your generated handlers are never applied.

Keep raw `parameters.msw` for what a merge cannot express: non-200 statuses, non-GET methods, entirely synthetic responses.

## Reset discipline

- **Storybook:** the addon's loader calls `resetHandlers()` before every story. Nothing to do — but see `msw-storybook-addon-v3.md` for why that means your baseline must live in `setupWorker(...)`.
- **Vitest:** [`worker.resetHandlers()`](https://mswjs.io/docs/api/setup-worker/reset-handlers) in `afterEach`, always. Without it a `worker.use()` in one test silently rewrites the network for every test after it, and the failure surfaces in an unrelated file.
- `resetHandlers(...next)` _replaces_ the baseline for the rest of the run rather than restoring it — rarely what you want mid-suite.

## WebSockets

`ws` handlers go in the same arrays and the same `setupWorker`/`setupServer` as HTTP handlers; the API, the mock-first default and `broadcast` are documented at [/docs/websocket/](https://mswjs.io/docs/websocket/). Socket.IO needs [`@mswjs/socket.io-binding`](https://github.com/mswjs/socket.io-binding).
