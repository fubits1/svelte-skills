---
name: storybook
description: "Storybook authoring and browser checks for Svelte: MCP instructions, previews, Svelte 4 store wrappers, CSS imports in preview.ts. Use when writing or reviewing .stories.svelte files, moving a CSS import that stories need, or a story renders empty."
user-invocable: true
---

# Storybook

- When the Storybook MCP is configured, ALWAYS call its `get-storybook-story-instructions` tool before writing stories: it returns Storybook's instructions for writing, testing and fixing stories (story structure, imports, play functions, mocking). After writing them, ALWAYS preview them with its preview tool (`stories-preview`, or `preview-stories` if that is the name your server lists). The tool prefix is your MCP server's name (`mcp__storybook__get-storybook-story-instructions` when the server is called `storybook`)
- API mocking (handlers, fixtures, story-scoped overrides with `beforeEach({ msw })`, `msw-storybook-addon` wiring, the msw 2 to 3 migration): `svelte-5:msw` skill
- Before opening stories in the browser:
  1. Read the project's `storybook` script. With `-p <port>` or `--port <port>` (`sv add storybook` leaves `storybook dev -p 6006` in `package.json`), open `http://127.0.0.1:<port>` with Playwright MCP to check whether Storybook runs; if the page does not load, go to step 3. With no `storybook` script, or no port in it, ask the user whether Storybook runs and on which URL; if it does not run, go to step 3
  2. If it runs, use that instance and do not start another
  3. If none runs, start the `storybook` script in the background with `pnpm storybook --ci` (`--ci`: no browser, no prompts), wait for the `Local:` URL it prints, and when done stop the background process you started. With no `storybook` script, starting Storybook is not covered here: ask the user to start it, then continue with step 2
- Verify every story in the browser via Playwright MCP: a story file that compiles can still render empty or broken
- CSS imports: trace the chain from the app root (`App.svelte`, or `src/routes/+layout.svelte` on SvelteKit) and from `.storybook/preview.ts`. Moving an import out of the SCSS chain breaks Storybook unless you also add it to `preview.ts` or to the stylesheet `preview.ts` imports

## Svelte 4 writable stores need wrapper components in stories

Components that import and read from Svelte 4 module-level
`writable()` stores (from `svelte/store`) render with default
or empty data in Storybook until the stores are set. A
component that subscribes (`$store`) updates when the store is
set later; one that reads it once at init (`get(store)`) only
sees a value set before it mounts. Svelte 5 runes state in
`.svelte.ts` modules behaves the same way: a template read
updates on a later change, a copy taken in the component
script (`const v = state.v`) does not. Set stores and runes
state in the wrapper, which runs before the component mounts.

**Pattern:** Create a `<ComponentName>Wrapper.svelte` that:

1. Calls `setContext()` for any required Svelte contexts
2. Calls `store.set()` with mock data for every Svelte 4
   `writable()` store the component imports, and sets mock
   values on the properties of any runes module state
   (`.svelte.ts`) it reads
3. Wraps children in a layout div with a fixed `max-width`, as in the example below

Render the wrapper inside `<Story asChild>`, as below, and pass any props to
the component there. The wrapper also works as a decorator when the decorator
returns `{ Component }`: `decorators: [() => ({ Component: MyComponentWrapper })]`.
A decorator that returns the bare component (`() => MyComponentWrapper`) works in
the Storybook UI, but in the Vitest run an argless instance of the `defineMeta`
component (if it has one) renders in its place. The wrapper markup, `setContext` and
`store.set` are always missing; depending on the `defineMeta` component, an `asChild`
story's content or an args story's own instance can disappear, an args story's component
can render twice, or the story fails when that component throws without props. The decorator internals and the full wrapper pattern are in
`svelte-5:storybook-vitest` (`references/storybook-decorator.md`).

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
a custom opt-out tag), verify IMMEDIATELY that it renders
in the Storybook UI via Playwright MCP. Navigate to the story
(how to build a story's URL is not covered here), wait for render, take a screenshot, check console for 0
errors. The opt-out removes the story from the automated run, so
this check is the only one it gets.
