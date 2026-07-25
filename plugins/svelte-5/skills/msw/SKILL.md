---
name: msw
# prettier-ignore
description: "MSW 2 (Mock Service Worker) mocking in Svelte: Storybook, Vitest browser tests, SvelteKit dev/SSR. Use when writing handlers or fixtures, when a story renders blank or errors Failed to fetch, or when migrating msw-storybook-addon v2 to v3."
compatibility: "Run 2026-07 against msw 2.15.0 with msw-storybook-addon 2.0.7 and 3.0.0, Storybook 10.5, @storybook/addon-svelte-csf 5.1, @storybook/addon-vitest 10.5.3, Vitest 4.1.10, Vite 8.1.5, Svelte 5. One msw version only; SvelteKit guidance is unrun."
user-invocable: true
---

# MSW (Mock Service Worker)

**The API lives in the docs, not here.** [mswjs.io/docs](https://mswjs.io/docs): [intercepting requests](https://mswjs.io/docs/http/intercepting-requests/), [mocking responses](https://mswjs.io/docs/http/mocking-responses/), [browser](https://mswjs.io/docs/integrations/browser) and [node](https://mswjs.io/docs/integrations/node) integration, [`msw init`](https://mswjs.io/docs/cli/init), [structuring handlers](https://mswjs.io/docs/best-practices/structuring-handlers), [runtime overrides](https://mswjs.io/docs/best-practices/network-behavior-overrides), [WebSockets](https://mswjs.io/docs/websocket/), [debugging runbook](https://mswjs.io/docs/runbook). There is no `llms.txt`.

This skill carries what those pages do not: where the Svelte and Storybook toolchain contradicts them, and the traps written down nowhere.

**Which seam:** `vi.mock` replaces a module, MSW replaces the network. MSW is `svelte-5:testing-svelte`'s "only mock external services" applied to HTTP, so keep the real component, the real `fetch`, real `Request`/`Response`.

## Three surfaces, three handler sets

| Surface | Started in | Handler set |
| --- | --- | --- |
| Storybook | `mswLoader()` in `.storybook/preview.ts` | full: every story must be hermetic |
| Vitest browser | `setupWorker` in a setup file | narrow: per-test `worker.use()` |
| Dev app | gated entry import (`hooks.client.ts` on SvelteKit) | narrow: only what the backend lacks |

One shared array across all three means dev stops talking to your backend the moment someone adds a catch-all for a story. The rest, including the catch-all failure signature and stateful factories, is in `references/handlers.md`.

The worker script comes from [`msw init <dir> --save`](https://mswjs.io/docs/cli/init), into `public/` on Vite and `static/` on SvelteKit, and Storybook must serve it via `staticDirs`. When every story fails at once rather than one of them, suspect the worker before the handlers: open `/mockServiceWorker.js` in the browser, and a 404 or a MIME-type error there means it is not being served ([browser integration](https://mswjs.io/docs/integrations/browser)).

## Storybook wiring for Svelte CSF

Two upstream sources mislead a Svelte reader. The addon's README and MIGRATION.md route you to CSF Next, which `@storybook/addon-svelte-csf` does not support. [Storybook's MSW page](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests) documented the addon v2 API well after v3 shipped; check which API it shows before copying from it.

```ts
// .storybook/preview.ts
import { setupWorker } from "msw/browser";
import { mswLoader } from "msw-storybook-addon/csf3";
import { handlers } from "../src/mocks/handlers";

export default {
  loaders: [
    mswLoader(async () => {
      const worker = setupWorker(...handlers); // the baseline resetHandlers() restores to
      await worker.start({ onUnhandledRequest: "warn", quiet: true });
      return worker;
    }),
  ],
};
```

Only the `...handlers` argument differs from the addon's own example, and it is the load-bearing part: **baseline handlers go in `setupWorker(...)`, never in `preview.parameters.msw`**, which the README's CSF 3 example gets wrong. The loader resets handlers before each story and `combineParameters` overwrites arrays, so project-level parameters vanish for exactly the stories that override anything.

Per-story overrides use `parameters={{ msw: { handlers: [...] } }}`. Upstream has scheduled both this and the CSF 3 loader API for removal. There is a non-deprecated alternative that works in Svelte CSF (`createPreviewAnnotations` from `msw-storybook-addon/preview`), but it ignores `parameters.msw` entirely, so taking it means rewriting every override as `beforeEach={({ msw }) => msw.use(...)}`. Both paths, with what was measured: `references/msw-storybook-addon-v3.md`.

On SvelteKit, start from [`@msw/sveltekit`](https://github.com/mswjs/sveltekit) (`npx sv add @msw/sveltekit`) rather than hand-wiring hooks: `references/sveltekit.md`.

### Old patterns: msw-storybook-addon 2.x

On 2.x the baseline goes in `initialize(options, handlers)` at module scope, `loaders: [mswLoader]` takes a bare reference rather than a call, and `optimizeDeps.include` names the bare `msw-storybook-addon`. The `beforeEach={({ msw }) => msw.use(...)}` form does not work at all there, because v2's loader never assigns `context.msw`. Everything else above, including where the baseline must live, applies to both majors.

## Traps

- **`optimizeDeps.include` must name the specifier you import** (`msw-storybook-addon/csf3` on the loader path, `/preview` on the annotations path). Measured on Vite 8.1.5: an unresolvable entry aborts the run before any test executes; a stale-but-resolvable one passes silently while pre-bundling the wrong module; a **missing** one lets Vite discover the dependency mid-run and kills the suite with `Vitest failed to find the current suite` (`svelte-5:storybook-vitest` owns this trap).
- **Handler modules must be import-safe.** Warn on a missing fixture, never throw: Vitest tags skip a test _body_ but still import the file (`frontend:vitest`).
- **Run storybook tests with `--silent`** or MSW request logging drowns the output.
- **SvelteKit SSR cannot intercept your own `+server.js` routes**, and hydration will not cover for it either (`references/sveltekit.md`).

E2E is a separate surface: [`@msw/playwright`](https://github.com/mswjs/playwright) binds MSW to Playwright fixtures. MSW ships no official MCP server and no official agent skill, and `mswjs.io/llms.txt` is a 404, so read the docs rather than hunting for a machine-readable index.

## Verify

Browser and MSW suites are flaky on a single run, so take three clean-state runs before any green claim (`frontend:vitest` flake hygiene). Mocks are only exercised by a test project that actually mounts a component or opens a story, whatever the script is named.

## Reference Files

- [handlers](references/handlers.md): per-surface sets, the catch-all failure signature, import-safety, stateful factories, loader ordering
- [msw-storybook-addon-v3](references/msw-storybook-addon-v3.md): the deprecation path, the codemod's blind spot for `.stories.svelte`, where the baseline lives per major
- [sveltekit](references/sveltekit.md): the official add-on, and the SSR interception blind spot

## Related

- `svelte-5:storybook-vitest`: owns `optimizeDeps`, the storybook test project, and the flake protocol
- `svelte-5:storybook`: story authoring, fixtures, Playwright verification
- `svelte-5:testing-svelte`: what to mock at the module seam instead
- `frontend:vitest`: browser projects, flake hygiene, test tags
- `frontend:validate`: what counts as verified before declaring done
