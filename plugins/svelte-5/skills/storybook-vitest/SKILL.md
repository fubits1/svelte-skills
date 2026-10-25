---
name: storybook-vitest
description: "Svelte CSF stories as Vitest browser tests via @storybook/addon-vitest: play, tags, decorators, asChild. Use when wiring or debugging them in Vitest/CI, or on 'Vitest failed to find the current suite' or props_invalid_value. Not for React/Vue."
compatibility: Vitest 5, Storybook 10 for Svelte (Vite) with an @storybook/addon-vitest whose peer range includes Vitest 5, @storybook/addon-svelte-csf, msw 3 with msw-storybook-addon 3 (see svelte-5:msw)
user-invocable: false
---

# Storybook Vitest + Svelte CSF

Stories are **`.stories.svelte`** with **`defineMeta`** and **`<Story>`** from `@storybook/addon-svelte-csf`; ignore JSX/TSX/CSF3-TS story patterns here. Official reference: [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), use it for **plugin, browser mode, CLI, tags, debugging, CI**; ignore non-Svelte story file examples there. [Manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced) · [Example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) · [Options](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#options)

## How it works

- Plugin **`storybookTest`** turns stories into Vitest tests via [portable stories (Vitest)](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest). **No Storybook server** required for the test run
- Each `<Story>`: smoke render; a **`play`** function runs as the interaction test ([interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing), [asserting with expect](https://storybook.js.org/docs/writing-tests/interaction-testing#asserting-with-expect))
- A component inside the story that throws while the story renders leaves its story green, with or without a decorator, unless a `play` assertion fails on what did not render. Vitest reports that throw as an "unhandled error", exits non-zero, and names "the last test to run before this error". Find the throwing component in that block's `❯` source frames: its component stack can show it as `in <unknown>`. Exception: when a decorator returns a bare component (`() => Wrapper`), the Vitest run renders the `defineMeta` component without props in its place, and a throw from that instance fails its story and prints under that failed story (`references/storybook-decorator.md`, "Decorator return form"). A `console.error` alone does not fail anything. Read the "Unhandled Errors" block, not just the pass count
- `--silent` hides the console output of every story. Separately, an AI agent's run with no reporter set in the config or the CLI uses Vitest's `minimal` reporter, which hides the output of passing stories even without `--silent`. `--silent=false` shows it (`references/config.md`)
- To make logged errors fail a story, install the spy before the story renders (a spy created inside `play` misses errors logged during render):
  1. Declare `let errorSpy;` in `<script module>` (`let errorSpy: ReturnType<typeof spyOn>;` in `lang="ts"`)
  2. In `defineMeta`: `beforeEach: () => { errorSpy = spyOn(console, 'error'); return () => errorSpy.mockRestore() }` (`spyOn` from `storybook/test`)
  3. In `play`: `await expect(errorSpy).not.toHaveBeenCalled()`, which fails on an error logged at mount
- [Test coverage](https://storybook.js.org/docs/writing-tests/test-coverage): see Storybook's coverage doc; **`vitest --coverage --project …`** only covers projects you pass ([`SETUP.md`](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md)'s `test:unit` omits `storybook`; `test:storybook` runs it)
- With the addon, **snapshot tests** are **not** supported (unlike the [test runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner); [comparison](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#comparison-to-the-test-runner))

## `.stories.svelte` + `play`

Use **`storybook/test`** (`expect`, `within`, `userEvent`, `waitFor`) in `play`. Scope queries with **`canvasElement`** to `within(canvasElement)`.

**Every story with interactive elements (inputs, autocompletes,
buttons, forms) MUST have a `play` function** that interacts and
asserts the result. A smoke render (`<Story name="Default" />`)
stays green even when a component inside the story throws while rendering, or the story
renders nothing. In `play`:

1. Interact: click, type, select, submit
2. Assert the result: the selected value, the changed text, the
   callback data, the visual state change
3. **Never silently skip**: no `if (items.length > 1)`
   guards; if the dropdown should have options, assert that it has them

A play function that opens a dropdown but never selects a value is
not a test, and neither is one that selects a value but never checks
WHICH value. Assert the value the interaction produced, for example
the exact string an autocomplete's `onChange` received: checking only
that something was selected misses a callback that passes objects
instead of strings.

**Tags:** default `storybookTest({ tags: { include: ['test'], … } })` ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)), only stories carrying an included tag run; `test` is applied to every story by default, so a story stays out of the run only through `!test`, a tag in `exclude`, a tag in `skip`, or a custom `include` list. `!test`, `exclude`, and a non-matching `include` drop the story before Vitest sees it: it is neither run nor counted. A tag in `skip` keeps the story as a skipped test (`1 passed | 1 skipped` in the test count). Add other [tags](https://storybook.js.org/docs/writing-stories/tags) to **`include`** only to pick up stories that opted out with `!test` (a story tagged only `autodocs` already runs, because it also carries the default `test` tag). Set tags on **`defineMeta`** / stories or adjust `include` / `exclude` / `skip` (exclude wins if the same tag is both included and excluded).

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

A `!test` story next to a running story in the same file leaves `Tests 1 passed (1)`. A file in which no story survives the filter counts as one skipped test file (`Test Files 1 skipped (1)`, `Tests no tests`), not as skipped stories: the transformer replaces it with a placeholder `describe.skip` ([transformer source](https://github.com/storybookjs/storybook/blob/next/code/core/src/csf-tools/vitest-plugin/transformer.ts)). The skipped count therefore does not tell you which stories never ran: search for `!test` and for every tag listed in `exclude` or `skip`, not for stories without tags.

**Two `expect`s, two semantics.** `expect` from `storybook/test` (used in `play`) is Chai + jest-dom: its `toHaveTextContent('Cli')` passes on `Click` and accepts a `RegExp`. Vitest 5's browser `expect.element(...).toHaveTextContent` is an exact full-string match. Do not copy assertions between story `play` functions and Vitest browser tests without checking which `expect` they use. `toMatchScreenshot` exists only on Vitest's `expect`: in `play`, import `expect` from `vitest` and `page` from `vitest/browser`, then wrap the canvas with `page.elementLocator(canvasElement)` (`frontend:vitest` visual-regression reference).

**Test name in output:** use **`name`** on `<Story>` ([custom name FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-customize-a-test-name)).

## Gotchas (FAQ)

- `Vitest failed to find the current suite`: an `optimizeDeps` reload mid-test, shown by:
  - `dependency optimized:` or `dependencies optimized:`, then `optimized dependencies changed. reloading`
  - in earlier Vite releases: `✨ new dependencies optimized:`, then `✨ optimized dependencies changed. reloading`
  - Vitest's `Vite unexpectedly reloaded a test`

  Fix:
  1. If the output shows `Failed to run dependency scan. Skipping dependency pre-bundling.`, Vite skipped the scan; dependencies outside `optimizeDeps.include` may then be found while tests run. Read the error printed with it and fix its cause; when it points into a dependency, report it to that package (`frontend:vitest` flake-hygiene reference)
  2. Add the newly discovered deps (named in the `dependency optimized:` or `dependencies optimized:` line; earlier Vite releases: the `✨ new dependencies optimized:` line) to **`optimizeDeps.include`** ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-fix-the-error-vitest-failed-to-find-the-current-suite-error)) on the **storybook project config** itself, copying each specifier verbatim from your own `import` statements. Common culprits: `msw-storybook-addon/preview` on the addon's `createPreviewAnnotations` path (the storybook project pre-bundles `msw-storybook-addon/csf3` itself: `svelte-5:msw`), `@storybook/addon-svelte-csf`, `@storybook/addon-docs`. To let the scan find deps itself, list its start files in `optimizeDeps.entries` (`frontend:vitest` flake-hygiene reference, Settings)
  3. Check the run for a wrong entry. On Vite 8, an unexported subpath of an installed package aborts the run before any test executes (`... is not exported under the conditions [...]`, `Test Files no tests`); a package that is not installed only warns (`Failed to resolve dependency`) and the run passes; an entry that resolves but is not what you import passes silently and pre-bundles the wrong module. Only the first is loud
  4. Any fix for this error is **UNVERIFIED** until the flake-hygiene protocol passes
- **Single-run bias:** this addon is PARTICULARLY prone to different test counts between runs on the same checkout. A "Test Files N passed (N)" line on one run does NOT prove the suite is healthy: NEVER claim "fixed" or "green" from a single run on this suite. If the user shows a failing screenshot and your run goes green, first acknowledge you cannot reproduce their failure and ask for their log or reproduction conditions, rather than re-running for another green. See `frontend:validate` flake rules and the `frontend:vitest` flake-hygiene reference
- **Do not enshrine unverified approaches as "better fixes" in this skill.** A new approach to a storybook/vitest problem goes through the full flake-hygiene protocol on a real failure before it is written down as a recommendation; unverified does not go in the skill
- **ALWAYS run the storybook project with `--silent`** (the [`SETUP.md`](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md) scripts `test:storybook` and `test:story` pass it): otherwise story and `msw` console output buries the errors. To see the console output of one story file, run `pnpm exec vitest run --project storybook --silent=false <file>` (`storybook` being your storybook project's name), not `pnpm test:story`, which always passes `--silent`. Which reporter shows what: `references/config.md`
- More FAQ items (Interactions panel vs CLI, Vitest internal errors, `publicDir`, CI isolation and sharding, WebGL launch args, isolating `test` from `vite.config`): `references/config.md`

## `asChild`, decorators, and context

1. Return a decorator component as `() => ({ Component: Wrapper })`. A bare `() => Wrapper` works in the Storybook UI but not in the Vitest run, where an argless instance of the `defineMeta` component (if it has one) renders in its place, with no render error unless that component throws without props (`references/storybook-decorator.md`, "Decorator return form")
2. A decorator in that form that calls `setContext` provides that context to the story component, in the Vitest run and in the Storybook UI: with Svelte CSF, `DecoratorHandler` renders the CSF story renderer inside the decorator, and the story component inside that
3. `asChild` and a decorator in that form can share a story: the `asChild` content renders inside the story renderer, so the component renders once, with the props you pass
4. Use `asChild` when the story passes props to the component inline rather than through `args`, or renders a wrapper component around it (`references/storybook-decorator.md`, "`asChild` pattern"; `svelte-5:storybook`)

## Related

- Vitest/browser projects: `frontend:vitest` skill
- Svelte tests outside Storybook: `svelte-5:testing-svelte` skill
- `msw` in `.storybook/preview`, handlers, story-scoped mocks, and the `msw` and `msw-storybook-addon` 2 to 3 migration: `svelte-5:msw` skill
- `references/storybook-decorator.md`: read when a story throws `props_invalid_value` or renders empty, when a decorator's markup, context or store values work in the Storybook UI but are missing in the Vitest run, when a story fails only in the Vitest run with its `defineMeta` component throwing as if it had no props, and for the `asChild` wrapper pattern
- `references/config.md`: read when setting up `@storybook/addon-vitest`, or creating or changing `vitest.config`, the storybook project, test scripts, `--silent` or plugin options
