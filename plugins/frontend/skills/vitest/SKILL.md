---
name: vitest
description: Vitest test.projects, browser mode with playwright(), optimizeDeps, separate vitest.config from vite.config. Use when editing vitest config, debugging flaky browser tests, upgrading @vitest/*, or splitting node vs browser projects.
compatibility: Written for Vitest 5 (Node >=22.12, Vite >=6.4; factory browser provider, test.projects). Notes marked "measured" were run on Vitest 5 browser mode with Playwright.
user-invocable: true
---

# Vitest

## Config

- **Docs:** if unsure about an API, fetch `https://vitest.dev/llms.txt`. Do not guess.
- **Config file:** use **`vitest.config.{ts,mts,js,mjs}`** for `test` / `test.projects`. Vitest-only-in-`vite.config` merges badly with multiple projects and Storybook.
- **Gate:** no `vitest.config.*` but `vite.config` has **`test:`** (or no Vitest file), **ask** before adding projects or Storybook whether to introduce `vitest.config.ts` and move `test` out of Vite.
- **Projects inherit the root (Vitest 5):** inline `test.projects` get the root's `plugins`, `resolve`, `optimizeDeps`, and `setupFiles`; `extends: false` opts out. **NEVER repeat an inherited root plugin inside a project**: a second `svelte()` compiles components twice. Inheritance rules, `sharedViteServer`, tags: [references/config-projects.md](references/config-projects.md)
- Upgrade: bump all **`@vitest/*`** together. Vitest 4 to 5 breaking changes and post-upgrade cleanup: [references/vitest-5-upgrade.md](references/vitest-5-upgrade.md)
- **`browser.provider`:** `import { playwright } from '@vitest/browser-playwright'` to `provider: playwright()` (factory, not a string). Use `import { page } from 'vitest/browser'`: not `@vitest/browser/context`
- **`optimizeDeps.exclude`:** Svelte 5 runes in `.svelte.js` (e.g. Melt UI) so vite-plugin-svelte handles them, not Vite's dependency pre-bundler (Rolldown since Vite 8, esbuild before).
- **`optimizeDeps.include`:** deps that trigger mid-test optimization (e.g. `minisearch`) to reduce flakes. Root cause and `optimizeDeps.entries`: [references/flake-hygiene.md](references/flake-hygiene.md)
- **Storybook:** **`vitest.config.ts`** + `storybookTest` + browser `playwright()`: `svelte-5:storybook-vitest`, [manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced).
- **Reports and coverage:** report paths go in `test.outputFile` (reporter options beat the CLI); coverage thresholds take flat metric keys, a Jest-style `global` key enforces nothing: [references/config-projects.md](references/config-projects.md)

## Writing tests

- **Assertions: value, not presence.** Presence-only assertions (`toBeInTheDocument` on a role-only or loose locator, `not.toBe('')`, `toHaveBeenCalled`) ship regressions; `toBeInTheDocument` on an exact-text locator checks a value. Every interaction test must compute an expected value from the action and assert equality. See [references/assertions.md](references/assertions.md) for the pattern, callback-payload rules, and how to tell a harness failure from a behavior failure
- **`toHaveTextContent` is exact (Vitest 5):** full-string equality, no `RegExp`. `toHaveTextContent('Error')` fails on `Error!`. Partial or regex matches use **`toMatchTextContent`**, a weaker check: prefer the exact computed string when you can build it. In a Storybook `play` function, `expect` from `storybook/test` has jest-dom's `toHaveTextContent`, which matches substrings and `RegExp` (measured): `svelte-5:storybook-vitest`
- **Locators match text exactly (Vitest 5):** `page.getByText('Hello')` does not find `Hello, World`. Use the full text, a `RegExp`, or `{ exact: false }`: [references/browser-mode.md](references/browser-mode.md)
- **Queries: accessible first, every escape hatch commented.** Use `page.getByRole(...)`, `getByLabelText`, `getByText`, `getByPlaceholder`, `getByTitle`, `getByAltText` first. They mirror how screen readers find elements and fail when a11y regresses. `data-testid` is an a11y smell ([tkdodo, 2025](https://tkdodo.eu/blog/test-ids-are-an-a11y-smell)): a testid means the element has no accessible name, role, or text for users of AT either. Fix the a11y hole, not the test. Reach for `data-testid`, a raw `querySelector`, or a test-id output div in a fixture only as a last resort: charting canvases, decorative content, third-party widgets without roles, an overlay that intercepts clicks on the real control, legacy markup you cannot change. Each use gets a one-line comment explaining why no accessible selector worked
- **`vitest-browser-svelte` v3:** `render` is async-only (`await render(...)`); usage in `svelte-5:testing-svelte`. The main entry cleans up in `beforeEach`; `/pure` never cleans up (use it for `it.concurrent`): [references/browser-mode.md](references/browser-mode.md)
- **Viewport:** the default is 414x896 (measured); call `page.viewport(width, height)` from `vitest/browser` for desktop layouts
- **Mocking:** `vi.mock` / `vi.hoisted` at the top level only; reference module-level fakes in a factory via `vi.hoisted` or a top-level `await import()`; mock SvelteKit's `$app/*` in browser tests: [references/mocking.md](references/mocking.md)
- **Waiting:** `await expect.element(locator)` for locators, `expect.poll(() => value)` or `vi.waitFor` for spies and other state ([references/browser-mode.md](references/browser-mode.md)). Negative assertions need a positive precondition and a settle window ([references/flake-hygiene.md](references/flake-hygiene.md))
- **Visual regression:** `toMatchScreenshot()`; baselines are platform-specific, so decide where they are generated before committing any: [references/visual-regression.md](references/visual-regression.md)

## Before any green claim

Browser and Storybook suites are flaky on a single run. Kill the test-server port holder, clear `node_modules/.vite` and `node_modules/.cache/storybook`, then run three times: counts must match within ±0 tests and setup time within ±30%. If runs diverge, investigate the flake BEFORE claiming any fix works. Full protocol and flake patterns: [references/flake-hygiene.md](references/flake-hygiene.md).
