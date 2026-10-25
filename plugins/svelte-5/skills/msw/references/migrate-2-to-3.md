# Migrating a Svelte project from msw 2 to msw 3

The [2.x to 3.x migration guide](https://mswjs.io/docs/migrations/2.x-to-3.x) and the [msw 3 release notes](https://github.com/mswjs/msw/releases) own the API delta. This page covers what a Svelte, Storybook and Vitest project has to change on top, and what the codemod misses. The msw 3 behaviour itself is in the msw-3 reference.

## Contents

- Upgrade checklist
- What the codemod does not touch
- Code changes
- Vitest browser setup file
- `msw-storybook-addon` 2 to 3
- SvelteKit projects on the old add-on scaffold

## Upgrade checklist

msw is one dependency per project, so Storybook, Vitest browser tests and the dev app move to msw 3 together. Copy this into your response and tick it off:

```text
- [ ] Node 22.12 or later, TypeScript 5.9 or later if you use TypeScript (SvelteKit 3: Node 22.17, TypeScript 6); msw 3 is ESM-only
- [ ] Commit or stash first (the codemods README: "Run them only on Git-tracked files, and commit or stash changes first"), bump msw (pnpm add -D msw@3) and commit the bump, then run pnpm dlx codemod@latest @mswjs/v3 for .js/.ts files, which downloads the codemod from the codemod registry (source: https://github.com/mswjs/codemods/tree/main/codemods/v3), and review its git diff
- [ ] Type-check after the codemod: first add ".storybook/**/*.ts" (a plain ".storybook" entry matches no file) and the Vitest setup file's directory to the include of the tsconfig your check script passes to svelte-check (tsconfig.json on SvelteKit, whose sv create include lists only src and vite.config.ts; tsconfig.app.json on the Vite svelte-ts template), then run pnpm check (without a check script: pnpm exec svelte-check --tsconfig <that file>), which also checks <script lang="ts"> in .svelte files, and fix what it reports: removed exports such as LifeCycleEventsMap, SetupApi and StrictResponse fail there
- [ ] Using graphql handlers? Import graphql from msw/graphql and install graphql: msw 3 declares it an optional peer dependency
- [ ] Search .svelte and .stories.svelte files by hand (list under "What the codemod does not touch")
- [ ] Search every file for what the codemod's README leaves to manual migration (same section)
- [ ] Search .js and .ts files for what the codemod skips: untraceable, generator, constructor or accessor worker.stop() calls, stop() assigned to a variable or called on a property, and callbacks passed by reference (same section)
- [ ] Rename onUnhandledRequest to onUnhandledFrame everywhere; rewrite custom callbacks to ({ frame, defaults }); where a callback must block a request, throw
- [ ] Handler paths with RegExp tokens in a string, such as '/user/:id(\\d+)' (msw 3 moved path matching to @msw/url, msw#2678): pass a RegExp instance or a predicate
- [ ] Cookie mocks: read the cookies resolver argument; server-side tests: expect no cookie jar
- [ ] Code that relies on Content-Length after bypass(): bypass() now drops it
- [ ] delay() under fake timers: advance the timers
- [ ] WebSocket connections without handlers reach the unhandled strategy as ws frames: check that custom callbacks branch on frame.protocol
- [ ] Vitest browser: one worker per page (globalThis slot), Vitest hooks at module scope, worker.events listeners inside start(), no worker.stop() in afterAll
- [ ] optimizeDeps.include: list every msw entry point you import, or narrow frames with frame.protocol
- [ ] Re-run pnpm exec msw init <dir> --save for every committed worker script: msw 3 has no postinstall that refreshes it
- [ ] Tests that render same-origin iframes: add handlers for the framed URLs
- [ ] Pages kept open longer than about five minutes (a dev session, a Vitest browser run that keeps one page): interception can stop in Chromium, on msw 3 also on a visible page (msw-3 reference, long-lived pages)
- [ ] Storybook: msw-storybook-addon 3 with your own setup function in mswLoader (section below)
- [ ] SvelteKit on the pre-msw/vite @msw/sveltekit scaffold: replace its wiring (section below)
- [ ] Companion packages: @mswjs/data to @msw/data (a different API: rewrite the data layer); @msw/source and @msw/playwright need a release whose msw peer names msw 3; so does @mswjs/socket.io-binding, and without one, mock the Socket.IO client module instead (handlers reference)
```

## What the codemod does not touch

`pnpm dlx codemod@latest @mswjs/v3` only globs JavaScript and TypeScript files ([workflow.yaml](https://github.com/mswjs/codemods/blob/HEAD/codemods/v3/workflow.yaml)), so `.svelte` and `.stories.svelte` files keep their msw 2 code. Search them for:

- `onUnhandledRequest` and `(request, print)` callbacks
- `graphql` imported from `msw` (msw 3: `msw/graphql`), `graphql.query()`/`mutation()`/`operation()` (msw 3: `graphql.link(url).query()` and so on), `GraphQLLinkHandlers` (msw 3: `GraphQLLink`)
- `cleanUrl` (msw 3: `getCleanUrlString`), `msw/core/*` deep imports
- the `'connection'` life-cycle event on `worker.events` or `server.events` (msw 3: `'websocket:connection'`); a `ws.link(...).addEventListener('connection', ...)` listener keeps `'connection'`
- `worker.stop()` without `await`

The codemod's README leaves these to manual migration in every file, `.ts` included: `handleRequest()` (the migration guide: "Use the `getResponse()` function instead", imported from `msw`, and `defineNetwork()` for a custom request interception layer; the codemod README points to `defineNetwork()` from `msw/experimental`), the `onUnhandledRequest()` export, `LifeCycleEventsMap`, `UnhandledRequestStrategy` and `UnhandledRequestCallback` (msw 3: `UnhandledFrameStrategy` and `UnhandledFrameHandle`), `SetupApi` and `StrictResponse`, which msw 3 no longer exports.

It also skips, in `.js` and `.ts` files:

- `worker.stop()` calls on a worker it cannot trace to a `const worker = setupWorker(...)` declaration with `setupWorker` imported from `msw/browser` (a factory, a namespace call such as `msw.setupWorker()`, a `globalThis` slot, or an import from a module it cannot resolve), or that sit in a generator, constructor or accessor: it leaves them unawaited
- `stop()` calls that are not a statement of their own (`const done = worker.stop()`, unless `done` is awaited later) or that run on a property (`this.worker.stop()`): it matches only a standalone `worker.stop();` on a plain identifier, so these stay unawaited too. A concise arrow body (`afterAll(() => worker.stop())`) returns the Promise to the hook, which awaits it, so it needs no change; in a Vitest browser setup file, delete it anyway (step 3)
- a callback passed by reference that is also called elsewhere: it leaves it on the old signature

The codemod writes `frame instanceof HttpNetworkFrame` into every migrated callback that reads the request ([v3 codemod README](https://github.com/mswjs/codemods/blob/HEAD/codemods/v3/README.md)), so check `optimizeDeps` after running it (msw-3 reference, `instanceof`).

## Code changes

1. Rename `onUnhandledRequest` to `onUnhandledFrame`. msw 3 ignores the old name without a message in JavaScript and unchecked `.svelte` files, which leaves the default `'warn'` in charge. The string values are the same
2. Rewrite custom callbacks to `({ frame, defaults })`:
   - check `frame.protocol === 'http'` before reading `frame.data.request`; msw 2 handed the callback a synthetic `Request` for an unhandled WebSocket connection, so a callback that reported those needs a branch for `frame.protocol === 'ws'`
   - `print.warning()` becomes `defaults.warn()`
   - a callback that must block the request throws: do not rely on `defaults.error()`, which prints without blocking in msw 3, as `print.error()` does in msw 2 releases since the network-source rewrite ([msw#2650](https://github.com/mswjs/msw/pull/2650))
   - a custom callback skips no asset requests, in msw 2 as in msw 3, so the rewrite needs no asset check:

   ```diff
   -onUnhandledRequest(request, print) {
   -  print.warning();
   -},
   +onUnhandledFrame({ defaults }) {
   +  defaults.warn();
   +},
   ```

   `defaults.warn()` prints the default warning for HTTP and WebSocket frames alike, so this keeps msw 2's warning for an unhandled WebSocket connection; an `if (frame.protocol !== "http") return;` before it drops that warning. Adding `if (isCommonAssetRequest(request)) return;` (from `msw`, inside an `if (frame.protocol === "http")` branch, with `const { request } = frame.data as { request: Request };` before it) silences asset warnings, and also API paths ending in `.json`, `.csv` and other common extensions (msw-3 reference, unhandled-frame item 4); a callback that must report API calls checks the path prefix instead

3. Await `worker.stop()` where you keep it, because it returns a Promise; in a Vitest browser setup file, delete it
4. In the `.svelte` files the codemod cannot see, move `graphql` imports to `msw/graphql` (the `msw` root no longer exports it) and rewrite `graphql.query()` as `graphql.link(url).query()`. Root imports of `http`, `HttpResponse`, `ws`, `sse`, `delay`, `bypass`, `passthrough` and `isCommonAssetRequest` keep working; the migration guide and the codemod move them to subpaths such as `msw/http`, `msw/ws`, `msw/sse` and kebab-case `msw/utils/*` files (`msw/utils/is-common-asset-request`); moving them is optional
5. Delete an unused `LifeCycleEventsMap` import; where the code uses the type, switch to `HttpNetworkFrameEventMap` from `msw/experimental`. Its values are event objects rather than argument tuples, so `LifeCycleEventsMap['request:start'][0]` becomes `HttpNetworkFrameEventMap['request:start']`, an event that carries `request` and `requestId`; a `({ request })` listener keeps working

## Vitest browser setup file

The calls that change:

```diff
-import type { LifeCycleEventsMap } from "msw";
-await worker.start({ onUnhandledRequest: "bypass" });
+await worker.start({ onUnhandledFrame: "bypass" });
-afterAll(() => worker.stop());
```

Drop `worker.stop()` rather than awaiting it: with `--isolate=false`, stopping the worker after the first file leaves every later file unmocked. Move a `worker.events.on("request:unhandled", ...)` listener inside `start()`, next to `worker.start()`. msw 2 only logged `Found a redundant "worker.start()" call` for a second start in the page; msw 3 throws, so a shared setup file needs the one-worker-per-page pattern from the msw-3 reference.

## `msw-storybook-addon` 2 to 3

Addon 3 runs on msw 3, but its built-in default setup passes `onUnhandledRequest`, which msw 3 ignores, and starts a worker without handlers; pass a setup function of your own (`mswLoader(setup)`, or `createPreviewAnnotations(setup)`, storybook reference) for `onUnhandledFrame` and the baseline.

Already on addon 3 with msw 2:

- skip steps 1 to 3 below
- from step 4, only add or rewrite the setup function passed to `mswLoader(...)`: `setupWorker(...baseline)` started with `onUnhandledFrame`, with any `preview.parameters.msw` or preview-level `beforeEach({ msw })` baseline moved into it

From addon 2, in this order:

1. Bump `msw-storybook-addon` to the latest 3.x and check that `pnpm exec msw-storybook-addon --help` runs: step 3 needs that bin, which the first 3.x releases named `msw-storybook-migrate`. The addon needs Storybook 9 or later
2. Follow [MIGRATION.md](https://github.com/mswjs/msw-storybook-addon/blob/main/MIGRATION.md) for the API delta, but skip its CSF Next steps: Svelte CSF cannot use `definePreview`
3. Run its codemod (`pnpm exec msw-storybook-addon migrate`, `--dry-run` first), never `npx msw-storybook-migrate` as Storybook's MSW page shows: that npm package name belongs to an unrelated publisher. It rewrites `parameters.msw` in the preview and JS/TS stories to `beforeEach({ msw })` and does not touch `.stories.svelte` files (storybook reference), so a mixed project ends up with both forms:
   - it also registers `msw-storybook-addon` in `addons` in `.storybook/main.*`: keep that on the `mswLoader()` path, remove it when you switch to `createPreviewAnnotations` (storybook reference)
   - keep the rewritten story-level forms: both work on addon 3, and the `.stories.svelte` files the codemod does not reach keep their `parameters.msw` overrides (step 6)
   - JS/TS stories it lists as skipped ("`beforeEach` already defined" or an unrecognised `parameters.msw` shape) keep `parameters.msw` too, which works on the `mswLoader()` path; move them by hand when you leave it
   - move a rewritten preview-level baseline into the `setupWorker(...)` set from step 4: a preview `beforeEach` runs after `mswLoader` has applied each story's `parameters.msw`, so its handlers would shadow those overrides
   - do not run the `storybook automigrate csf-factories` it suggests on exit
4. Fix `preview.*` where the codemod did not, or check what it changed: `initialize` and `mswDecorator` are gone, and a bare `mswLoader` is no longer a loader. The baseline moves from the second argument of `initialize()` into `setupWorker(...)`. Write that setup with `onUnhandledFrame`: the addon's built-in default setup and the custom-setup examples in its README and MIGRATION.md pass `onUnhandledRequest`, which msw 3 ignores. The codemod copies `initialize()`'s first argument verbatim into `worker.start(...)`, so rename `onUnhandledRequest` there and rewrite a `(request, print)` callback; a bare `initialize()` becomes `mswLoader()` on the default setup, so add a setup function with your baseline
5. Where `optimizeDeps.include` or `tsconfig` `types` list the addon, name `msw-storybook-addon/csf3` instead of the bare `msw-storybook-addon`; with addon 2 still installed, `/csf3` aborts the run before any test executes (`"./csf3" is not exported under the conditions [...]`). The old bare specifier on addon 3 passes with no warning and pre-bundles a module nothing imports, so no failing run reminds you to rename it
6. Overrides in `.stories.svelte`: existing `parameters.msw` overrides keep working on the `mswLoader()` path, so leave them; write new ones as `beforeEach={({ msw }) => msw.use(...)}` (storybook reference), which works because addon 3's loader assigns `context.msw`, which addon 2's never did
7. Node.js stories: addon 3 drops built-in Node.js support; start `setupServer` in a setup function of your own, with a type cast (the setup function is typed to return a browser worker)

The preview change in step 4:

```diff
-import { initialize, mswLoader } from "msw-storybook-addon";
-initialize({ onUnhandledRequest: "warn" }, handlers);
+import { setupWorker } from "msw/browser";
+import { mswLoader } from "msw-storybook-addon/csf3";

 export default {
-  loaders: [mswLoader],
+  loaders: [
+    mswLoader(async () => {
+      const worker = setupWorker(...handlers);
+      await worker.start({ onUnhandledFrame: "warn", quiet: true });
+      return worker;
+    }),
+  ],
 };
```

## SvelteKit projects on the old add-on scaffold

`@msw/sveltekit` releases from before its `msw/vite` switch generated msw 2 wiring. Recognise it by:

- a client hook that statically imports a worker which `src/msw/browser` creates with `setupWorker(...handlers)` at module scope, started in `init` behind `if (dev)`
- a server hook that runs `msw_server.listen({ onUnhandledRequest: 'bypass' })` at module scope behind `if (dev)`, with no `init`
- `"msw": { "workerDirectory": ["static"] }` in `package.json`, and msw's install script allowed in `pnpm-workspace.yaml`; the scaffold printed `npx msw init static --save` as the next step, and msw 2's `postinstall` wrote the worker script on install

To move to msw 3:

1. Replace that wiring with the four pieces the `msw/vite`-based add-on generates (sveltekit reference, "What the add-on generates"): move your handlers from `src/msw/handlers` to `src/mocks/handlers` (the add-on seeds that file only when it is empty) and give each relative path a `*/` prefix or an absolute URL, which the server hook's Node network needs (sveltekit reference, "What the add-on generates"), delete `src/msw/browser` and `src/msw/node`, and remove the old `if (dev)` blocks and their imports from both hooks. The old server hook ran with `onUnhandledRequest: 'bypass'` and the generated block sets no `onUnhandledFrame`, so carry the behaviour over in the server hook with `network.configure({ handlers, onUnhandledFrame: "bypass" })` (sveltekit reference, "Adjust the generated hooks" step 2)
2. Remove msw's install-script allowance from `pnpm-workspace.yaml`: msw 3 has no postinstall
3. Move the committed `static/mockServiceWorker.js` aside and check what still needs it:
   - a Vitest config that does not load the `msw/vite` plugin: run its browser project; `GET /mockServiceWorker.js` with a 404 or 500 in the test output means it still needs the file
   - Storybook: open `/mockServiceWorker.js` on the `storybook dev` origin; a project that builds Storybook keeps the file, because the plugin never puts it in a `storybook build`
4. If nothing needs it, delete the file and the `workerDirectory` entry in `package.json`; otherwise restore it and keep the entry, which `pnpm exec msw init <dir> --save` writes back anyway
