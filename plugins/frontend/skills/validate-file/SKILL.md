---
name: validate-file
description: "Validate edited files, lint .svelte/.ts/.js, test stories, lint markdown. Auto-invoke after ANY file edit before declaring done. User-invocable as /validate-file [files]."
argument-hint: "[files]"
user-invocable: true
---

# Validate File

Run the correct validation for every file you edited OR have been prompted to review. No exceptions.

## Code style compliance

Before and during validation, apply the rules from these skills:

- `frontend:code-style`: applies to ALL files (variable naming, braces, data attributes)
- `svelte-5:code-style-svelte`: applies to `.svelte` and `.svelte.ts`/`.svelte.js` files

## Hard rules

- **NEVER use `any`.** Type it properly. If the type doesn't
  exist, create a local type or import the right one
- **NEVER add `eslint-disable` without a FIXME or TODO.** Every
  disable must explain what needs to be fixed and why it can't
  be fixed now. Bare disables are cheating
- **Fix ALL lint errors in the file**: not just the ones you
  introduced. If you touch a file and lint reports errors, fix
  them. No "pre-existing" excuses

## When to run

After EVERY file edit. Not at the end of a batch, after EACH edit.
If you edited 3 files, you validate 3 times (or group by tool).

## What to run

### Batch-lint multiple files

To lint every file currently staged in git, use `pnpm lint:staged`.
To also include commits ahead of the upstream branch (or, when no upstream is set, commits not yet on any remote), use `pnpm lint:staged --committed`, for example right before pushing.

`lint:staged` calls into the same `lint-file` chain documented below, so all the per-file rules still apply.

### Lint single files

| File type | Command | Notes |
| --- | --- | --- |
| `.svelte`, `.ts`, `.js` | `pnpm lint:file <path> [path2...]` | Runs eslint + knip, oxlint for script files, plus svelte-check (with `.svelte` files) or tsgo (with `.ts` files) |
| `.stories.svelte` | `pnpm lint:file <path>` AND `pnpm test:story <Pattern>` | Run both |
| `.test.ts` | `pnpm lint:tests` | Lints the files matching `TEST_GLOBS` (`*.test.ts` by default; `.spec.ts` files are not included) |
| `.md` | `npx markdownlint-cli <path>` | Fix all errors before declaring done |
| `.yml`/`.yaml` (CI) | Simulate with `CI=true GITHUB_ACTIONS=true` locally | Never guess at CI behavior |
| `vite.config.ts` | Vite template: `npx tsgo -p tsconfig.node.json --noEmit` | The Vite template types `vite.config.ts` through `tsconfig.node.json`. A `check` script that runs only svelte-check skips that file. On SvelteKit, `pnpm check` covers it: the generated tsconfig includes root files |

### CSS/layout changes: invoke `frontend:playwright` + `frontend:pixel-perfect`

Any edit that touches styles, `.css`, `.scss`, or `<style>` blocks
in `.svelte` files, requires visual regression verification via
the `frontend:playwright` and `frontend:pixel-perfect` skills. Lint alone cannot
catch visual regressions. Measure BEFORE, apply change, measure
AFTER, report a diff table with zero tolerance.

## Per-file validation loop

For a component + story pair, follow the loop in [story-loop](references/story-loop.md) before moving to the next file. It also has command examples.

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

If invoked without arguments, validate every file you used Edit or
Write on in this conversation.
