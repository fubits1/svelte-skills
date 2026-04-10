---
name: testing-svelte
# prettier-ignore
description: Fix and create Svelte 5 tests with vitest-browser-svelte and Playwright. Use when fixing broken tests, debugging failures, writing unit/SSR/e2e tests, or working with vitest/Playwright.
user-invocable: true
---

# Svelte Testing

## Quick Start

```typescript
// Client-side component test (.svelte.test.ts)
import { render } from "vitest-browser-svelte";
import { expect } from "vitest";
import Button from "./button.svelte";

test("button click increments counter", async () => {
  const { page } = render(Button);
  const button = page.getByRole("button", { name: /click me/i });

  await button.click();
  await expect.element(button).toHaveTextContent("Clicked: 1");
});
```

## Interaction Tests Are Mandatory

**Every test for an interactive component MUST include meaningful
interaction.** A render-only test proves the component mounts — it
does NOT prove it works.

For components with inputs, autocompletes, buttons, or forms:

1. **Interact** — click, type, select, submit
2. **Assert the outcome** — the selected value text, the callback
   data content, the DOM state change
3. **Never silently skip** — no `if (items.length > 0)` guards
   that skip the interaction when the precondition fails. ASSERT
   the precondition instead.
4. **Verify callback data** — use fixture components with
   data-testid output divs to capture and assert what callbacks
   received. Checking "callback was called" is not enough —
   check WHAT it was called with.

Example failure: tests that "verified" autocomplete interaction
by checking "a selection exists" without checking which value —
this missed a bug where onChange returned objects instead of
strings.

## Core Principles

- **Always use locators**: `page.getBy*()` methods, never containers
- **Multiple elements**: Use `.first()`, `.nth()`, `.last()` to avoid
  strict mode violations
- **Use untrack()**: When accessing `$derived` values in tests
- **Real API objects**: Test with FormData/Request, minimal mocking

## Reference Files

- [core-principles](references/core-principles.md) |
  [foundation-first](references/foundation-first.md) |
  [client-examples](references/client-examples.md)
- [server-ssr-examples](references/server-ssr-examples.md) |
  [critical-patterns](references/critical-patterns.md)
- [client-server-alignment](references/client-server-alignment.md) |
  [troubleshooting](references/troubleshooting.md)

## Running Tests

- **Storybook + Vitest** (`@storybook/addon-vitest`): `svelte-5:storybook-vitest` skill — `vitest.config.ts`, `test.projects` entry, `vitest --project=storybook`, `storybookUrl` for CI links.
- `pnpm test:unit` or `vitest run` — run vitest browser tests only (fast, no dev server needed)
- `pnpm test` — runs vitest + Playwright e2e concurrently (e2e needs a dev server)
- `pnpm validate` — runs vitest + lint + typecheck + svelte-check (CI pipeline, no e2e)

## After Writing/Editing Test Files

- **LINT: `pnpm lint:tests`.** One command, all 5 linters (oxlint, tsgo, eslint, knip, svelte-check). Must exit 0. No exceptions.

## Notes

- Never click SvelteKit form submit buttons - Always use
  `await expect.element()`
- Test files: `.svelte.test.ts` (client), `.ssr.test.ts` (SSR),
  `server.test.ts` (API)
- Import `page` from `vitest/browser`, not `@vitest/browser/context`
- Locators have no `.focus()` method — use `.click()` to focus elements
- `<a href>` clicks in tests navigate the iframe away, crashing the test. Avoid clicking links; test radio/button state instead.
- `vi.waitFor()` is unreliable in browser mode — prefer `await expect.element()` retry or `await new Promise(r => setTimeout(r, N))` for async init.

## Astro + Svelte Projects

- `@astrojs/svelte` ships `svelte-shims.d.ts` that wraps all `.svelte` imports with `PropsWithClientDirectives`, breaking `vitest-browser-svelte`'s `render()` types.
- Fix: create `tsconfig.test.json` extending main tsconfig but with `"types": ["node", "svelte"]` (no `"astro/client"`). Exclude `.svelte.test.ts` from main `tsconfig.json`. Point vitest to test tsconfig via `test.typecheck.tsconfig`.

<!--
PROGRESSIVE DISCLOSURE GUIDELINES:
- Keep this file ~50 lines total (max ~150 lines)
- Use 1-2 code blocks only (recommend 1)
- Keep description <200 chars for Level 1 efficiency
- Move detailed docs to references/ for Level 3 loading
- This is Level 2 - quick reference ONLY, not a manual
-->
