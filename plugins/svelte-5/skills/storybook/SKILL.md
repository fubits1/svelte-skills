---
name: storybook
description: "Storybook authoring and browser verification for Svelte: Storybook MCP story instructions and previews, Playwright checks, Svelte 4 store wrappers, CSS import chains in `.storybook/preview.ts`. Use when writing, editing or reviewing stories or `.stories.svelte` files, when a story renders with empty data, or when a story excluded from tests still needs checking."
user-invocable: true
---

# Storybook

- When the Storybook MCP is configured, call its `get-storybook-story-instructions` tool before writing stories: per Storybook's docs it "returns instructions on how to write useful stories, including which props to capture and how to write interaction tests". After writing them, preview them with its preview tool (`stories-preview`; `@storybook/addon-mcp` releases from before the rename call it `preview-stories`). The tool prefix is your MCP server's name (`mcp__storybook__get-storybook-story-instructions` when the server is called `storybook`)
- API mocking (handlers, fixtures, story-scoped overrides through `parameters.msw`, `msw-storybook-addon` wiring and its 2 to 3 break): `svelte-5:msw` skill
- Check whether Storybook already runs (default `http://localhost:6006`) and navigate there with Playwright MCP before starting another instance
- Verify every story in the browser via Playwright MCP: a story file that compiles can still render empty or broken
- CSS imports: trace the chain from `App.svelte` and from `.storybook/preview.ts`. Moving an import out of the SCSS chain breaks Storybook unless you also add it to `preview.ts` or to the stylesheet `preview.ts` imports

## Svelte 4 writable stores need wrapper components in stories

Components that import and read from Svelte 4 module-level
`writable()` stores (from `svelte/store`) render with default
or empty data in Storybook unless the stores are populated
before the component mounts. Svelte 5 runes-based state in
`.svelte.ts` modules is not affected: it is reactive on its own.

**Pattern:** Create a `<ComponentName>Wrapper.svelte` that:

1. Calls `setContext()` for any required Svelte contexts
2. Calls `store.set()` with mock data for every Svelte 4
   `writable()` store the component imports
3. Wraps children in a layout div with a fixed `max-width`, as in the example below

Render the wrapper inside `<Story asChild>`, not as a decorator: a decorator's
`setContext` did not reach the story component in Vitest headless runs (observed in a
real project, not measured). Do not add a decorator to an `asChild` story either. The
decorator internals and the full wrapper pattern are in `svelte-5:storybook-vitest`
(`references/storybook-decorator.md`).

```svelte
<!-- stories/MyComponentWrapper.svelte -->
<script lang="ts">
  import { setContext, type Snippet } from 'svelte'
  import { myWritableStore } from '../stores' // a writable() store from svelte/store
  let { children }: { children: Snippet } = $props()
  setContext('myContext', true)
  myWritableStore.set({ /* mock data */ })
</script>
<div style="max-width: 600px; padding: 1rem;">
  {@render children()}
</div>
```

```svelte
<!-- stories/MyComponent.stories.svelte -->
<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import MyComponent from '../MyComponent.svelte'
  import MyComponentWrapper from './MyComponentWrapper.svelte'

  const { Story } = defineMeta({ title: 'MyComponent', component: MyComponent })
</script>

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

For critical callbacks (onChange, onSubmit, onSelect):

- Use a tracking function that captures args
- Add a play function that triggers the callback and asserts
  the exact value it received (`svelte-5:storybook-vitest`,
  "`.stories.svelte` + `play`")

## A story excluded from tests still needs a browser check

When excluding a story from the Vitest run (the `!test` tag, or
a custom opt-out tag), verify in the same change that it renders
in the Storybook UI via Playwright MCP. Navigate to the story
URL, wait for render, take a screenshot, check console for 0
errors. The opt-out removes the story from the automated run, so
this check is the only one it gets.
