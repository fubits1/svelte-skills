# Config, setup, CLI and plugin options

## Contents

- Vitest config file
- Setup (`@storybook/addon-vitest`)
- CLI & scripts
- FAQ links
- Plugin options (quick)

## Vitest config file

- Use a **dedicated `vitest.config.{ts,mts,js,mjs}`** at the package root (per monorepo package). Put **`storybookTest`** and **`test.projects`** here
- Storybook docs recommend a **separate [test project](https://vitest.dev/guide/projects)** for Storybook vs other tests ([manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced))
- Do not define `test` in `vite.config` if that config is extended/merged for Vitest: the FAQ's merge problem is **Vite's `test` field**, not `mergeConfig` itself
- Every inline project **inherits the merged root config by default** (the [official example](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files) writes `extends: true` anyway). With a `mergeConfig(vite.config, …)` root, sibling node/browser projects get the root's Vite plugins and root `setupFiles` too; a plain node project that must not get them needs **`extends: false`**. Alternative: root `defineConfig({ test: { projects: [{ extends: './vite.config.ts', … }] } })` with **no** `test` in Vite: same isolation goal
- Do not add the root's plugins (e.g. `svelte()`, `sveltekit()`) to the storybook project. They are inherited; a duplicate compiles components twice and fails with a `vite-plugin-svelte:compile` error such as `'new.target' can only be used in functions and class static block`. Leave `extends` unset: an explicit `extends: true` hides Vitest's "applies the same plugin multiple times" warning
- Gate: if there is **no** `vitest.config.*` and the only Vitest config is a **`test:` block in `vite.config`** (or there is no Vitest file), **ask** before adding the addon whether to introduce `vitest.config.ts` and move `test` out of Vite
- Isolation: if **`vite.config` defines `test`**, it **merges** into configs that extend that Vite file and can break Storybook tests: **move `test` to `vitest.config`** ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-isolate-storybook-tests-from-others)). **`mergeConfig(viteConfig, defineConfig({ test: … }))` in `vitest.config.ts` is the pattern Storybook documents** as long as **Vite does not own `test`**

## Setup (`@storybook/addon-vitest`)

Setup A is for a SvelteKit project without Storybook and without a Vitest config (no `vitest.config.*` and no `test` block in `vite.config.ts`). There, `pnpm dlx sv@latest add storybook` runs Storybook's own installer (`create-storybook`, interactive; a non-interactive form is not covered here). What it adds depends on the answers given there; it can write a `test` block with the storybook project into `vite.config.ts`, with `extends: true`. For such a project:

1. Ask (Gate above) whether `test` should live in `vitest.config.ts`
2. Run `pnpm dlx sv@latest add storybook` and check that `package.json` lists `@storybook/addon-vitest` and `vite.config.ts` has a project with `storybookTest()`. If both are there, run the peer check (Setup B step 4), then continue with step 3 here; if either is missing, continue with Setup B step 2 (the Gate is answered; moving `test` after `storybook add` is not covered here)
3. If agreed, move `test` into a new `vitest.config.ts` (target shape: "Vitest 5 shape" below) with the imports and helpers it uses: `storybookTest`, `playwright`, and `path`, `fileURLToPath` and the `dirname` constant when nothing else in `vite.config.ts` uses them. Then drop the `/// <reference types="vitest/config" />` line from `vite.config.ts`. If declined, keep `test` in `vite.config.ts` and continue with step 4
4. Do Setup B step 5 (all four items)

Setup B is for every other project (Storybook already installed, an existing Vitest config, or outside SvelteKit); a repo whose `vite.config.ts` has a `test` block containing a project whose `extends` is that file's path (e.g. `extends: './vite.config.ts'`, as `sv add vitest` writes its `client` and/or `server` projects, unless renamed) is not covered here. For the others:

