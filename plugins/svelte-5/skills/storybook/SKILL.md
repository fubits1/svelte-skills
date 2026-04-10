---
name: storybook
description: Storybook workflow — MCP tools, fixtures, CSS import chains. Auto-invoke when working with Storybook stories or components.
user-invocable: true
---

# Storybook

- ALWAYS use `mcp__storybook__get-storybook-story-instructions` before writing stories.
- ALWAYS use `mcp__storybook__preview-stories` to preview stories after writing them.
- Stories use `parameters.fixtures` for fixture overrides.
- Storybook is usually already running — just navigate with Playwright MCP.
- Verify every story in the browser via Playwright MCP — don't assume it works.
- CSS imports: trace chains through BOTH `App.svelte` AND `.storybook/preview.ts`. Moving imports out of the SCSS chain breaks Storybook unless also added to `preview.ts` or `storybook.scss`.

## Svelte 4 writable stores need wrapper components in stories

Components that import and read from Svelte 4 module-level
`writable()` stores (from `svelte/store`) render with default/
empty data in Storybook unless the stores are populated before
the component mounts. This does NOT apply to Svelte 5 runes-
based state in `.svelte.ts` modules — those are reactive on
their own.

**Pattern:** Create a `<ComponentName>Wrapper.svelte` that:

1. Calls `setContext()` for any required Svelte contexts
2. Calls `store.set()` with mock data for every Svelte 4
   `writable()` store the component imports
3. Wraps children in a layout div with sensible dimensions

Use `asChild` in the story — NEVER decorators for components
that depend on Svelte 4 writable stores. Decorators lose
complex args (Writable stores, objects with methods) through
Storybook's arg serialization.

```svelte
<!-- stories/MyComponentWrapper.svelte -->
<script lang="ts">
  import { setContext } from 'svelte'
  import { writable } from 'svelte/store'
  import { myWritableStore } from '../stores'  // Svelte 4 writable()
  setContext('myContext', true)
  myWritableStore.set({ /* mock data */ })
</script>
<div style="max-width: 600px; padding: 1rem;">
  <slot />
</div>
```

```svelte
<!-- stories/MyComponent.stories.svelte -->
<Story name="Default" asChild>
  <MyComponentWrapper>
    <MyComponent />
  </MyComponentWrapper>
</Story>
```

## noop callbacks hide bugs

Using `() => {}` for callback props in stories means the
callback is never verified. If the component passes wrong
data types to the callback, the noop silently swallows it.

For critical callbacks (onChange, onSubmit, onParameterChanged):

- Use a tracking function that captures args
- Add a play function that triggers the callback and verifies
  what was received
- At minimum, verify the callback fires — don't just noop it

A common failure: a `noop` callback hides a bug where
onChange passes full selection objects instead of expected
string values. The story "passes" because noop accepts
anything.

## skip-vitest ≠ skip verification

When adding `skip-vitest` to a story, IMMEDIATELY verify it
renders correctly in the Storybook UI via Playwright MCP.
Navigate to the story URL, wait for render, take a screenshot,
check console for 0 errors. `skip-vitest` means "can't
automate as vitest test" — it does NOT mean "don't verify."
