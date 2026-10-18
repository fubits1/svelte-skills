---
name: storybook-vitest
description: "Svelte CSF (@storybook/addon-svelte-csf) + @storybook/addon-vitest: .stories.svelte as Vitest browser tests with play functions and tags. Use when wiring or debugging Svelte Storybook tests in Vitest/CI, including 'Vitest failed to find the current suite', props_invalid_value, a story that stays green while it throws, and asChild or decorator context problems. Not for React/Vue/CSF3 .ts story files."
compatibility: Vitest 5, msw 2 (a Storybook project stays on msw 2 until msw-storybook-addon supports msw 3, see svelte-5:msw), msw-storybook-addon 3 (addon 2 uses the bare "msw-storybook-addon" specifier), Storybook for Svelte (Vite), @storybook/addon-svelte-csf
user-invocable: false
---

# Storybook Vitest + Svelte CSF

Stories are **`.stories.svelte`** with **`defineMeta`** and **`<Story>`** from `@storybook/addon-svelte-csf`; ignore JSX/TSX/CSF3-TS story patterns here. Official reference: [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), use it for **plugin, browser mode, CLI, tags, debugging, CI**; ignore non-Svelte story file examples there. [Manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced) · [Example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) · [Options](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#options)

## How it works

- Plugin **`storybookTest`** turns stories into Vitest tests via [portable stories (Vitest)](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest). **No Storybook server** required for the test run
- Each `<Story>`: smoke render; a **`play`** function runs as the interaction test ([interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing), [asserting with expect](https://storybook.js.org/docs/writing-tests/interaction-testing#asserting-with-expect))
- Errors do not fail the story they come from. A component that throws during render leaves its story green; Vitest reports the throw as an "unhandled error", the run exits non-zero, and the error is attributed to "the last test to run", which may be a different story (measured, with and without a decorator). A `console.error` alone does not fail anything (measured: the story passed and the message went to stderr). Read the "Unhandled Errors" block, not just the pass count. To make logged errors fail, install the spy before the story renders: declare `let errorSpy;` in `<script module>` (`let errorSpy: ReturnType<typeof spyOn>;` in `lang="ts"`), then `beforeEach: () => { errorSpy = spyOn(console, 'error'); return () => errorSpy.mockRestore() }` in `defineMeta` (`spyOn` from `storybook/test`), then `await expect(errorSpy).not.toHaveBeenCalled()` in `play` (measured: fails on an error logged at mount). A spy created inside `play` misses errors logged during render
- [Test coverage](https://storybook.js.org/docs/writing-tests/test-coverage): see Storybook's coverage doc; **`vitest --coverage --project …`** only covers projects you pass (many pipelines omit `storybook` on purpose)
- With the addon, **snapshot tests** are **not** supported (unlike the [test runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner); [comparison](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#comparison-to-the-test-runner))

## `.stories.svelte` + `play`

Use **`storybook/test`** (`expect`, `within`, `userEvent`, `waitFor`) in `play`. Scope queries with **`canvasElement`** to `within(canvasElement)`.

Every story with interactive elements (inputs, autocompletes,
buttons, forms) needs a `play` function that interacts and
asserts the result. A smoke render (`<Story name="Default" />`)
only proves the component mounts. In `play`:

1. Interact: click, type, select, submit
2. Assert the result: the selected value, the changed text, the
   callback data, the visual state change
3. Assert what a guard would hide: no `if (items.length > 1)`
   guards; if the dropdown should have options, assert that it has them

Assert the value the interaction produced, for example the exact
string an autocomplete's `onChange` received. Opening the dropdown,
or checking that something was selected, misses a callback that
passes objects instead of strings.

**Tags:** default `storybookTest({ tags: { include: ['test'], … } })` ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)), only stories carrying an included tag run; `test` is applied to every story by default, so a story stays out of the run only through `!test`, a tag in `exclude`, a tag in `skip`, or a custom `include` list. `!test`, `exclude`, and a non-matching `include` drop the story before Vitest sees it: it is neither run nor counted. A tag in `skip` keeps the story as a skipped test (measured: `1 passed | 1 skipped` in the test count). Add other [tags](https://storybook.js.org/docs/writing-stories/tags) to **`include`** only to pick up stories that opted out with `!test` (a story tagged only `autodocs` already runs, because it also carries the default `test` tag, measured). Set tags on **`defineMeta`** / stories or adjust `include` / `exclude` / `skip` (exclude wins if the same tag is both included and excluded).

```svelte
<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, within, userEvent } from "storybook/test";
  import MyComponent from "./MyComponent.svelte";

  const { Story } = defineMeta({
    title: "MyComponent",
    component: MyComponent,
  });
</script>

<Story
  name="Default"
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    // getByText matches the full text by default: this checks the text the click produced
    await expect(canvas.getByText("Clicked")).toBeVisible();
  }}
/>
```

Measured: a `!test` story next to a running story in the same file leaves `Tests 1 passed (1)`. A file in which no story survives the filter gets a placeholder `describe.skip('No valid tests found')`, so it counts as one skipped test file, not as skipped stories ([transformer source](https://github.com/storybookjs/storybook/blob/next/code/core/src/csf-tools/vitest-plugin/transformer.ts), measured). The skipped count therefore does not tell you which stories never ran: search for `!test` and for every tag listed in `exclude` or `skip`, not for stories without tags.

**Two `expect`s, two semantics.** `expect` from `storybook/test` (used in `play`) is Chai + jest-dom: its `toHaveTextContent('Cli')` passes on `Click` and accepts a `RegExp` (measured). Vitest 5's browser `expect.element(...).toHaveTextContent` is an exact full-string match. Do not copy assertions between story `play` functions and Vitest browser tests without checking which `expect` they use. `toMatchScreenshot` exists only on Vitest's `expect`: in `play`, import `expect` from `vitest` and wrap the canvas with `page.elementLocator(canvasElement)` (`frontend:vitest` visual-regression reference).

**Test name in output:** use **`name`** on `<Story>` ([custom name FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-customize-a-test-name)).

## Gotchas (FAQ)

- `Vitest failed to find the current suite`: caused by `optimizeDeps` reload mid-test (look for `✨ new dependencies optimized:` in output). If it happens on your addon version, add the newly-discovered deps to **`optimizeDeps.include`** on the **storybook project config** itself, copying each specifier verbatim from your own `import` statements. Measured on Vite 8: an unexported subpath of an installed package aborts the run before any test executes (`... is not exported under the conditions [...]`, `Test Files no tests`), a package that is not installed only warns (`Failed to resolve dependency`) and the run passes, and an entry that resolves but is not what you import passes silently and pre-bundles the wrong module, leaving the real one un-included. Only the first is loud. Common culprits: `msw-storybook-addon/csf3` (addon 2: `msw-storybook-addon`; the annotations path: `msw-storybook-addon/preview`), `@storybook/addon-svelte-csf`, `@storybook/addon-docs`, and on `@storybook/svelte` releases without the renderer fix below, any dependency your stories import ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-fix-the-error-vitest-failed-to-find-the-current-suite-error)). Root cause (with Vite 8, the dependency scan failed on a relative import inside `@storybook/svelte` and skipped pre-bundling, fixed in the Svelte renderer) and `optimizeDeps.entries`: `frontend:vitest` flake-hygiene reference. Treat a fix for this error as unverified until the flake-hygiene protocol passes
- Single-run bias: test counts from this addon can differ between runs on the same checkout. A "Test Files N passed (N)" line on one run does not prove the suite is healthy, so never claim "fixed" or "green" from a single run on this suite. If the user shows a failing screenshot and your run goes green, first acknowledge you cannot reproduce their failure and ask for their log or reproduction conditions, rather than re-running for another green. See `frontend:validate` flake rules and the `frontend:vitest` flake-hygiene reference
- More FAQ items (Interactions panel vs CLI, Vitest internal errors, `publicDir`, CI isolation and sharding, WebGL launch args, isolating `test` from `vite.config`): `references/config.md`

## `asChild`, decorators, and context

1. A decorator's `setContext` does not reach the story component in Vitest headless mode, while it does in the Storybook browser UI (observed in a real project, not measured). Components needing Svelte context should get it from an `asChild` wrapper (the `hasContext` fallback in `references/storybook-decorator.md` is the exception for components that must also work without a provider)
2. Do not combine `asChild` with a decorator: `DecoratorHandler` renders `<Component {...args} />` inside the decorator, so the component renders a second time without the props passed in the `asChild` content, and that render can crash with e.g. `Cannot read properties of undefined` (read from `DecoratorHandler.svelte`, observed in a real project, not measured)

**Fix:** put both context and visual wrapping (a frame component such as `StoryFrame`) inside the `asChild` wrapper component, never as a decorator. The wrapper and the `asChild` story are in `references/storybook-decorator.md` ("`asChild` pattern").

## Related

- Vitest/browser projects: `frontend:vitest` skill
- Svelte tests outside Storybook: `svelte-5:testing-svelte` skill
- MSW in `.storybook/preview`, handlers, story-scoped mocks, `msw-storybook-addon` 2 to 3: `svelte-5:msw` skill
- `references/storybook-decorator.md`: read when a story throws `props_invalid_value`, renders twice, or loses context from a decorator, and for the `asChild` wrapper pattern
- `references/config.md`: read when creating or changing `vitest.config`, the storybook project, test scripts, `--silent` or plugin options