1. Ask the Gate question when there is no `vitest.config.*` (Gate above). If the answer is yes, moving `test` out of `vite.config.ts`, or creating `vitest.config.ts`, in Setup B is not covered here (rule: the Isolation bullet above; target shape: "Vitest 5 shape" below): stop and tell the user. If no, continue with step 2
2. If Storybook is not installed, install it ([Storybook install docs](https://storybook.js.org/docs/get-started/install)); the install steps are not covered here
3. Wire the addon:
   - `package.json` lists `@storybook/addon-vitest` and the Vitest config has a project with `storybookTest()`: go to step 4
   - `package.json` lists the addon without such a project, `vitest.config.*` has `test.projects`, and `vite.config.ts` has no `test` block: run the peer check (step 4) first, then:
     1. Check that `.storybook/main.ts` `addons` lists the addon, and add it if not ([manual setup](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#manual-setup-advanced))
     2. Add the storybook entry of `projects` in "Vitest 5 shape" below, with the imports and the `dirname` constant it uses, to the `test.projects` of your `vitest.config.*`
     3. Check that the root loads the Svelte plugin (e.g. by merging `vite.config` as "Vitest 5 shape" does): the project inherits it, and with no Svelte plugin on the root every story file fails with `Failed to parse source for import analysis`. Other ways to load it are not covered here. Then continue with step 5
   - `package.json` lists the addon without such a project, in any other layout (no `vitest.config.*`, a `vitest.config.*` without `test.projects`, or a `test` block in `vite.config.ts`): not covered here
   - `package.json` does not list the addon:
     1. Ask whether `storybook add` may edit the config; if no, go to sub-step 4
     2. Run **`pnpm exec storybook add @storybook/addon-vitest`** ([automatic installation](https://storybook.js.org/docs/addons/install-addons#automatic-installation))
     3. Check that `package.json` lists the addon and the Vitest config has a project with `storybookTest()`. If both are there, go to step 4 (the peer check); if the addon is listed without such a project, follow the matching case above; if it is not listed, stop and ask
     4. Wiring by hand instead of `storybook add`: when `vitest.config.*` has `test.projects` and `vite.config.ts` has no `test` block, follow [`SETUP.md`](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md), wiring by hand (install at your `storybook` version, peer check, addon registration, `stories` glob, browser packages), which returns to the second case above from its sub-step 2; in any other layout, wiring by hand is not covered here
4. Check the addon's peers. List the installed versions with `pnpm ls @storybook/addon-vitest storybook vitest`, then show the addon's peers with `pnpm view @storybook/addon-vitest@<the installed addon version> peerDependencies`. If your installed `vitest` is not 5 (or not installed), a `vitest` or `@vitest/browser*` range lacks Vitest 5, or the `storybook` range excludes your installed `storybook`, stop and ask
5. Finish. Ask whether the package installs, the Chromium download and the `test:storybook` script addition below may run; if no, give the user those commands instead of running them:
   - If the storybook project has `extends: true`, remove it (inheriting is the default)
   - Run `pnpm ls vitest @vitest/browser-playwright playwright`. If `@vitest/browser-playwright` is missing or at another version than `vitest`, run `pnpm add -D @vitest/browser-playwright@<the installed vitest version>`; if `playwright` is missing, run `pnpm add -D playwright`. Then run `pnpm exec playwright install chromium` (CI on Linux: `pnpm exec playwright install --with-deps chromium`)
   - Svelte CSF addon: if `package.json` does not list `@storybook/addon-svelte-csf`, run `pnpm add -D @storybook/addon-svelte-csf`; if `.storybook/main.ts` `addons` does not list it, add `'@storybook/addon-svelte-csf'`; if the stories entry of `stories` lacks `svelte`, add `svelte` to its extensions (in whatever shape the entry has) and keep the other entries (the addon's README: `'../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)'`)
   - Add the `test:storybook` script if `package.json` lacks it ("CLI & scripts" below), then run `pnpm test:storybook` as the `frontend:vitest` flake-hygiene reference describes (once msw is set up, if your stories use it: `svelte-5:msw`)

**Playwright Chromium** is required for default browser mode; Setup B step 5 installs it ([Playwright browsers](https://playwright.dev/docs/browsers#install-browsers)).

**Manual** wiring follows [example configuration files](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files). The example uses **`mergeConfig(viteConfig, defineConfig({ test: { projects: […] } }))`** and a Storybook project with **`extends: true`**. That is the default, and writing it out hides the duplicate-plugin warning, so the config below leaves it out.

- `setupFiles`: the plugin applies preview annotations automatically: it always injects `@storybook/addon-vitest/internal/setup-file`, and injects `setup-file-with-project-annotations` **only when you have not supplied a `setProjectAnnotations` setup file**. So a manual `.storybook/vitest.setup.ts` is **not required** unless you have custom per-test setup beyond `preview.ts`; if you keep one that calls `setProjectAnnotations`, the plugin defers to it. The doc example shows that file in `setupFiles` anyway
- `storybookScript`: docs: _"This should match your **`package.json`** script to run Storybook"_ (e.g. **`pnpm storybook --no-open`**). You may **prefix** the same command with setup steps (mock data, env) so watch-mode debugging matches dev
- `storybookUrl`: default **`http://localhost:6006`**: must be **reachable** for failure links ([debugging](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#debugging)). Set it when your Storybook runs on another URL. Which `storybookUrl` to set for a `storybook` script without `-p` or `--port` is not covered here. For **CI**, set the **full URL** of the **published** Storybook (including **path prefix** if hosted under a subpath) so output links work ([CI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#in-ci), [Testing in CI](https://storybook.js.org/docs/writing-tests/in-ci#21-debug-test-failures))
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
         * copy each specifier verbatim from your own imports. On Vite 8, an
         * unexported subpath of an installed package aborts the run before any
         * test executes, a package that is not installed only warns, and an
         * entry that resolves but is not the one you import passes while
         * pre-bundling the wrong module
         *
         * msw-storybook-addon: the storybook project pre-bundles
         * "msw-storybook-addon/csf3" itself; add "msw-storybook-addon/preview"
         * on the createPreviewAnnotations path (svelte-5:msw skill)
         */
        optimizeDeps: {
          include: [
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

Docs example: **`vitest --project=storybook`** ([CLI](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#cli)). [`SETUP.md`](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md) runs **`--project storybook`** from a **dedicated script** and keeps **`test:unit`** on **node + browser**, with `validate` running both; the addon does not require that split. The script names below match `SETUP.md` and the `frontend` skills:

```json
{
  "scripts": {
    "test:unit": "vitest run --project node --project browser",
    "test:storybook": "vitest run --project storybook --silent",
    "test:story": "node --experimental-strip-types scripts/bin/test-story.ts"
  }
}
```

**`--silent`:** run storybook tests with `--silent` (`test:storybook` above and `pnpm test:story` pass it). Without it, the errors are buried in console output from the stories and msw's warnings, plus msw's request logs when a setup leaves out `quiet: true` in `worker.start`. Vitest's `default` reporter prints that output for every story. When an AI agent runs Vitest and neither the config nor the CLI sets a reporter, Vitest uses its `minimal` reporter (`silent: 'passed-only'`), which prints it for failing stories only. `--silent` hides all of it, msw's unhandled-request warnings included, for failing stories too. To find a missing fixture, rerun with `pnpm exec vitest run --project storybook --silent=false`, with a story file `<file>` appended once you know which one makes the request (`svelte-5:msw`).

**Debugging failures, `props_invalid_value`, and a decorator that works in the Storybook UI but not in the Vitest run:** [storybook-decorator.md](storybook-decorator.md).

[Vitest IDE](https://vitest.dev/guide/ide.html) can run/debug these tests from the editor.

## FAQ links

- CLI / Vitest vs Storybook Interactions panel can disagree: different environments ([docs](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#what-happens-when-there-are-different-test-results-in-multiple-environments))
- Vitest internal errors: read the error in the Storybook UI's testing widget and in the console; [Vitest common errors](https://vitest.dev/guide/common-errors.html)
- Non-default `public` dir: set [`publicDir`](https://vitejs.dev/config/shared-options.html#publicdir) ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#how-do-i-ensure-my-tests-can-find-assets-in-the-public-directory))
- CI: dynamic import / iframe: `test.isolate: false` and/or `--shard=i/n`. Without isolation, several files share one page, so state on `globalThis`, such as a started msw worker, carries over between them (`svelte-5:msw`); sharding splits by file, so it does not help failures concentrated in one file ([FAQ](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#why-do-my-tests-fail-in-ci-with-failed-to-fetch-dynamically-imported-module-or-cannot-connect-to-the-iframe), [sharding](https://vitest.dev/guide/improving-performance.html#sharding))
- Playwright (WebGL / maps / Canvas): optional `browser.provider: playwright({ launchOptions: { args: … } })` per [Vitest browser](https://vitest.dev/config/#browser-playwright): not in Storybook's doc, but common for headless Chromium

## Plugin options (quick)

| Option | Notes |
| --- | --- |
| `configDir` | Storybook config directory (default **`.storybook`**) ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#configdir)) |
| `tags` | `{ include, exclude, skip }`, defaults **`include: ['test']`**, `exclude: []`, `skip: []`; exclude wins for the same tag in both ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#tags)) |
| `storybookScript` | Command to start Storybook; used in watch when `storybookUrl` is not already up ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookscript)) |
| `storybookUrl` | Used for checks + **failure links** in output ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybookurl)) |
| `disableAddonDocs` | Default **`true`**, MDX mocked unless you need real MDX parsing in tests ([API](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#disableaddondocs)) |
