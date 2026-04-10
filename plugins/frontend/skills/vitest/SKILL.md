---
name: vitest
description: Vitest test.projects, browser mode with playwright(), optimizeDeps, separate vitest.config from vite.config. Use when editing vitest config, flaky browser tests, upgrading @vitest/*, or splitting node vs browser projects — if test only exists under vite.config and there is no vitest.config.*, ask before adding projects or Storybook.
compatibility: Written for Vitest 4.1+ (factory browser provider, test.projects).
user-invocable: true
---

# Vitest

- **Docs:** if unsure about an API, fetch `https://vitest.dev/llms.txt`. Do not guess.
- **Config file:** use **`vitest.config.{ts,mts,js,mjs}`** for `test` / `test.projects`. Vitest-only-in-`vite.config` merges badly with multiple projects and Storybook.
- **Gate:** no `vitest.config.*` but `vite.config` has **`test:`** (or no Vitest file) → **ask** before adding projects or Storybook whether to introduce `vitest.config.ts` and move `test` out of Vite.
- `page.viewport(width, height)` — import from `vitest/browser`.
- **`test.projects`** for mixed node/browser and Storybook. Either **`extends: true`** (inherit merged root — [Storybook Vitest example](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) with `mergeConfig(viteConfig, …)`) or **`extends: './vite.config.ts'`** per project; put `test` + `plugins` on each project (**storybook-vitest** skill).
- Browser concurrency: `vitest-browser-svelte/pure` when you need no auto-cleanup; unique `data-testid` + `document.querySelector` where needed.
- Upgrade: bump all **`@vitest/*`** together.
- **`browser.provider`:** `import { playwright } from '@vitest/browser-playwright'` → `provider: playwright()` (factory, not a string).
- Use `import { page } from 'vitest/browser'` — not `@vitest/browser/context`.
- In `test.projects`, `plugins` / `resolve` / `optimizeDeps` belong **inside each project**, not only at root — projects do not inherit root plugins.
- **`optimizeDeps.exclude`:** Svelte 5 runes in `.svelte.js` (e.g. Melt UI) so vite-plugin-svelte handles them, not esbuild.
- **`optimizeDeps.include`:** deps that trigger mid-test optimization (e.g. `minisearch`) to reduce flakes.
- **Storybook:** **`vitest.config.ts`** + `storybookTest` + browser `playwright()` — **storybook-vitest** skill, [manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced).

## Browser test flake hygiene

Browser/MSW/storybook suites are inherently flaky on a single run. Before any "green" claim:

1. `lsof -ti :<test-server-port>` — kill any holder.
2. `rm -rf node_modules/.vite node_modules/.cache/storybook`
3. Run the test ONCE — capture setup time + counts.
4. Run AGAIN — counts must match within ±0 tests, setup time within ±30%.
5. Run a THIRD time — same.

If any of (3)(4)(5) diverge: the suite is flaky. Investigate the flake itself (missing `optimizeDeps.entries`, race in async teardowns, MSW handler order) BEFORE claiming any fix works.

A single passing run on this kind of suite tells you nothing about whether your fix worked. It tells you only that ONE possible execution order happened to pass.

## Test Tags (CI exclusion)

Vitest 4.1+ supports **tags** for filtering tests at runtime. Tags must be **defined in config** before use — using an undefined tag throws.

**Config** (root `test` block, inherited by all projects):

```ts
test: {
  tags: [
    { name: 'ci-skip', description: 'needs recorded fixtures or live backend' }
  ],
}
```

**Test file:**

```ts
describe('my suite', { tags: ['ci-skip'] }, () => { ... })
// or on individual tests:
it('needs backend', { tags: ['ci-skip'] }, () => { ... })
```

**CLI filter:**

```bash
vitest --tags-filter='!ci-skip'          # exclude
vitest --tags-filter='unit || e2e'       # include
vitest --tags-filter='(unit || e2e) && !slow'  # combine
```

**Critical:** tags only skip the test _body_ — the file is still **imported**. If the import itself throws (e.g. MSW handlers throwing on missing fixtures), the tag won't help. Module-level code must be import-safe (warn, don't throw).

**Critical:** `pnpm test -- --tags-filter='!ci-skip'` does NOT work. The `--` makes vitest treat `--tags-filter` as a positional arg. Use a dedicated script: `"test:ci": "vitest --run --tags-filter='!ci-skip'"`.

## CSS Selector Locators (`locators.extend`)

`.locator(selector)` is intentionally `protected` on vitest's `Locator` type (vitest-dev/vitest#7969). The official escape hatch is `locators.extend` (since Vitest 3.2):

```ts
// tests/browser/setup-locators.ts
import { locators } from "vitest/browser";

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

Wire it via `setupFiles` in the browser project config. Then `.css()` is properly typed — no `@ts-expect-error` needed.

**Critical:** do NOT name the extend function `locator` — it shadows the internal `protected locator()` method and causes infinite recursion (`RangeError: Maximum call stack size exceeded`). Use `css` or another name.

## Visual Regression Testing

Vitest 4.0+ includes **`toMatchScreenshot()`** natively in browser mode. No extra packages needed — it's built into `@vitest/browser` with the Playwright provider.

### Usage

```ts
import { expect, test } from "vitest";
import { page } from "vitest/browser";

test("component looks correct", async () => {
  await expect(page.getByTestId("my-component")).toMatchScreenshot(
    "my-component",
  );
});
```

- **First run:** saves reference to `__screenshots__/` next to the test file
- **Subsequent runs:** compares with **pixelmatch**, generates `*-actual.png` + `*-diff.png` on failure
- **Update baselines:** `vitest --update`
- **Filenames include browser + platform** (e.g. `my-component-chromium-darwin.png`)
- **Animations auto-disabled** when using Playwright provider

### Config (optional — per-project or global)

```ts
test: {
  browser: {
    expect: {
      toMatchScreenshot: {
        comparatorName: 'pixelmatch',
        comparatorOptions: {
          threshold: 0.2,
          allowedMismatchedPixelRatio: 0.01,
        },
      },
    },
  },
}
```

### Per-test options

```ts
await expect(element).toMatchScreenshot("name", {
  screenshotOptions: {
    mask: [page.getByTestId("timestamp")], // mask dynamic content
  },
  comparatorOptions: {
    allowedMismatchedPixelRatio: 0.01,
  },
});
```

### When to use

Use `toMatchScreenshot` instead of manual Playwright MCP screenshots + eyeballing for CSS/layout verification. It provides **programmatic pixel-level diffing** with actual diff images — not subjective "looks the same" claims. Works in both `browser` and `storybook` test projects.
