# MSW in SvelteKit

This page targets SvelteKit 3 with msw 3.

## Contents

- Start with the `@msw/sveltekit` add-on
- What the add-on generates
- Adjust the generated hooks
- HMR in dev
- Check that no msw code ships
- The blind spot: your own `+server.js` routes
- SvelteKit + Storybook
- Vitest

## Start with the `@msw/sveltekit` add-on

[`@msw/sveltekit`](https://github.com/mswjs/sveltekit) installs the latest stable msw as a devDependency, or the version in `MSW_VERSION` when that is set as you run it, and its README requires msw 3 for the Vite integration. Its `environments` option picks the browser, Node, or both; `sv add` asks "Where do you want to use MSW?" and defaults to both. It is a community `sv` add-on from the msw team (mswjs), and `sv` warns before downloading it that "Svelte maintainers have not reviewed community add-ons for malicious code".

1. Read what the add-on does before `sv` runs it:
   1. Read `src/index.js` at the tag (`v<version>`) of the version `pnpm view @msw/sveltekit version` reports, and the README for the current file layout
   2. Compare it with the published `dist/index.mjs` on unpkg, which is what `sv` runs. Its only import statements are `sv` and `./sv-utils.mjs`; the `msw/http` import inside the seeded handlers template string is file content
   3. `dist/sv-utils.mjs` is a large build of the Svelte CLI's `@sveltejs/sv-utils` (`src/sv-utils.js` only re-exports it). Search it without saving it: `curl -sL https://unpkg.com/@msw/sveltekit@latest/dist/sv-utils.mjs | grep -n -e child_process -e execSync -e 'fetch('`. Expect the `node:child_process` import, `execSync("pnpm --version")`, and one `fetch(url)` inside `downloadJson`; read every other hit before you continue
   4. In total, expect the `pnpm --version` check from sub-step 3, one lookup of msw's latest version on registry.npmjs.org (skipped when `MSW_VERSION` is set), the msw devDependency, and the four pieces under "What the add-on generates"; stop on anything else
2. Run the add-on:

   ```bash
   pnpm dlx sv@latest add @msw/sveltekit@latest          # existing project
   pnpm dlx sv@latest create --add @msw/sveltekit@latest # new project
   ```

   Without a terminal, pass every answer as a flag: `pnpm dlx sv@latest add @msw/sveltekit@latest="environments:browser,node" --install pnpm --no-download-check` (or `environments:node`), plus `--no-git-check` when the working tree has uncommitted changes; for a new project, `pnpm dlx sv@latest create my-app --template minimal --types ts --add @msw/sveltekit@latest="environments:browser,node" --install pnpm --no-download-check`. The option answers "Where do you want to use MSW?" (the add-on's README documents `environments` and its values); `--install` answers the package-manager prompt; `--no-download-check` skips `sv`'s confirmation for a community add-on, so pass it only after step 1

3. Ignore a compatibility warning from `sv` about the add-on's `sv` peer when the add-on applies cleanly
4. If it does not apply cleanly, install msw (`pnpm add -D msw`) and apply the four pieces below by hand

## What the add-on generates

1. `msw()` from `msw/vite` in the Vite config:
   - it serves the worker script to the dev server and to every Vitest browser project whose config loads it, the Vitest storybook project included, so the dev app and those Vitest projects need no `msw init` step and no worker script in `static/`
   - for Storybook, open `/mockServiceWorker.js` on the `storybook dev` origin to confirm the plugin serves it there; a `storybook build` never contains it from the plugin, so for a built Storybook, or when `storybook dev` does not serve it, commit it to `static/` (`pnpm exec msw init static --save`); `sveltekit()` sets Vite's `publicDir` to `static/`, which Storybook's builder copies, so no `staticDirs` entry is needed
   - it emits the script only into client bundles that import `virtual:msw`
2. `src/mocks/handlers`, importing from `msw/http` (the `msw` root exports the same `http`), seeded with a `*/api/hello` handler. Shared handlers need a `*/` prefix or an absolute URL, because relative paths do not resolve in Node. The `*/` prefix matches every origin, your app's own included, so in the browser such a handler also answers requests to a `+server` route with the same path
3. `/// <reference types="msw/vite/client" />` in `src/app.d.ts`, which types `virtual:msw`
4. the same block in `init` of `src/hooks.client` and of `src/hooks.server`, per the chosen `environments`, under a comment explaining the `import.meta.env.DEV` guard:

   ```ts
   if (import.meta.env.DEV) {
     const { network } = await import("virtual:msw");
     const { handlers } = await import("./mocks/handlers");
     network.configure({ handlers });
     await network.enable();
   }
   ```

The same `virtual:msw` import resolves to the browser network in the client hook and to the Node network, built from `msw/node`'s default network options, in the server hook.

## Adjust the generated hooks

1. Add an env flag to the DEV guard, set with `VITE_MSW=true` in `.env.development.local` or on the dev command. The DEV check alone means every teammate's dev server is mocked whether they wanted it or not; the flag alone risks shipping msw's client code to production:

   ```diff
   -if (import.meta.env.DEV) {
   +if (import.meta.env.DEV && import.meta.env.VITE_MSW === "true") {
   ```

2. Let the dev app reach the real API without warnings for everything you do not mock: `network.configure({ handlers, onUnhandledFrame: "bypass" })`. The generated block sets no `onUnhandledFrame`, so in the browser network the default `'warn'` also fires for the dev server's own `.svelte` module requests, such as `GET /src/routes/+page.svelte`
3. Use the per-surface sets from the handlers reference: point the generated import at your index module and its `devHandlers`, `const { devHandlers: handlers } = await import("./mocks")`. Their paths need the `*/` prefix so the Node network can match them. The seeded `src/mocks/handlers` is then wired to nothing: import it into the index module's sets, or delete it

Keep what the generated block already does right:

- a dynamic `import()` inside the DEV guard: in a production build the guard compiles to a literal `false`, so the branch is dropped. A static import leaves it to tree-shaking to prove the module is side-effect-free
- `import.meta.env.DEV`, not `dev` from `$app/env`: Vite folds `import.meta.env.DEV` early enough to drop the MSW imports before dependency discovery, while SvelteKit's `dev` is folded later and can leave unused MSW assets in production (the add-on's generated comment)
- no other asynchronous work in the client `init`: asynchronous work there delays hydration ([SvelteKit hooks](https://svelte.dev/docs/kit/hooks), `init`). Starting the network is the acceptable case

For a Vitest config or Storybook that does not load the `msw/vite` plugin, and for a built Storybook either way, the committed worker script goes in `static/`, not `public/` (`pnpm exec msw init static --save`, re-run after each msw upgrade): SvelteKit serves `static/`, and Storybook picks it up through Vite's `publicDir` without `staticDirs`. Getting this wrong presents as every request failing, which reads like a handler bug.

## HMR in dev

An edit to `hooks.server.ts` or to a module it imports, such as the handlers, re-runs the server `init`. On the add-on path the server hook needs no extra code: the generated block configures the edited handlers, and msw disposes the previous network across HMR itself.

SvelteKit does not clean up side effects that a hand-wired `init` starts, so they accumulate across these re-runs: a `setupServer(...).listen()` in `init` starts another listening server on every edit, and each one handles every request. Prefer the add-on's `virtual:msw` network, which disposes itself in the server hook. Only when a project cannot use the add-on, a hand-wired server needs a `globalThis` slot that closes the previous server before the next `listen()`; an `import.meta.hot.dispose` callback registered in the hook does not run on these reloads:

```ts
// src/hooks.server.ts
import type { ServerInit } from "@sveltejs/kit/hooks";
import type { SetupServer } from "msw/node";

const slot = globalThis as typeof globalThis & { __mswServer?: SetupServer };

export const init: ServerInit = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_MSW === "true") {
    const { setupServer } = await import("msw/node");
    const { devHandlers } = await import("./mocks");
    slot.__mswServer?.close();
    slot.__mswServer = setupServer(...devHandlers);
    slot.__mswServer.listen({ onUnhandledFrame: "bypass" });
  }
};
```

The browser worker of a dev app tab left open for a long session can stop mocking after about five minutes in Chromium (msw-3 reference, long-lived pages).

An app with its own `src/service-worker` shares the root scope with msw's worker: in a mocked dev session msw's worker stays active and keeps mocking, and the app's service worker waits without running. Test the app's service worker in a session without msw.

## Check that no msw code ships

1. Run a production build, then run it again with the msw block removed from the hooks
2. Compare the client chunk lists the two builds print (`.svelte-kit/output/client/_app/immutable/`): with the DEV guard in place they match except for the app entry chunk (`entry/app.<hash>.js`), which bundles the client hook. Chunk names are hashed, so a shipped msw block shows up as extra chunks of tens to hundreds of kB and a higher module count, not as a file named after msw
3. Expect `mockServiceWorker.js` in `.svelte-kit/output/client` only when the project commits it to `static/`, which SvelteKit copies as-is (nothing registers it in production, so it stays inert), or when the plugin runs in `msw({ mode: "worker-only" })`, which writes it into every client build. In the default mode it appears when client code that imports `virtual:msw` ships, so finding it there unexpectedly means the DEV guard failed

## The blind spot: your own `+server.js` routes

The Node network patches `http`, `https` and `fetch` process-wide, so it covers `+page.server.ts`, `+server.ts` and form actions, except calls to your own `+server.js` routes. SvelteKit, on the `fetch` given to `load`:

> Internal requests (e.g. for `+server.js` routes) go directly to the handler function when running on the server, without the overhead of an HTTP call.

The Node network has no HTTP request to intercept: `event.fetch('/api/thing')` during SSR calls your route handler directly, so MSW never sees it. The browser worker does not cover the first load either: the [same doc](https://svelte.dev/docs/kit/load#Making-fetch-requests) says the SSR response is "captured and inlined into the rendered HTML" and that on hydration it "will be read from the HTML, guaranteeing consistency and preventing an additional network request". With SSR on (the default), neither interceptor mocks that endpoint on the first page view.

Which load makes the call decides whether the browser worker ever sees it:

- a universal `load` (`+page.ts`): later client-side navigations run it in the browser, where it issues a real request that the worker mocks. The mock answers on client-side navigation to the page; a reload gets no mock. With `ssr = false`, "universal `load` functions _always_ run on the client" (SvelteKit `load` docs), so the worker mocks the first load too
- a server `load` (`+page.server.ts`): "Server `load` functions _always_ run on the server" (SvelteKit `load` docs), so every `event.fetch('/api/thing')` calls the route handler directly and neither interceptor ever mocks it. Use option 1 or 2 below

Options, in order of preference:

1. Mock what the route itself calls: the upstream API, not your own route. MSW intercepts that outbound request, your real route handler still runs, and nothing about the app changes for dev
2. When the route has no upstream call to intercept, use `handleFetch` ([SvelteKit hooks](https://svelte.dev/docs/kit/hooks)), the supported hook for replacing what server-side `event.fetch` returns. It reaches `+server.js` requests: the direct call to your route handler happens inside the `fetch` that `handleFetch` receives, so returning without calling it skips the route

   ```ts
   // src/hooks.server.ts
   import type { HandleFetch } from "@sveltejs/kit/hooks";

   export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
     const url = new URL(request.url);
     if (
       import.meta.env.DEV &&
       import.meta.env.VITE_MSW === "true" &&
       // handleFetch also sees external requests: match only your own origin
       url.origin === event.url.origin &&
       url.pathname === "/api/thing"
     ) {
       const { default: fixture } = await import("./mocks/fixtures/thing.json");
       return Response.json(fixture);
     }
     return fetch(request);
   };
   ```

3. Last resort: point the call at an external origin in dev so a real HTTP request exists to intercept. That adds a config seam to the app

Both interceptors matter for a `fetch` to an external origin from a universal `load`: SSR hits it through the Node network, and a later client-side navigation hits it through the browser worker. Give both the same handler set or the same route answers differently depending on how the user arrived.

## SvelteKit + Storybook

`@storybook/sveltekit` mocks SvelteKit modules such as `$app/navigation` and `$app/state` through `parameters.sveltekit_experimental`, documented on [Storybook's SvelteKit page](https://storybook.js.org/docs/get-started/frameworks/sveltekit). None of its keys covers `fetch`, so a component reading `page.params` and fetching needs both mechanisms. With only the first, the story renders the right route params and no data.

Stories do not run the route's `load`, so anything arriving as a `data` prop must be passed as an arg. MSW only covers `fetch` calls the component makes itself.

## Vitest

Node-mode tests of `+page.server.ts` and `+server.ts` follow the standard [node integration](https://mswjs.io/guides/integrations/node) setup, including `server.close()` in `afterAll` so the interceptor does not outlive the suite; their handlers need the `*/` prefix or an absolute URL (handlers reference). In SvelteKit, calling a `load` function directly means you construct the event and supply `event.fetch` yourself: pass a stub, or pass the global `fetch` with `setupServer` listening, which mocks absolute URLs (a relative URL has no origin in Node and throws before MSW sees it).
