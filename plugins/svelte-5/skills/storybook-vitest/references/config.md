# Config, setup, CLI and plugin options

## Vitest config file

- Use a **dedicated `vitest.config.{ts,mts,js,mjs}`** at the package root (per monorepo package). Put **`storybookTest`** and **`test.projects`** here
- Storybook docs recommend a **separate [test project](https://vitest.dev/guide/projects)** for Storybook vs other tests ([manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced))
- Do not define `test` in `vite.config` if that config is extended/merged for Vitest: the FAQ's merge problem is **Vite's `test` field**, not `mergeConfig` itself
- Every inline project **inherits the merged root config by default** (the [official example](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) writes `extends: true` anyway). With a `mergeConfig(vite.config, …)` root, sibling node/browser projects get the root's Vite plugins and root `setupFiles` too; a plain node project that must not get them needs **`extends: false`**. Alternative: root `defineConfig({ test: { projects: [{ extends: './vite.config.ts', … }] } })` with **no** `test` in Vite: same isolation goal
- Do not add the root's plugins (e.g. `svelte()`, `sveltekit()`) to the storybook project. They are inherited; a duplicate compiles components twice (`CompileError: … Expected token }`). Leave `extends` unset: an explicit `extends: true` hides Vitest's "applies the same plugin multiple times" warning
- Gate: if there is **no** `vitest.config.*` and the only Vitest config is a **`test:` block in `vite.config`** (or there is no Vitest file), **ask** before adding the addon whether to introduce `vitest.config.ts` and move `test` out of Vite
- Isolation: if **`vite.config` defines `test`**, it **merges** into configs that extend that Vite file and can break Storybook tests: **move `test` to `vitest.config`** ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-isolate-storybook-tests-from-others)). **`mergeConfig(viteConfig, defineConfig({ test: … }))` in `vitest.config.ts` is the pattern Storybook documents** as long as **Vite does not own `test`**

## Setup (`@storybook/addon-vitest`)

