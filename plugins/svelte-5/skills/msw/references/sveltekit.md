# MSW in SvelteKit

This page targets SvelteKit 3 and notes where SvelteKit 2 differs. The `msw/vite`-based release of the `@msw/sveltekit` add-on was published before SvelteKit 3, and this skill has not checked it against SvelteKit 3. If the add-on's `sv` peer major differs from your `sv` CLI's major, the CLI prints a compatibility warning (the sv docs: a warning whenever the major versions differ). If it does not apply cleanly, the four pieces it generates, listed below, are the msw 3 wiring: install msw 3 (`pnpm add -D msw`) and apply them by hand.

## Start with the official add-on

```bash
npx sv add @msw/sveltekit          # existing project
npx sv create --add @msw/sveltekit # new project
```

[`@msw/sveltekit`](https://github.com/mswjs/sveltekit) installs the latest stable msw as a devDependency and, in its `msw/vite`-based releases, builds on the `msw/vite` plugin, which requires msw 3. Its `environments` option picks the browser, Node, or both; `sv add` asks "Where do you want to use MSW?" and defaults to both (`src/index.js`). While its version is 0.x, read its README for the file layout rather than trusting a copy here. It repeats Svelte's own warning that maintainers do not review community add-ons for malicious code. On a project that also runs Storybook, check the `msw-storybook-addon` blocker in `references/msw-3.md` first; while it holds, such a project stays on msw 2 and hand-wires the hooks as described below.

Know what it generates before you judge your own wiring against it. Reading the `src/index.js` of its `msw/vite`-based release, the add-on:

1. adds `msw()` from `msw/vite` to the Vite config; the plugin serves the worker script in dev and emits it only into client bundles that import `virtual:msw`, so the dev app needs no `msw init` step and no worker file in `static/`; Vitest browser tests and Storybook still use a committed file (the worker script paragraph in the main SKILL.md)
2. seeds `src/mocks/handlers`, importing from `msw/http` (an msw 3 subpath; the `msw` root exports the same `http`), with a `*/api/hello` handler. Shared handlers need a `*/` prefix or an absolute URL, because relative paths do not resolve in Node. The `*/` prefix matches every origin, your app's own included, so in the browser such a handler also answers requests to a `+server` route with the same path
3. adds `/// <reference types="msw/vite/client" />` to `src/app.d.ts`, which types `virtual:msw`
4. writes the same block into `init` of `src/hooks.client` and of `src/hooks.server`, per the chosen `environments`, under a comment explaining the `import.meta.env.DEV` guard (quoted in the bullets below):

```ts
if (import.meta.env.DEV) {
  const { network } = await import("virtual:msw");
  const { handlers } = await import("./mocks/handlers");
  network.configure({ handlers });
  await network.enable();
}
```

The same `virtual:msw` import resolves to the browser network in the client hook and to the Node network in the server hook. The block sets no `onUnhandledFrame`; `network.configure(...)` accepts one, so write `network.configure({ handlers, onUnhandledFrame: "bypass" })` when the dev app should reach the real API without warnings. The block gates on `import.meta.env.DEV` alone, so every dev server runs mocked. Add an env flag to the generated condition, for the reason in the first bullet below:

```diff
-if (import.meta.env.DEV) {
+if (import.meta.env.DEV && import.meta.env.VITE_MSW === "true") {
```

The add-on installs `msw@latest` unless `MSW_VERSION` is set when you run it (`getMswVersion` in `src/index.js`). Its hooks import `handlers` from `src/mocks/handlers`; to use the per-surface sets from `references/handlers.md`, point the generated import at your index module and its `devHandlers`: `const { devHandlers: handlers } = await import("./mocks")`. A dev app mocked for a whole working session on msw 3 can stop intercepting after about five minutes in Chromium ([msw#2801](https://github.com/mswjs/msw/issues/2801), `references/msw-3.md`); requests then reach the real backend without a message.

Add-on releases from before its `msw/vite` switch generated something else, on msw 2: the client hook statically imported a worker that `src/msw/browser` created with `setupWorker(...handlers)` at module scope and started it in `init` behind `if (dev)`, while the server hook ran `msw_server.listen({ onUnhandledRequest: 'bypass' })` at module scope behind `if (dev)`, with no `init`. That scaffold did not write the worker script: it recorded `"msw": { "workerDirectory": ["static"] }` in `package.json`, allowed msw's install script in `pnpm-workspace.yaml`, and printed `npx msw init static --save` as the next step, which also lets msw 2's `postinstall` write the file on install (read from the add-on's source, not run). Check which scaffold a project has before comparing.

Hand-wiring instead, with [`msw/browser`](https://mswjs.io/guides/integrations/browser) on the client and [`msw/node`](https://mswjs.io/guides/integrations/node) on the server ([SvelteKit hooks](https://svelte.dev/docs/kit/hooks)):

- Gate on both `import.meta.env.DEV` and an explicit env flag, such as `import.meta.env.VITE_MSW === 'true'`, set with `VITE_MSW=true` in `.env.development.local` or on the dev command. The dev check alone means every teammate's dev server is mocked whether they wanted it or not; the flag alone risks shipping msw's client code to production
- Prefer a dynamic `import()` inside the guard. In a production build the guard compiles to a literal `false`, so the branch becomes dead code and the chunk is dropped. A static import leaves it to tree-shaking to prove the module is side-effect-free, which a module-scope `setupWorker(...)` is not. Guard on `import.meta.env.DEV` rather than `dev` from `$app/environment` (`$app/env` on SvelteKit 3); the add-on's generated code explains why: "Use import.meta.env.DEV so Vite drops MSW imports before dependency discovery. SvelteKit's dev is folded later and can leave unused MSW assets in production."
- Asynchronous work in `init` delays hydration in the browser, as the SvelteKit docs state. Starting a worker is the acceptable case; do not pile more in
- Without the `msw/vite` plugin, the worker script goes in `static/`, not `public/` (`npx msw init static --save`, re-run after each msw upgrade). SvelteKit serves `static/`; for Storybook, `staticDirs: ['../static']`. Getting this wrong presents as every request failing, which reads like a handler bug

The two hooks below are for a project on msw 2; they were assembled from the hooks docs and msw's browser and node integration pages and not run here. `devHandlers` is the dev set from `references/handlers.md`; its paths need the `*/` prefix so `msw/node` can match them:

```ts
// src/hooks.client.ts
import type { ClientInit } from "@sveltejs/kit/hooks"; // on SvelteKit 2: "@sveltejs/kit"

export const init: ClientInit = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_MSW === "true") {
    const { setupWorker } = await import("msw/browser");
    const { devHandlers } = await import("./mocks");
    await setupWorker(...devHandlers).start({ onUnhandledRequest: "bypass" });
  }
};
```

```ts
// src/hooks.server.ts
import type { ServerInit } from "@sveltejs/kit/hooks"; // on SvelteKit 2: "@sveltejs/kit"

export const init: ServerInit = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_MSW === "true") {
    const slot = globalThis as typeof globalThis & {
      __mswServerStarted?: boolean;
    };
    // the hooks module runs again after an HMR reload; start one interceptor per process
    if (slot.__mswServerStarted) return;
    slot.__mswServerStarted = true;
    const { setupServer } = await import("msw/node");
    const { devHandlers } = await import("./mocks");
    setupServer(...devHandlers).listen({ onUnhandledRequest: "bypass" });
  }
};
```

To check that no msw code ships, run a production build and search its client output for an msw chunk: there should be none. `mockServiceWorker.js` is there whenever the project commits it to `static/`, for Vitest browser tests or Storybook, because SvelteKit copies `static/` as-is; nothing registers it in production, so it stays inert. On the `msw/vite` path in its default mode without a committed file, it should be absent too; `msw({ mode: "worker-only" })` writes it into every client build (the main SKILL.md).

`msw/node` patches `http`, `https` and `fetch` process-wide, so it covers `+page.server.ts`, `+server.ts` and form actions, with one large exception below.

SvelteKit does not clean up side effects a hand-wired `init` starts across an HMR reload, so they accumulate ([kit#13359](https://github.com/sveltejs/kit/issues/13359): "spinning 10x+ the number of consumers just doing simple code changes"). That issue is closed, linked to the SvelteKit 3 move of server HMR to Vite's runtime API ([kit#16490](https://github.com/sveltejs/kit/pull/16490)), and its closing comment still puts the cleanup in a Vite HMR callback: "accept seemed to work", "I had no luck with dispose". `setupServer` is one such side effect. The `globalThis` slot in the server hook above avoids a second interceptor without HMR callbacks, on SvelteKit 2 and 3 alike (assembled from the docs, not run); the interceptor it keeps also keeps the handler set it started with, so restart the dev server after changing handlers. On the `msw/vite` path, msw disposes its network across HMR itself (msw's `src/vite/runtime.ts`).

## The blind spot: your own `+server.js` routes

SvelteKit, on the `fetch` given to `load`:

> Internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call.

`msw/node` has no HTTP request to intercept: `event.fetch('/api/thing')` during SSR calls your route handler directly, so MSW never sees it. The browser worker does not cover the first load either: the [same doc](https://svelte.dev/docs/kit/load#Making-fetch-requests) says the SSR response is "captured and inlined into the rendered HTML" and that on hydration it "will be read from the HTML, guaranteeing consistency and preventing an additional network request". On the first page view, neither interceptor mocks that endpoint.

The browser worker only sees the call on a later client-side navigation, when `load` re-runs and does issue a real request. The mock therefore answers when you navigate to the page client-side and not when you reload it.

Mock what the route itself calls: the upstream API, not your own route. MSW intercepts that outbound request, your real route handler still runs, and nothing about the app changes for dev.

Escape hatch when the route has no upstream call to intercept: `handleFetch` ([SvelteKit hooks](https://svelte.dev/docs/kit/hooks)), the supported hook for replacing what server-side `event.fetch` returns. It does reach `+server.js` requests: in SvelteKit's `src/runtime/server/fetch.js`, the direct call to your route handler happens inside the `fetch` that `handleFetch` receives, so returning without calling it skips the route.

```ts
// src/hooks.server.ts
import type { HandleFetch } from "@sveltejs/kit/hooks"; // on SvelteKit 2: "@sveltejs/kit"

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_MSW === "true" &&
    new URL(request.url).pathname === "/api/thing"
  ) {
    const { default: fixture } = await import("./mocks/fixtures/thing.json");
    return Response.json(fixture);
  }
  return fetch(request);
};
```

Last resort, if neither fits: point the call at an external origin in dev so a real HTTP request exists to intercept. That adds a config seam to the app, so it ranks below the other two.

Both interceptors matter for a `fetch` to an external origin from a universal `load`: SSR hits it through `msw/node`, and a later client-side navigation hits it through the browser worker. Give both the same handler set or the same route answers differently depending on how the user arrived.

## SvelteKit + Storybook

`@storybook/sveltekit` mocks SvelteKit modules such as `$app/navigation` and `$app/state` through `parameters.sveltekit_experimental`, documented on [Storybook's SvelteKit page](https://storybook.js.org/docs/get-started/frameworks/sveltekit). None of its keys covers `fetch`, and the page does not mention it, so a component reading `page.params` and fetching needs both mechanisms. With only the first, the story renders the right route params and no data.

Stories do not run the route's `load`, so anything arriving as a `data` prop must be passed as an arg. MSW only covers `fetch` calls the component makes itself.

## Vitest

Node-mode tests of `+page.server.ts` and `+server.ts` follow the standard [node integration](https://mswjs.io/guides/integrations/node) setup, including `server.close()` in `afterAll` so the interceptor does not outlive the suite. In SvelteKit, calling a `load` function directly means you construct the event and supply `event.fetch` yourself, so MSW plays no part.
