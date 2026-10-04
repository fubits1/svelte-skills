# Visual regression testing

Vitest includes **`toMatchScreenshot()`** natively in browser mode: it's built into `@vitest/browser` with the Playwright provider.

## Usage

```ts
import { expect, test } from "vitest";
import { page } from "vitest/browser";

test("component looks correct", async () => {
  await expect(page.getByRole("button", { name: "Submit" })).toMatchScreenshot(
    "submit-button",
  );
});
```

- **First run:** saves reference to `__screenshots__/<test file>/` next to the test file and **fails** the test ("No existing reference screenshot found"); review the image, then rerun
- **Subsequent runs:** compares with **pixelmatch**; on mismatch writes `<name>-actual-<browser>-<platform>.png` + `<name>-diff-<browser>-<platform>.png` to `.vitest/attachments/<test path>/` (Vitest 5, measured). Failure screenshots of other failing tests go to `.vitest/attachments/failure-screenshots/`. Add `.vitest` to `.gitignore`
- **Reference directory:** `browser.expect.toMatchScreenshot.screenshotDirectory` (default `__screenshots__`). If you set `browser.screenshotDirectory`, also set this option explicitly, then move existing references to that location or regenerate them
- **Update baselines:** `vitest --update`
- **Filenames include browser + platform** (e.g. `my-component-chromium-darwin.png`)
- **Animations auto-disabled** when using Playwright provider

## Where baselines live

Reference filenames carry the platform (`-darwin`, `-linux`, `-win32`), and rendering differs between them. A baseline made on a Mac never matches on a Linux CI runner. Pick one of two setups and write it down in the project's test docs:

| Setup | How | Trade-off |
| --- | --- | --- |
| Commit CI-platform baselines | Generate and update baselines in the CI platform only, e.g. in the Playwright Docker image or a CI job that runs `vitest --update` and commits the result. Commit `__screenshots__/`. | VRT runs in CI and catches regressions on every PR; updating a baseline needs the container or the CI job. |
| Local-only VRT | Gitignore `__screenshots__/`; run visual tests locally as a review aid; tag them (e.g. `ci-skip`) so CI does not run them. | Simple; CI never checks visuals, and each developer keeps their own baselines. |

Do not commit baselines from more than one platform for the same test unless CI runs every one of them.

- Glob-based tools can choke on baseline directories: a story file's baselines live in a directory named `<File>.stories.svelte/`, which matches a `**/*.svelte` glob, and reading it as a file throws `EISDIR`. Exclude `**/__screenshots__/**` from such globs
- In a Storybook `play` function, `expect` from `storybook/test` does not have `toMatchScreenshot` (it throws `Invalid Chai property: toMatchScreenshot`). Import `expect` from `vitest` and target the canvas with `page.elementLocator(canvasElement)` from `vitest/browser`

## Config (optional: per-project or global)

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

## Per-test options

```ts
await expect(element).toMatchScreenshot("name", {
  screenshotOptions: {
    mask: [page.getByRole("time")],
  },
  comparatorOptions: {
    allowedMismatchedPixelRatio: 0.01,
  },
});
```

## When to use

Use `toMatchScreenshot` instead of manual Playwright MCP screenshots + eyeballing for CSS/layout verification. It provides **programmatic pixel-level diffing** with actual diff images. Works in both `browser` and `storybook` test projects (in a story's `play`, with `expect` from `vitest`).