Prefer **`pnpm exec storybook add @storybook/addon-vitest`** ([automatic installation](https://storybook.js.org/docs/addons/install-addons#automatic-installation)). **Playwright Chromium** is required for default browser mode; install the browsers if prompted ([Playwright browsers](https://playwright.dev/docs/browsers#install-browsers)).

**Manual** wiring follows [example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files). The example uses **`mergeConfig(viteConfig, defineConfig({ test: { projects: […] } }))`** and a Storybook project with **`extends: true`**. That is the default, and writing it out hides the duplicate-plugin warning, so the config below leaves it out.

- `setupFiles`: the plugin applies preview annotations automatically: it always injects `@storybook/addon-vitest/internal/setup-file`, and injects `setup-file-with-project-annotations` **only when you have not supplied a `setProjectAnnotations` setup file**. So a manual `.storybook/vitest.setup.ts` is **not required** unless you have custom per-test setup beyond `preview.ts`; if you keep one that calls `setProjectAnnotations`, the plugin defers to it. The doc example shows that file in `setupFiles` anyway
- `storybookScript`: docs: _"This should match your **`package.json`** script to run Storybook"_ (e.g. **`pnpm storybook --no-open`**). You may **prefix** the same command with setup steps (mock data, env) so watch-mode debugging matches dev
- `storybookUrl`: default **`http://localhost:6006`**: must be **reachable** for failure links ([debugging](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#debugging)). For **CI**, set the **full URL** of the **published** Storybook (including **path prefix** if hosted under a subpath) so output links work ([CI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#in-ci), [Testing in CI](https://storybook.js.org/docs/writing-tests/in-ci#21-debug-test-failures))
- `storybookScript` behavior: in **watch** mode, the plugin starts Storybook via this script **only if** nothing is already available at **`storybookUrl`** ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookscript))

**Vitest 5 shape (aligned with Storybook doc; add sibling `projects` for node/browser/etc.):**

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import type { ConfigEnv, UserConfig, UserConfigExport } from "vite";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import vite from "./vite.config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * widened to UserConfigExport: with the object type defineConfig() returns,
 * the function branch narrows to never and the call fails with TS2349
 */
const viteExport: UserConfigExport = vite;
async function resolveViteConfig(env: ConfigEnv): Promise<UserConfig> {
  return typeof viteExport === "function" ? viteExport(env) : viteExport;
}

const testConfig: UserConfig = {
  test: {
    projects: [
      // … other projects (node, browser) …
      {
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
            storybookScript: "pnpm storybook --no-open",
          }),
        ],
        /**
         * pre-bundle the deps that trigger an optimizeDeps reload mid-test
         * ("Vitest failed to find the current suite")
         *
         * copy each specifier verbatim from your own imports: an unexported
         * subpath of an installed package aborts the run before any test
         * executes, a package that is not installed only warns, and an entry
         * that resolves but is not the one you import passes while
         * pre-bundling the wrong module
         *
         * msw-storybook-addon is version-keyed: addon 3 imports
         * "msw-storybook-addon/csf3" (or "msw-storybook-addon/preview" on the
         * createPreviewAnnotations path), addon 2 imports "msw-storybook-addon";
         * check the installed major first (svelte-5:msw skill)
         */
        optimizeDeps: {
          include: [
            "msw-storybook-addon/csf3",
            "@storybook/addon-svelte-csf",
            "@storybook/addon-docs",
          ],
        },
        test: {
          name: "storybook",
          // no setupFiles: the plugin auto-applies preview annotations (see setupFiles note above)
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

// a function export also covers a vite.config that exports defineConfig(({ mode }) => …)
export default defineConfig(async (configEnv) =>
  mergeConfig(await resolveViteConfig(configEnv), testConfig),
);
```

## CLI & scripts

[`vitest` CLI](https://vitest.dev/guide/cli.html), default **watch**; use **`vitest run`** in CI.

Docs example: **`vitest --project=storybook`** ([CLI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#cli)). Many repos run **`--project storybook`** only from a **dedicated script** and keep **`test:unit`** on **node + browser**, with `validate` running both scripts; the addon does not require that split. The script names below match `SETUP.md` and the `frontend` skills (`test` there also runs Playwright e2e):

```json
{
  "scripts": {
    "test:unit": "vitest run --project node --project browser",
    "test:storybook": "vitest run --project storybook --silent",
    "test:story": "node --experimental-strip-types scripts/bin/test-story.ts"
  }
}
```

**`--silent`:** run storybook tests with `--silent` (`test:storybook` above and `pnpm test:story` pass it). Without it, the errors are buried in console output from the stories and msw's warnings, plus msw's request logs when a setup leaves out `quiet: true`. `--silent` also hides msw's unhandled-request warnings, so to find a missing fixture, rerun the one failing story without it (`svelte-5:msw`).

**Debugging failures and `props_invalid_value`:** `references/storybook-decorator.md`.

[Vitest IDE](https://vitest.dev/guide/ide.html) can run/debug these tests from the editor.

## FAQ links

- CLI / Vitest vs Storybook Interactions panel can disagree: different environments ([docs](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#what-happens-when-there-are-different-test-results-in-multiple-environments))
- Vitest internal errors: read the error in the Vitest UI widget and in the terminal; [Vitest common errors](https://vitest.dev/guide/common-errors.html)
- Non-default `public` dir: set [`publicDir`](https://vitejs.dev/config/shared-options.html#publicdir) ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory))
- CI: dynamic import / iframe: `test.isolate: false` and/or `--shard=i/n`. Without isolation, state such as a started msw worker and module-level stores carries over between files in one page; sharding splits by file, so it does not help failures concentrated in one file. A CI matrix for shards also renames the required checks ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#why-do-my-tests-fail-in-ci-with-failed-to-fetch-dynamically-imported-module-or-cannot-connect-to-the-iframe), [sharding](https://vitest.dev/guide/improving-performance.html#sharding))
- Playwright (WebGL / maps / Canvas): optional `browser.provider: playwright({ launchOptions: { args: … } })` per [Vitest browser](https://vitest.dev/config/#browser-playwright): not in Storybook's doc, but common for headless Chromium

## Plugin options (quick)

| Option | Notes |
| --- | --- |
| `configDir` | Storybook config directory (default **`.storybook`**) ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#configdir)) |
| `tags` | `{ include, exclude, skip }`, defaults **`include: ['test']`**, `exclude: []`, `skip: []`; exclude wins for the same tag in both ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)) |
| `storybookScript` | Command to start Storybook; used in watch when `storybookUrl` is not already up ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookscript)) |
| `storybookUrl` | Used for checks + **failure links** in output ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookurl)) |
| `disableAddonDocs` | Default **`true`**, MDX mocked unless you need real MDX parsing in tests ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#disableaddondocs)) |
