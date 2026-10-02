---
name: testing-svelte
# prettier-ignore
description: Fix and create Svelte 5 tests with vitest-browser-svelte and Playwright. Use when fixing broken tests, debugging failures, writing unit/SSR/e2e tests, or working with vitest/Playwright.
user-invocable: true
---

# Svelte Testing

## Quick Start

```typescript
// browser component test (runs in the project whose `include` globs match this file)
import { render } from "vitest-browser-svelte";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
// button.svelte: <button onclick={() => count++}>Clicked: {count}</button>
import Button from "./button.svelte";

test("button click increments counter", async () => {
  await render(Button);
  const button = page.getByRole("button"); // module page
  // or from the result: const screen = await render(Button); screen.getByRole(...)

  await button.click();
  await expect.element(button).toHaveTextContent("Clicked: 1"); // exact full text
});
```

## Interaction Tests Are Mandatory

**Every test for an interactive component MUST include meaningful interaction.** A render-only test proves the component mounts, it does NOT prove it works.

For components with inputs, autocompletes, buttons, or forms:

1. **Interact**: click, type, select, submit
2. **Assert the outcome**: the selected value text, the callback data content, the DOM state change
3. **Never silently skip**: no `if (items.length > 0)` guards that skip the interaction when the precondition fails. ASSERT the precondition instead
4. **Verify callback data**: capture what callbacks received and assert it; a fixture component that renders the payload into an output element works (give it an accessible name, or comment why a test id is used). Checking "callback was called" is not enough; check WHAT it was called with

Example failure: tests that "verified" autocomplete interaction by checking "a selection exists" without checking which value; this missed a bug where onChange returned objects instead of strings.

## Core Principles

- **Prefer locators**: `page.getBy*()` methods first. A raw `querySelector` or `data-testid` needs a one-line comment saying why no accessible locator works (`frontend:vitest` query rule)
- **Multiple elements**: Use `.first()`, `.nth()`, `.last()` to avoid strict mode violations
- **Real API objects**: Test with FormData/Request, minimal mocking
- **Mock at the right seam**: `vi.mock` for module boundaries, MSW for the network boundary. MSW is this rule applied to HTTP: keep the real component and the real `fetch`, swap only what crosses the wire (`svelte-5:msw`)
- **`vi.mock` / `vi.hoisted` / `vi.unmock` at the top level only**: inside `describe`, `test`, or a function they throw in Vitest 5 (`was defined outside of the module's top level scope`). `vi.doMock` may go anywhere. Factories, SvelteKit `$app/*` stubs, component swaps: `frontend:vitest` mocking reference

## Reference Files

[core-principles](references/core-principles.md) | [foundation-first](references/foundation-first.md) | [client-examples](references/client-examples.md) | [server-ssr-examples](references/server-ssr-examples.md) | [critical-patterns](references/critical-patterns.md) | [client-server-alignment](references/client-server-alignment.md) | [troubleshooting](references/troubleshooting.md) (incl. Astro + Svelte type errors)

## Running Tests

- **Storybook + Vitest** (`@storybook/addon-vitest`): `svelte-5:storybook-vitest` skill: `vitest.config.ts`, `test.projects` entry, `vitest --project=storybook`, `storybookUrl` for CI links.
- `pnpm test:unit` or `vitest run --project browser`: run vitest browser tests only (fast, no dev server needed); plain `vitest run` runs every project
- `pnpm test`: runs vitest + Playwright e2e concurrently (e2e needs a dev server)
- `pnpm validate`: runs vitest + lint + typecheck + svelte-check (CI pipeline, no e2e)

## After Writing/Editing Test Files

- **LINT: `pnpm lint:tests`.** One command, all 5 linters (oxlint, tsgo, eslint, knip, svelte-check). Must exit 0. No exceptions.

## Notes

- Never click submit on a form that posts natively: the iframe navigates and the whole file fails (`Cannot connect to the iframe…`, measured). Forms whose submit handler calls `preventDefault()` are safe to submit; assert the outcome with `await expect.element()` (troubleshooting Error 4)
- Test file names: the `.svelte` infix (`foo.svelte.test.ts`) lets the test file itself use runes (`$state`, `$effect.root`), in any environment. Whether a file runs in the browser or in node is decided by the projects' `include` globs; `.ssr.test.ts` (SSR) and `server.test.ts` (API) are naming conventions for node projects
- Import `page` from `vitest/browser`, not `@vitest/browser/context`
- `vitest-browser-svelte` v3: `render` is **async-only**, always `await render(...)`; the returned `unmount()` is async too. The result is `RenderResult` (extends the locator selectors, no `page` field), so get `page` from `vitest/browser`
- Vitest 5 locators match text exactly: `getByText('Save')` misses `Save draft`, and so does `getByRole('button', { name: 'Save' })`. Use the full text, a `RegExp`, or `{ exact: false }`. `toHaveTextContent` is exact too; `toMatchTextContent` takes partial strings and `RegExp`
- Label lookup is `page.getByLabelText(...)`; `page.getByLabel` does not exist
- Locators have no `.focus()` method: use `.click()` to focus elements, or `locator.element().focus()` when a click would trigger the action under test
- Clicking a navigation link (`<a href="/page">`) navigates the iframe away and fails the file (measured). Hash links and links whose handler calls `preventDefault()` are safe; for real navigation links assert the `href` instead (troubleshooting Error 7)
- Never `click({ force: true })`: it skips the actionability checks and passes on elements a user cannot click (measured: handler never ran) (critical-patterns)
- Async waits: `await expect.element()` for locators; `vi.waitFor()` or `expect.poll()` for spies and non-DOM state (both work in browser mode). A fixed `setTimeout` sleep is only a settle window before a negative assertion, never a wait for a positive one

<!--
PROGRESSIVE DISCLOSURE GUIDELINES:
- Keep this file under 100 lines (write-a-skill budget)
- Use 1-2 code blocks only (recommend 1)
- Keep description <200 chars for Level 1 efficiency
- Move detailed docs to references/ for Level 3 loading
- This is Level 2 - quick reference ONLY, not a manual
-->
