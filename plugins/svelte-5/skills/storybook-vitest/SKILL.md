---
name: storybook-vitest
description: "Svelte CSF (@storybook/addon-svelte-csf) + @storybook/addon-vitest — .stories.svelte as Vitest browser tests, vitest.config + test.projects, play on <Story>, tags, storybookUrl/script, preview MSW. Use when wiring or debugging Svelte Storybook tests in Vitest/CI — not for React/Vue/CSF3 .ts story files. If there is no vitest.config.* and Vitest only lives under vite.config test:, ask before restructuring."
compatibility: Vitest 4.1+, MSW 2, Storybook for Svelte (Vite), @storybook/addon-svelte-csf. Ignore JSX/TSX/CSF3-TS story patterns here.
user-invocable: false
---

# Storybook Vitest + Svelte CSF

Stories are **`.stories.svelte`** with **`defineMeta`** and **`<Story>`** from `@storybook/addon-svelte-csf`. Official reference: [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) — use it for **plugin, browser mode, CLI, tags, debugging, CI**; ignore non-Svelte story file examples there. [Manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced) · [Example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) · [Options](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#options)

## How it works

- Plugin **`storybookTest`** turns stories into Vitest tests via [portable stories (Vitest)](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest). **No Storybook server** required for the test run.
- Each `<Story>`: smoke render; a **`play`** function runs as the interaction test ([interaction testing](https://storybook.js.org/docs/writing-tests/interaction-testing), [asserting with expect](https://storybook.js.org/docs/writing-tests/interaction-testing#asserting-with-expect)).
- Console errors fail the test. MSW in **`.storybook/preview`** applies when configured (v2+ if you use MSW).
- [Test coverage](https://storybook.js.org/docs/writing-tests/test-coverage) — see Storybook’s coverage doc; **`vitest --coverage --project …`** only covers projects you pass (many pipelines omit `storybook` on purpose).
- With the addon, **snapshot tests** are **not** supported (unlike the [test runner](https://storybook.js.org/docs/writing-tests/integrations/test-runner); [comparison](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#comparison-to-the-test-runner)).

## `.stories.svelte` + `play`

Use **`storybook/test`** (`expect`, `within`, `userEvent`, `waitFor`) in `play`. Scope queries with **`canvasElement`** → `within(canvasElement)`.

**EVERY story MUST have meaningful interaction tests.** A smoke
render (`<Story name="Default" />`) proves the component mounts
without crashing — nothing else. For every story that involves
user-interactive elements (inputs, autocompletes, buttons, forms):

1. **Interact** — click, type, select, submit
2. **Assert the result** — verify the selected value, the changed
   text, the callback data, the visual state change
3. **Never silently skip** — no `if (items.length > 1)` guards.
   If the dropdown should have options, ASSERT it does.

A play function that opens a dropdown but never selects a value
is not a test. A play function that selects a value but never
checks WHICH value was selected is not a test. Example: stories
that "tested" autocomplete interaction by opening
a dropdown and checking "something was selected" — this proved
nothing and missed a real bug (onChange returning objects instead
of strings).

**Tags:** default `storybookTest({ tags: { include: ['test'], … } })` ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)) — only tagged stories run. Add other [tags](https://storybook.js.org/docs/writing-stories/tags) to **`include`** when needed (e.g. **`autodocs`** if those stories should run under Vitest). Set tags on **`defineMeta`** / stories or adjust `include` / `exclude` / `skip` (exclude wins if the same tag is both included and excluded).

```svelte
<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, within, userEvent } from "vitest/browser";
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
    await expect(canvas.getByText("Clicked")).toBeVisible();
  }}
/>
```

**Test name in output:** use **`name`** on `<Story>` ([custom name FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-customize-a-test-name)).

## Gotchas (FAQ)

- **CLI / Vitest vs Storybook Interactions panel** can disagree — different environments ([docs](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#what-happens-when-there-are-different-test-results-in-multiple-environments)).
- **Vitest internal errors:** widget + console; [Vitest common errors](https://vitest.dev/guide/common-errors.html).
- **Non-default `public` dir:** set [`publicDir`](https://vitejs.dev/config/shared-options.html#publicdir) ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory)).
- **`Vitest failed to find the current suite`:** caused by `optimizeDeps` reload mid-test (look for `✨ new dependencies optimized:` in output). Fix: add the newly-discovered deps to **`optimizeDeps.include`** on the **storybook project config** itself. Common culprits: `msw-storybook-addon`, `svelte-tippy`, `@storybook/addon-svelte-csf`, `@storybook/addon-docs`. ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-fix-the-error-vitest-failed-to-find-the-current-suite-error)). **Any fix for this error is UNVERIFIED until proven by the flake-hygiene protocol below.** A single green run tells you nothing — this suite produces different counts between invocations on the same code. Do not recommend a fix I have not personally validated with the protocol.
- **Single-run bias:** this addon is PARTICULARLY prone to producing inconsistent counts between invocations on the same checkout. A "Test Files N passed (N)" line on one run does NOT prove the suite is healthy. I will not claim "fixed" or "green" based on a single run on this suite, ever. If the user shows me a failing screenshot and my run goes green, the FIRST move is to acknowledge I cannot reproduce their failure and ask for their log or reproduction conditions — not to re-run hoping for another green. See `frontend:validate` flake rules and `frontend:vitest` flake-hygiene section.
- **Do not enshrine unverified approaches as "better fixes" in this skill.** If I encounter or propose a new approach to a storybook/vitest problem, it must go through the full flake-hygiene protocol on a real failure before I write it down as a recommendation. Declaring an approach "worked" from a single background run while the user reproduces 31 failures on the same code is not verification. The approach may or may not be correct — but unverified does not go in the skill.
- **CI:** dynamic import / iframe — `test.isolate: false` and/or `--shard=i/n` ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#why-do-my-tests-fail-in-ci-with-failed-to-fetch-dynamically-imported-module-or-cannot-connect-to-the-iframe), [sharding](https://vitest.dev/guide/improving-performance.html#sharding)).
- **Isolation:** if **`vite.config` defines `test`**, it **merges** into configs that extend that Vite file and can break Storybook tests — **move `test` to `vitest.config`** ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-isolate-storybook-tests-from-others)). **`mergeConfig(viteConfig, defineConfig({ test: … }))` in `vitest.config.ts` is the documented Vitest 4 pattern** as long as **Vite does not own `test`**.
- **Playwright (WebGL / maps / Canvas):** optional `browser.provider: playwright({ launchOptions: { args: … } })` per [Vitest browser](https://vitest.dev/config/#browser-playwright) — not in Storybook’s doc, but common for headless Chromium.

## `asChild`, decorators, and context

Two problems interact here:

1. **Decorator `setContext` doesn’t propagate** to the story component in vitest headless mode (works in browser UI). Components needing Svelte context must get it from an `asChild` wrapper.

2. **Never combine `asChild` with a decorator.** `DecoratorHandler` renders `<Component {...args} />` inside the decorator — this instantiates the component WITHOUT the props passed manually in the `asChild` content. The component renders twice (once broken via decorator, once correct via `asChild`), and the broken render crashes with e.g. `Cannot read properties of undefined`.

**Fix:** put both context and visual wrapping (CardWrapper etc.) inside the `asChild` wrapper component — never as a decorator:

```svelte
<!-- MyWrapper.svelte — provides context + visual wrap -->
<script>
  import { setContext } from ‘svelte’
  import { writable } from ‘svelte/store’
  import CardWrapper from ‘$lib/storybook-util/CardWrapper.svelte’
  setContext(‘myContext’, writable(null))
</script>
<CardWrapper><slot /></CardWrapper>
```

```svelte
<!-- stories file — NO decorators -->
<script module>
  const { Story } = defineMeta({
    title: ‘MyComponent’,
    component: MyComponent,
    tags: [‘autodocs’],
  });
</script>

<Story name="Default" asChild>
  <MyWrapper>
    <MyComponent prop={value} />
  </MyWrapper>
</Story>
```

## Related

- Vitest/browser projects: `frontend:vitest` skill.
- Svelte tests outside Storybook: `svelte-5:testing-svelte` skill.

## Vitest config file

- Use a **dedicated `vitest.config.{ts,mts,js,mjs}`** at the package root (per monorepo package). Put **`storybookTest`** and **`test.projects`** here.
- Storybook docs recommend a **separate [test project](https://vitest.dev/guide/projects)** for Storybook vs other tests when using **Vitest ≥ 4.0** ([manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced)).
- **Do not define `test` in `vite.config`** if that config is extended/merged for Vitest — the FAQ’s merge problem is **Vite’s `test` field**, not `mergeConfig` itself.
- **`extends: true`** on a project inherits the **merged** root Vitest config (matches [official example](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files)). Alternative: root `defineConfig({ test: { projects: [{ extends: './vite.config.ts', … }] } })` with **no** `test` in Vite — same isolation goal.
- **Gate:** if there is **no** `vitest.config.*` and the only Vitest config is **`vite.config` → `test:`** (or there is no Vitest file), **ask** before adding the addon whether to introduce `vitest.config.ts` and move `test` out of Vite.

## Setup (`@storybook/addon-vitest`)

Prefer **`pnpm exec storybook add @storybook/addon-vitest`** ([automatic installation](https://storybook.js.org/docs/addons/install-addons#automatic-installation)). **Playwright Chromium** is required for default browser mode — install browsers if prompted ([Playwright browsers](https://playwright.dev/docs/browsers#install-browsers)).

**Manual** wiring follows [example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files). Vitest **4** example uses **`mergeConfig(viteConfig, defineConfig({ test: { projects: […] } }))`** and a Storybook project with **`extends: true`**.

- **`setupFiles`:** the plugin **auto-injects** its own setup files (`@storybook/addon-vitest/internal/setup-file` and `setup-file-with-project-annotations`). You do **not** need a manual `.storybook/vitest.setup.ts` unless you have custom per-test setup beyond what preview.ts provides. The doc example shows `setupFiles` but the plugin handles this internally.
- **`storybookScript`:** docs — _“This should match your **`package.json`** script to run Storybook”_ (e.g. **`pnpm storybook --no-open`**). You may **prefix** the same command with setup steps (i18n mocks, env) so watch-mode debugging matches dev.
- **`storybookUrl`:** default **`http://localhost:6006`** — must be **reachable** for failure links ([debugging](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#debugging)). For **CI**, set the **full URL** of the **published** Storybook (including **path prefix** if hosted under a subpath) so output links work ([CI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#in-ci), [Testing in CI](https://storybook.js.org/docs/writing-tests/in-ci#21-debugging-test-failures-in-ci)).
- **`storybookScript` behavior:** in **watch** mode, the plugin starts Storybook via this script **only if** nothing is already available at **`storybookUrl`** ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookscript)).

**Vitest 4 shape (aligned with Storybook doc; add sibling `projects` for node/browser/etc.):**

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
      // … other projects (node, browser) …
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
            storybookScript: "pnpm storybook --no-open",
          }),
        ],
        // Pre-bundle deps that trigger optimizeDeps reload mid-test
        // (causes "Vitest failed to find the current suite" error)
        optimizeDeps: {
          include: [
            "msw-storybook-addon",
            "svelte-tippy",
            "@storybook/addon-svelte-csf",
            "@storybook/addon-docs",
          ],
        },
        test: {
          name: "storybook",
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

[`vitest` CLI](https://vitest.dev/guide/cli.html) — default **watch**; use **`vitest run`** in CI.

Docs example: **`vitest --project=storybook`** ([CLI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#cli)). Many repos run **`--project storybook`** only from a **dedicated script** and keep **`test`** / **`validate`** on **node + browser** — that is a **pipeline choice**, not required by the addon.

```json
{
  "scripts": {
    "test": "vitest run --project node --project browser",
    "test-storybook": "vitest run --project storybook",
    "test:story": "bash scripts/test-story.sh"
  }
}
```

**`--silent`:** MSW logs flood storybook test output. ALWAYS use
`--silent` when running storybook tests, or use `pnpm test:story`
which includes it. Without `--silent`, grep for errors is
impossible — the output is 90% MSW request/response bodies.

**Debugging failures:** When a storybook test fails, ALWAYS open
the story in the **Storybook browser UI** via Playwright FIRST.
The browser console shows the actual Svelte error with component
stack trace. vitest only shows "test failed" without details.
Decorators (CardWrapper etc.) swallow errors — the real error is
only visible in the browser console.

**Common Svelte 5 error:** `props_invalid_value` — happens when
`bind:prop={undefined}` targets a prop with `$bindable(fallback)`.
Fix: add explicit `null` default: `prop = $bindable(null)`.

[Vitest IDE](https://vitest.dev/guide/ide.html) can run/debug these tests from the editor.

## Plugin options (quick)

| Option             | Notes                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configDir`        | Storybook config directory (default **`.storybook`**) ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#configdir))                                                                        |
| `tags`             | `{ include, exclude, skip }` — defaults **`include: ['test']`**, `exclude: []`, `skip: []`; exclude wins for the same tag in both ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)) |
| `storybookScript`  | Command to start Storybook; used in watch when `storybookUrl` is not already up ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookscript))                                        |
| `storybookUrl`     | Used for checks + **failure links** in output ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookurl))                                                                             |
| `disableAddonDocs` | Default **`true`** — MDX mocked unless you need real MDX parsing in tests ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#disableaddondocs))                                             |
