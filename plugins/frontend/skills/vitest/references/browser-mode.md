# Browser mode

## Setup

- Desktop breakpoints: `await page.viewport(1280, 800)` in the test, or `viewport` on the browser instance
- Headless Chromium without a GPU: WebGL (maps, canvas charts) needs `provider: playwright({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] } })`. For headed debugging, run `vitest --project browser --browser.headless=false --watch` and pass `launchOptions.slowMo`
- **File parallelism:** `test.fileParallelism: false` on the browser project and `browser.instances[].fileParallelism: false` both run browser test files one at a time (measured for each option, 3 runs: two 3s files took 6.3s with either option vs 3.4s by default). Use the per-instance option when browsers need different settings

## `vitest-browser-svelte`

- v3 gives `/pure` full export parity with the main entry and exports the `RenderResult` type
- The main entry calls `cleanup()` in `beforeEach`, so the last test's DOM stays mounted until the file ends. `vitest-browser-svelte/pure` never cleans up on its own: call `cleanup()` in `afterEach`, or await the `unmount()` from each render. Use `/pure` for `it.concurrent` tests: with the main entry's cleanup they destroy each other's DOM
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
