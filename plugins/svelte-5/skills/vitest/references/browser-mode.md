# Browser mode

## Setup

- Desktop breakpoints: `await page.viewport(1280, 800)` in the test, or `viewport` on the browser instance
- Headless Chromium without a GPU: WebGL (maps, canvas charts) needs `provider: playwright({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] } })`. For headed debugging, run `vitest --project browser --browser.headless=false --watch` and pass `launchOptions.slowMo`
- **File parallelism:** `test.fileParallelism: false` on the browser project and `browser.instances[].fileParallelism: false` both run browser test files one at a time (measured for each option, 3 runs: two 3s files took 6.3s with either option vs 3.4s by default). Use the per-instance option when browsers need different settings

## `vitest-browser-svelte`

- v3 gives `/pure` full export parity with the main entry and exports the `RenderResult` type
- The main entry calls `cleanup()` in `beforeEach`, so the last test's DOM stays mounted until the file ends. `cleanup()` removes every component rendered with `render` ([docs](https://vitest.dev/api/browser/svelte#cleanup)), and `vitest-browser-svelte/pure` never calls it on its own
- Sequential tests under `/pure`: call `cleanup()` in `afterEach`, or await the `unmount()` from each render
<!-- TODO: revise: rests on Vitest 5 + vitest-browser-svelte 3 measurements and an undocumented gap; re-measure on each Vitest major and when vitest-dev/vitest#9751 or #5665 closes -->
- **Don't use `it.concurrent` for browser component tests.** Concurrent tests share one page, and the retrying `expect.element` breaks there. Evidence (measured, 3 runs each, with two or three `it.concurrent` tests in one file):
  - The global `expect.element` passes when called right after `render`, and throws `expect.poll() must be called inside a test` once the test has awaited something (a 300ms wait) while another concurrent test ran. The global `expect` finds its test through the current-test tracker, which concurrent tests do not keep (`vitest/dist/chunks/index.*.js`, `createExpectPoll`)
  - The test-context `expect`, which the [test API docs](https://vitest.dev/api/test#test-concurrent) require for assertions in concurrent tests, has no `.element`: `TypeError: expect.element is not a function`. That failure also reports `Cannot take a screenshot in a concurrent test because concurrent tests run at the same time in the same iframe` (`@vitest/browser/dist/context.js`)
  - A shared `cleanup()` in `afterEach` removed a still-running test's component (`document.body` was empty when it asserted), because hooks of concurrent tests overlap ([parallelism guide](https://vitest.dev/guide/parallelism))
  - No Vitest doc or issue describes the `expect.element` gap; [vitest#9751](https://github.com/vitest-dev/vitest/issues/9751) (open) reports that concurrent browser tests also corrupt the shared `expect.element` timeout
- Under `/pure`, a document-wide query can hit a previous test's element, and the render result's own selectors are document-wide too (`screen.getByRole('button')` found both of two rendered buttons, measured). Scope to the render's container with `page.elementLocator(screen.container).getByRole(...)` (found one, measured), or give each render a unique id. A test that reads DOM left by the previous test passes in the full file and fails when run alone (`-t`, `--tags-filter`, shuffle)

## Locators

- **Locators match text exactly (Vitest 5):** full and case-sensitive (measured for `getByText`, `getByLabelText`, and the `name` of `getByRole`). `page.getByText('Hello')` does not find `Hello, World`; `getByRole('button', { name: 'Submit' })` does not find `Submit form`. Pass `{ exact: false }` per call, use a `RegExp`, or set `browser.locators.exact: false` to restore substring matching
- The `page` methods are `getByRole`, `getByText`, `getByLabelText`, `getByPlaceholder`, `getByTitle`, `getByAltText`, `getByTestId` (measured; there is no `getByLabel` or `getByPlaceholderText`)
- `locator.query()` returns the element or `null` without waiting: use it for absence checks inside `expect.poll`. `locator.element()` returns the DOM node and throws when nothing matches
- `await expect.element(page.getByRole('listitem')).toHaveLength(3)` asserts the match count (measured)

### CSS selector locators (`locators.extend`)

`.locator(selector)` is intentionally `protected` on vitest's `Locator` type (vitest-dev/vitest#7969). The official escape hatch is `locators.extend`:

```ts
// tests/browser/setup-locators.ts
import { locators } from "vitest/browser";
import type { Locator } from "vitest/browser";

locators.extend({
  css(selector: string) {
    return selector;
  },
});

declare module "vitest/browser" {
  interface LocatorSelectors {
    css(selector: string): Locator;
  }
}
```

Wire it via `setupFiles` in the browser project config. Then `.css()` is properly typed, no `@ts-expect-error` needed.

**Critical:** do NOT name the extend function `locator`, it shadows the internal `protected locator()` method and causes infinite recursion (`RangeError: Maximum call stack size exceeded`). Use `css` or another name.

## Waiting

- `await expect.element(locator)` retries a locator assertion; `expect.poll(() => value)` retries any expression (DOM reads, store values, request logs). `expect.poll` rejects at its own `timeout`
- `vi.waitFor(() => expect(spy).toHaveBeenCalledWith(...))` works in browser mode (measured, DOM text and spy calls)
