# MSW in SvelteKit

## Start with the official add-on

```bash
npx sv add @msw/sveltekit          # existing project
npx sv create --add @msw/sveltekit # new project
npx msw init static --save         # the add-on does not generate the worker
```

[`@msw/sveltekit`](https://github.com/mswjs/sveltekit) scaffolds the shared handlers, the browser worker wired into `src/hooks.client`, the Node server wired into `src/hooks.server`, and the worker config. It is pre-1.0, so read its README for the current file layout and the `environments` option rather than trusting a copy here. It repeats Svelte's own warning that maintainers do not review community add-ons for malicious code.

Know what it generates before you judge your own wiring against it. Reading `src/index.js` in that repo: the client hook gets a **static** `import { worker }` plus `export async function init() { if (dev) { ... } }`, where `src/msw/browser` calls `setupWorker(...handlers)` at module scope. The server hook is not an `init` at all, but a module-scope `if (dev) { msw_server.listen({ onUnhandledRequest: 'bypass' }) }`. So `init` is a client-side seam in that scaffold, not a symmetric one.

Hand-wiring instead, with [`msw/browser`](https://mswjs.io/docs/integrations/browser) on the client and [`msw/node`](https://mswjs.io/docs/integrations/node) on the server ([SvelteKit hooks](https://svelte.dev/docs/kit/hooks)):

- **Gate on both `dev` and an explicit env flag.** `dev` alone means every teammate's dev server is mocked whether they wanted it or not; the flag alone risks shipping the worker to production.
- **Prefer a dynamic `import()` inside the guard.** `dev` compiles to a literal `false`, so the branch becomes dead code and the chunk is dropped. A static import leaves it to tree-shaking to prove the module is side-effect-free, which a module-scope `setupWorker(...)` is not.
- **Asynchronous work in `init` delays hydration**, which the SvelteKit docs say outright. Starting a worker is the acceptable case; do not pile more in.
- **The worker goes in `static/`, not `public/`.** SvelteKit serves `static/`; for Storybook, `staticDirs: ['../static']`. Getting this wrong presents as every request failing, which reads like a handler bug.

`msw/node` patches `http`, `https` and `fetch` process-wide, so it covers `+page.server.ts`, `+server.ts` and form actions, with one large exception below.

Side effects started in `init` are not cleaned up across an HMR reload, so they accumulate: SvelteKit has an open request for a server-side `hot.dispose` equivalent precisely because of this ([kit#13359](https://github.com/sveltejs/kit/issues/13359), where the reporter ends up "spinning 10x+ the number of consumers just doing simple code changes"). `setupServer` is exactly that kind of side effect. Park the instance on `globalThis` and return early if it is already set, or accept restarting the dev server on every change.

## The blind spot: your own `+server.js` routes

No documentation states this as an MSW consequence, and it is the one that wastes a day.

SvelteKit, on the `fetch` given to `load`:

> Internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call.

There is no HTTP request for `msw/node` to intercept. `event.fetch('/api/thing')` during SSR calls your route handler directly, so MSW never sees it. Nor does the browser worker rescue you on first load: the [same doc](https://svelte.dev/docs/kit/load#Making-fetch-requests) says the SSR response is "captured and inlined into the rendered HTML" and that on hydration it "will be read from the HTML, guaranteeing consistency and preventing an additional network request". So on the first page view that endpoint is mocked by neither interceptor.

The browser worker only sees the call on a later client-side navigation, when `load` re-runs and does issue a real request. That asymmetry is the confusing part: the endpoint works when you click into the page and not when you reload it.

**Mock what the route itself calls**, the upstream API rather than your own route. MSW intercepts that outbound request normally, your real route handler still runs, and nothing about the app changes for dev.

Escape hatch when the route has no upstream call to intercept: `handleFetch` ([SvelteKit hooks](https://svelte.dev/docs/kit/hooks)), the supported hook for replacing what server-side `event.fetch` returns. SvelteKit calls it before the internal-route short-circuit, so it does reach `+server.js` requests.

Last resort, if neither fits: point the call at an external origin in dev so a real HTTP request exists to intercept. That adds a config seam to the app, which is why it ranks below the other two.

```ts
export const handleFetch: HandleFetch = async ({ request, fetch }) => {
  if (dev && request.url.includes("/api/thing")) {
    return new Response(JSON.stringify(fixture), {
      headers: { "content-type": "application/json" },
    });
  }
  return fetch(request);
};
```

Where the two interceptors genuinely both matter is a `fetch` to an **external** origin from a universal `load`: SSR hits it through `msw/node`, and a later client-side navigation hits it through the browser worker. Give both the same handler set or the same route answers differently depending on how the user arrived.

## SvelteKit + Storybook

`@storybook/sveltekit` mocks **navigation** and does nothing to `fetch`. Its `parameters.sveltekit_experimental` surface is documented on [Storybook's SvelteKit page](https://storybook.js.org/docs/get-started/frameworks/sveltekit). The part that page does not say: a component reading `page.params` _and_ fetching needs both mechanisms, and forgetting the second is why a story renders with the right route params and no data.

Stories do not run the route's `load`, so anything arriving as a `data` prop must be passed as an arg. MSW only covers `fetch` calls the component makes itself.

## Vitest

Node-mode tests of `+page.server.ts` and `+server.ts` follow the standard [node integration](https://mswjs.io/docs/integrations/node) setup, including `server.close()` in `afterAll` so the interceptor does not outlive the suite. The SvelteKit-specific part: calling a `load` function directly means you construct the event and supply `event.fetch` yourself, so MSW plays no part.
