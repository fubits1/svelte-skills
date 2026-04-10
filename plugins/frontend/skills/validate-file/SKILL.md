---
name: validate-file
description: "Validate edited files — lint .svelte/.ts/.js, test stories, lint markdown. Auto-invoke after ANY file edit before declaring done. User-invocable as /validate-file [files]."
argument-hint: "[files]"
user-invocable: true
---

# Validate File

Run the correct validation for every file you edited OR have been prompted to review. No exceptions.

## Code style compliance

Before and during validation, apply the rules from these skills:

- `frontend:code-style` — applies to ALL files (variable naming, braces, data attributes)
- `svelte-5:code-style-svelte` — applies to `.svelte` and `.svelte.ts`/`.svelte.js` files

## Hard rules

- **NEVER use `any`.** Type it properly. If the type doesn't
  exist, create a local type or import the right one.
- **NEVER add `eslint-disable` without a FIXME or TODO.** Every
  disable must explain what needs to be fixed and why it can't
  be fixed now. Bare disables are cheating.
- **Fix ALL lint errors in the file** — not just the ones you
  introduced. If you touch a file and lint reports errors, fix
  them. No "pre-existing" excuses.

## When to run

After EVERY file edit. Not at the end of a batch — after EACH edit.
If you edited 3 files, you validate 3 times (or group by tool).

## What to run

| File type               | Command                                                 | Notes                                             |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `.svelte`, `.ts`, `.js` | `pnpm lint:file <path> [path2...]`                      | Runs eslint + oxlint + tsgo + svelte-check + knip |
| `.stories.svelte`       | `pnpm lint:file <path>` AND `pnpm test:story <Pattern>` | Both. Lint AND test.                              |
| `.test.ts`, `.spec.ts`  | `pnpm lint:tests`                                       | Lints all test files                              |
| `.md`                   | `npx markdownlint-cli <path>`                           | Fix all errors before done                        |
| `.yml`/`.yaml` (CI)     | Simulate with `CI=true GITHUB_ACTIONS=true` locally     | Never guess at CI behavior                        |
| `vite.config.ts`        | `npx tsgo -p tsconfig.node.json --noEmit`               | Separate tsconfig — `pnpm check` won't catch it   |

### CSS/layout changes → invoke `frontend:playwright` + `frontend:pixel-perfect`

Any edit that touches styles — `.css`, `.scss`, or `<style>` blocks
in `.svelte` files — requires visual regression verification via
the `frontend:playwright` and `frontend:pixel-perfect` skills. Lint alone cannot
catch visual regressions. Measure BEFORE, apply change, measure
AFTER, report a diff table with zero tolerance.

## Per-file validation loop

For component + story pairs, follow this exact sequence:

1. **Test first:** `pnpm test:story <Pattern>` — see the failure
2. **Read the error** — understand root cause
3. **Fix the component/story** — context guards, prop guards, etc.
4. **LINT BEFORE TESTING:** `pnpm lint:file <component> <story>`
   — must exit 0 BEFORE running tests. Lint catches type errors
   that would crash at runtime. Testing unlinted code wastes time.
   Fix ALL errors, not just yours.
5. **Run the Svelte autofixer** (`mcp__svelte__svelte-autofixer`) on `.svelte`, `.svelte.ts`, and `.svelte.js` files that
   use Svelte 5 patterns ($state, $derived, $props, $effect,
   $bindable, snippet, {@render}). Catches slot→children,
   stores→runes, and other migration issues. Skip for pure
   Svelte 4 files (export let, $:, <slot />).
6. **Test AFTER lint:** `pnpm test:story <Pattern>` — only test
   after lint is clean. If lint found type issues, the test on
   unfixed code was meaningless.
7. **Review component props:** check for svelecte, autocomplete,
   or Svelte 5 patterns. Also check CHILD components. Add story
   variants if needed.
8. **Lint the story again** if variants were added.
9. **Test again** if story changed.

Do NOT move to the next file until all steps pass.

## Shared components

If you modify a **shared component** (context wrapper, utility
component, store, type file, or anything imported by multiple
consumers), you MUST verify no regressions across ALL consumers:

- `pnpm test:storybook` — all storybook tests
- `pnpm test` — all unit/browser tests
- Playwright browser check on your dev server if the component is
  used in the running app

A change to a shared wrapper, type, or store can silently break
every consumer — not just the story you're working on.

## How to determine files

If invoked with `<args>`, validate those files.

If invoked without arguments, check what you edited in this
conversation:

1. Files you used Edit/Write on
2. Run validation on ALL of them

## Examples

```bash
# edited a component
pnpm lint:file src/lib/components/MyComponent.svelte

# edited a story + its wrapper
pnpm lint:file src/lib/components/stories/MyComponent.stories.svelte src/lib/components/stories/MyComponentWrapper.svelte
pnpm test:story MyComponent

# edited markdown docs
npx markdownlint-cli docs/STORYBOOK.md docs/STORYBOOK-DECORATOR.md
```
