---
name: msw
# prettier-ignore
description: MSW 2 request mocking in Svelte — Storybook, Vitest browser tests, SvelteKit dev/SSR. Use when writing handlers or fixtures, chasing unmocked requests, or migrating msw-storybook-addon v2 to v3.
compatibility: Measured 2026-07 against msw 2.15, msw-storybook-addon 3.0, Storybook 10.5, @storybook/addon-svelte-csf 5.1, Vitest 4.1, SvelteKit 2.
user-invocable: true
---

# MSW (Mock Service Worker)

**The API lives in the docs, not here.** [mswjs.io/docs](https://mswjs.io/docs) — [intercepting requests](https://mswjs.io/docs/http/intercepting-requests/), [mocking responses](https://mswjs.io/docs/http/mocking-responses/), [browser](https://mswjs.io/docs/integrations/browser) / [node](https://mswjs.io/docs/integrations/node), [`msw init`](https://mswjs.io/docs/cli/init), [structuring handlers](https://mswjs.io/docs/best-practices/structuring-handlers), [runtime overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides), [WebSockets](https://mswjs.io/docs/websocket/), [debugging runbook](https://mswjs.io/docs/runbook).

This skill carries what those pages don't: where the Svelte/Storybook toolchain contradicts them, and the traps that cost a day.

**Which seam:** `vi.mock` replaces a module, MSW replaces the network. MSW is `svelte-5:testing-svelte`'s "only mock external services" applied to HTTP — keep the real component, the real `fetch`, real `Request`/`Response`.

## Three surfaces, three handler sets

| Surface | Started in | Handler set |
| --- | --- | --- |
| Storybook | `.storybook/preview.ts` → `mswLoader()` | full — every story must be hermetic |
| Vitest browser | a setup file → `setupWorker` | narrow — per-test `worker.use()` |
| Dev app | gated entry import (`hooks.client.ts` on SvelteKit) | narrow — only what the backend lacks, `onUnhandledRequest: 'bypass'` |

Why they must not share one array, and the catch-all/import-safety/factory patterns: `references/handlers.md`.

The worker script itself is [`msw init <dir> --save`](https://mswjs.io/docs/cli/init) — `public/` on Vite, `static/` on SvelteKit — and Storybook must serve it via `staticDirs`. **Every story failing with "Failed to fetch" is the worker not being served**, not your handlers.

## Storybook: both upstream sources are wrong for Svelte

`msw-storybook-addon@3` removed `initialize()` and moved `mswLoader` to a subpath where it is a **factory you must call**. [Storybook's MSW page](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests) still documents the v2 API, and the addon's README recommends CSF Next — which `@storybook/addon-svelte-csf` does not support. The wiring that actually works:

```ts
// .storybook/preview.ts
import { setupWorker } from "msw/browser";
import { mswLoader } from "msw-storybook-addon/csf3";
import { handlers } from "../src/mocks/handlers";

export default {
  loaders: [
    mswLoader(async () => {
      const worker = setupWorker(...handlers); // the baseline resetHandlers() restores to
      await worker.start({ onUnhandledRequest: "bypass", quiet: true });
      return worker;
    }),
  ],
};
```

**Baseline handlers go in `setupWorker(...)`, never in `preview.parameters.msw`** — the loader resets handlers per story, and `combineParameters` overwrites arrays, so project-level parameters vanish for exactly the stories that override anything.

Per-story overrides take either `parameters={{ msw: { handlers: [...] } }}` or `beforeEach={({ msw }) => msw.use(...)}` on `<Story>`; loaders run before `beforeEach`, so `context.msw` is populated by then. The 2.x → 3.x delta, the codemod's measured behaviour, and hook order: `references/msw-storybook-addon-v3.md`.

## Traps

- **`optimizeDeps.include` must name the specifier you import.** It became `msw-storybook-addon/csf3` in addon 3.x; a stale entry brings back mid-run re-optimization and `Vitest failed to find the current suite` (`svelte-5:storybook-vitest`).
- **Handler modules must be import-safe.** Warn on a missing fixture, never throw — Vitest tags skip a test _body_ but still import the file (`frontend:vitest`).
- **`<Story>` props are `Partial<StoryAnnotations>`**, so `parameters`, `beforeEach`, `tags`, `play` and `asChild` all work in Svelte CSF.
- **Run storybook tests with `--silent`** or MSW request logging is most of the output.
- **SvelteKit SSR cannot intercept your own `+server.js` routes** — no HTTP call exists to intercept. `references/sveltekit.md`.
- **`worker.resetHandlers()` in `afterEach`, always**, or one test's `worker.use()` rewrites the network for every test after it.

## Reach for the first-party package first

| Need | Package |
| --- | --- |
| SvelteKit setup | [`@msw/sveltekit`](https://github.com/mswjs/sveltekit) — `npx sv add @msw/sveltekit` |
| Handlers from OpenAPI or HAR | [`@msw/source`](https://github.com/mswjs/source) |
| Relational mock data | [`@mswjs/data`](https://github.com/mswjs/data) |
| E2E | [`@msw/playwright`](https://github.com/mswjs/playwright) |
| Socket.IO over `ws` | [`@mswjs/socket.io-binding`](https://github.com/mswjs/socket.io-binding) |

There is **no official MSW MCP server and no official MSW skill**, and `mswjs.io/llms.txt` is a 404. The third-party `msw-mcp` on GitHub is unaffiliated and unvetted.

## Verify

Browser + MSW suites are flaky on a single run — three clean-state runs before any green claim (`frontend:vitest` flake hygiene). Mocks are only exercised by a test project that actually mounts a component or opens a story, whatever the script is named.

## References

- [handlers](references/handlers.md) — per-surface sets, catch-all detector, import-safety, stateful factories, loader ordering, reset discipline
- [msw-storybook-addon-v3](references/msw-storybook-addon-v3.md) — corrections to MIGRATION.md, measured codemod behaviour, hook order
- [sveltekit](references/sveltekit.md) — the official add-on, and the SSR interception blind spot

## Related

`svelte-5:storybook-vitest` · `svelte-5:storybook` · `svelte-5:testing-svelte` · `frontend:vitest` · `frontend:validate`.
