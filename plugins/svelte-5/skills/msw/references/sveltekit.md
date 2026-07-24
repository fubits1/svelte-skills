# MSW in SvelteKit

## Start with the official add-on

```bash
npx sv add @msw/sveltekit          # existing project
npx sv create --add @msw/sveltekit # new project
npx msw init static --save         # the add-on does not generate the worker
```

[`@msw/sveltekit`](https://github.com/mswjs/sveltekit) scaffolds the shared handlers, the browser worker wired into `src/hooks.client`, the Node server wired into `src/hooks.server`, and the worker config. Its README documents the file layout and the `environments` option — read it there rather than trusting a copy that will drift. Svelte's maintainers do not review community add-ons; read what it writes.

Hand-wire only when the add-on doesn't fit. The seams are the [`init` hooks](https://svelte.dev/docs/kit/hooks#Shared-hooks-init) — the earliest point in each runtime — with [`msw/browser`](https://mswjs.io/docs/integrations/browser) on the client and [`msw/node`](https://mswjs.io/docs/integrations/node) on the server. Two things to get right either way:

- **Gate on `dev` and import `msw` dynamically.** `dev` compiles to `false` in a production build, so the branch becomes dead code and the chunk is dropped. A static import ships MSW to users.
- **The worker goes in `static/`, not `public/`.** SvelteKit serves `static/`; for Storybook, `staticDirs: ['../static']`. Getting this wrong presents as every request failing with "Failed to fetch", which reads like a handler bug.

Vite re-executes SSR modules on HMR and `init` can run again — park the server instance on `globalThis` if you see handlers registered twice.

## The blind spot: your own `+server.js` routes

No documentation states this as an MSW consequence, and it is the one that wastes a day.

SvelteKit, on the `fetch` given to `load`:

> Internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call.

There is no HTTP request for `msw/node` to intercept. `event.fetch('/api/thing')` during SSR calls your route handler directly; MSW never sees it. After hydration the browser _does_ issue the request, so the same endpoint looks mocked on the client and unmocked on the server.

Three ways out, best first:

1. **Mock what the route itself calls** — the upstream API, not your own route. MSW intercepts that outbound request normally and your real route handler still runs on both passes.
2. **[`handleFetch`](https://svelte.dev/docs/kit/hooks#Server-hooks-handleFetch)** — the supported hook for replacing what server-side `event.fetch` returns:

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

3. **Point the call at an external origin** in dev so a real request exists to intercept. Adds a config seam; use when 1 and 2 don't fit.

Related consequence: a universal `load` in `+page.ts` runs on the server during SSR **and again in the browser on hydration**. Handlers that disagree between the two interceptors produce a hydration flash where server HTML and client render differ — a symptom that reads like a Svelte bug and isn't one.

## SvelteKit + Storybook

`@storybook/sveltekit` mocks **navigation**, not the network — `$app/state`'s `page`, `navigating` and `updated` come from `parameters.sveltekit_experimental`. It does nothing to `fetch`. A component that reads `page.params` _and_ fetches needs both mechanisms, and forgetting the second is why a story renders with the right route params and no data.

Stories do not run the route's `load`, so anything arriving as a `data` prop must be passed as an arg. MSW only covers `fetch` calls the component makes itself.

## Vitest

Node-mode tests of `+page.server.ts` / `+server.ts` use `setupServer` with `server.resetHandlers()` in `afterEach` and `server.close()` in `afterAll` ([node integration](https://mswjs.io/docs/integrations/node)). Calling a `load` function directly means you supply `event.fetch` yourself — MSW is neither involved nor needed.
