---
name: validate-file
description: "Validate edited files, lint .svelte/.ts/.js, test stories, lint markdown. Auto-invoke after ANY file edit before declaring done. User-invocable as /frontend:validate-file [files]."
argument-hint: "[files]"
user-invocable: true
---

# Validate File

Run the correct validation for every file you edited OR have been prompted to review. No exceptions.

## Code style compliance

Before and during validation, apply the rules from these skills:

- `frontend:code-style`: applies to ALL files (variable naming, braces, data attributes)
- `svelte-5:code-style-svelte`: applies to `.svelte` and `.svelte.ts`/`.svelte.js` files
- `frontend:comments`: applies to every comment you added, changed or deleted, and protects the existing comments in the files you edited
- `frontend:editing`: applies to every edit (types, lint and TypeScript directives, refactors)

## Hard rules

- **NEVER use `any`.** Type it properly. If the type doesn't
  exist, create a local type or import the right one
- **NEVER use one of the directives `frontend:editing` lists outside its rule.**
  Bare disables are cheating.
- **Fix ALL lint errors in the file**: not just the ones you
  introduced. If you touch a file and lint reports errors, fix
  them. No "pre-existing" excuses

## When to run

After EVERY file edit. Not at the end of a batch, after EACH edit.
If you edited 3 files, you validate 3 times (or group by tool).

## What to run

### Batch-lint multiple files

To lint the `.ts`, `.js` and `.svelte` files currently staged in git, use `pnpm lint:staged`; it lints each staged file's working-tree content (unstaged edits included) and skips staged files outside the directory of the `package.json` that defines the script (in a monorepo package, files staged elsewhere in the repo). It runs only the `lint:file` chain documented below (its notes and the type-check caveats apply) and skips other file types (`.md` included), so, depending on what is staged, also run:

- staged `.test.ts` files: `pnpm lint:tests`
- staged `.stories.svelte` files: `pnpm test:story <Pattern>` (`<Pattern>`: a Vitest file filter, [story-loop](references/story-loop.md))
- staged `.tsx`, `.mts`, `.mjs`, `.jsx` and other JS/TS files: `pnpm lint:file <path>`
- staged `.md`, `.yml` and other types: the table below (`lint:file` runs no step on them and still reports a pass)

To also include commits ahead of the upstream branch (or, when no upstream is set, commits not on any remote-tracking ref), use `pnpm lint:staged --committed`, for example right before pushing. With no upstream and no remote-tracking refs (no remote, or one never fetched), it skips the committed scan with a warning and lints the staged files only.

### Lint single files

| File type | Command | Notes |
| --- | --- | --- |
| `.svelte`, `.ts`/`.tsx`/`.mts`/`.cts` (`*.e2e.ts` and `*.spec.ts` test files included), `.js`/`.jsx`/`.mjs`/`.cjs` | `pnpm lint:file <path> [path2...]` | Runs eslint + knip, oxlint for JS and TS files, plus svelte-check when the list holds a `.svelte` file, otherwise tsgo for TypeScript files (type-check caveats below) |
| `.stories.svelte` | `pnpm lint:file <path>` AND `pnpm test:story <Pattern>` | Run both |
| `.test.ts` | `pnpm lint:tests` | Lints the files matching `TEST_GLOBS` (`src/**/*.test.ts` and `tests/**/*.test.ts` by default); needs `knip.tests.jsonc` and `tsconfig.tests.json` ([`SETUP.md`](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md), repo root). `*.e2e.ts`, `*.spec.ts` and test files outside `TEST_GLOBS`: see below |
| `.md` | `pnpm exec markdownlint <path>` (`markdownlint-cli` installed per `SETUP.md`; without it, `pnpm dlx markdownlint-cli <path>`) | Fix all errors before declaring done |
| `.yml`/`.yaml` (CI) | Simulate with `CI=true GITHUB_ACTIONS=true` locally | Never guess at CI behavior |
| `vite.config.ts` | create-vite Svelte template: `pnpm exec tsgo -p tsconfig.node.json --noEmit` (`tsgo` from `@typescript/native-preview`); SvelteKit: `pnpm check` | The create-vite Svelte template types `vite.config.ts` through `tsconfig.node.json`: svelte-check with `tsconfig.app.json` skips that file; the template's `check` script runs `tsc -p tsconfig.node.json` for it. On SvelteKit, the `sv create` tsconfig `include` lists `vite.config.ts`, so `pnpm check` reads it |

Lint `*.e2e.ts` and `*.spec.ts` test files, and any test file outside the `TEST_GLOBS` patterns, with `pnpm lint:file`. When `TEST_GLOBS` lists `*.e2e.ts` or `*.spec.ts` patterns, `lint:tests` runs oxlint and eslint on those files, but its svelte-check step fails only on `.test.ts` names (`SETUP.md`).

`lint:file`'s type checks read the root `tsconfig.json` (svelte-check unless `TSCONFIG_PATH` names another file, tsgo always) and report `✓` without checking a file in these cases:

- When tsgo is not installed: the tsgo step (lists with a TypeScript file and no `.svelte` file) always reports `✓`, and the svelte-check step (lists with a `.svelte` file) does too unless `SVELTE_CHECK_FLAGS` drops `--tsgo`. Install `@typescript/native-preview`; `SVELTE_CHECK_FLAGS="--threshold error"` fixes only the svelte-check step (how: `SETUP.md` §4)
- Both steps, when the file is outside the `include` of the tsconfig the step reads (e.g. a Playwright folder the `include` does not list): add that folder to that `include` list, keeping its other entries
- Both steps, when the root tsconfig has `"files": []` and `references` (the create-vite Svelte template): set `TSCONFIG_PATH=./tsconfig.app.json` for svelte-check (how: `SETUP.md` §4), and check TypeScript files with `pnpm exec tsgo --noEmit -p tsconfig.app.json` (`vite.config.ts`: `-p tsconfig.node.json`, table row above)

### CSS/layout changes: invoke `frontend:playwright` + `frontend:pixel-perfect`

Any edit that touches styles, `.css`, `.scss`, or `<style>` blocks
in `.svelte` files, requires visual regression verification via
the `frontend:playwright` and `frontend:pixel-perfect` skills. Lint alone cannot
catch visual regressions. Measure BEFORE, apply change, measure
AFTER, report a diff table with zero tolerance.

## Per-file validation loop

For a component + story pair, follow the exact loop in [story-loop](references/story-loop.md) before moving to the next file. It also has command examples.

## Shared components

If you modify a **shared component** (context wrapper, utility
component, store, type file, or anything imported by multiple
consumers), you MUST verify no regressions across ALL consumers:

- `pnpm test:storybook`: all storybook tests
- `pnpm test:unit`: all unit/browser tests
- Playwright browser check on your dev server if the component is
  used in the running app

A change to a shared wrapper, type, or store can silently break
every consumer, not just the story you're working on.

## How to determine files

If invoked with `<args>`, validate those files.

If invoked without arguments:

1. List every file you used Edit or Write on in this conversation
2. Run validation on ALL of them
