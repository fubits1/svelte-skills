---
name: storybook-vitest
description: "Svelte CSF (@storybook/addon-svelte-csf) + @storybook/addon-vitest: .stories.svelte as Vitest browser tests with play functions and tags. Use when wiring or debugging Svelte Storybook tests in Vitest/CI, not for React/Vue/CSF3 .ts story files."
compatibility: Vitest 5, MSW 2, msw-storybook-addon 3 (v2 uses the bare "msw-storybook-addon" specifier), Storybook for Svelte (Vite), @storybook/addon-svelte-csf. Ignore JSX/TSX/CSF3-TS story patterns here.
user-invocable: false
---

# Storybook Vitest + Svelte CSF

Stories are **`.stories.svelte`** with **`defineMeta`** and **`<Story>`** from `@storybook/addon-svelte-csf`. Official reference: [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), use it for **plugin, browser mode, CLI, tags, debugging, CI**; ignore non-Svelte story file examples there. [Manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced) · [Example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) · [Options](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#options)

## How it works

- Plugin **`storybookTest`** turns stories into Vitest tests via [portable stories (Vitest)](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest). **No Storybook server** required for the test run.
- Each `<Story>`: smoke render; a **`play`** function runs as the interaction test ([interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing), [asserting with expect](https://storybook.js.org/docs/writing-tests/interaction-testing#asserting-with-expect)).
- Errors do not fail the story they come from. A component that throws during render leaves its story green; Vitest reports the throw as an "unhandled error", the run exits non-zero, and the error is attributed to "the last test to run", which may be a different story (measured, with and without a decorator). A `console.error` alone does not fail anything (measured: the story passed and the message went to stderr). Read the "Unhandled Errors" block, not just the pass count. To make logged errors fail, install the spy before the story renders: declare `let errorSpy;` in `<script module>`, then `beforeEach: () => { errorSpy = spyOn(console, 'error'); return () => errorSpy.mockRestore() }` in `defineMeta` (`spyOn` from `storybook/test`), then `await expect(errorSpy).not.toHaveBeenCalled()` in `play` (measured: fails on an error logged at mount). A spy created inside `play` misses errors logged during render. MSW in **`.storybook/preview`** applies when configured (v2+ if you use MSW)
- [Test coverage](https://storybook.js.org/docs/writing-tests/test-coverage): see Storybook’s coverage doc; **`vitest --coverage --project …`** only covers projects you pass (many pipelines omit `storybook` on purpose).
- With the addon, **snapshot tests** are **not** supported (unlike the [test runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner); [comparison](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#comparison-to-the-test-runner)).

## `.stories.svelte` + `play`

Use **`storybook/test`** (`expect`, `within`, `userEvent`, `waitFor`) in `play`. Scope queries with **`canvasElement`** to `within(canvasElement)`.

**EVERY story MUST have meaningful interaction tests.** A smoke
render (`<Story name="Default" />`) proves the component mounts
without crashing, nothing else. For every story that involves
user-interactive elements (inputs, autocompletes, buttons, forms):

1. **Interact**: click, type, select, submit
2. **Assert the result**: verify the selected value, the changed
   text, the callback data, the visual state change
3. **Never silently skip**: no `if (items.length > 1)` guards.
   If the dropdown should have options, ASSERT it does.

A play function that opens a dropdown but never selects a value
is not a test. A play function that selects a value but never
checks WHICH value was selected is not a test. Example: stories
that "tested" autocomplete interaction by opening
a dropdown and checking "something was selected", this proved
nothing and missed a real bug (onChange returning objects instead
of strings).

**Tags:** default `storybookTest({ tags: { include: ['test'], … } })` ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)), only stories carrying an included tag run; `test` is applied to every story by default, so in practice a story is skipped only through `!test`, an `exclude`d tag, or a custom `include` list. Add other [tags](https://storybook.js.org/docs/writing-stories/tags) to **`include`** only to pick up stories that opted out with `!test` (a story tagged only `autodocs` already runs, because it also carries the default `test` tag, measured). Set tags on **`defineMeta`** / stories or adjust `include` / `exclude` / `skip` (exclude wins if the same tag is both included and excluded).

```svelte
<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, within, userEvent } from "storybook/test";
  import MyComponent from "./MyComponent.svelte";

  const { Story } = defineMeta({
    title: "MyComponent",
    component: MyComponent,
    tags: ["test"],
  });
</script>

<Story
  name="Default"
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    // Testing Library matches the full text by default: this checks the text the click produced
    await expect(canvas.getByText("Clicked")).toBeVisible();
  }}
/>
```

**Every story carries the `test` tag by default.** A story file with no `tags` at all runs under Vitest; one with `tags: ['!test']` is skipped (measured: `1 passed | 1 skipped`). To find stories that never run, search for `!test` (and for any custom tag listed in `exclude`), not for stories without tags.

**Two `expect`s, two semantics.** `expect` from `storybook/test` (used in `play`) is Chai + jest-dom: its `toHaveTextContent('Cli')` passes on `Click` and accepts a `RegExp` (measured). Vitest 5's browser `expect.element(...).toHaveTextContent` is an exact full-string match. Do not copy assertions between story `play` functions and Vitest browser tests without checking which `expect` they use. `toMatchScreenshot` exists only on Vitest's `expect`: in `play`, import `expect` from `vitest` and wrap the canvas with `page.elementLocator(canvasElement)` (`frontend:vitest` visual-regression reference).

**Test name in output:** use **`name`** on `<Story>` ([custom name FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-customize-a-test-name)).

## Gotchas (FAQ)

- **CLI / Vitest vs Storybook Interactions panel** can disagree: different environments ([docs](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#what-happens-when-there-are-different-test-results-in-multiple-environments)).
- **Vitest internal errors:** widget + console; [Vitest common errors](https://vitest.dev/guide/common-errors.html).
- **Non-default `public` dir:** set [`publicDir`](https://vitejs.dev/config/shared-options.html#publicdir) ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory)).
- **`Vitest failed to find the current suite`:** caused by `optimizeDeps` reload mid-test (look for `✨ new dependencies optimized:` in output). Fix, if it still happens on your addon version: add the newly-discovered deps to **`optimizeDeps.include`** on the **storybook project config** itself, copying each specifier verbatim from your own `import` statements. Measured on Vite 8.1.5: an entry that cannot resolve aborts the run before any test executes (`... is not exported under the conditions [...]`, `Test Files no tests`), while an entry that resolves but is not what you import passes silently and pre-bundles the wrong module, leaving the real one un-included. The first mistake is loud, the second is not. Common culprits: `msw-storybook-addon/csf3` (addon v2: `msw-storybook-addon`), `svelte-tippy`, `@storybook/addon-svelte-csf`, `@storybook/addon-docs`. ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-fix-the-error-vitest-failed-to-find-the-current-suite-error)). Root cause (`.svelte`-only imports invisible to Vite 8's dependency scanner, fixed upstream in the addon) and `optimizeDeps.entries`: `frontend:vitest` flake-hygiene reference. **Any fix for this error is UNVERIFIED until proven by the flake-hygiene protocol (`frontend:vitest` flake-hygiene reference).** A single green run tells you nothing: this suite produces different counts between invocations on the same code. Do not recommend a fix until the flake-hygiene protocol has validated it
- **Single-run bias:** this addon is PARTICULARLY prone to producing inconsistent counts between invocations on the same checkout. A "Test Files N passed (N)" line on one run does NOT prove the suite is healthy. Never claim "fixed" or "green" based on a single run on this suite. If the user shows a failing screenshot and your run goes green, the FIRST move is to acknowledge you cannot reproduce their failure and ask for their log or reproduction conditions, not to re-run hoping for another green. See `frontend:validate` flake rules and the `frontend:vitest` flake-hygiene reference
- **Do not enshrine unverified approaches as "better fixes" in this skill.** If you encounter or propose a new approach to a storybook/vitest problem, it must go through the full flake-hygiene protocol on a real failure before being written down as a recommendation. Declaring an approach "worked" from a single background run while the user reproduces 31 failures on the same code is not verification. The approach may or may not be correct, but unverified does not go in the skill.
- **CI:** dynamic import / iframe: `test.isolate: false` and/or `--shard=i/n` ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#why-do-my-tests-fail-in-ci-with-failed-to-fetch-dynamically-imported-module-or-cannot-connect-to-the-iframe), [sharding](https://vitest.dev/guide/improving-performance.html#sharding)).
- **Isolation:** if **`vite.config` defines `test`**, it **merges** into configs that extend that Vite file and can break Storybook tests: **move `test` to `vitest.config`** ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-isolate-storybook-tests-from-others)). **`mergeConfig(viteConfig, defineConfig({ test: … }))` in `vitest.config.ts` is the pattern Storybook documents** (runs on Vitest 4 and 5) as long as **Vite does not own `test`**
- **Playwright (WebGL / maps / Canvas):** optional `browser.provider: playwright({ launchOptions: { args: … } })` per [Vitest browser](https://vitest.dev/config/#browser-playwright): not in Storybook’s doc, but common for headless Chromium.

## `asChild`, decorators, and context

Two problems interact here:

1. **Decorator `setContext` doesn’t propagate** to the story component in vitest headless mode (works in browser UI). Components needing Svelte context should get it from an `asChild` wrapper (the `hasContext` fallback in `references/storybook-decorator.md` is the exception for components that must also work without a provider)

2. **Never combine `asChild` with a decorator.** `DecoratorHandler` renders `<Component {...args} />` inside the decorator: this instantiates the component WITHOUT the props passed manually in the `asChild` content. The component renders twice (once broken via decorator, once correct via `asChild`), and the broken render crashes with e.g. `Cannot read properties of undefined`.

**Fix:** put both context and visual wrapping (CardWrapper etc.) inside the `asChild` wrapper component, never as a decorator:

```svelte
<!-- MyWrapper.svelte: provides context + visual wrap (Svelte 5 children snippet, measured) -->
<script>
  import { setContext } from "svelte";
  import { writable } from "svelte/store";
  import CardWrapper from "$lib/storybook-util/CardWrapper.svelte";
  let { children } = $props();
  setContext("myContext", writable("from wrapper"));
</script>
<CardWrapper>{@render children()}</CardWrapper>
```

```svelte
<!-- stories file: NO decorators -->
<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, within } from "storybook/test";
  import MyComponent from "./MyComponent.svelte"; // renders <p>{prop} / {$ctx}</p> from getContext("myContext")
  import MyWrapper from "./MyWrapper.svelte";

  const { Story } = defineMeta({
    title: "MyComponent",
    component: MyComponent,
    tags: ["autodocs"],
  });
</script>

<Story
  name="Default"
  asChild
  play={async ({ canvasElement }) => {
    // the component reads the context the wrapper provides (measured with an asChild wrapper)
    await expect(within(canvasElement).getByText("value / from wrapper")).toBeVisible();
  }}
>
  <MyWrapper>
    <MyComponent prop="value" />
  </MyWrapper>
</Story>
```

## Related

- Vitest/browser projects: `frontend:vitest` skill.
- Svelte tests outside Storybook: `svelte-5:testing-svelte` skill.
- MSW handlers, story-scoped mocks, addon v2→v3: `svelte-5:msw` skill.
- Decorator rendering internals + `props_invalid_value` traps: `references/storybook-decorator.md`.

## Vitest config file

- Use a **dedicated `vitest.config.{ts,mts,js,mjs}`** at the package root (per monorepo package). Put **`storybookTest`** and **`test.projects`** here.
- Storybook docs recommend a **separate [test project](https://vitest.dev/guide/projects)** for Storybook vs other tests when using **Vitest ≥ 4.0** ([manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced)).
- **Do not define `test` in `vite.config`** if that config is extended/merged for Vitest: the FAQ’s merge problem is **Vite’s `test` field**, not `mergeConfig` itself.
- Since Vitest 5, every inline project **inherits the merged root config by default** (`extends: true` is the default; the [official example](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) still writes it). With a `mergeConfig(vite.config, …)` root, sibling node/browser projects get the root's Vite plugins and root `setupFiles` too; a plain node project that must not get them needs **`extends: false`**. Alternative: root `defineConfig({ test: { projects: [{ extends: './vite.config.ts', … }] } })` with **no** `test` in Vite: same isolation goal
- **Do not add the root's plugins (e.g. `svelte()`, `sveltekit()`) to the storybook project.** They are inherited; a duplicate compiles components twice (`CompileError: … Expected token }`). Leave `extends` unset: an explicit `extends: true` hides Vitest's "applies the same plugin multiple times" warning
- **Gate:** if there is **no** `vitest.config.*` and the only Vitest config is **`vite.config` to `test:`** (or there is no Vitest file), **ask** before adding the addon whether to introduce `vitest.config.ts` and move `test` out of Vite.

## Setup (`@storybook/addon-vitest`)

Prefer **`pnpm exec storybook add @storybook/addon-vitest`** ([automatic installation](https://storybook.js.org/docs/addons/install-addons#automatic-installation)). **Playwright Chromium** is required for default browser mode, install browsers if prompted ([Playwright browsers](https://playwright.dev/docs/browsers#install-browsers)).

**Manual** wiring follows [example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files). The example uses **`mergeConfig(viteConfig, defineConfig({ test: { projects: […] } }))`** and a Storybook project with **`extends: true`**, which is the default since Vitest 5 and is left out below.

- **`setupFiles`:** since **Storybook 10.3** the plugin applies preview annotations automatically: it always injects `@storybook/addon-vitest/internal/setup-file`, and injects `setup-file-with-project-annotations` **only when you have not supplied a `setProjectAnnotations` setup file**. So a manual `.storybook/vitest.setup.ts` is **not required** unless you have custom per-test setup beyond `preview.ts`; if you keep one that calls `setProjectAnnotations`, the plugin defers to it. Before 10.3 that file, referenced via `setupFiles`, was required, which is why the doc example still shows it. Root `test.setupFiles` concatenate into every inline project in Vitest 5, so the storybook project runs them too
- **`storybookScript`:** docs: _“This should match your **`package.json`** script to run Storybook”_ (e.g. **`pnpm storybook --no-open`**). You may **prefix** the same command with setup steps (i18n mocks, env) so watch-mode debugging matches dev.
- **`storybookUrl`:** default **`http://localhost:6006`**: must be **reachable** for failure links ([debugging](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#debugging)). For **CI**, set the **full URL** of the **published** Storybook (including **path prefix** if hosted under a subpath) so output links work ([CI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#in-ci), [Testing in CI](https://storybook.js.org/docs/writing-tests/in-ci#21-debugging-test-failures-in-ci)).
- **`storybookScript` behavior:** in **watch** mode, the plugin starts Storybook via this script **only if** nothing is already available at **`storybookUrl`** ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookscript)).

**Vitest 5 shape (aligned with Storybook doc; add sibling `projects` for node/browser/etc.):**

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import type { ConfigEnv, UserConfig } from "vite";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import vite from "./vite.config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// If vite.config exports a function, resolve it:
function resolveViteConfig(env: ConfigEnv): UserConfig {
  return typeof vite === "function" ? vite(env) : vite;
}

const testConfig: UserConfig = {
  test: {
    projects: [
      // … other projects (node, browser): they inherit the merged root too; `extends: false` opts out …
      {
        /**
         * no `extends`: inheriting the merged root is the default since Vitest 5,
         * and an explicit `extends: true` hides the duplicate-plugin warning
         */
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
            storybookScript: "pnpm storybook --no-open",
          }),
        ],
        // Pre-bundle deps that trigger optimizeDeps reload mid-test
        // (causes "Vitest failed to find the current suite" error).
        //
        // Copy each specifier VERBATIM from your own import statements.
        // An entry that cannot resolve aborts the run before any test
        // executes. An entry that resolves but is not the one you import
        // passes silently and pre-bundles the wrong module, which is the
        // mistake you will not notice.
        //
        // msw-storybook-addon is version-keyed: v3 imports
        // "msw-storybook-addon/csf3", v2 imports "msw-storybook-addon".
        // Check the installed major before copying (svelte-5:msw skill).
        optimizeDeps: {
          include: [
            "msw-storybook-addon/csf3", // v2: "msw-storybook-addon"
            "svelte-tippy",
            "@storybook/addon-svelte-csf",
            "@storybook/addon-docs",
          ],
        },
        test: {
          name: "storybook",
          // no setupFiles: since Storybook 10.3 the plugin auto-applies preview annotations (see setupFiles note above)
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
};

// Function export handles vite.config that exports defineConfig(({ mode }) => …)
export default defineConfig((configEnv) =>
  mergeConfig(resolveViteConfig(configEnv), testConfig),
);
```

## CLI & scripts

[`vitest` CLI](https://vitest.dev/guide/cli.html), default **watch**; use **`vitest run`** in CI.

Docs example: **`vitest --project=storybook`** ([CLI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#cli)). Many repos run **`--project storybook`** only from a **dedicated script** and keep **`test`** / **`validate`** on **node + browser**, that is a **pipeline choice**, not required by the addon.

```json
{
  "scripts": {
    "test": "vitest run --project node --project browser",
    "test-storybook": "vitest run --project storybook",
    "test:story": "node --experimental-strip-types scripts/bin/test-story.ts"
  }
}
```

**`--silent`:** MSW logs flood storybook test output. ALWAYS use
`--silent` when running storybook tests, or use `pnpm test:story`
which includes it. Without `--silent`, grep for errors is
impossible, the output is 90% MSW request/response bodies.

**Debugging failures:** read Vitest's **"Unhandled Errors"** block first: a component
that throws during render shows up there with the Svelte component stack (e.g.
`in Frame.svelte`, `in DecoratorHandler.svelte`), even though its story is reported as
passed and decorators are involved (measured). Then open the story in the **Storybook
browser UI** via Playwright to reproduce it interactively; the browser console shows the
same error plus anything logged around it.

**Common Svelte 5 error:** `props_invalid_value` ("Cannot do `bind:%key%={undefined}` when `%key%` has a fallback value", [Svelte runtime errors](https://svelte.dev/docs/svelte/runtime-errors#Client-errors-props_invalid_value)). It happens when `bind:prop={value}` passes `undefined` to a prop declared with any fallback, and `null` counts as a fallback: `$bindable(null)` throws exactly like `$bindable('x')` (measured). Fix it on one side: give the bound variable a defined initial value in the parent, or declare the prop without a fallback (`prop = $bindable()`, measured to render) when `undefined` is a valid value.

[Vitest IDE](https://vitest.dev/guide/ide.html) can run/debug these tests from the editor.

## Plugin options (quick)

| Option | Notes |
| --- | --- |
| `configDir` | Storybook config directory (default **`.storybook`**) ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#configdir)) |
| `tags` | `{ include, exclude, skip }`, defaults **`include: ['test']`**, `exclude: []`, `skip: []`; exclude wins for the same tag in both ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)) |
| `storybookScript` | Command to start Storybook; used in watch when `storybookUrl` is not already up ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookscript)) |
| `storybookUrl` | Used for checks + **failure links** in output ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookurl)) |
| `disableAddonDocs` | Default **`true`**, MDX mocked unless you need real MDX parsing in tests ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#disableaddondocs)) |
